#!/usr/bin/env tsx
/**
 * Un-eject CLI — reverse self-contained layout, restore lean plugin-dependent mode.
 *
 * Removes vendored runtime under `.zoto/eval-system/` (src, engine, templates, scripts,
 * nested package.json), strips ejected primitives from `.cursor/`, sets
 * `hostLayout: plugin`, and re-stamps lean eval-home runtime under `.zoto/eval-system/`.
 *
 * Run: `pnpm run eval:un-eject` (or `--dry-run` / `--force`).
 */
import { createInterface } from "node:readline";
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

import {
  resolvePluginRoot,
  type ResolvePluginRootOptions,
} from "../src/paths.js";
import { patchConfigHostLayout } from "./stamp-host-layout.js";
import {
  DEFAULT_EJECTED_PRIMITIVES_LAYOUT,
  ejectedPrimitivesCleanupTargets,
  type EjectedPrimitivesLayout,
} from "./stamp-primitives.js";
import { stampLeanLayout } from "./stamp-lean-layout.js";

const VENDORED_DIRS = ["src", "engine", "templates", "scripts"] as const;

const PRESERVED_EVAL_HOME_NAMES = new Set([
  "config.yml",
  "manifest.yml",
  "manifest.history.yml",
  "cache",
  "evals",
]);

export interface UnEjectHostLayoutOptions {
  repoRoot: string;
  dryRun?: boolean;
  force?: boolean;
  /** Skip interactive confirmation (CI / automation). */
  skipConfirm?: boolean;
  /** Override plugin root resolution (primarily unit tests). */
  pluginRoot?: string;
  /** Narrow plugin discovery (tests: `{ env: {}, cursorPluginsRoots: [] }`). */
  resolvePluginRootOptions?: ResolvePluginRootOptions;
}

export interface UnEjectHostLayoutResult {
  evalHome: string;
  pluginRoot: string;
  deleted: string[];
  skipped: string[];
  configPatched: boolean;
  primitivesLayout: EjectedPrimitivesLayout;
  leanLayout?: ReturnType<typeof stampLeanLayout>;
  warnings: string[];
}

function evalHomeFor(repoRoot: string): string {
  return join(repoRoot, ".zoto", "eval-system");
}

function readHostLayout(evalHome: string): string | undefined {
  const configPath = join(evalHome, "config.yml");
  if (!existsSync(configPath)) return undefined;
  try {
    const raw = parseYaml(readFileSync(configPath, "utf-8")) as { hostLayout?: string };
    return typeof raw.hostLayout === "string" ? raw.hostLayout : undefined;
  } catch {
    return undefined;
  }
}

/** Filesystem markers matching paths.ts `isEjectedMarker`. */
export function isEjectedLayout(evalHome: string): boolean {
  return (
    existsSync(join(evalHome, "scripts", "eval-discover.ts")) ||
    existsSync(join(evalHome, "scripts", "eval-orchestrate.ts")) ||
    existsSync(join(evalHome, "engine", "runner.ts"))
  );
}

export function detectEjectedPrimitivesLayout(repoRoot: string): EjectedPrimitivesLayout {
  const nestedAgent = join(repoRoot, ".cursor", "agents", "eval-sys");
  if (existsSync(nestedAgent) && statSync(nestedAgent).isDirectory()) {
    return "nested";
  }
  return DEFAULT_EJECTED_PRIMITIVES_LAYOUT;
}

function collectVendoredTargets(evalHome: string): string[] {
  const targets: string[] = [];
  for (const dir of VENDORED_DIRS) {
    const p = join(evalHome, dir);
    if (existsSync(p)) targets.push(p);
  }
  const nestedPkg = join(evalHome, "package.json");
  if (existsSync(nestedPkg)) targets.push(nestedPkg);

  const nodeModules = join(evalHome, "node_modules");
  if (existsSync(nodeModules)) {
    targets.push(nodeModules);
  }

  return targets;
}

function listEvalHomeEntries(evalHome: string): string[] {
  if (!existsSync(evalHome)) return [];
  return readdirSync(evalHome);
}

