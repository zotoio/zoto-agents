/**
 * Manifest snapshot reader.
 *
 * Single source of truth for "what static framework is currently stamped in
 * this repo" plus the flat list of every `eval_files[]` path the manifest
 * knows about. Read by:
 *
 *   - `/z-eval-configure` + `zoto-configure-evals`: build the `cleanup_plan`
 *     payload (see `templates/schema/cleanup-plan.schema.json`).
 *   - `scripts/eval-cleanup-stale.ts`: re-read the same snapshot so the
 *     dry-run plan and the executed plan agree byte-for-byte.
 *
 * The canonical source is `.zoto/eval-system/manifest.yml ->
 * discovery_config.{static, discoveryTargets}`. When the manifest is missing
 * or pre-dates the manifest-snapshot block, this module falls back to
 * filesystem fingerprints:
 *
 *   - `evals/conftest.py`            => `static.framework = "pytest"`
 *   - `vitest.config.ts` / `.js`     => `static.framework = "vitest"`
 *   - `jest.config.ts` / `.js`       => `static.framework = "jest"`
 *
 * NOTE: prior versions of this module also surfaced `llm.strategy` /
 * `llm.codeFramework` from the manifest. The single-backend co-located
 * restructure dropped those knobs — there is no LLM strategy split any
 * more. After the JSON-first migration, non-skill primitives stamp
 * co-located `<kind>/evals/<name>.json` files (validated by
 * `templates/schema/manifest.schema.json` — every non-skill
 * `eval_files[]` entry MUST end in `.json`; skills retain
 * `evals/evals.json`). Scenario `.test.ts` files under
 * `evals/scenarios/` are intentionally absent from the manifest.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import YAML from "yaml";

import { loadEvalPaths } from "../src/config-loader.js";
import { toolingPhantomEvalCataloguePath } from "./discovery-filters.js";

export type StaticFramework = "pytest" | "vitest" | "jest";

export type SnapshotSource = "manifest" | "filesystem" | "missing";

export interface ManifestSnapshot {
  static: { framework?: StaticFramework };
  /**
   * kinds from manifest `discovery_config.discoveryTargets` when recorded —
   * the catalogue snapshot (may be broader than the operator's active YAML).
   */
  discoveryTargets?: string[];
  /**
   * Effective kinds for drift / cleanup planning: raw `config.yml`
   * `discoveryTargets` when that key is present (narrowing wins), otherwise
   * the manifest-recorded `discoveryTargets`. Aligns with `eval-update`.
   */
  effectiveDiscoveryTargets?: string[];
  /**
   * Flat list of every `eval_files[]` path referenced by manifest targets,
   * minus tooling-only catalogue noise (`*.eval.json`, stale plugin `evals/*.json`
   * rows). Used by cleanup / configure to enumerate real stamped assets.
   * Contract: non-skill paths end in `.json`; skill paths end in
   * `evals/evals.json` — see `templates/schema/manifest.schema.json`.
   */
  evalFiles: string[];
  /**
   * Where the snapshot values came from. `manifest` is canonical;
   * `filesystem` is the legacy fallback; `missing` means no prior snapshot
   * exists at all (cleanup_plan should be empty in that case).
   */
  source: SnapshotSource;
}

interface ManifestShape {
  discovery_config?: {
    static?: { framework?: StaticFramework };
    discoveryTargets?: unknown;
  };
  targets?: Array<{ eval_files?: string[] }>;
}

function normalizedDiscoveryTargets(
  dc: ManifestShape["discovery_config"] | undefined,
): string[] | undefined {
  const raw = dc?.discoveryTargets;
  if (!Array.isArray(raw)) return undefined;
  const strings = raw.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
  return strings.length > 0 ? strings : undefined;
}

function manifestPath(repoRoot: string): string {
  try {
    return loadEvalPaths(repoRoot).paths.manifestPathAbs;
  } catch {
    return join(repoRoot, ".zoto", "eval-system", "manifest.yml");
  }
}

const CONFIG_PATH_SEGMENTS = [".zoto", "eval-system", "config.yml"] as const;

