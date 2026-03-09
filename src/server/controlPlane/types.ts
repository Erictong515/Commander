/**
 * Control Plane Type Definitions
 * Core interfaces for the Agent Swarm Control Plane
 */

// ============================================================================
// TASK DEFINITIONS
// ============================================================================

export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';
export type TaskStatus = 'queued' | 'dispatched' | 'executing' | 'completed' | 'failed' | 'cancelled';
export type TaskType = 'inference' | 'code-gen' | 'analysis' | 'orchestration' | 'custom';

export interface TaskRequirements {
    /** Required capabilities (e.g., ['code', 'vision', 'reasoning']) */
    capabilities: string[];
    /** Minimum context window size */
    minContextWindow?: number;
    /** Preferred model types */
    preferredModels?: string[];
    /** Maximum acceptable latency in ms */
    maxLatency?: number;
    /** Required language support */
    languages?: string[];
}

export interface TaskPayload {
    /** Main prompt/instruction */
    prompt: string;
    /** System prompt override */
    systemPrompt?: string;
    /** Additional context */
    context?: Record<string, unknown>;
    /** File attachments */
    attachments?: Attachment[];
}

export interface Attachment {
    id: string;
    type: 'file' | 'image' | 'code';
    name: string;
    content: string | Buffer;
    mimeType?: string;
}

export interface TaskRouting {
    /** Assigned agent ID */
    assignedAgent?: string;
    /** Preferred adapter types */
    preferredAdapters?: string[];
    /** Fallback strategy when no agent available */
    fallbackStrategy: 'queue' | 'next-available' | 'fail';
}

export interface TaskLifecycle {
    status: TaskStatus;
    createdAt: number;
    dispatchedAt?: number;
    startedAt?: number;
    completedAt?: number;
    attempts: number;
    maxRetries: number;
    lastError?: string;
}

export interface TaskDependencies {
    /** Task IDs that must complete before this task can start */
    blockedBy: string[];
    /** Task IDs waiting for this task to complete */
    blocks: string[];
}

export interface TaskMetrics {
    executionTime: number;
    tokensUsed?: number;
    cost?: number;
    model: string;
    agentId: string;
    adapter: string;
}

export interface TaskResult {
    output: unknown;
    metrics: TaskMetrics;
    evalScore?: number;
    warnings?: string[];
}

/**
 * SwarmTask - The universal task representation for all agent types
 */
