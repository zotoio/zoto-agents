// _meta.generated: true
/**
 * Framework-agnostic reporter for the LLM `code`-strategy evals.
 *
 * Stamped into `evals/llm/_shared/zoto-llm-reporter.ts`. Both the vitest
 * and jest backends invoke this module from every stamped `*.test.ts`
 * file via `reportCase(...)` and `reportSuite(...)`. The reporter
 * accumulates cases in a process-global buffer and writes:
 *
 *   - `evals/_runs/<ts>/llm.yml`          — schema-valid suite report
 *   - `evals/_runs/<ts>/logs/<case>.log`  — per-case verbose log
 *
 * The emitted YAML validates against
 * `plugins/zoto-eval-system/templates/schema/result.schema.json` with
 * `backend: "llm"`. The schema is read lazily from the host repo at
 * stamp time (fallback order):
 *
 *   1. `plugins/zoto-eval-system/templates/schema/result.schema.json`
 *   2. `.zoto/eval-system/schema/result.schema.json` (dogfood copy)
 *
 * The reporter never throws on schema-validation failure — it writes
 * the YAML regardless and logs a stderr warning. This keeps the test
 * runner's exit code dominated by real test failures, not reporter
 * drift. Subtask 11 re-runs schema validation in `--check` mode.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import YAML from "yaml";

import type { GraderReport } from "../_shared/graders/common.js";
import type { SnapshotDiff } from "../_shared/sandbox-helpers.js";

export interface ReportedCase {
  id: string;
  status: "passed" | "failed" | "skipped" | "errored";
  tokens: number;
  duration_ms: number;
  verbosity: number;
  accuracy: number;
  confidence: number;
  grader_reports: GraderReport[];
  repo_mutations?: SnapshotDiff;
  token_source?: string;
  expected_output?: string;
  assertions?: string[];
}

interface BufferedEntry {
  target_id: string;
  case: ReportedCase;
}

interface SuiteMeta {
  target_id: string;
  started_at: string;
  ended_at: string;
  model: string;
}

const REPO_ROOT = process.cwd();
const RUN_ID = process.env.ZOTO_EVAL_RUN_ID ?? nowStamp();
const EVALS_DIR = process.env.ZOTO_EVAL_DIR ?? "evals";
const RUN_DIR = join(REPO_ROOT, EVALS_DIR, "_runs", RUN_ID);
const LOGS_DIR = join(RUN_DIR, "logs");

let suiteStart = new Date().toISOString();
const suites: SuiteMeta[] = [];
const cases: BufferedEntry[] = [];
let registered = false;

mkdirSync(LOGS_DIR, { recursive: true });

function registerFlush(): void {
  if (registered) return;
  registered = true;
  process.on("exit", () => {
    try {
      flush();
    } catch (err) {
      process.stderr.write(
        `[zoto-llm-reporter] flush failed on exit: ${(err as Error).message}\n`,
      );
    }
  });
}

export function reportCase(entry: BufferedEntry): void {
  registerFlush();
  cases.push(entry);

  const logPath = join(LOGS_DIR, `${sanitize(entry.target_id)}_${sanitize(entry.case.id)}.log`);
  const lines: string[] = [
    `# ${entry.target_id} :: ${entry.case.id}`,
    `status: ${entry.case.status}`,
    `tokens: ${entry.case.tokens} (${entry.case.token_source ?? "unknown"})`,
    `duration_ms: ${entry.case.duration_ms}`,
    "",
  ];
  if (entry.case.assertions?.length) {
    lines.push("assertions:");
    for (const a of entry.case.assertions) lines.push(`  - ${a}`);
    lines.push("");
  }
  if (entry.case.expected_output) {
    lines.push("expected_output:");
    lines.push(entry.case.expected_output);
    lines.push("");
  }
  if (entry.case.grader_reports.length) {
    lines.push("grader_reports:");
    for (const r of entry.case.grader_reports) {
      lines.push(`  - [${r.verdict}] ${r.grader}: ${r.detail}`);
    }
    lines.push("");
  }
  if (entry.case.repo_mutations) {
    lines.push("repo_mutations:");
    lines.push(`  added: ${entry.case.repo_mutations.added.length}`);
    lines.push(`  modified: ${entry.case.repo_mutations.modified.length}`);
    lines.push(`  removed: ${entry.case.repo_mutations.removed.length}`);
  }
  writeFileSync(logPath, lines.join("\n"), "utf-8");
}

export function reportSuite(meta: SuiteMeta): void {
  registerFlush();
  if (cases.length === 0 && suites.length === 0) {
    suiteStart = meta.started_at;
  }
  suites.push(meta);
  flush();
}

export function flush(): string {
  const startedAt = suites.length > 0 ? suites[0]!.started_at : suiteStart;
  const endedAt = new Date().toISOString();
  const model = suites.length > 0 ? suites[suites.length - 1]!.model : "unknown";

  const totals = {
    cases: cases.length,
    passed: cases.filter((c) => c.case.status === "passed").length,
    failed: cases.filter((c) => c.case.status === "failed").length,
    skipped: cases.filter((c) => c.case.status === "skipped").length,
  };

  const aggregates =
    cases.length === 0
      ? {
          tokens_total: 0,
          duration_ms_total: 0,
          verbosity_avg: 0,
          accuracy_avg: 0,
          confidence_avg: 0,
        }
      : {
          tokens_total: sum(cases, (c) => c.case.tokens),
          duration_ms_total: sum(cases, (c) => c.case.duration_ms),
          verbosity_avg: avg(cases, (c) => c.case.verbosity),
          accuracy_avg: avg(cases, (c) => c.case.accuracy),
          confidence_avg: avg(cases, (c) => c.case.confidence),
        };

  const doc: Record<string, unknown> = {
    schema_version: 1,
    run_id: RUN_ID,
    started_at: startedAt,
    ended_at: endedAt,
    backend: "llm",
    model,
    totals,
    aggregates,
    cases: cases.map((e) => {
      const caseId = `${e.target_id}::${e.case.id}`;
      const logPath = relative(
        join(REPO_ROOT, EVALS_DIR),
        join(LOGS_DIR, `${sanitize(e.target_id)}_${sanitize(e.case.id)}.log`),
      );
      const out: Record<string, unknown> = {
        id: caseId,
        status: e.case.status,
        tokens: e.case.tokens,
        duration_ms: e.case.duration_ms,
        verbosity: e.case.verbosity,
        accuracy: e.case.accuracy,
        confidence: e.case.confidence,
        grader_reports: e.case.grader_reports,
        log_path: logPath,
      };
      if (e.case.repo_mutations) {
        out.repo_mutations = e.case.repo_mutations;
      }
      return out;
    }),
  };

  validateAgainstSchema(doc);

  const outPath = join(RUN_DIR, "llm.yml");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, YAML.stringify(doc), "utf-8");
  return outPath;
}

function validateAgainstSchema(doc: Record<string, unknown>): void {
  const candidates = [
    join(REPO_ROOT, "plugins", "zoto-eval-system", "templates", "schema", "result.schema.json"),
    join(REPO_ROOT, ".zoto", "eval-system", "schema", "result.schema.json"),
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const AjvMod = require("ajv") as { default?: new (opts?: unknown) => unknown; new (opts?: unknown): unknown };
      const Ctor = (AjvMod.default ?? AjvMod) as new (opts?: unknown) => {
        compile: (schema: unknown) => (data: unknown) => boolean;
        errors?: unknown;
      };
      const ajv = new Ctor({ allErrors: true, strict: false });
      const schema = JSON.parse(readFileSync(p, "utf-8"));
      const validate = ajv.compile(schema);
      if (!validate(doc)) {
        process.stderr.write(
          `[zoto-llm-reporter] WARN llm.yml failed schema validation against ${relative(REPO_ROOT, p)}: ${JSON.stringify(
            (validate as unknown as { errors?: unknown }).errors,
          )}\n`,
        );
      }
      return;
    } catch (err) {
      process.stderr.write(
        `[zoto-llm-reporter] WARN schema validation skipped (${(err as Error).message})\n`,
      );
      return;
    }
  }
  process.stderr.write(
    "[zoto-llm-reporter] WARN result.schema.json not found; skipping schema validation.\n",
  );
}

function sanitize(id: string): string {
  return id.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

function sum<T>(xs: T[], f: (x: T) => number): number {
  return xs.reduce((acc, x) => acc + f(x), 0);
}

function avg<T>(xs: T[], f: (x: T) => number): number {
  if (xs.length === 0) return 0;
  return Math.round((sum(xs, f) / xs.length) * 1000) / 1000;
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`
  );
}
