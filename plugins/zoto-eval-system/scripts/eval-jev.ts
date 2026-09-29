#!/usr/bin/env tsx
/**
 * Run the Jev-graded eval suite (`evals/jev/cases/*.json`).
 *
 *   pnpm eval:jev                 # fixture mode (default): no key, no network
 *   ZOTO_EVAL_JEV_MODE=live TYPESAFE_API_KEY=... pnpm eval:jev   # opt-in live
 *   pnpm eval:jev:lock            # consciously re-lock vendor code + fixtures + templates
 *   pnpm eval:jev -- --check-lock # verify lock only
 *
 * ORDER: the stamp-trust gate runs before Jev is consulted at all — an
 * untrusted stamp produces zero Jev calls (fixture or live).
 *
 * Exit codes: 0 green; 1 any fail or inconclusive; 2 config / gate error.
 */
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { JevEnv } from "../engine/jev/client.js";
import type { JevGraderContext } from "../engine/graders/jev.js";
import { defaultJevDir } from "../engine/graders/jev.js";
import { formatJevSummary, runJevSuite, writeJevRun } from "../engine/jev/suite.js";
import { computeLock, LOCK_FILE, verifyLock } from "../engine/jev/template.js";
import { assertStampTrust } from "./stamp-trust-gate.js";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function findRepoRoot(start: string): string {
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

export interface EvalJevCliOptions {
  argv: string[];
  cwd: string;
  env?: JevEnv;
  fetchImpl?: typeof fetch;
  /** Observer for every Jev consultation (tests count calls with it). */
  onJevCall?: JevGraderContext["onJevCall"];
  log?: (line: string) => void;
  error?: (line: string) => void;
}

/** CLI body, importable for in-process tests. Returns the exit code. */
export async function runEvalJevCli(opts: EvalJevCliOptions): Promise<number> {
  const log = opts.log ?? ((l: string) => console.log(l));
  const error = opts.error ?? ((l: string) => console.error(l));
  const args = new Set(opts.argv);
  const repoRoot = findRepoRoot(opts.cwd);
  const evalsDir = join(repoRoot, "evals");
  const jevDir = defaultJevDir(repoRoot);

  try {
    if (args.has("--write-lock")) {
      const lock = computeLock(jevDir);
      writeFileSync(join(jevDir, LOCK_FILE), `${JSON.stringify(lock, null, 2)}\n`, "utf-8");
      log(`wrote ${join(jevDir, LOCK_FILE)}`);
      log(JSON.stringify(lock, null, 2));
      return 0;
    }
    if (args.has("--check-lock")) {
      const check = verifyLock(jevDir);
      if (check.kind === "ok") {
        log("jev lock: ok");
        return 0;
      }
      error(`jev lock drift:\n  - ${check.problems.join("\n  - ")}`);
      return 1;
    }

    // Stamp-trust gate BEFORE Jev is consulted (zero Jev calls on an untrusted stamp).
    assertStampTrust({ evalsDir, resolveEvalEngineRoot: () => join(PLUGIN_ROOT, "engine") });

    const report = await runJevSuite({
      jevDir,
      env: opts.env,
      fetchImpl: opts.fetchImpl,
      onJevCall: opts.onJevCall,
    });
    log(formatJevSummary(report));
    if (!args.has("--no-write")) {
      const path = writeJevRun(report, join(evalsDir, "_runs", "jev"));
      log(`results: ${path}`);
    }
    return report.exit_code;
  } catch (err) {
    error(`eval:jev error: ${(err as Error).message}`);
    return 2;
  }
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  runEvalJevCli({ argv: process.argv.slice(2), cwd: process.cwd() }).then((code) => process.exit(code));
}