export interface SwarmTask {
    id: string;
    priority: TaskPriority;
    type: TaskType;
    requirements: TaskRequirements;
    payload: TaskPayload;
    routing: TaskRouting;
    lifecycle: TaskLifecycle;
    dependencies: TaskDependencies;
    result?: TaskResult;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// AGENT DEFINITIONS
// ============================================================================

export type AgentStatus = 'idle' | 'busy' | 'paused' | 'error' | 'offline';
export type AdapterType = 'claude' | 'ollama' | 'gemini' | 'openai' | 'mcp' | 'generic';

export interface AgentCapabilities {
    /** Adapter type */
    adapter: AdapterType;
    /** Model identifier */
    model: string;
    /** Supported capabilities */
    capabilities: string[];
    /** Context window size */
    contextWindow: number;
    /** Supported languages */
    languages: string[];
    /** Maximum concurrent tasks */
    maxConcurrent: number;
    /** Average response latency */
    avgLatency?: number;
    /** Cached project contexts */
    cachedContexts?: string[];
}

export interface AgentMetrics {
    cpu: number;
    memory: number;
    currentLoad: number;
    tasksCompleted: number;
    tasksFailed: number;
    avgResponseTime: number;
    lastActive: number;
}

export interface AgentHandle {
    id: string;
    name: string;
    adapter: AdapterType;
    status: AgentStatus;
    capabilities: AgentCapabilities;
    metrics: AgentMetrics;
    currentTasks: string[];
    pid?: number;
    sessionId?: string;
    project?: string;
    /** Whether this agent supports programmatic task dispatch (false = monitoring only) */
    dispatchable?: boolean;
}

// ============================================================================
// MESSAGE PROTOCOL (IACMP - Inter-Agent Communication Message Protocol)
// ============================================================================

export type MessageType =
    | 'TASK_DISPATCH'          // Send task to agent
    | 'TASK_STATUS_UPDATE'     // Agent reports status
    | 'TASK_RESULT'            // Agent sends result
    | 'CONTEXT_SHARE'          // Share context between agents
    | 'CAPABILITY_ANNOUNCE'    // Agent announces capabilities
    | 'HEARTBEAT'              // Keep-alive
    | 'HANDOFF_REQUEST'        // Request task handoff
    | 'HANDOFF_ACCEPT'         // Accept handoff
    | 'HANDOFF_REJECT'         // Reject handoff
    | 'EVAL_REQUEST'           // Request evaluation
    | 'EVAL_RESULT'            // Evaluation result
    | 'CONTROL_PAUSE'          // Pause agent
    | 'CONTROL_RESUME'         // Resume agent
    | 'CONTROL_SHUTDOWN'       // Graceful shutdown
    | 'ERROR'                  // Error notification
    | 'ACK';                   // Acknowledgment

export interface MessageHeader {
    version: '1.0';
    messageId: string;
    timestamp: number;
    correlationId?: string;
    traceId?: string;
}

export interface AgentRef {
    agentId: string;
    adapter: AdapterType;
    sessionId?: string;
}

export interface MessageRouting {
    source: AgentRef;
    destination: AgentRef | { broadcast: true; adapterFilter?: AdapterType };
}

export interface MessageMetadata {
    priority: number;
    ttl?: number;
    encrypted?: boolean;
    requiresAck?: boolean;
}

/**
 * IACMessage - Inter-Agent Communication Message Protocol
 */
export interface IACMessage {
    header: MessageHeader;
    routing: MessageRouting;
    payload: {
        type: MessageType;
        data: unknown;
    };
    metadata?: MessageMetadata;
}

// ============================================================================
// EVENT BUS DEFINITIONS
// ============================================================================

export type EventType =
    | 'task:created'
    | 'task:queued'
    | 'task:dispatched'
    | 'task:started'
    | 'task:completed'
    | 'task:failed'
    | 'task:cancelled'
    | 'task:handoff_initiated'
    | 'task:handoff_requested'
    | 'task:handoff_completed'
    | 'task:handoff_rejected'
    | 'task:handoff_cancelled'
    | 'agent:registered'
    | 'agent:unregistered'
    | 'agent:status_changed'
    | 'agent:capability_updated'
    | 'message:received'
    | 'message:sent'
    | 'conflict:detected'
    | 'conflict:resolved'
    | 'eval:started'
    | 'eval:completed'
    | 'scheduler:paused'
    | 'scheduler:resumed';

export interface SwarmEvent {
    id: string;
    type: EventType;
    timestamp: number;
    source: string;
    data: unknown;
}

export type EventHandler = (event: SwarmEvent) => void | Promise<void>;

// ============================================================================
// SCHEDULER DEFINITIONS
// ============================================================================

export interface SchedulerConfig {
    /** Enable/disable scheduling */
    enabled: boolean;
    /** Scheduling interval in ms */
    interval: number;
    /** Maximum queue depth before backpressure */
    maxQueueDepth: number;
    /** CPU threshold for agent selection */
    cpuThreshold: number;
    /** Memory threshold for agent selection */
    memoryThreshold: number;
    /** Enable priority inheritance for blocked tasks */
    priorityInheritance: boolean;
}

export interface SchedulerStats {
    isRunning: boolean;
    queueDepth: number;
    dispatchedCount: number;
    completedCount: number;
    failedCount: number;
    avgDispatchLatency: number;
    avgExecutionTime: number;
}

// ============================================================================
// CONFLICT RESOLUTION
// ============================================================================

export type ConflictType =
    | 'resource_contention'
    | 'task_collision'
    | 'deadlock'
    | 'priority_inversion';

export interface Conflict {
    id: string;
    type: ConflictType;
    involvedTasks: string[];
    involvedAgents: string[];
    detectedAt: number;
    resolvedAt?: number;
    resolution?: ResolutionAction;
}

export type ResolutionActionType = 'cancel' | 'requeue' | 'reassign' | 'merge' | 'wait';

export interface ResolutionAction {
    type: ResolutionActionType;
    taskId: string;
    reason: string;
    compensationAction?: {
        type: string;
        delay?: number;
        removeDependency?: boolean;
    };
}

// ============================================================================
// API TYPES
// ============================================================================

export interface CreateTaskRequest {
    priority?: TaskPriority;
    type?: TaskType;
    prompt: string;
    systemPrompt?: string;
    context?: Record<string, unknown>;
    requirements?: Partial<TaskRequirements>;
    preferredAdapters?: string[];
    dependencies?: string[];
    maxRetries?: number;
}

export interface TaskResponse {
    task: SwarmTask;
    position?: number;
    estimatedWait?: number;
}

export interface QueueStatusResponse {
    stats: SchedulerStats;
    queue: Array<{
        id: string;
        priority: TaskPriority;
        status: TaskStatus;
        position: number;
        waitTime: number;
    }>;
}
