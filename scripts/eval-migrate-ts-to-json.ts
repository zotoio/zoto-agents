#!/usr/bin/env tsx
/**
 * One-shot migration script for spec
 * `20260527-evals-json-first-migration` (subtask 07).
 *
 * Converts every co-located `.test.ts` LLM eval file into a co-located
 * `.json` file, deletes the original TS file, and rewrites the manifest
 * `eval_files` entries to point at the new JSON paths.
 *
 * ## Scope
 *
 *   - `plugins/*\/{commands,agents,hooks}/evals/*.test.ts`
 *   - `.cursor/{commands,agents,hooks}/evals/*.test.ts`
 *
 * Excluded:
 *
 *   - `evals/scenarios/**` (multi-primitive TS scenarios — KD-5)
 *   - `evals/llm/_shared/**` (harness internals)
 *
 * ## Extraction Strategy
 *
 * Each `.test.ts` file is parsed via the TypeScript compiler API
 * (`ts.createSourceFile`). The walker locates:
 *
 *   1. A `VariableStatement` declaration whose initialiser is an
 *      `ArrayLiteralExpression`. Variable names `CASES` or `SUITE_CASES`
 *      are preferred; otherwise any variable whose type annotation is
 *      `LlmCaseDefinition[]` (with or without `as unknown as` cast) is
 *      accepted.
 *   2. The `defineLlmEval({ ... })` `CallExpression` and the literals
 *      inside its single argument:
 *      - `targetId` (string literal)
 *      - `modelId` (binary `process.env.ZOTO_EVAL_MODEL ?? "<default>"`)
 *      - `judgeModel` (binary `process.env.ZOTO_EVAL_JUDGE_MODEL ?? "<default>"`)
 *      - `caseTimeoutMs` (numeric literal)
 *
 * The CASES array literal is evaluated inside a sandboxed `vm.Script`
 * context with no globals. Any failure (template literals,
 * `process.env` references, spread operators, imported constants) is
 * logged to the migration audit with the source path and parse error;
 * the original `.test.ts` is left in place.
 *
 * ## Output JSON Shape
 *
 *   {
 *     "target_id": "<command|agent|hook>:<name>",
 *     "_meta": {
 *       "generated": true,
 *       "model_id": "<extracted default>",
 *       "judge_model": "<extracted default>",
 *       "case_timeout_ms": <number>,
 *       "migrated_from": "<relative TS path>",
 *       "migrated_at": "<ISO-8601 UTC>"
 *     },
 *     "cases": [ ... ]
 *   }
 *
 * Per-case `_meta.generated: true` markers (when present on the TS
 * source) are preserved verbatim.
 *
 * ## Schema Validation Contract
 *
 * Every output JSON is validated against `eval-file.schema.json`
 * BEFORE writing. A corrupt JSON file is worse than a lingering
 * `.test.ts` — failed files are logged and left in place.
 *
 * ## CLI Flags
 *
 *   --dry-run        Print the migration plan; write nothing.
 *   --apply          Write JSON + delete TS originals (DESTRUCTIVE).
 *   --keep-ts        Write JSON; leave TS files in place (safety net).
 *   --single <path>  Migrate a single file (spot-check).
 *   --audit <path>   Write the audit markdown report to <path>.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as vm from "node:vm";

import Ajv, { type ValidateFunction } from "ajv";
import ts from "typescript";
import YAML, { parseDocument } from "yaml";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(SCRIPT_DIR, "..");
const SPEC_ID = "20260527-evals-json-first-migration";
const DEFAULT_AUDIT_PATH = `specs/${SPEC_ID}/migration-audit-20260527.md`;

/* ---------------------------------------------------------------------- */
/* Discovery — reuse same patterns as engine/update.ts#findCoLocatedTsEvals */
/* ---------------------------------------------------------------------- */

const COLOCATED_TS_KINDS = ["commands", "agents", "hooks"] as const;
const COLOCATED_TS_EXCLUDE_FRAGMENTS = [
  "/evals/scenarios/",
  "/evals/llm/_shared/",
  "/node_modules/",
];

/**
 * Walk the host repo for co-located TS LLM evals. Mirrors the discovery
 * surface of `plugins/zoto-eval-system/engine/update.ts#findCoLocatedTsEvals`.
 * Sorted absolute paths.
 */
