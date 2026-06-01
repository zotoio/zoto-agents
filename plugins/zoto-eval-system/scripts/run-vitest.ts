#!/usr/bin/env tsx
/**
 * Run Vitest against the host repo's `evals/vitest.config.ts` using the
 * plugin install's Vitest binary (lean layout — runtime deps live in the plugin).
 *
 * Process cwd is the host repo so include globs resolve under `.cursor/`.
 * Vitest itself is resolved from the plugin's node_modules/.bin via PATH.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveHostRepoRoot } from "../src/config-loader.js";
import { spawnBin } from "../src/spawn-tsx.js";
import { ensureNativeDeps } from "./ensure-native-deps.js";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolveHostRepoRoot();
const configPath = join(repoRoot, "evals", "vitest.config.ts");

if (!existsSync(configPath)) {
  console.error(`vitest config not found: ${configPath}`);
  process.exit(1);
}

const native = ensureNativeDeps({ pluginRoot: PLUGIN_ROOT });
if (!native.sqlite3Built && native.sqlite3Dir) {
  console.error(
    "[zoto-eval] sqlite3 native binding missing — run `pnpm install` in the zoto-eval-system plugin, or reinstall the plugin.",
  );
  process.exit(1);
}

const dash = process.argv.indexOf("--");
const extraArgs = dash >= 0 ? process.argv.slice(dash + 1) : [];

const result = spawnBin({
  binName: "vitest",
  args: ["run", "--config", configPath, ...extraArgs],
  cwd: repoRoot,
  searchRoots: [PLUGIN_ROOT],
  env: {
    ...process.env,
    ZOTO_EVAL_HOST_REPO: repoRoot,
  },
});

process.exit(result.status ?? 1);
