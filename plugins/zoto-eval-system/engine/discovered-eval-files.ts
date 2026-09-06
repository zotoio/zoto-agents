/**
 * Resolve catalogue `eval_files[]` for a discovered primitive.
 *
 * After the JSON-first migration, the canonical location is co-located
 * (`<kind-dir>/evals/<name>.json` or `<skill>/evals/evals.json`). Discovery
 * used to look only at the legacy `plugins/<p>/evals/<kind>s/` tree, so the
 * manifest kept cataloguing generated `evals/test_*.test.ts` rows (or empty
 * coverage) even when the JSON suite already existed on disk.
 *
 * Preference: co-located JSON ≻ legacy declarative JSON. Never invent a
 * path that is not a real file — empty means "no eval coverage yet".
 */
import { existsSync, statSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

function isFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

function toRepoRel(repoRoot: string, abs: string): string {
  return relative(repoRoot, abs).split("\\").join("/");
}

function firstExisting(repoRoot: string, candidates: string[]): string[] {
  for (const abs of candidates) {
    if (isFile(abs)) return [toRepoRel(repoRoot, abs)];
  }
  return [];
}

function posix(path: string): string {
  return path.replace(/\\/g, "/");
}

/**
 * Return zero or one repo-relative eval JSON path for `sourcePathAbs`.
 *
 * @param kind - `skill` | `command` | `agent` | `hook`
 * @param sourcePathAbs - absolute path to SKILL.md / command.md / hooks.json
 */
export function resolveDiscoveredEvalFiles(
  repoRoot: string,
  kind: string,
  sourcePathAbs: string,
): string[] {
  if (kind === "skill") {
    return firstExisting(repoRoot, [
      join(dirname(sourcePathAbs), "evals", "evals.json"),
    ]);
  }

  if (kind === "hook") {
    const dir = dirname(sourcePathAbs);
    const base = dir.split(/[/\\]/).pop() ?? "";
    const hooksDir = base === "hooks" ? dir : join(dir, "hooks");
    const ownerDir = dirname(hooksDir);
    const ownerName = ownerDir.split(/[/\\]/).pop() ?? "";
    const ownerPosix = posix(ownerDir);
    const underCursor =
      ownerPosix.endsWith("/.cursor") || ownerPosix.endsWith(".cursor");
    return firstExisting(repoRoot, [
      join(hooksDir, "evals", "hooks.json"),
      underCursor
        ? join(ownerDir, "evals", "hooks", "hooks.json")
        : join(ownerDir, "evals", "hooks", `${ownerName}.json`),
    ]);
  }

  const name = basename(sourcePathAbs).replace(/\.md$/i, "");
  const kindDir = dirname(sourcePathAbs);
  const ownerDir = dirname(kindDir);
  const evalLeaf = kind === "agent" ? "agents" : "commands";
  return firstExisting(repoRoot, [
    join(kindDir, "evals", `${name}.json`),
    join(ownerDir, "evals", evalLeaf, `${name}.json`),
  ]);
}
