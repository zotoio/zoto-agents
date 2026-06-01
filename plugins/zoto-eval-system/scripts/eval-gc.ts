#!/usr/bin/env tsx
/**
 * Run-folder retention GC (subtask 12 of eval-system v2).
 *
 * Walks `<repoRoot>/<evalsDir>/_runs/`, sorts the timestamped sub-dirs
 * by name desc (so the newest stays at index 0), and keeps the first
 * `runs.retention` folders. Anything past that is deleted.
 *
 * Modes:
 *   --dry-run (default) — list deletion candidates, do not touch disk.
 *   --apply             — actually `rm -rf` everything past retention.
 *
 * `runs.retention` is read from `.zoto/eval-system/config.yml`
 * (default `30`).
 *
 * Only directories whose names look like a run timestamp / run id are
 * considered. Hidden files (e.g. `.cleanup-token-*.json`) and stray
 * non-directory entries are left alone.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import { loadEvalConfig, loadEvalPaths, resolveHostRepoRoot } from "../src/config-loader.js";

const REPO_ROOT = resolveHostRepoRoot();

export interface GcArgs {
  apply: boolean;
  /** Override retention from CLI for one-off cleanups. */
  retention?: number;
  /** Override the host repo root (test seam). */
  hostRepoRoot?: string;
}

export interface GcPlan {
  runsDir: string;
  retention: number;
  kept: string[];
  deletionCandidates: string[];
  scanned: number;
  apply: boolean;
}

export function parseArgs(argv: string[]): GcArgs {
  const args: GcArgs = { apply: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--dry-run") args.apply = false;
    else if (a === "--retention" && argv[i + 1]) {
      const n = Number(argv[++i]);
      if (Number.isFinite(n) && n > 0) args.retention = Math.floor(n);
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp(): void {
  process.stdout.write(
    [
      "Usage: tsx scripts/eval-gc.ts [--dry-run | --apply] [--retention <N>]",
      "",
      "Default mode is --dry-run (lists deletion candidates).",
      "Reads runs.retention from .zoto/eval-system/config.yml (default: 30).",
      "",
    ].join("\n"),
  );
}

function loadRetention(hostRepoRoot: string = REPO_ROOT): number {
  return loadEvalConfig(hostRepoRoot).config.runs.retention;
}

const RUN_DIR_NAME_RE = /^[A-Za-z0-9._-]{4,}$/;

export function computePlan(opts: GcArgs = {}): GcPlan {
  const hostRepoRoot = opts.hostRepoRoot ?? REPO_ROOT;
  const paths = loadEvalPaths(hostRepoRoot);
  const runsDir = join(hostRepoRoot, paths.evalsDirRel, "_runs");
  const retention = opts.retention ?? loadRetention(hostRepoRoot);

  if (!existsSync(runsDir)) {
    return {
      runsDir,
      retention,
      kept: [],
      deletionCandidates: [],
      scanned: 0,
      apply: opts.apply ?? false,
    };
  }

  const entries = readdirSync(runsDir)
    .filter((name) => !name.startsWith("."))
    .filter((name) => RUN_DIR_NAME_RE.test(name))
    .filter((name) => {
      try {
        return statSync(join(runsDir, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort()
    .reverse(); // newest first (lexicographic sort works for ISO-like stamps)

  const kept = entries.slice(0, retention);
  const deletionCandidates = entries.slice(retention);

  return {
    runsDir,
    retention,
    kept,
    deletionCandidates,
    scanned: entries.length,
    apply: opts.apply ?? false,
  };
}

export function applyPlan(plan: GcPlan): { deleted: string[]; failed: string[] } {
  const deleted: string[] = [];
  const failed: string[] = [];
  for (const name of plan.deletionCandidates) {
    const target = join(plan.runsDir, name);
    try {
      rmSync(target, { recursive: true, force: true });
      deleted.push(target);
    } catch (e) {
      failed.push(`${target}: ${(e as Error).message}`);
    }
  }
  return { deleted, failed };
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const plan = computePlan(args);
  if (args.apply && plan.deletionCandidates.length > 0) {
    const { deleted, failed } = applyPlan(plan);
    process.stdout.write(
      `${JSON.stringify(
        {
          mode: "apply",
          runs_dir: relative(REPO_ROOT, plan.runsDir),
          retention: plan.retention,
          scanned: plan.scanned,
          kept: plan.kept,
          deleted: deleted.map((d) => relative(REPO_ROOT, d)),
          failed,
        },
        null,
        2,
      )}\n`,
    );
    return failed.length === 0 ? 0 : 1;
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        mode: args.apply ? "apply (no candidates)" : "dry-run",
        runs_dir: relative(REPO_ROOT, plan.runsDir),
        retention: plan.retention,
        scanned: plan.scanned,
        kept: plan.kept,
        deletion_candidates: plan.deletionCandidates,
      },
      null,
      2,
    )}\n`,
  );
  return 0;
}

const isCli =
  typeof process.argv[1] === "string" &&
  /eval-gc(\.ts)?$/.test(process.argv[1] ?? "");
if (isCli) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`${(err as Error).stack ?? String(err)}\n`);
      process.exit(1);
    },
  );
}
