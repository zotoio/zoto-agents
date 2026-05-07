/**
 * Manifest snapshot reader (subtask 02 — configurer rewrite).
 *
 * Single source of truth for "what framework / LLM strategy is currently
 * stamped in this repo". Read by:
 *
 *   - `/z-eval-configure` + `zoto-configure-evals` (subtask 02): build the
 *     `cleanup_plan` payload (see `templates/schema/cleanup-plan.schema.json`).
 *   - `scripts/eval-cleanup-stale.ts` (subtask 03): re-read the same snapshot
 *     so the dry-run plan and the executed plan agree byte-for-byte.
 *
 * The canonical source is `.zoto/eval-system/manifest.yml ->
 * discovery_config.{static,llm}` (added in subtask 01). When the manifest is
 * missing or pre-dates subtask 01, this module falls back to filesystem
 * fingerprints:
 *
 *   - `evals/conftest.py`            => `static.framework = "pytest"`
 *   - `vitest.config.ts` / `.js`     => `static.framework = "vitest"`
 *   - `jest.config.ts` / `.js`       => `static.framework = "jest"`
 *
 * The LLM strategy / codeFramework cannot be reliably inferred from the
 * filesystem alone, so the fallback only fills in `static.framework` and
 * leaves `llm.*` undefined. The caller (configurer) must treat the missing
 * fields as "no prior snapshot" and emit an empty `cleanup_plan` group for
 * them.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import YAML from "yaml";

export type StaticFramework = "pytest" | "vitest" | "jest";
export type LlmStrategy = "code" | "declarative";
export type CodeFramework = "vitest" | "jest";

export type SnapshotSource = "manifest" | "filesystem" | "missing";

export interface ManifestSnapshot {
  static: { framework?: StaticFramework };
  llm: { strategy?: LlmStrategy; codeFramework?: CodeFramework };
  /**
   * Flat list of every `eval_files[]` path referenced by manifest targets.
   * Used by the cleanup engine (subtask 03) to enumerate stamped files
   * candidate for deletion when the framework/strategy switches.
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
    llm?: { strategy?: LlmStrategy; codeFramework?: CodeFramework };
  };
  targets?: Array<{ eval_files?: string[] }>;
}

function manifestPath(repoRoot: string): string {
  return join(repoRoot, ".zoto", "eval-system", "manifest.yml");
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
      const evalFiles: string[] = [];
      for (const t of parsed.targets ?? []) {
        for (const f of t.eval_files ?? []) {
          if (typeof f === "string" && f.length > 0) evalFiles.push(f);
        }
      }
      const hasStatic = Boolean(dc.static?.framework);
      const hasLlm = Boolean(dc.llm?.strategy) || Boolean(dc.llm?.codeFramework);

      if (hasStatic || hasLlm) {
        return {
          static: { framework: dc.static?.framework },
          llm: {
            strategy: dc.llm?.strategy,
            codeFramework: dc.llm?.codeFramework,
          },
          evalFiles,
          source: "manifest",
        };
      }

      // Manifest exists but has no v2 snapshot block — fall through to
      // filesystem fingerprinting and keep the eval-file list intact.
      const fsHit = detectStaticFromFilesystem(repoRoot);
      return {
        static: { framework: fsHit?.framework },
        llm: {},
        evalFiles,
        source: fsHit ? "filesystem" : "missing",
      };
    }
  }

  // No manifest at all — pure filesystem fallback.
  const fsHit = detectStaticFromFilesystem(repoRoot);
  return {
    static: { framework: fsHit?.framework },
    llm: {},
    evalFiles: [],
    source: fsHit ? "filesystem" : "missing",
  };
}
