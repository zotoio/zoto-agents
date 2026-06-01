/**
 * Vitest / Vite plugin: load non-skill ** /evals/*.json eval files as
 * in-memory ES modules so Vitest discovers and runs the cases natively
 * — no ephemeral .tmp.ts shim files written to disk.
 *
 * Spec: specs/20260527-evals-json-first-migration/spec-evals-json-first-migration-20260527.md
 * Subtask: subtask-02-evals-json-first-migration-vitest-json-loader-20260527.md
 *
 * ## Virtual module flow
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ Vitest discovers   <kind>/evals/<name>.json │
 *   └──────────────────────┬───────────────────────┘
 *                          │   resolveId(source, importer)
 *                          ▼
 *   ┌──────────────────────────────────────────────┐
 *   │ Plugin returns   \0zoto-eval-json:<absPath> │
 *   │ (\0-prefix tells Vite/Rollup this is virtual) │
 *   └──────────────────────┬───────────────────────┘
 *                          │   load(virtualId)
 *                          ▼
 *   ┌──────────────────────────────────────────────┐
 *   │ Plugin reads + parses JSON from <absPath>    │
 *   │ Synthesises an ES module that:               │
 *   │   • imports defineLlmEval from the harness │
 *   │   • imports describe, it, afterAll, expect │
 *   │     from vitest                            │
 *   │   • calls defineLlmEval({ ... cases, ...,   │
 *   │     __sourcePath: <absPath> })              │
 *   └──────────────────────┬───────────────────────┘
 *                          │   Vite/Vitest transforms + executes
 *                          ▼
 *   ┌──────────────────────────────────────────────┐
 *   │ The case suite runs inside the existing      │
 *   │ Vitest reporter pipeline. Runner cases       │
 *   │ (subtask 03) dispatch via dynamic import     │
 *   │ relative to __sourcePath.                  │
 *   └──────────────────────────────────────────────┘
 *
 * ## Discrimination rule
 *
 * The shared isNonSkillEvalJsonPath helper classifies absolute paths
 * as **non-skill eval JSON** when:
 *   - the file ends in .json, AND
 *   - the file's parent directory is named evals, AND
 *   - it is NOT a Cursor-spec skill file (evals.json filename inside a
 *     skills/<name>/evals/ chain).
 *
 * The reporter classifiers in subtask 06 (isLlmCoLocatedJsonPath) re-use
 * this helper so the loader and the reporter agree on the discrimination
 * rule. Defence-in-depth: the load hook ALSO checks for a top-level
 * skill_name field and bails (return null) if present, so a
 * misnamed file or a path-classification edge case cannot accidentally
 * load a skill eval through the LLM harness.
 *
 * ## Why synthesise text vs. a runtime adapter
 *
 * Vitest discovers tests by inspecting the transformation **output**, so
 * the plugin MUST return real ES-module source text containing the
 * describe/it graph. A naive runtime adapter that imports the JSON
 * via import * as cases from "./file.json" assert { type: "json" } and
 * iterates would never register tests with Vitest's harness.
 *
 * ## Source maps
 *
 * Currently we emit only the lightweight debugging hint
 * //# sourceURL=<file://abs-path>, which is enough for Vite/Vitest to
 * point error stacks at the original JSON file. A full v3 source map
 * pinning every synthesised line back to the JSON file's coordinates is
 * a follow-up — see the Work Log on the subtask status file.
 */
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { Plugin } from "vitest/config";

/* ---------------------------------------------------------------------- */
/* Constants                                                              */
/* ---------------------------------------------------------------------- */

/** Plugin name registered with Vite/Rollup. */
export const PLUGIN_NAME = "zoto-eval-system:json-loader";

/**
 * Virtual-module id prefix. `\0` is the Rollup convention for virtual
 * modules; Vite (which Vitest 4.x is built on) honours it by routing
 * the id directly through plugin `load` hooks without filesystem reads.
 */
export const VIRTUAL_PREFIX = "\0zoto-eval-json:";

