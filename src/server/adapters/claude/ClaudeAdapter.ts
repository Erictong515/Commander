/**
 * ClaudeAdapter - Adapter for Claude CLI agents
 * Discovers and manages Claude CLI processes and their sessions
 */

import si from 'systeminformation';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AgentAdapter, type AdapterConfig, type DiscoveredAgent } from '../base/AgentAdapter.js';
import type {
    AgentHandle,
    AgentCapabilities,
    SwarmTask,
    IACMessage,
} from '../../controlPlane/types.js';
import { ClaudeTaskExtractor } from '../../taskTrackerFactory.js';

interface ClaudeSession {
    sessionId: string;
    project: string;
    currentTask: string;
    tasks: Array<{
        taskId: string;
        subject: string;
        status: string;
    }>;
    lastActive: number;
}

const DEFAULT_CONFIG: AdapterConfig = {
    type: 'claude',
    name: 'Claude CLI Adapter',
    pollInterval: 2000,
    enabled: true,
};

export class ClaudeAdapter extends AgentAdapter {
    private historyPath: string;
    private projectsPath: string;
    private taskExtractor: ClaudeTaskExtractor;

    constructor(config: Partial<AdapterConfig> = {}) {
        super({ ...DEFAULT_CONFIG, ...config });

        const claudeDir = path.join(os.homedir(), '.claude');
        this.historyPath = path.join(claudeDir, 'history.jsonl');
        this.projectsPath = path.join(claudeDir, 'projects');
        this.taskExtractor = new ClaudeTaskExtractor();
    }

    /**
     * Discover Claude CLI agents
     */
    protected async discoverAgents(): Promise<DiscoveredAgent[]> {
        const discovered: DiscoveredAgent[] = [];

        try {
            // Get running processes
            const processes = await si.processes();
            const claudeProcesses = processes.list.filter(proc => {
                const name = proc.name.toLowerCase();
                const cmd = proc.command.toLowerCase();
                return name === 'claude' || cmd === 'claude' ||
                       cmd.includes('/claude ') || cmd.startsWith('claude ');
            });

            // Get active sessions
            const sessions = await this.getActiveSessions();
            let sessionAssigned = false;

            for (const proc of claudeProcesses) {
                const agent: DiscoveredAgent = {
                    id: `claude-${proc.pid}`,
                    name: 'Claude CLI',
                    pid: proc.pid,
                    metrics: {
                        cpu: Number(proc.cpu.toFixed(1)),
                        memory: Number((proc.memRss / 1024).toFixed(1)), // KB to MB
                    },
                };

                // Assign session info to first Claude process only
                if (sessions.length > 0 && !sessionAssigned) {
                    const session = sessions[0];
                    agent.sessionId = session.sessionId;
                    agent.project = session.project;
                    agent.currentTask = session.currentTask;
                    agent.tasks = session.tasks;
                    sessionAssigned = true;
                }

                discovered.push(agent);
            }
        } catch (error) {
            console.error('[ClaudeAdapter] Discovery error:', error);
        }

        return discovered;
    }

    /**
     * Get default capabilities for Claude agents
     */
    protected getDefaultCapabilities(disc: DiscoveredAgent): AgentCapabilities {
        return {
            adapter: 'claude',
            model: 'claude-sonnet-4',
            capabilities: ['code', 'reasoning', 'analysis', 'writing', 'tool-use'],
            contextWindow: 200000,
            languages: ['en', 'zh', 'ja', 'ko', 'de', 'fr', 'es'],
            maxConcurrent: 1, // Claude CLI is single-threaded
            avgLatency: 2000,
            cachedContexts: disc.project ? [disc.project] : [],
        };
    }

    /**
     * Deliver a message to a Claude agent
     * Note: Claude CLI doesn't have a direct message API, so we log for now
     */
    protected async deliverMessage(agent: AgentHandle, message: IACMessage): Promise<boolean> {
        // Claude CLI doesn't support direct messaging
        // In future, could write to a file that Claude monitors
        console.log(`[ClaudeAdapter] Message to ${agent.id}:`, message.payload.type);
        return true;
    }