async function confirmDeletion(paths: string[], force: boolean): Promise<boolean> {
  if (force) return true;
  console.log("The following paths will be removed or reverted:\n");
  for (const p of paths) {
    console.log(`  - ${p}`);
  }
  console.log("");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolvePromise) => {
    rl.question("Proceed with un-eject? [y/N] ", (answer) => {
      rl.close();
      const ok = /^y(es)?$/i.test(answer.trim());
      resolvePromise(ok);
    });
  });
}

export function unEjectHostLayout(opts: UnEjectHostLayoutOptions): UnEjectHostLayoutResult {
  const repoRoot = resolve(opts.repoRoot);
  const evalHome = evalHomeFor(repoRoot);
  const dryRun = !!opts.dryRun;
  const warnings: string[] = [];
  const deleted: string[] = [];
  const skipped: string[] = [];

  let pluginRoot: string;
  try {
    pluginRoot = opts.pluginRoot
      ? resolve(opts.pluginRoot)
      : resolvePluginRoot(repoRoot, opts.resolvePluginRootOptions);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Cannot resolve zoto-eval-system plugin — un-eject would leave the host without a runtime.\n${msg}`,
    );
  }

  const hostLayout = readHostLayout(evalHome);
  const ejected = hostLayout === "ejected" || isEjectedLayout(evalHome);
  if (!ejected) {
    throw new Error(
      "Host is not in ejected layout (hostLayout is not ejected and no vendored runtime detected). Nothing to un-eject.",
    );
  }

  const primitivesLayout = detectEjectedPrimitivesLayout(repoRoot);
  const vendoredTargets = collectVendoredTargets(evalHome);
  const primitiveTargets = ejectedPrimitivesCleanupTargets(repoRoot, primitivesLayout).filter(
    existsSync,
  );

  const nodeModules = join(evalHome, "node_modules");
  if (existsSync(nodeModules)) {
    warnings.push(
      `Found ${nodeModules} — it will be removed. Run \`rm -rf .zoto/eval-system/node_modules\` manually if deletion is skipped.`,
    );
  }

  for (const name of listEvalHomeEntries(evalHome)) {
    if (PRESERVED_EVAL_HOME_NAMES.has(name)) continue;
    const abs = join(evalHome, name);
    if (vendoredTargets.includes(abs)) continue;
    if (name === ".gitignore" || name === ".env.example") {
      if (!dryRun && existsSync(abs)) {
        rmSync(abs, { recursive: true, force: true });
        deleted.push(abs);
      } else if (dryRun && existsSync(abs)) {
        deleted.push(abs);
      }
      continue;
    }
    if (!vendoredTargets.includes(abs) && !primitiveTargets.includes(abs)) {
      skipped.push(`unexpected eval-home entry (left intact): ${abs}`);
    }
  }

  const allTargets = [...vendoredTargets, ...primitiveTargets];

  for (const target of allTargets) {
    if (!existsSync(target)) {
      skipped.push(`missing: ${target}`);
      continue;
    }
    if (!dryRun) {
      rmSync(target, { recursive: true, force: true });
    }
    deleted.push(target);
  }

  const configPatched = existsSync(join(evalHome, "config.yml"))
    ? patchConfigHostLayout(evalHome, "plugin", dryRun)
    : false;

  let leanLayout: UnEjectHostLayoutResult["leanLayout"];
  if (!dryRun) {
    leanLayout = stampLeanLayout({ repoRoot, dryRun: false, installDeps: true });
  }

  return {
    evalHome,
    pluginRoot,
    deleted,
    skipped,
    configPatched,
    primitivesLayout,
    leanLayout,
    warnings,
  };
}

function parseCli(argv: string[]): UnEjectHostLayoutOptions & { json?: boolean } {
  const opts: UnEjectHostLayoutOptions & { json?: boolean } = {
    repoRoot: process.cwd(),
    dryRun: false,
    force: false,
    skipConfirm: false,
    json: false,
  };
  for (const a of argv) {
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--force") {
      opts.force = true;
      opts.skipConfirm = true;
    } else if (a === "--json") opts.json = true;
    else if (a.startsWith("--repo-root=")) {
      opts.repoRoot = resolve(a.slice("--repo-root=".length));
    }
  }
  return opts;
}