/**
 * Suffix appended to the virtual id so the resulting string does NOT
 * end in `.json`. Vite's built-in `vite:json` plugin filters on
 * `/\.json(?:$|\?)/`; without the suffix, it would intercept the
 * loader's synthesised module text and try to `JSON.parse` it
 * (failing, because the synthesised module is JS).
 *
 * The suffix is opaque — `decodeVirtualEvalJsonId` strips it before
 * returning the underlying `.json` path. The `.js` extension is the
 * cheapest token that bypasses `jsonExtRE` without triggering any
 * other built-in transform (CSS, asset, worker, etc.).
 *
 * Spec: `20260527-evals-json-first-migration`, subtask 06 smoke test.
 */
export const VIRTUAL_SUFFIX = ".js";

/**
 * Construct the virtual module id for a non-skill eval JSON file. Use
 * this everywhere instead of concatenating `VIRTUAL_PREFIX + absPath`
 * by hand so the `VIRTUAL_SUFFIX` is appended consistently.
 */
export function buildVirtualEvalJsonId(absPath: string): string {
  return `${VIRTUAL_PREFIX}${absPath}${VIRTUAL_SUFFIX}`;
}

/**
 * Strip the virtual prefix + suffix from a virtual id and return the
 * underlying absolute `.json` path. Returns `null` when `id` is not a
 * virtual eval-json id. Mirrors the `decodeVirtualEvalJsonId` helper in
 * `path-classifiers.ts` so callers that import only the loader can
 * decode ids without the extra dependency.
 */
export function unwrapVirtualEvalJsonId(id: string): string | null {
  if (typeof id !== "string" || !id.startsWith(VIRTUAL_PREFIX)) return null;
  let absPath = id.slice(VIRTUAL_PREFIX.length);
  if (absPath.endsWith(VIRTUAL_SUFFIX)) {
    absPath = absPath.slice(0, -VIRTUAL_SUFFIX.length);
  }
  return absPath.length > 0 ? absPath : null;
}

/* ---------------------------------------------------------------------- */
/* Logger / path-resolution helpers                                       */
/* ---------------------------------------------------------------------- */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Default harness module path embedded in the synthesised module. Uses
 * the `.js` extension (NodeNext-style) — Vite/Vitest resolves `.js` ↔
 * `.ts` transparently at runtime, matching the existing import style
 * in `evals/llm/_shared/index.ts`.
 */
const DEFAULT_HARNESS_PATH = path.resolve(__dirname, "./run-llm-suite.js");

/** Minimal logger surface — `console` satisfies it. */
export interface EvalJsonLoaderLogger {
  warn(message: string): void;
}

/** Optional configuration for the loader plugin. */
export interface EvalJsonLoaderOptions {
  /**
   * Absolute path (or specifier) the synthesised module imports
   * `defineLlmEval` from. Defaults to the harness adjacent to this
   * loader (`./run-llm-suite.js`). Override for tests.
   */
  harnessModulePath?: string;
  /**
   * Logger used for defence-in-depth warnings. Defaults to the global
   * `console`. Override for tests that want to capture warnings.
   */
  logger?: EvalJsonLoaderLogger;
  /**
   * When `true`, the synthesised module text uses `JSON.stringify(cases, null, 2)`
   * for deterministic whitespace. Defaults to `true`. Exposed mostly so
   * future profiling tasks can A/B compact vs. pretty serialisation.
   */
  prettyPrint?: boolean;
}

/* ---------------------------------------------------------------------- */
/* Path discrimination — shared with reporter classifiers (subtask 06)    */
/* ---------------------------------------------------------------------- */

/**
 * Returns `true` when `absPath` points to a non-skill eval JSON file —
 * a file directly under an `evals/` directory whose name is NOT the
 * Cursor-spec skill shape (`evals.json` inside a `skills/<name>/evals/`
 * chain).
 *
 * Skill files match: contains `/skills/<name>/evals/evals.json`
 * (`evals.json` filename + `skills` segment ancestor).
 *
 * Non-skill match: anything under a non-skill evals/name.json path that is NOT a
 * skill file. The function does **not** consult the file system — only
 * the path string is inspected, so callers can use it for both
 * filesystem entries and synthetic / virtual ids.
 *
 * Path separators are normalised to forward slashes so the helper works
 * identically on POSIX and Windows.
 */
