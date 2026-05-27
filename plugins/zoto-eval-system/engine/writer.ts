/**
 * Writes a validated `evals/_runs/<ts>/llm.yml` and per-case log files.
 *
 * Subtask 10 renamed the per-backend file from `results.yml` to `llm.yml`
 * so it sits alongside the static backend's `static.yml` and the merged
 * top-level `report.yml` (subtask 12). The document is validated against
 * `templates/schema/result.schema.json` (carrying `backend: "llm"` for
 * the declarative strategy) before being written.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import YAML from "yaml";
import Ajv from "ajv";

import type { SoftMetrics } from "./metrics.js";
import type { GraderReport } from "./graders/common.js";
import { slugifyCaseId } from "./sandbox.js";

export interface WriterCase {
  id: string;
  status: "passed" | "failed" | "skipped" | "errored";
  metrics: SoftMetrics;
  grader_reports: GraderReport[];
  log: string;
  repo_mutations?: { added: string[]; modified: string[]; removed: string[] };
  filesystem_assertions?: { passed: number; failed: number; detail: string[] };
  /**
   * Optional per-case `_meta.primitive_analysis` snapshot threaded through
   * from the runner. Surfaced in the YAML so downstream consumers (judge,
   * comparer, updater) can correlate runner outcomes with the analyser
   * payload version that produced the case.
   */
  primitive_analysis?: {
    source_hash: string;
    analyser_version: string;
    summary: string;
  };
}

export interface WriteOptions {
  runId: string;
  evalsDir: string;
  backend: "static" | "llm" | "mixed";
  model?: string;
  startedAt: string;
  endedAt: string;
  cases: WriterCase[];
  drift?: {
    status: "clean" | "critical" | "non-critical" | "unknown";
    exit_code: number;
    message: string;
  };
  schemaPath: string;
}

export function writeResults(opts: WriteOptions): string {
  const runDir = join(opts.evalsDir, "_runs", opts.runId);
  const logsDir = join(runDir, "logs");
  mkdirSync(logsDir, { recursive: true });

  for (const c of opts.cases) {
    const logPath = join(logsDir, `case-${slugifyCaseId(c.id)}.log`);
    writeFileSync(logPath, c.log, "utf-8");
  }

  const totals = {
    cases: opts.cases.length,
    passed: opts.cases.filter((c) => c.status === "passed").length,
    failed: opts.cases.filter((c) => c.status === "failed").length,
    skipped: opts.cases.filter((c) => c.status === "skipped").length,
  };

  const aggregates =
    opts.cases.length === 0
      ? {
          tokens_total: 0,
          duration_ms_total: 0,
          verbosity_avg: 0,
          accuracy_avg: 0,
          confidence_avg: 0,
        }
      : {
          tokens_total: sum(opts.cases, (c) => c.metrics.tokens),
          duration_ms_total: sum(opts.cases, (c) => c.metrics.duration_ms),
          verbosity_avg: avg(opts.cases, (c) => c.metrics.verbosity),
          accuracy_avg: avg(opts.cases, (c) => c.metrics.accuracy),
          confidence_avg: avg(opts.cases, (c) => c.metrics.confidence),
        };

  const doc: Record<string, unknown> = {
    schema_version: 1,
    run_id: opts.runId,
    started_at: opts.startedAt,
    ended_at: opts.endedAt,
    backend: opts.backend,
    model: opts.model,
    totals,
    aggregates,
    cases: opts.cases.map((c) => ({
      id: c.id,
      status: c.status,
      backend: "declarative",
      requires_interaction: false,
      ...c.metrics,
      grader_reports: c.grader_reports,
      log_path: join("_runs", opts.runId, "logs", `case-${slugifyCaseId(c.id)}.log`),
      repo_mutations: c.repo_mutations,
      filesystem_assertions: c.filesystem_assertions,
      ...(c.primitive_analysis ? { primitive_analysis: c.primitive_analysis } : {}),
    })),
  };

  if (opts.drift) {
    doc.drift = opts.drift;
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  const schema = JSON.parse(readFileSync(opts.schemaPath, "utf-8"));
  const validate = ajv.compile(schema);
  if (!validate(doc)) {
    throw new Error(
      `llm.yml failed schema validation: ${JSON.stringify(validate.errors, null, 2)}`,
    );
  }

  const outPath = join(runDir, "llm.yml");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, YAML.stringify(doc), "utf-8");

  return outPath;
}

function sum<T>(xs: T[], f: (x: T) => number): number {
  return xs.reduce((acc, x) => acc + f(x), 0);
}

function avg<T>(xs: T[], f: (x: T) => number): number {
  if (xs.length === 0) return 0;
  return Math.round((sum(xs, f) / xs.length) * 1000) / 1000;
}
