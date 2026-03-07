/**
 * Universal Task Tracker Factory
 * Supports multiple LLM models and task tracking mechanisms
 */

export interface UniversalTask {
    taskId: string;
    subject: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'deleted';
    owner?: string;
    activeForm?: string;
    metadata?: {
        model?: string;
        toolName?: string;
        language?: string;
        toolUseId?: string;  // For tracking Agent tool completion
    };
}

export interface TaskExtractor {
    /**
     * Extract tasks from session data
     */
    extractTasks(sessionData: any): UniversalTask[];

    /**
     * Extract current task summary from user input
     */
    extractTaskSummary(input: string, maxLength?: number): string;
}

/**
 * Claude-specific task extractor
 */
export class ClaudeTaskExtractor implements TaskExtractor {
    extractTasks(lines: string[]): UniversalTask[] {
        const tasksMap = new Map<string, UniversalTask>();
        // Track Agent tool_use_id to taskId mapping for completion detection
        const agentToolIdMap = new Map<string, string>();
        // Track TaskCreate tool_use_id to internal task mapping
        // Maps string taskId (like "1") to tool_use_id (unique identifier)
        const taskIdToToolUseId = new Map<string, string>();
        const toolUseIdToTask = new Map<string, UniversalTask>();

        for (const line of lines) {
            try {
                const entry = JSON.parse(line);

                if (entry.message && entry.message.content) {
                    for (const item of entry.message.content) {
                        if (item.type === 'tool_use') {
                            // TaskCreate/TaskUpdate
                            if (item.name === 'TaskCreate' && item.input) {
                                const toolUseId = item.id;
                                const task: UniversalTask = {
                                    taskId: toolUseId,  // Use tool_use_id as unique identifier
                                    subject: item.input.subject || 'Untitled Task',
                                    description: item.input.description || '',
                                    status: 'pending',
                                    activeForm: item.input.activeForm,
                                    metadata: { model: 'claude', toolName: 'TaskCreate', toolUseId },
                                };
                                tasksMap.set(toolUseId, task);
                                toolUseIdToTask.set(toolUseId, task);
                            } else if (item.name === 'TaskUpdate' && item.input?.taskId) {
                                const userTaskId = item.input.taskId;  // e.g., "1"

                                // Try to find the task by tool_use_id first (if we tracked it)
                                let task = taskIdToToolUseId.has(userTaskId)
                                    ? tasksMap.get(taskIdToToolUseId.get(userTaskId)!)
                                    : undefined;

                                // Fallback: search by matching any task (for backwards compatibility)
                                if (!task && tasksMap.size > 0) {
                                    // Try to find by numeric order if taskId is a number
                                    const taskNum = parseInt(userTaskId, 10);
                                    if (!isNaN(taskNum)) {
                                        const allTasks = Array.from(tasksMap.values());
                                        const taskIndex = taskNum - 1;  // Convert to 0-based index
                                        if (taskIndex >= 0 && taskIndex < allTasks.length) {
                                            task = allTasks[taskIndex];
                                        }
                                    }
                                }

                                if (task) {
                                    Object.assign(task, {
                                        status: item.input.status || task.status,
                                        subject: item.input.subject || task.subject,
                                        description: item.input.description || task.description,
                                        owner: item.input.owner || task.owner,
                                        activeForm: item.input.activeForm || task.activeForm,
                                    });
                                }
                            }
                            // Agent tool (orchestrator)
                            else if (item.name === 'Agent' && item.input) {
                                const toolUseId = item.id;
                                const agentTaskId = `agent-${toolUseId || Date.now()}`;
                                const desc = item.input.description || 'Subagent task';

                                // Map tool_use_id to taskId for completion tracking
                                if (toolUseId) {
                                    agentToolIdMap.set(toolUseId, agentTaskId);
                                }

                                tasksMap.set(agentTaskId, {
                                    taskId: agentTaskId,
                                    subject: this.extractTaskSummary(desc, 50),
                                    description: (item.input.prompt || '').substring(0, 200),
                                    status: 'in_progress',
                                    activeForm: `🤖 ${desc}`,
                                    owner: 'orchestrator',
                                    metadata: { model: 'claude', toolName: 'Agent', toolUseId },
                                });
                            }
                        }
                        // Check for tool_result to mark Agent tasks as completed
                        // and extract taskId mapping from TaskCreate results
                        else if (item.type === 'tool_result' && item.tool_use_id) {
                            const toolUseId = item.tool_use_id;

                            // Check if this is a TaskCreate result
                            const taskFromToolUseId = toolUseIdToTask.get(toolUseId);
                            if (taskFromToolUseId && item.content) {
                                // Extract numeric taskId from result like "Task #1 created successfully"
                                const match = item.content.match(/Task #(\d+)/);
                                if (match) {
                                    const numericTaskId = match[1];
                                    taskIdToToolUseId.set(numericTaskId, toolUseId);
                                }
                            }

                            // Check for Agent task completion
                            const agentTaskId = agentToolIdMap.get(toolUseId);
                            if (agentTaskId) {
                                const task = tasksMap.get(agentTaskId);
                                if (task && task.status === 'in_progress') {
                                    task.status = 'completed';
                                    // Update activeForm to show completion
                                    task.activeForm = task.activeForm?.replace('🤖', '✅') || '✅ Completed';
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                continue;
            }
        }

        return Array.from(tasksMap.values()).filter(t => t.status !== 'deleted');
    }

    extractTaskSummary(text: string, maxLength: number = 50): string {
        if (!text) return 'Unknown task';

        // Multi-language action prefix removal
        let cleaned = text
            .replace(/^(选|选择|执行|运行|帮我|请|发现|看到|现在|然后|help|please|now|run|do|make)\s*/gi, '')
            .replace(/^[A-Z]\s+/g, '') // Remove single letter choices
            .trim();

        if (cleaned.length > maxLength) {
            cleaned = cleaned.substring(0, maxLength - 3) + '...';
        }

        return cleaned || text.substring(0, maxLength);
    }
}

/**
 * Ollama-specific task extractor
 */
export class OllamaTaskExtractor implements TaskExtractor {
    extractTasks(sessionData: any): UniversalTask[] {
        // Ollama doesn't have explicit task tracking
        // Generate synthetic tasks from model state
        if (!sessionData.model) return [];

        return [{
            taskId: `ollama-${sessionData.model}`,
            subject: `Model ${sessionData.model} loaded`,
            description: `Running inference on ${sessionData.model}`,
            status: 'in_progress',
            metadata: { model: 'ollama' },
        }];
    }

    extractTaskSummary(text: string, maxLength: number = 50): string {
        return text.substring(0, maxLength);
    }
}

/**
 * Generic task extractor for unknown models
 */
export class GenericTaskExtractor implements TaskExtractor {
    extractTasks(sessionData: any): UniversalTask[] {
        // Attempt to parse common task formats
        const tasks: UniversalTask[] = [];

        // Try to find task-like patterns in the data
        if (typeof sessionData === 'string') {
            const lines = sessionData.split('\n');
            for (const line of lines) {
                if (this.looksLikeTask(line)) {
                    tasks.push({
                        taskId: `generic-${Date.now()}`,
                        subject: this.extractTaskSummary(line),
                        description: line,
                        status: 'pending',
                        metadata: { model: 'generic' },
                    });
                }
            }
        }

        return tasks;
    }

    extractTaskSummary(text: string, maxLength: number = 50): string {
        if (!text) return 'Unknown task';

        // Universal cleaning
        let cleaned = text
            .replace(/^[-*•]\s+/g, '') // Remove list markers
            .replace(/^\d+\.\s+/g, '') // Remove numbered lists
            .replace(/^(TODO|FIXME|NOTE|TASK):\s*/gi, '') // Remove task markers
            .trim();

        if (cleaned.length > maxLength) {
            cleaned = cleaned.substring(0, maxLength - 3) + '...';
        }

        return cleaned;
    }

    private looksLikeTask(text: string): boolean {
        const taskPatterns = [
            /^(TODO|FIXME|TASK|任务):/i,
            /^[-*•]\s+/,
            /^(fix|implement|create|update|add|remove|修复|实现|创建)/i,
        ];

        return taskPatterns.some(pattern => pattern.test(text));
    }
}

/**
 * Factory function to get appropriate task extractor
 */
export function getTaskExtractor(modelType: string): TaskExtractor {
    switch (modelType.toLowerCase()) {
        case 'claude':
        case 'claude-cli':
            return new ClaudeTaskExtractor();
        case 'ollama':
            return new OllamaTaskExtractor();
        default:
            return new GenericTaskExtractor();
    }
}
