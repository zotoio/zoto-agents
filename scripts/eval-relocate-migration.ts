#!/usr/bin/env tsx
/**
 * One-shot relocate-and-restamp migration for
 * `spec-eval-single-backend-colocated-restructure-20260526` subtask 08.
 *
 * Walks every pre-existing stamped eval artefact (legacy declarative JSON,
 * legacy LLM `code`-strategy TS files at `evals/llm/test_*.test.ts`, and
 * the four static-stamped Vitest pilots at `evals/test_*.test.ts`), emits
 * a single co-located TS file per non-skill primitive at the canonical
 * KD-2 path (`<kind-dir>/evals/<name>.test.ts`), deletes the legacy
 * artefacts through a strict `_meta.generated === true` gate, atomically
 * repoints `.zoto/eval-system/manifest.yml` to the new locations, appends
 * exactly one entry to `.zoto/eval-system/manifest.history.yml`, and
 * stamps `_meta.primitive_analysis.invalidate = true` on every cached
 * analyser payload under `.zoto/eval-system/cache/analyser/*.json`.
 *
 * Skill artefacts (their `evals.json` files) are ALWAYS preserved —
 * `KD-1` is enforced via an explicit allow-list. Any attempt to read or
 * mutate one of the enumerated 14 skill eval files aborts the migration
 * with a fatal error.
 *
 * Two flags only — `--dry-run` (default) and `--apply`. **No `--force`**;
 * the `_meta.generated === true` (case-level) and `// _meta.generated:
 * true` (file-level) gates are non-negotiable per KD-7.
 *
 * Idempotency: re-running `--apply` after a successful run is a no-op.
 * The script's pre-flight check refuses to start if either side of the
 * relocate already exists in an inconsistent state (e.g. new file present
 * with the wrong content); see {@link planMigration} for details.
 */
