/**
 * onStop consistency check for spec-system status pairs.
 *
 * Invoked by the executor and judge agents before they terminate, and by the
 * Cursor `stop` event hook, to ensure no inconsistencies are left behind in
 * the live execution status pair (`<specDir>/status/<subtask>.status.{md,yml}`)
 * or in the spec-root aggregator outputs.
 *
 * Validation surfaces (in order):
 *   1. Subtask `.status.yml` validates against `subtask-status.schema.json`.
 *   2. Paired `.status.md` checkbox state matches `checklist[].done` in the yml.
 *      (Regex sweep over `^\s*-\s*\[[ x]\]\s+\*\*(D\d+)\*\*` plus the helper's
 *      `parseChecklistBlock` to catch malformed lines too.)
 *   3. `state: completed` (or `extra.judge.verdict: verified`) MUST imply every
 *      `checklist[].done === true`. This is a critical inconsistency — the
 *      checker cannot auto-fix a logical claim of completion without evidence,
 *      so it surfaces it for the agent to resolve before exiting.
 *   4. Spec-root `status.yml` (when present) validates against
 *      `spec-status.schema.json`.
 *   5. `.zoto/spec-system/config.yml` (when present) validates against
 *      `config.schema.json`.
 *
 * Auto-fixable issues (when `writeFixes: true`):
 *   - md/yml checkbox mismatch → re-render md from the (validated) yml.
 *
 * Non-auto-fixable (reported as critical / warn):
 *   - schema-invalid yml at any layer (the responsible writer must fix it).
 *   - state=completed/verdict=verified with checklist items still open.
 */

import type { ValidateFunction } from "ajv";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import YAML from "yaml";

import {
  configPathForRepo,
  loadConfig,
  type SpecSystemConfig,
} from "./config-loader.js";
import {
  mdFromYmlPaths,
  parseChecklistBlock,
  readYml,
  statusFromMarkedMd,
  type SubtaskChecklistItem,
  type SubtaskStatusDoc,
} from "../scripts/spec-status-roundtrip.js";

type AjvInstance = import("ajv").default;
const req = createRequire(import.meta.url);
const ajvExported = req("ajv") as
  | (new (opts?: object) => AjvInstance)
  | { default: new (opts?: object) => AjvInstance };
const AjvCtor =
  typeof ajvExported === "function"
    ? ajvExported
    : (ajvExported as { default: new (opts?: object) => AjvInstance }).default;
const addFormatsExported = req("ajv-formats") as
  | ((a: AjvInstance) => void)
  | { default: (a: AjvInstance) => void };
const addFormatsFn =
  typeof addFormatsExported === "function"
    ? addFormatsExported
    : (addFormatsExported as { default: (a: AjvInstance) => void }).default;

const PLUGIN_ROOT = resolve(import.meta.dirname, "..");
const SPEC_STATUS_SCHEMA_PATH = join(
  PLUGIN_ROOT,
  "templates/schema/spec-status.schema.json",
);
const CONFIG_SCHEMA_PATH = join(
  PLUGIN_ROOT,
  "templates/schema/config.schema.json",
);

let _specStatusValidator: ValidateFunction | undefined;
let _configValidator: ValidateFunction | undefined;

function specStatusValidator(): ValidateFunction {
  if (_specStatusValidator === undefined) {
    const raw = JSON.parse(readFileSync(SPEC_STATUS_SCHEMA_PATH, "utf-8")) as object;
    const ajv = new AjvCtor({ allErrors: true, strict: false });
    addFormatsFn(ajv);
    _specStatusValidator = ajv.compile(raw);
  }
  return _specStatusValidator;
}

function configValidator(): ValidateFunction {
  if (_configValidator === undefined) {
    const raw = JSON.parse(readFileSync(CONFIG_SCHEMA_PATH, "utf-8")) as object;
    const ajv = new AjvCtor({
      allErrors: true,
      strict: false,
      useDefaults: true,
    });
    addFormatsFn(ajv);
    _configValidator = ajv.compile(raw);
  }
  return _configValidator;
}

export type IssueSeverity = "info" | "warn" | "critical";

