#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function parseModelFlag(argv) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--model" && argv[i + 1]) return argv[i + 1];
  }
  return null;
}

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

const key = process.env.CURSOR_API_KEY?.trim();
if (!key) {
  console.error("[eval:full] CURSOR_API_KEY missing — refusing LLM tier");
  process.exit(2);
}

const argv = process.argv.slice(2);
const modelFromCli = parseModelFlag(argv);
const modelFromEnv = process.env.ZOTO_EVAL_MODEL?.trim() || null;

console.log("[eval] Full tier (static + LLM) — fixture harness");
console.log(`[eval] Run directory root: ${readEvalsDir()}/_runs/`);
console.log(`[eval] model via --model: ${modelFromCli ?? "(not set)"}`);
console.log(`[eval] model via ZOTO_EVAL_MODEL: ${modelFromEnv ?? "(not set)"}`);
console.log("[eval] Static tier slice…");
console.log("[eval] LLM tier slice (resolved key + full path)…");

const evalsDir = readEvalsDir();
const runTs = new Date().toISOString().replace(/[:.]/g, "-");
const runsRoot = join(REPO, evalsDir, "_runs");
const runDir = join(runsRoot, runTs);
const logsDir = join(runDir, "logs");

mkdirSync(logsDir, { recursive: true });
writeFileSync(join(runsRoot, ".latest-ts"), `${runTs}\n`, "utf8");

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
skipped: false
model_forwarding:
  cli_flag: ${modelFromCli ? JSON.stringify(modelFromCli) : "null"}
  env_ZOTO_EVAL_MODEL: ${modelFromEnv ? JSON.stringify(modelFromEnv) : "null"}
totals:
  cases: 4
  passed: 4
  failed: 0
cases: []
aggregates:
  tokens: { input: 1200, output: 340 }
  duration_ms: 8900
`;

const reportYml = `backend: mixed
run_ts: "${runTs}"
static:
  source_path: static.yml
  totals: { cases: 2, passed: 2, failed: 0 }
llm:
  source_path: llm.yml
  skipped: false
`;

writeFileSync(join(runDir, "static.yml"), staticYml);
writeFileSync(join(runDir, "llm.yml"), llmYml);
writeFileSync(join(runDir, "report.yml"), reportYml);
writeFileSync(join(logsDir, "static-pytest.log"), "2 passed in 0.12s\n");
writeFileSync(
  join(logsDir, "llm-runner.log"),
  `[llm] runner: cli_model=${modelFromCli ?? "none"} env_model=${modelFromEnv ?? "none"} (fixture)\n`,
);

console.log("[eval] wrote static.yml, llm.yml, report.yml, logs/");
console.log("[eval] static totals: cases=2 passed=2 failed=0");
console.log("[eval] llm totals: cases=4 passed=4 failed=0 (tokens input=1200 output=340)");
