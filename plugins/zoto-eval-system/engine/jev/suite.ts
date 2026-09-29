/**
 * Jev eval suite — loads `<jevDir>/cases/*.json`, grades each case through the
 * `jev` grader and summarises pass / fail / inconclusive as three counts.
 *
 * Any fail or inconclusive makes the run non-green (exit 1).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  createJevGraderContext,
  gradeWithJev,
  type JevGraderConfig,
  type JevGraderContext,
  type JevProposal,
  type JevProvenance,
} from "../graders/jev.js";
import type { JevEnv } from "./client.js";
import { JEV_PIN } from "./pin.js";
import type { JevLock } from "./template.js";
import { countVerdicts, describeVerdict, exitCodeFor, type JevRunCounts, type JevVerdict } from "./verdict.js";

export interface JevCase {
  id: string;
  description?: string;
  /** The agent reply under evaluation. */
  reply: string;
  grader: JevGraderConfig;
}

export interface JevCaseFile {
  cases: JevCase[];
}

export interface JevCaseResult {
  case_id: string;
  source: string;
  verdict: JevVerdict;
  proposal: JevProposal | null;
  /** jev_mode, pinned jev commit, fixture set hash, template hash. */
  provenance: JevProvenance;
}

export interface JevRunReport {
  schema_version: 1;
  backend: "jev";
  started_at: string;
  jev_mode: JevProvenance["jev_mode"];
  counts: JevRunCounts;
  exit_code: 0 | 1;
  results: JevCaseResult[];
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

/**
 * Validate one result record's provenance before accepting it. Returns the
 * problems found; an empty list means the record is accepted.
 *
 * - jev_commit must equal the vendored pin.
 * - fixture_set_sha256, vendor_sha256 and grader_sha256 must be present,
 *   sha256 hex, and equal to the committed lock's values.
 * - template_sha256 must be present, sha256 hex, and equal to the lock's hash
 *   for the record's template id (e.g. `evidence-verdict@1`); a template id
 *   that is not in the lock is rejected.
 *
 * So a record graded against different fixtures, template wording, vendored
 * code or grader is rejected.
 */
export function checkRecordProvenance(
  provenance: Partial<JevProvenance> | null | undefined,
  lock: Pick<JevLock, "vendor_sha256" | "grader_sha256" | "fixture_set_sha256" | "templates">,
): string[] {
  if (!provenance || typeof provenance !== "object") return ["record has no provenance"];
  const p = provenance;
  const problems: string[] = [];
  if (p.jev_commit !== JEV_PIN.commit) {
    problems.push(`jev_commit ${String(p.jev_commit)} != vendored pin ${JEV_PIN.commit}`);
  }
  const templates = lock.templates ?? {};
  const lockedTemplate =
    typeof p.template === "string" && Object.prototype.hasOwnProperty.call(templates, p.template)
      ? templates[p.template]
      : undefined;
  if (typeof p.template_sha256 !== "string" || !SHA256_HEX.test(p.template_sha256)) {
    problems.push("template_sha256 is missing or not a sha256");
  } else if (lockedTemplate === undefined) {
    problems.push(`template ${String(p.template)} is not in the lock`);
  } else if (p.template_sha256 !== lockedTemplate) {
    problems.push(`template_sha256 ${p.template_sha256.slice(0, 12)} != lock ${String(lockedTemplate).slice(0, 12)} for ${String(p.template)}`);
  }
  if (typeof p.fixture_set_sha256 !== "string" || !SHA256_HEX.test(p.fixture_set_sha256)) {
    problems.push("fixture_set_sha256 is missing or not a sha256");
  } else if (p.fixture_set_sha256 !== lock.fixture_set_sha256) {
    problems.push(`fixture_set_sha256 ${p.fixture_set_sha256.slice(0, 12)} != lock ${String(lock.fixture_set_sha256).slice(0, 12)}`);
  }
  if (typeof p.vendor_sha256 !== "string" || !SHA256_HEX.test(p.vendor_sha256)) {
    problems.push("vendor_sha256 is missing or not a sha256");
  } else if (p.vendor_sha256 !== lock.vendor_sha256) {
    problems.push(`vendor_sha256 ${p.vendor_sha256.slice(0, 12)} != lock ${String(lock.vendor_sha256).slice(0, 12)}`);
  }
  if (typeof p.grader_sha256 !== "string" || !SHA256_HEX.test(p.grader_sha256)) {
    problems.push("grader_sha256 is missing or not a sha256");
  } else if (p.grader_sha256 !== lock.grader_sha256) {
    problems.push(`grader_sha256 ${p.grader_sha256.slice(0, 12)} != lock ${String(lock.grader_sha256).slice(0, 12)}`);
  }
  return problems;
}

export function loadJevCases(jevDir: string): Array<{ source: string; case: JevCase }> {
  const dir = join(jevDir, "cases");
  if (!existsSync(dir)) return [];
  const out: Array<{ source: string; case: JevCase }> = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const parsed = JSON.parse(readFileSync(join(dir, file), "utf-8")) as JevCaseFile;
    if (!Array.isArray(parsed.cases)) throw new Error(`cases/${file}: expected { "cases": [...] }`);
    for (const c of parsed.cases) {
      if (typeof c.id !== "string" || typeof c.reply !== "string" || c.grader?.type !== "jev") {
        throw new Error(`cases/${file}: every case needs string id, string reply and a jev grader`);
      }
      out.push({ source: `cases/${file}`, case: c });
    }
  }
  return out;
}

