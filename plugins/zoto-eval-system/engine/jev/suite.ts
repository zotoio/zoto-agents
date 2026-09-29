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
}): Promise<JevRunReport> {
  const started = new Date().toISOString();
  const ctx = opts.ctx ?? createJevGraderContext({ jevDir: opts.jevDir, env: opts.env, fetchImpl: opts.fetchImpl });
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
      `  provenance: jev_commit=${first.jev_commit} fixture_set_sha256=${first.fixture_set_sha256.slice(0, 16)}…`,
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