export interface ConsistencyIssue {
  severity: IssueSeverity;
  kind: string;
  path: string;
  message: string;
}

export interface ConsistencyFix {
  kind: string;
  path: string;
  message: string;
}

export interface CheckResult {
  checked: number;
  fixes: ConsistencyFix[];
  issues: ConsistencyIssue[];
  /** True when at least one issue has severity `critical`. */
  hasCritical: boolean;
}

export interface CheckOptions {
  repoRoot: string;
  /** When true (default), apply auto-fixes to disk. When false, report only. */
  writeFixes?: boolean;
  /** When set, only check this spec directory (absolute path). */
  specDir?: string;
}

const STATUS_YML_RE = /^subtask-(\d{2})-.+\.status\.yml$/;
/**
 * Regex used as a backstop to detect unchecked boxes in the rendered md.
 * Intentionally permissive — the round-trip helper's parser is the canonical
 * extractor; this regex exists to satisfy the explicit "regex for unchecked
 * boxes in md" requirement from the consistency contract.
 */
export const UNCHECKED_BOX_RE = /^\s*-\s*\[\s\]\s+\*\*(D\d+)\*\*/gm;

function emptyResult(): CheckResult {
  return { checked: 0, fixes: [], issues: [], hasCritical: false };
}

function mergeResult(target: CheckResult, source: CheckResult): void {
  target.checked += source.checked;
  target.fixes.push(...source.fixes);
  target.issues.push(...source.issues);
  if (source.hasCritical) target.hasCritical = true;
}

function pairedMdPath(ymlPath: string): string {
  return ymlPath.endsWith(".status.yml")
    ? ymlPath.slice(0, -".status.yml".length) + ".status.md"
    : `${ymlPath}.status.md`;
}

/**
 * Sweep an md file for unchecked checkboxes (regex-only — does not consult
 * the yml). Returns the list of checklist ids that are unchecked in the md.
 */
export function uncheckedMdBoxIds(md: string): string[] {
  const out: string[] = [];
  for (const m of md.matchAll(UNCHECKED_BOX_RE)) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}

/**
 * Compare md checklist (parsed) against yml checklist (validated).
 * Returns the set of mismatched checklist ids (id is present in both lists
 * but `done` flags differ).
 */
export function checklistMismatches(
  ymlItems: SubtaskChecklistItem[],
  mdItems: SubtaskChecklistItem[],
): string[] {
  const mdMap = new Map(mdItems.map((i) => [i.id, i.done]));
  const out: string[] = [];
  for (const y of ymlItems) {
    const mdDone = mdMap.get(y.id);
    if (mdDone === undefined) continue;
    if (mdDone !== y.done) out.push(y.id);
  }
  return out;
}

