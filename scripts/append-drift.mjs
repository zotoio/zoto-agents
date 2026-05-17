#!/usr/bin/env node
import { appendFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repo = process.cwd();
const exitCode = Number.parseInt(process.argv[2], 10);
const safeCode = Number.isFinite(exitCode) ? exitCode : 1;

const status =
  safeCode === 0 ? "clean" : safeCode === 2 ? "critical" : "unknown";

const messages = {
  0: "eval:update --check exited 0 — no drift",
  2: "critical drift detected (exit 2)",
};
const msg = messages[safeCode] ?? `eval:update exited ${safeCode} — drift status unknown`;

let evalsDir = "evals";
try {
  const raw = readFileSync(join(repo, ".zoto/eval-system", "config.yml"), "utf8");
  for (const line of raw.split("\n")) {
    const t = line.replace(/\s*$/, "");
    if (t.startsWith("#") || !t.trim()) continue;
    const m = /^evalsDir:\s*(\S+)\s*$/.exec(t.trim());
    if (m) evalsDir = m[1];
  }
} catch {
  /* default */
}

let runTs = "unknown-run";
try {
  runTs = readFileSync(join(repo, evalsDir, "_runs", ".latest-ts"), "utf8").trim();
} catch {
  console.error("[append-drift] could not locate latest run under", `${evalsDir}/_runs/`);
  process.exit(1);
}

const llmPath = join(repo, evalsDir, "_runs", runTs, "llm.yml");

const driftYaml = `drift:
  status: ${status}
  exit_code: ${safeCode}
  message: ${JSON.stringify(msg)}
`;

appendFileSync(llmPath, `\n${driftYaml}\n`, "utf8");
console.log(`[drift] appended to ${evalsDir}/_runs/${runTs}/llm.yml`);
