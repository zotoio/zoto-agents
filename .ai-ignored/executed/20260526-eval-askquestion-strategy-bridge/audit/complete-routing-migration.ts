#!/usr/bin/env tsx
/**
 * Subtask 09 — complete per-target backend routing from cached analyser payloads.
 * Uses baseline migration_class to set requiresInteraction when cache lacks it.
 * Does NOT refresh manifest.yml (restored by caller).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { readManifestSnapshot } from "../../../plugins/zoto-eval-system/engine/manifest-snapshot.js";
import { regenerateLlmCode } from "../../../plugins/zoto-eval-system/engine/update.ts";
import type { AnalyserPayload } from "../../../scripts/eval-analyse.ts";

const REPO = resolve(import.meta.dirname, "../../..");
const AUDIT = join(REPO, "specs/20260526-eval-askquestion-strategy-bridge/audit");
const CACHE_DIR = join(REPO, ".zoto/eval-system/cache/analyser");

type BaselineTarget = {
  kind: string;
  source_path: string;
  llm_test_path: string | null;
  migration_class: string;
  eval_files?: string[];
};

type Baseline = {
  targets: Record<string, BaselineTarget>;
};

function loadCachedByTargetId(targetId: string): AnalyserPayload | null {
  if (!existsSync(CACHE_DIR)) return null;
  for (const f of readdirSafe(CACHE_DIR)) {
    if (!f.endsWith(".json")) continue;
    try {
      const body = JSON.parse(
        readFileSync(join(CACHE_DIR, f), "utf-8"),
      ) as AnalyserPayload;
      if (body.target_id === targetId) return body;
    } catch {
      /* skip */
    }
  }
  return null;
}

function readdirSafe(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function requiresInteractionFromBaseline(
  targetId: string,
  baseline: BaselineTarget,
): boolean | undefined {
  if (baseline.kind === "hook") return false;
  if (baseline.migration_class === "keep-code-bridge-only") return true;
  if (baseline.migration_class === "migrate-to-declarative") return false;
  return undefined;
}

async function main(): Promise<number> {
  const baseline = JSON.parse(
    readFileSync(join(AUDIT, "eval-corpus-baseline.json"), "utf-8"),
  ) as Baseline;
  const config: Record<string, unknown> = {
    static: { framework: "vitest" },
    llm: {
      strategy: "code",
      codeFramework: "vitest",
      model: { id: "composer-2" },
    },
    judgeModel: "opus-4.6",
  };
  const snapshot = readManifestSnapshot(REPO);

  const reports: unknown[] = [];
  const skipped: Array<{ target_id: string; reason: string }> = [];

  const ordered = Object.entries(baseline.targets).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [targetId, meta] of ordered) {
    if (meta.migration_class === "no-eval-yet") {
      skipped.push({ target_id: targetId, reason: "no-eval-yet" });
      continue;
    }

    const payload = loadCachedByTargetId(targetId);
    if (!payload?.cases?.length) {
      skipped.push({ target_id: targetId, reason: "no_cached_analyser_payload" });
      continue;
    }

    const ri = requiresInteractionFromBaseline(targetId, meta);
    const effective: AnalyserPayload = {
      ...payload,
      requiresInteraction:
        payload.requiresInteraction !== undefined
          ? payload.requiresInteraction
          : ri,
    };

    const target = {
      id: targetId,
      kind: meta.kind,
      path: meta.source_path,
      content_hash: payload.source_hash,
      eval_files: meta.eval_files ?? [],
    };

    try {
      const report = await regenerateLlmCode({
        hostRepoRoot: REPO,
        payload: effective,
        target,
        config,
        snapshot,
        dryRun: false,
        overwrite: true,
        noAnalyser: true,
      });
      reports.push({
        target_id: targetId,
        migration_class: meta.migration_class,
        llm_strategy: report.llm_strategy,
        files_written: report.files_written,
        notes: report.notes,
        cases_replaced: report.cases_replaced,
      });
    } catch (e) {
      reports.push({
        target_id: targetId,
        migration_class: meta.migration_class,
        error: (e as Error).message,
      });
    }
  }

  const out = { reports, skipped };
  writeFileSync(
    join(AUDIT, "complete-routing-migration-result.json"),
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(out, null, 2));
  return 0;
}

main().then(
  (c) => process.exit(c),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
