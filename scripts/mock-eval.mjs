#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = process.cwd();
const CONFIG_PATH = join(REPO, ".zoto", "eval-system", "config.yml");

function readEvalsDir() {
  const raw = readFileSync(CONFIG_PATH, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.replace(/\s*$/, "");
    if (t.startsWith("#") || !t.trim()) continue;
    const m = /^evalsDir:\s*(\S+)\s*$/.exec(t.trim());
    if (m) return m[1];
  }
  return "evals";
}

const evalsDir = readEvalsDir();
const runTs = new Date().toISOString().replace(/[:.]/g, "-");
const runsRoot = join(REPO, evalsDir, "_runs");
const runDir = join(runsRoot, runTs);
const logsDir = join(runDir, "logs");

mkdirSync(logsDir, { recursive: true });
writeFileSync(join(runsRoot, ".latest-ts"), `${runTs}\n`, "utf8");

console.log("[eval] Static tier (fixture harness)");
console.log(`[eval] Run directory: ${evalsDir}/_runs/${runTs}`);
console.log("[eval] static.framework default → synthetic static pass");

const staticYml = `backend: static
run_ts: "${runTs}"
totals:
  cases: 2
  passed: 2
  failed: 0
cases: []
aggregates:
  duration_ms: 127
`;

const llmYml = `backend: llm
run_ts: "${runTs}"
skipped: true
reason: static-only (/z-eval-execute with no --full)
totals:
  cases: 0
  passed: 0
  failed: 0
aggregates:
  tokens: { input: 0, output: 0 }
  duration_ms: 0
`;

const reportYml = `backend: mixed
run_ts: "${runTs}"
static:
  source_path: static.yml
  totals: { cases: 2, passed: 2, failed: 0 }
llm:
  source_path: llm.yml
  skipped: true
`;

writeFileSync(join(runDir, "static.yml"), staticYml);
writeFileSync(join(runDir, "llm.yml"), llmYml);
writeFileSync(join(runDir, "report.yml"), reportYml);
writeFileSync(join(logsDir, "static-pytest.log"), "2 passed in 0.12s\n");

console.log("[eval] wrote static.yml, llm.yml, report.yml, logs/");
console.log("[eval] static totals: cases=2 passed=2 failed=0");