/**
 * Raw read of `discoveryTargets` from `.zoto/eval-system/config.yml` only when
 * the key is present — mirrors `engine/update.ts` so narrowing in YAML wins
 * over a stale `manifest.discovery_config` list.
 */
export function loadRawConfigDiscoveryTargets(repoRoot: string): string[] | undefined {
  const path = join(repoRoot, ...CONFIG_PATH_SEGMENTS);
  if (!existsSync(path)) return undefined;
  try {
    const raw = YAML.parse(readFileSync(path, "utf-8")) as Record<string, unknown> | null;
    if (
      !raw ||
      typeof raw !== "object" ||
      !Object.prototype.hasOwnProperty.call(raw, "discoveryTargets")
    ) {
      return undefined;
    }
    const dt = raw.discoveryTargets;
    if (!Array.isArray(dt)) return undefined;
    const strings = dt.filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0,
    );
    return strings.length > 0 ? strings : undefined;
  } catch {
    return undefined;
  }
}

function filterToolingPhantomEvalPaths(paths: string[]): string[] {
  return paths.filter((f) => !toolingPhantomEvalCataloguePath(f));
}

function detectStaticFromFilesystem(
  repoRoot: string,
): { framework: StaticFramework } | null {
  if (existsSync(join(repoRoot, "evals", "conftest.py"))) {
    return { framework: "pytest" };
  }
  for (const ext of [".ts", ".mts", ".js", ".cjs", ".mjs"]) {
    if (existsSync(join(repoRoot, `vitest.config${ext}`))) {
      return { framework: "vitest" };
    }
  }
  for (const ext of [".ts", ".js", ".cjs", ".mjs"]) {
    if (existsSync(join(repoRoot, `jest.config${ext}`))) {
      return { framework: "jest" };
    }
  }
  return null;
}

/**
 * Read the canonical manifest snapshot for `repoRoot` (defaults to
 * `process.cwd()`). Returns a fully-formed `ManifestSnapshot` even when
 * fields are missing — callers should branch on `source` rather than on
 * presence of nested keys.
 */
export function readManifestSnapshot(
  repoRoot: string = process.cwd(),
): ManifestSnapshot {
  const rawDiscoveryOverride = loadRawConfigDiscoveryTargets(repoRoot);

  const path = manifestPath(repoRoot);
  if (existsSync(path)) {
    let parsed: ManifestShape | null = null;
    try {
      parsed = YAML.parse(readFileSync(path, "utf-8")) as ManifestShape;
    } catch {
      parsed = null;
    }

    if (parsed) {
      const dc = parsed.discovery_config ?? {};
      const evalFilesRaw: string[] = [];
      for (const t of parsed.targets ?? []) {
        for (const f of t.eval_files ?? []) {
          if (typeof f === "string" && f.length > 0) evalFilesRaw.push(f);
        }
      }
      const evalFiles = filterToolingPhantomEvalPaths(evalFilesRaw);
      const hasStatic = Boolean(dc.static?.framework);

      const discoveryTargets = normalizedDiscoveryTargets(dc);
      const effectiveDiscoveryTargets = rawDiscoveryOverride ?? discoveryTargets;

      if (hasStatic) {
        return {
          static: { framework: dc.static?.framework },
          discoveryTargets,
          effectiveDiscoveryTargets,
          evalFiles,
          source: "manifest",
        };
      }

      // Manifest exists but has no snapshot block — fall through to
      // filesystem fingerprinting and keep the eval-file list intact.
      const fsHit = detectStaticFromFilesystem(repoRoot);
      return {
        static: { framework: fsHit?.framework },
        discoveryTargets,
        effectiveDiscoveryTargets,
        evalFiles,
        source: fsHit ? "filesystem" : "missing",
      };
    }
  }

  // No manifest at all — pure filesystem fallback.
  const fsHit = detectStaticFromFilesystem(repoRoot);
  return {
    static: { framework: fsHit?.framework },
    effectiveDiscoveryTargets: rawDiscoveryOverride,
    evalFiles: [],
    source: fsHit ? "filesystem" : "missing",
  };
}
