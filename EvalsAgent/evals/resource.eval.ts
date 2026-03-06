// EvalsAgent/evals/resource.eval.ts
// Resource utilization evaluation suite
// Evaluates agent CPU/memory consumption patterns

import type { EvalCase, EvalResult } from '../src/types.js';

const DAEMON_URL = 'http://localhost:3001';

function now() { return new Date().toISOString(); }

/** EVAL-R01: Agent memory footprint should be reasonable */
const memoryFootprint: EvalCase = {
    id: 'EVAL-R01',
    name: 'Agent Memory Footprint',
    suite: 'resource',
    description: 'Each agent should use less than 2GB of RAM. Agents exceeding this threshold indicate potential memory leaks.',
    async run(): Promise<EvalResult> {
        const res = await fetch(`${DAEMON_URL}/api/agents`);
        const { agents } = await res.json();

        if (agents.length === 0) {
            return { caseId: this.id, caseName: this.name, suite: this.suite, severity: 'warn', score: 50, message: 'No agents detected to evaluate', timestamp: now(), durationMs: 0 };
        }

        const highMemAgents = agents.filter((a: any) => a.memory > 2048);
        const maxMem = Math.max(...agents.map((a: any) => a.memory));
        const score = highMemAgents.length === 0 ? 100 : Math.max(0, 100 - highMemAgents.length * 25);

        return {
            caseId: this.id, caseName: this.name, suite: this.suite,
            severity: highMemAgents.length === 0 ? 'pass' : highMemAgents.length <= 2 ? 'warn' : 'fail',
            score,
            message: `${agents.length} agents checked. Peak memory: ${maxMem.toFixed(0)} MB. ${highMemAgents.length} exceed 2GB threshold.`,
            metrics: { agentCount: agents.length, peakMemoryMB: maxMem, overThreshold: highMemAgents.length },
            timestamp: now(), durationMs: 0,
        };
    },
};

/** EVAL-R02: Total CPU utilization should be manageable */
const cpuUtilization: EvalCase = {
    id: 'EVAL-R02',
    name: 'Total CPU Utilization',
    suite: 'resource',
    description: 'Combined CPU usage of all agents should not exceed 80% of system capacity to prevent host degradation.',
    async run(): Promise<EvalResult> {
        const [agentsRes, sysRes] = await Promise.all([
            fetch(`${DAEMON_URL}/api/agents`),
            fetch(`${DAEMON_URL}/api/system`),
        ]);
        const { agents } = await agentsRes.json();
        const system = await sysRes.json();

        const totalCpu = agents.reduce((sum: number, a: any) => sum + a.cpu, 0);
        const maxCpu = system.cpuCores * 100;
        const usagePercent = (totalCpu / maxCpu) * 100;

        let severity: 'pass' | 'warn' | 'fail' = 'pass';
        let score = 100;
        if (usagePercent > 80) { severity = 'fail'; score = 20; }
        else if (usagePercent > 50) { severity = 'warn'; score = 60; }
        else { score = Math.round(100 - usagePercent); }

        return {
            caseId: this.id, caseName: this.name, suite: this.suite,
            severity, score,
            message: `Total CPU: ${totalCpu.toFixed(1)}% across ${system.cpuCores} cores (${usagePercent.toFixed(1)}% of capacity)`,
            metrics: { totalCpuPercent: totalCpu, cpuCores: system.cpuCores, capacityUsed: usagePercent },
            timestamp: now(), durationMs: 0,
        };
    },
};

/** EVAL-R03: System memory headroom */
const memoryHeadroom: EvalCase = {
    id: 'EVAL-R03',
    name: 'System Memory Headroom',
    suite: 'resource',
    description: 'The host system should have at least 20% free memory to handle new agent launches.',
    async run(): Promise<EvalResult> {
        const res = await fetch(`${DAEMON_URL}/api/system`);
        const system = await res.json();
        const freePercent = ((system.totalMemory - system.usedMemory) / system.totalMemory) * 100;

        let severity: 'pass' | 'warn' | 'fail' = 'pass';
        let score = 100;
        if (freePercent < 10) { severity = 'fail'; score = 10; }
        else if (freePercent < 20) { severity = 'warn'; score = 50; }
        else { score = Math.round(Math.min(freePercent * 2, 100)); }

        return {
            caseId: this.id, caseName: this.name, suite: this.suite,
            severity, score,
            message: `${freePercent.toFixed(1)}% memory free (${(system.totalMemory - system.usedMemory).toFixed(1)} / ${system.totalMemory} GB)`,
            metrics: { freeMemoryPercent: freePercent, totalGB: system.totalMemory, usedGB: system.usedMemory },
            timestamp: now(), durationMs: 0,
        };
    },
};

export const resourceEvals: EvalCase[] = [memoryFootprint, cpuUtilization, memoryHeadroom];