export function isNonSkillEvalJsonPath(absPath: string): boolean {
  if (typeof absPath !== "string" || absPath.length === 0) return false;
  const normalised = absPath.replace(/\\/g, "/");
  if (!normalised.endsWith(".json")) return false;

  const segments = normalised.split("/").filter((s) => s.length > 0);
  if (segments.length < 2) return false;

  const fileName = segments[segments.length - 1];
  const parentDir = segments[segments.length - 2];

  /* File must be directly inside a directory literally named `evals`. */
  if (parentDir !== "evals") return false;

  /* Skill exclusion: the file is `evals.json` AND there is a `skills`
   * segment somewhere above the `evals` directory. */
  if (fileName === "evals.json") {
    const ancestors = segments.slice(0, segments.length - 2);
    if (ancestors.includes("skills")) return false;
  }

  return true;
}

/**
 * Returns `true` for Cursor-spec skill eval files (`skills/<name>/evals/evals.json`).
 * These run via the pytest static backend — when Vitest discovers them anyway,
 * the loader synthesises a skipped suite instead of failing discovery.
 */
export function isSkillEvalJsonPath(absPath: string): boolean {
  if (typeof absPath !== "string" || absPath.length === 0) return false;
  const normalised = absPath.replace(/\\/g, "/");
  if (!normalised.endsWith(".json")) return false;

  const segments = normalised.split("/").filter((s) => s.length > 0);
  if (segments.length < 3) return false;

  const fileName = segments[segments.length - 1];
  const parentDir = segments[segments.length - 2];
  if (fileName !== "evals.json" || parentDir !== "evals") return false;

  return segments.slice(0, segments.length - 2).includes("skills");
}

function synthesiseSkillEvalSkipModule(absPath: string): string {
  const sourceUrl = pathToFileURL(absPath).href;
  const label = JSON.stringify(absPath);
  return [
    `// @sourceFile: ${absPath}`,
    `//# sourceURL=${sourceUrl}`,
    `/* Synthesised by ${PLUGIN_NAME} — skill evals.json uses pytest, not LLM vitest. */`,
    "",
    `import { describe, it } from "vitest";`,
    "",
    `describe(${label}, () => {`,
    `  it.skip("skill evals.json runs via pytest static backend, not LLM vitest", () => {});`,
    `});`,
    "",
  ].join("\n");
}

/* ---------------------------------------------------------------------- */
/* Module synthesis                                                       */
/* ---------------------------------------------------------------------- */

interface ParsedEvalFile {
  targetId: string;
  cases: unknown[];
  modelId: string | null;
  judgeModel: string | null;
  caseTimeoutMs: number | null;
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function pickInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

/**
 * Validate the parsed JSON document and extract the loader-relevant
 * fields. Throws with the absolute path attached on any structural
 * error so Vitest's error surface points users at the JSON file.
 */
function extractEvalFields(absPath: string, parsed: unknown): ParsedEvalFile {
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(
      `${PLUGIN_NAME}: JSON eval file '${absPath}' must be an object ` +
        `(got ${Array.isArray(parsed) ? "array" : typeof parsed}).`,
    );
  }
  const file = parsed as Record<string, unknown>;

  const targetId = pickString(file.target_id);
  if (!targetId) {
    throw new Error(
      `${PLUGIN_NAME}: JSON eval file '${absPath}' is missing required ` +
        `string field 'target_id' (e.g. 'command:foo').`,
    );
  }

  const cases = Array.isArray(file.cases) ? file.cases : null;
  if (cases === null || cases.length === 0) {
    throw new Error(
      `${PLUGIN_NAME}: JSON eval file '${absPath}' has no 'cases' — ` +
        `case.schema.json requires a non-empty array.`,
    );
  }

  /* Loader supports both top-level fields (canonical eval-file schema)
   * AND `_meta` mirrors, since subtask 01's spec narrative explicitly
   * referenced both locations. Top-level wins. */
  const meta =
    typeof file._meta === "object" && file._meta !== null
      ? (file._meta as Record<string, unknown>)
      : {};

  const modelId = pickString(file.model_id) ?? pickString(meta.model_id);
  const judgeModel =
    pickString(file.judge_model) ?? pickString(meta.judge_model);
  const caseTimeoutMs =
    pickInteger(file.case_timeout_ms) ?? pickInteger(meta.case_timeout_ms);

  return {
    targetId,
    cases,
    modelId,
    judgeModel,
    caseTimeoutMs,
  };
}

