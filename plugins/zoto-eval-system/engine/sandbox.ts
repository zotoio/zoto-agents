/**
 * Per-case sandbox helpers for the LLM eval backend.
 *
 * Lifecycle:
 *   1. `createSandbox(runId, caseId)`  — allocates `<tmp>/zoto-eval/<runId>/<slug>/`.
 *   2. `prepareSandbox(rootDir, opts?)` — copies the host repo's
 *      `evals/fixtures/baseline/` tree (stamped from
 *      `plugins/zoto-eval-system/templates/baseline-fixtures/` via
 *      `pnpm run eval:baseline-stamp`) into the sandbox root, then applies
 *      per-case `fixtures.files[]` overlays on top (overlays may overwrite
 *      baseline files). Throws a clear error if the baseline is missing.
 *   3. `materializeFixtures(handle, fixtures, repoRoot)` is the runner-facing
 *      thin wrapper around `prepareSandbox` that preserves the existing call
 *      shape used by `evals/_llm/runner.ts`.
 *
 * Snapshot helpers (`snapshotDir`, `snapshotRepo`, `diffSnapshots`,
 * `verifyExpectedFilesystemAgainstDiff`) are stable hashes of the on-disk
 * tree used by the runner to enforce the no-repo-mutation contract and to
 * verify per-case `expected_filesystem` claims.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";

import type { CaseExpectedFilesystem, CaseFixtures } from "./case.js";

import { resolveHostRepoRoot } from "../src/config-loader.js";

const DEFAULT_REPO_ROOT = resolveHostRepoRoot();
const BASELINE_REL_POSIX = "evals/fixtures/baseline";

/* ----------------------------------------------------------------------- */
/* Types                                                                   */
/* ----------------------------------------------------------------------- */

export interface SandboxHandle {
  runId: string;
  caseId: number | string;
  rootDir: string;
}

export interface RepoSnapshot {
  root: string;
  /** key: POSIX path relative to `root`; value: sha256 hex of file contents. */
  entries: Map<string, string>;
}

export interface SnapshotDiff {
  added: string[];
  modified: string[];
  removed: string[];
}

export interface FilesystemVerdict {
  passed: number;
  failed: number;
  detail: string[];
}

/* ----------------------------------------------------------------------- */
/* Slugging                                                                */
/* ----------------------------------------------------------------------- */

export function slugifyCaseId(id: number | string): string {
  const raw = String(id).toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "case";
}

/** Alias kept for runner.ts which imports `caseSlug`. */
export const caseSlug = slugifyCaseId;

/* ----------------------------------------------------------------------- */
/* Sandbox creation                                                        */
/* ----------------------------------------------------------------------- */

export function createSandbox(runId: string, caseId: number | string): SandboxHandle {
  const rootDir = join(tmpdir(), "zoto-eval", runId, slugifyCaseId(caseId));
  if (existsSync(rootDir)) {
    rmSync(rootDir, { recursive: true, force: true });
  }
  mkdirSync(rootDir, { recursive: true, mode: 0o755 });
  return { runId, caseId, rootDir };
}

/* ----------------------------------------------------------------------- */
/* Baseline copy                                                           */
/* ----------------------------------------------------------------------- */

export interface PrepareSandboxOptions {
  /** Host repo root that holds `evals/fixtures/baseline/`. Defaults to cwd. */
  repoRoot?: string;
  /** Per-case overlays applied on top of the baseline. */
  fixtures?: CaseFixtures;
  /**
   * Source root for the baseline tree. Defaults to
   * `<repoRoot>/evals/fixtures/baseline`. Exposed for tests so they can copy
   * directly from the template tree without first running
   * `pnpm run eval:baseline-stamp`.
   */
  baselineDir?: string;
  /**
   * If true and the baseline directory is missing, fall back silently to a
   * no-op baseline copy. The default (false) throws a clear error pointing
   * the user at `pnpm run eval:baseline-stamp`.
   */
  allowMissingBaseline?: boolean;
}