export async function runJevSuite(opts: {
  jevDir: string;
  env?: JevEnv;
  fetchImpl?: typeof fetch;
  cases?: Array<{ source: string; case: JevCase }>;
  ctx?: JevGraderContext;
  onJevCall?: JevGraderContext["onJevCall"];
}): Promise<JevRunReport> {
  const started = new Date().toISOString();
  const ctx =
    opts.ctx ??
    createJevGraderContext({ jevDir: opts.jevDir, env: opts.env, fetchImpl: opts.fetchImpl, onJevCall: opts.onJevCall });
  const cases = opts.cases ?? loadJevCases(opts.jevDir);
  const results: JevCaseResult[] = [];
  for (const { source, case: c } of cases) {
    const record = await gradeWithJev(c.grader, c.reply, ctx);
    results.push({
      case_id: c.id,
      source,
      verdict: record.verdict,
      proposal: record.proposal,
      provenance: record.provenance,
    });
  }
  const counts = countVerdicts(results.map((r) => r.verdict));
  return {
    schema_version: 1,
    backend: "jev",
    started_at: started,
    jev_mode: ctx.mode,
    counts,
    exit_code: exitCodeFor(counts),
    results,
  };
}

export function formatJevSummary(report: JevRunReport): string {
  const lines = [`Jev evals (mode=${report.jev_mode}) — Jev proposes, grader code decides`];
  for (const r of report.results) {
    const gate = r.proposal ? ` gate=${r.proposal.gate} conf=${r.proposal.confidence.toFixed(2)}` : "";
    lines.push(`  ${r.case_id}: ${describeVerdict(r.verdict)}${gate}`);
  }
  const first = report.results[0]?.provenance;
  if (first) {
    lines.push(
      `  provenance: jev_commit=${first.jev_commit} vendor_sha256=${first.vendor_sha256.slice(0, 16)}… grader_sha256=${first.grader_sha256.slice(0, 16)}… fixture_set_sha256=${first.fixture_set_sha256.slice(0, 16)}…`,
    );
  }
  const c = report.counts;
  lines.push(`pass: ${c.pass}`, `fail: ${c.fail}`, `inconclusive: ${c.inconclusive}`);
  lines.push(report.exit_code === 0 ? "RESULT: green" : "RESULT: NOT green (fail or inconclusive present)");
  return lines.join("\n");
}

export function writeJevRun(report: JevRunReport, outDir: string): string {
  mkdirSync(outDir, { recursive: true });
  const stamp = report.started_at.replace(/[:.]/g, "-");
  const path = join(outDir, `jev-${stamp}.json`);
  const body = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(path, body, "utf-8");
  writeFileSync(join(outDir, "latest.json"), body, "utf-8");
  return path;
}
