// EvalsAgent/src/runner.ts
// Main eval runner — discovers and executes eval suites

import { resourceEvals } from '../evals/resource.eval.js';
import { responseEvals } from '../evals/response.eval.js';
import { stabilityEvals } from '../evals/stability.eval.js';
import type { EvalCase, EvalResult, EvalReport, EvalSuite, SuiteSummary } from './types.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DAEMON_URL = 'http://localhost:3001';

// Parse CLI args
const args = process.argv.slice(2);
const suiteArg = args.find((a) => a.startsWith('--suite='))?.split('=')[1] as EvalSuite | undefined
    ?? (args.includes('--suite') ? args[args.indexOf('--suite') + 1] as EvalSuite : 'all');

async function checkDaemon(): Promise<boolean> {
    try {
        const res = await fetch(`${DAEMON_URL}/api/health`);
        return res.ok;
    } catch {
        return false;
    }
}

function collectCases(suite: EvalSuite): EvalCase[] {
    const all: EvalCase[] = [...resourceEvals, ...responseEvals, ...stabilityEvals];
    if (suite === 'all') return all;
    return all.filter((c) => c.suite === suite);
}

async function runEvals(cases: EvalCase[]): Promise<EvalResult[]> {
    const results: EvalResult[] = [];

    for (const evalCase of cases) {
        const start = Date.now();
        try {
            const result = await evalCase.run();
            result.durationMs = Date.now() - start;
            results.push(result);
            const icon = result.severity === 'pass' ? '✅' : result.severity === 'warn' ? '⚠️' : '❌';
            console.log(`  ${icon} [${result.score}/100] ${evalCase.name} — ${result.message}`);
        } catch (err: any) {
            results.push({
                caseId: evalCase.id,
                caseName: evalCase.name,
                suite: evalCase.suite,
                severity: 'fail',
                score: 0,
                message: `Exception: ${err.message}`,
                timestamp: new Date().toISOString(),
                durationMs: Date.now() - start,
            });
            console.log(`  ❌ [0/100] ${evalCase.name} — Exception: ${err.message}`);
        }
    }

    return results;
}

function buildReport(results: EvalResult[]): EvalReport {
    const suites: Record<string, SuiteSummary> = {};

    for (const r of results) {
        if (!suites[r.suite]) {
            suites[r.suite] = { total: 0, passed: 0, warned: 0, failed: 0, avgScore: 0 };
        }
        const s = suites[r.suite];
        s.total++;
        if (r.severity === 'pass') s.passed++;
        else if (r.severity === 'warn') s.warned++;
        else s.failed++;
    }

    // Compute avg scores per suite
    for (const suiteName of Object.keys(suites)) {
        const suiteResults = results.filter((r) => r.suite === suiteName);
        suites[suiteName].avgScore = Math.round(
            suiteResults.reduce((sum, r) => sum + r.score, 0) / suiteResults.length
        );
    }

    const passed = results.filter((r) => r.severity === 'pass').length;
    const warned = results.filter((r) => r.severity === 'warn').length;
    const failed = results.filter((r) => r.severity === 'fail').length;
    const overallScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);

    return {
        runId: `eval-${Date.now()}`,
        timestamp: new Date().toISOString(),
        totalCases: results.length,
        passed,
        warned,
        failed,
        overallScore,
        suites,
        results,
    };
}

async function main() {
    console.log('\n🐝 Agents Commander — Eval Runner');
    console.log('═'.repeat(50));

    // Pre-flight: check daemon
    const daemonUp = await checkDaemon();
    if (!daemonUp) {
        console.log('\n⚠️  Daemon is not running at ' + DAEMON_URL);
        console.log('   Start it with: npm run daemon (from project root)');
        console.log('   Some evals will fail without the daemon.\n');
    } else {
        console.log(`\n✅ Daemon reachable at ${DAEMON_URL}`);
    }

    const cases = collectCases(suiteArg);
    console.log(`\n📋 Running ${cases.length} eval(s) [suite: ${suiteArg}]\n`);

    const results = await runEvals(cases);
    const report = buildReport(results);

    // Save report
    mkdirSync(join(import.meta.dirname, '..', 'results'), { recursive: true });
    const reportPath = join(import.meta.dirname, '..', 'results', `${report.runId}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Print summary
    console.log('\n' + '═'.repeat(50));
    console.log('📊 Eval Summary');
    console.log(`   Total: ${report.totalCases}  |  ✅ ${report.passed}  |  ⚠️ ${report.warned}  |  ❌ ${report.failed}`);
    console.log(`   Overall Score: ${report.overallScore}/100`);
    for (const [name, s] of Object.entries(report.suites)) {
        console.log(`   • ${name}: ${s.avgScore}/100 (${s.passed}/${s.total} passed)`);
    }
    console.log(`\n💾 Report saved to: ${reportPath}\n`);

    // Exit code
    process.exit(report.failed > 0 ? 1 : 0);
}

main();
