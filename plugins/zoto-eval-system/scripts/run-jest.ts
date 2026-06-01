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

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolveHostRepoRoot();
const configPath = join(repoRoot, "evals", "jest.config.ts");

if (!existsSync(configPath)) {
  console.error(`jest config not found: ${configPath}`);
  process.exit(1);
}

const dash = process.argv.indexOf("--");
const extraArgs = dash >= 0 ? process.argv.slice(dash + 1) : [];

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