import {
  createHash,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

import {
  isGeneratedCase,
  isGeneratedFile,
} from "../plugins/zoto-eval-system/engine/_user-case-guards.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(SCRIPT_DIR, "..");
const SPEC_DIR =
  "specs/20260526-eval-single-backend-colocated-restructure";
const SPEC_ID = "20260526-eval-single-backend-colocated-restructure";
const MIGRATION_REASON = "strategy-collapse-and-colocate";

/* ---------------------------------------------------------------------- */
/* Skill exemption — KD-1                                                  */
/* ---------------------------------------------------------------------- */

/**
 * The 14 skill `evals.json` paths that MUST NOT be read, written, or
 * deleted by this migration. Any path that appears in a planned move or
 * deletion is fatal-checked against this set before any disk write.
 */
const SKILL_EVALS_JSON_PATHS: ReadonlyArray<string> = [
  ".cursor/skills/zoto-create-plugin/evals/evals.json",
  "plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json",
  "plugins/zoto-eval-system/skills/zoto-advise-evals/evals/evals.json",
  "plugins/zoto-eval-system/skills/zoto-compare-evals/evals/evals.json",
  "plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json",
  "plugins/zoto-eval-system/skills/zoto-create-evals/evals/evals.json",
  "plugins/zoto-eval-system/skills/zoto-eval-tooling/evals/evals.json",
  "plugins/zoto-eval-system/skills/zoto-execute-evals/evals/evals.json",
  "plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json",
  "plugins/zoto-eval-system/skills/zoto-judge-evals/evals/evals.json",
  "plugins/zoto-eval-system/skills/zoto-update-evals/evals/evals.json",
  "plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json",
  "plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json",
  "plugins/zoto-spec-system/skills/zoto-judge-spec/evals/evals.json",
];

const SKILL_EVAL_PATH_SET = new Set(SKILL_EVALS_JSON_PATHS);

/* ---------------------------------------------------------------------- */
/* Inputs — explicit per-spec enumeration                                  */
/* ---------------------------------------------------------------------- */

/** Skill primitives whose legacy LLM TS sidecar is DELETED outright (KD-4). */
const SKILL_LLM_TS_TO_DELETE: ReadonlyArray<string> = [
  "evals/llm/test_skill_zoto-compare-evals.test.ts",
  "evals/llm/test_skill_zoto-configure-evals.test.ts",
  "evals/llm/test_skill_zoto-create-evals.test.ts",
  "evals/llm/test_skill_zoto-create-spec.test.ts",
  "evals/llm/test_skill_zoto-execute-evals.test.ts",
  "evals/llm/test_skill_zoto-execute-spec.test.ts",
  "evals/llm/test_skill_zoto-help-evals.test.ts",
  "evals/llm/test_skill_zoto-judge-evals.test.ts",
  "evals/llm/test_skill_zoto-judge-spec.test.ts",
  "evals/llm/test_skill_zoto-update-evals.test.ts",
];

/**
 * Non-skill LLM TS pilots that relocate to `<kind>/evals/<name>.test.ts`.
 * Order matches the spec checklist for readability of the dry-run report.
 */
const LLM_TS_TO_RELOCATE: ReadonlyArray<string> = [
  "evals/llm/test_agent_zoto-eval-adviser.test.ts",
  "evals/llm/test_agent_zoto-eval-architect.test.ts",
  "evals/llm/test_agent_zoto-eval-comparer.test.ts",
  "evals/llm/test_agent_zoto-eval-configurer.test.ts",
  "evals/llm/test_agent_zoto-eval-engineer.test.ts",
  "evals/llm/test_agent_zoto-eval-executor.test.ts",
  "evals/llm/test_agent_zoto-eval-generator.test.ts",
  "evals/llm/test_agent_zoto-eval-judge.test.ts",
  "evals/llm/test_agent_zoto-eval-updater.test.ts",
  "evals/llm/test_agent_zoto-spec-generator.test.ts",
  "evals/llm/test_agent_zoto-spec-judge.test.ts",
  "evals/llm/test_command_z-eval-advise.test.ts",
  "evals/llm/test_command_z-eval-configure.test.ts",
  "evals/llm/test_command_z-eval-create.test.ts",
  "evals/llm/test_command_z-eval-execute.test.ts",
  "evals/llm/test_command_z-eval-help.test.ts",
  "evals/llm/test_command_z-eval-judge.test.ts",
  "evals/llm/test_command_z-eval-update.test.ts",
  "evals/llm/test_command_z-eval-workflow.test.ts",
  "evals/llm/test_command_z-spec-create.test.ts",
  "evals/llm/test_command_z-spec-execute.test.ts",
  "evals/llm/test_command_z-spec-judge.test.ts",
];

const ALL_LEGACY_LLM_TS: ReadonlyArray<string> = [
  ...LLM_TS_TO_RELOCATE,
  ...SKILL_LLM_TS_TO_DELETE,
];

/** Legacy declarative-JSON eval artefacts that get wrapped into TS. */
const DECLARATIVE_JSON_INPUTS: ReadonlyArray<string> = [
  "plugins/zoto-eval-system/evals/commands/z-eval-compare.json",
  "plugins/zoto-eval-system/evals/commands/z-eval-init.json",
  "plugins/zoto-eval-system/evals/commands/z-eval-jump.json",
  "plugins/zoto-eval-system/evals/commands/z-eval-operator.json",
  "plugins/zoto-eval-system/evals/commands/z-eval-start.json",
  "plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json",
  "plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json",
  "plugins/zoto-spec-system/evals/commands/z-spec-init.json",
  "plugins/zoto-spec-system/evals/agents/zoto-spec-executor.json",
  "plugins/zoto-spec-system/evals/hooks/zoto-spec-system.json",
  "plugins/zoto-cursor-top/evals/commands/zoto-cursor-top.json",
  "plugins/zoto-cursor-top/evals/agents/zoto-cursor-top-troubleshooter.json",
  ".cursor/evals/commands/sync-plugins.json",
  ".cursor/evals/commands/zoto-create-plugin.json",
  ".cursor/evals/agents/zoto-plugin-manager.json",
  ".cursor/evals/hooks/hooks.json",
];

/**
 * Static-stamped Vitest pilots — per KD-5, 2 relocate alongside the JSON
 * fold and 2 (skill) are deleted outright.
 */
const STATIC_VITEST_INPUTS: ReadonlyArray<{
  path: string;
  action: "delete" | "fold";
  /** Folded targets share their relocate path with the JSON wrap. */
  folds_with_json?: string;
}> = [
  {
    path: "evals/test_agent_agent_zoto-eval-analyser-subagent.test.ts",
    action: "fold",
    folds_with_json:
      "plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json",
  },
  {
    path: "evals/test_agent_agent_zoto-plugin-manager.test.ts",
    action: "fold",
    folds_with_json: ".cursor/evals/agents/zoto-plugin-manager.json",
  },
  {
    path: "evals/test_skill_skill_zoto-create-plugin.test.ts",
    action: "delete",
  },
  {
    path: "evals/test_skill_skill_zoto-help-evals.test.ts",
    action: "delete",
  },
];

/* ---------------------------------------------------------------------- */
/* Types                                                                   */
/* ---------------------------------------------------------------------- */

type TargetKind = "command" | "agent" | "hook" | "skill" | "rule";

interface ManifestTarget {
  id: string;
  kind: TargetKind;
  path: string;
  content_hash: string;
  public_surface?: Record<string, unknown>;
  eval_files?: string[];
}

interface ManifestDoc {
  schema_version: number;
  created_at?: string;
  updated_at?: string;
  git_ref?: string;
  generated_by?: string;
  discovery_config?: Record<string, unknown>;
  targets: ManifestTarget[];
}

interface ResolvedTargetInfo {
  targetId: string;
  kind: TargetKind;
  /** Source path of the primitive (e.g. `plugins/.../commands/foo.md`). */
  sourcePath: string;
  /** Slug after the kind prefix (`command:foo` → `foo`). */
  name: string;
  /** New co-located test path (relative to repo root, POSIX separators). */
  newRelPath: string;
}

interface MovePlan {
  source: string;
  destination: string;
  /** "rewrite-ts" | "wrap-json" — drives the transformation function. */
  kind: "rewrite-ts" | "wrap-json";
  targetId: string;
}

interface DeletePlan {
  path: string;
  reason: "skill-llm-sidecar" | "static-skill-pilot" | "static-fold-superseded";
}

interface MigrationPlan {
  moves: MovePlan[];
  deletions: DeletePlan[];
  /** Pre-existing destinations whose content matches expected emit (skip). */
  alreadyMigrated: string[];
}

interface PlannedDiskWrite {
  path: string;
  body: string;
  reason: "move-destination" | "manifest" | "manifest-history" | "analyser-cache";
}

interface MigrationReport {
  dry_run: boolean;
  moves_planned: number;
  deletions_planned: number;
  already_migrated: number;
  analyser_cache_stamped: number;
  manifest_updated: boolean;
  history_appended: boolean;
  empty_dirs_removed: string[];
  spec_blockers: string[];
}

/* ---------------------------------------------------------------------- */
/* Path / utility helpers                                                  */
/* ---------------------------------------------------------------------- */

function toPosix(p: string): string {
  return p.split(sep).join(posix.sep);
}

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf-8").digest("hex");
}

/** Stable canonical JSON for SHA256 comparisons of individual case objects. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Map a target's manifest entry to the new co-located test path. Mirrors
 * `scripts/eval-stamp.ts#resolveLlmTargetPath` exactly so the migration
 * agrees byte-for-byte with future re-stamps.
 */
function resolveCoLocatedPath(target: {
  kind: TargetKind;
  sourcePath: string;
  name: string;
}): string | null {
  if (target.kind === "skill" || target.kind === "rule") return null;
  if (target.kind === "hook") {
    const dir = dirname(target.sourcePath);
    const base = dir.split(posix.sep).pop() ?? "";
    const hooksDir = base === "hooks" ? dir : posix.join(dir, "hooks");
    return posix.join(hooksDir, "evals", "hooks.test.ts");
  }
  return posix.join(dirname(target.sourcePath), "evals", `${target.name}.test.ts`);
}