export function resolveBaselineDir(repoRoot: string = DEFAULT_REPO_ROOT): string {
  return join(repoRoot, BASELINE_REL_POSIX);
}

/**
 * Copy `evals/fixtures/baseline/` into `caseTmpDir`, then layer
 * `fixtures.files[]` overlays on top. Overlay entries with `from` are read
 * from `<repoRoot>/<from>`; entries with only `content` write that string
 * verbatim; entries with neither write an empty file.
 */
export function prepareSandbox(
  caseTmpDir: string,
  opts: PrepareSandboxOptions = {},
): { baselineFiles: number; overlayFiles: number; baselineDir: string } {
  const repoRoot = opts.repoRoot ?? DEFAULT_REPO_ROOT;
  const baselineDir = opts.baselineDir ?? resolveBaselineDir(repoRoot);

  if (!existsSync(caseTmpDir)) {
    mkdirSync(caseTmpDir, { recursive: true, mode: 0o755 });
  }

  let baselineFiles = 0;
  if (existsSync(baselineDir)) {
    cpSync(baselineDir, caseTmpDir, {
      recursive: true,
      dereference: false,
      preserveTimestamps: false,
      errorOnExist: false,
      force: true,
    });
    baselineFiles = countFiles(caseTmpDir);
  } else if (!opts.allowMissingBaseline) {
    throw new Error(
      `baseline fixtures missing at ${baselineDir} - run \`pnpm run eval:baseline-stamp\` to stamp them from plugins/zoto-eval-system/templates/baseline-fixtures/`,
    );
  }

  let overlayFiles = 0;
  if (opts.fixtures?.files?.length) {
    overlayFiles = applyFixtureOverlays(caseTmpDir, opts.fixtures, repoRoot);
  }

  return { baselineFiles, overlayFiles, baselineDir };
}

/* ----------------------------------------------------------------------- */
/* Fixture overlays                                                        */
/* ----------------------------------------------------------------------- */

function applyFixtureOverlays(
  rootDir: string,
  fixtures: CaseFixtures,
  repoRoot: string,
): number {
  let written = 0;
  for (const f of fixtures.files) {
    const relPath = sanitiseRelPath(f.path);
    const dest = join(rootDir, relPath);
    mkdirSync(dirname(dest), { recursive: true, mode: 0o755 });
    let body = "";
    if (f.from) {
      const src = join(repoRoot, f.from);
      if (existsSync(src)) body = readFileSync(src, "utf-8");
      else if (f.content !== undefined) body = f.content;
      else body = `# fixture source missing: ${f.from}\n`;
    } else if (f.content !== undefined) {
      body = f.content;
    }
    writeFileSync(dest, body, { encoding: "utf-8", mode: 0o644 });
    written++;
  }
  return written;
}

function sanitiseRelPath(rel: string): string {
  const norm = rel.replace(/\\+/g, "/").replace(/^\/+/, "");
  if (norm.split("/").some((seg) => seg === "..")) {
    throw new Error(`fixture path escapes sandbox: ${rel}`);
  }
  return norm.split("/").join(sep);
}

/**
 * Runner-facing wrapper. The historical signature was
 * `materializeFixtures(handle, fixtures, repoRoot)`; we keep it intact so
 * `evals/_llm/runner.ts` can stay untouched while still benefiting from the
 * baseline copy.
 */
export function materializeFixtures(
  handle: SandboxHandle,
  fixtures: CaseFixtures | undefined,
  repoRoot: string,
): { baselineFiles: number; overlayFiles: number } {
  const { baselineFiles, overlayFiles } = prepareSandbox(handle.rootDir, {
    repoRoot,
    fixtures,
  });
  return { baselineFiles, overlayFiles };
}

/* ----------------------------------------------------------------------- */
/* Snapshots                                                                */
/* ----------------------------------------------------------------------- */

export function snapshotDir(root: string): RepoSnapshot {
  const entries = new Map<string, string>();
  if (existsSync(root)) walkAndHash(root, root, entries, []);
  return { root, entries };
}

