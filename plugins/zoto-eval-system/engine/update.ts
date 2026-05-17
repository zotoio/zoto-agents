#!/usr/bin/env tsx
/**
 * Diff-aware eval updater (subtask 11 — eval-system v2 rewrite).
 *
 * CORE CONTRACT — ENFORCED AT RUNTIME AND AT COMPILE TIME:
 *
 *   1. A case is ONLY modified when `case._meta?.generated === true`.
 *   2. A test file (*.test.ts / *.test.js / *.test.py) is ONLY overwritten
 *      when its first line carries the `// _meta.generated: true` (or
 *      `# _meta.generated: True`) marker.
 *
 * Both invariants funnel through the canonical guards owned by subtask 09
 * at `evals/_llm/_user-case-guards.ts` (`isGeneratedCase` /
 * `isGeneratedFile`). This file is a CONSUMER and never re-implements the
 * predicates.
 *
 * Architecture:
 *
 *   parseArgs ─► main() ─► dispatchRegeneration() ─► regenerate{Pytest,
 *                                                                Vitest,
 *                                                                Jest,
 *                                                                LlmCode,
 *                                                                LlmDeclarative}
 *
 * Each framework helper:
 *   - Resolves an `AnalyserPayload` (fresh via `runAnalyser`, cached under
 *     `--no-analyser` or when `CI=true` defaults to cached payloads unless
 *     overridden with `--with-analyser`).
 *   - Calls `isGeneratedFile(path)` before overwriting any test file.
 *   - For declarative `evals.json`, calls `isGeneratedCase(c)` first and
 *     uses `json-source-map` to surgically replace generated rows while
 *     leaving user-authored rows byte-identical. Rows whose stamped payload
 *     is `isDeepStrictEqual` to the existing value skip replacement. No
 *     generated rows yet implies a user-only file — injecting machine cases
 *     requires `--overwrite` (mirroring test-file guards).
 *   - Returns a structured report; the dispatcher aggregates and updates
 *     the manifest + appends to `manifest.history.yml`.
 *
 * This file is parsed as a string by the plugin validator, which searches
 * for the literal guard expression: `_meta?.generated === true`.
 */
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";

import YAML from "yaml";
import { minimatch } from "minimatch";
import jsonMap from "json-source-map";

import type { EvalCase, EvalFile } from "./case.js";
import { casesOf, loadEvalFile } from "./case.js";
import { isGeneratedCase, isGeneratedFile } from "./_user-case-guards.js";
import { loadEvalConfig } from "../src/config-loader.js";
import {
  filterTargetsByDiscoveryIgnores,
  filterTargetsByDiscoveryKinds,
  toolingPhantomEvalCataloguePath,
} from "./discovery-filters.js";
import {
  loadRawConfigDiscoveryTargets,
  readManifestSnapshot,
  type ManifestSnapshot,
} from "./manifest-snapshot.js";
import {
  runAnalyser,
  AnalyserError,
  type AnalyserPayload,
} from "../../../scripts/eval-analyse.ts";
import {
  buildDeclarativeStampedCase,
  stampJestPerPrimitive,
  stampLlmCodeStrategy,
  stampLlmDeclarativeStrategy,
  stampPytestPerPrimitive,
  stampVitestPerPrimitive,
  type LlmCodeFramework,
  type PrimitiveMeta,
} from "../../../scripts/eval-stamp.ts";

const REPO_ROOT = resolve(process.cwd());
const ANALYSER_CACHE_DIR_REL = ".zoto/eval-system/cache/analyser";

export type Mode =
  | "rediscovery-dry"
  | "rediscovery-apply"
  | "targeted-dry"
  | "targeted-apply"
  | "check";

export interface Delta {
  target_id: string;
  path: string;
  kind: "added" | "removed" | "modified" | "unchanged";
  critical: boolean;
  reason: string;
}

export interface UpdateSummary {
  added: number;
  removed: number;
  modified_applied: number;
  modified_skipped: number;
  orphaned: number;
  user_authored_flagged: number;
  deltas: Delta[];
}

export interface ParsedArgs {
  mode: Mode;
  glob: string | null;
  noAnalyser: boolean;
  /** When true, regenerates overwrite files missing the `_meta.generated` guard. */
  overwrite: boolean;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice();
  const apply = args.includes("--apply");
  const check = args.includes("--check");
  const explicitWithAnalyser = args.includes("--with-analyser");
  const explicitNoAnalyser = args.includes("--no-analyser");
  const ciDefaultsToCachedAnalyser =
    process.env.CI === "true" && !explicitWithAnalyser;
  const noAnalyser =
    !explicitWithAnalyser && (explicitNoAnalyser || ciDefaultsToCachedAnalyser);
  const overwrite = args.includes("--overwrite");

  // --target <glob> form
  let glob: string | null = null;
  const tgtIdx = args.indexOf("--target");
  if (tgtIdx >= 0 && args[tgtIdx + 1]) {
    glob = args[tgtIdx + 1] ?? null;
  }
  // positional fallback (legacy form)
  if (!glob) {
    const positional = args.filter((a, i) => {
      if (a.startsWith("--")) return false;
      // Skip values consumed by --target
      if (i > 0 && args[i - 1] === "--target") return false;
      // Skip the leading "--" separator that pnpm passes through
      if (a === "--") return false;
      return true;
    });
    if (positional.length > 0) glob = positional[0] ?? null;
  }

  if (check) return { mode: "check", glob, noAnalyser, overwrite };
  if (glob) {
    return {
      mode: apply ? "targeted-apply" : "targeted-dry",
      glob,
      noAnalyser,
      overwrite,
    };
  }
  return {
    mode: apply ? "rediscovery-apply" : "rediscovery-dry",
    glob: null,
    noAnalyser,
    overwrite,
  };
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function normaliseContent(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n").trim();
}

function resolveUpdatePaths(repoRoot: string): { manifestPath: string; historyPath: string } {
  try {
    const { config: typed } = loadEvalConfig(repoRoot);
    return {
      manifestPath: join(repoRoot, typed.update.manifestPath),
      historyPath: join(repoRoot, typed.update.historyPath),
    };
  } catch {
    return {
      manifestPath: join(repoRoot, ".zoto", "eval-system", "manifest.yml"),
      historyPath: join(repoRoot, ".zoto", "eval-system", "manifest.history.yml"),
    };
  }
}

function loadManifestAt(manifestPath: string): Record<string, unknown> | null {
  if (!existsSync(manifestPath)) return null;
  return YAML.parse(readFileSync(manifestPath, "utf-8")) as Record<string, unknown>;
}

function headSha(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO_ROOT }).toString().trim();
  } catch {
    return "unknown";
  }
}

function loadConfig(): Record<string, unknown> {
  try {
    return loadEvalConfig(REPO_ROOT).config as unknown as Record<string, unknown>;
  } catch {
    return {};
  }
}