/**
 * Relative POSIX import-path string from `fromFile` (a co-located test
 * file path under the repo) to `evals/llm/_shared/`. Returns a path
 * starting with `./` or `../`.
 */
function relativeHarnessImportPath(fromFile: string): string {
  const fromDir = posix.dirname(fromFile);
  const sharedDir = "evals/llm/_shared";
  let rel = posix.relative(fromDir, sharedDir);
  if (rel.length === 0) rel = ".";
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

/* ---------------------------------------------------------------------- */
/* Manifest helpers                                                        */
/* ---------------------------------------------------------------------- */

function loadManifest(repoRoot: string): ManifestDoc {
  const p = join(repoRoot, ".zoto/eval-system/manifest.yml");
  if (!existsSync(p)) {
    throw new Error(`manifest.yml missing at ${p}`);
  }
  const raw = readFileSync(p, "utf-8");
  return YAML.parse(raw) as ManifestDoc;
}

/**
 * Resolve target metadata for every manifest entry whose `kind` is one of
 * command / agent / hook. Returns the `targetId` → `ResolvedTargetInfo`
 * map.
 */
function buildResolvedTargetIndex(
  manifest: ManifestDoc,
): Map<string, ResolvedTargetInfo> {
  const idx = new Map<string, ResolvedTargetInfo>();
  for (const t of manifest.targets ?? []) {
    if (t.kind !== "command" && t.kind !== "agent" && t.kind !== "hook") {
      continue;
    }
    const namePart = t.id.includes(":") ? t.id.split(":").slice(1).join(":") : t.id;
    const newPath = resolveCoLocatedPath({
      kind: t.kind,
      sourcePath: toPosix(t.path),
      name: namePart,
    });
    if (!newPath) continue;
    idx.set(t.id, {
      targetId: t.id,
      kind: t.kind,
      sourcePath: toPosix(t.path),
      name: namePart,
      newRelPath: toPosix(newPath),
    });
  }
  return idx;
}

/* ---------------------------------------------------------------------- */
/* Target-ID derivation from legacy file paths                             */
/* ---------------------------------------------------------------------- */

/**
 * Parse a legacy `evals/llm/test_<kind>_<rest>.test.ts` path into a
 * `<kind>:<rest>` target id. Returns `null` for malformed names.
 */
export function legacyLlmTsToTargetId(legacyPath: string): string | null {
  const base = posix.basename(legacyPath);
  const m = /^test_([a-z]+)_(.+)\.test\.ts$/.exec(base);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

/**
 * Parse a legacy declarative-JSON eval file path into a target id. Hook
 * JSONs live at `<dir>/evals/hooks/<basename>.json` where the basename
 * is the hook target name (e.g. `zoto-eval-system.json`); the special
 * workspace-hook file is `.cursor/evals/hooks/hooks.json` mapping to
 * `hook:cursor-workspace`.
 */
export function legacyJsonToTargetId(legacyPath: string): string | null {
  const parts = legacyPath.split(posix.sep);
  const filename = parts[parts.length - 1] ?? "";
  const parent = parts[parts.length - 2] ?? "";
  const basename = filename.endsWith(".json")
    ? filename.slice(0, -".json".length)
    : null;
  if (!basename) return null;
  if (parent === "commands") return `command:${basename}`;
  if (parent === "agents") return `agent:${basename}`;
  if (parent === "hooks") {
    if (basename === "hooks" && legacyPath.startsWith(".cursor/")) {
      return "hook:cursor-workspace";
    }
    return `hook:${basename}`;
  }
  return null;
}

/**
 * Parse a legacy static-stamped vitest file (`evals/test_<duplicated>_<name>.test.ts`)
 * into a target id.
 */
export function legacyStaticVitestToTargetId(legacyPath: string): string | null {
  const base = posix.basename(legacyPath);
  const m = /^test_([a-z]+)_[a-z]+_(.+)\.test\.ts$/.exec(base);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

/* ---------------------------------------------------------------------- */
/* Marker validation (KD-7)                                                */
/* ---------------------------------------------------------------------- */

/**
 * Confirm a legacy TS file carries the file-level marker on (or near)
 * line 1. Uses the canonical `isGeneratedFile` helper from
 * `_user-case-guards.ts` so the migration cannot drift from the cleanup
 * engine / overwrite gate.
 */
function validateTsMarker(abs: string): true | string {
  if (!existsSync(abs)) return `missing file: ${abs}`;
  if (!isGeneratedFile(abs)) {
    return `missing _meta.generated marker in file body: ${abs}`;
  }
  return true;
}

/**
 * Confirm every case in a legacy declarative-JSON file carries
 * `_meta.generated === true`. Returns `true` on success or a human
 * message describing which case violates the contract.
 */
function validateJsonMarker(abs: string): true | string {
  if (!existsSync(abs)) return `missing file: ${abs}`;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(abs, "utf-8"));
  } catch (err) {
    return `unparseable JSON: ${abs} — ${(err as Error).message}`;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return `top-level value is not an object: ${abs}`;
  }
  const cases = (parsed as { cases?: unknown }).cases;
  if (!Array.isArray(cases) || cases.length === 0) {
    return `no cases array (or empty): ${abs}`;
  }
  for (let i = 0; i < cases.length; i++) {
    if (!isGeneratedCase(cases[i] as never)) {
      return `case[${i}] lacks _meta.generated === true: ${abs}`;
    }
  }
  return true;
}

/* ---------------------------------------------------------------------- */
/* Transformations                                                         */
/* ---------------------------------------------------------------------- */

/**
 * Rewrite a legacy LLM TS file body into the co-located form expected by
 * subtask 06's harness. Only the import paths and the renamed identifiers
 * change — every other byte (including the CASES array, doc comments,
 * `defineLlmEval` invocation body, etc.) is preserved verbatim.
 *
 * Substitutions performed:
 *   1. `./_shared/run-code-strategy-suite.js` → `<harness_rel>/run-llm-suite.js`
 *   2. `./_shared/code-strategy-case.js`      → `<harness_rel>/llm-case.js`
 *   3. `./_shared/askquestion-bridge.js`      → `<harness_rel>/askquestion-bridge.js`
 *   4. `defineLlmCodeEval`                    → `defineLlmEval`
 *   5. `CodeStrategyCaseDefinition`           → `LlmCaseDefinition`
 *   6. `LlmCodeEvalConfig`                    → `LlmEvalConfig` (defensive)
 */
export function rewriteLlmTsBody(
  source: string,
  harnessRel: string,
): string {
  return source
    .split("./_shared/run-code-strategy-suite.js")
    .join(`${harnessRel}/run-llm-suite.js`)
    .split("./_shared/code-strategy-case.js")
    .join(`${harnessRel}/llm-case.js`)
    .split("./_shared/askquestion-bridge.js")
    .join(`${harnessRel}/askquestion-bridge.js`)
    .split("defineLlmCodeEval")
    .join("defineLlmEval")
    .split("CodeStrategyCaseDefinition")
    .join("LlmCaseDefinition")
    .split("LlmCodeEvalConfig")
    .join("LlmEvalConfig");
}

/**
 * Wrap legacy declarative-JSON cases into a co-located TS test body.
 * The cases array is JSON-emitted verbatim (no key re-ordering, no field
 * coercion); a `as unknown as LlmCaseDefinition[]` cast bridges any
 * numeric `id` vs string-typed `LlmCaseDefinition.id` mismatch without
 * mutating case content.
 */
export function wrapDeclarativeJsonAsTs(args: {
  jsonBody: string;
  targetId: string;
  kind: TargetKind;
  name: string;
  harnessRel: string;
}): string {
  const parsed = JSON.parse(args.jsonBody) as {
    target_id?: string;
    cases: unknown[];
  };
  const casesJson = JSON.stringify(parsed.cases, null, 2);
  const indented = casesJson
    .split("\n")
    .map((ln, i) => (i === 0 ? ln : ln))
    .join("\n");
  const lines = [
    "// _meta.generated: true",
    "/**",
    ` * LLM eval for ${args.kind} \`${args.name}\`.`,
    " *",
    " * Generated from the legacy declarative JSON eval payload by",
    " * `scripts/eval-relocate-migration.ts` as part of spec",
    " * `20260526-eval-single-backend-colocated-restructure` (subtask 08).",
    " *",
    " * The literal first line of this file MUST remain `// _meta.generated: true`.",
    " * The cleanup engine and overwrite gate both use",
    " * `plugins/zoto-eval-system/engine/_user-case-guards.ts#isGeneratedFile(path, { strict: true })`",
    " * to decide whether this file is safe to replace or delete. Edit the",
    " * source primitive and re-run `pnpm run eval:update --apply`, not this",
    " * emitted file.",
    " */",
    `import { describe, it, afterAll, expect } from "vitest";`,
    "",
    `import type { LlmCaseDefinition } from "${args.harnessRel}/llm-case.js";`,
    `import { defineLlmEval } from "${args.harnessRel}/run-llm-suite.js";`,
    "",
    `const CASES = ${indented} as unknown as LlmCaseDefinition[];`,
    "",
    "defineLlmEval({",
    `  targetId: "${args.targetId}",`,
    "  cases: CASES,",
    `  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",`,
    `  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "claude-opus-4-8[]",`,
    "  caseTimeoutMs: 180000,",
    "  describe,",
    "  it,",
    "  afterAll,",
    "  expect,",
    "});",
    "",
  ];
  return lines.join("\n");
}

/* ---------------------------------------------------------------------- */
/* Plan construction                                                       */
/* ---------------------------------------------------------------------- */

/**
 * Compute the full migration plan from the manifest + the explicit input
 * lists above. Pure function — performs no disk writes. Validates the
 * `_meta.generated` markers on every input and refuses to plan if a
 * marker is missing (KD-7).
 *
 * The returned plan is the single source of truth for both `--dry-run`
 * report rendering and the `--apply` execution phase.
 */
export function planMigration(
  repoRoot: string,
  manifest: ManifestDoc,
): { plan: MigrationPlan; blockers: string[] } {
  const blockers: string[] = [];
  const moves: MovePlan[] = [];
  const deletions: DeletePlan[] = [];
  const alreadyMigrated: string[] = [];

  const idx = buildResolvedTargetIndex(manifest);

  /**
   * Idempotency helper. Returns true when the destination already exists
   * with a valid generated marker AND the legacy source has already been
   * removed — i.e. a prior `--apply` run already migrated this artefact
   * and the current run has nothing left to do for it.
   */
  function alreadyMigratedTo(destAbs: string, srcAbs: string): boolean {
    if (existsSync(srcAbs)) return false;
    if (!existsSync(destAbs)) return false;
    return isGeneratedFile(destAbs);
  }

  /* --- 1. LLM TS files to relocate --- */
  for (const legacy of LLM_TS_TO_RELOCATE) {
    const targetId = legacyLlmTsToTargetId(legacy);
    if (!targetId) {
      blockers.push(`llm-ts-target-derive: cannot derive target id from ${legacy}`);
      continue;
    }
    const info = idx.get(targetId);
    if (!info) {
      blockers.push(`llm-ts-target-missing: manifest has no entry for ${targetId}`);
      continue;
    }
    const srcAbs = join(repoRoot, legacy);
    const destAbs = join(repoRoot, info.newRelPath);
    if (alreadyMigratedTo(destAbs, srcAbs)) {
      alreadyMigrated.push(info.newRelPath);
      continue;
    }
    const marker = validateTsMarker(srcAbs);
    if (marker !== true) {
      blockers.push(`llm-ts-marker: ${marker}`);
      continue;
    }
    moves.push({
      source: legacy,
      destination: info.newRelPath,
      kind: "rewrite-ts",
      targetId,
    });
  }

  /* --- 2. Skill LLM TS files to delete --- */
  for (const legacy of SKILL_LLM_TS_TO_DELETE) {
    const srcAbs = join(repoRoot, legacy);
    if (!existsSync(srcAbs)) {
      alreadyMigrated.push(legacy);
      continue;
    }
    const marker = validateTsMarker(srcAbs);
    if (marker !== true) {
      blockers.push(`skill-llm-ts-marker: ${marker}`);
      continue;
    }
    deletions.push({ path: legacy, reason: "skill-llm-sidecar" });
  }

  /* --- 3. Declarative JSON files to wrap into TS --- */
  for (const legacy of DECLARATIVE_JSON_INPUTS) {
    if (SKILL_EVAL_PATH_SET.has(legacy)) {
      blockers.push(
        `skill-exemption-violation: declarative input ${legacy} is in the skill exemption list (KD-1)`,
      );
      continue;
    }
    const targetId = legacyJsonToTargetId(legacy);
    if (!targetId) {
      blockers.push(`json-target-derive: cannot derive target id from ${legacy}`);
      continue;
    }
    const info = idx.get(targetId);
    if (!info) {
      blockers.push(`json-target-missing: manifest has no entry for ${targetId}`);
      continue;
    }
    const srcAbs = join(repoRoot, legacy);
    const destAbs = join(repoRoot, info.newRelPath);
    if (alreadyMigratedTo(destAbs, srcAbs)) {
      alreadyMigrated.push(info.newRelPath);
      continue;
    }
    const marker = validateJsonMarker(srcAbs);
    if (marker !== true) {
      blockers.push(`json-marker: ${marker}`);
      continue;
    }
    moves.push({
      source: legacy,
      destination: info.newRelPath,
      kind: "wrap-json",
      targetId,
    });
  }

  /* --- 4. Static-stamped Vitest pilots --- */
  for (const entry of STATIC_VITEST_INPUTS) {
    const srcAbs = join(repoRoot, entry.path);
    if (!existsSync(srcAbs)) {
      alreadyMigrated.push(entry.path);
      continue;
    }
    const marker = validateTsMarker(srcAbs);
    if (marker !== true) {
      blockers.push(`static-vitest-marker: ${marker}`);
      continue;
    }
    deletions.push({
      path: entry.path,
      reason: entry.action === "delete"
        ? "static-skill-pilot"
        : "static-fold-superseded",
    });
  }

  /* --- 5. Conflict detection: deletion overlaps with move destination --- */
  const moveDestSet = new Set(moves.map((m) => m.destination));
  const moveSrcSet = new Set(moves.map((m) => m.source));
  for (const del of deletions) {
    if (moveDestSet.has(del.path)) {
      blockers.push(
        `plan-conflict: deletion path ${del.path} collides with a move destination`,
      );
    }
    if (SKILL_EVAL_PATH_SET.has(del.path)) {
      blockers.push(
        `skill-exemption-violation: planned deletion would touch ${del.path} (KD-1)`,
      );
    }
  }
  for (const m of moves) {
    if (SKILL_EVAL_PATH_SET.has(m.source) || SKILL_EVAL_PATH_SET.has(m.destination)) {
      blockers.push(
        `skill-exemption-violation: planned move touches ${m.source} → ${m.destination} (KD-1)`,
      );
    }
  }

  /* --- 6. Conflict detection: both source and destination present --- */
  for (const m of moves) {
    const destAbs = join(repoRoot, m.destination);
    const srcAbs = join(repoRoot, m.source);
    if (existsSync(destAbs) && existsSync(srcAbs)) {
      const destBody = readFileSync(destAbs, "utf-8");
      const expectedBody = materialiseMoveBody(repoRoot, m);
      if (destBody !== expectedBody) {
        blockers.push(
          `migration-conflict: both source ${m.source} and destination ${m.destination} exist with differing content; abort to avoid clobbering`,
        );
      }
    }
  }

  /* --- 7. Marker check across the entire move source set --- */
  for (const src of moveSrcSet) {
    if (SKILL_EVAL_PATH_SET.has(src)) {
      blockers.push(
        `skill-exemption-violation: move source ${src} is in the skill exemption list (KD-1)`,
      );
    }
  }

  return {
    plan: { moves, deletions, alreadyMigrated },
    blockers,
  };
}

/* ---------------------------------------------------------------------- */
/* Spec-blocker logging                                                    */
/* ---------------------------------------------------------------------- */

function writeSpecBlocker(repoRoot: string, blockers: string[]): string {
  const dir = join(repoRoot, SPEC_DIR);
  mkdirSync(dir, { recursive: true });
  const filename = `.spec-blocker-eval-relocate-migration-${Date.now()}.json`;
  const p = join(dir, filename);
  writeFileSync(
    p,
    JSON.stringify(
      {
        spec: SPEC_ID,
        subtask: "08",
        script: "scripts/eval-relocate-migration.ts",
        reason: "marker-validation-or-plan-conflict",
        blockers,
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf-8",
  );
  return relative(repoRoot, p);
}

/* ---------------------------------------------------------------------- */
/* Body materialisation                                                    */
/* ---------------------------------------------------------------------- */

function materialiseMoveBody(repoRoot: string, m: MovePlan): string {
  const srcAbs = join(repoRoot, m.source);
  const body = readFileSync(srcAbs, "utf-8");
  if (m.kind === "rewrite-ts") {
    const harnessRel = relativeHarnessImportPath(m.destination);
    return rewriteLlmTsBody(body, harnessRel);
  }
  // wrap-json
  const targetId = m.targetId;
  const kind = targetId.split(":")[0] as TargetKind;
  const name = targetId.split(":").slice(1).join(":");
  const harnessRel = relativeHarnessImportPath(m.destination);
  return wrapDeclarativeJsonAsTs({
    jsonBody: body,
    targetId,
    kind,
    name,
    harnessRel,
  });
}

/* ---------------------------------------------------------------------- */
/* Manifest mutation                                                       */
/* ---------------------------------------------------------------------- */

/**
 * Produce the post-migration manifest YAML by repointing every
 * `targets[*].eval_files[*]` entry that matches a legacy source path to
 * the corresponding new co-located destination. Skill `eval_files`
 * remain untouched.
 */
export function rewriteManifestEvalFiles(
  manifest: ManifestDoc,
  moves: MovePlan[],
): ManifestDoc {
  const mapping = new Map<string, string>();
  for (const m of moves) mapping.set(m.source, m.destination);

  // Hooks may have multiple JSON inputs collapsing onto one bundled
  // hooks.test.ts; preserve uniqueness by de-duplicating the result.
  for (const t of manifest.targets ?? []) {
    if (t.kind === "skill") continue;
    if (!t.eval_files) continue;
    const replaced: string[] = [];
    for (const f of t.eval_files) {
      const norm = toPosix(f);
      const newPath = mapping.get(norm) ?? norm;
      if (!replaced.includes(newPath)) replaced.push(newPath);
    }
    t.eval_files = replaced;
  }
  return manifest;
}

function dumpManifestYaml(manifest: ManifestDoc): string {
  // Preserve a stable order: header keys first, then targets.
  return YAML.stringify(manifest, {
    lineWidth: 0,
    aliasDuplicateObjects: false,
  });
}

/* ---------------------------------------------------------------------- */
/* History append                                                          */
/* ---------------------------------------------------------------------- */

function buildHistoryEntryYaml(
  timestampIso: string,
  moves: MovePlan[],
  deletions: DeletePlan[],
  manifest: ManifestDoc,
): string {
  const entryBlock = {
    timestamp: timestampIso,
    spec: SPEC_ID,
    reason: MIGRATION_REASON,
    notes:
      "Dropped llm.strategy and llm.codeFramework from config schema.\n" +
      `Relocated ${moves.length} stamped artefacts to <kind>/evals/<name>.test.ts.\n` +
      `Deleted ${deletions.length} redundant or skill-exempt artefacts.\n` +
      "Stamped _meta.primitive_analysis.invalidate=true on all cached analyser payloads.\n",
    moves: moves
      .slice()
      .sort((a, b) => a.source.localeCompare(b.source))
      .map((m) => ({ from: m.source, to: m.destination })),
    deletions: deletions
      .slice()
      .map((d) => d.path)
      .sort(),
  };
  const wrapped = { history_entry: entryBlock };
  // The history file is a concatenation of distinct YAML documents. Each
  // entry contains the full manifest snapshot at write time so the
  // historic schema remains queryable. We append the new entry as a
  // standalone YAML document using `---` as the doc separator (mirrors
  // the existing on-disk format generated by `zoto-update-evals`).
  const entryDoc = YAML.stringify(
    {
      ...wrapped.history_entry,
      ...manifest,
    },
    { lineWidth: 0, aliasDuplicateObjects: false },
  );
  return `---\n${entryDoc}`;
}

/* ---------------------------------------------------------------------- */
/* Analyser-cache stamping                                                 */
/* ---------------------------------------------------------------------- */

interface AnalyserCacheRecord {
  _meta?: {
    primitive_analysis?: {
      invalidate?: boolean;
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  [k: string]: unknown;
}

function stampAnalyserCache(repoRoot: string, apply: boolean): string[] {
  const cacheDir = join(repoRoot, ".zoto/eval-system/cache/analyser");
  if (!existsSync(cacheDir)) return [];
  const written: string[] = [];
  for (const f of readdirSync(cacheDir)) {
    if (!f.endsWith(".json")) continue;
    const abs = join(cacheDir, f);
    let body: AnalyserCacheRecord;
    try {
      body = JSON.parse(readFileSync(abs, "utf-8")) as AnalyserCacheRecord;
    } catch {
      continue;
    }
    const meta = body._meta ?? {};
    const primAnalysis = (meta.primitive_analysis ?? {}) as Record<string, unknown>;
    if (primAnalysis.invalidate === true) {
      written.push(relative(repoRoot, abs));
      continue;
    }
    primAnalysis.invalidate = true;
    meta.primitive_analysis = primAnalysis as never;
    body._meta = meta;
    if (apply) {
      writeFileSync(abs, JSON.stringify(body, null, 2) + "\n", "utf-8");
    }
    written.push(relative(repoRoot, abs));
  }
  return written;
}

/* ---------------------------------------------------------------------- */
/* Empty-directory cleanup                                                 */
/* ---------------------------------------------------------------------- */

/**
 * Recursively remove now-empty directories produced by the migration.
 * Only operates on the legacy parent directories — never traverses up
 * beyond `evals/llm/`, `<plugin>/evals/`, or `.cursor/evals/`.
 */
function removeEmptyLegacyDirs(repoRoot: string, apply: boolean): string[] {
  const removed: string[] = [];
  const candidates = new Set<string>();

  for (const legacy of [
    ...LLM_TS_TO_RELOCATE,
    ...SKILL_LLM_TS_TO_DELETE,
    ...DECLARATIVE_JSON_INPUTS,
    ...STATIC_VITEST_INPUTS.map((s) => s.path),
  ]) {
    candidates.add(posix.dirname(legacy));
  }

  // Also collect each enclosing `commands` / `agents` / `hooks` parent's
  // immediate parent (the `<plugin>/evals/` or `.cursor/evals/` dir) so
  // we can prune it once its leaves are empty.
  const sweeps: string[] = [];
  for (const d of candidates) {
    sweeps.push(d);
    const parent = posix.dirname(d);
    if (parent.endsWith("/evals") || parent === "evals/llm") sweeps.push(parent);
  }
  sweeps.push("evals/llm");
  sweeps.push("plugins/zoto-eval-system/evals");
  sweeps.push("plugins/zoto-spec-system/evals");
  sweeps.push("plugins/zoto-cursor-top/evals");
  sweeps.push(".cursor/evals");

  // Sort longest-first so deeper dirs are pruned before their parents.
  sweeps.sort((a, b) => b.length - a.length);

  for (const rel of sweeps) {
    const abs = join(repoRoot, rel);
    if (!existsSync(abs)) continue;
    if (!statSync(abs).isDirectory()) continue;
    try {
      const entries = readdirSync(abs);
      if (entries.length === 0) {
        if (apply) rmdirSync(abs);
        removed.push(rel);
      }
    } catch {
      /* tolerate races */
    }
  }
  return removed;
}

/* ---------------------------------------------------------------------- */
/* Lock file                                                               */
/* ---------------------------------------------------------------------- */

function lockPath(repoRoot: string): string {
  return join(repoRoot, ".zoto/eval-system/.migration-in-progress.lock");
}

function acquireLock(repoRoot: string): void {
  const p = lockPath(repoRoot);
  if (existsSync(p)) {
    throw new Error(
      `migration lock present at ${p}; another run is in progress or the previous run aborted. Remove the lock and re-run.`,
    );
  }
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(
    p,
    JSON.stringify(
      {
        started: new Date().toISOString(),
        script: "scripts/eval-relocate-migration.ts",
        pid: process.pid,
      },
      null,
      2,
    ),
    "utf-8",
  );
}

function releaseLock(repoRoot: string): void {
  const p = lockPath(repoRoot);
  if (existsSync(p)) rmSync(p);
}

/* ---------------------------------------------------------------------- */
/* Apply path                                                              */
/* ---------------------------------------------------------------------- */

interface ApplyOptions {
  repoRoot: string;
  manifest: ManifestDoc;
  plan: MigrationPlan;
}

interface ApplyResult {
  written_destinations: string[];
  deleted_sources: string[];
  manifest_updated: boolean;
  history_appended: boolean;
  analyser_cache_stamped: string[];
  empty_dirs_removed: string[];
}

function applyMigration(opts: ApplyOptions): ApplyResult {
  const { repoRoot, manifest, plan } = opts;

  /* 0. Idempotency short-circuit: if nothing to move or delete AND the
   *    manifest already lists the post-migration co-located paths, this
   *    is a no-op apply. Stamping the analyser cache stays idempotent so
   *    we can still backfill missed invalidations, but we skip the
   *    manifest+history+empty-dir writes entirely. */
  const hasFsWork = plan.moves.length > 0 || plan.deletions.some((d) => {
    return existsSync(join(repoRoot, d.path));
  });
  const expectedManifest = rewriteManifestEvalFiles(structuredCloneManifest(manifest), plan.moves);
  const currentManifestPath = join(repoRoot, ".zoto/eval-system/manifest.yml");
  const currentManifestBody = readFileSync(currentManifestPath, "utf-8");
  const expectedManifestBody = dumpManifestYaml(expectedManifest);
  const manifestNeedsRewrite = currentManifestBody !== expectedManifestBody;

  if (!hasFsWork && !manifestNeedsRewrite) {
    const stamped = stampAnalyserCache(repoRoot, true);
    const emptyDirs = removeEmptyLegacyDirs(repoRoot, true);
    return {
      written_destinations: [],
      deleted_sources: [],
      manifest_updated: false,
      history_appended: false,
      analyser_cache_stamped: stamped,
      empty_dirs_removed: emptyDirs,
    };
  }

  /* 1. Materialise every destination body up-front (in memory) so any
   *    failure happens BEFORE we touch disk for the first time. */
  const destBodies = new Map<string, string>();
  for (const m of plan.moves) {
    const body = materialiseMoveBody(repoRoot, m);
    destBodies.set(m.destination, body);
  }

  /* 2. Write all destinations. */
  const written: string[] = [];
  for (const m of plan.moves) {
    const destAbs = join(repoRoot, m.destination);
    mkdirSync(dirname(destAbs), { recursive: true });
    const body = destBodies.get(m.destination)!;
    if (existsSync(destAbs)) {
      const existing = readFileSync(destAbs, "utf-8");
      if (existing === body) continue;
    }
    writeFileSync(destAbs, body, "utf-8");
    written.push(m.destination);
  }

  /* 3. Update the manifest in-memory + write atomically. */
  expectedManifest.updated_at = new Date().toISOString();
  expectedManifest.generated_by = "scripts/eval-relocate-migration.ts";
  const newManifestBody = dumpManifestYaml(expectedManifest);
  writeFileSync(currentManifestPath, newManifestBody, "utf-8");

  /* 4. Append exactly ONE entry to the history. */
  const historyPath = join(repoRoot, ".zoto/eval-system/manifest.history.yml");
  const historyEntry = buildHistoryEntryYaml(
    expectedManifest.updated_at,
    plan.moves,
    plan.deletions,
    expectedManifest,
  );
  const previous = existsSync(historyPath) ? readFileSync(historyPath, "utf-8") : "";
  const separator = previous.endsWith("\n") || previous === "" ? "" : "\n";
  writeFileSync(historyPath, previous + separator + historyEntry, "utf-8");

  /* 5. Stamp invalidate=true on every cached analyser payload. */
  const stamped = stampAnalyserCache(repoRoot, true);

  /* 6. Delete legacy sources (after every destination is on disk). */
  const deleted: string[] = [];
  for (const m of plan.moves) {
    const srcAbs = join(repoRoot, m.source);
    if (!existsSync(srcAbs)) continue;
    if (SKILL_EVAL_PATH_SET.has(m.source)) {
      throw new Error(
        `skill-exemption-violation: refusing to delete ${m.source} (KD-1)`,
      );
    }
    rmSync(srcAbs);
    deleted.push(m.source);
  }
  for (const del of plan.deletions) {
    if (SKILL_EVAL_PATH_SET.has(del.path)) {
      throw new Error(
        `skill-exemption-violation: refusing to delete ${del.path} (KD-1)`,
      );
    }
    const abs = join(repoRoot, del.path);
    if (existsSync(abs)) {
      rmSync(abs);
      deleted.push(del.path);
    }
  }

  /* 7. Remove now-empty directories. */
  const emptyDirs = removeEmptyLegacyDirs(repoRoot, true);

  return {
    written_destinations: written,
    deleted_sources: deleted,
    manifest_updated: true,
    history_appended: true,
    analyser_cache_stamped: stamped,
    empty_dirs_removed: emptyDirs,
  };
}

/** Cheap deep clone for the manifest doc (YAML scalars only). */
function structuredCloneManifest(m: ManifestDoc): ManifestDoc {
  return JSON.parse(JSON.stringify(m)) as ManifestDoc;
}

/* ---------------------------------------------------------------------- */
/* CLI                                                                     */
/* ---------------------------------------------------------------------- */

interface CliOptions {
  apply: boolean;
  repoRoot: string;
}

function parseArgs(argv: string[]): CliOptions {
  let apply = false;
  let repoRoot = DEFAULT_REPO_ROOT;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") {
      apply = true;
    } else if (a === "--dry-run") {
      apply = false;
    } else if (a === "--repo-root") {
      repoRoot = resolve(argv[++i] ?? "");
    } else if (a === "--force") {
      throw new Error(
        "--force is intentionally unsupported (KD-7); the _meta.generated gates are non-negotiable.",
      );
    } else if (a === "--help" || a === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`unknown flag: ${a}`);
    }
  }
  return { apply, repoRoot };
}

function printUsage(): void {
  process.stdout.write(
    [
      "Usage: tsx scripts/eval-relocate-migration.ts [--dry-run|--apply] [--repo-root <path>]",
      "",
      "  --dry-run     (default) print the migration plan as JSON without touching disk",
      "  --apply       execute the migration",
      "  --repo-root   override the repo root (defaults to the parent of this script)",
      "  --help        show this message",
      "",
      "No --force flag is provided: KD-7 enforces the _meta.generated marker on every input.",
    ].join("\n") + "\n",
  );
}

/**
 * Render a deterministic, JSON-friendly plan summary for the dry-run
 * console output. The shape mirrors the apply-time {@link ApplyResult}
 * so log diffs across runs stay readable.
 */
function renderPlanReport(
  repoRoot: string,
  plan: MigrationPlan,
  analyserStampPaths: string[],
): MigrationReport {
  return {
    dry_run: true,
    moves_planned: plan.moves.length,
    deletions_planned: plan.deletions.length,
    already_migrated: plan.alreadyMigrated.length,
    analyser_cache_stamped: analyserStampPaths.length,
    manifest_updated: false,
    history_appended: false,
    empty_dirs_removed: [],
    spec_blockers: [],
  };
}

export interface RunMainResult {
  exitCode: number;
  plan: MigrationPlan;
  blockers: string[];
  applied?: ApplyResult;
  blockerLog?: string;
}

export async function runMain(argv: string[]): Promise<RunMainResult> {
  const opts = parseArgs(argv);
  const repoRoot = opts.repoRoot;
  if (!existsSync(join(repoRoot, ".zoto/eval-system/manifest.yml"))) {
    throw new Error(
      `invalid repo root: ${repoRoot} (no .zoto/eval-system/manifest.yml found)`,
    );
  }

  const manifest = loadManifest(repoRoot);
  const { plan, blockers } = planMigration(repoRoot, manifest);

  if (blockers.length > 0) {
    const logRel = writeSpecBlocker(repoRoot, blockers);
    process.stderr.write(
      JSON.stringify(
        {
          status: "fatal",
          blockers,
          blocker_log: logRel,
        },
        null,
        2,
      ) + "\n",
    );
    return { exitCode: 1, plan, blockers, blockerLog: logRel };
  }

  if (!opts.apply) {
    const analyserPaths = stampAnalyserCache(repoRoot, false);
    const report = renderPlanReport(repoRoot, plan, analyserPaths);
    const payload = {
      ...report,
      moves: plan.moves.map((m) => ({
        from: m.source,
        to: m.destination,
        kind: m.kind,
        target_id: m.targetId,
      })),
      deletions: plan.deletions.map((d) => ({
        path: d.path,
        reason: d.reason,
      })),
      already_migrated_paths: plan.alreadyMigrated,
      analyser_cache_paths: analyserPaths,
    };
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    return { exitCode: 0, plan, blockers: [] };
  }

  acquireLock(repoRoot);
  try {
    const applied = applyMigration({ repoRoot, manifest, plan });
    const payload: MigrationReport & {
      written: string[];
      deleted: string[];
      analyser_cache_paths: string[];
    } = {
      dry_run: false,
      moves_planned: plan.moves.length,
      deletions_planned: plan.deletions.length,
      already_migrated: plan.alreadyMigrated.length,
      analyser_cache_stamped: applied.analyser_cache_stamped.length,
      manifest_updated: applied.manifest_updated,
      history_appended: applied.history_appended,
      empty_dirs_removed: applied.empty_dirs_removed,
      spec_blockers: [],
      written: applied.written_destinations,
      deleted: applied.deleted_sources,
      analyser_cache_paths: applied.analyser_cache_stamped,
    };
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    return { exitCode: 0, plan, blockers: [], applied };
  } finally {
    releaseLock(repoRoot);
  }
}

/* ---------------------------------------------------------------------- */
/* Testing helpers (re-exported)                                           */
/* ---------------------------------------------------------------------- */

export const __testing = {
  SKILL_EVALS_JSON_PATHS,
  LLM_TS_TO_RELOCATE,
  SKILL_LLM_TS_TO_DELETE,
  DECLARATIVE_JSON_INPUTS,
  STATIC_VITEST_INPUTS,
  legacyLlmTsToTargetId,
  legacyJsonToTargetId,
  legacyStaticVitestToTargetId,
  resolveCoLocatedPath,
  relativeHarnessImportPath,
  rewriteLlmTsBody,
  wrapDeclarativeJsonAsTs,
  rewriteManifestEvalFiles,
  planMigration,
  loadManifest,
  applyMigration,
  stampAnalyserCache,
  removeEmptyLegacyDirs,
  buildHistoryEntryYaml,
  canonicalJson,
  sha256,
  validateTsMarker,
  validateJsonMarker,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  runMain(process.argv.slice(2)).then(
    (r) => process.exit(r.exitCode),
    (err) => {
      process.stderr.write(
        JSON.stringify(
          {
            status: "exception",
            message: (err as Error).message,
            stack: (err as Error).stack,
          },
          null,
          2,
        ) + "\n",
      );
      process.exit(2);
    },
  );
}
