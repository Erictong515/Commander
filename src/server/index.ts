import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import si from 'systeminformation';
import http from 'http';
import { claudeTracker } from './claudeTracker.js';

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3001;

// Define the target CLI processes to monitor
// Each entry has a match pattern and exclusion patterns to avoid false positives
const AGENT_RULES = [
    { id: 'claude', label: 'Claude CLI', type: 'CLI' as const, match: (name: string, cmd: string) => name === 'claude' || cmd === 'claude' || cmd.includes('/claude ') || cmd.startsWith('claude ') },
    { id: 'codex', label: 'Codex CLI', type: 'CLI' as const, match: (name: string, cmd: string) => name === 'codex' || cmd === 'codex' || cmd.includes('/codex ') || cmd.startsWith('codex ') },
    { id: 'gcloud', label: 'Google CLI', type: 'CLI' as const, match: (name: string, cmd: string) => name === 'gcloud' || cmd === 'gcloud' || cmd.includes('/gcloud ') || cmd.startsWith('gcloud ') },
    { id: 'gemini', label: 'Gemini CLI', type: 'CLI' as const, match: (name: string, cmd: string) => name === 'gemini' || cmd === 'gemini' || cmd.includes('/gemini ') || cmd.startsWith('gemini ') },
    { id: 'ollama', label: 'Ollama Daemon', type: 'Local-LLM' as const, match: (name: string, cmd: string) => name === 'ollama' || (cmd.includes('ollama') && !cmd.includes('node')) },
];

// Processes to explicitly exclude (browser, drivers, helpers)
const EXCLUDED_PATTERNS = [
    'google chrome', 'googlechrome', 'google drive', 'googledrive',
    'googleupdate', 'google software', 'googlesoftware', 'crashpad',
    'chrome_crashpad', 'keystone', 'chrome helper', 'gpu-process',
];

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
}

// Function to fetch system processes
async function getProcessAgents(): Promise<AgentStatus[]> {
    try {
        const processes = await si.processes();
        const agents: AgentStatus[] = [];

        // Get Claude session info for enrichment
        const claudeSessions = await claudeTracker.getActiveSessionsWithValidation();

        processes.list.forEach((proc) => {
            const procName = proc.name.toLowerCase();
            const command = proc.command.toLowerCase();

            // Skip explicitly excluded processes
            if (EXCLUDED_PATTERNS.some(p => procName.includes(p) || command.includes(p))) {
                return;
            }

            const rule = AGENT_RULES.find(r => r.match(procName, command));

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
                if (rule.id === 'claude' && claudeSessions.length > 0) {
                    // Try to match Claude process with a session
                    // Use the most recent session as we can't directly match process to session
                    const mostRecentSession = claudeSessions[0];
                    agent.currentTask = mostRecentSession.currentTask;
                    agent.sessionId = mostRecentSession.sessionId;
                    agent.project = mostRecentSession.project;
                }

                agents.push(agent);
            }
        });

        return agents;
    } catch (error) {
        console.error('Error fetching processes:', error);
        return [];
    }
}

// Function to fetch active Ollama models
async function getOllamaModels(): Promise<AgentStatus[]> {
    try {
        const response = await fetch('http://localhost:11434/api/ps');
        if (!response.ok) return [];

        const data = await response.json();
        const agents: AgentStatus[] = [];

        if (data.models && Array.isArray(data.models)) {
            data.models.forEach((model: any) => {
                agents.push({
                    id: `ollama-${model.name}`,
                    name: model.name,
                    type: 'Local-LLM',
                    status: 'processing', // Since it's loaded in RAM
                    cpu: 0, // Ollama API doesn't standardly expose precise per-model CPU in /ps yet
                    memory: Number((model.size / (1024 * 1024)).toFixed(1)), // Bytes to MB
                    environment: 'Ollama Engine',
                });
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

app.use(express.json());

server.listen(PORT, () => {
    console.log(`Local Agent Tracker daemon running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
