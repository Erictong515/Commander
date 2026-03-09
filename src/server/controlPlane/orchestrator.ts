/**
 * Orchestrator - Main coordination service for the Agent Swarm Control Plane
 * Acts as the "Commander-in-Chief" (总指挥) for all agents
 */

import { v4 as uuidv4 } from 'uuid';
import type {
    SwarmTask,
    AgentHandle,
    SchedulerConfig,
    SchedulerStats,
    CreateTaskRequest,
    IACMessage,
    MessageType,
    AdapterType,
} from './types.js';
import { eventBus } from './eventBus.js';
import { taskQueue, TaskQueue } from './taskQueue.js';
import { scheduler, type SchedulerMetrics } from './scheduler.js';

// Default scheduler configuration
const DEFAULT_CONFIG: SchedulerConfig = {
    enabled: true,
    interval: 1000, // 1 second scheduling loop
    maxQueueDepth: 1000,
    cpuThreshold: 80,
    memoryThreshold: 70,
    priorityInheritance: true,
};

export class Orchestrator {
    private config: SchedulerConfig;
    private agents: Map<string, AgentHandle> = new Map();
    private schedulerInterval: NodeJS.Timeout | null = null;
    private stats: SchedulerStats;
    private dispatchHistory: Array<{ taskId: string; agentId: string; timestamp: number }> = [];

    constructor(config: Partial<SchedulerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.stats = {
            isRunning: false,
            queueDepth: 0,
            dispatchedCount: 0,
            completedCount: 0,
            failedCount: 0,
            avgDispatchLatency: 0,
            avgExecutionTime: 0,
        };

        // Subscribe to task events for stats
        eventBus.subscribe('task:completed', this.onTaskCompleted.bind(this));
        eventBus.subscribe('task:failed', this.onTaskFailed.bind(this));
    }

    /**
     * Register an agent with the orchestrator
     */
    registerAgent(agent: AgentHandle): void {
        this.agents.set(agent.id, agent);
        eventBus.emit('agent:registered', 'orchestrator', { agentId: agent.id, adapter: agent.adapter });
        console.log(`[Orchestrator] Agent registered: ${agent.name} (${agent.adapter})`);
    }

    /**
     * Unregister an agent
     */
    unregisterAgent(agentId: string): boolean {
        const agent = this.agents.get(agentId);
        if (!agent) return false;

        this.agents.delete(agentId);
        eventBus.emit('agent:unregistered', 'orchestrator', { agentId });
        console.log(`[Orchestrator] Agent unregistered: ${agentId}`);
        return true;
    }

    /**
     * Update agent status and metrics
     */
    updateAgent(agentId: string, updates: Partial<AgentHandle>): boolean {
        const agent = this.agents.get(agentId);
        if (!agent) return false;

        const oldStatus = agent.status;
        Object.assign(agent, updates);

        if (updates.status && updates.status !== oldStatus) {
            eventBus.emit('agent:status_changed', 'orchestrator', {
                agentId,
                oldStatus,
                newStatus: updates.status,
            });
        }

        return true;
    }

    /**
     * Get all registered agents
     */
    getAgents(): AgentHandle[] {
        return Array.from(this.agents.values());
    }

    /**
     * Get agent by ID
     */
    getAgent(agentId: string): AgentHandle | undefined {
        return this.agents.get(agentId);
    }

    /**
     * Submit a new task to the queue
     */
    submitTask(request: CreateTaskRequest): SwarmTask {
        return taskQueue.enqueue(request);
    }

    /**
     * Start the scheduling loop
     */
    start(): void {
        if (this.schedulerInterval) return;

        this.stats.isRunning = true;
        this.schedulerInterval = setInterval(() => this.scheduleLoop(), this.config.interval);
        eventBus.emit('scheduler:resumed', 'orchestrator', {});
        console.log('[Orchestrator] Scheduler started');
    }

