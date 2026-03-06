import fs from 'fs';
import path from 'path';
import os from 'os';

interface ClaudeHistoryEntry {
    display: string;
    sessionId: string;
    timestamp: number;
    project?: string;
    pastedContents?: Record<string, unknown>;
}

interface ClaudeTask {
    taskId: string;
    subject: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'deleted';
    owner?: string;
    activeForm?: string;
}

interface ClaudeSessionInfo {
    sessionId: string;
    currentTask: string;
    project: string;
    startTime: number;
    lastActive: number;
    tasks?: ClaudeTask[];
}

/**
 * Claude Tracker Module
 * Extracts active Claude CLI sessions and their current tasks from history.jsonl
 */
export class ClaudeTracker {
    private historyPath: string;
    private projectsPath: string;

    constructor() {
        const claudeDir = path.join(os.homedir(), '.claude');
        this.historyPath = path.join(claudeDir, 'history.jsonl');
        this.projectsPath = path.join(claudeDir, 'projects');
    }

    /**
     * Parse the last N lines of history.jsonl to find active sessions
     * @param lines Number of lines to read from the end (default: 50)
     */
    async getActiveSessions(lines: number = 50): Promise<ClaudeSessionInfo[]> {
        try {
            if (!fs.existsSync(this.historyPath)) {
                console.log('Claude history file not found');
                return [];
            }

            const content = fs.readFileSync(this.historyPath, 'utf-8');
            const allLines = content.trim().split('\n').filter(line => line.trim());

            // Get last N lines
            const recentLines = allLines.slice(-lines);

            // Parse entries and group by sessionId
            const sessionMap = new Map<string, ClaudeHistoryEntry[]>();

            for (const line of recentLines) {
                try {
                    const entry: ClaudeHistoryEntry = JSON.parse(line);

                    if (entry.sessionId && entry.display) {
                        if (!sessionMap.has(entry.sessionId)) {
                            sessionMap.set(entry.sessionId, []);
                        }
                        sessionMap.get(entry.sessionId)!.push(entry);
                    }
                } catch (err) {
                    // Skip malformed lines
                    continue;
                }
            }

            // Convert to session info, keeping only recent active sessions (within last 10 minutes)
            const sessions: ClaudeSessionInfo[] = [];
            const tenMinutesAgo = Date.now() - (10 * 60 * 1000);

            for (const [sessionId, entries] of sessionMap.entries()) {
                // Sort entries by timestamp
                entries.sort((a, b) => a.timestamp - b.timestamp);

                const firstEntry = entries[0];
                const lastEntry = entries[entries.length - 1];

                // Only include sessions that were active in the last 10 minutes
                if (lastEntry.timestamp > tenMinutesAgo) {
                    sessions.push({
                        sessionId,
                        currentTask: lastEntry.display,
                        project: lastEntry.project || firstEntry.project || 'Unknown',
                        startTime: firstEntry.timestamp,
                        lastActive: lastEntry.timestamp,
                    });
                }
            }

            // Sort by last active time (most recent first)
            sessions.sort((a, b) => b.lastActive - a.lastActive);

            return sessions;
        } catch (error) {
            console.error('Error reading Claude history:', error);
            return [];
        }
    }

    /**
     * Get detailed information about a specific session
     */
    async getSessionDetails(sessionId: string): Promise<ClaudeSessionInfo | null> {
        const sessions = await this.getActiveSessions(100);
        return sessions.find(s => s.sessionId === sessionId) || null;
    }

    /**
     * Check if a session file exists in projects directory
     */
    isSessionActive(sessionId: string): boolean {
        try {
            // Check in all project subdirectories
            const projectDirs = fs.readdirSync(this.projectsPath);

            for (const dir of projectDirs) {
                const sessionFiles = fs.readdirSync(path.join(this.projectsPath, dir));
                if (sessionFiles.some(file => file.includes(sessionId))) {
                    return true;
                }
            }

            return false;
        } catch {
            return false;
        }
    }

    /**
     * Get all active sessions with file existence check
     */
    async getActiveSessionsWithValidation(): Promise<ClaudeSessionInfo[]> {
        const sessions = await this.getActiveSessions();

        // Filter to only include sessions that have actual session files
        return sessions.filter(session => {
            // If session was active in the last 2 minutes, assume it's still running
            const twoMinutesAgo = Date.now() - (2 * 60 * 1000);
            return session.lastActive > twoMinutesAgo || this.isSessionActive(session.sessionId);
        });
    }

    /**
     * Extract tasks from a session JSONL file
     */
    async getSessionTasks(sessionId: string): Promise<ClaudeTask[]> {
        try {
            // Find the session file
            const projectDirs = fs.readdirSync(this.projectsPath);
            let sessionFilePath: string | null = null;

            for (const dir of projectDirs) {
                const sessionFile = path.join(this.projectsPath, dir, `${sessionId}.jsonl`);
                if (fs.existsSync(sessionFile)) {
                    sessionFilePath = sessionFile;
                    break;
                }
            }

            if (!sessionFilePath) {
                return [];
            }

            const content = fs.readFileSync(sessionFilePath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.trim());

            const tasksMap = new Map<string, ClaudeTask>();

            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);

                    // Look for tool_use with TaskCreate or TaskUpdate
                    if (entry.message && entry.message.content) {
                        for (const item of entry.message.content) {
                            if (item.type === 'tool_use') {
                                if (item.name === 'TaskCreate' && item.input) {
                                    // Generate a simple task ID if not present
                                    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                                    tasksMap.set(taskId, {
                                        taskId,
                                        subject: item.input.subject || 'Untitled Task',
                                        description: item.input.description || '',
                                        status: 'pending',
                                        activeForm: item.input.activeForm,
                                    });
                                } else if (item.name === 'TaskUpdate' && item.input && item.input.taskId) {
                                    const existingTask = tasksMap.get(item.input.taskId);
                                    if (existingTask) {
                                        // Update task properties
                                        if (item.input.status) existingTask.status = item.input.status;
                                        if (item.input.subject) existingTask.subject = item.input.subject;
                                        if (item.input.description) existingTask.description = item.input.description;
                                        if (item.input.owner) existingTask.owner = item.input.owner;
                                        if (item.input.activeForm) existingTask.activeForm = item.input.activeForm;
                                    }
                                }
                            }
                        }
                    }

                    // Also check tool_result for task IDs returned by TaskCreate
                    if (entry.message && entry.message.content) {
                        for (const item of entry.message.content) {
                            if (item.type === 'tool_result' && item.content) {
                                try {
                                    const result = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
                                    if (result.taskId) {
                                        // Update the temporary task ID with the real one
                                        const tasks = Array.from(tasksMap.values());
                                        const lastTask = tasks[tasks.length - 1];
                                        if (lastTask && lastTask.taskId.startsWith('task-')) {
                                            tasksMap.delete(lastTask.taskId);
                                            lastTask.taskId = result.taskId;
                                            tasksMap.set(result.taskId, lastTask);
                                        }
                                    }
                                } catch {
                                    // Ignore parsing errors
                                }
                            }
                        }
                    }
                } catch (err) {
                    // Skip malformed lines
                    continue;
                }
            }

            // Filter out deleted tasks
            return Array.from(tasksMap.values()).filter(task => task.status !== 'deleted');
        } catch (error) {
            console.error('Error reading session tasks:', error);
            return [];
        }
    }
}

// Singleton instance
export const claudeTracker = new ClaudeTracker();
