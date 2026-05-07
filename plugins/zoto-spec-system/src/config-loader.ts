import { Ajv, type ErrorObject } from "ajv";
import addFormatsImport from "ajv-formats";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCHEMA_PATH = join(__dirname, "..", "templates", "schema", "config.schema.json");
const TEMPLATE_CONFIG_PATH = join(__dirname, "..", "templates", "config.json");

export interface SpecSystemConfig {
  unitOfWork: string;
  specsDir: string;
  workDir: string;
  spec: { maxSubtasks: number; parallelLimit: number; adversarialVerification: boolean };
  subagents: {
    default: { tokenBudget: number; model?: string };
    generator?: { tokenBudget?: number; model?: string };
    executor?: { tokenBudget?: number; model?: string };
    judge?: { tokenBudget?: number; model?: string };
    subtask?: { tokenBudget?: number; model?: string };
  };
  aggregator: {
    enabled: boolean;
    pollIntervalMs: number;
    debounceMs: number;
    outputs: { specStatusMd: string; specStatusYml: string };
  };
  hooks?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export interface LoadResult {
  config: SpecSystemConfig;
  mtimeMs: number;
  reloaded: boolean;
  path: string;
}

export class ConfigValidationError extends Error {
  readonly errors: ErrorObject[];

  constructor(errors: ErrorObject[]) {
    super("Invalid spec system config");
    this.name = "ConfigValidationError";
    this.errors = errors;
  }
}

const ajv = new Ajv({ allErrors: true, strict: false, useDefaults: true });
const addFormats = addFormatsImport as unknown as (ajv: InstanceType<typeof Ajv>) => void;
addFormats(ajv);

const schemaJson = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8")) as object;
const validateConfig = ajv.compile(schemaJson);

let templateBaseline: SpecSystemConfig | undefined;

function readTemplateBaseline(): SpecSystemConfig {
  if (!templateBaseline) {
    templateBaseline = JSON.parse(readFileSync(TEMPLATE_CONFIG_PATH, "utf-8")) as SpecSystemConfig;
  }
  return templateBaseline;
}

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

/**
 * Resolve the canonical config path under a repo root.
 */
export function configPathForRepo(repoRoot: string): string {
  return join(repoRoot, ".zoto", "spec-system", "config.yml");
}

export interface MigrationResult {
  migrated: boolean;
  from?: string;
  to?: string;
  conflict?: boolean;
}

/**
 * Migrate a legacy `.zoto-spec-system/` directory to `.zoto/spec-system/`.
 *
 * - Moves the entire directory tree.
 * - Renames `config.json` → `config.yml` (JSON is valid YAML 1.2).
 * - If both old and new exist, does nothing and returns `conflict: true`.
 * - Safe to call repeatedly (no-op when already migrated).
 */
export function migrateFromLegacy(repoRoot: string): MigrationResult {
  const legacyDir = join(repoRoot, ".zoto-spec-system");
  const newDir = join(repoRoot, ".zoto", "spec-system");

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

export function loadConfig(repoRoot: string, prevMtimeMs?: number): LoadResult {
  migrateFromLegacy(repoRoot);

  const path = configPathForRepo(repoRoot);
  const baseline = readTemplateBaseline();

  if (!existsSync(path)) {
    const config = structuredClone(baseline) as SpecSystemConfig;
    const draft = structuredClone(config) as unknown as Record<string, unknown>;
    if (!validateConfig(draft)) {
      throw new ConfigValidationError(validateConfig.errors ?? []);
    }
    return {
      config: draft as unknown as SpecSystemConfig,
      mtimeMs: 0,
      reloaded: false,
      path,
    };
  }

  let raw: unknown;
  try {
    raw = YAML.parse(readFileSync(path, "utf-8"));
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }

  // An empty file or a file with only commented-out keys parses to null/undefined.
  // Treat that as "use the baseline" — same shape as a missing file but with mtime.
  if (raw === null || raw === undefined) {
    raw = {};
  }

  if (!isPlainObject(raw)) {
    throw new ConfigValidationError([
      { keyword: "type", message: "config root must be a YAML mapping (object)", params: {} } as ErrorObject,
    ]);
  }

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
    config: draft as unknown as SpecSystemConfig,
    mtimeMs,
    reloaded,
    path,
  };
}

export function resolveSubagentBudget(
  cfg: SpecSystemConfig,
  role: "generator" | "executor" | "judge" | "subtask",
): { tokenBudget: number; model: string | undefined } {
  const roleCfg = cfg.subagents[role];
  const def = cfg.subagents.default;
  return {
    tokenBudget: roleCfg?.tokenBudget ?? def.tokenBudget,
    model: roleCfg?.model ?? def.model,
  };
}
