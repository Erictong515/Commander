// EvalsAgent/src/report.ts
// Reads the latest eval result and prints a formatted markdown report

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import type { EvalReport } from './types.js';

const resultsDir = join(import.meta.dirname, '..', 'results');

function getLatestReport(): EvalReport | null {
    try {
        const files = readdirSync(resultsDir)
            .filter((f) => f.endsWith('.json'))
            .sort()
            .reverse();
        if (files.length === 0) return null;
        return JSON.parse(readFileSync(join(resultsDir, files[0]), 'utf-8'));
    } catch {
        return null;
    }
}

function severityIcon(s: string) {
    return s === 'pass' ? '✅' : s === 'warn' ? '⚠️' : '❌';
}

function main() {
    const report = getLatestReport();
    if (!report) {
        console.log('No eval results found. Run `npm run eval` first.');
        process.exit(1);
    }

    console.log(`\n# Eval Report — ${report.timestamp}`);
    console.log(`\n**Run ID**: ${report.runId}`);
    console.log(`**Overall Score**: ${report.overallScore}/100`);
    console.log(`**Results**: ${report.passed} passed, ${report.warned} warned, ${report.failed} failed (${report.totalCases} total)\n`);

    console.log('## Suite Breakdown\n');
    console.log('| Suite | Score | Passed | Warned | Failed |');
    console.log('|-------|-------|--------|--------|--------|');
    for (const [name, s] of Object.entries(report.suites)) {
        console.log(`| ${name} | ${s.avgScore}/100 | ${s.passed} | ${s.warned} | ${s.failed} |`);
    }

    console.log('\n## Detail Results\n');
    console.log('| ID | Name | Score | Result | Message |');
    console.log('|-----|------|-------|--------|---------|');
    for (const r of report.results) {
        console.log(`| ${r.caseId} | ${r.caseName} | ${r.score}/100 | ${severityIcon(r.severity)} | ${r.message} |`);
    }

    console.log('');
}

main();