export function findCoLocatedTsEvals(hostRepoRoot: string): string[] {
  const out: string[] = [];

  function pushFromKindDir(kindDir: string): void {
    if (!existsSync(kindDir) || !statSync(kindDir).isDirectory()) return;
    const evalsDir = join(kindDir, "evals");
    if (!existsSync(evalsDir) || !statSync(evalsDir).isDirectory()) return;
    for (const entry of readdirSync(evalsDir).sort()) {
      if (!entry.endsWith(".test.ts")) continue;
      const full = join(evalsDir, entry);
      const normalized = full.replace(/\\/g, "/");
      if (COLOCATED_TS_EXCLUDE_FRAGMENTS.some((frag) => normalized.includes(frag))) {
        continue;
      }
      try {
        if (statSync(full).isFile()) out.push(full);
      } catch {
        /* skip unreadable */
      }
    }
  }

  const pluginsRoot = join(hostRepoRoot, "plugins");
  if (existsSync(pluginsRoot) && statSync(pluginsRoot).isDirectory()) {
    for (const plugin of readdirSync(pluginsRoot).sort()) {
      const pluginDir = join(pluginsRoot, plugin);
      let st;
      try {
        st = statSync(pluginDir);
      } catch {
        continue;
      }
      if (!st.isDirectory()) continue;
      for (const kind of COLOCATED_TS_KINDS) {
        pushFromKindDir(join(pluginDir, kind));
      }
    }
  }

  const cursorRoot = join(hostRepoRoot, ".cursor");
  if (existsSync(cursorRoot) && statSync(cursorRoot).isDirectory()) {
    for (const kind of COLOCATED_TS_KINDS) {
      pushFromKindDir(join(cursorRoot, kind));
    }
  }

  return Array.from(new Set(out)).sort();
}

/* ---------------------------------------------------------------------- */
/* AST extraction                                                          */
/* ---------------------------------------------------------------------- */

export interface ExtractedEval {
  /** Extracted from `targetId` literal on the `defineLlmEval` call. */
  targetId: string;
  /** RHS string of `process.env.ZOTO_EVAL_MODEL ?? "<default>"`, or null. */
  modelId: string | null;
  /** RHS string of `process.env.ZOTO_EVAL_JUDGE_MODEL ?? "<default>"`, or null. */
  judgeModel: string | null;
  /** Numeric literal value of `caseTimeoutMs`, or null. */
  caseTimeoutMs: number | null;
  /** Parsed CASES array (literal data only). */
  cases: unknown[];
  /** Name of the CASES variable, e.g. `CASES`, `SUITE_CASES`. */
  casesVarName: string;
}

export class ExtractionError extends Error {
  readonly sourceFile: string;
  constructor(sourceFile: string, message: string) {
    super(message);
    this.name = "ExtractionError";
    this.sourceFile = sourceFile;
  }
}

/**
 * Extract the canonical `<EvalFile>` payload from a co-located TS LLM
 * eval source.
 *
 * Throws `ExtractionError` (with the source file path) when the AST
 * does not match the stamper-emitted shape — caller logs the failure
 * to the audit and leaves the TS file untouched.
 */
