#!/usr/bin/env tsx
/**
 * Idempotent host-repo bootstrapper for env, gitignore, root docs, and scenario example.
 *
 * Stamped into the host repo by `zoto-create-evals` and surfaced as
 * `pnpm run eval:ensure-host`. Responsibilities:
 *
 *   1. Stamp `.env.example` and repo-root `.gitignore` (via ensureHostFiles).
 *   2. Stamp repo-root `README.md` and `AGENTS.md` when missing.
 *   3. Copy the skipped multi-primitive scenario example when missing.
 *
 * Usage:
 *   pnpm run eval:ensure-host                  # write changes
 *   tsx scripts/eval-ensure-host.ts --dry-run  # preview only
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadEvalPaths, resolveHostRepoRoot } from "../src/config-loader.js";
import { ensureHostFiles } from "./ensure-host-env-and-gitignore.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(SCRIPT_DIR, "..");
const SCENARIO_TEMPLATE_PATH = resolve(
  SCRIPT_DIR,
  "../templates/scenarios/_example-multi-primitive.test.ts.tmpl",
);

function scenarioRelPath(repoRoot: string): string {
  const paths = loadEvalPaths(repoRoot);
  const scenarioAbs = join(
    paths.evalsDirAbs,
    "scenarios",
    "_example-multi-primitive.test.ts",
  );
  return relative(repoRoot, scenarioAbs).split("\\").join("/");
}

function scenarioTemplatePath(repoRoot: string): string {
  const paths = loadEvalPaths(repoRoot);
  const fromPlugin = join(
    paths.templatesDirAbs,
    "scenarios",
    "_example-multi-primitive.test.ts.tmpl",
  );
  return existsSync(fromPlugin) ? fromPlugin : SCENARIO_TEMPLATE_PATH;
}

interface CliOptions {
  repoRoot: string;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { repoRoot: resolveHostRepoRoot(), dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === "--repo-root") {
      const v = argv[++i];
      if (v) opts.repoRoot = resolve(v);
    } else if (a === "--dry-run") {
      opts.dryRun = true;
    }
  }
  return opts;
}

function ensureScenarioExample(repoRoot: string, dryRun: boolean): string {
  const rel = scenarioRelPath(repoRoot);
  const path = join(repoRoot, rel);
  const templatePath = scenarioTemplatePath(repoRoot);
  if (existsSync(path)) return `skipped-existing ${path}`;
  if (!existsSync(templatePath)) {
    return `skipped-missing-template ${templatePath}`;
  }
  const body = readFileSync(templatePath, "utf-8");
  if (!dryRun) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body, "utf-8");
  }
  return `created ${path}`;
}

function formatRootDoc(label: string, report: { path: string; action: string }): string {
  return `${label} ${report.action} ${report.path}`;
}

const opts = parseArgs(process.argv.slice(2));
const host = ensureHostFiles({
  repoRoot: opts.repoRoot,
  templatePath: join(PLUGIN_ROOT, "templates", "env", ".env.example.tmpl"),
  pluginRoot: PLUGIN_ROOT,
  dryRun: opts.dryRun,
});

console.log(`eval-ensure-host ${opts.dryRun ? "(dry-run) " : ""}in ${opts.repoRoot}`);
console.log(`  env-example ${host.envExample.action} ${host.envExample.path}`);
console.log(`  gitignore ${host.gitignore.action} ${host.gitignore.path}`);
console.log(`  ${formatRootDoc("readme", host.readme)}`);
console.log(`  ${formatRootDoc("agents-md", host.agentsMd)}`);
console.log(`  scenario ${ensureScenarioExample(opts.repoRoot, opts.dryRun)}`);