interface SynthesiseOptions extends ParsedEvalFile {
  /** Absolute path to the JSON file the module was synthesised from. */
  absPath: string;
  /** Module specifier the synthesised code imports `defineLlmEval` from. */
  harnessModulePath: string;
  /** When `true`, embed `cases` as pretty-printed JSON for deterministic diffs. */
  prettyPrint: boolean;
}

/**
 * Render the synthesised ES module text. Deterministic JSON
 * serialisation keeps reruns hash-identical and lets future source-map
 * generators line up positions.
 */
function synthesiseModuleSource(opts: SynthesiseOptions): string {
  const indent = opts.prettyPrint ? 2 : 0;
  const casesLiteral = JSON.stringify(opts.cases, null, indent);
  const sourceUrl = pathToFileURL(opts.absPath).href;
  const harnessSpec = JSON.stringify(opts.harnessModulePath);
  const targetIdLiteral = JSON.stringify(opts.targetId);
  /* `__sourcePath` is embedded as a `file://` URL so the harness
   * dispatcher (`runRunnerCase` in `run-llm-suite.ts`) can pass it
   * straight to `new URL(runner, base)` without an extra
   * `pathToFileURL` round-trip. The harness's `normaliseSourcePath`
   * accepts either form, but the URL is the canonical contract. */
  const sourcePathLiteral = JSON.stringify(sourceUrl);

  const lines: string[] = [];
  lines.push(`// @sourceFile: ${opts.absPath}`);
  lines.push(`//# sourceURL=${sourceUrl}`);
  lines.push(
    `/* Synthesised by ${PLUGIN_NAME} — see spec 20260527-evals-json-first-migration, subtask 02. */`,
  );
  lines.push("");
  lines.push(`import { describe, it, afterAll, expect } from "vitest";`);
  lines.push(`import { defineLlmEval } from ${harnessSpec};`);
  lines.push("");
  lines.push(`const TARGET_ID = ${targetIdLiteral};`);
  lines.push(`const SOURCE_PATH = ${sourcePathLiteral};`);
  lines.push(`const CASES = ${casesLiteral};`);
  if (opts.modelId !== null) {
    lines.push(`const MODEL_ID = ${JSON.stringify(opts.modelId)};`);
  }
  if (opts.judgeModel !== null) {
    lines.push(`const JUDGE_MODEL = ${JSON.stringify(opts.judgeModel)};`);
  }
  if (opts.caseTimeoutMs !== null) {
    lines.push(`const CASE_TIMEOUT_MS = ${JSON.stringify(opts.caseTimeoutMs)};`);
  }
  lines.push("");
  lines.push(`defineLlmEval({`);
  lines.push(`  targetId: TARGET_ID,`);
  lines.push(`  cases: CASES,`);
  if (opts.modelId !== null) lines.push(`  modelId: MODEL_ID,`);
  if (opts.judgeModel !== null) lines.push(`  judgeModel: JUDGE_MODEL,`);
  if (opts.caseTimeoutMs !== null) lines.push(`  caseTimeoutMs: CASE_TIMEOUT_MS,`);
  lines.push(`  __sourcePath: SOURCE_PATH,`);
  lines.push(`  describe,`);
  lines.push(`  it,`);
  lines.push(`  afterAll,`);
  lines.push(`  expect,`);
  lines.push(`});`);
  lines.push("");
  return lines.join("\n");
}

/* ---------------------------------------------------------------------- */
/* Internal: filesystem read + parse (exported for unit tests)            */
/* ---------------------------------------------------------------------- */

/**
 * Read + parse a JSON eval file from disk. Errors are rewrapped with the
 * absolute path attached so Vitest's error surface points users at the
 * right file. Exported so tests can exercise the parse path without
 * spinning up the plugin runtime.
 *
 * @internal
 */
