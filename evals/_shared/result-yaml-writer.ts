// _meta.generated: true
/**
 * Shared static-backend result YAML writer.
 *
 * Stamped into the host repo at `evals/_reporters/_shared/result-yaml-writer.ts`
 * by subtask 07 (vitest backend) and consumed by subtask 08 (jest backend).
 *
 * Why a shared module?
 * --------------------
 * Vitest and jest emit very similar per-case data (id, status, duration,
 * grader pass/fail, optional verbosity). Centralising the schema-shaped
 * serialisation here means:
 *
 *   1. Both reporters produce byte-identical YAML for equivalent test runs
 *      (deterministic key sort, identical aggregate computation).
 *   2. A future schema bump (subtask 11/12) only needs to land here.
 *   3. The cleanup engine + updater have a single grep target when looking
 *      for the static-backend writer footprint.
 *
 * The writer is schema-aware: every field it emits maps to a property in
 * `templates/schema/result.schema.json` (anchored on `backend: "static"`).
 * It does NOT call `ajv` itself — validation is the caller's responsibility
 * (the orchestrator, subtask 12). This keeps the writer dependency-light so
 * both reporters can stay reporter-side without dragging ajv into vitest's
 * worker contexts.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { dump } from "js-yaml";

/* ---------------------------------------------------------------------- */
/* Public types                                                            */
/* ---------------------------------------------------------------------- */

export type StaticCaseStatus = "passed" | "failed" | "skipped" | "errored";

export interface StaticGraderReport {
  grader: string;
  verdict: "pass" | "fail" | "warn";
  detail?: string;
}

export interface StaticCaseRecord {
  id: string;
  status: StaticCaseStatus;
  duration_ms?: number;
  /** Optional stdout volume in characters; drives `aggregates.verbosity_avg`. */
  verbosity?: number;
  grader_reports?: StaticGraderReport[];
  /** Optional log path stamped into the schema's `log_path` property. */
  log_path?: string;
}

export interface StaticReportInput {
  /** Stable run id (e.g. an ISO-8601 compact stamp). */
  run_id: string;
  started_at: string;
  ended_at: string;
  /** Free-form model marker; static backends usually leave this undefined. */
  model?: string;
  /** Reporter source — `"vitest"` or `"jest"`. Stamped under `report.framework`. */
  framework: "vitest" | "jest";
  /** Per-case rows. */
  cases: StaticCaseRecord[];
}

export interface StaticReportDocument {
  schema_version: 1;
  run_id: string;
  started_at: string;
  ended_at: string;
  backend: "static";
  model?: string;
  totals: {
    cases: number;
    passed: number;
    failed: number;
    skipped?: number;
  };
  aggregates: {
    tokens_total: number;
    duration_ms_total: number;
    verbosity_avg?: number;
  };
  report: {
    framework: "vitest" | "jest";
  };
  cases: Array<{
    id: string;
    status: StaticCaseStatus;
    duration_ms?: number;
    verbosity?: number;
    grader_reports?: StaticGraderReport[];
    log_path?: string;
  }>;
}

/* ---------------------------------------------------------------------- */
/* Document construction                                                   */
/* ---------------------------------------------------------------------- */

export function buildStaticReportDocument(input: StaticReportInput): StaticReportDocument {
  const cases = input.cases.map((c) =>
    sortObjectKeysShallow(c as unknown as Record<string, unknown>),
  );

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let durationTotal = 0;
  const verbosities: number[] = [];

  for (const c of input.cases) {
    if (c.status === "passed") passed += 1;
    else if (c.status === "failed" || c.status === "errored") failed += 1;
    else if (c.status === "skipped") skipped += 1;
    if (typeof c.duration_ms === "number") durationTotal += c.duration_ms;
    if (typeof c.verbosity === "number") verbosities.push(c.verbosity);
  }

  const aggregates: StaticReportDocument["aggregates"] = {
    tokens_total: 0,
    duration_ms_total: durationTotal,
  };
  if (verbosities.length > 0) {
    const sum = verbosities.reduce((a, b) => a + b, 0);
    aggregates.verbosity_avg = round4(sum / verbosities.length);
  }

  const totals: StaticReportDocument["totals"] = {
    cases: input.cases.length,
    passed,
    failed,
  };
  if (skipped > 0) totals.skipped = skipped;

  const doc: StaticReportDocument = {
    schema_version: 1,
    run_id: input.run_id,
    started_at: input.started_at,
    ended_at: input.ended_at,
    backend: "static",
    totals,
    aggregates,
    report: { framework: input.framework },
    cases: cases as StaticReportDocument["cases"],
  };
  if (input.model) doc.model = input.model;
  return doc;
}

/* ---------------------------------------------------------------------- */
/* Serialisation                                                           */
/* ---------------------------------------------------------------------- */

/**
 * Deterministic YAML dump with sorted keys, line-width 100, and the
 * default flow-level disabled. Used by both the vitest reporter and (per
 * subtask 08) the jest reporter so identical test runs produce byte-equal
 * `static.yml` files across frameworks.
 */
export function dumpStaticReportYaml(doc: StaticReportDocument): string {
  return dump(deepSortKeys(doc), {
    sortKeys: true,
    lineWidth: 100,
    noRefs: true,
    quotingType: '"',
  });
}

export function writeStaticReport(absolutePath: string, doc: StaticReportDocument): void {
  mkdirSync(dirname(absolutePath), { recursive: true, mode: 0o755 });
  writeFileSync(absolutePath, dumpStaticReportYaml(doc), { encoding: "utf-8", mode: 0o644 });
}

/* ---------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ---------------------------------------------------------------------- */

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

function sortObjectKeysShallow(
  o: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o).sort()) {
    out[k] = o[k];
  }
  return out;
}

function deepSortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => deepSortKeys(v));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = deepSortKeys((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}
