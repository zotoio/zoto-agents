#!/usr/bin/env tsx
/**
 * Subtask 12 — force re-stamp evals/llm/test_*.test.ts from cached analyser payloads.
 * eval:update --apply only regenerates drifted targets; after cache curation we restamp all.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { loadEvalConfig } from "../../../plugins/zoto-eval-system/src/config-loader.js";
import { readManifestSnapshot } from "../../../plugins/zoto-eval-system/engine/manifest-snapshot.js";
import { regenerateLlmCode } from "../../../plugins/zoto-eval-system/engine/update.ts";
import type { AnalyserPayload } from "../../../scripts/eval-analyse.ts";

const REPO = resolve(import.meta.dirname, "../../..");
const AUDIT = join(REPO, "specs/20260525-eval-prompt-realism-audit/audit");
const CACHE_DIR = join(REPO, ".zoto/eval-system/cache/analyser");

const CENTRAL_PREFIXES = [
  ".cursor/evals/",
  "plugins/zoto-eval-system/evals/",
  "plugins/zoto-spec-system/evals/",
  "plugins/zoto-cursor-top/evals/",
] as const;

type RewriteEntry = {
  target_id: string;
  cases: Record<string, { preserve: boolean }>;
};

type EvalCase = {
  _meta?: {
    source_hash?: string;
    primitive_analysis?: { source_hash?: string };
  };
};

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function resolveEvalPath(rel: string): string | null {
  for (const candidate of [
    rel,
    rel.replace(".cursor/evals/", "plugins/zoto-eval-system/evals/"),
  ]) {
    const abs = join(REPO, candidate);
    if (existsSync(abs)) return abs;
  }
  return null;
}

function sourceHashFromEval(absPath: string): string | null {
  const data = loadJson<{ evals?: EvalCase[]; cases?: EvalCase[] }>(absPath);
  const rows = data.evals ?? data.cases ?? [];
  for (const row of rows) {
    const digest =
      row._meta?.source_hash ??
      row._meta?.primitive_analysis?.source_hash ??
      null;
    if (typeof digest === "string" && /^[0-9a-f]{64}$/.test(digest)) {
      return digest;
    }
  }
  return null;
}

const rewrites = loadJson<Record<string, RewriteEntry>>(
  join(AUDIT, "eval-rewrites.json"),
);
const config = loadEvalConfig(REPO);
const snapshot = readManifestSnapshot(REPO);

const reports: Array<{
  target_id: string;
  cache_path: string;
  files_written: string[];
}> = [];
const skipped: Array<{ target_id: string; reason: string }> = [];

for (const [relPath, entry] of Object.entries(rewrites)) {
  if (!CENTRAL_PREFIXES.some((p) => relPath.startsWith(p))) continue;

  const evalAbs = resolveEvalPath(relPath);
  if (!evalAbs) {
    skipped.push({ target_id: entry.target_id, reason: "eval-missing" });
    continue;
  }

  const sourceHash = sourceHashFromEval(evalAbs);
  if (!sourceHash) {
    skipped.push({ target_id: entry.target_id, reason: "no-source-hash" });
    continue;
  }

  const cachePath = join(CACHE_DIR, `${sourceHash}.json`);
  if (!existsSync(cachePath)) {
    skipped.push({ target_id: entry.target_id, reason: "cache-missing" });
    continue;
  }

  const payload = loadJson<AnalyserPayload>(cachePath);
  const target = {
    id: entry.target_id,
    kind: payload.kind,
    path: payload.source_path,
    content_hash: payload.source_hash,
    eval_files: [relPath.replace(/^\.\//, "")],
  };

  const report = regenerateLlmCode({
    hostRepoRoot: REPO,
    payload,
    target,
    config,
    snapshot,
    dryRun: false,
    overwrite: true,
    noAnalyser: true,
  });

  reports.push({
    target_id: entry.target_id,
    cache_path: cachePath.replace(`${REPO}/`, ""),
    files_written: report.files_written,
  });
}

console.log(
  JSON.stringify(
    {
      restamped: reports.filter((r) => r.files_written.length > 0).length,
      skipped,
      reports,
    },
    null,
    2,
  ),
);