export async function readEvalJsonFile(absPath: string): Promise<unknown> {
  let raw: string;
  try {
    raw = await fs.readFile(absPath, "utf8");
  } catch (err) {
    throw new Error(
      `${PLUGIN_NAME}: failed to read JSON eval file '${absPath}': ` +
        `${(err as Error).message}`,
    );
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch (err) {
    throw new Error(
      `${PLUGIN_NAME}: failed to parse JSON eval file '${absPath}': ` +
        `${(err as Error).message}`,
    );
  }
}

/**
 * Same as `readEvalJsonFile` but operates on already-loaded text. Exposed
 * for unit tests that want to feed handcrafted JSON without writing it
 * to disk.
 *
 * @internal
 */
export function parseEvalJsonString(absPath: string, raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch (err) {
    throw new Error(
      `${PLUGIN_NAME}: failed to parse JSON eval file '${absPath}': ` +
        `${(err as Error).message}`,
    );
  }
}

/**
 * Generate the synthesised module text for a fully-parsed eval file —
 * exposed so unit tests can assert against the rendered output without
 * spinning up Vite.
 *
 * @internal
 */
export function renderEvalModule(
  absPath: string,
  parsed: unknown,
  opts: { harnessModulePath?: string; prettyPrint?: boolean } = {},
): string {
  const fields = extractEvalFields(absPath, parsed);
  return synthesiseModuleSource({
    absPath,
    ...fields,
    harnessModulePath: opts.harnessModulePath ?? DEFAULT_HARNESS_PATH,
    prettyPrint: opts.prettyPrint ?? true,
  });
}

/* ---------------------------------------------------------------------- */
/* Plugin factory                                                         */
/* ---------------------------------------------------------------------- */

/**
 * Resolve `source` against `importer` into an absolute filesystem path.
 * Returns `null` when the source / importer combination is virtual or
 * unresolvable; callers treat `null` as "not our file".
 */
function resolveSourceToAbsPath(
  source: string,
  importer: string | undefined,
): string | null {
  if (source.startsWith("\0")) return null;
  if (path.isAbsolute(source)) return source;
  if (importer && !importer.startsWith("\0")) {
    /* Strip query strings / hashes from the importer path before
     * computing the dirname — Vite sometimes appends `?...`. */
    const cleanImporter = importer.split("?")[0]?.split("#")[0] ?? importer;
    return path.resolve(path.dirname(cleanImporter), source);
  }
  return path.resolve(process.cwd(), source);
}

/**
 * Vite/Vitest plugin that loads non-skill co-located eval JSON as in-memory
 * ES test modules. Wire via plugins: [evalJsonLoader()] in evals/vitest.config.ts.
 */
export function evalJsonLoader(opts: EvalJsonLoaderOptions = {}): Plugin {
  const harnessModulePath = opts.harnessModulePath ?? DEFAULT_HARNESS_PATH;
  const logger = opts.logger ?? console;
  const prettyPrint = opts.prettyPrint ?? true;

  return {
    name: PLUGIN_NAME,
    /* Run before Vite's built-in JSON plugin so we own the dispatch. */
    enforce: "pre",

    resolveId(source, importer) {
      if (typeof source !== "string") return null;
      if (!source.endsWith(".json")) return null;
      const absPath = resolveSourceToAbsPath(source, importer);
      if (absPath === null) return null;
      if (isSkillEvalJsonPath(absPath) || isNonSkillEvalJsonPath(absPath)) {
        return buildVirtualEvalJsonId(absPath);
      }
      return null;
    },

    async load(id) {
      if (typeof id !== "string" || !id.startsWith(VIRTUAL_PREFIX)) return null;
      const absPath = unwrapVirtualEvalJsonId(id);
      if (absPath === null) return null;

      if (isSkillEvalJsonPath(absPath)) {
        return synthesiseSkillEvalSkipModule(absPath);
      }

      const parsed = await readEvalJsonFile(absPath);

      /* Defence-in-depth: even if path-classification said this was a
       * non-skill file, refuse to load anything that looks like a skill
       * eval (`skill_name` top-level field). The path classifier has
       * documented edge cases (`evals.json` outside any `skills/`
       * chain) — this guard keeps the skill loader as the only thing
       * touching skill payloads. */
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        typeof (parsed as Record<string, unknown>).skill_name === "string"
      ) {
        logger.warn(
          `${PLUGIN_NAME}: refusing to load '${absPath}' — looks like a ` +
            `skill evals file (top-level 'skill_name' field present). ` +
            `Skill evals are handled by their own loader.`,
        );
        return null;
      }

      const fields = extractEvalFields(absPath, parsed);
      return synthesiseModuleSource({
        absPath,
        ...fields,
        harnessModulePath,
        prettyPrint,
      });
    },
  };
}

/* ---------------------------------------------------------------------- */
/* Default export for ergonomic config wiring                             */
/* ---------------------------------------------------------------------- */

export default evalJsonLoader;
