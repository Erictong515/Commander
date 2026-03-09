import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import si from 'systeminformation';
import http from 'http';
import { claudeTracker } from './claudeTracker.js';
import { ollamaTracker } from './ollamaTracker.js';
import {
    orchestrator,
    taskQueue,
    eventBus,
    messageRouter,
    handoffManager,
    conflictResolver,
    type CreateTaskRequest,
} from './controlPlane/index.js';
import { evalPipeline } from './evals/index.js';
import {
    adapterRegistry,
    claudeAdapter,
    ollamaAdapter,
    geminiAdapter,
} from './adapters/index.js';
import { loadHistory, saveSnapshot, getHistory, getStats as getHistoryStats } from './history.js';

const app = express();
app.use(cors());
app.use(express.json()); // Must be before routes for req.body parsing

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3001;

// Load history on startup
loadHistory();

// Snapshot every 30 seconds
setInterval(async () => {
    const agents = await getAllLocalAgents();
    const sysInfo = await si.currentLoad();
    const mem = await si.mem();
    const systemCpu = sysInfo.currentLoad;
    const systemMemory = mem.used / mem.total * 100;
    saveSnapshot(
        agents.map(a => ({ id: a.id, name: a.name, cpu: a.cpu, memory: a.memory, status: a.status })),
        systemCpu,
        systemMemory
    );
}, 30_000);

// Define the target CLI processes to monitor
// Each entry has a match pattern and exclusion patterns to avoid false positives
const AGENT_RULES = [
    { id: 'claude', label: 'Claude CLI', type: 'CLI' as const, match: (name: string, cmd: string) => name === 'claude' || cmd === 'claude' || cmd.includes('/claude ') || cmd.startsWith('claude ') },
    { id: 'codex', label: 'Codex CLI', type: 'CLI' as const, match: (name: string, cmd: string) => name === 'codex' || cmd === 'codex' || cmd.includes('/codex ') || cmd.startsWith('codex ') },
    { id: 'gcloud', label: 'Google CLI', type: 'CLI' as const, match: (name: string, cmd: string) => name === 'gcloud' || cmd === 'gcloud' || cmd.includes('/gcloud ') || cmd.startsWith('gcloud ') },
    { id: 'gemini', label: 'Gemini CLI', type: 'CLI' as const, match: (name: string, cmd: string) => name === 'gemini' || cmd === 'gemini' || cmd.includes('/gemini ') || cmd.includes('/bin/gemini') || cmd.startsWith('gemini ') },
    // Ollama Server (API service) - ollama serve
    { id: 'ollama-server', label: 'Ollama Server', type: 'Local-LLM' as const, match: (_name: string, cmd: string) => cmd.includes('ollama serve') || cmd.includes('ollama-serve') },
    // Ollama GUI App - exclude from agent list (it's just the menu bar app)
    { id: 'ollama-gui', label: 'Ollama GUI', type: 'Local-LLM' as const, match: (_name: string, cmd: string) => cmd.includes('Ollama.app/Contents/MacOS/Ollama') && !cmd.includes('serve') },
];

// Processes to explicitly exclude (browser, drivers, helpers, GUI apps)
const EXCLUDED_PATTERNS = [
    'google chrome', 'googlechrome', 'google drive', 'googledrive',
    'googleupdate', 'google software', 'googlesoftware', 'crashpad',
    'chrome_crashpad', 'keystone', 'chrome helper', 'gpu-process',
    'Ollama.app/Contents/MacOS/Ollama', // Ollama GUI app (menu bar), not the server
];

interface ClaudeTask {
    taskId: string;
    subject: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'deleted';
    owner?: string;
    activeForm?: string;
}

interface AgentStatus {
    id: string;
    name: string;
    type: 'CLI' | 'Local-LLM';
    status: 'active' | 'processing' | 'idle';
    cpu: number;
    memory: number; // in MB
    pid?: number;
    environment: string;
    currentTask?: string; // For Claude CLI: the current task/message it's working on
    sessionId?: string; // For Claude CLI: the session identifier
    project?: string; // For Claude CLI: the working directory
    tasks?: ClaudeTask[]; // For Claude CLI: list of tasks in current session
}

