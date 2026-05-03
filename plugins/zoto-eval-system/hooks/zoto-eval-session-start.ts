#!/usr/bin/env node
/**
 * Session-start hook.
 *
 * Nudges the user about:
 *   - stale runs under {evalsDir}/_runs/ (older than N days).
 *   - missing evals.json for discovered skills.
 *   - detected drift (runs `eval:update --check` implicitly, throttled to once
 *     per day via a marker file).
 *
 * Non-blocking. Writes `{ additional_context: "<message>" }` on stdout when
 * anything is worth surfacing; otherwise writes an empty object.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const DEFAULT_EVALS_DIR = "evals";
const STALE_DAYS = 14;

function emitEmpty(): void {
  process.stdout.write("{}\n");
}

function loadJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return undefined;
  }
}

function ageDays(ms: number): number {
  return (Date.now() - ms) / (1000 * 60 * 60 * 24);
}

function markerShouldRun(markerPath: string): boolean {
  if (!existsSync(markerPath)) return true;
  try {
    const mtime = statSync(markerPath).mtimeMs;
    return ageDays(mtime) >= 1;
  } catch {
    return true;
  }
}

function touch(markerPath: string): void {
  mkdirSync(dirname(markerPath), { recursive: true });
  writeFileSync(markerPath, new Date().toISOString(), "utf-8");
}

function staleRuns(evalsDir: string, root: string): string[] {
  const runsDir = join(root, evalsDir, "_runs");
  if (!existsSync(runsDir)) return [];
  const stale: string[] = [];
  for (const entry of readdirSync(runsDir)) {
    try {
      const full = join(runsDir, entry);
      const st = statSync(full);
      if (st.isDirectory() && ageDays(st.mtimeMs) >= STALE_DAYS) stale.push(entry);
    } catch {
      continue;
    }
  }
  return stale;
}

function missingEvals(root: string): string[] {
  const misses: string[] = [];
  const skillsRoots = [".cursor/skills", "skills"];
  for (const r of skillsRoots) {
    const abs = join(root, r);
    if (!existsSync(abs)) continue;
    try {
      for (const name of readdirSync(abs)) {
        const dir = join(abs, name);
        if (!statSync(dir).isDirectory()) continue;
        const skillMd = join(dir, "SKILL.md");
        if (!existsSync(skillMd)) continue;
        const evalsFile = join(dir, "evals", "evals.json");
        if (!existsSync(evalsFile)) misses.push(name);
      }
    } catch {
      continue;
    }
  }
  return misses;
}

function main(): void {
  try {
    readFileSync(0, "utf-8");
  } catch {
    /* empty */
  }

  const root = process.cwd();
  const configPath = join(root, ".zoto-eval-system", "config.json");
  const cfg = loadJson(configPath) as Record<string, unknown> | undefined;
  if (!cfg) {
    emitEmpty();
    return;
  }

  const evalsDir = (cfg.evalsDir as string) ?? DEFAULT_EVALS_DIR;
  const messages: string[] = [];

  const stale = staleRuns(evalsDir, root);
  if (stale.length > 0) {
    messages.push(`Eval System: ${stale.length} run(s) older than ${STALE_DAYS} days. Consider /zoto-eval-execute.`);
  }

  const misses = missingEvals(root);
  if (misses.length > 0) {
    messages.push(`Eval System: ${misses.length} skill(s) missing evals.json: ${misses.slice(0, 3).join(", ")}${misses.length > 3 ? ", ..." : ""}. Run /zoto-eval-update.`);
  }

  const markerPath = join(root, ".zoto-eval-system", ".last-drift-check");
  if (markerShouldRun(markerPath)) {
    const manifestPath = join(root, ".zoto-eval-system", "manifest.yml");
    if (existsSync(manifestPath)) {
      messages.push("Eval System: run /zoto-eval-update to check for drift (last check >= 1 day ago).");
    }
    touch(markerPath);
  }

  if (messages.length === 0) {
    emitEmpty();
    return;
  }

  process.stdout.write(JSON.stringify({ additional_context: messages.join("\n") }) + "\n");
}

main();
