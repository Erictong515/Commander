// EvalsAgent/evals/stability.eval.ts
// Stability & reliability evaluation suite
// Evaluates daemon uptime, WebSocket connectivity, and consistency

import type { EvalCase, EvalResult } from '../src/types.js';

const DAEMON_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

function now() { return new Date().toISOString(); }

/** EVAL-S01: Daemon health continuous check */
const daemonUptime: EvalCase = {
    id: 'EVAL-S01',
    name: 'Daemon Health Check',
    suite: 'stability',
    description: 'The daemon should respond to 5 consecutive health checks without failure.',
    async run(): Promise<EvalResult> {
        let successes = 0;
        const total = 5;

        for (let i = 0; i < total; i++) {
            try {
                const res = await fetch(`${DAEMON_URL}/api/health`);
                if (res.ok) successes++;
            } catch { /* count as failure */ }
            await new Promise((r) => setTimeout(r, 200));
        }

        const score = Math.round((successes / total) * 100);
        return {
            caseId: this.id, caseName: this.name, suite: this.suite,
            severity: successes === total ? 'pass' : successes >= 3 ? 'warn' : 'fail',
            score,
            message: `${successes}/${total} health checks passed`,
            metrics: { successes, total },
            timestamp: now(), durationMs: 0,
        };
    },
};

/** EVAL-S02: WebSocket connection and message receipt */
const wsConnectivity: EvalCase = {
    id: 'EVAL-S02',
    name: 'WebSocket Connectivity',
    suite: 'stability',
    description: 'Should be able to connect via WebSocket and receive at least one AGENTS_UPDATE within 5 seconds.',
    async run(): Promise<EvalResult> {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                resolve({
                    caseId: this.id, caseName: this.name, suite: this.suite,
                    severity: 'fail', score: 0,
                    message: 'Timeout: no message received within 5s',
                    timestamp: now(), durationMs: 5000,
                });
            }, 5000);

            try {
                // Dynamic import for ws in Node
                import('ws').then(({ default: WS }) => {
                    const ws = new WS(WS_URL);
                    const connectStart = Date.now();

                    ws.on('message', (data: any) => {
                        clearTimeout(timeout);
                        const latency = Date.now() - connectStart;
                        try {
                            const msg = JSON.parse(data.toString());
                            if (msg.type === 'AGENTS_UPDATE') {
                                ws.close();
                                resolve({
                                    caseId: this.id, caseName: this.name, suite: this.suite,
                                    severity: latency < 3000 ? 'pass' : 'warn',
                                    score: latency < 1000 ? 100 : latency < 3000 ? 70 : 40,
                                    message: `Connected and received AGENTS_UPDATE in ${latency}ms (${msg.data.length} agents)`,
                                    metrics: { latencyMs: latency, agentCount: msg.data.length },
                                    timestamp: now(), durationMs: latency,
                                });
                            }
                        } catch { /* ignore parse error, wait for valid message */ }
                    });

                    ws.on('error', () => {
                        clearTimeout(timeout);
                        ws.close();
                        resolve({
                            caseId: this.id, caseName: this.name, suite: this.suite,
                            severity: 'fail', score: 0,
                            message: 'WebSocket connection error',
                            timestamp: now(), durationMs: Date.now() - connectStart,
                        });
                    });
                });
            } catch (err: any) {
                clearTimeout(timeout);
                resolve({
                    caseId: this.id, caseName: this.name, suite: this.suite,
                    severity: 'fail', score: 0,
                    message: `WS module error: ${err.message}`,
                    timestamp: now(), durationMs: 0,
                });
            }
        });
    },
};

/** EVAL-S03: Data consistency between REST and WebSocket */
const dataConsistency: EvalCase = {
    id: 'EVAL-S03',
    name: 'REST vs WebSocket Consistency',
    suite: 'stability',
    description: 'Agent count from REST API and WebSocket should match (within tolerance of ±2 due to timing).',
    async run(): Promise<EvalResult> {
        // Get REST data
        const restRes = await fetch(`${DAEMON_URL}/api/agents`);
        const { agents: restAgents } = await restRes.json();

        // Get WS data
        const wsAgents: any[] = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve([]), 5000);
            import('ws').then(({ default: WS }) => {
                const ws = new WS(WS_URL);
                ws.on('message', (data: any) => {
                    clearTimeout(timeout);
                    const msg = JSON.parse(data.toString());
                    ws.close();
                    resolve(msg.data || []);
                });
                ws.on('error', () => { clearTimeout(timeout); resolve([]); });
            });
        });

        const diff = Math.abs(restAgents.length - wsAgents.length);
        const score = diff <= 2 ? 100 : diff <= 5 ? 60 : 20;

        return {
            caseId: this.id, caseName: this.name, suite: this.suite,
            severity: diff <= 2 ? 'pass' : diff <= 5 ? 'warn' : 'fail',
            score,
            message: `REST: ${restAgents.length} agents, WS: ${wsAgents.length} agents (diff: ${diff})`,
            metrics: { restCount: restAgents.length, wsCount: wsAgents.length, diff },
            timestamp: now(), durationMs: 0,
        };
    },
};

export const stabilityEvals: EvalCase[] = [daemonUptime, wsConnectivity, dataConsistency];
