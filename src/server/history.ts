// src/server/history.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_FILE = path.resolve(__dirname, '../../data/agent-history.json');
const MAX_SNAPSHOTS = 2880; // 24 hours at 30s intervals

interface AgentSnapshot {
    id: string;
    name: string;
    cpu: number;
    memory: number;
    status: string;
}

interface Snapshot {
    timestamp: number;
    agents: AgentSnapshot[];
    systemCpu: number;
    systemMemory: number;
}

interface HistoryStore {
    snapshots: Snapshot[];
}

let store: HistoryStore = { snapshots: [] };

export function loadHistory(): void {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
            store = JSON.parse(raw);
            console.log(`[History] Loaded ${store.snapshots.length} snapshots`);
        }
    } catch (e) {
        console.error('[History] Failed to load history, starting fresh:', e);
        store = { snapshots: [] };
    }
}

export function saveSnapshot(agents: AgentSnapshot[], systemCpu: number, systemMemory: number): void {
    store.snapshots.push({ timestamp: Date.now(), agents, systemCpu, systemMemory });
    if (store.snapshots.length > MAX_SNAPSHOTS) {
        store.snapshots = store.snapshots.slice(-MAX_SNAPSHOTS);
    }
    try {
        fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(store));
    } catch (e) {
        console.error('[History] Failed to write history:', e);
    }
}

export function getHistory(rangeMs: number): Snapshot[] {
    const cutoff = Date.now() - rangeMs;
    return store.snapshots.filter(s => s.timestamp >= cutoff);
}

export function getStats(): Record<string, { avgCpu: number; avgMemory: number; name: string }> {
    const recent = getHistory(3600_000); // last 1 hour
    const byId: Record<string, { cpus: number[]; mems: number[]; name: string }> = {};
    for (const snap of recent) {
        for (const a of snap.agents) {
            if (!byId[a.id]) byId[a.id] = { cpus: [], mems: [], name: a.name };
            byId[a.id].cpus.push(a.cpu);
            byId[a.id].mems.push(a.memory);
        }
    }
    const result: Record<string, { avgCpu: number; avgMemory: number; name: string }> = {};
    for (const [id, data] of Object.entries(byId)) {
        const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
        result[id] = { name: data.name, avgCpu: avg(data.cpus), avgMemory: avg(data.mems) };
    }
    return result;
}
