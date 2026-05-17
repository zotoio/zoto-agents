import { minimatch } from "minimatch";

/**
 * Mirrors `scripts/eval-discover.ts` / `engine/update.ts` — match repo-relative
 * path or its parent directory against one ignore glob.
 */
export function pathMatchesDiscoveryIgnoreGlob(
  pathPosix: string,
  pattern: string,
): boolean {
  const opts = { dot: true as const };
  const pat = pattern.trim();
  if (!pat) return false;
  const n = pathPosix.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^\.\//, "");
  if (minimatch(n, pat, opts)) return true;
  const slash = n.lastIndexOf("/");
  if (slash <= 0) return false;
  const parentDir = n.slice(0, slash);
  return minimatch(parentDir, pat, opts);
}

/** Drop discovery targets matched by `.zoto/eval-system/config.yml` ignore globs. */
export function filterTargetsByDiscoveryIgnores<T extends { path: string }>(
  targets: T[],
  ignorePatterns: string[],
): T[] {
  if (!ignorePatterns.length) return targets;
  return targets.filter((t) => {
    const p = t.path.replace(/\\/g, "/");
    return !ignorePatterns.some((pat) => pathMatchesDiscoveryIgnoreGlob(p, pat));
  });
}

/**
 * Drops manifest-catalogued targets outside the canonical `discovery_targets` kinds
 * (as read from manifest snapshot tooling). Undefined / empty ⇒ no filtering.
 */
export function filterTargetsByDiscoveryKinds<T extends { kind: string }>(
  targets: T[],
  discoveryTargets?: string[],
): T[] {
  if (!discoveryTargets?.length) return targets;
  const allowed = new Set(discoveryTargets);
  return targets.filter((t) => allowed.has(t.kind));
}

/**
 * Paths like `evals/primitives/foo.eval.json` are often manifest catalogue rows left
 * by tooling without backing JSON on disk — they must not escalate removal drift.
 *
 * Conversely, when a real `{skill,...}/evals/evals.json` disappears because the
 * primitive was deleted, there is no file to scan; we still treat that as potential
 * orphaned generated coverage (unless the path matches this phantom pattern).
 */
export function toolingPhantomEvalCataloguePath(repoRel: string): boolean {
  const n = repoRel.replace(/\\/g, "/");
  if (/\.eval\.json$/i.test(n)) return true;
  /*
   * Tooling sometimes catalogues plugin-relative eval JSON paths that never
   * materialise on disk (or were transient scaffold paths). Treat them like
   * `.eval.json` phantoms so narrowed discovery / removals stay non-critical.
   */
  if (/^plugins\/[^/]+\/evals\/.+\.json$/i.test(n.replace(/^\/+/, "").replace(/^\.\//, ""))) {
    return true;
  }
  return false;
}
