// _meta.generated: true
/**
 * Sandbox helpers for `code`-strategy LLM evals.
 *
 * Stamped into `evals/llm/_shared/sandbox-helpers.ts` by
 * `scripts/eval-stamp.ts#stampLlmCodeStrategy`.
 *
 * This module is a thin wrapper around `evals/_llm/sandbox.ts`. The
 * heavy lifting (baseline copy, overlay application, stable
 * sha256-based snapshots, snapshot diffs) stays in the live module so
 * every LLM backend shares the same contract. The `preSnapshot` /
 * `postSnapshot` names are the ones called from the stamped
 * `*.test.ts` files — keep them stable so any future template refactor
 * only touches this one file.
 */
import {
  createSandbox,
  diffSnapshots,
  prepareSandbox,
  snapshotDir,
  type CaseFixtures,
  type RepoSnapshot,
  type SandboxHandle,
  type SnapshotDiff,
} from "../../_llm/sandbox.js";

export interface BuildSandboxOptions {
  runId: string;
  caseId: string;
  repoRoot: string;
  fixtures?: CaseFixtures;
}

export function buildSandbox(opts: BuildSandboxOptions): SandboxHandle {
  const handle = createSandbox(opts.runId, opts.caseId);
  prepareSandbox(handle.rootDir, {
    repoRoot: opts.repoRoot,
    fixtures: opts.fixtures,
  });
  return handle;
}

export function preSnapshot(rootDir: string): RepoSnapshot {
  return snapshotDir(rootDir);
}

export function postSnapshot(rootDir: string): RepoSnapshot {
  return snapshotDir(rootDir);
}

export function diffSandbox(before: RepoSnapshot, after: RepoSnapshot): SnapshotDiff {
  return diffSnapshots(before, after);
}

export type { CaseFixtures, RepoSnapshot, SandboxHandle, SnapshotDiff };
