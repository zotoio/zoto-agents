#!/usr/bin/env tsx
/**
 * Run the Jev-graded eval suite (`evals/jev/cases/*.json`).
 *
 *   pnpm eval:jev                 # fixture mode (default): no key, no network
 *   ZOTO_EVAL_JEV_MODE=live TYPESAFE_API_KEY=... pnpm eval:jev   # opt-in live
 *   pnpm eval:jev:lock            # consciously re-lock fixtures + templates
 *   pnpm eval:jev -- --check-lock # verify lock only
 *
 * The stamp-trust gate runs first — no Jev-graded case is evaluated if the
 * harness stamp is truncated or `#eval-engine` has drifted.
 *
 * Exit codes: 0 green; 1 any fail or inconclusive; 2 config / gate error.
 */
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { formatJevSummary, runJevSuite, writeJevRun } from "../engine/jev/suite.js";
import { computeLock, LOCK_FILE, verifyLock } from "../engine/jev/template.js";
import { defaultJevDir } from "../engine/graders/jev.js";
import { assertStampTrust } from "./stamp-trust-gate.js";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function findRepoRoot(start: string): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "evals", "jev")) || existsSync(join(dir, ".zoto", "eval-system", "config.yml"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

async function main(): Promise<number> {
  const args = new Set(process.argv.slice(2));
  const repoRoot = findRepoRoot(process.cwd());
  const evalsDir = join(repoRoot, "evals");
  const jevDir = defaultJevDir(repoRoot);

  if (args.has("--write-lock")) {
    const lock = computeLock(jevDir);
    writeFileSync(join(jevDir, LOCK_FILE), `${JSON.stringify(lock, null, 2)}\n`, "utf-8");
    console.log(`wrote ${join(jevDir, LOCK_FILE)}`);
    console.log(JSON.stringify(lock, null, 2));
    return 0;
  }
  if (args.has("--check-lock")) {
    const check = verifyLock(jevDir);
    if (check.kind === "ok") {
      console.log("jev lock: ok");
      return 0;
    }
    console.error(`jev lock drift:\n  - ${check.problems.join("\n  - ")}`);
    return 1;
  }

  // Stamp-trust gate BEFORE any Jev-graded case.
  assertStampTrust({ evalsDir, resolveEvalEngineRoot: () => join(PLUGIN_ROOT, "engine") });

  const report = await runJevSuite({ jevDir });
  console.log(formatJevSummary(report));
  if (!args.has("--no-write")) {
    const path = writeJevRun(report, join(evalsDir, "_runs", "jev"));
    console.log(`results: ${path}`);
  }
  return report.exit_code;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`eval:jev error: ${(err as Error).message}`);
    process.exit(2);
  },
);
