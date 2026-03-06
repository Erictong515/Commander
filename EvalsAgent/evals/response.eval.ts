// EvalsAgent/evals/response.eval.ts
// Response & API quality evaluation suite
// Evaluates daemon API correctness, latency, and data quality

import type { EvalCase, EvalResult } from '../src/types.js';

const DAEMON_URL = 'http://localhost:3001';

function now() { return new Date().toISOString(); }

/** EVAL-P01: Health endpoint latency */
const healthLatency: EvalCase = {
    id: 'EVAL-P01',
    name: 'Health Endpoint Latency',
    suite: 'response',
    description: 'The /api/health endpoint should respond in under 50ms.',
    async run(): Promise<EvalResult> {
        const start = Date.now();
        const res = await fetch(`${DAEMON_URL}/api/health`);
        const latency = Date.now() - start;
        const data = await res.json();

        const score = latency < 50 ? 100 : latency < 200 ? 70 : latency < 500 ? 40 : 10;
        return {
            caseId: this.id, caseName: this.name, suite: this.suite,
            severity: latency < 50 ? 'pass' : latency < 200 ? 'warn' : 'fail',
            score,
            message: `Responded in ${latency}ms. Status: ${data.status}`,
            metrics: { latencyMs: latency, status: data.status },
            timestamp: now(), durationMs: 0,
        };
    },
};

/** EVAL-P02: Agents endpoint data completeness */
const agentsDataQuality: EvalCase = {
    id: 'EVAL-P02',
    name: 'Agents Data Completeness',
    suite: 'response',
    description: 'Every agent returned by /api/agents should have all required fields populated.',
    async run(): Promise<EvalResult> {
        const res = await fetch(`${DAEMON_URL}/api/agents`);
        const { agents } = await res.json();

        if (agents.length === 0) {
            return { caseId: this.id, caseName: this.name, suite: this.suite, severity: 'warn', score: 50, message: 'No agents to validate', timestamp: now(), durationMs: 0 };
        }

        const requiredFields = ['id', 'name', 'type', 'status', 'cpu', 'memory', 'environment'];
        let missingCount = 0;

        for (const agent of agents) {
            for (const field of requiredFields) {
                if (agent[field] === undefined || agent[field] === null) {
                    missingCount++;
                }
            }
        }

        const totalChecks = agents.length * requiredFields.length;
        const completeness = ((totalChecks - missingCount) / totalChecks) * 100;
        const score = Math.round(completeness);

        return {
            caseId: this.id, caseName: this.name, suite: this.suite,
            severity: missingCount === 0 ? 'pass' : missingCount <= 3 ? 'warn' : 'fail',
            score,
            message: `${agents.length} agents, ${totalChecks - missingCount}/${totalChecks} fields populated (${completeness.toFixed(0)}%)`,
            metrics: { agentCount: agents.length, missingFields: missingCount, completenessPercent: completeness },
            timestamp: now(), durationMs: 0,
        };
    },
};

/** EVAL-P03: System info endpoint returns valid data */
const systemInfoValid: EvalCase = {
    id: 'EVAL-P03',
    name: 'System Info Validity',
    suite: 'response',
    description: '/api/system should return valid hostname, CPU model, core count, and memory info.',
    async run(): Promise<EvalResult> {
        const res = await fetch(`${DAEMON_URL}/api/system`);
        const data = await res.json();

        const checks = [
            { field: 'hostname', valid: typeof data.hostname === 'string' && data.hostname.length > 0 },
            { field: 'cpuModel', valid: typeof data.cpuModel === 'string' && data.cpuModel.length > 0 },
            { field: 'cpuCores', valid: typeof data.cpuCores === 'number' && data.cpuCores > 0 },
            { field: 'totalMemory', valid: typeof data.totalMemory === 'number' && data.totalMemory > 0 },
            { field: 'platform', valid: typeof data.platform === 'string' },
        ];

        const passed = checks.filter((c) => c.valid).length;
        const failed = checks.filter((c) => !c.valid).map((c) => c.field);
        const score = Math.round((passed / checks.length) * 100);

        return {
            caseId: this.id, caseName: this.name, suite: this.suite,
            severity: failed.length === 0 ? 'pass' : failed.length <= 1 ? 'warn' : 'fail',
            score,
            message: failed.length === 0 ? `All ${checks.length} fields valid` : `Missing/invalid: ${failed.join(', ')}`,
            metrics: { passedChecks: passed, totalChecks: checks.length, hostname: data.hostname || '?' },
            timestamp: now(), durationMs: 0,
        };
    },
};

/** EVAL-P04: Agents API latency */
const agentsLatency: EvalCase = {
    id: 'EVAL-P04',
    name: 'Agents API Latency',
    suite: 'response',
    description: 'The /api/agents endpoint should respond in under 500ms (includes process scanning).',
    async run(): Promise<EvalResult> {
        const start = Date.now();
        const res = await fetch(`${DAEMON_URL}/api/agents`);
        const latency = Date.now() - start;
        await res.json();

        const score = latency < 200 ? 100 : latency < 500 ? 70 : latency < 1000 ? 40 : 10;
        return {
            caseId: this.id, caseName: this.name, suite: this.suite,
            severity: latency < 500 ? 'pass' : latency < 1000 ? 'warn' : 'fail',
            score,
            message: `Process scan + response in ${latency}ms`,
            metrics: { latencyMs: latency },
            timestamp: now(), durationMs: 0,
        };
    },
};

export const responseEvals: EvalCase[] = [healthLatency, agentsDataQuality, systemInfoValid, agentsLatency];
