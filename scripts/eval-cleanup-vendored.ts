#!/usr/bin/env tsx
/**
 * Remove central + skill eval JSON whose source targets match config.ignore globs.
 * Deletes only files where EVERY case row has `_meta.generated === true` (pure generated).
 *
 * Usage: tsx scripts/eval-cleanup-vendored.ts [--dry-run]
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadIgnoreGlobs,
  matchIgnoreGlob,
  repoRelPosix,
} from "./eval-analyse.ts";

const REPO_ROOT = resolve(process.cwd());

function pluginDirs(repo: string): string[] {
  const p = join(repo, "plugins");
  if (!existsSync(p)) return [];
  return readdirSync(p).map((d) => join(p, d));
}

function enumerateSkillEvalJson(repo: string): string[] {
  const out: string[] = [];
  const roots = [join(repo, ".cursor", "skills"), join(repo, "skills")];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root)) {
      const dir = join(root, name);
      if (!statIsDir(dir)) continue;
      const f = join(dir, "evals", "evals.json");
      if (existsSync(f)) out.push(f);
    }
  }
  for (const pd of pluginDirs(repo)) {
    const sk = join(pd, "skills");
    if (!existsSync(sk)) continue;
    for (const name of readdirSync(sk)) {
      const dir = join(sk, name);
      if (!statIsDir(dir)) continue;
      const f = join(dir, "evals", "evals.json");
      if (existsSync(f)) out.push(f);
    }
  }
  return out;
}

function statIsDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function enumerateCentralEvalJson(repo: string): string[] {
  const out: string[] = [];
  const kinds = ["commands", "agents", "hooks"] as const;
  function pushDir(d: string): void {
    if (!existsSync(d) || !statIsDir(d)) return;
    for (const fn of readdirSync(d).sort()) {
      if (!fn.endsWith(".json")) continue;
      out.push(join(d, fn));
    }
  }
  for (const k of kinds) {
    pushDir(join(repo, ".cursor", "evals", k));
    for (const pd of pluginDirs(repo)) {
      pushDir(join(pd, "evals", k));
    }
  }
  return out;
}

function collectAllEvalPaths(repo: string): string[] {
  return [...new Set([...enumerateSkillEvalJson(repo), ...enumerateCentralEvalJson(repo)])].sort(
    (a, b) => a.localeCompare(b),
  );
}

/** Map eval JSON absolute path → expected primary source repo-relative posix, or null. */
export function deriveSourceFromEvalPath(
  repo: string,
  evalAbsPath: string,
): string | null {
  const rel = repoRelPosix(evalAbsPath, repo);

  let m =
    /^\.cursor\/skills\/([^/]+)\/evals\/evals\.json$/.exec(rel) ||
    /^skills\/([^/]+)\/evals\/evals\.json$/.exec(rel);
  if (m) {
    const name = m[1]!;
    return rel.startsWith("skills/")
      ? `skills/${name}/SKILL.md`
      : `.cursor/skills/${name}/SKILL.md`;
  }

  m = /^plugins\/([^/]+)\/skills\/([^/]+)\/evals\/evals\.json$/.exec(rel);
  if (m) return `plugins/${m[1]}/skills/${m[2]}/SKILL.md`;

  m = /^\.cursor\/evals\/commands\/([^/.]+)\.json$/.exec(rel);
  if (m) return `.cursor/commands/${m[1]}.md`;

  m = /^plugins\/([^/]+)\/evals\/commands\/([^/.]+)\.json$/.exec(rel);
  if (m) return `plugins/${m[1]}/commands/${m[2]}.md`;

  m = /^\.cursor\/evals\/agents\/([^/.]+)\.json$/.exec(rel);
  if (m) return `.cursor/agents/${m[1]}.md`;

  m = /^plugins\/([^/]+)\/evals\/agents\/([^/.]+)\.json$/.exec(rel);
  if (m) return `plugins/${m[1]}/agents/${m[2]}.md`;

  m = /^\.cursor\/evals\/hooks\/hooks\.json$/.exec(rel);
  if (m) {
    if (existsSync(join(repo, ".cursor", "hooks", "hooks.json")))
      return ".cursor/hooks/hooks.json";
    if (existsSync(join(repo, ".cursor", "hooks.json")))
      return ".cursor/hooks.json";
    return ".cursor/hooks/hooks.json";
  }

  m = /^plugins\/([^/]+)\/evals\/hooks\/([^/.]+)\.json$/.exec(rel);
  if (m) return `plugins/${m[1]}/hooks/hooks.json`;

  return null;
}

