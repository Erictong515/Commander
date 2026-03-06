// EvalsAgent/src/types.ts
// Core type definitions for the evaluation framework

/** Evaluation suite category */
export type EvalSuite = 'resource' | 'response' | 'stability' | 'all';

/** Severity of an eval result */
export type Severity = 'pass' | 'warn' | 'fail';

/** Single evaluation case definition */
export interface EvalCase {
    id: string;
    name: string;
    suite: EvalSuite;
    description: string;
    /** The function that runs the evaluation and returns a result */
    run: () => Promise<EvalResult>;
}

/** Result of a single evaluation */
export interface EvalResult {
    caseId: string;
    caseName: string;
    suite: string;
    severity: Severity;
    score: number;        // 0-100
    message: string;
    metrics?: Record<string, number | string>;
    timestamp: string;
    durationMs: number;
}

/** Aggregated report for a full eval run */
export interface EvalReport {
    runId: string;
    timestamp: string;
    totalCases: number;
    passed: number;
    warned: number;
    failed: number;
    overallScore: number;
    suites: Record<string, SuiteSummary>;
    results: EvalResult[];
}

export interface SuiteSummary {
    total: number;
    passed: number;
    warned: number;
    failed: number;
    avgScore: number;
}
