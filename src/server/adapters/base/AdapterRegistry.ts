/**
 * AdapterRegistry - Central registry for all agent adapters
 * Manages adapter lifecycle and provides unified access to all agents
 */

import type { AgentHandle, AdapterType, SwarmTask, IACMessage } from '../../controlPlane/types.js';
import { AgentAdapter } from './AgentAdapter.js';
import { orchestrator } from '../../controlPlane/orchestrator.js';
import { eventBus } from '../../controlPlane/eventBus.js';

export class AdapterRegistry {
    private adapters: Map<AdapterType, AgentAdapter> = new Map();
    private syncInterval: NodeJS.Timeout | null = null;
    private syncIntervalMs: number = 2000;

    constructor() {
        // Listen for task dispatch messages
        eventBus.subscribe('message:sent', this.handleMessageEvent.bind(this));
    }

    /**
     * Register an adapter
     */
    register(adapter: AgentAdapter): void {
        if (this.adapters.has(adapter.type)) {
            console.warn(`[AdapterRegistry] Adapter ${adapter.type} already registered, replacing`);
        }

        this.adapters.set(adapter.type, adapter);
        console.log(`[AdapterRegistry] Registered adapter: ${adapter.name} (${adapter.type})`);
    }

    /**
     * Unregister an adapter
     */
    unregister(type: AdapterType): boolean {
        const adapter = this.adapters.get(type);
        if (!adapter) return false;

        adapter.stop();
        this.adapters.delete(type);
        console.log(`[AdapterRegistry] Unregistered adapter: ${type}`);
        return true;
    }

    /**
     * Get an adapter by type
     */
    getAdapter(type: AdapterType): AgentAdapter | undefined {
        return this.adapters.get(type);
    }

    /**
     * Get all registered adapters
     */
    getAdapters(): AgentAdapter[] {
        return Array.from(this.adapters.values());
    }

    /**
     * Start all adapters
     */
    startAll(): void {
        for (const adapter of this.adapters.values()) {
            adapter.start();
        }

        // Start sync loop to update orchestrator
        this.startSyncLoop();

        console.log(`[AdapterRegistry] Started ${this.adapters.size} adapters`);
    }

    /**
     * Stop all adapters
     */
    stopAll(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        for (const adapter of this.adapters.values()) {
            adapter.stop();
        }

        console.log(`[AdapterRegistry] Stopped all adapters`);
    }

    /**
     * Start sync loop to keep orchestrator updated with agent states
     */
    private startSyncLoop(): void {
        if (this.syncInterval) return;

        this.syncInterval = setInterval(() => this.syncWithOrchestrator(), this.syncIntervalMs);
        this.syncWithOrchestrator(); // Initial sync
    }

    /**
     * Sync all adapter agents with orchestrator
     */
    private syncWithOrchestrator(): void {
        const allAgents = this.getAllAgents();
        const registeredIds = new Set<string>();

        // Register/update all agents
        for (const agent of allAgents) {
            registeredIds.add(agent.id);

            const existing = orchestrator.getAgent(agent.id);
            if (existing) {
                // Update existing
                orchestrator.updateAgent(agent.id, {
                    status: agent.status,
                    metrics: agent.metrics,
                    currentTasks: agent.currentTasks,
                    pid: agent.pid,
                    sessionId: agent.sessionId,
                    project: agent.project,
                });
            } else {
                // Register new
                orchestrator.registerAgent(agent);
            }
        }

        // Unregister agents that are no longer present
        for (const existingAgent of orchestrator.getAgents()) {
            if (!registeredIds.has(existingAgent.id)) {
                orchestrator.unregisterAgent(existingAgent.id);
            }
        }
    }

    /**
     * Get all agents from all adapters
     */
    getAllAgents(): AgentHandle[] {
        const agents: AgentHandle[] = [];
        for (const adapter of this.adapters.values()) {
            agents.push(...adapter.getAgents());
        }
        return agents;
    }

    /**
     * Get agents by adapter type
     */
    getAgentsByAdapter(type: AdapterType): AgentHandle[] {
        const adapter = this.adapters.get(type);
        return adapter ? adapter.getAgents() : [];
    }

    /**
     * Find agent by ID across all adapters
     */
    findAgent(agentId: string): { adapter: AgentAdapter; agent: AgentHandle } | null {
        for (const adapter of this.adapters.values()) {
            const agent = adapter.getAgent(agentId);
            if (agent) {
                return { adapter, agent };
            }
        }
        return null;
    }

    /**
     * Dispatch a task to a specific agent
     */
    async dispatchTask(agentId: string, task: SwarmTask): Promise<boolean> {
        const result = this.findAgent(agentId);
        if (!result) {
            console.error(`[AdapterRegistry] Agent not found: ${agentId}`);
            return false;
        }

        const { adapter, agent } = result;
        return adapter.dispatchTask(agent, task);
    }

    /**
     * Get registry statistics
     */
    getStats(): {
        adapterCount: number;
        totalAgents: number;
        agentsByAdapter: Record<string, number>;
        agentsByStatus: Record<string, number>;
    } {
        const agentsByAdapter: Record<string, number> = {};
        const agentsByStatus: Record<string, number> = {};
        let totalAgents = 0;

        for (const adapter of this.adapters.values()) {
            const agents = adapter.getAgents();
            agentsByAdapter[adapter.type] = agents.length;
            totalAgents += agents.length;

            for (const agent of agents) {
                agentsByStatus[agent.status] = (agentsByStatus[agent.status] || 0) + 1;
            }
        }

        return {
            adapterCount: this.adapters.size,
            totalAgents,
            agentsByAdapter,
            agentsByStatus,
        };
    }

    /**
     * Handle incoming message events from event bus
     */
    private async handleMessageEvent(event: any): Promise<void> {
        try {
            const { message, agentId } = event.data as { message: IACMessage; agentId?: string };

            // Only handle TASK_DISPATCH messages
            if (message.payload.type !== 'TASK_DISPATCH') {
                return;
            }

            // Extract task from message
            const { task } = message.payload.data as { task: SwarmTask };
            if (!task || !agentId) {
                console.error('[AdapterRegistry] Invalid TASK_DISPATCH message:', message);
                return;
            }

            // Find the adapter for this agent
            const result = this.findAgent(agentId);
            if (!result) {
                console.error(`[AdapterRegistry] Agent not found: ${agentId}`);
                return;
            }

            const { adapter, agent } = result;

            // Dispatch the task to the agent via its adapter
            console.log(`[AdapterRegistry] Routing task ${task.id} to ${adapter.name}`);
            const success = await adapter.dispatchTask(agent, task);

            if (!success) {
                console.error(`[AdapterRegistry] Task dispatch failed for ${task.id}`);
            }
        } catch (error) {
            console.error('[AdapterRegistry] Message handling error:', error);
        }
    }

}

// Singleton instance
export const adapterRegistry = new AdapterRegistry();