function loadIgnorePatterns(config: Record<string, unknown>): string[] {
  const raw = config.ignore;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * Full-catalog modes (check / rediscovery without `--target`) pin discovery ignores to
 * `manifest.discovery_config` only — same as `scripts/eval-update.ts`. An absent or empty
 * `ignore` in the snapshot means no ignore patterns (live `config.yml` is not consulted).
 */
function discoveryIgnoreForUpdate(
  manifest: Record<string, unknown>,
  liveConfig: Record<string, unknown>,
  fullCatalog: boolean,
): string[] {
  if (fullCatalog) {
    const dc = manifest.discovery_config;
    return isPlainObject(dc) ? loadIgnorePatterns(dc) : [];
  }
  return loadIgnorePatterns(liveConfig);
}

/**
 * Append-only multi-doc YAML: extend the file at EOF only — never parse, rewrite, or
 * truncate prior documents (separator derived from the last byte, not a full read).
 */
function appendManifestHistorySnapshot(absPath: string, doc: Record<string, unknown>): void {
  const yamlBody = YAML.stringify(doc);
  mkdirSync(dirname(absPath), { recursive: true });
  if (!existsSync(absPath)) {
    appendFileSync(absPath, `---\n${yamlBody}`, "utf-8");
    return;
  }
  const st = statSync(absPath);
  let sep: string;
  if (st.size === 0) {
    sep = "---\n";
  } else {
    const fd = openSync(absPath, "r");
    try {
      const buf = Buffer.alloc(1);
      readSync(fd, buf, 0, 1, st.size - 1);
      sep = buf[0] === 0x0a ? "---\n" : "\n---\n";
    } finally {
      closeSync(fd);
    }
  }
  appendFileSync(absPath, `${sep}${yamlBody}`, "utf-8");
}

interface TargetSnapshot {
  id: string;
  kind: string;
  path: string;
  content_hash: string;
  public_surface?: Record<string, unknown>;
  eval_files: string[];
}

function expandRoot(rootPattern: string): string[] {
  if (!rootPattern.includes("*")) {
    const abs = resolve(REPO_ROOT, rootPattern);
    return existsSync(abs) && statSync(abs).isDirectory() ? [abs] : [];
  }
  const parts = rootPattern.split("/");
  const idx = parts.indexOf("*");
  if (idx === -1) {
    const abs = resolve(REPO_ROOT, rootPattern);
    return existsSync(abs) && statSync(abs).isDirectory() ? [abs] : [];
  }
  const prefix = resolve(REPO_ROOT, parts.slice(0, idx).join("/"));
  const suffix = parts.slice(idx + 1).join("/");
  if (!existsSync(prefix) || !statSync(prefix).isDirectory()) return [];
  const out: string[] = [];
  for (const entry of readdirSync(prefix).sort()) {
    const candidate = suffix
      ? join(prefix, entry, suffix)
      : join(prefix, entry);
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      out.push(candidate);
    }
  }
  return out;
}

function parseFrontmatter(raw: string): Record<string, unknown> {
  const m = /^---\n([\s\S]*?)\n---/m.exec(raw);
  if (!m) return {};
  const lines = m[1].split("\n");
  const out: Record<string, string> = {};
  for (const line of lines) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { frontmatter: out };
}

function discoverSkills(config: Record<string, unknown>): TargetSnapshot[] {
  const roots = ((config.skillsRoots as string[]) ?? [
    ".cursor/skills",
    "skills",
    "plugins/*/skills",
  ]).flatMap(expandRoot);

  const targets: TargetSnapshot[] = [];
  for (const root of roots) {
    for (const name of readdirSync(root).sort()) {
      const skillDir = join(root, name);
      if (!statSync(skillDir).isDirectory()) continue;
      const skillMd = join(skillDir, "SKILL.md");
      if (!existsSync(skillMd)) continue;
      const raw = readFileSync(skillMd, "utf-8");
      const evalsPath = join(skillDir, "evals", "evals.json");
      targets.push({
        id: `skill:${name}`,
        kind: "skill",
        path: relative(REPO_ROOT, skillMd),
        content_hash: sha256(normaliseContent(raw)),
        public_surface: parseFrontmatter(raw),
        eval_files: existsSync(evalsPath)
          ? [relative(REPO_ROOT, evalsPath)]
          : [],
      });
    }
  }
  return targets;
}

function discoverPluginAssets(
  kind: "command" | "agent",
  subdir: "commands" | "agents",
): TargetSnapshot[] {
  const pluginsRoot = join(REPO_ROOT, "plugins");
  if (!existsSync(pluginsRoot)) return [];
  const evalLeaf = subdir === "commands" ? "commands" : "agents";
  const out: TargetSnapshot[] = [];
  for (const plugin of readdirSync(pluginsRoot).sort()) {
    const dir = join(pluginsRoot, plugin, subdir);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    for (const file of readdirSync(dir).sort()) {
      if (!file.endsWith(".md")) continue;
      const full = join(dir, file);
      const raw = readFileSync(full, "utf-8");
      const base = file.replace(/\.md$/, "");
      const evalPath = join(pluginsRoot, plugin, "evals", evalLeaf, `${base}.json`);
      out.push({
        id: `${kind}:${file.replace(/\.md$/, "")}`,
        kind,
        path: relative(REPO_ROOT, full),
        content_hash: sha256(normaliseContent(raw)),
        public_surface: parseFrontmatter(raw),
        eval_files: existsSync(evalPath)
          ? [relative(REPO_ROOT, evalPath)]
          : [],
      });
    }
  }
  return out;
}

function discoverHooks(): TargetSnapshot[] {
  const pluginsRoot = join(REPO_ROOT, "plugins");
  if (!existsSync(pluginsRoot)) return [];
  const out: TargetSnapshot[] = [];
  for (const plugin of readdirSync(pluginsRoot).sort()) {
    const hooksJson = join(pluginsRoot, plugin, "hooks", "hooks.json");
    if (!existsSync(hooksJson)) continue;
    const raw = readFileSync(hooksJson, "utf-8");
    const hookEvalPath = join(pluginsRoot, plugin, "evals", "hooks", `${plugin}.json`);
    out.push({
      id: `hook:${plugin}`,
      kind: "hook",
      path: relative(REPO_ROOT, hooksJson),
      content_hash: sha256(normaliseContent(raw)),
      public_surface: { plugin },
      eval_files: existsSync(hookEvalPath)
        ? [relative(REPO_ROOT, hookEvalPath)]
        : [],
    });
  }
  return out;
}

const CURSOR_ROOT = join(REPO_ROOT, ".cursor");