    /**
     * Override createAgentHandle to mark Claude CLI as non-dispatchable.
     * Claude CLI is interactive and cannot accept programmatic task dispatch.
     */
    protected createAgentHandle(disc: import('../base/AgentAdapter.js').DiscoveredAgent): AgentHandle {
        const handle = super.createAgentHandle(disc);
        handle.dispatchable = false;
        return handle;
    }

    /**
     * Dispatch a task to a Claude agent
     * Note: Claude CLI doesn't support external task dispatch directly
     */
    async dispatchTask(agent: AgentHandle, task: SwarmTask): Promise<boolean> {
        // Claude CLI is interactive - cannot dispatch tasks programmatically
        // This would require integration with Claude's stdin or a message file
        console.log(`[ClaudeAdapter] Task dispatch to ${agent.id} (not implemented):`, task.id);

        // For now, just log - future implementation could:
        // 1. Write to a "pending tasks" file that Claude monitors
        // 2. Use a shell command to inject input
        // 3. Integrate with Claude's MCP server

        return false;
    }

    /**
     * Get active Claude sessions from history
     */
    private async getActiveSessions(): Promise<ClaudeSession[]> {
        try {
            if (!fs.existsSync(this.historyPath)) {
                return [];
            }

            const content = fs.readFileSync(this.historyPath, 'utf-8');
            const lines = content.trim().split('\n').filter(line => line.trim());
            const recentLines = lines.slice(-50);

            // Group by session
            const sessionMap = new Map<string, {
                entries: any[];
                project?: string;
            }>();

            for (const line of recentLines) {
                try {
                    const entry = JSON.parse(line);
                    if (entry.sessionId && entry.display) {
                        if (!sessionMap.has(entry.sessionId)) {
                            sessionMap.set(entry.sessionId, { entries: [] });
                        }
                        const session = sessionMap.get(entry.sessionId)!;
                        session.entries.push(entry);
                        if (entry.project) {
                            session.project = entry.project;
                        }
                    }
                } catch {
                    continue;
                }
            }

            // Convert to sessions
            const sessions: ClaudeSession[] = [];
            const tenMinutesAgo = Date.now() - (10 * 60 * 1000);

            for (const [sessionId, data] of sessionMap) {
                const entries = data.entries.sort((a, b) => a.timestamp - b.timestamp);
                const lastEntry = entries[entries.length - 1];

                if (lastEntry.timestamp > tenMinutesAgo) {
                    // Get tasks from session file
                    const tasks = await this.getSessionTasks(sessionId);

                    // Determine current task
                    let currentTask = lastEntry.display;
                    const inProgressTask = tasks.find(t => t.status === 'in_progress');
                    if (inProgressTask) {
                        currentTask = inProgressTask.subject;
                    } else {
                        // Clean up user input
                        currentTask = this.taskExtractor.extractTaskSummary(lastEntry.display, 50);
                    }

                    sessions.push({
                        sessionId,
                        project: data.project || 'Unknown',
                        currentTask,
                        tasks: tasks.map(t => ({
                            taskId: t.taskId,
                            subject: t.subject,
                            status: t.status,
                        })),
                        lastActive: lastEntry.timestamp,
                    });
                }
            }

            return sessions.sort((a, b) => b.lastActive - a.lastActive);
        } catch (error) {
            console.error('[ClaudeAdapter] Error reading sessions:', error);
            return [];
        }
    }

    /**
     * Get tasks from a session file
     */
    private async getSessionTasks(sessionId: string): Promise<Array<{
        taskId: string;
        subject: string;
        description: string;
        status: string;
    }>> {
        try {
            const projectDirs = fs.readdirSync(this.projectsPath);

            for (const dir of projectDirs) {
                const sessionFile = path.join(this.projectsPath, dir, `${sessionId}.jsonl`);
                if (fs.existsSync(sessionFile)) {
                    const content = fs.readFileSync(sessionFile, 'utf-8');
                    const lines = content.trim().split('\n').filter(l => l.trim());
                    return this.taskExtractor.extractTasks(lines);
                }
            }
        } catch (error) {
            // Session file might not exist
        }

        return [];
    }
}

// Default instance
export const claudeAdapter = new ClaudeAdapter();
