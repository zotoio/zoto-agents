import Ajv, { type ErrorObject } from "ajv";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

import {
  resolveEvalPaths,
  type EvalLayoutMode,
  type EvalPaths,
} from "./paths.js";

export type { EvalLayoutMode, EvalPaths, HostLayout };
export type { ResolveEvalPathsOptions, ResolvePluginRootOptions } from "./paths.js";
export {
  resolveEvalPaths,
  resolvePluginRoot,
  resultSchemaPath,
  analyserSchemaPath,
  analyserAgentPath,
  resolveHostRepoRoot,
} from "./paths.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCHEMA_PATH = join(__dirname, "..", "templates", "schema", "config.schema.json");
const TEMPLATE_CONFIG_PATH = join(__dirname, "..", "templates", "config.json");

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type StaticFramework = "pytest" | "vitest" | "jest";
export type LlmRuntime = "tsx" | "node";
export type ModelId = "composer-2.5" | "claude-opus-4-8[]" | "sonnet";
export type DiscoveryTarget = "skill" | "command" | "agent" | "hook" | "cli" | "lib";
export type HostLayout = "plugin" | "ejected";

export interface EvalSystemConfig {
  hostLayout: HostLayout;
  evalsDir: string;
  skillsRoots: string[];
  discoveryTargets: DiscoveryTarget[];
  ignore: string[];
  static: { framework: StaticFramework };
  llm: {
    runtime: LlmRuntime;
    model: { id: ModelId };
  };
  judgeModel: ModelId;
  manualChecklists: { enabled: boolean };
  additionalAutomation: string[];
  analyser: { concurrency: number; maxCallsPerInvocation: number };
  runs: { retention: number };
  update: {
    criticalChangeRules: {
      addedTargetWithoutCoverage: boolean;
      removedTargetWithActiveCases: boolean;
      skillFrontmatterChange: boolean;
      publicSurfaceChange: boolean;
      promptTemplateChange: boolean;
    };
    preserveUserAuthoredCases: true;
    writeMetaMarker: true;
    manifestPath: string;
    historyPath: string;
    rediscoverWithSameDefaults: boolean;
    checkExitCodeOnCriticalDrift: number;
    failOnNoAnalyserInCI: boolean;
  };
}

export interface LoadResult {
  config: EvalSystemConfig;
  mtimeMs: number;
  reloaded: boolean;
  path: string;
  /** True when `hostLayout` was present in the on-disk YAML (or baseline when config is missing). */
  hostLayoutExplicit: boolean;
}

export class ConfigValidationError extends Error {
  readonly errors: ErrorObject[];

  constructor(errors: ErrorObject[]) {
    super("Invalid eval system config");
    this.name = "ConfigValidationError";
    this.errors = errors;
  }
}

/* ------------------------------------------------------------------ */
/*  AJV — compiled once at module scope                                */
/* ------------------------------------------------------------------ */

const AjvCtor = (Ajv as unknown as { default?: typeof Ajv }).default ?? Ajv;
const ajv = new AjvCtor({ allErrors: true, strict: false, useDefaults: true });
const schemaJson = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8")) as object;
const validateConfig = ajv.compile(schemaJson);

/* ------------------------------------------------------------------ */
/*  Template baseline (internal defaults from config.json)             */
/* ------------------------------------------------------------------ */

let templateBaseline: EvalSystemConfig | undefined;

function readTemplateBaseline(): EvalSystemConfig {
  if (!templateBaseline) {
    templateBaseline = JSON.parse(readFileSync(TEMPLATE_CONFIG_PATH, "utf-8")) as EvalSystemConfig;
  }
  return templateBaseline;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const baseVal = base[key];
    if (isPlainObject(baseVal) && isPlainObject(value)) {
      out[key] = deepMerge(baseVal as Record<string, unknown>, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Migration                                                          */
/* ------------------------------------------------------------------ */

export interface MigrationResult {
  migrated: boolean;
  from?: string;
  to?: string;
  conflict?: boolean;
}

/**
 * Migrate a legacy `.zoto-eval-system/` directory to `.zoto/eval-system/`.
 *
 * - Moves the entire directory tree.
 * - Converts `config.json` content to proper YAML and writes `config.yml`.
 * - If both old and new exist, does nothing and returns `conflict: true`.
 * - Safe to call repeatedly (no-op when already migrated).
 */
export function migrateFromLegacy(repoRoot: string): MigrationResult {
  const legacyDir = join(repoRoot, ".zoto-eval-system");
  const newDir = join(repoRoot, ".zoto", "eval-system");

  if (!existsSync(legacyDir)) {
    return { migrated: false };
  }

  if (existsSync(newDir)) {
    return { migrated: false, conflict: true, from: legacyDir, to: newDir };
  }

  mkdirSync(dirname(newDir), { recursive: true });
  renameSync(legacyDir, newDir);

  const oldConfig = join(newDir, "config.json");
  const newConfig = join(newDir, "config.yml");
  if (existsSync(oldConfig) && !existsSync(newConfig)) {
    try {
      const json = JSON.parse(readFileSync(oldConfig, "utf-8"));
      writeFileSync(newConfig, YAML.stringify(json), "utf-8");
      unlinkSync(oldConfig);
    } catch {
      renameSync(oldConfig, newConfig);
    }
  }

  return { migrated: true, from: legacyDir, to: newDir };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function configPathForRepo(repoRoot: string): string {
  return join(repoRoot, ".zoto", "eval-system", "config.yml");
}

/** Load config and resolve all eval-system paths for the host repo. */
export function loadEvalPaths(repoRoot: string): EvalPaths {
  const loaded = loadEvalConfig(repoRoot);
  return resolveEvalPaths(repoRoot, loaded.config, loaded.path, {
    hostLayoutExplicit: loaded.hostLayoutExplicit,
  });
}

export function loadEvalConfig(repoRoot: string, prevMtimeMs?: number): LoadResult {
  migrateFromLegacy(repoRoot);

  const path = configPathForRepo(repoRoot);
  const baseline = readTemplateBaseline();

  if (!existsSync(path)) {
    const config = structuredClone(baseline) as EvalSystemConfig;
    const draft = structuredClone(config) as unknown as Record<string, unknown>;
    if (!validateConfig(draft)) {
      throw new ConfigValidationError(validateConfig.errors ?? []);
    }
    return {
      config: draft as unknown as EvalSystemConfig,
      mtimeMs: 0,
      reloaded: false,
      path,
      hostLayoutExplicit: true,
    };
  }

  let raw: unknown;
  try {
    raw = YAML.parse(readFileSync(path, "utf-8"));
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }

  if (raw === null || raw === undefined) {
    raw = {};
  }

  if (!isPlainObject(raw)) {
    throw new ConfigValidationError([
      { keyword: "type", message: "config root must be a YAML mapping (object)", params: {} } as ErrorObject,
    ]);
  }

  const hostLayoutExplicit = isPlainObject(raw) && raw.hostLayout !== undefined;

  const merged = deepMerge(
    structuredClone(baseline) as unknown as Record<string, unknown>,
    raw,
  );
  const draft = structuredClone(merged);

  if (!validateConfig(draft)) {
    throw new ConfigValidationError(validateConfig.errors ?? []);
  }

  const mtimeMs = statSync(path).mtimeMs;
  const reloaded = mtimeMs !== prevMtimeMs;

  return {
    config: draft as unknown as EvalSystemConfig,
    mtimeMs,
    reloaded,
    path,
    hostLayoutExplicit,
  };
}