export function checkSubtaskPair(
  ymlPath: string,
  opts: { writeFixes: boolean },
): CheckResult {
  const result = emptyResult();
  result.checked = 1;

  let doc: SubtaskStatusDoc;
  try {
    doc = readYml(ymlPath);
  } catch (e) {
    result.issues.push({
      severity: "critical",
      kind: "schema_invalid_yml",
      path: ymlPath,
      message: `subtask status yml failed schema validation: ${e instanceof Error ? e.message : String(e)}`,
    });
    result.hasCritical = true;
    return result;
  }

  if (
    doc.state === "completed" &&
    doc.checklist.some((c) => !c.done)
  ) {
    const open = doc.checklist.filter((c) => !c.done).map((c) => c.id);
    result.issues.push({
      severity: "critical",
      kind: "completed_with_open_items",
      path: ymlPath,
      message: `state: completed but checklist items still open: ${open.join(", ")}`,
    });
    result.hasCritical = true;
  }

  const judgeRaw = (doc.extra as { judge?: { verdict?: unknown } } | undefined)?.judge;
  if (
    judgeRaw &&
    typeof judgeRaw.verdict === "string" &&
    judgeRaw.verdict === "verified" &&
    doc.checklist.some((c) => !c.done)
  ) {
    const open = doc.checklist.filter((c) => !c.done).map((c) => c.id);
    result.issues.push({
      severity: "critical",
      kind: "verified_with_open_items",
      path: ymlPath,
      message: `extra.judge.verdict: verified but checklist items still open: ${open.join(", ")}`,
    });
    result.hasCritical = true;
  }

  const mdPath = pairedMdPath(ymlPath);

  if (!existsSync(mdPath)) {
    if (opts.writeFixes) {
      try {
        mdFromYmlPaths(ymlPath, mdPath);
        result.fixes.push({
          kind: "rerendered_md_from_yml",
          path: mdPath,
          message: `created missing .status.md from .status.yml`,
        });
      } catch (e) {
        result.issues.push({
          severity: "warn",
          kind: "md_render_failed",
          path: mdPath,
          message: `failed to render missing .status.md: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    } else {
      result.issues.push({
        severity: "warn",
        kind: "md_missing",
        path: mdPath,
        message: `paired .status.md is missing (would re-render from yml)`,
      });
    }
    return result;
  }

  const mdSrc = readFileSync(mdPath, "utf-8");

  let mdItems: SubtaskChecklistItem[] = [];
  let mdParseFailed = false;
  try {
    const mdDoc = statusFromMarkedMd(mdSrc);
    mdItems = mdDoc.checklist;
  } catch (e) {
    mdParseFailed = true;
    result.issues.push({
      severity: "warn",
      kind: "md_malformed",
      path: mdPath,
      message: `paired .status.md could not be parsed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  const regexUnchecked = new Set(uncheckedMdBoxIds(mdSrc));
  const mismatches = mdParseFailed
    ? []
    : checklistMismatches(doc.checklist, mdItems);

  const regexInconsistent: string[] = [];
  for (const item of doc.checklist) {
    if (item.done && regexUnchecked.has(item.id)) {
      regexInconsistent.push(item.id);
    }
  }

  const needsRerender = mdParseFailed || mismatches.length > 0 || regexInconsistent.length > 0;

  if (needsRerender) {
    if (opts.writeFixes) {
      try {
        mdFromYmlPaths(ymlPath, mdPath);
        const detail: string[] = [];
        if (mismatches.length > 0) detail.push(`mismatched ids: ${mismatches.join(", ")}`);
        if (regexInconsistent.length > 0)
          detail.push(`md unchecked but yml done: ${regexInconsistent.join(", ")}`);
        if (mdParseFailed) detail.push("md was malformed");
        result.fixes.push({
          kind: "rerendered_md_from_yml",
          path: mdPath,
          message:
            detail.length > 0
              ? `re-rendered .status.md from .status.yml (${detail.join("; ")})`
              : `re-rendered .status.md from .status.yml`,
        });
      } catch (e) {
        result.issues.push({
          severity: "warn",
          kind: "md_render_failed",
          path: mdPath,
          message: `failed to re-render .status.md: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    } else {
      result.issues.push({
        severity: "warn",
        kind: "md_yml_mismatch",
        path: mdPath,
        message:
          mismatches.length > 0 || regexInconsistent.length > 0
            ? `md/yml checklist mismatch (yml is authoritative; would re-render md)`
            : `md is malformed (would re-render from yml)`,
      });
    }
  }

  return result;
}

function listSubtaskYmls(statusDir: string): string[] {
  if (!existsSync(statusDir)) return [];
  return readdirSync(statusDir)
    .filter((n) => STATUS_YML_RE.test(n))
    .map((n) => join(statusDir, n))
    .sort();
}

export function checkSpecDir(
  specDir: string,
  opts: { writeFixes: boolean },
): CheckResult {
  const result = emptyResult();
  const abs = resolve(specDir);
  const statusDir = join(abs, "status");
  const ymls = listSubtaskYmls(statusDir);
  if (ymls.length === 0) {
    return result;
  }
  for (const ymlPath of ymls) {
    mergeResult(result, checkSubtaskPair(ymlPath, opts));
  }

  const specStatusYml = join(abs, "status.yml");
  if (existsSync(specStatusYml)) {
    result.checked += 1;
    let specRootData: Record<string, unknown> | undefined;
    try {
      const raw = readFileSync(specStatusYml, "utf-8");
      const data: unknown = YAML.parse(raw);
      const v = specStatusValidator();
      if (!v(data)) {
        result.issues.push({
          severity: "warn",
          kind: "schema_invalid_spec_status",
          path: specStatusYml,
          message: `spec-root status.yml failed schema validation: ${JSON.stringify(v.errors)}`,
        });
      } else {
        specRootData = data as Record<string, unknown>;
      }
    } catch (e) {
      result.issues.push({
        severity: "warn",
        kind: "schema_invalid_spec_status",
        path: specStatusYml,
        message: `spec-root status.yml could not be parsed: ${e instanceof Error ? e.message : String(e)}`,
      });
    }

    if (specRootData && specRootData.aggregate_state === "completed") {
      const dodItems = specRootData.definition_of_done_status as
        | Array<{ id: string; text: string; done: boolean }>
        | undefined;
      if (Array.isArray(dodItems)) {
        const unchecked = dodItems.filter((d) => !d.done).map((d) => d.id);
        if (unchecked.length > 0) {
          result.issues.push({
            severity: "critical",
            kind: "completed_with_open_dod",
            path: specStatusYml,
            message: `aggregate_state: completed but Definition of Done items still unchecked: ${unchecked.join(", ")}`,
          });
          result.hasCritical = true;
        }
      }
    }
  }

  return result;
}

function listSpecDirs(specsDirAbs: string): string[] {
  if (!existsSync(specsDirAbs)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(specsDirAbs)) {
    const candidate = join(specsDirAbs, entry);
    let isDir = false;
    try {
      isDir = statSync(candidate).isDirectory();
    } catch {
      isDir = false;
    }
    if (!isDir) continue;
    if (existsSync(join(candidate, "status"))) {
      out.push(candidate);
    }
  }
  return out.sort();
}

function checkConfigFile(repoRoot: string): CheckResult {
  const result = emptyResult();
  const path = configPathForRepo(repoRoot);
  if (!existsSync(path)) return result;
  result.checked = 1;
  try {
    const raw = readFileSync(path, "utf-8");
    const data: unknown = YAML.parse(raw);
    const v = configValidator();
    const draft = data ?? {};
    if (!v(draft)) {
      result.issues.push({
        severity: "critical",
        kind: "schema_invalid_config",
        path,
        message: `.zoto/spec-system/config.yml failed schema validation: ${JSON.stringify(v.errors)}`,
      });
      result.hasCritical = true;
    }
  } catch (e) {
    result.issues.push({
      severity: "critical",
      kind: "schema_invalid_config",
      path,
      message: `.zoto/spec-system/config.yml could not be parsed: ${e instanceof Error ? e.message : String(e)}`,
    });
    result.hasCritical = true;
  }
  return result;
}

export function checkAllSpecs(opts: CheckOptions): CheckResult {
  const writeFixes = opts.writeFixes !== false;
  const result = emptyResult();
  const repoRoot = resolve(opts.repoRoot);

  mergeResult(result, checkConfigFile(repoRoot));

  let cfg: SpecSystemConfig | undefined;
  try {
    cfg = loadConfig(repoRoot).config;
  } catch {
    cfg = undefined;
  }
  const specsRel = cfg?.specsDir ?? "specs";
  const specsDirAbs = resolve(repoRoot, specsRel);

  const specDirs = opts.specDir
    ? [resolve(opts.specDir)]
    : listSpecDirs(specsDirAbs);

  for (const specDir of specDirs) {
    mergeResult(result, checkSpecDir(specDir, { writeFixes }));
  }

  return result;
}

export function summarise(result: CheckResult): string {
  const counts = { critical: 0, warn: 0, info: 0 } as Record<IssueSeverity, number>;
  for (const i of result.issues) counts[i.severity] += 1;
  return [
    `checked=${result.checked}`,
    `fixes=${result.fixes.length}`,
    `critical=${counts.critical}`,
    `warn=${counts.warn}`,
    `info=${counts.info}`,
  ].join(" ");
}

export { dirname };