    /**
     * Stop the scheduling loop
     */
    stop(): void {
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
            this.schedulerInterval = null;
        }
        this.stats.isRunning = false;
        eventBus.emit('scheduler:paused', 'orchestrator', {});
        console.log('[Orchestrator] Scheduler stopped');
    }

    /**
     * Main scheduling loop
     */
    private async scheduleLoop(): Promise<void> {
        if (!this.config.enabled) return;

        this.stats.queueDepth = taskQueue.depth;

        // Update utilization metrics
        scheduler.calculateUtilization(Array.from(this.agents.values()));

        // Get eligible tasks
        const eligibleTasks = taskQueue.getEligibleTasks();
        if (eligibleTasks.length === 0) return;

        // Try to dispatch each eligible task — with fallback across ranked agents
        for (const task of eligibleTasks) {
            const rankedAgents = scheduler.rankAgents(task, Array.from(this.agents.values()));
            let dispatched = false;

            for (const agentScore of rankedAgents) {
                const agent = this.agents.get(agentScore.agentId);
                if (!agent) continue;

                const success = await this.dispatchTask(task, agent);
                if (success) {
                    scheduler.recordDispatch(task.id, agentScore);
                    dispatched = true;
                    break; // Task dispatched — move on
                }
                // dispatch failed (e.g. adapter returned false) — try next ranked agent
                console.warn(`[Orchestrator] Dispatch to ${agent.name} failed, trying next candidate`);
            }

            if (!dispatched) {
                console.warn(`[Orchestrator] No agent could handle task ${task.id} — returning to queue`);
                taskQueue.enqueue({
                    prompt: task.payload.prompt,
                    priority: task.priority,
                    type: task.type,
                    requirements: task.requirements,
                });
            }
        }

        // Periodic deadlock check
        const deadlocks = taskQueue.detectDeadlocks();
        if (deadlocks.length > 0) {
            eventBus.emit('conflict:detected', 'orchestrator', {
                type: 'deadlock',
                cycles: deadlocks,
            });
            console.warn(`[Orchestrator] Deadlock detected: ${deadlocks.length} cycles`);
        }
    }

    /**
     * Get routing recommendations for a task
     */
    getRoutingRecommendations(task: SwarmTask) {
        return scheduler.getRoutingRecommendations(task, Array.from(this.agents.values()));
    }

    /**
     * Get advanced scheduler metrics
     */
    getSchedulerMetrics(): SchedulerMetrics {
        return scheduler.getMetrics();
    }

    /**
     * Get dispatch history
     */
    getDispatchHistory(limit?: number) {
        return scheduler.getDispatchHistory(limit);
    }

    /**
     * Dispatch a task to an agent.
     * Waits for the adapter to confirm before removing the task from the queue.
     * Returns false if the adapter cannot handle the task (caller should try next candidate).
     */
    private async dispatchTask(task: SwarmTask, agent: AgentHandle): Promise<boolean> {
        const startTime = Date.now();

        try {
            // Emit dispatch message — AdapterRegistry handles actual delivery
            const message = this.createMessage('TASK_DISPATCH', agent, { task });

            // Wait for adapter result via a one-shot Promise
            const adapterResult = await new Promise<boolean>((resolve) => {
                let subSuccessId: string;
                let subFailId: string;

                const cleanup = () => {
                    eventBus.unsubscribe('task:completed', subSuccessId);
                    eventBus.unsubscribe('task:failed', subFailId);
                };

                const timeout = setTimeout(() => {
                    cleanup();
                    resolve(false);
                }, 30_000);

                subSuccessId = eventBus.subscribe('task:completed', (_source, data: any) => {
                    if (data.taskId === task.id) {
                        clearTimeout(timeout);
                        cleanup();
                        resolve(true);
                    }
                });

                subFailId = eventBus.subscribe('task:failed', (_source, data: any) => {
                    if (data.taskId === task.id) {
                        clearTimeout(timeout);
                        cleanup();
                        resolve(false);
                    }
                });

                // Emit dispatch event to trigger AdapterRegistry → adapter
                eventBus.emit('message:sent', 'orchestrator', { message, agentId: agent.id });
            });

            if (!adapterResult) {
                return false;
            }

            // Only dequeue after adapter confirms success
            const dequeuedTask = taskQueue.dequeue();
            if (!dequeuedTask || dequeuedTask.id !== task.id) {
                // Already dequeued by something else — still count as success
                console.warn(`[Orchestrator] Task ${task.id} was already dequeued`);
            }

            // Update routing and agent state
            task.routing.assignedAgent = agent.id;
            agent.currentTasks.push(task.id);
            if (agent.currentTasks.length >= agent.capabilities.maxConcurrent) {
                agent.status = 'busy';
            }

            // Record dispatch
            this.dispatchHistory.push({ taskId: task.id, agentId: agent.id, timestamp: startTime });
            this.stats.dispatchedCount++;
            const latency = Date.now() - task.lifecycle.createdAt;
            this.stats.avgDispatchLatency =
                (this.stats.avgDispatchLatency * (this.stats.dispatchedCount - 1) + latency) /
                this.stats.dispatchedCount;

            console.log(`[Orchestrator] Task ${task.id} completed by ${agent.name}`);
            return true;
        } catch (error) {
            console.error(`[Orchestrator] Failed to dispatch task ${task.id}:`, error);
            return false;
        }
    }

    /**
     * Create an IACMP message
     */
    private createMessage(type: MessageType, agent: AgentHandle, data: unknown): IACMessage {
        return {
            header: {
                version: '1.0',
                messageId: uuidv4(),
                timestamp: Date.now(),
            },
            routing: {
                source: {
                    agentId: 'orchestrator',
                    adapter: 'orchestrator' as any,
                },
                destination: {
                    agentId: agent.id,
                    adapter: agent.adapter,
                    sessionId: agent.sessionId,
                },
            },
            payload: {
                type,
                data,
            },
        };
    }

    /**
     * Handle task completion
     */
    private onTaskCompleted(event: any): void {
        this.stats.completedCount++;

        const taskId = event.data?.taskId;
        if (!taskId) return;

        // Find and update agent
        for (const agent of this.agents.values()) {
            const idx = agent.currentTasks.indexOf(taskId);
            if (idx > -1) {
                agent.currentTasks.splice(idx, 1);
                agent.metrics.tasksCompleted++;

                if (agent.currentTasks.length < agent.capabilities.maxConcurrent) {
                    agent.status = 'idle';
                }

                // Update execution time stats
                const task = taskQueue.get(taskId);
                if (task?.lifecycle.startedAt && task?.lifecycle.completedAt) {
                    const execTime = task.lifecycle.completedAt - task.lifecycle.startedAt;
                    agent.metrics.avgResponseTime =
                        (agent.metrics.avgResponseTime * (agent.metrics.tasksCompleted - 1) + execTime) /
                        agent.metrics.tasksCompleted;
                }
                break;
            }
        }
    }

    /**
     * Handle task failure
     */
    private onTaskFailed(event: any): void {
        this.stats.failedCount++;

        const taskId = event.data?.taskId;
        if (!taskId) return;

        // Find and update agent
        for (const agent of this.agents.values()) {
            const idx = agent.currentTasks.indexOf(taskId);
            if (idx > -1) {
                agent.currentTasks.splice(idx, 1);
                agent.metrics.tasksFailed++;

                if (agent.currentTasks.length < agent.capabilities.maxConcurrent) {
                    agent.status = 'idle';
                }
                break;
            }
        }
    }

    /**
     * Get scheduler statistics
     */
    getStats(): SchedulerStats {
        return { ...this.stats, queueDepth: taskQueue.depth };
    }

    /**
     * Get task queue
     */
    getTaskQueue(): TaskQueue {
        return taskQueue;
    }

    /**
     * Broadcast a message to all agents
     */
    broadcast(type: MessageType, data: unknown, adapterFilter?: AdapterType): void {
        const message: IACMessage = {
            header: {
                version: '1.0',
                messageId: uuidv4(),
                timestamp: Date.now(),
            },
            routing: {
                source: {
                    agentId: 'orchestrator',
                    adapter: 'orchestrator' as any,
                },
                destination: {
                    broadcast: true,
                    adapterFilter,
                },
            },
            payload: { type, data },
        };

        eventBus.emit('message:sent', 'orchestrator', { message, broadcast: true });
    }
}

// Singleton instance
export const orchestrator = new Orchestrator();
