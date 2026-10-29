#!/usr/bin/env tsx
/**
 * Run Jest against the host repo's `evals/jest.config.ts` using the plugin
 * install's Jest binary (lean layout — deps live in the plugin).
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveHostRepoRoot } from "../src/config-loader.js";
import { spawnBin } from "../src/spawn-tsx.js";

/**
 * Jest flags that load or execute arbitrary modules / replace the config. Pass-through args are
 * otherwise forwarded verbatim (spawned without a shell), but these would let a caller run code
 * outside the host repo's evals config, so they are rejected.
 */
const BLOCKED_JEST_FLAGS = new Set([
  "--config", "-c", "--rootDir", "--roots", "--globalSetup", "--globalTeardown", "--setupFiles",
  "--setupFilesAfterEnv", "--testEnvironment", "--env", "--testRunner", "--testSequencer", "--transform",
  "--resolver", "--reporters", "--moduleDirectories", "--modulePaths", "--moduleNameMapper", "--preset",
  "--projects", "--runner", "--snapshotResolver", "--watchPlugins", "--testResultsProcessor", "--filter",
  "--outputFile", "--cacheDirectory", "--coverageDirectory", "--json",
]);
const SAFE_ARG = /^[\w@%+=:,./*?\[\]{}()|^$\\ -]*$/;

export function sanitizeJestArgs(args: string[]): string[] {
  const out: string[] = [];
  for (const raw of args) {
    const arg = String(raw);
    const flag = arg.split("=", 1)[0]!;
    if (BLOCKED_JEST_FLAGS.has(flag)) {
      throw new Error(`run-jest: refusing to forward ${flag} (config/module-loading flags are not allowed)`);
    }
    if (arg.includes("\0") || !SAFE_ARG.test(arg)) {
      throw new Error(`run-jest: refusing to forward argument with unsupported characters: ${JSON.stringify(arg)}`);
    }
    out.push(arg);
  }
  return out;
}

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolveHostRepoRoot();
const configPath = join(repoRoot, "evals", "jest.config.ts");

if (!existsSync(configPath)) {
  console.error(`jest config not found: ${configPath}`);
  process.exit(1);
}

const dash = process.argv.indexOf("--");
const extraArgs = sanitizeJestArgs(dash >= 0 ? process.argv.slice(dash + 1) : []);

const result = spawnBin({
  binName: "jest",
  args: ["--config", configPath, ...extraArgs],
  cwd: PLUGIN_ROOT,
  searchRoots: [PLUGIN_ROOT],
  env: {
    ...process.env,
    NODE_OPTIONS: "--experimental-vm-modules",
    ZOTO_EVAL_HOST_REPO: repoRoot,
  },
});

process.exit(result.status ?? 1);
