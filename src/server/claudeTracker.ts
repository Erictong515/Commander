import fs from 'fs';
import path from 'path';
import os from 'os';
import { ClaudeTaskExtractor } from './taskTrackerFactory.js';

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
 * Universal task pattern matchers for different models and languages
 */
const TASK_PATTERNS = {
    // English patterns
    taskKeywords: ['task', 'fix', 'implement', 'create', 'update', 'debug', 'refactor', 'add', 'remove'],
    // Chinese patterns
    taskKeywordsCN: ['任务', '修复', '实现', '创建', '更新', '调试', '重构', '添加', '删除', '解决', '优化'],
    // Common action prefixes to remove
    actionPrefixes: /^(选|选择|执行|运行|帮我|请|发现|看到|现在|然后|help|please|now|run)\s*/gi,
};

/**
 * Extract task summary from user input (multi-language support)
 */
function extractTaskSummary(text: string, maxLength: number = 50): string {
    if (!text) return 'Unknown task';

    let cleaned = text
        .replace(TASK_PATTERNS.actionPrefixes, '')
        .replace(/^[A-Z]\s*/g, '') // Remove single letter choices
        .trim();

    // Truncate if too long
    if (cleaned.length > maxLength) {
        cleaned = cleaned.substring(0, maxLength - 3) + '...';
    }

    return cleaned || text.substring(0, maxLength);
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
     * Check if a session file exists in projects directory and get its last modified time
     */
    getSessionFileInfo(sessionId: string): { exists: boolean; mtime: number } {
        try {
            // Check in all project subdirectories
            const projectDirs = fs.readdirSync(this.projectsPath);

            for (const dir of projectDirs) {
                const sessionFilePath = path.join(this.projectsPath, dir, `${sessionId}.jsonl`);
                if (fs.existsSync(sessionFilePath)) {
                    const stats = fs.statSync(sessionFilePath);
                    return { exists: true, mtime: stats.mtimeMs };
                }
            }

            return { exists: false, mtime: 0 };
        } catch {
            return { exists: false, mtime: 0 };
        }
    }

    /**
     * Check if a session file exists in projects directory
     */
    isSessionActive(sessionId: string): boolean {
        return this.getSessionFileInfo(sessionId).exists;
    }

    /**
     * Get all active sessions with file existence check
     * Uses file modification time as the true indicator of session activity
     */
    async getActiveSessionsWithValidation(): Promise<ClaudeSessionInfo[]> {
        const sessions = await this.getActiveSessions();

        const validSessions: ClaudeSessionInfo[] = [];
        const twoMinutesAgo = Date.now() - (2 * 60 * 1000);

        for (const session of sessions) {
            const fileInfo = this.getSessionFileInfo(session.sessionId);

            // Only consider sessions whose files were modified in the last 2 minutes
            // This is the true indicator that the session is actively being written to
            if (!fileInfo.exists) {
                continue;
            }

            const isFileRecent = fileInfo.mtime > twoMinutesAgo;

            // Skip sessions with stale files - they're not actively running
            if (!isFileRecent) {
                continue;
            }

            // Get tasks for this session
            const tasks = await this.getSessionTasks(session.sessionId);

            // Find the current task (in_progress or most recent pending)
            let currentTask = session.currentTask; // fallback to user input

            const inProgressTask = tasks.find(t => t.status === 'in_progress');
            if (inProgressTask) {
                // Use activeForm if available (e.g., "Fixing authentication bug"),
                // otherwise use subject
                currentTask = inProgressTask.activeForm || inProgressTask.subject;
            } else {
                // If no in_progress task, check for recent pending tasks
                const pendingTask = tasks.find(t => t.status === 'pending');
                if (pendingTask) {
                    currentTask = pendingTask.subject;
                } else if (tasks.length > 0) {
                    // If there are any tasks, use the most recent one's subject
                    const latestTask = tasks[tasks.length - 1];
                    currentTask = latestTask.activeForm || latestTask.subject;
                } else {
                    // No tasks found - use universal task extraction
                    currentTask = extractTaskSummary(session.currentTask);
                }
            }

            validSessions.push({
                ...session,
                // Use file mtime as the true lastActive time
                lastActive: fileInfo.mtime,
                currentTask,
                tasks,
            });
        }

        // Sort by file modification time (most recently modified first)
        validSessions.sort((a, b) => b.lastActive - a.lastActive);

        return validSessions;
    }

    /**
     * Extract tasks from a session JSONL file
     */
    async getSessionTasks(sessionId: string): Promise<ClaudeTask[]> {
        try {
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

            // Use Claude-specific task extractor
            const extractor = new ClaudeTaskExtractor();
            return extractor.extractTasks(lines);
        } catch (error) {
            console.error('Error reading session tasks:', error);
            return [];
        }
    }
}

// Singleton instance
export const claudeTracker = new ClaudeTracker();
