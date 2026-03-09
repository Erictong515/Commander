/**
 * Scheduler - Advanced task scheduling engine for the Control Plane
 * Implements intelligent routing, load balancing, and capacity management
 */

import type {
    SwarmTask,
    AgentHandle,
} from './types.js';
import { eventBus } from './eventBus.js';
import { taskQueue } from './taskQueue.js';
import { evalPipeline } from '../evals/index.js';

export interface SchedulerMetrics {
    totalDispatched: number;
    totalCompleted: number;
    totalFailed: number;
    avgWaitTime: number;
    avgExecutionTime: number;
    throughput: number; // tasks per minute
    utilizationByAdapter: Record<string, number>;
}

export interface AgentScore {
    agentId: string;
    score: number;
    reasons: string[];
}

export interface DispatchDecision {
    taskId: string;
    agentId: string;
    score: number;
    reasons: string[];
    timestamp: number;
}

/**
 * Advanced Scheduler with intelligent routing
 */
export class Scheduler {
    private dispatchHistory: DispatchDecision[] = [];
    private maxHistorySize: number = 1000;
    private metrics: SchedulerMetrics;
    private lastThroughputCheck: number = Date.now();
    private tasksInLastMinute: number = 0;

    constructor() {
        this.metrics = {
            totalDispatched: 0,
            totalCompleted: 0,
            totalFailed: 0,
            avgWaitTime: 0,
            avgExecutionTime: 0,
            throughput: 0,
            utilizationByAdapter: {},
        };

        // Subscribe to task events
        eventBus.subscribe('task:completed', this.onTaskCompleted.bind(this));
        eventBus.subscribe('task:failed', this.onTaskFailed.bind(this));
    }

    /**
     * Find the best agent for a task using multi-factor scoring
     */
    findBestAgent(task: SwarmTask, agents: AgentHandle[]): AgentScore | null {
        const scores = this.rankAgents(task, agents);
        return scores.length > 0 ? scores[0] : null;
    }

    /**
     * Rank all eligible agents for a task (sorted best-first).
     * Used by the orchestrator for fallback dispatch.
     */
    rankAgents(task: SwarmTask, agents: AgentHandle[]): AgentScore[] {
        const scores: AgentScore[] = [];

        for (const agent of agents) {
            const score = this.scoreAgent(agent, task);
            if (score.score > 0) {
                scores.push(score);
            }
        }

        scores.sort((a, b) => b.score - a.score);
        return scores;
    }

    /**
     * Score an agent for a task
     */
    private scoreAgent(agent: AgentHandle, task: SwarmTask): AgentScore {
        const reasons: string[] = [];
        let score = 100; // Base score

        // === Eligibility Checks (disqualifying factors) ===

        // Exclude agents that cannot accept programmatic dispatch (e.g. Claude CLI)
        if (agent.dispatchable === false) {
            return { agentId: agent.id, score: 0, reasons: ['Not dispatchable (monitoring only)'] };
        }

        // Check agent status
        if (agent.status === 'offline' || agent.status === 'error' || agent.status === 'paused') {
            return { agentId: agent.id, score: 0, reasons: ['Agent not available'] };
        }

        // Check capacity
        if (agent.currentTasks.length >= agent.capabilities.maxConcurrent) {
            return { agentId: agent.id, score: 0, reasons: ['At max capacity'] };
        }

        // Check capability match
        for (const cap of task.requirements.capabilities) {
            if (!agent.capabilities.capabilities.includes(cap)) {
                return { agentId: agent.id, score: 0, reasons: [`Missing capability: ${cap}`] };
            }
        }

        // Check context window
        if (task.requirements.minContextWindow &&
            agent.capabilities.contextWindow < task.requirements.minContextWindow) {
            return { agentId: agent.id, score: 0, reasons: ['Context window too small'] };
        }

        // Check language support
        if (task.requirements.languages) {
            for (const lang of task.requirements.languages) {
                if (!agent.capabilities.languages.includes(lang)) {
                    return { agentId: agent.id, score: 0, reasons: [`Missing language: ${lang}`] };
                }
            }
        }

        // === Scoring Factors (higher is better) ===

        // Preferred adapter bonus
        if (task.routing.preferredAdapters?.includes(agent.adapter)) {
            score += 50;
            reasons.push('+50 preferred adapter');
        }

        // Load-based scoring (prefer less loaded agents)
        const loadPenalty = Math.round(agent.metrics.currentLoad * 0.5);
        score -= loadPenalty;
        if (loadPenalty > 0) {
            reasons.push(`-${loadPenalty} current load`);
        }

        // Capacity utilization (prefer agents with more headroom)
        const utilizationRatio = agent.currentTasks.length / agent.capabilities.maxConcurrent;
        const capacityBonus = Math.round((1 - utilizationRatio) * 30);
        score += capacityBonus;
        if (capacityBonus > 0) {
            reasons.push(`+${capacityBonus} capacity headroom`);
        }

        // Latency matching (for time-sensitive tasks)
        if (task.requirements.maxLatency) {
            const avgLatency = agent.capabilities.avgLatency || 5000;
            if (avgLatency <= task.requirements.maxLatency * 0.5) {
                score += 30;
                reasons.push('+30 fast agent');
            } else if (avgLatency > task.requirements.maxLatency * 0.8) {
                score -= 20;
                reasons.push('-20 may exceed latency');
            }
        }

        // Context affinity (prefer agents with cached context)
        if (task.payload.context?.projectId) {
            const projectId = task.payload.context.projectId as string;
            if (agent.capabilities.cachedContexts?.includes(projectId)) {
                score += 40;
                reasons.push('+40 context cached');
            }
        }

        // Success rate bonus
        const totalTasks = agent.metrics.tasksCompleted + agent.metrics.tasksFailed;
        if (totalTasks > 5) {
            const successRate = agent.metrics.tasksCompleted / totalTasks;
            const successBonus = Math.round(successRate * 25);
            score += successBonus;
            if (successBonus > 0) {
                reasons.push(`+${successBonus} success rate (${Math.round(successRate * 100)}%)`);
            }
        }

        // Recent activity bonus (prefer warm agents)
        const idleTime = Date.now() - agent.metrics.lastActive;
        if (idleTime < 60000) { // Active in last minute
            score += 10;
            reasons.push('+10 recently active');
        } else if (idleTime > 300000) { // Idle for 5+ minutes
            score -= 5;
            reasons.push('-5 cold agent');
        }

        // Eval score bonus (system-wide health reflected in routing)
        const latestReport = evalPipeline.getLatestReport();
        if (latestReport) {
            const evalBonus = Math.round(latestReport.overallScore / 2); // max +50
            score += evalBonus;
            reasons.push(`+${evalBonus} eval score ${latestReport.overallScore}/100`);
        }

        return { agentId: agent.id, score, reasons };
    }

