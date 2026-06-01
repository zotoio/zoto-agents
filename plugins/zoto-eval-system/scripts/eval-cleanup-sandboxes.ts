#!/usr/bin/env tsx
/**
 * Prune old sandbox run directories under /tmp/zoto-eval/, keeping the newest by mtime.
 *
 * Usage:
 *   tsx plugins/zoto-eval-system/scripts/eval-cleanup-sandboxes.ts [--keep N]
 *
 * Default keep count: `--keep`, else ZOTO_EVAL_KEEP_SANDBOXES (default "5").
 * Idempotent — exits 0 if /tmp/zoto-eval/ is missing or empty.
 */
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/tmp/zoto-eval";

function parseKeep(argv: string[]): number | undefined {
  const idx = argv.indexOf("--keep");
  if (idx === -1 || idx + 1 >= argv.length) return undefined;
  const n = parseInt(argv[idx + 1]!, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function main(): number {
  const cliKeep = parseKeep(process.argv);
  const raw =
    cliKeep ?? parseInt(process.env.ZOTO_EVAL_KEEP_SANDBOXES ?? "5", 10);
  const keep =
    Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 5;

  if (!existsSync(ROOT)) {
    console.log("kept: 0, pruned: 0");
    return 0;
  }

  const entries = readdirSync(ROOT)
    .map((name) => {
      try {
        const full = join(ROOT, name);
        const st = statSync(full);
        return st.isDirectory() ? { name, full, mtime: st.mtimeMs } : null;
      } catch {
        return null;
      }
    })
    .filter((x): x is { name: string; full: string; mtime: number } => x !== null)
    .sort((a, b) => b.mtime - a.mtime);

  if (entries.length === 0) {
    console.log("kept: 0, pruned: 0");
    return 0;
  }

  const keepDirs = entries.slice(0, keep);
  const pruneDirs = entries.slice(keep);

  for (const d of pruneDirs) {
    try {
      rmSync(d.full, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  console.log(
    `kept: ${keepDirs.length}, pruned: ${pruneDirs.length}`,
  );
  return 0;
}

process.exit(main());
