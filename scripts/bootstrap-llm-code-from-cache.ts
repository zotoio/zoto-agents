#!/usr/bin/env tsx
/**
 * One-shot: (re)materialise `evals/llm/**` from cached analyser payloads for
 * every manifest target. Use when `eval:llm:code` fails because the layout
 * was never stamped — `eval:update --apply` only touches drifted targets, so
 * shared config + per-primitive tests are not rewritten when the manifest is
 * otherwise clean.
 *
 * Declarative footprint in `evals/_llm/runner.ts` conflicts with stamping
 * unless bypassGuard is used here (host config already selects `llm.strategy:
 * code`).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import type { AnalyserPayload } from "./eval-analyse.ts";
import { stampLlmCodeStrategy } from "./eval-stamp.ts";
import { readManifestSnapshot } from "../plugins/zoto-eval-system/engine/manifest-snapshot.ts";
import { loadEvalConfig } from "../plugins/zoto-eval-system/src/config-loader.js";

const REPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

interface ManifestTarget {
  id: string;
  path: string;
  content_hash: string;
}

function loadPayload(
  repoRoot: string,
  targetId: string,
): AnalyserPayload | null {
  const cacheDir = join(repoRoot, ".zoto/eval-system/cache/analyser");
  if (!existsSync(cacheDir)) return null;
  for (const f of readdirSync(cacheDir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const body = JSON.parse(
        readFileSync(join(cacheDir, f), "utf-8"),
      ) as AnalyserPayload;
      if (body.target_id === targetId) return body;
    } catch {
      /* skip malformed */
    }
  }
  return null;
}

function buildPrimitiveMeta(
  payload: AnalyserPayload,
  target: ManifestTarget,
): { slug: string; target_id: string; source_path: string; source_hash: string } {
  const namePart = payload.target_id.includes(":")
    ? (payload.target_id.split(":")[1] ?? payload.target_id)
    : payload.target_id;
  const slug = `${payload.kind}_${namePart
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()}`;
  return {
    slug,
    target_id: payload.target_id,
    source_path: payload.source_path || target.path,
    source_hash: payload.source_hash || target.content_hash,
  };
}

function main(): number {
  const manifestPath = join(REPO_ROOT, ".zoto/eval-system/manifest.yml");
  if (!existsSync(manifestPath)) {
    console.error("Run /z-eval-create first (no manifest).");
    return 1;
  }

  const manifest = YAML.parse(readFileSync(manifestPath, "utf-8")) as {
    targets: ManifestTarget[];
  };
  const snapshot = readManifestSnapshot(REPO_ROOT);
  let cfg: ReturnType<typeof loadEvalConfig>["config"];
  try {
    cfg = loadEvalConfig(REPO_ROOT).config;
  } catch {
    console.error("Invalid or missing .zoto/eval-system/config.yml");
    return 1;
  }
  const modelId = cfg.llm?.model?.id ?? "composer-2";
  const judgeModel = cfg.judgeModel ?? "opus-4.6";
  const codeFramework =
    (snapshot.llm.codeFramework as "vitest" | "jest") ?? "vitest";

  let ok = 0;
  let miss = 0;
  for (const t of manifest.targets ?? []) {
    const payload = loadPayload(REPO_ROOT, t.id);
    if (!payload) {
      console.error(`no_cached_payload\t${t.id}`);
      miss++;
      continue;
    }
    const primitive = buildPrimitiveMeta(payload, t);
    const r = stampLlmCodeStrategy(REPO_ROOT, payload, primitive, {
      codeFramework,
      modelId,
      judgeModel,
      bypassGuard: true,
    });
    ok++;
    const rel = relative(REPO_ROOT, r.testFile);
    console.log(`stamped\t${t.id}\t${rel}`);
  }

  console.log(
    JSON.stringify({ stamped_targets: ok, skipped_no_cache: miss }, null, 2),
  );
  if (ok === 0) {
    console.error("No targets stamped — populate analyser cache or run eval:update with the analyser.");
    return 1;
  }
  if (miss > 0) {
    console.error(
      `Note: ${miss} target(s) had no cached analyser payload; run eval:analyse / eval:update with analyser for those IDs, then re-run this script.`,
    );
  }
  return 0;
}

process.exit(main());
