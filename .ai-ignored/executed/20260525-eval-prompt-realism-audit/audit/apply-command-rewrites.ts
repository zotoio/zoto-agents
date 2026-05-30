#!/usr/bin/env tsx
/**
 * Apply audit/eval-rewrites.json to plugins/zoto-eval-system/evals/commands/*.json
 * Subtask 05 — preserves _meta.source_hash, refreshes _meta.last_updated only.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "../../..");
const AUDIT = join(REPO, "specs/20260525-eval-prompt-realism-audit/audit");
const COMMANDS_DIR = "plugins/zoto-eval-system/evals/commands";
const PREFIX = `${COMMANDS_DIR}/`;

type RewriteCase = {
  preserve: boolean;
  rewrite_prompt: string | null;
  rewrite_follow_ups: string[] | null;
  rewrite_assertions: string[] | null;
  rewrite_expected_output: string | null;
};

type RewriteEntry = {
  target_id: string;
  cases: Record<string, RewriteCase>;
};

type EvalCase = {
  id: number;
  prompt?: string;
  follow_ups?: string[];
  assertions?: string[];
  expected_output?: string;
  _meta?: {
    generated?: boolean;
    source_hash?: string;
    last_updated?: string;
    generated_by?: string;
    primitive_analysis?: unknown;
  };
};

type EvalFile = {
  target_id: string;
  cases: EvalCase[];
};

type FileReport = {
  path: string;
  target_id: string;
  rewritten: number;
  preserved_user: number;
  skipped_preserve_flag: number;
  user_byte_proof: "ok" | "FAIL";
  changed: boolean;
};

const rewrites = JSON.parse(
  readFileSync(join(AUDIT, "eval-rewrites.json"), "utf8"),
) as Record<string, RewriteEntry>;

const now = new Date().toISOString();
const reports: FileReport[] = [];

function isGenerated(c: EvalCase): boolean {
  return c._meta?.generated === true;
}

function caseContentKey(c: EvalCase): string {
  const { _meta, ...rest } = c;
  const metaSansUpdated = _meta
    ? { ..._meta, last_updated: undefined }
    : undefined;
  return JSON.stringify({ ...rest, _meta: metaSansUpdated });
}

function applyRewrite(
  evalCase: EvalCase,
  rewrite: RewriteCase,
  timestamp: string,
): boolean {
  const priorHash = evalCase._meta?.source_hash;
  const priorAnalysis = evalCase._meta?.primitive_analysis;
  const priorGeneratedBy = evalCase._meta?.generated_by ?? "zoto-update-evals";

  const before = caseContentKey(evalCase);

  if (rewrite.rewrite_prompt != null) {
    evalCase.prompt = rewrite.rewrite_prompt;
  }
  if (rewrite.rewrite_assertions != null) {
    evalCase.assertions = rewrite.rewrite_assertions;
  }
  if (rewrite.rewrite_expected_output != null) {
    evalCase.expected_output = rewrite.rewrite_expected_output;
  }
  if (rewrite.rewrite_follow_ups != null) {
    evalCase.follow_ups = rewrite.rewrite_follow_ups;
  }

  if (!evalCase._meta) evalCase._meta = {};
  evalCase._meta.generated = true;
  evalCase._meta.generated_by = priorGeneratedBy;
  if (priorHash != null) evalCase._meta.source_hash = priorHash;
  if (priorAnalysis !== undefined) {
    evalCase._meta.primitive_analysis = priorAnalysis;
  }

  evalCase._meta.last_updated = timestamp;

  const afterWithoutTimestamp = caseContentKey(evalCase);
  return before !== afterWithoutTimestamp;
}

for (const [relPath, entry] of Object.entries(rewrites)) {
  if (!relPath.startsWith(PREFIX)) continue;

  const absPath = join(REPO, relPath);
  const rawBefore = readFileSync(absPath, "utf8");
  const data = JSON.parse(rawBefore) as EvalFile;

  if (data.target_id !== entry.target_id) {
    throw new Error(
      `${relPath}: target_id mismatch file=${data.target_id} rewrite=${entry.target_id}`,
    );
  }

  const userSnapshots = new Map<number, string>();
  for (const c of data.cases) {
    if (!isGenerated(c)) {
      userSnapshots.set(c.id, JSON.stringify(c));
    }
  }

  let rewritten = 0;
  let preservedUser = 0;
  let skippedPreserve = 0;

  for (const c of data.cases) {
    const key = String(c.id);
    const rewrite = entry.cases[key];

    if (!isGenerated(c)) {
      preservedUser++;
      if (!rewrite || rewrite.preserve) continue;
      throw new Error(`${relPath} case ${key}: user-authored but rewrite wants change`);
    }

    if (!rewrite) {
      throw new Error(`${relPath} case ${key}: generated case missing from rewrites payload`);
    }

    if (rewrite.preserve) {
      skippedPreserve++;
      continue;
    }

    applyRewrite(c, rewrite, now);
    rewritten++;
  }

  for (const c of data.cases) {
    if (!isGenerated(c)) {
      const snap = userSnapshots.get(c.id);
      if (snap !== JSON.stringify(c)) {
        throw new Error(`${relPath} case ${c.id}: user-authored case mutated`);
      }
    }
  }

  const out = JSON.stringify(data, null, 2) + "\n";
  const changed = out !== rawBefore;
  if (changed) {
    writeFileSync(absPath, out, "utf8");
  }

  reports.push({
    path: relPath,
    target_id: data.target_id,
    rewritten,
    preserved_user: preservedUser,
    skipped_preserve_flag: skippedPreserve,
    user_byte_proof: preservedUser === 0 || userSnapshots.size === preservedUser ? "ok" : "FAIL",
    changed,
  });
}

if (reports.length !== 13) {
  throw new Error(`Expected 13 command files, got ${reports.length}`);
}

console.log(JSON.stringify({ timestamp: now, files: reports }, null, 2));