// Function to fetch system processes
async function getProcessAgents(): Promise<AgentStatus[]> {
    try {
        const processes = await si.processes();
        const agents: AgentStatus[] = [];

        // Get Claude session info for enrichment
        const claudeSessions = await claudeTracker.getActiveSessionsWithValidation();

        // Track which Claude session has been assigned to avoid duplicates
        let claudeSessionAssigned = false;

        for (const proc of processes.list) {
            const procName = proc.name.toLowerCase();
            const command = proc.command.toLowerCase();
            const params = (proc.params || '').toLowerCase();
            const fullCommand = `${command} ${params}`;

            // Skip explicitly excluded processes
            if (EXCLUDED_PATTERNS.some(p => procName.includes(p) || fullCommand.includes(p))) {
                continue;
            }

            const rule = AGENT_RULES.find(r => r.match(procName, fullCommand));

            if (rule) {
                const agent: AgentStatus = {
                    id: `proc-${proc.pid}`,
                    name: rule.label,
                    type: rule.type,
                    status: proc.cpu > 5 ? 'processing' : 'active',
                    cpu: Number(proc.cpu.toFixed(1)),
                    memory: Number((proc.memRss / 1024).toFixed(1)), // KB to MB
                    pid: proc.pid,
                    environment: 'Terminal',
                };

                // Enrich Claude CLI agents with session information
                // Only assign session info to the FIRST Claude process to avoid duplicates
                if (rule.id === 'claude' && claudeSessions.length > 0 && !claudeSessionAssigned) {
                    const mostRecentSession = claudeSessions[0];
                    agent.currentTask = mostRecentSession.currentTask; // Now contains task subject/activeForm
                    agent.sessionId = mostRecentSession.sessionId;
                    agent.project = mostRecentSession.project;

                    // Tasks are already fetched in getActiveSessionsWithValidation
                    agent.tasks = mostRecentSession.tasks || [];

                    claudeSessionAssigned = true;
                }

                agents.push(agent);
            }
        }

        return agents;
    } catch (error) {
        console.error('Error fetching processes:', error);
        return [];
    }
}

// Function to fetch active Ollama models
async function getOllamaModels(): Promise<AgentStatus[]> {
    try {
        // Get running models with task information
        const sessions = await ollamaTracker.getActiveSessionsWithTasks();
        const agents: AgentStatus[] = [];

        for (const session of sessions) {
            agents.push({
                id: session.sessionId,
                name: session.model,
                type: 'Local-LLM',
                status: session.isLoaded ? 'processing' : 'idle',
                cpu: 0, // Ollama API doesn't standardly expose precise per-model CPU in /ps yet
                memory: Number((session.size / (1024 * 1024)).toFixed(1)), // Bytes to MB
                environment: session.isLoaded ? 'Ollama Engine (Active)' : 'Ollama Engine',
                currentTask: session.currentTask,
                sessionId: session.sessionId,
                tasks: session.tasks.map(t => ({
                    taskId: t.taskId,
                    subject: t.subject,
                    description: t.description,
                    // Map Ollama status to frontend status
                    status: t.status === 'active' ? 'in_progress' as const
                          : t.status === 'completed' ? 'completed' as const
                          : 'pending' as const,
                })),
            });
        }

        return agents;
    } catch (error) {
        // Ollama might not be running
        return [];
    }
}

// Aggregation function
async function getAllLocalAgents(): Promise<AgentStatus[]> {
    const [processes, ollamaModels] = await Promise.all([
        getProcessAgents(),
        getOllamaModels()
    ]);

    // Combine and deduplicate roughly (e.g. if ollama daemon and ollama model both show up, keep both but with different types)
    return [...processes, ...ollamaModels];
}

// WebSocket broadcast
function broadcastAgents() {
    getAllLocalAgents().then(agents => {
        const message = JSON.stringify({ type: 'AGENTS_UPDATE', data: agents });
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });
}

