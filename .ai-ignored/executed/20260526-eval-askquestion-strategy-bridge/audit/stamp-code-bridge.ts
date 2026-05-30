#!/usr/bin/env tsx
/**
 * Subtask 09 — stamp keep-code-bridge-only targets via stampLlmCodeStrategy
 * (bypasses loadEvalConfig validation in stampTargetWithBackendRouting code path).
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import type { AnalyserPayload } from "../../../scripts/eval-analyse.ts";
import {
  buildPrimitiveMetaFromPayload,
  stampLlmCodeStrategy,
} from "../../../scripts/eval-stamp.ts";

const REPO = resolve(import.meta.dirname, "../../..");
const AUDIT = join(REPO, "specs/20260526-eval-askquestion-strategy-bridge/audit");
const CACHE_DIR = join(REPO, ".zoto/eval-system/cache/analyser");

type Baseline = {
  targets: Record<
    string,
    {
      kind: string;
      source_path: string;
      migration_class: string;
    }
  >;
};

function loadCachedByTargetId(targetId: string): AnalyserPayload | null {
  if (!existsSync(CACHE_DIR)) return null;
  for (const f of readdirSync(CACHE_DIR)) {
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

function main(): number {
  const baseline = JSON.parse(
    readFileSync(join(AUDIT, "eval-corpus-baseline.json"), "utf-8"),
  ) as Baseline;

  const reports: unknown[] = [];
  const skipped: string[] = [];

  for (const [targetId, meta] of Object.entries(baseline.targets).sort()) {
    if (meta.migration_class !== "keep-code-bridge-only") continue;
    if (meta.kind === "hook") continue;

    const payload = loadCachedByTargetId(targetId);
    if (!payload?.cases?.length) {
      skipped.push(`${targetId}:no-cache`);
      continue;
    }

    const effective: AnalyserPayload = {
      ...payload,
      requiresInteraction: true,
    };

    try {
      const primitive = buildPrimitiveMetaFromPayload(
        effective,
        meta.source_path,
      );
      const result = stampLlmCodeStrategy(REPO, effective, primitive, {
        codeFramework: "vitest",
        modelId: "composer-2",
        judgeModel: "opus-4.6",
        dryRun: false,
        bypassGuard: true,
      });
      reports.push({
        target_id: targetId,
        written: result.written,
        test_file: result.testFile,
      });
    } catch (e) {
      reports.push({
        target_id: targetId,
        error: (e as Error).message,
      });
    }
  }

  const out = { reports, skipped };
  writeFileSync(
    join(AUDIT, "stamp-code-bridge-result.json"),
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(out, null, 2));
  return 0;
}

process.exit(main());