export function extractFromSource(
  source: string,
  sourceFile: string,
): ExtractedEval {
  const sf = ts.createSourceFile(
    sourceFile,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );

  let casesArrayNode: ts.ArrayLiteralExpression | null = null;
  let casesVarName: string | null = null;
  let defineCallArg: ts.ObjectLiteralExpression | null = null;

  function visit(node: ts.Node): void {
    if (ts.isVariableStatement(node) && !casesArrayNode) {
      for (const decl of node.declarationList.declarations) {
        if (!decl.initializer) continue;
        if (!ts.isIdentifier(decl.name)) continue;
        const initialiser = unwrapAsExpression(decl.initializer);
        if (!ts.isArrayLiteralExpression(initialiser)) continue;
        const varName = decl.name.text;
        // Prefer CASES / SUITE_CASES; otherwise accept any LlmCaseDefinition[] typed binding.
        const isPreferredName = varName === "CASES" || varName === "SUITE_CASES";
        const typeNode = decl.type;
        const typeText = typeNode ? typeNode.getText(sf) : "";
        const isLlmCaseArrayTyped = /\bLlmCaseDefinition\b/.test(typeText);
        // Also handle `as unknown as LlmCaseDefinition[]` pattern.
        const initText = decl.initializer.getText(sf);
        const isCastToLlmCase = /\bas\s+unknown\s+as\s+LlmCaseDefinition\[\]/.test(
          initText,
        );
        if (isPreferredName || isLlmCaseArrayTyped || isCastToLlmCase) {
          casesArrayNode = initialiser;
          casesVarName = varName;
          break;
        }
      }
    }
    if (
      !defineCallArg &&
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "defineLlmEval"
    ) {
      const arg = node.arguments[0];
      if (arg && ts.isObjectLiteralExpression(arg)) {
        defineCallArg = arg;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (!casesArrayNode || !casesVarName) {
    throw new ExtractionError(
      sourceFile,
      "could not locate CASES array literal (expected `const CASES: LlmCaseDefinition[] = [...]` or equivalent)",
    );
  }
  if (!defineCallArg) {
    throw new ExtractionError(
      sourceFile,
      "could not locate `defineLlmEval({ ... })` call expression",
    );
  }

  let targetId: string | null = null;
  let modelId: string | null = null;
  let judgeModel: string | null = null;
  let caseTimeoutMs: number | null = null;

  for (const prop of (defineCallArg as ts.ObjectLiteralExpression).properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    if (!ts.isIdentifier(prop.name) && !ts.isStringLiteral(prop.name)) continue;
    const key = ts.isIdentifier(prop.name) ? prop.name.text : prop.name.text;
    const init = prop.initializer;
    if (key === "targetId" && ts.isStringLiteralLike(init)) {
      targetId = init.text;
    } else if (key === "modelId") {
      modelId = extractEnvFallbackString(init);
    } else if (key === "judgeModel") {
      judgeModel = extractEnvFallbackString(init);
    } else if (key === "caseTimeoutMs" && ts.isNumericLiteral(init)) {
      caseTimeoutMs = Number(init.text);
    }
  }

  if (!targetId) {
    throw new ExtractionError(
      sourceFile,
      "`defineLlmEval` call is missing a `targetId` string literal",
    );
  }

  const casesText = (casesArrayNode as ts.ArrayLiteralExpression).getText(sf);
  let casesValue: unknown;
  try {
    casesValue = evaluateLiteralArray(casesText);
  } catch (err) {
    throw new ExtractionError(
      sourceFile,
      `failed to evaluate CASES array literal in sandbox: ${(err as Error).message}`,
    );
  }
  if (!Array.isArray(casesValue)) {
    throw new ExtractionError(
      sourceFile,
      "CASES literal did not evaluate to an Array",
    );
  }

  return {
    targetId,
    modelId,
    judgeModel,
    caseTimeoutMs,
    cases: casesValue,
    casesVarName,
  };
}

/** Strip outer `as <Type>` / `as unknown as <Type>` / parenthesised type casts. */
function unwrapAsExpression(node: ts.Expression): ts.Expression {
  let cur: ts.Node = node;
  while (true) {
    if (ts.isAsExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (ts.isParenthesizedExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    if (ts.isTypeAssertionExpression(cur)) {
      cur = cur.expression;
      continue;
    }
    break;
  }
  return cur as ts.Expression;
}

/**
 * Extract the RHS string literal from a `process.env.X ?? "<default>"`
 * binary expression. Returns the default string. Returns `null` for
 * anything that isn't recognisable so the migrator falls back to runtime
 * defaults.
 */
function extractEnvFallbackString(node: ts.Expression): string | null {
  const unwrapped = unwrapAsExpression(node);
  if (
    ts.isBinaryExpression(unwrapped) &&
    unwrapped.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
  ) {
    const rhs = unwrapAsExpression(unwrapped.right);
    if (ts.isStringLiteralLike(rhs)) return rhs.text;
  }
  if (ts.isStringLiteralLike(unwrapped)) return unwrapped.text;
  return null;
}

/**
 * Safely evaluate a JS array literal expression in a sandboxed VM
 * context with no globals. The stamper-emitted CASES arrays are pure
 * JSON-equivalent data — no template literals, no `process.env`
 * references, no spread operators, no identifiers — so a `vm.Script`
 * with an empty context produces deterministic results.
 */
function evaluateLiteralArray(text: string): unknown {
  const script = new vm.Script(`(${text})`, { filename: "<eval-cases>" });
  const ctx = vm.createContext(Object.create(null));
  return script.runInContext(ctx, { timeout: 1000 });
}

/* ---------------------------------------------------------------------- */
/* Schema validation                                                       */
/* ---------------------------------------------------------------------- */

const EVAL_FILE_SCHEMA_ID =
  "https://zotoio.github.io/zoto-agents/schemas/zoto-eval-system/eval-file.schema.json";

const PLUGIN_TEMPLATES_SCHEMA_DIR = resolve(
  DEFAULT_REPO_ROOT,
  "plugins",
  "zoto-eval-system",
  "templates",
  "schema",
);

let cachedValidator: ValidateFunction | null = null;

export function getEvalFileValidator(
  schemaDir: string = PLUGIN_TEMPLATES_SCHEMA_DIR,
): ValidateFunction | null {
  if (cachedValidator) return cachedValidator;
  if (!existsSync(schemaDir)) return null;
  const ajv = new Ajv({ allErrors: true, strict: false });
  let registered = 0;
  for (const f of readdirSync(schemaDir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const schema = JSON.parse(readFileSync(join(schemaDir, f), "utf-8")) as Record<
        string,
        unknown
      >;
      ajv.addSchema(schema);
      registered++;
    } catch {
      /* skip malformed schema entries */
    }
  }
  if (registered === 0) return null;
  const v = ajv.getSchema(EVAL_FILE_SCHEMA_ID);
  if (!v) return null;
  cachedValidator = v;
  return v;
}

/* ---------------------------------------------------------------------- */
/* Plan + migrate                                                          */
/* ---------------------------------------------------------------------- */

export interface MigrationPlanEntry {
  sourceAbs: string;
  sourceRel: string;
  destinationAbs: string;
  destinationRel: string;
  targetId: string;
  caseCount: number;
}

export interface MigrationAuditEntry {
  sourceRel: string;
  destinationRel: string;
  targetId: string | null;
  caseCount: number | null;
  status: "migrated" | "failed" | "skipped";
  error: string | null;
}

export interface MigrationOptions {
  repoRoot: string;
  apply: boolean;
  keepTs: boolean;
  singleFile: string | null;
  auditPath: string;
  /** Override for unit-test fixtures. */
  schemaDir?: string;
}

function deriveDestination(sourceAbs: string): string {
  // Same directory; for hooks the source is hooks.test.ts → destination hooks.json.
  const dir = dirname(sourceAbs);
  const base = sourceAbs.split("/").pop() ?? "";
  const jsonBase = base.replace(/\.test\.ts$/, ".json");
  return join(dir, jsonBase);
}

/** Build the canonical `EvalFile` JSON payload from an extraction result. */
export function buildEvalFileJson(
  extracted: ExtractedEval,
  sourceRel: string,
  nowIso: string,
): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    generated: true,
    migrated_from: sourceRel,
    migrated_at: nowIso,
  };
  if (extracted.modelId !== null) meta.model_id = extracted.modelId;
  if (extracted.judgeModel !== null) meta.judge_model = extracted.judgeModel;
  if (extracted.caseTimeoutMs !== null) meta.case_timeout_ms = extracted.caseTimeoutMs;
  return {
    target_id: extracted.targetId,
    _meta: meta,
    cases: extracted.cases,
  };
}

export interface MigrateOneResult {
  audit: MigrationAuditEntry;
  /** Built JSON payload — present iff extraction + validation succeed. */
  payload: Record<string, unknown> | null;
  destinationAbs: string;
}

/**
 * Migrate a single co-located `.test.ts` file. Pure / side-effect-free
 * apart from file IO controlled by the caller's `apply` / `keepTs`
 * decision. Returns an audit entry; the caller is responsible for
 * collating the audit report and deleting TS originals.
 */
export function migrateOne(
  sourceAbs: string,
  opts: { repoRoot: string; nowIso: string; schemaDir?: string },
): MigrateOneResult {
  const sourceRel = relative(opts.repoRoot, sourceAbs);
  const destinationAbs = deriveDestination(sourceAbs);
  const destinationRel = relative(opts.repoRoot, destinationAbs);
  if (!existsSync(sourceAbs)) {
    return {
      audit: {
        sourceRel,
        destinationRel,
        targetId: null,
        caseCount: null,
        status: "skipped",
        error: "source file does not exist",
      },
      payload: null,
      destinationAbs,
    };
  }
  let source: string;
  try {
    source = readFileSync(sourceAbs, "utf-8");
  } catch (err) {
    return {
      audit: {
        sourceRel,
        destinationRel,
        targetId: null,
        caseCount: null,
        status: "failed",
        error: `read failed: ${(err as Error).message}`,
      },
      payload: null,
      destinationAbs,
    };
  }
  let extracted: ExtractedEval;
  try {
    extracted = extractFromSource(source, sourceAbs);
  } catch (err) {
    return {
      audit: {
        sourceRel,
        destinationRel,
        targetId: null,
        caseCount: null,
        status: "failed",
        error: `AST extraction failed: ${(err as Error).message}`,
      },
      payload: null,
      destinationAbs,
    };
  }
  const payload = buildEvalFileJson(extracted, sourceRel, opts.nowIso);
  const validate = getEvalFileValidator(opts.schemaDir);
  if (!validate) {
    return {
      audit: {
        sourceRel,
        destinationRel,
        targetId: extracted.targetId,
        caseCount: extracted.cases.length,
        status: "failed",
        error:
          "schema validator unavailable (could not load eval-file.schema.json); refusing to write",
      },
      payload: null,
      destinationAbs,
    };
  }
  const ok = validate(payload);
  if (!ok) {
    const errs = (validate.errors ?? [])
      .map((e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`)
      .join("; ");
    return {
      audit: {
        sourceRel,
        destinationRel,
        targetId: extracted.targetId,
        caseCount: extracted.cases.length,
        status: "failed",
        error: `eval-file.schema.json validation failed — ${errs}`,
      },
      payload: null,
      destinationAbs,
    };
  }
  return {
    audit: {
      sourceRel,
      destinationRel,
      targetId: extracted.targetId,
      caseCount: extracted.cases.length,
      status: "migrated",
      error: null,
    },
    payload,
    destinationAbs,
  };
}

/* ---------------------------------------------------------------------- */
/* Manifest rewrite                                                        */
/* ---------------------------------------------------------------------- */

export interface ManifestRewriteResult {
  manifestRewrites: number;
  historyAppended: boolean;
}

/**
 * Rewrite `.test.ts` paths in `manifest.yml#eval_files` to their
 * `.json` equivalents and append a single migration record document to
 * `manifest.history.yml`. Comment- and ordering-preserving via
 * `yaml.parseDocument`.
 */
export function rewriteManifest(
  repoRoot: string,
  migratedSourceRelPaths: Set<string>,
  opts: { dryRun: boolean; migrationCount: number; specId: string; nowIso: string },
): ManifestRewriteResult {
  const manifestPath = join(repoRoot, ".zoto", "eval-system", "manifest.yml");
  const historyPath = join(repoRoot, ".zoto", "eval-system", "manifest.history.yml");
  let manifestRewrites = 0;
  let historyAppended = false;

  if (existsSync(manifestPath)) {
    const raw = readFileSync(manifestPath, "utf-8");
    const doc = parseDocument(raw);
    const targets = doc.get("targets");
    if (targets && YAML.isSeq(targets)) {
      for (const item of targets.items) {
        if (!YAML.isMap(item)) continue;
        const evalFiles = item.get("eval_files");
        if (!evalFiles || !YAML.isSeq(evalFiles)) continue;
        for (let i = 0; i < evalFiles.items.length; i++) {
          const entry = evalFiles.items[i];
          let pathStr: string | null = null;
          if (YAML.isScalar(entry) && typeof entry.value === "string") {
            pathStr = entry.value;
          } else if (typeof entry === "string") {
            pathStr = entry;
          }
          if (!pathStr) continue;
          if (!pathStr.endsWith(".test.ts")) continue;
          if (!migratedSourceRelPaths.has(pathStr)) continue;
          const newPath = pathStr.replace(/\.test\.ts$/, ".json");
          if (YAML.isScalar(entry)) {
            entry.value = newPath;
          } else {
            evalFiles.items[i] = newPath as unknown as typeof entry;
          }
          manifestRewrites++;
        }
      }
    }
    if (!opts.dryRun && manifestRewrites > 0) {
      writeFileSync(manifestPath, doc.toString(), "utf-8");
    }
  }

  if (!opts.dryRun) {
    const historyEntry = {
      schema_version: 1,
      kind: "bulk-migration",
      spec_id: opts.specId,
      migrated_at: opts.nowIso,
      file_count: opts.migrationCount,
      manifest_eval_files_rewritten: manifestRewrites,
      generated_by: "scripts/eval-migrate-ts-to-json.ts",
      note:
        "Bulk migration of co-located `.test.ts` LLM evals to `.json` (JSON-first migration).",
    };
    const yamlBody = YAML.stringify(historyEntry);
    mkdirSync(dirname(historyPath), { recursive: true });
    if (!existsSync(historyPath)) {
      writeFileSync(historyPath, `---\n${yamlBody}`, "utf-8");
    } else {
      const existing = readFileSync(historyPath, "utf-8");
      const sep = existing.endsWith("\n") ? "---\n" : "\n---\n";
      writeFileSync(historyPath, `${existing}${sep}${yamlBody}`, "utf-8");
    }
    historyAppended = true;
  }

  return { manifestRewrites, historyAppended };
}

/* ---------------------------------------------------------------------- */
/* Audit report                                                            */
/* ---------------------------------------------------------------------- */

export function renderAuditMarkdown(
  entries: MigrationAuditEntry[],
  opts: { repoRoot: string; nowIso: string; mode: string },
): string {
  const total = entries.length;
  const migrated = entries.filter((e) => e.status === "migrated").length;
  const failed = entries.filter((e) => e.status === "failed").length;
  const skipped = entries.filter((e) => e.status === "skipped").length;
  const lines: string[] = [];
  lines.push(`# Migration Audit — ${SPEC_ID}`);
  lines.push("");
  lines.push(`- **Generated:** ${opts.nowIso}`);
  lines.push(`- **Mode:** \`${opts.mode}\``);
  lines.push(`- **Repo:** \`${opts.repoRoot}\``);
  lines.push(`- **Total discovered:** ${total}`);
  lines.push(`- **Migrated:** ${migrated}`);
  lines.push(`- **Failed:** ${failed}`);
  lines.push(`- **Skipped:** ${skipped}`);
  lines.push("");
  lines.push("| # | Source (`.test.ts`) | Destination (`.json`) | Target | Cases | Status | Error |");
  lines.push("|---|---|---|---|---|---|---|");
  entries.forEach((e, i) => {
    const err = e.error ? e.error.replace(/\|/g, "\\|") : "";
    const tgt = e.targetId ?? "—";
    const cc = e.caseCount === null ? "—" : String(e.caseCount);
    lines.push(
      `| ${i + 1} | \`${e.sourceRel}\` | \`${e.destinationRel}\` | \`${tgt}\` | ${cc} | ${e.status} | ${err} |`,
    );
  });
  lines.push("");
  return lines.join("\n");
}

/* ---------------------------------------------------------------------- */
/* Main entry                                                              */
/* ---------------------------------------------------------------------- */

export interface ParsedCli {
  apply: boolean;
  keepTs: boolean;
  dryRun: boolean;
  single: string | null;
  auditPath: string;
}

export function parseCli(argv: string[]): ParsedCli {
  const args = argv.slice();
  const apply = args.includes("--apply");
  const keepTs = args.includes("--keep-ts");
  const dryRun = args.includes("--dry-run") || (!apply && !keepTs);
  let single: string | null = null;
  let auditPath = DEFAULT_AUDIT_PATH;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--single" && args[i + 1]) {
      single = args[i + 1] ?? null;
      i++;
    }
    if (args[i] === "--audit" && args[i + 1]) {
      auditPath = args[i + 1] ?? DEFAULT_AUDIT_PATH;
      i++;
    }
  }
  return { apply, keepTs, dryRun, single, auditPath };
}

export interface RunResult {
  exitCode: number;
  audit: MigrationAuditEntry[];
  manifestRewrites: number;
  historyAppended: boolean;
}

export async function runMigration(
  opts: MigrationOptions,
  argvLabel: string,
): Promise<RunResult> {
  const nowIso = new Date().toISOString();
  const repoRoot = opts.repoRoot;
  const dryRun = !opts.apply && !opts.keepTs;
  const willWriteJson = opts.apply || opts.keepTs;
  const willDeleteTs = opts.apply;

  let sources: string[];
  if (opts.singleFile) {
    const abs = isAbsolute(opts.singleFile)
      ? opts.singleFile
      : resolve(repoRoot, opts.singleFile);
    sources = [abs];
  } else {
    sources = findCoLocatedTsEvals(repoRoot);
  }

  const audit: MigrationAuditEntry[] = [];
  const migratedSourceRelPaths = new Set<string>();
  let migratedCount = 0;

  for (const sourceAbs of sources) {
    const result = migrateOne(sourceAbs, {
      repoRoot,
      nowIso,
      schemaDir: opts.schemaDir,
    });
    audit.push(result.audit);
    if (result.audit.status !== "migrated") continue;
    if (!result.payload) continue;

    if (willWriteJson) {
      mkdirSync(dirname(result.destinationAbs), { recursive: true });
      const body = JSON.stringify(result.payload, null, 2) + "\n";
      writeFileSync(result.destinationAbs, body, "utf-8");
    }
    if (willDeleteTs && existsSync(sourceAbs)) {
      rmSync(sourceAbs, { force: true });
    }
    migratedSourceRelPaths.add(result.audit.sourceRel);
    migratedCount++;
  }

  // Only rewrite manifest when we have actually migrated files; --single
  // omits manifest rewrite so spot-checks stay isolated.
  let manifestRewrites = 0;
  let historyAppended = false;
  if (!opts.singleFile && migratedCount > 0) {
    const r = rewriteManifest(repoRoot, migratedSourceRelPaths, {
      dryRun,
      migrationCount: migratedCount,
      specId: SPEC_ID,
      nowIso,
    });
    manifestRewrites = r.manifestRewrites;
    historyAppended = r.historyAppended;
  }

  const auditMd = renderAuditMarkdown(audit, {
    repoRoot,
    nowIso,
    mode: argvLabel,
  });
  if (!dryRun || opts.auditPath !== DEFAULT_AUDIT_PATH) {
    const auditAbs = isAbsolute(opts.auditPath)
      ? opts.auditPath
      : resolve(repoRoot, opts.auditPath);
    mkdirSync(dirname(auditAbs), { recursive: true });
    writeFileSync(auditAbs, auditMd, "utf-8");
  }

  const failedCount = audit.filter((e) => e.status === "failed").length;
  return {
    exitCode: failedCount > 0 ? 2 : 0,
    audit,
    manifestRewrites,
    historyAppended,
  };
}

async function main(argv: string[]): Promise<number> {
  const cli = parseCli(argv);
  const argvLabel = [
    cli.dryRun ? "--dry-run" : null,
    cli.keepTs ? "--keep-ts" : null,
    cli.apply ? "--apply" : null,
    cli.single ? `--single ${cli.single}` : null,
  ]
    .filter((s) => s !== null)
    .join(" ") || "--dry-run";
  const result = await runMigration(
    {
      repoRoot: DEFAULT_REPO_ROOT,
      apply: cli.apply,
      keepTs: cli.keepTs,
      singleFile: cli.single,
      auditPath: cli.auditPath,
    },
    argvLabel,
  );

  const total = result.audit.length;
  const migrated = result.audit.filter((e) => e.status === "migrated").length;
  const failed = result.audit.filter((e) => e.status === "failed").length;
  const skipped = result.audit.filter((e) => e.status === "skipped").length;
  const mode = cli.apply
    ? "--apply"
    : cli.keepTs
      ? "--keep-ts"
      : "--dry-run";
  const summary = {
    mode,
    total,
    migrated,
    failed,
    skipped,
    manifest_rewrites: result.manifestRewrites,
    history_appended: result.historyAppended,
    audit_path: cli.auditPath,
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
  if (cli.dryRun) {
    for (const e of result.audit) {
      process.stdout.write(
        `  ${e.status === "migrated" ? "PLAN" : e.status.toUpperCase()} ` +
          `${e.sourceRel} → ${e.destinationRel} (${e.targetId ?? "?"}, ` +
          `${e.caseCount ?? "?"} cases)` +
          (e.error ? `  [${e.error}]` : "") +
          "\n",
      );
    }
  }
  return result.exitCode;
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("eval-migrate-ts-to-json.ts") ||
    process.argv[1].endsWith("eval-migrate-ts-to-json"));
if (invokedDirectly) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`fatal: ${(err as Error).stack ?? err}\n`);
      process.exit(1);
    },
  );
}