// Polling interval
setInterval(broadcastAgents, 2000);

wss.on('connection', (ws) => {
    console.log('Client connected to Local Agent Tracker');
    // Send immediate update on connection
    getAllLocalAgents().then(agents => {
        ws.send(JSON.stringify({ type: 'AGENTS_UPDATE', data: agents }));
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

app.get('/', (_, res) => {
    res.send('<h1>Local Agent Tracker Daemon is running</h1><p>Frontend should connect via WebSocket.</p>');
});

app.get('/api/health', (_, res) => {
    res.json({ status: 'ok', service: 'Local Agent Tracker' });
});

// REST endpoint: get all agents
app.get('/api/agents', async (_, res) => {
    const agents = await getAllLocalAgents();
    res.json({ agents, timestamp: Date.now() });
});

// REST endpoint: get system info
app.get('/api/system', async (_, res) => {
    try {
        const [cpu, mem, osInfo, time] = await Promise.all([
            si.cpu(),
            si.mem(),
            si.osInfo(),
            si.time(),
        ]);
        res.json({
            hostname: osInfo.hostname,
            platform: osInfo.platform,
            distro: osInfo.distro,
            arch: osInfo.arch,
            cpuModel: cpu.manufacturer + ' ' + cpu.brand,
            cpuCores: cpu.cores,
            totalMemory: Number((mem.total / (1024 * 1024 * 1024)).toFixed(1)),
            usedMemory: Number((mem.used / (1024 * 1024 * 1024)).toFixed(1)),
            uptime: time.uptime,
        });
    } catch {
        res.status(500).json({ error: 'Failed to get system info' });
    }
});

// Command & Control: kill an agent process by PID
app.post('/api/agents/:pid/kill', (req, res) => {
    const pid = parseInt(req.params.pid, 10);
    if (isNaN(pid)) {
        res.status(400).json({ error: 'Invalid PID' });
        return;
    }
    try {
        process.kill(pid, 'SIGTERM');
        res.json({ success: true, message: `Sent SIGTERM to PID ${pid}` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Claude Tracker API: get all active Claude sessions
app.get('/api/claude/sessions', async (_, res) => {
    try {
        const sessions = await claudeTracker.getActiveSessionsWithValidation();
        res.json({ sessions, timestamp: Date.now() });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Claude Tracker API: get specific session details
app.get('/api/claude/sessions/:sessionId', async (req, res) => {
    try {
        const session = await claudeTracker.getSessionDetails(req.params.sessionId);
        if (session) {
            res.json({ session });
        } else {
            res.status(404).json({ error: 'Session not found' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Claude Tracker API: get tasks for a specific session
app.get('/api/claude/sessions/:sessionId/tasks', async (req, res) => {
    try {
        const tasks = await claudeTracker.getSessionTasks(req.params.sessionId);
        res.json({ tasks, timestamp: Date.now() });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Ollama Tracker API: get all active Ollama sessions
app.get('/api/ollama/sessions', async (_, res) => {
    try {
        const sessions = await ollamaTracker.getActiveSessionsWithTasks();
        res.json({ sessions, timestamp: Date.now() });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Ollama Tracker API: get specific session details
app.get('/api/ollama/sessions/:modelName', async (req, res) => {
    try {
        const session = await ollamaTracker.getSessionDetails(req.params.modelName);
        if (session) {
            res.json({ session });
        } else {
            res.status(404).json({ error: 'Model session not found' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Ollama Tracker API: check if Ollama is running
app.get('/api/ollama/health', async (_, res) => {
    try {
        const isRunning = await ollamaTracker.isOllamaRunning();
        res.json({ running: isRunning, timestamp: Date.now() });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Ollama Task Tracking API: start a task
app.post('/api/ollama/tasks/start', (req, res) => {
    try {
        const { model, subject, description } = req.body;
        if (!model || !subject) {
            res.status(400).json({ error: 'model and subject are required' });
            return;
        }
        const taskId = ollamaTracker.startTask(model, subject, description || '');
        res.json({ taskId, status: 'started', model, subject });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Ollama Task Tracking API: complete a task
app.post('/api/ollama/tasks/:taskId/complete', (req, res) => {
    try {
        const { taskId } = req.params;
        const { success } = req.body;
        ollamaTracker.completeTask(taskId, success !== false);
        res.json({ taskId, status: success !== false ? 'completed' : 'failed' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Ollama Task Tracking API: get active tasks
app.get('/api/ollama/tasks/active', (_, res) => {
    try {
        const tasks = ollamaTracker.getAllActiveTasks();
        res.json({ tasks, count: tasks.length });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Gemini Task History API: get task history
app.get('/api/gemini/tasks/history', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
        const history = await geminiAdapter.getTaskHistory(limit);
        res.json({ history, count: history.length });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Gemini Task Report API: get full task report by ID
app.get('/api/gemini/tasks/:taskId/report', async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await geminiAdapter.getTaskReport(taskId);

        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        res.json({
            taskId: task.taskId,
            subject: task.subject,
            agentId: task.agentId,
            startTime: task.startTime,
            endTime: task.endTime,
            duration: task.duration,
            success: task.success,
            report: task.output,
            metadata: {
                reportLength: task.output?.length || 0,
                generatedAt: new Date(task.endTime).toISOString(),
            }
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Ollama Task Tracking API: get task history
app.get('/api/ollama/tasks/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const history = ollamaTracker.getTaskHistory(limit);
        res.json({ history, count: history.length });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// CONTROL PLANE APIs (Agent Swarm Orchestration)
// ============================================================================

// Submit a new task to the orchestrator
app.post('/api/tasks', (req, res) => {
    try {
        const request: CreateTaskRequest = req.body;

        if (!request.prompt) {
            res.status(400).json({ error: 'prompt is required' });
            return;
        }

        const task = orchestrator.submitTask(request);
        const position = taskQueue.getPosition(task.id);

        res.status(201).json({
            task,
            position,
            message: 'Task queued successfully',
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get all tasks
app.get('/api/tasks', (_, res) => {
    try {
        const stats = taskQueue.getStats();
        const queued = taskQueue.getByStatus('queued').map(t => ({
            id: t.id,
            priority: t.priority,
            status: t.lifecycle.status,
            position: taskQueue.getPosition(t.id),
            createdAt: t.lifecycle.createdAt,
        }));

        res.json({
            stats,
            tasks: queued,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get task by ID
app.get('/api/tasks/:taskId', (req, res) => {
    try {
        const task = taskQueue.get(req.params.taskId);
        if (task) {
            res.json({ task });
        } else {
            res.status(404).json({ error: 'Task not found' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Cancel a task
app.delete('/api/tasks/:taskId', (req, res) => {
    try {
        const success = taskQueue.cancel(req.params.taskId);
        if (success) {
            res.json({ success: true, message: 'Task cancelled' });
        } else {
            res.status(404).json({ error: 'Task not found or already completed' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get scheduler status
app.get('/api/scheduler/status', (_, res) => {
    try {
        const stats = orchestrator.getStats();
        const agents = orchestrator.getAgents().map(a => ({
            id: a.id,
            name: a.name,
            adapter: a.adapter,
            status: a.status,
            currentTasks: a.currentTasks.length,
            metrics: a.metrics,
        }));

        res.json({
            scheduler: stats,
            agents,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get queue status
app.get('/api/scheduler/queue', (_, res) => {
    try {
        const eligible = taskQueue.getEligibleTasks();
        const deadlocks = taskQueue.detectDeadlocks();

        res.json({
            queueDepth: taskQueue.depth,
            totalTasks: taskQueue.size,
            eligibleTasks: eligible.map(t => ({
                id: t.id,
                priority: t.priority,
                type: t.type,
                createdAt: t.lifecycle.createdAt,
            })),
            deadlocks: deadlocks.length > 0 ? deadlocks : undefined,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Pause scheduler
app.post('/api/scheduler/pause', (_, res) => {
    try {
        orchestrator.stop();
        res.json({ success: true, message: 'Scheduler paused' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Resume scheduler
app.post('/api/scheduler/resume', (_, res) => {
    try {
        orchestrator.start();
        res.json({ success: true, message: 'Scheduler resumed' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get advanced scheduler metrics
app.get('/api/scheduler/metrics', (_, res) => {
    try {
        const metrics = orchestrator.getSchedulerMetrics();
        res.json({
            metrics,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get dispatch history
app.get('/api/scheduler/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const history = orchestrator.getDispatchHistory(limit);
        res.json({
            history,
            count: history.length,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get routing recommendations for a task
app.post('/api/scheduler/recommend', (req, res) => {
    try {
        const task = taskQueue.get(req.body.taskId);
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        const recommendations = orchestrator.getRoutingRecommendations(task);
        res.json({
            taskId: req.body.taskId,
            ...recommendations,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get event history
app.get('/api/events', (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 100;
        const since = req.query.since ? parseInt(req.query.since as string) : undefined;
        const type = req.query.type as string | undefined;

        const events = eventBus.getHistory({
            type: type as any,
            since,
            limit,
        });

        res.json({
            events,
            stats: eventBus.getStats(),
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get registry statistics
app.get('/api/adapters/stats', (_, res) => {
    try {
        const stats = adapterRegistry.getStats();
        res.json({
            ...stats,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get agents by adapter type
app.get('/api/adapters/:type/agents', (req, res) => {
    try {
        const adapter = adapterRegistry.getAdapter(req.params.type as any);
        if (!adapter) {
            res.status(404).json({ error: 'Adapter not found' });
            return;
        }

        const agents = adapter.getAgents();
        res.json({
            adapter: req.params.type,
            agents,
            count: agents.length,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// IACMP (Inter-Agent Communication Message Protocol) APIs
// ============================================================================

// Get message history
app.get('/api/messages/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const type = req.query.type as string | undefined;
        const agentId = req.query.agentId as string | undefined;
        const since = req.query.since ? parseInt(req.query.since as string) : undefined;

        const messages = messageRouter.getHistory({
            type: type as any,
            agentId,
            since,
            limit,
        });

        res.json({
            messages,
            count: messages.length,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get message statistics
app.get('/api/messages/stats', (_, res) => {
    try {
        const stats = messageRouter.getStats();
        res.json({
            ...stats,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Clear message history
app.delete('/api/messages/history', (_, res) => {
    try {
        messageRouter.clearHistory();
        res.json({ success: true, message: 'Message history cleared' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// Handoff Management APIs
// ============================================================================

// Initiate a task handoff
app.post('/api/handoffs', async (req, res) => {
    try {
        const { taskId, fromAgentId, toAgentId, reason, context } = req.body;

        if (!taskId || !fromAgentId || !toAgentId) {
            res.status(400).json({ error: 'taskId, fromAgentId, and toAgentId are required' });
            return;
        }

        const task = taskQueue.get(taskId);
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        const fromAgent = orchestrator.getAgent(fromAgentId);
        const toAgent = orchestrator.getAgent(toAgentId);

        if (!fromAgent) {
            res.status(404).json({ error: 'Source agent not found' });
            return;
        }
        if (!toAgent) {
            res.status(404).json({ error: 'Target agent not found' });
            return;
        }

        const result = await handoffManager.initiateHandoff(
            task,
            fromAgent,
            toAgent,
            reason || 'Manual handoff request',
            context
        );

        if (result.success) {
            res.status(201).json({
                ...result,
                message: 'Handoff initiated successfully',
            });
        } else {
            res.status(500).json(result);
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get pending handoffs
app.get('/api/handoffs', (req, res) => {
    try {
        const taskId = req.query.taskId as string | undefined;
        const agentId = req.query.agentId as string | undefined;
        const status = req.query.status as string | undefined;
        const limit = parseInt(req.query.limit as string) || 50;

        // Get both pending and history
        const pending = handoffManager.getPendingHandoffs();
        const history = handoffManager.getHistory({
            taskId,
            agentId,
            status: status as any,
            limit,
        });

        res.json({
            pending,
            history,
            stats: handoffManager.getStats(),
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get handoff by ID
app.get('/api/handoffs/:handoffId', (req, res) => {
    try {
        const handoff = handoffManager.getHandoff(req.params.handoffId);
        if (handoff) {
            res.json({ handoff });
        } else {
            res.status(404).json({ error: 'Handoff not found' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Cancel a pending handoff
app.delete('/api/handoffs/:handoffId', (req, res) => {
    try {
        const success = handoffManager.cancelHandoff(req.params.handoffId);
        if (success) {
            res.json({ success: true, message: 'Handoff cancelled' });
        } else {
            res.status(404).json({ error: 'Handoff not found or not pending' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Find best handoff target for a task
app.post('/api/handoffs/recommend', (req, res) => {
    try {
        const { taskId, currentAgentId } = req.body;

        if (!taskId || !currentAgentId) {
            res.status(400).json({ error: 'taskId and currentAgentId are required' });
            return;
        }

        const task = taskQueue.get(taskId);
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        const currentAgent = orchestrator.getAgent(currentAgentId);
        if (!currentAgent) {
            res.status(404).json({ error: 'Current agent not found' });
            return;
        }

        const availableAgents = orchestrator.getAgents();
        const recommendation = handoffManager.findHandoffTarget(task, currentAgent, availableAgents);

        res.json({
            taskId,
            currentAgentId,
            recommendedAgent: recommendation ? {
                id: recommendation.id,
                name: recommendation.name,
                adapter: recommendation.adapter,
                status: recommendation.status,
                currentLoad: recommendation.metrics.currentLoad,
            } : null,
            availableAgentsCount: availableAgents.filter(a =>
                a.id !== currentAgentId &&
                a.status !== 'offline' &&
                a.status !== 'error'
            ).length,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// Conflict Resolution APIs
// ============================================================================

// Get active conflicts
app.get('/api/conflicts', (req, res) => {
    try {
        const type = req.query.type as string | undefined;
        const severity = req.query.severity as string | undefined;
        const limit = parseInt(req.query.limit as string) || 50;

        const active = conflictResolver.getActiveConflicts();
        const history = conflictResolver.getHistory({
            type: type as any,
            severity,
            limit,
        });

        res.json({
            active,
            history,
            stats: conflictResolver.getStats(),
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get conflict by ID
app.get('/api/conflicts/:conflictId', (req, res) => {
    try {
        const conflict = conflictResolver.getConflict(req.params.conflictId);
        if (conflict) {
            res.json({ conflict });
        } else {
            res.status(404).json({ error: 'Conflict not found' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get conflict statistics
app.get('/api/conflicts/stats', (_, res) => {
    try {
        const stats = conflictResolver.getStats();
        res.json({
            ...stats,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Run conflict detection manually
app.post('/api/conflicts/detect', (_, res) => {
    try {
        const detected = conflictResolver.runDetection();
        res.json({
            detected,
            count: detected.length,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Resolve a specific conflict
app.post('/api/conflicts/:conflictId/resolve', async (req, res) => {
    try {
        const result = await conflictResolver.resolve(req.params.conflictId);
        res.json({
            conflictId: req.params.conflictId,
            ...result,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Resolve all active conflicts
app.post('/api/conflicts/resolve-all', async (_, res) => {
    try {
        const result = await conflictResolver.resolveAll();
        res.json({
            ...result,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Start/stop conflict detection
app.post('/api/conflicts/start', (req, res) => {
    try {
        const interval = parseInt(req.query.interval as string) || 5000;
        conflictResolver.start(interval);
        res.json({ success: true, message: `Conflict detection started with ${interval}ms interval` });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/conflicts/stop', (_, res) => {
    try {
        conflictResolver.stop();
        res.json({ success: true, message: 'Conflict detection stopped' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================================================
// Eval Pipeline APIs
// ============================================================================

// Run eval immediately
app.post('/api/evals/run', async (req, res) => {
    try {
        const suite = (req.query.suite as string) || 'all';
        const report = await evalPipeline.runEval(suite as any);
        res.json({
            report,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get latest eval report
app.get('/api/evals/latest', (_, res) => {
    try {
        const report = evalPipeline.getLatestReport();
        if (report) {
            res.json({ report });
        } else {
            res.status(404).json({ error: 'No eval reports available' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get eval history
app.get('/api/evals/history', (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;
        const reports = evalPipeline.getReports(limit);
        res.json({
            reports,
            count: reports.length,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get pipeline stats
app.get('/api/evals/stats', (_, res) => {
    try {
        const stats = evalPipeline.getStats();
        res.json({
            ...stats,
            timestamp: Date.now(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Add eval schedule
app.post('/api/evals/schedules', (req, res) => {
    try {
        const { suite, intervalMs } = req.body;
        if (!suite || !intervalMs) {
            res.status(400).json({ error: 'suite and intervalMs are required' });
            return;
        }

        const scheduleId = evalPipeline.addSchedule(suite, intervalMs);
        res.status(201).json({
            scheduleId,
            message: `Schedule added: ${suite} every ${intervalMs / 1000}s`,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Remove eval schedule
app.delete('/api/evals/schedules/:scheduleId', (req, res) => {
    try {
        const success = evalPipeline.removeSchedule(req.params.scheduleId);
        if (success) {
            res.json({ success: true, message: 'Schedule removed' });
        } else {
            res.status(404).json({ error: 'Schedule not found' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle schedule
app.patch('/api/evals/schedules/:scheduleId', (req, res) => {
    try {
        const { enabled } = req.body;
        if (typeof enabled !== 'boolean') {
            res.status(400).json({ error: 'enabled (boolean) is required' });
            return;
        }

        const success = evalPipeline.toggleSchedule(req.params.scheduleId, enabled);
        if (success) {
            res.json({ success: true, message: `Schedule ${enabled ? 'enabled' : 'disabled'}` });
        } else {
            res.status(404).json({ error: 'Schedule not found' });
        }
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Start default schedules
app.post('/api/evals/start', (_, res) => {
    try {
        evalPipeline.startDefaultSchedules();
        res.json({ success: true, message: 'Default eval schedules started' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Stop all schedules
app.post('/api/evals/stop', (_, res) => {
    try {
        evalPipeline.stopAll();
        res.json({ success: true, message: 'All eval schedules stopped' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Get agent history
app.get('/api/history', (req, res) => {
    const rangeMap: Record<string, number> = {
        '1h': 3600_000,
        '6h': 21600_000,
        '24h': 86400_000,
    };
    const range = (req.query.range as string) || '1h';
    const rangeMs = rangeMap[range] ?? rangeMap['1h'];
    res.json({ snapshots: getHistory(rangeMs), range, timestamp: Date.now() });
});

// Get history stats (per-agent averages)
app.get('/api/history/stats', (_req, res) => {
    res.json({ stats: getHistoryStats(), timestamp: Date.now() });
});

// ============================================================================
// Server Startup
// ============================================================================

server.listen(PORT, () => {
    console.log(`Local Agent Tracker daemon running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);

    // Register adapters
    adapterRegistry.register(claudeAdapter);
    adapterRegistry.register(ollamaAdapter);
    adapterRegistry.register(geminiAdapter);

    // Start all adapters
    adapterRegistry.startAll();
    console.log(`[Control Plane] Adapters started: Claude, Ollama, Gemini`);

    // Start the orchestrator scheduler
    orchestrator.start();
    console.log(`[Control Plane] Orchestrator started - Agent Swarm ready`);

    // Start conflict detection
    conflictResolver.start(5000);
    console.log(`[Control Plane] Conflict resolver started`);

    // Start eval pipeline with default schedules
    evalPipeline.startDefaultSchedules();
    console.log(`[Control Plane] Eval pipeline started`);
});
