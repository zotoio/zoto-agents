#!/usr/bin/env tsx
/**
 * Migrate a host repo from legacy-root eval layout to v3 self-contained layout.
 *
 * Moves legacy host artefacts when present:
 *   evals/              → .zoto/eval-system/evals/
 *   scripts/eval-*.ts   → .zoto/eval-system/scripts/  (legacy monorepo dogfood only)
 *   scripts/test.py     → .zoto/eval-system/scripts/
 *   plugins/zoto-eval-system/{src,templates,engine} → .zoto/eval-system/
 *
 * Then stamps runtime assets from the installed plugin package (`PLUGIN_ROOT`)
 * and strips eval pollution from root package.json.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { stampHostLayout, stripRootEvalPackage } from "./stamp-host-layout.js";

export interface MigrateOptions {
  repoRoot: string;
  dryRun?: boolean;
  apply?: boolean;
}

export interface MigratePlan {
  moves: Array<{ from: string; to: string; exists: boolean }>;
  removes: string[];
  gitignoreLines: string[];
}

function evalHome(repoRoot: string): string {
  return join(repoRoot, ".zoto", "eval-system");
}

function planMigration(repoRoot: string): MigratePlan {
  const home = evalHome(repoRoot);
  const moves: MigratePlan["moves"] = [];

  const legacyEvals = join(repoRoot, "evals");
  if (existsSync(legacyEvals)) {
    moves.push({
      from: legacyEvals,
      to: join(home, "evals"),
      exists: true,
    });
  }

  const scriptNames = [
    "eval-discover.ts",
    "eval-analyse.ts",
    "eval-stamp.ts",
    "eval-orchestrate.ts",
    "eval-gc.ts",
    "eval-cleanup-vendored.ts",
    "eval-cleanup-stale.ts",
    "check-analyser-payload-parity.ts",
    "eval-ensure-host.ts",
    "test.py",
  ];
  for (const name of scriptNames) {
    const from = join(repoRoot, "scripts", name);
    if (existsSync(from)) {
      moves.push({ from, to: join(home, "scripts", name), exists: true });
    }
  }

  const pluginPartial = join(repoRoot, "plugins", "zoto-eval-system");
  for (const sub of ["src", "templates", "engine"] as const) {
    const from = join(pluginPartial, sub);
    if (existsSync(from)) {
      moves.push({ from, to: join(home, sub), exists: true });
    }
  }

  const removes: string[] = [];
  if (existsSync(pluginPartial)) {
    removes.push(pluginPartial);
  }

  const gitignoreLines = [
    ".zoto/eval-system/node_modules/",
    ".zoto/eval-system/cache/",
  ];

  return { moves, removes, gitignoreLines };
}

function ensureGitignore(repoRoot: string, lines: string[], dryRun: boolean): void {
  const giPath = join(repoRoot, ".gitignore");
  if (!existsSync(giPath)) return;
  let content = readFileSync(giPath, "utf-8");
  for (const line of lines) {
    if (!content.includes(line)) {
      content = content.endsWith("\n") ? content : `${content}\n`;
      content += `${line}\n`;
    }
  }
  if (!dryRun) writeFileSync(giPath, content, "utf-8");
}

function executeMoves(moves: MigratePlan["moves"], dryRun: boolean): void {
  for (const { from, to } of moves) {
    if (!existsSync(from)) continue;
    if (existsSync(to)) {
      // Merge: keep destination, remove source after copy attempt
      if (!dryRun) {
        rmSync(from, { recursive: true, force: true });
      }
      continue;
    }
    if (!dryRun) {
      mkdirSync(dirname(to), { recursive: true });
      renameSync(from, to);
    }
  }
}

function parseCli(argv: string[]): MigrateOptions {
  const opts: MigrateOptions = { repoRoot: process.cwd(), dryRun: true, apply: false };
  for (const a of argv) {
    if (a === "--apply") {
      opts.apply = true;
      opts.dryRun = false;
    } else if (a === "--dry-run") opts.dryRun = true;
    else if (a.startsWith("--repo-root=")) opts.repoRoot = resolve(a.slice("--repo-root=".length));
  }
  return opts;
}

export function migrateHostLayoutV3(opts: MigrateOptions): {
  plan: MigratePlan;
  stamp: ReturnType<typeof stampHostLayout>;
  strip: ReturnType<typeof stripRootEvalPackage>;
} {
  const repoRoot = resolve(opts.repoRoot);
  const plan = planMigration(repoRoot);
  const dryRun = opts.dryRun ?? !opts.apply;

  if (!dryRun) {
    mkdirSync(evalHome(repoRoot), { recursive: true });
    executeMoves(plan.moves, false);
    for (const rm of plan.removes) {
      if (existsSync(rm)) rmSync(rm, { recursive: true, force: true });
    }
    ensureGitignore(repoRoot, plan.gitignoreLines, false);
  }

  const stamp = stampHostLayout({
    repoRoot,
    dryRun,
    forceScripts: !dryRun,
  });

  const strip = dryRun
    ? { removedScripts: [] as string[], removedDevDeps: [] as string[] }
    : stripRootEvalPackage(repoRoot, false);

  return { plan, stamp, strip };
}

if (process.argv[1]?.endsWith("migrate-host-layout-v3.ts")) {
  const opts = parseCli(process.argv.slice(2));
  const result = migrateHostLayoutV3(opts);
  console.log(JSON.stringify(result, null, 2));
  if (!opts.apply && !process.argv.includes("--dry-run")) {
    console.error("\nDry-run only. Re-run with --apply to migrate.");
  }
}