export function snapshotRepo(root: string, exclude: string[] = []): RepoSnapshot {
  const entries = new Map<string, string>();
  if (existsSync(root)) walkAndHash(root, root, entries, exclude);
  return { root, entries };
}

function walkAndHash(
  base: string,
  current: string,
  out: Map<string, string>,
  exclude: string[],
): void {
  let names: string[];
  try {
    names = readdirSync(current);
  } catch {
    return;
  }
  for (const name of names) {
    const full = join(current, name);
    const rel = posix.normalize(toPosix(relative(base, full)));
    if (excluded(rel, exclude)) continue;
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      walkAndHash(base, full, out, exclude);
    } else if (st.isFile()) {
      const buf = readFileSync(full);
      const sha = createHash("sha256").update(buf).digest("hex");
      out.set(rel, sha);
    }
  }
}

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

function excluded(relPath: string, exclude: string[]): boolean {
  for (const pat of exclude) {
    const norm = pat.replace(/^\/+|\/+$/g, "");
    if (relPath === norm) return true;
    if (relPath.startsWith(`${norm}/`)) return true;
  }
  return false;
}

function countFiles(root: string): number {
  let n = 0;
  const stack = [root];
  while (stack.length) {
    const cur = stack.pop()!;
    let names: string[];
    try {
      names = readdirSync(cur);
    } catch {
      continue;
    }
    for (const name of names) {
      const full = join(cur, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) continue;
      if (st.isDirectory()) stack.push(full);
      else if (st.isFile()) n++;
    }
  }
  return n;
}

/* ----------------------------------------------------------------------- */
/* Diffs                                                                    */
/* ----------------------------------------------------------------------- */

export function diffSnapshots(before: RepoSnapshot, after: RepoSnapshot): SnapshotDiff {
  const added: string[] = [];
  const modified: string[] = [];
  const removed: string[] = [];
  for (const [path, sha] of after.entries) {
    const prev = before.entries.get(path);
    if (prev === undefined) added.push(path);
    else if (prev !== sha) modified.push(path);
  }
  for (const path of before.entries.keys()) {
    if (!after.entries.has(path)) removed.push(path);
  }
  added.sort();
  modified.sort();
  removed.sort();
  return { added, modified, removed };
}

/* ----------------------------------------------------------------------- */
/* expected_filesystem verification                                         */
/* ----------------------------------------------------------------------- */

export function verifyExpectedFilesystemAgainstDiff(
  diff: SnapshotDiff,
  before: RepoSnapshot,
  after: RepoSnapshot,
  expected?: CaseExpectedFilesystem,
): FilesystemVerdict {
  if (!expected) return { passed: 0, failed: 0, detail: [] };

  const detail: string[] = [];
  let passed = 0;
  let failed = 0;

  const addedSet = new Set(diff.added);
  const modifiedSet = new Set(diff.modified);
  const removedSet = new Set(diff.removed);

  for (const want of expected.created ?? []) {
    if (addedSet.has(want)) {
      passed++;
      detail.push(`created OK: ${want}`);
    } else {
      failed++;
      detail.push(`created MISSING: ${want}`);
    }
  }
  for (const want of expected.modified ?? []) {
    if (modifiedSet.has(want)) {
      passed++;
      detail.push(`modified OK: ${want}`);
    } else {
      failed++;
      detail.push(`modified MISSING: ${want}`);
    }
  }
  for (const want of expected.removed ?? []) {
    if (removedSet.has(want)) {
      passed++;
      detail.push(`removed OK: ${want}`);
    } else {
      failed++;
      detail.push(`removed MISSING: ${want}`);
    }
  }
  for (const want of expected.unchanged ?? []) {
    const beforeSha = before.entries.get(want);
    const afterSha = after.entries.get(want);
    if (beforeSha !== undefined && beforeSha === afterSha) {
      passed++;
      detail.push(`unchanged OK: ${want}`);
    } else {
      failed++;
      detail.push(`unchanged VIOLATED: ${want}`);
    }
  }

  return { passed, failed, detail };
}
