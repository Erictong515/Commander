/**
 * TaskPersistence - Persist Gemini task history using file system
 * Stores tasks in JSON format for cross-session retrieval
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PersistedTask {
    taskId: string;
    subject: string;
    agentId: string;
    startTime: number;
    endTime: number;
    success: boolean;
    duration: number;
    output?: string;
    metadata?: Record<string, any>;
}

export class TaskPersistence {
    private storageDir: string;
    private indexFile: string;
    private maxIndexSize: number = 100;

    constructor(storageDir?: string) {
        // Store in Commander's data directory
        this.storageDir = storageDir || path.join(__dirname, '../../../../data/gemini-tasks');
        this.indexFile = path.join(this.storageDir, 'task-index.json');
    }

    /**
     * Initialize storage directory
     */
    async init(): Promise<void> {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
        } catch (error) {
            console.error('[TaskPersistence] Failed to create storage directory:', error);
        }
    }

    /**
     * Save a task to persistent storage
     */
    async saveTask(task: PersistedTask): Promise<void> {
        try {
            await this.init();

            // Save full task to individual file
            const taskFile = path.join(this.storageDir, `${task.taskId}.json`);
            await fs.writeFile(taskFile, JSON.stringify(task, null, 2));

            // Update index with metadata only (no output)
            await this.updateIndex(task);

            console.log(`[TaskPersistence] Saved task ${task.taskId}`);
        } catch (error) {
            console.error('[TaskPersistence] Failed to save task:', error);
        }
    }

    /**
     * Update task index
     */
    private async updateIndex(task: PersistedTask): Promise<void> {
        let index: Array<Omit<PersistedTask, 'output'>> = [];

        // Load existing index
        try {
            const data = await fs.readFile(this.indexFile, 'utf-8');
            index = JSON.parse(data);
        } catch {
            // Index doesn't exist yet, start fresh
        }

        // Add new task to index (without output to keep it small)
        const { output, ...taskMeta } = task;
        index.unshift(taskMeta);

        // Keep only recent tasks in index
        if (index.length > this.maxIndexSize) {
            index = index.slice(0, this.maxIndexSize);
        }

        // Save updated index
        await fs.writeFile(this.indexFile, JSON.stringify(index, null, 2));
    }

    /**
     * Get task by ID
     */
    async getTask(taskId: string): Promise<PersistedTask | null> {
        try {
            const taskFile = path.join(this.storageDir, `${taskId}.json`);
            const data = await fs.readFile(taskFile, 'utf-8');
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    /**
     * Get recent tasks from index (without full output)
     */
    async getRecentTasks(limit: number = 20): Promise<Array<Omit<PersistedTask, 'output'>>> {
        try {
            const data = await fs.readFile(this.indexFile, 'utf-8');
            const index = JSON.parse(data);
            return index.slice(0, limit);
        } catch {
            return [];
        }
    }

    /**
     * Get all tasks matching a filter
     */
    async searchTasks(filter: {
        agentId?: string;
        success?: boolean;
        after?: number;
        before?: number;
    }): Promise<Array<Omit<PersistedTask, 'output'>>> {
        try {
            const data = await fs.readFile(this.indexFile, 'utf-8');
            let tasks: Array<Omit<PersistedTask, 'output'>> = JSON.parse(data);

            if (filter.agentId) {
                tasks = tasks.filter(t => t.agentId === filter.agentId);
            }
            if (filter.success !== undefined) {
                tasks = tasks.filter(t => t.success === filter.success);
            }
            if (filter.after) {
                const after = filter.after;
                tasks = tasks.filter(t => t.startTime >= after);
            }
            if (filter.before) {
                const before = filter.before;
                tasks = tasks.filter(t => t.startTime <= before);
            }

            return tasks;
        } catch {
            return [];
        }
    }

    /**
     * Get storage statistics
     */
    async getStats(): Promise<{
        totalTasks: number;
        successRate: number;
        avgDuration: number;
        storageSize: number;
    }> {
        try {
            const data = await fs.readFile(this.indexFile, 'utf-8');
            const tasks = JSON.parse(data);

            const totalTasks = tasks.length;
            const successCount = tasks.filter((t: PersistedTask) => t.success).length;
            const successRate = totalTasks > 0 ? successCount / totalTasks : 0;
            const avgDuration = totalTasks > 0
                ? tasks.reduce((sum: number, t: PersistedTask) => sum + t.duration, 0) / totalTasks
                : 0;

            // Get storage directory size
            const files = await fs.readdir(this.storageDir);
            let storageSize = 0;
            for (const file of files) {
                const stat = await fs.stat(path.join(this.storageDir, file));
                storageSize += stat.size;
            }

            return {
                totalTasks,
                successRate,
                avgDuration,
                storageSize,
            };
        } catch {
            return {
                totalTasks: 0,
                successRate: 0,
                avgDuration: 0,
                storageSize: 0,
            };
        }
    }
}

// Singleton instance
export const taskPersistence = new TaskPersistence();