    /**
     * Record a dispatch decision
     */
    recordDispatch(taskId: string, agentScore: AgentScore): void {
        const decision: DispatchDecision = {
            taskId,
            agentId: agentScore.agentId,
            score: agentScore.score,
            reasons: agentScore.reasons,
            timestamp: Date.now(),
        };

        this.dispatchHistory.push(decision);
        if (this.dispatchHistory.length > this.maxHistorySize) {
            this.dispatchHistory.shift();
        }

        this.metrics.totalDispatched++;
        this.tasksInLastMinute++;

        // Update throughput
        this.updateThroughput();

        eventBus.emit('task:dispatched', 'scheduler', {
            taskId,
            agentId: agentScore.agentId,
            score: agentScore.score,
        });
    }

    /**
     * Update throughput calculation
     */
    private updateThroughput(): void {
        const now = Date.now();
        const elapsed = now - this.lastThroughputCheck;

        if (elapsed >= 60000) {
            this.metrics.throughput = this.tasksInLastMinute;
            this.tasksInLastMinute = 0;
            this.lastThroughputCheck = now;
        }
    }

    /**
     * Handle task completion
     */
    private onTaskCompleted(event: any): void {
        this.metrics.totalCompleted++;

        const taskId = event.data?.taskId;
        const task = taskQueue.get(taskId);

        if (task?.lifecycle.startedAt && task?.lifecycle.completedAt) {
            const execTime = task.lifecycle.completedAt - task.lifecycle.startedAt;
            this.metrics.avgExecutionTime =
                (this.metrics.avgExecutionTime * (this.metrics.totalCompleted - 1) + execTime) /
                this.metrics.totalCompleted;
        }

        if (task?.lifecycle.createdAt && task?.lifecycle.dispatchedAt) {
            const waitTime = task.lifecycle.dispatchedAt - task.lifecycle.createdAt;
            this.metrics.avgWaitTime =
                (this.metrics.avgWaitTime * (this.metrics.totalCompleted - 1) + waitTime) /
                this.metrics.totalCompleted;
        }
    }

    /**
     * Handle task failure
     */
    private onTaskFailed(_event: any): void {
        this.metrics.totalFailed++;
    }

    /**
     * Get dispatch history
     */
    getDispatchHistory(limit: number = 50): DispatchDecision[] {
        return this.dispatchHistory.slice(-limit);
    }

    /**
     * Get scheduler metrics
     */
    getMetrics(): SchedulerMetrics {
        return { ...this.metrics };
    }

    /**
     * Calculate utilization for each adapter
     */
    calculateUtilization(agents: AgentHandle[]): Record<string, number> {
        const utilization: Record<string, { busy: number; total: number }> = {};

        for (const agent of agents) {
            if (!utilization[agent.adapter]) {
                utilization[agent.adapter] = { busy: 0, total: 0 };
            }

            utilization[agent.adapter].total++;
            if (agent.status === 'busy' || agent.currentTasks.length > 0) {
                utilization[agent.adapter].busy++;
            }
        }

        const result: Record<string, number> = {};
        for (const [adapter, stats] of Object.entries(utilization)) {
            result[adapter] = stats.total > 0 ? Math.round((stats.busy / stats.total) * 100) : 0;
        }

        this.metrics.utilizationByAdapter = result;
        return result;
    }

    /**
     * Get recommendations for task routing
     */
    getRoutingRecommendations(task: SwarmTask, agents: AgentHandle[]): {
        recommended: AgentScore | null;
        alternatives: AgentScore[];
        analysis: string;
    } {
        const allScores: AgentScore[] = [];

        for (const agent of agents) {
            const score = this.scoreAgent(agent, task);
            allScores.push(score);
        }

        // Sort by score
        allScores.sort((a, b) => b.score - a.score);

        const eligible = allScores.filter(s => s.score > 0);
        const recommended = eligible[0] || null;
        const alternatives = eligible.slice(1, 4); // Top 3 alternatives

        // Generate analysis
        let analysis = '';
        if (!recommended) {
            const reasons = allScores
                .filter(s => s.score === 0)
                .map(s => s.reasons[0])
                .filter((v, i, a) => a.indexOf(v) === i) // Unique
                .slice(0, 3);
            analysis = `No eligible agents. Reasons: ${reasons.join(', ')}`;
        } else {
            analysis = `Best match: ${recommended.agentId} (score: ${recommended.score}). `;
            analysis += `${eligible.length} eligible agents, ${allScores.length - eligible.length} ineligible.`;
        }

        return { recommended, alternatives, analysis };
    }
}

// Singleton instance
export const scheduler = new Scheduler();