function printUnEjectSummary(
  result: UnEjectHostLayoutResult,
  dryRun: boolean,
  confirmed: boolean,
): void {
  const mode = dryRun ? "Dry-run — would un-eject" : confirmed ? "Un-ejected" : "Un-eject cancelled";
  const lines = [
    `${mode} — lean plugin-dependent layout`,
    `  Eval home: ${result.evalHome}`,
    `  Plugin root: ${result.pluginRoot}`,
    `  Primitives layout cleaned: ${result.primitivesLayout}`,
    `  Removed: ${result.deleted.length} path(s)`,
    `  config.yml hostLayout: ${result.configPatched ? "plugin" : "(unchanged)"}`,
  ];
  if (result.leanLayout) {
    lines.push(
      `  Lean layout stamped: ${result.leanLayout.created.length} created, ${result.leanLayout.skipped.length} skipped`,
    );
  }
  if (result.warnings.length > 0) {
    lines.push("  Warnings:");
    for (const w of result.warnings) lines.push(`    - ${w}`);
  }
  if (result.skipped.length > 0 && result.skipped.length <= 8) {
    for (const s of result.skipped) lines.push(`  Skipped: ${s}`);
  } else if (result.skipped.length > 8) {
    lines.push(`  Skipped: ${result.skipped.length} path(s)`);
  }
  if (!dryRun && confirmed) {
    lines.push("");
    lines.push("Next steps:");
    lines.push("  1. Run eval commands via root aliases (pnpm run eval, etc.)");
    lines.push("  2. Primitives resolve from the installed plugin, not .cursor/*/eval-sys/");
    lines.push("  3. To self-contain again: pnpm run eval:stamp-host-layout");
  } else if (dryRun) {
    lines.push("");
    lines.push("Re-run without --dry-run to apply.");
  }
  console.log(lines.join("\n"));
}

async function main(): Promise<void> {
  const opts = parseCli(process.argv.slice(2));
  const repoRoot = resolve(opts.repoRoot);
  const evalHome = evalHomeFor(repoRoot);

  let pluginRoot: string;
  try {
    pluginRoot = opts.pluginRoot
      ? resolve(opts.pluginRoot)
      : resolvePluginRoot(repoRoot, opts.resolvePluginRootOptions);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: cannot resolve plugin: ${msg}`);
    process.exit(1);
  }

  const hostLayout = readHostLayout(evalHome);
  const ejected = hostLayout === "ejected" || isEjectedLayout(evalHome);
  if (!ejected) {
    console.error("Error: host is not ejected — nothing to un-eject.");
    process.exit(1);
  }

  const primitivesLayout = detectEjectedPrimitivesLayout(repoRoot);
  const planPaths = [
    ...collectVendoredTargets(evalHome),
    ...ejectedPrimitivesCleanupTargets(repoRoot, primitivesLayout).filter(existsSync),
  ];
  if (existsSync(join(evalHome, "config.yml"))) {
    planPaths.push(`${join(evalHome, "config.yml")} (hostLayout → plugin)`);
  }
  planPaths.push(`${join(evalHome, "package.json")} (lean eval-home runtime via lean-package.json)`);

  if (opts.dryRun) {
    const preview = unEjectHostLayout({ ...opts, dryRun: true, pluginRoot });
    printUnEjectSummary(preview, true, true);
    if (opts.json) console.log(JSON.stringify(preview, null, 2));
    return;
  }

  const ok = opts.skipConfirm || opts.force ? true : await confirmDeletion(planPaths, !!opts.force);
  if (!ok) {
    console.log("Un-eject cancelled.");
    process.exit(0);
  }

  const result = unEjectHostLayout({ ...opts, pluginRoot });
  printUnEjectSummary(result, false, true);
  if (opts.json) console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1]?.endsWith("eval-un-eject.ts")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