function flattenCaseArrays(doc: Record<string, unknown>): unknown[] {
  const out: unknown[] = [];
  if (Array.isArray(doc.cases)) out.push(...doc.cases);
  if (Array.isArray(doc.evals)) out.push(...doc.evals);
  return out;
}

/** OK to delete or skip with structured reason (never blocks unrelated paths). */
type DeletionDecision =
  | { kind: "allow" }
  | { kind: "skip"; reason: string };

function classifyEvalForDeletion(relEvalPath: string, raw: string): DeletionDecision {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      kind: "skip",
      reason: "invalid JSON",
    };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { kind: "skip", reason: "not a JSON object" };
  }
  const doc = parsed as Record<string, unknown>;
  const rows = flattenCaseArrays(doc);
  if (rows.length === 0) return { kind: "allow" };
  for (const row of rows) {
    if (typeof row !== "object" || row === null) {
      return { kind: "skip", reason: "non-object case row" };
    }
    const meta = (row as { _meta?: { generated?: boolean } })._meta;
    if (meta?.generated !== true) {
      return {
        kind: "skip",
        reason: "contains user-authored cases",
      };
    }
  }
  return { kind: "allow" };
}

/** Remove contiguous trailing `evals/` dirs that become empty (do not touch skill/package roots). */
function pruneEmptyEvalParents(evalFileAbs: string, repoRoot: string): string[] {
  const emptied: string[] = [];
  let dir = dirname(evalFileAbs);
  while (basename(dir) === "evals") {
    if (!existsSync(dir)) break;
    const left = readdirSync(dir).filter(Boolean);
    if (left.length > 0) break;
    try {
      rmdirSync(dir);
      emptied.push(repoRelPosix(dir, repoRoot));
    } catch {
      break;
    }
    dir = dirname(dir);
  }
  return emptied;
}

function parseArgs(argv: string[]): boolean {
  const args = argv.filter((a) => a !== "--");
  return args.includes("--dry-run");
}

interface SkipRecord {
  path: string;
  reason: string;
}

function main(): number {
  const dry = parseArgs(process.argv.slice(2));
  const globs = loadIgnoreGlobs(REPO_ROOT);
  const removed: string[] = [];
  const skipped: SkipRecord[] = [];
  const emptied_dirs: string[] = [];

  if (globs.length === 0) {
    console.log(
      JSON.stringify({ removed: [], skipped: [], emptied_dirs: [], note: "config.ignore empty" }),
    );
    return 0;
  }

  for (const evalAbs of collectAllEvalPaths(REPO_ROOT)) {
    const relEval = repoRelPosix(evalAbs, REPO_ROOT);
    const srcRel = deriveSourceFromEvalPath(REPO_ROOT, evalAbs);

    if (!srcRel) {
      skipped.push({ path: relEval, reason: "cannot derive source path for eval file" });
      continue;
    }

    const hit = matchIgnoreGlob(srcRel, globs);
    if (!hit) {
      continue;
    }

    const decision = classifyEvalForDeletion(relEval, readFileSync(evalAbs, "utf-8"));
    if (decision.kind === "skip") {
      skipped.push({ path: relEval, reason: decision.reason });
      continue;
    }

    if (dry) {
      removed.push(relEval);
      continue;
    }

    try {
      unlinkSync(evalAbs);
      removed.push(relEval);
      for (const d of pruneEmptyEvalParents(evalAbs, REPO_ROOT)) {
        if (!emptied_dirs.includes(d)) emptied_dirs.push(d);
      }
    } catch (e) {
      skipped.push({
        path: relEval,
        reason: `delete failed: ${(e as Error).message}`,
      });
    }
  }

  console.log(
    dry
      ? JSON.stringify(
          {
            removed,
            skipped,
            emptied_dirs,
            dry_run: true,
          },
          null,
          2,
        )
      : JSON.stringify({ removed, skipped, emptied_dirs }),
  );
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
