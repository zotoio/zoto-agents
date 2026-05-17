// _meta.generated: true
/**
 * Custom vitest reporter for the zoto-eval-system static backend.
 *
 * Stamped at `<host-repo>/evals/reporters/zoto-eval-reporter.ts` by
 * `scripts/eval-stamp.ts#stampVitestPerPrimitive` (subtask 07).
 *
 * Implements vitest 4.x's `Reporter` interface and emits
 * `evals/_runs/<ts>/static.yml` matching
 * `plugins/zoto-eval-system/templates/schema/result.schema.json`
 * (`backend: "static"`). Each `it(...)` becomes one entry in
 * `cases[]`. Synthesises `grader_reports` with `grader: "vitest"` so the
 * orchestrator (subtask 12) can merge `static.yml` and `llm.yml`
 * uniformly.
 *
 * The actual YAML emission is delegated to the SHARED writer at
 * `../_shared/result-yaml-writer.ts` (canonically owned by subtask 07,
 * consumed by both vitest and jest reporters). See that file's header
 * for the full schema-mapping contract.
 *
 * When spawned by `scripts/eval-orchestrate.ts`, honours
 * `ZOTO_EVAL_RUN_ID` / `ZOTO_EVAL_RUN_TS` and `ZOTO_EVAL_RUNS_DIR` so
 * `static.yml` lands beside the orchestrator's `report.yml`.
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import type { Reporter, TestCase, TestModule } from "vitest/node";

import {
  buildStaticReportDocument,
  type StaticCaseRecord,
  type StaticGraderReport,
  writeStaticReport,
} from "../_shared/result-yaml-writer.js";

interface ZotoEvalReporterOptions {
  /** Override `<host-repo>/evals/_runs`. */
  runsDir?: string;
  /** Override the run id (defaults to compact ISO timestamp). */
  runId?: string;
  /** Forwarded to the schema's optional `model` field. */
  model?: string;
}

type ResolvedOptions = Required<Pick<ZotoEvalReporterOptions, "runsDir">> & {
  runId: string;
  model?: string;
};

export default class ZotoEvalReporter implements Reporter {
  private readonly cases: StaticCaseRecord[] = [];
  private readonly options: ResolvedOptions;
  private startedAt: string = new Date().toISOString();

  constructor(options: ZotoEvalReporterOptions = {}) {
    const envRunId =
      process.env.ZOTO_EVAL_RUN_ID ?? process.env.ZOTO_EVAL_RUN_TS;
    const runId =
      options.runId ??
      (envRunId && envRunId.length > 0
        ? envRunId
        : new Date().toISOString().replace(/[:.]/g, "-"));
    const envRunsDir = process.env.ZOTO_EVAL_RUNS_DIR;
    const runsDir =
      options.runsDir ??
      (envRunsDir && envRunsDir.length > 0 ? envRunsDir : "evals/_runs");
    this.options = {
      runsDir,
      runId,
      ...(options.model ? { model: options.model } : {}),
    };
  }

  onTestRunStart(): void {
    this.startedAt = new Date().toISOString();
  }

  onTestCaseResult(testCase: TestCase): void {
    const record = recordFromTestCase(testCase);
    this.cases.push(record);
  }

  onTestRunEnd(
    _testModules: ReadonlyArray<TestModule>,
    _unhandledErrors: ReadonlyArray<unknown>,
    _reason: unknown,
  ): void | Promise<void> {
    const endedAt = new Date().toISOString();
    const outDir = join(this.options.runsDir, this.options.runId);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const outFile = join(outDir, "static.yml");
    const doc = buildStaticReportDocument({
      run_id: this.options.runId,
      started_at: this.startedAt,
      ended_at: endedAt,
      framework: "vitest",
      cases: this.cases,
      ...(this.options.model ? { model: this.options.model } : {}),
    });
    writeStaticReport(outFile, doc);
  }
}

/* ---------------------------------------------------------------------- */
/* Pure helpers (exported for unit-testing)                                */
/* ---------------------------------------------------------------------- */

export function recordFromTestCase(testCase: TestCase): StaticCaseRecord {
  const result = testCase.result();
  const diagnostic = testCase.diagnostic();
  const status = mapStatus(result.state);
  const id = testCase.fullName;
  const grader_reports: StaticGraderReport[] = [
    {
      grader: "vitest",
      verdict:
        status === "passed" ? "pass" : status === "skipped" ? "warn" : "fail",
      ...(formatErrorDetail(result) ? { detail: formatErrorDetail(result)! } : {}),
    },
  ];
  const entry: StaticCaseRecord = {
    id,
    status,
    grader_reports,
  };
  if (diagnostic && typeof diagnostic.duration === "number") {
    entry.duration_ms = Math.round(diagnostic.duration);
  }
  return entry;
}

export function mapStatus(
  state: "passed" | "failed" | "skipped" | "pending" | string,
): StaticCaseRecord["status"] {
  switch (state) {
    case "passed":
      return "passed";
    case "failed":
      return "failed";
    case "skipped":
    case "pending":
      return "skipped";
    default:
      return "errored";
  }
}

function formatErrorDetail(result: ReturnType<TestCase["result"]>): string | null {
  if (!("errors" in result) || !result.errors || result.errors.length === 0) {
    return null;
  }
  const first = result.errors[0];
  const message = (first as { message?: string }).message ?? String(first);
  return message.slice(0, 4096);
}

/**
 * Pure helper for unit tests: synthesise the YAML body from a list of
 * already-prepared case records without spinning up vitest. Returns the
 * StaticReportDocument so the test can assert against `result.schema.json`.
 */
export function buildResultFromCases(args: {
  runId: string;
  startedAt: string;
  endedAt: string;
  cases: StaticCaseRecord[];
  model?: string;
}) {
  return buildStaticReportDocument({
    run_id: args.runId,
    started_at: args.startedAt,
    ended_at: args.endedAt,
    framework: "vitest",
    cases: args.cases,
    ...(args.model ? { model: args.model } : {}),
  });
}