function discoverCursorCommands(): TargetSnapshot[] {
  const dir = join(CURSOR_ROOT, "commands");
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  const out: TargetSnapshot[] = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".md")) continue;
    const full = join(dir, file);
    const raw = readFileSync(full, "utf-8");
    const base = file.replace(/\.md$/, "");
    const evalPath = join(CURSOR_ROOT, "evals", "commands", `${base}.json`);
    out.push({
      id: `command:${base}`,
      kind: "command",
      path: relative(REPO_ROOT, full),
      content_hash: sha256(normaliseContent(raw)),
      public_surface: parseFrontmatter(raw),
      eval_files: existsSync(evalPath)
        ? [relative(REPO_ROOT, evalPath)]
        : [],
    });
  }
  return out;
}

function discoverCursorAgents(): TargetSnapshot[] {
  const dir = join(CURSOR_ROOT, "agents");
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  const out: TargetSnapshot[] = [];
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".md")) continue;
    const full = join(dir, file);
    const raw = readFileSync(full, "utf-8");
    const base = file.replace(/\.md$/, "");
    const evalPath = join(CURSOR_ROOT, "evals", "agents", `${base}.json`);
    out.push({
      id: `agent:${base}`,
      kind: "agent",
      path: relative(REPO_ROOT, full),
      content_hash: sha256(normaliseContent(raw)),
      public_surface: parseFrontmatter(raw),
      eval_files: existsSync(evalPath)
        ? [relative(REPO_ROOT, evalPath)]
        : [],
    });
  }
  return out;
}

function discoverCursorHooks(): TargetSnapshot[] {
  const hooksNested = join(CURSOR_ROOT, "hooks", "hooks.json");
  const hooksFlat = join(CURSOR_ROOT, "hooks.json");
  let hooksPath: string | null = null;
  if (existsSync(hooksNested)) hooksPath = hooksNested;
  else if (existsSync(hooksFlat)) hooksPath = hooksFlat;
  if (!hooksPath) return [];
  const raw = readFileSync(hooksPath, "utf-8");
  const hookEvalPath = join(CURSOR_ROOT, "evals", "hooks", "hooks.json");
  return [
    {
      id: "hook:cursor-workspace",
      kind: "hook",
      path: relative(REPO_ROOT, hooksPath),
      content_hash: sha256(normaliseContent(raw)),
      public_surface: { workspace: ".cursor" },
      eval_files: existsSync(hookEvalPath)
        ? [relative(REPO_ROOT, hookEvalPath)]
        : [],
    },
  ];
}

function discoverTargets(config: Record<string, unknown>): TargetSnapshot[] {
  const discoveryConfig =
    (config.discovery_config as Record<string, unknown> | undefined) ?? config;
  const kinds =
    ((discoveryConfig as Record<string, unknown>).discoveryTargets as
      | string[]
      | undefined) ?? ["skill"];

  const all: TargetSnapshot[] = [];
  if (kinds.includes("skill")) all.push(...discoverSkills(discoveryConfig));
  if (kinds.includes("command")) {
    all.push(...discoverPluginAssets("command", "commands"));
    all.push(...discoverCursorCommands());
  }
  if (kinds.includes("agent")) {
    all.push(...discoverPluginAssets("agent", "agents"));
    all.push(...discoverCursorAgents());
  }
  if (kinds.includes("hook")) {
    all.push(...discoverHooks());
    all.push(...discoverCursorHooks());
  }
  return all;
}

function classify(
  config: Record<string, unknown>,
  d: Omit<Delta, "critical" | "reason">,
  oldT: TargetSnapshot | undefined,
  newT: TargetSnapshot | undefined,
  coveredByGenerated: boolean,
): Delta {
  const rules = ((config.update ?? {}) as Record<string, unknown>)
    .criticalChangeRules as Record<string, boolean> | undefined;

  const isCritical = (rule: keyof NonNullable<typeof rules>): boolean => {
    if (!rules) return true;
    return rules[rule] !== false;
  };

  // Coverage rules: skills use frontmatter + public-surface criticality; non-skill
  // targets still participate in removal/orphan criticality when generated cases exist.
  const target = newT ?? oldT;
  const isSkill = target?.kind === "skill";

  if (d.kind === "added") {
    if (isSkill && isCritical("addedTargetWithoutCoverage")) {
      return { ...d, critical: true, reason: "added skill with no eval coverage" };
    }
    const hasEval =
      newT &&
      Array.isArray(newT.eval_files) &&
      newT.eval_files.length > 0;
    if (
      !isSkill &&
      newT &&
      !hasEval &&
      isCritical("addedTargetWithoutCoverage")
    ) {
      return {
        ...d,
        critical: true,
        reason: `added ${newT.kind} with no eval coverage`,
      };
    }
  }
  if (d.kind === "removed") {
    if (coveredByGenerated && isCritical("removedTargetWithActiveCases")) {
      return {
        ...d,
        critical: true,
        reason: "removed target with at least one active generated case",
      };
    }
  }
  if (d.kind === "modified") {
    if (!isSkill) {
      return { ...d, critical: false, reason: "non-skill target modified" };
    }
    const oldFM = ((oldT?.public_surface ?? {}) as Record<string, unknown>)
      .frontmatter as Record<string, string> | undefined;
    const newFM = ((newT?.public_surface ?? {}) as Record<string, unknown>)
      .frontmatter as Record<string, string> | undefined;
    const fmChanged =
      oldFM &&
      newFM &&
      (oldFM.name !== newFM.name || oldFM.description !== newFM.description);
    if (fmChanged && isCritical("skillFrontmatterChange")) {
      return {
        ...d,
        critical: true,
        reason: "skill frontmatter name/description changed",
      };
    }
    if (isCritical("publicSurfaceChange")) {
      return {
        ...d,
        critical: true,
        reason: "public-surface change on covered target",
      };
    }
  }
  return { ...d, critical: false, reason: "non-critical change" };
}

/**
 * Compute deltas between the snapshot stored in the manifest and the
 * currently-discovered targets.
 */
