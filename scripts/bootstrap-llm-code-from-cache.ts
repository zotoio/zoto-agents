#!/usr/bin/env tsx
/**
 * One-shot: (re)materialise the co-located LLM eval test files from
 * cached analyser payloads for every manifest target. Use when stamping
 * was skipped — `eval:update --apply` only touches drifted targets, so
 * shared harness files and per-primitive tests are not rewritten when
 * the manifest is otherwise clean.
 *
 * Skills are skipped (their `evals.json` is retained); rules are not
 * eval-stamped.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import type { AnalyserPayload } from "./eval-analyse.ts";
import { stampTarget } from "./eval-stamp.ts";

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

async function main(): Promise<number> {
  const manifestPath = join(REPO_ROOT, ".zoto/eval-system/manifest.yml");
  if (!existsSync(manifestPath)) {
    console.error("Run /z-eval-create first (no manifest).");
    return 1;
  }

  const manifest = YAML.parse(readFileSync(manifestPath, "utf-8")) as {
    targets: ManifestTarget[];
  };

  let ok = 0;
  let miss = 0;
  let skipped = 0;
  for (const t of manifest.targets ?? []) {
    const payload = loadPayload(REPO_ROOT, t.id);
    if (!payload) {
      console.error(`no_cached_payload\t${t.id}`);
      miss++;
      continue;
    }
    const result = await stampTarget(REPO_ROOT, t.id, payload);
    if (result.skipped) {
      skipped++;
      console.log(`skipped(${result.skipped})\t${t.id}\t${result.path}`);
      continue;
    }
    ok++;
    console.log(`stamped\t${t.id}\t${result.path}`);
  }

  console.log(
    JSON.stringify(
      { stamped_targets: ok, skipped_targets: skipped, skipped_no_cache: miss },
      null,
      2,
    ),
  );
  if (ok === 0) {
    console.error(
      "No targets stamped — populate analyser cache or run eval:update with the analyser.",
    );
    return 1;
  }
  if (miss > 0) {
    console.error(
      `Note: ${miss} target(s) had no cached analyser payload; run eval:analyse / eval:update with analyser for those IDs, then re-run this script.`,
    );
  }
  return 0;
}

process.exit(await main());