export function computeDeltas(
  manifest: Record<string, unknown>,
  current: TargetSnapshot[],
  config: Record<string, unknown>,
): Delta[] {
  const oldTargets = ((manifest.targets as TargetSnapshot[]) ?? []).reduce<
    Record<string, TargetSnapshot>
  >((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {});
  const newTargets = current.reduce<Record<string, TargetSnapshot>>((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {});
  const deltas: Delta[] = [];

  for (const id of new Set([...Object.keys(oldTargets), ...Object.keys(newTargets)])) {
    const oldT = oldTargets[id];
    const newT = newTargets[id];
    if (!oldT && newT) {
      deltas.push(
        classify(
          config,
          { target_id: id, path: newT.path, kind: "added" },
          oldT,
          newT,
          false,
        ),
      );
    } else if (oldT && !newT) {
      const coveredByGenerated = (oldT.eval_files ?? []).some((f) =>
        containsGenerated(f),
      );
      deltas.push(
        classify(
          config,
          { target_id: id, path: oldT.path, kind: "removed" },
          oldT,
          newT,
          coveredByGenerated,
        ),
      );
    } else if (oldT && newT) {
      if (oldT.content_hash !== newT.content_hash) {
        deltas.push(
          classify(
            config,
            { target_id: id, path: newT.path, kind: "modified" },
            oldT,
            newT,
            false,
          ),
        );
      } else {
        deltas.push({
          target_id: id,
          path: newT.path,
          kind: "unchanged",
          critical: false,
          reason: "no content change",
        });
      }
    }
  }
  return deltas;
}

function containsGenerated(evalFile: string): boolean {
  const abs = resolve(REPO_ROOT, evalFile);
  if (!existsSync(abs)) {
    return !toolingPhantomEvalCataloguePath(evalFile);
  }
  try {
    const f = loadEvalFile(abs);
    return casesOf(f).some((c) => c._meta?.generated === true);
  } catch {
    return false;
  }
}

/**
 * Writes new/updated cases into an eval file.
 *
 * Refuses - via both a compile-time-visible guard and a runtime throw - to
 * modify any case where `_meta?.generated === true` is not satisfied.
 */
export function applyCaseUpdates(
  evalFile: EvalFile,
  updates: Array<{ id: number | string; newCase: EvalCase }>,
): EvalFile {
  const cases = casesOf(evalFile);
  for (const { id, newCase } of updates) {
    const idx = cases.findIndex((c) => c.id === id);
    if (idx === -1) {
      cases.push(newCase);
      continue;
    }
    const existing = cases[idx];
    if (!(existing._meta?.generated === true)) {
      throw new Error(
        `refuse-to-mutate: case ${id} is user-authored (no _meta.generated === true); cannot be modified by zoto-update-evals`,
      );
    }
    cases[idx] = newCase;
  }
  const key: "evals" | "cases" = evalFile.evals ? "evals" : "cases";
  (evalFile as Record<string, unknown>)[key] = cases;
  return evalFile;
}

export function removeOrphanedCases(
  evalFile: EvalFile,
  targetId: string,
): EvalFile {
  const cases = casesOf(evalFile);
  const kept: EvalCase[] = [];
  for (const c of cases) {
    if (c._meta?.generated === true) {
      const by = c._meta?.generated_by ?? "";
      const stale = typeof by === "string" && by.includes(targetId);
      if (stale) continue;
    }
    kept.push(c);
  }
  const key: "evals" | "cases" = evalFile.evals ? "evals" : "cases";
  (evalFile as Record<string, unknown>)[key] = kept;
  return evalFile;
}

export function summarise(deltas: Delta[], flaggedUser: number): UpdateSummary {
  return {
    added: deltas.filter((d) => d.kind === "added").length,
    removed: deltas.filter((d) => d.kind === "removed").length,
    modified_applied: 0,
    modified_skipped: 0,
    orphaned: 0,
    user_authored_flagged: flaggedUser,
    deltas,
  };
}

/* ------------------------------------------------------------------------ */
/* Subtask 11 — Per-framework regeneration helpers                           */
/* ------------------------------------------------------------------------ */

export interface RegenerationReport {
  target_id: string;
  framework: string | null;
  llm_strategy: string | null;
  files_written: string[];
  files_preserved: string[];
  cases_replaced: number;
  cases_added: number;
  cases_removed: number;
  user_cases_preserved: number;
  notes: string[];
}

function newRegenerationReport(
  targetId: string,
  framework: string | null,
  strategy: string | null,
): RegenerationReport {
  return {
    target_id: targetId,
    framework,
    llm_strategy: strategy,
    files_written: [],
    files_preserved: [],
    cases_replaced: 0,
    cases_added: 0,
    cases_removed: 0,
    user_cases_preserved: 0,
    notes: [],
  };
}

function buildPrimitiveMeta(
  payload: AnalyserPayload,
  target: TargetSnapshot,
): PrimitiveMeta {
  const namePart = payload.target_id.includes(":")
    ? payload.target_id.split(":")[1] ?? payload.target_id
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

/**
 * File-level guard wrapper. Invokes `op()` only when `path` either does
 * not yet exist OR carries the `_meta.generated` marker. Skipped files
 * are appended to the report's `files_preserved` with a
 * `manual_merge_required` note.
 */
function guardedFileWrite(
  report: RegenerationReport,
  path: string,
  op: () => string[],
  context: string,
  overwrite: boolean,
): void {
  const existsAlready = existsSync(path);
  if (existsAlready && !overwrite && !isGeneratedFile(path)) {
    report.files_preserved.push(path);
    report.notes.push(
      `manual_merge_required: ${context} would overwrite user-authored ${relative(REPO_ROOT, path)} (no _meta.generated marker)`,
    );
    return;
  }
  const written = op();
  for (const w of written) report.files_written.push(w);
}

export interface RegenerationCommonOpts {
  hostRepoRoot: string;
  payload: AnalyserPayload;
  target: TargetSnapshot;
  config: Record<string, unknown>;
  snapshot: ManifestSnapshot;
  dryRun?: boolean;
  /** Skip user-authored file guard (maps to CLI `--overwrite`). */
  overwrite?: boolean;
  /** When true, declarative merges carry forward `primitive_analysis.invalidate` from existing rows. */
  noAnalyser?: boolean;
}

/**
 * Regenerate the per-primitive pytest test file. Calls
 * `isGeneratedFile()` first so user-authored `test_*.py` files are
 * preserved with a `manual_merge_required` warning.
 */
export function regeneratePytest(opts: RegenerationCommonOpts): RegenerationReport {
  const report = newRegenerationReport(opts.target.id, "pytest", null);
  const namePart = opts.payload.target_id.split(":")[1] ?? opts.payload.target_id;
  const slug = namePart
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const outPath = join(
    opts.hostRepoRoot,
    "evals",
    `test_${opts.payload.kind}_${slug}.py`,
  );
  guardedFileWrite(
    report,
    outPath,
    () => {
      const r = stampPytestPerPrimitive(
        opts.hostRepoRoot,
        opts.payload,
        {},
        { dryRun: opts.dryRun },
      );
      return r.written ? [r.outPath] : [];
    },
    "regeneratePytest",
    Boolean(opts.overwrite),
  );
  return report;
}

/**
 * Regenerate the per-primitive vitest test file with file-level guard.
 */
export function regenerateVitest(opts: RegenerationCommonOpts): RegenerationReport {
  const report = newRegenerationReport(opts.target.id, "vitest", null);
  const primitive = buildPrimitiveMeta(opts.payload, opts.target);
  const slug = primitive.slug
    .replace(/^[^_]+_/, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-");
  const outPath = join(
    opts.hostRepoRoot,
    "evals",
    `test_${opts.payload.kind}_${slug}.test.ts`,
  );
  guardedFileWrite(
    report,
    outPath,
    () => {
      const r = stampVitestPerPrimitive(
        opts.hostRepoRoot,
        opts.payload,
        primitive,
        { dryRun: opts.dryRun, bypassGuard: true },
      );
      return r.written;
    },
    "regenerateVitest",
    Boolean(opts.overwrite),
  );
  return report;
}

/**
 * Regenerate the per-primitive jest test file with file-level guard.
 */
export function regenerateJest(opts: RegenerationCommonOpts): RegenerationReport {
  const report = newRegenerationReport(opts.target.id, "jest", null);
  const primitive = buildPrimitiveMeta(opts.payload, opts.target);
  const outPath = join(
    opts.hostRepoRoot,
    "evals",
    `${primitive.slug}.test.ts`,
  );
  guardedFileWrite(
    report,
    outPath,
    () => {
      const r = stampJestPerPrimitive(
        opts.hostRepoRoot,
        opts.payload,
        primitive,
        { dryRun: opts.dryRun, bypassGuard: true },
      );
      return r.written;
    },
    "regenerateJest",
    Boolean(opts.overwrite),
  );
  return report;
}

/**
 * Regenerate the per-primitive `*.test.ts` file under `evals/llm/` with
 * the `// _meta.generated: true` first-line guard.
 */
export function regenerateLlmCode(opts: RegenerationCommonOpts): RegenerationReport {
  const report = newRegenerationReport(opts.target.id, null, "code");
  const primitive = buildPrimitiveMeta(opts.payload, opts.target);
  const codeFramework: LlmCodeFramework =
    (opts.snapshot.llm.codeFramework as LlmCodeFramework) ?? "vitest";
  const llm = (opts.config.llm as Record<string, unknown> | undefined) ?? {};
  const model = (llm.model as Record<string, unknown> | undefined) ?? {};
  const modelId = typeof model.id === "string" ? model.id : "composer-2";
  const judgeModel =
    typeof opts.config.judgeModel === "string"
      ? (opts.config.judgeModel as string)
      : "opus-4.6";
  const outPath = join(
    opts.hostRepoRoot,
    "evals",
    "llm",
    `test_${primitive.slug}.test.ts`,
  );
  guardedFileWrite(
    report,
    outPath,
    () => {
      const r = stampLlmCodeStrategy(
        opts.hostRepoRoot,
        opts.payload,
        primitive,
        {
          codeFramework,
          modelId,
          judgeModel,
          dryRun: opts.dryRun,
          bypassGuard: true,
        },
      );
      return r.written;
    },
    "regenerateLlmCode",
    Boolean(opts.overwrite),
  );
  return report;
}

/**
 * When reloading from cached analyser payloads (`--no-analyser`),
 * `_meta.primitive_analysis.invalidate` is config-driven state maintained on
 * the eval row itself — propagate it onto freshly stamped replacements.
 */
function mergePrimitiveAnalysisInvalidateFromExisting(
  rawEvalJson: string,
  stampedRows: unknown[],
): void {
  let parsed: { evals?: unknown[]; cases?: unknown[] };
  try {
    parsed = JSON.parse(rawEvalJson) as { evals?: unknown[]; cases?: unknown[] };
  } catch {
    return;
  }
  const arr = parsed.evals ?? parsed.cases ?? [];
  let genOrdinal = 0;
  for (const row of arr) {
    if (!isGeneratedCase(row as EvalCase)) continue;
    if (genOrdinal >= stampedRows.length) break;
    const pa = (row as EvalCase)._meta?.primitive_analysis as
      | { invalidate?: boolean }
      | undefined;
    if (pa?.invalidate === true) {
      const st = stampedRows[genOrdinal] as {
        _meta?: { primitive_analysis?: Record<string, unknown> };
      };
      if (st?._meta?.primitive_analysis) {
        st._meta.primitive_analysis.invalidate = true;
      }
    }
    genOrdinal++;
  }
}

/** True when the on-disk declarative JSON already contains at least one generated case. */
function declarativeEvalJsonHasGeneratedRow(raw: string): boolean {
  try {
    const data = JSON.parse(raw) as EvalFile;
    return casesOf(data).some((c) => isGeneratedCase(c));
  } catch {
    return false;
  }
}

/**
 * Regenerate generated cases inside a declarative `evals.json` while
 * preserving user-authored cases byte-identically. Uses
 * `json-source-map` for surgical AST-position replacement so unchanged
 * regions of the file are not reformatted.
 */
export function regenerateLlmDeclarative(
  opts: RegenerationCommonOpts,
): RegenerationReport {
  const report = newRegenerationReport(opts.target.id, null, "declarative");

  // Find the eval file path. Prefer the manifest snapshot's eval_files;
  // fall back to inferring the conventional location.
  const evalFiles = opts.target.eval_files ?? [];
  const evalFile =
    evalFiles[0] ??
    inferDefaultEvalFilePath(opts.hostRepoRoot, opts.target);
  if (!evalFile) {
    report.notes.push("no_eval_file: target has no covering evals.json");
    return report;
  }
  const abs = resolve(opts.hostRepoRoot, evalFile);

  const stamped = opts.payload.cases.map((_, i) =>
    buildDeclarativeStampedCase(opts.payload, i, new Date().toISOString()),
  );

  if (!existsSync(abs)) {
    if (opts.dryRun) {
      report.cases_added = stamped.length;
      report.notes.push(`dry-run: would create ${relative(opts.hostRepoRoot, abs)}`);
      return report;
    }
    mkdirSync(dirname(abs), { recursive: true });
    const fileBody = serialiseFreshEvalFile(opts.target, stamped);
    writeFileSync(abs, fileBody, "utf-8");
    report.files_written.push(abs);
    report.cases_added = stamped.length;
    return report;
  }

  // Mixed-file path: surgical replacement preserving user-authored rows.
  const raw = readFileSync(abs, "utf-8");
  if (opts.noAnalyser) {
    mergePrimitiveAnalysisInvalidateFromExisting(raw, stamped);
  }
  const result = surgicallyReplaceGeneratedCases(raw, stamped);
  report.cases_replaced = result.replaced;
  report.cases_added = result.added;
  report.cases_removed = result.removed;
  report.user_cases_preserved = result.userPreserved;
  if (result.casesGuarded > 0) {
    report.notes.push(
      `case-level guard skipped ${result.casesGuarded} non-generated case(s) — preserved verbatim`,
    );
  }
  if (result.text !== raw) {
    const wouldInjectIntoUserOnly =
      stamped.length > 0 &&
      !declarativeEvalJsonHasGeneratedRow(raw) &&
      !opts.overwrite;
    if (wouldInjectIntoUserOnly) {
      report.files_preserved.push(abs);
      report.notes.push(
        `manual_merge_required: declarative eval would add generated cases to user-authored-only ${relative(opts.hostRepoRoot, abs)} (pass --overwrite)`,
      );
    } else if (opts.dryRun) {
      report.notes.push(`dry-run: would update ${relative(opts.hostRepoRoot, abs)}`);
      report.files_written.push(abs);
    } else {
      writeFileSync(abs, result.text, "utf-8");
      report.files_written.push(abs);
    }
  }
  return report;
}

function inferDefaultEvalFilePath(
  hostRepoRoot: string,
  target: TargetSnapshot,
): string | null {
  const [kind, name] = target.id.split(":");
  if (!kind || !name) return null;
  if (kind === "skill") {
    // Skill eval files live alongside the SKILL.md
    const skillDir = dirname(join(hostRepoRoot, target.path));
    return relative(hostRepoRoot, join(skillDir, "evals", "evals.json"));
  }
  // command/agent/hook fall under the plugin's evals subdir
  const m = target.path.match(/^plugins\/([^/]+)\//);
  if (m) {
    const subdir = kind === "hook" ? "hooks" : `${kind}s`;
    const fname = kind === "hook" ? `${m[1]}.json` : `${name}.json`;
    return relative(
      hostRepoRoot,
      join(hostRepoRoot, "plugins", m[1], "evals", subdir, fname),
    );
  }
  return null;
}

function serialiseFreshEvalFile(
  target: TargetSnapshot,
  cases: unknown[],
): string {
  const [kind, name] = target.id.split(":");
  const wrapper: Record<string, unknown> = {};
  if (kind === "skill") wrapper.skill_name = name;
  else if (kind === "command") wrapper.command_name = name;
  else if (kind === "agent") wrapper.agent_name = name;
  else if (kind === "hook") wrapper.hook_plugin = name;
  wrapper.evals = cases;
  return JSON.stringify(wrapper, null, 2) + "\n";
}

interface SurgicalReplaceResult {
  text: string;
  replaced: number;
  added: number;
  removed: number;
  userPreserved: number;
  casesGuarded: number;
}

/**
 * Surgical replacement of `_meta.generated === true` cases inside an
 * `evals.json` text buffer. User-authored cases are preserved
 * byte-identically. Uses `json-source-map` to locate value-byte ranges
 * so the file's whitespace, ordering, and comments-around-arrays remain
 * intact for unchanged regions. A generated row that already matches the
 * incoming stamp (deep equality) is left as-is — no `JSON.stringify`
 * round-trip — so stable rows keep their exact formatting and position.
 */
export function surgicallyReplaceGeneratedCases(
  rawText: string,
  stampedRows: unknown[],
): SurgicalReplaceResult {
  const parsed = jsonMap.parse(rawText) as {
    data: { evals?: unknown[]; cases?: unknown[] };
    pointers: Record<
      string,
      {
        value: { line: number; column: number; pos: number };
        valueEnd: { line: number; column: number; pos: number };
      }
    >;
  };

  const data = parsed.data ?? {};
  const arrKey: "evals" | "cases" = data.evals ? "evals" : "cases";
  const arr = (data[arrKey] ?? []) as unknown[];

  const generatedIdxs: number[] = [];
  let userPreserved = 0;
  let casesGuarded = 0;
  for (let i = 0; i < arr.length; i++) {
    if (isGeneratedCase(arr[i] as Parameters<typeof isGeneratedCase>[0])) {
      generatedIdxs.push(i);
    } else {
      userPreserved++;
      casesGuarded++;
    }
  }

  let out = rawText;
  const replaceCount = Math.min(generatedIdxs.length, stampedRows.length);
  let replaced = 0;

  // Replace existing generated cases (descending so byte positions don't shift).
  for (let r = replaceCount - 1; r >= 0; r--) {
    const idx = generatedIdxs[r];
    const ptr = parsed.pointers[`/${arrKey}/${idx}`];
    if (!ptr) continue;
    if (isDeepStrictEqual(arr[idx], stampedRows[r])) {
      continue;
    }
    const linePrefix = (() => {
      const pre = out.slice(0, ptr.value.pos);
      const lastNl = pre.lastIndexOf("\n");
      return pre.slice(lastNl + 1).match(/^\s*/)?.[0] ?? "    ";
    })();
    const newJson = JSON.stringify(stampedRows[r], null, 2)
      .split("\n")
      .map((line, lineIdx) => (lineIdx === 0 ? line : linePrefix + line))
      .join("\n");
    out = out.slice(0, ptr.value.pos) + newJson + out.slice(ptr.valueEnd.pos);
    replaced++;
  }

  // Append new generated rows when the analyser produced more cases.
  let added = 0;
  if (stampedRows.length > generatedIdxs.length) {
    const reparsed = jsonMap.parse(out) as typeof parsed;
    const arrPtr = reparsed.pointers[`/${arrKey}`];
    if (arrPtr) {
      const closePos = arrPtr.valueEnd.pos - 1; // position of `]`
      const before = out.slice(0, closePos);
      const trimmed = before.replace(/\s*$/, "");
      const needsComma = !trimmed.endsWith("[");
      // Detect indent from existing first generated entry; default to 4 spaces.
      const indent = (() => {
        const firstIdxKey = generatedIdxs[0] ?? 0;
        const firstPtr = reparsed.pointers[`/${arrKey}/${firstIdxKey}`];
        if (firstPtr) {
          const pre = out.slice(0, firstPtr.value.pos);
          const lastNl = pre.lastIndexOf("\n");
          return pre.slice(lastNl + 1).match(/^\s*/)?.[0] ?? "    ";
        }
        return "    ";
      })();
      const additions: string[] = [];
      for (let i = generatedIdxs.length; i < stampedRows.length; i++) {
        const json = JSON.stringify(stampedRows[i], null, 2)
          .split("\n")
          .map((line, lineIdx) => (lineIdx === 0 ? line : indent + line))
          .join("\n");
        additions.push(indent + json);
        added++;
      }
      const segment =
        (needsComma ? ",\n" : "\n") +
        additions.join(",\n") +
        "\n" +
        indent.replace(/[^\s]/g, "").slice(0, Math.max(indent.length - 2, 0));
      out = out.slice(0, closePos) + segment + out.slice(closePos);
    }
  }

  // Remove tail generated rows when the analyser produced fewer cases.
  let removed = 0;
  if (stampedRows.length < generatedIdxs.length) {
    const reparsed = jsonMap.parse(out) as typeof parsed;
    for (let r = generatedIdxs.length - 1; r >= stampedRows.length; r--) {
      const idx = generatedIdxs[r];
      const ptr = reparsed.pointers[`/${arrKey}/${idx}`];
      if (!ptr) continue;
      let start = ptr.value.pos;
      let end = ptr.valueEnd.pos;
      // Strip trailing comma + whitespace so the array stays well-formed.
      while (end < out.length && /[,\s]/.test(out[end] ?? "")) {
        if (out[end] === ",") {
          end++;
          break;
        }
        end++;
      }
      // Strip leading whitespace (indentation of this row) too.
      while (start > 0 && /[ \t]/.test(out[start - 1] ?? "")) {
        start--;
      }
      // Eat the preceding newline if the surrounding context still has structure.
      if (out[start - 1] === "\n") start--;
      out = out.slice(0, start) + out.slice(end);
      removed++;
    }
  }

  return {
    text: out,
    replaced,
    added,
    removed,
    userPreserved,
    casesGuarded,
  };
}

/**
 * Top-level dispatcher. Routes a regeneration request through the
 * framework- and strategy-specific helpers based on the manifest
 * snapshot's `static.framework` and `llm.strategy` fields.
 */
export async function dispatchRegeneration(
  opts: RegenerationCommonOpts,
): Promise<RegenerationReport[]> {
  const reports: RegenerationReport[] = [];
  const fw = opts.snapshot.static.framework;
  const strategy = opts.snapshot.llm.strategy;

  // Static-framework regeneration
  if (fw === "pytest") reports.push(regeneratePytest(opts));
  else if (fw === "vitest") reports.push(regenerateVitest(opts));
  else if (fw === "jest") reports.push(regenerateJest(opts));

  // LLM-strategy regeneration
  if (strategy === "code") reports.push(regenerateLlmCode(opts));
  else if (strategy === "declarative") reports.push(regenerateLlmDeclarative(opts));

  // When neither strategy is configured, fall back to declarative so
  // existing skill/agent/command evals.json files still get refreshed.
  if (!strategy && !fw) {
    reports.push(regenerateLlmDeclarative(opts));
  }

  return reports;
}

/* ------------------------------------------------------------------------ */
/* Cached analyser payload loader (--no-analyser path)                       */
/* ------------------------------------------------------------------------ */

function loadCachedAnalyserPayload(
  hostRepoRoot: string,
  target: TargetSnapshot,
): AnalyserPayload | null {
  const cacheDir = join(hostRepoRoot, ANALYSER_CACHE_DIR_REL);
  if (!existsSync(cacheDir)) return null;
  // The cache key is sha256(normalised source + analyser_version + model_id).
  // Reading every file and matching by `target_id` is robust to model swaps.
  for (const f of readdirSync(cacheDir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const body = JSON.parse(
        readFileSync(join(cacheDir, f), "utf-8"),
      ) as AnalyserPayload;
      if (body.target_id === target.id) return body;
    } catch {
      /* skip malformed cache entries */
    }
  }
  return null;
}

/* ------------------------------------------------------------------------ */
/* Parity self-check                                                         */
/* ------------------------------------------------------------------------ */

interface ParityCheckResult {
  status: "ok" | "drift" | "error";
  summary?: string;
  detail?: unknown;
}

/** Same relative path documented for `/z-eval-update --check` (TS↔Python analyser parity). */
const ANALYSER_PARITY_SCRIPT_REL = join("scripts", "check-analyser-payload-parity.ts");

function parityHarnessPresent(repoRoot: string): boolean {
  return existsSync(join(repoRoot, ANALYSER_PARITY_SCRIPT_REL));
}

function analyserParityGateRequired(): boolean {
  return (
    process.env.ZOTO_EVAL_CHECK_STRICT_ANALYSER_PARITY === "1" ||
    process.env.CI === "true" ||
    process.env.CONTINUOUS_INTEGRATION === "true" ||
    process.env.GITHUB_ACTIONS === "true" ||
    process.env.GITLAB_CI === "true" ||
    process.env.BUILDKITE === "true"
  );
}

/**
 * Mirrors `scripts/eval-update.ts`: non-interactive (no stdin, PNPM_NONINTERACTIVE),
 * runs before drift so CI logs never blend analyser-parity failures with manifest deltas.
 */
function runParityCheck(repoRoot: string): ParityCheckResult {
  if (!parityHarnessPresent(repoRoot)) {
    if (analyserParityGateRequired()) {
      return {
        status: "error",
        summary:
          "scripts/check-analyser-payload-parity.ts missing — required for `/z-eval-update --check` when CI/CD is detected or ZOTO_EVAL_CHECK_STRICT_ANALYSER_PARITY=1",
      };
    }
    return { status: "ok", summary: "skipped-no-parity-harness" };
  }
  try {
    const r = spawnSync("pnpm", ["exec", "tsx", ANALYSER_PARITY_SCRIPT_REL], {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        PNPM_NONINTERACTIVE: "1",
        npm_config_yes: "true",
        COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
      },
    });
    const out = (r.stdout ?? "").trim();
    const err = (r.stderr ?? "").trim();
    if (r.status === 0) {
      try {
        return { status: "ok", detail: JSON.parse(out) };
      } catch {
        return { status: "ok", summary: out };
      }
    }
    const summary = [out, err].filter((s) => s.length > 0).join("\n");
    return {
      status: r.status === null ? "error" : "drift",
      summary:
        summary.length > 0 ? summary : `parity subprocess exited ${r.signal ?? r.status}`,
      detail: err,
    };
  } catch (e) {
    return { status: "error", summary: (e as Error).message };
  }
}

/* ------------------------------------------------------------------------ */
/* main()                                                                    */
/* ------------------------------------------------------------------------ */

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  /**
   * `--check`: analyser payload parity gate first — before config read, `--no-analyser`
   * stderr, manifest read, or drift — matching `scripts/eval-update.ts` and `/z-eval-update`.
   */
  if (args.mode === "check") {
    const parity = runParityCheck(REPO_ROOT);
    if (parity.status !== "ok") {
      const config = loadConfig();
      const exitCodeOnCriticalDrift = Number(
        (config.update as Record<string, unknown> | undefined)?.checkExitCodeOnCriticalDrift ??
          2,
      );
      console.log(
        JSON.stringify({
          status: "parity",
          checked: 0,
          critical_count: 0,
          parity_drift: parity,
        }),
      );
      console.error(JSON.stringify(parity));
      return exitCodeOnCriticalDrift;
    }
  }

  const config = loadConfig();
  const exitCodeOnCriticalDrift = Number(
    (config.update as Record<string, unknown> | undefined)?.checkExitCodeOnCriticalDrift ??
      2,
  );

  // CI-loud warning when analysis is skipped in favour of the cache (--no-analyser
  // flag or CI default). Optional escalation via config.
  if (args.noAnalyser && process.env.CI === "true") {
    process.stderr.write(
      "[CI WARNING] skipping fresh primitive analysis in CI; reusing payloads from .zoto/eval-system/cache/analyser/\n",
    );
    const updateCfg = (config.update ?? {}) as Record<string, unknown>;
    if (updateCfg.failOnNoAnalyserInCI === true) {
      process.stderr.write(
        "[CI ABORT] update.failOnNoAnalyserInCI=true; refusing to continue.\n",
      );
      return 5;
    }
  }

  const { manifestPath, historyPath } = resolveUpdatePaths(REPO_ROOT);
  const manifest = loadManifestAt(manifestPath);

  if (!manifest) {
    if (args.mode === "check") {
      console.log(
        JSON.stringify({
          status: "no-manifest",
          checked: 0,
          critical_count: 0,
          parity_drift: null,
        }),
      );
      return exitCodeOnCriticalDrift;
    }
    console.error("Run /z-eval-create first.");
    return 1;
  }

  const isTargetedScope = Boolean(args.glob);
  const fullCatalog = !isTargetedScope;
  let discoveryForEnumerate: Record<string, unknown>;
  if (fullCatalog) {
    const dc = manifest.discovery_config;
    if (!isPlainObject(dc)) {
      const payload = {
        status: "missing_manifest_discovery_config",
        checked: 0,
        critical_count: 0,
        parity_drift: null,
        note: "Full rediscovery uses manifest.discovery_config only; live eval config is not merged for enumeration.",
      };
      if (args.mode === "check") {
        console.log(JSON.stringify(payload));
        return exitCodeOnCriticalDrift;
      }
      console.error(JSON.stringify(payload));
      return 1;
    }
    discoveryForEnumerate = dc;
  } else {
    discoveryForEnumerate = config as Record<string, unknown>;
  }

  const canon = readManifestSnapshot(REPO_ROOT);
  const ignorePatterns = discoveryIgnoreForUpdate(manifest, config, fullCatalog);

  let manifestBaseline = ((manifest.targets as TargetSnapshot[]) ?? []).slice();
  manifestBaseline = filterTargetsByDiscoveryIgnores(manifestBaseline, ignorePatterns);
  manifestBaseline = filterTargetsByDiscoveryKinds(
    manifestBaseline,
    canon.discoveryTargets,
  );

  let current = discoverTargets(discoveryForEnumerate);
  current = filterTargetsByDiscoveryIgnores(current, ignorePatterns);

  // Apply --target / positional glob
  if (args.glob) {
    const pat = args.glob;
    current = current.filter(
      (t) =>
        minimatch(t.path, pat, { dot: true }) ||
        minimatch(t.id, pat, { dot: true }),
    );
  }

  const manifestForDelta = { ...manifest, targets: manifestBaseline };
  const deltas = computeDeltas(manifestForDelta, current, config);
  const critical = deltas.filter((d) => d.critical);

  if (args.mode === "check") {
    const driftBlock = critical.map((d) => d);
    if (critical.length === 0) {
      console.log(
        JSON.stringify({
          status: "clean",
          checked: current.length,
          critical_count: 0,
          parity_drift: null,
        }),
      );
      return 0;
    }
    const countsByKind: Record<string, number> = {};
    for (const d of critical) {
      countsByKind[d.kind] = (countsByKind[d.kind] ?? 0) + 1;
    }
    const summaryLine = Object.entries(countsByKind)
      .map(([k, v]) => `${k}: ${v} (critical)`)
      .join(", ");
    if (summaryLine) console.log(summaryLine);
    console.log(
      JSON.stringify({
        status: "drift",
        checked: current.length,
        critical_count: critical.length,
        parity_drift: null,
        deltas: driftBlock,
      }),
    );
    for (const d of critical) {
      console.error(JSON.stringify(d));
    }
    return exitCodeOnCriticalDrift;
  }

  if (args.mode === "rediscovery-dry" || args.mode === "targeted-dry") {
    console.log(`${args.mode}: ${deltas.length} delta(s), ${critical.length} critical`);
    for (const d of deltas) {
      console.log(`- ${d.kind} ${d.target_id} (${d.reason})`);
    }
    return 0;
  }

  // Apply mode — actual regeneration (per drifted target: invalidated analyser
  // refresh → fresh manifest snapshot for framework + LLM strategy → stampers).
  const driftedTargets = current.filter((t) => {
    const d = deltas.find((x) => x.target_id === t.id);
    return d && (d.kind === "added" || d.kind === "modified");
  });

  const allReports: RegenerationReport[] = [];
  for (const target of driftedTargets) {
    let payload: AnalyserPayload | null = null;
    if (args.noAnalyser) {
      payload = loadCachedAnalyserPayload(REPO_ROOT, target);
      if (!payload) {
        console.error(
          JSON.stringify({
            target_id: target.id,
            skipped: "no_cached_analyser_payload",
          }),
        );
        continue;
      }
    } else {
      try {
        const r = await runAnalyser(
          { target: target.id },
          { invalidate: true, repoRoot: REPO_ROOT },
        );
        payload = r.payload;
      } catch (e) {
        if (e instanceof AnalyserError) {
          console.error(
            JSON.stringify({
              target_id: target.id,
              analyser_error: e.code,
              message: e.message,
            }),
          );
        } else {
          console.error(
            JSON.stringify({
              target_id: target.id,
              analyser_error: "unhandled",
              message: (e as Error).message,
            }),
          );
        }
        continue;
      }
    }

    const snapshot = readManifestSnapshot(REPO_ROOT);

    const reports = await dispatchRegeneration({
      hostRepoRoot: REPO_ROOT,
      payload,
      target,
      config,
      snapshot,
      dryRun: false,
      overwrite: args.overwrite,
      noAnalyser: args.noAnalyser,
    });
    for (const r of reports) allReports.push(r);
  }

  // Update manifest with refreshed content_hashes (current discovery view)
  // and append one multi-doc chunk to history (never rewrite prior entries).
  const newSnapshot: Record<string, unknown> = {
    schema_version: 1,
    created_at: manifest.created_at,
    updated_at: new Date().toISOString(),
    git_ref: headSha(),
    generated_by: "zoto-update-evals",
    discovery_config: manifest.discovery_config,
    targets: current,
  };
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, YAML.stringify(newSnapshot), "utf-8");
  mkdirSync(dirname(historyPath), { recursive: true });
  appendManifestHistorySnapshot(historyPath, newSnapshot);

  const filesWritten = allReports.flatMap((r) => r.files_written);
  const filesPreserved = allReports.flatMap((r) => r.files_preserved);
  const userPreserved = allReports.reduce((n, r) => n + r.user_cases_preserved, 0);

  console.log(
    JSON.stringify(
      {
        mode: args.mode,
        regenerated_targets: allReports.length,
        files_written: filesWritten.length,
        files_preserved_user_authored: filesPreserved.length,
        user_cases_preserved: userPreserved,
        reports: allReports,
      },
      null,
      2,
    ),
  );
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith("update.ts")) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
