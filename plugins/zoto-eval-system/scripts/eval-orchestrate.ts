#!/usr/bin/env tsx
/**
 * Eval orchestrator.
 *
 * The single user-facing entry point that fans out to the per-backend
 * runners:
 *
 *   pnpm run eval                    → static-only
 *   pnpm run eval:full               → static + LLM (gated on CURSOR_API_KEY)
 *
 * After the JSON-first migration (spec `20260527-evals-json-first-migration`,
 * subtask 06) the orchestrator invokes a single unified Vitest config
 * (`eval:vitest` → `evals/vitest.config.ts`) when `static.framework` is
 * `vitest`. That one run discovers static smoke tests, JSON eval files, and
 * legacy co-located LLM `.test.ts` files; reporters partition cases into
 * `static.yml` and `llm.yml`. Host repos on pytest/jest still spawn the
 * static backend separately and call `eval:vitest` for the LLM/JSON path.
 *
 * Responsibilities:
 *
 *   1. Read `.zoto/eval-system/config.yml` to learn `static.framework` and
 *      `runs.retention`. The previously-read strategy and codeFramework
 *      fields are no longer consulted — the unified LLM backend does not
 *      need them.
 *   2. Compute one shared `runId` / `runTs` and create
 *      `evals/_runs/<runTs>/` BEFORE any child process runs so each
 *      backend's reporter writes into the same folder.
 *   3. Inject `ZOTO_EVAL_RUN_ID` + `ZOTO_EVAL_RUN_TS` env vars into every
 *      child so per-backend reporters honour the shared id/timestamp.
 *      Per-backend reporters that pre-date this contract still default
 *      to their own values when the env vars are unset.
 *   4. When `static.framework === "vitest"`, spawn the unified Vitest
 *      runner (`pnpm run eval:vitest`) once — it emits both `static.yml`
 *      and `llm.yml`. Otherwise spawn `eval:static:<framework>` for the
 *      static backend and, when `--full` is passed with `CURSOR_API_KEY`
 *      available, `eval:vitest` for the LLM/JSON path.
 *   5. Read `static.yml` and `llm.yml` from the run folder, merge totals
 *      and aggregates into `report.yml` with `backend: "mixed"` (or
 *      `"static"` when LLM was skipped). The merged report references
 *      per-backend files via `report.static.source_path` /
 *      `report.llm.source_path` — cases are not duplicated.
 *   6. Validate every emitted YAML against
 *      `plugins/zoto-eval-system/templates/schema/result.schema.json`.
 *      Validation failure exits non-zero.
 *   7. Drift hook: spawn `pnpm run eval:update -- --check`, capture
 *      stdout + exit code, and append a `drift:` block to
 *      `report.yml` and to `llm.yml` when that file exists. Drift NEVER
 *      fails the orchestrator's exit code
 *      (warn-only — the orchestrator's exit reflects backend pass/fail).
 *   8. Write `evals/_runs/<runTs>/.run-meta.json` with `runId`,
 *      `static_framework`, `model`, and `git_ref`.
 *
 * The orchestrator is NOT a runner itself — it spawns the static and
 * LLM runners as child processes. This keeps each backend self-contained
 * and easier to debug.
 *
 * Repo standardises on pnpm (lockfile is pnpm-lock.yaml). The user
 * rule mentions yarn but the lockfile commitment forces pnpm; the
 * substitution is documented at the spec level.
 */
import "dotenv/config";

import { execSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

import Ajv from "ajv";
import YAML from "yaml";
import { loadEvalConfig, loadEvalPaths, resultSchemaPath, resolveHostRepoRoot, resolvePluginRoot, type HostLayout } from "../src/config-loader.js";
import { spawnTsx } from "../src/spawn-tsx.js";

const REPO_ROOT = resolveHostRepoRoot();
const VITEST_SCRIPT = "eval:vitest";

export interface OrchestrateArgs {
  full: boolean;
  llmOnly: boolean;
  model?: string;
}

export interface ResolvedConfig {
  evalsDir: string;
  staticFramework: "pytest" | "vitest" | "jest";
  modelId: string;
  retention: number;
  hostLayout: HostLayout;
}

export interface OrchestrateResult {
  runId: string;
  runTs: string;
  runDir: string;
  reportPath: string;
  staticReportPath: string | null;
  llmReportPath: string | null;
  exitCode: number;
  notes: string[];
}

/* ---------------------------------------------------------------------- */
/* Argument parsing                                                       */
/* ---------------------------------------------------------------------- */

export function parseArgs(argv: string[]): OrchestrateArgs {
  const args: OrchestrateArgs = { full: false, llmOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--full") args.full = true;
    else if (a === "--llm-only") {
      args.llmOnly = true;
      args.full = true;
    } else if (a === "--model" && argv[i + 1]) {
      args.model = argv[++i];
    } else if (
      a === "--strategy" ||
      a?.startsWith("--strategy=") ||
      a === "--llm-strategy" ||
      a?.startsWith("--llm-strategy=")
    ) {
      // Transitional warning — removed by spec
      // `20260526-eval-single-backend-colocated-restructure` (subtask 03).
      // The LLM backend is now single-flavour; the flag is silently dropped
      // for now and the CHANGELOG (subtask 10) documents the removal.
      // Also accept and skip a separate value token when invoked as
      // `--strategy <value>` (no `=`).
      if (
        (a === "--strategy" || a === "--llm-strategy") &&
        argv[i + 1] !== undefined &&
        !argv[i + 1]!.startsWith("--")
      ) {
        i++;
      }
      process.stderr.write(
        `[eval-orchestrate] ignoring legacy '${a}' flag — the eval-system now has a single LLM backend (no strategy selection).\n`,
      );
    } else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp(): void {
  process.stdout.write(
    [
      "Usage: tsx scripts/eval-orchestrate.ts [--full] [--llm-only] [--model <id>]",
      "",
      "  (no flags)   Static-only run (active static framework only).",
      "  --full       Also runs the LLM backend. Requires CURSOR_API_KEY.",
      "  --llm-only   LLM backend only (skips static).",
      "  --model <id> Override LLM model id (forwarded as ZOTO_EVAL_MODEL).",
      "",
      "Outputs:",
      "  evals/_runs/<ts>/static.yml      (when static runs)",
      "  evals/_runs/<ts>/llm.yml         (when LLM runs)",
      "  evals/_runs/<ts>/report.yml      (always — merged report)",
      "  evals/_runs/<ts>/.run-meta.json  (always — manifest)",
      "",
    ].join("\n"),
  );
}

/* ---------------------------------------------------------------------- */
/* Config loading                                                          */
/* ---------------------------------------------------------------------- */

export function loadResolvedConfig(hostRepoRoot: string = REPO_ROOT): ResolvedConfig {
  const { config } = loadEvalConfig(hostRepoRoot);
  const paths = loadEvalPaths(hostRepoRoot);
  return {
    evalsDir: paths.evalsDirRel,
    staticFramework: config.static.framework,
    modelId: config.llm.model.id,
    retention: config.runs.retention,
    hostLayout: config.hostLayout,
  };
}

/* ---------------------------------------------------------------------- */
/* Run id / timestamp helpers                                              */
/* ---------------------------------------------------------------------- */

export function computeRunStamp(now: Date = new Date()): {
  runId: string;
  runTs: string;
} {
  const pad = (n: number, l = 2): string => String(n).padStart(l, "0");
  const ts =
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  return { runId: ts, runTs: ts };
}

function headSha(): string {
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO_ROOT })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

/* ---------------------------------------------------------------------- */
/* Schema validation                                                       */
/* ---------------------------------------------------------------------- */

let cachedValidator: ((doc: unknown) => boolean) | null = null;
let cachedValidatorErrors: unknown = null;
let cachedSchemaPath: string | null = null;

function getValidator(schemaPath: string): (doc: unknown) => boolean {
  if (cachedValidator && cachedSchemaPath === schemaPath) return cachedValidator;
  if (!existsSync(schemaPath)) {
    throw new Error(`result.schema.json missing at ${schemaPath}`);
  }
  const ajv = new Ajv({ allErrors: true, strict: false });
  const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
  const compiled = ajv.compile(schema);
  cachedSchemaPath = schemaPath;
  cachedValidator = (doc: unknown): boolean => {
    const ok = compiled(doc);
    cachedValidatorErrors = compiled.errors;
    return ok;
  };
  return cachedValidator;
}

export function validateAgainstResultSchema(
  doc: unknown,
  label: string,
  hostRepoRoot: string = REPO_ROOT,
): void {
  const schemaPath = resultSchemaPath(loadEvalPaths(hostRepoRoot));
  const validate = getValidator(schemaPath);
  if (!validate(doc)) {
    throw new Error(
      `${label} failed schema validation: ${JSON.stringify(
        cachedValidatorErrors,
        null,
        2,
      )}`,
    );
  }
}

/* ---------------------------------------------------------------------- */
/* Static / LLM runner dispatch                                            */
/* ---------------------------------------------------------------------- */

interface BackendOutcome {
  ranScript: string;
  exitCode: number;
  skipped: boolean;
  skipReason?: string;
}

export interface OrchestrateOpts {
  argv?: string[];
  /** Override the run timestamp/id (test seam). */
  now?: Date;
  /** Test seam: stub child-process runner. Returns the spawned exit code. */
  spawnRunner?: (
    script: string,
    env: NodeJS.ProcessEnv,
    /** When set (LLM backend only), real runner passes `pnpm run … -- --model <id>`. */
    modelCli?: string,
  ) => { exitCode: number; stdout?: string; stderr?: string };
  /** Test seam: stub the drift hook child process. */
  spawnDrift?: (env: NodeJS.ProcessEnv) => {
    exitCode: number;
    stdout: string;
  };
  /** Test seam: override `CURSOR_API_KEY` detection. */
  cursorApiKeyPresent?: boolean;
  /** Test seam: override the host repo root. */
  hostRepoRoot?: string;
}

function envWithHost(hostRepoRoot: string, env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return { ...env, ZOTO_EVAL_HOST_REPO: hostRepoRoot };
}

function spawnRunnerScript(
  hostRepoRoot: string,
  script: string,
  env: NodeJS.ProcessEnv,
  modelCli?: string,
): { exitCode: number; stdout?: string; stderr?: string } {
  const pnpmArgs =
    modelCli !== undefined && modelCli !== ""
      ? (["run", script, "--", "--model", modelCli] as const)
      : (["run", script] as const);
  const r = spawnSync("pnpm", [...pnpmArgs], {
    cwd: hostRepoRoot,
    env,
    encoding: "utf-8",
    stdio: "inherit",
  });
  return { exitCode: r.status === null ? 1 : r.status };
}

function spawnLeanBackend(
  hostRepoRoot: string,
  script: string,
  env: NodeJS.ProcessEnv,
  modelCli?: string,
): { exitCode: number } {
  const pluginRoot = resolvePluginRoot(hostRepoRoot);
  const childEnv = envWithHost(hostRepoRoot, env);
  if (modelCli) {
    childEnv.ZOTO_EVAL_MODEL = modelCli;
  }

  if (script === VITEST_SCRIPT || script === "eval:static:vitest") {
    const r = spawnTsx({
      scriptPath: join(pluginRoot, "scripts/run-vitest.ts"),
      cwd: pluginRoot,
      env: childEnv,
      searchRoots: [pluginRoot, hostRepoRoot],
    });
    return { exitCode: r.status ?? 1 };
  }

  if (script === "eval:static:jest") {
    const r = spawnTsx({
      scriptPath: join(pluginRoot, "scripts/run-jest.ts"),
      cwd: pluginRoot,
      env: childEnv,
      searchRoots: [pluginRoot, hostRepoRoot],
    });
    return { exitCode: r.status ?? 1 };
  }

  if (script === "eval:static:pytest") {
    const r = spawnSync("pytest", ["evals/", "-v", "--tb=short"], {
      cwd: hostRepoRoot,
      env: childEnv,
      stdio: "inherit",
    });
    return { exitCode: r.status ?? 1 };
  }

  const r = spawnSync("python3", [join(pluginRoot, "scripts", "test.py")], {
    cwd: hostRepoRoot,
    env: childEnv,
    stdio: "inherit",
  });
  return { exitCode: r.status ?? 1 };
}

function spawnBackend(
  hostRepoRoot: string,
  hostLayout: HostLayout,
  script: string,
  env: NodeJS.ProcessEnv,
  modelCli?: string,
): { exitCode: number } {
  if (hostLayout === "plugin") {
    return spawnLeanBackend(hostRepoRoot, script, env, modelCli);
  }
  return spawnRunnerScript(hostRepoRoot, script, env, modelCli);
}

function spawnDriftHook(
  hostRepoRoot: string,
  hostLayout: HostLayout,
  env: NodeJS.ProcessEnv,
): {
  exitCode: number;
  stdout: string;
} {
  if (hostLayout === "plugin") {
    const pluginRoot = resolvePluginRoot(hostRepoRoot);
    const r = spawnTsx({
      scriptPath: join(pluginRoot, "engine/update.ts"),
      args: ["--check"],
      cwd: pluginRoot,
      env: envWithHost(hostRepoRoot, env),
      stdio: "pipe",
      encoding: "utf-8",
      searchRoots: [pluginRoot, hostRepoRoot],
    });
    return {
      exitCode: r.status === null ? 1 : r.status,
      stdout: (r.stdout ?? "").toString(),
    };
  }

  const r = spawnSync(
    "pnpm",
    ["run", "-s", "eval:update", "--", "--check"],
    {
      cwd: hostRepoRoot,
      env,
      encoding: "utf-8",
    },
  );
  return {
    exitCode: r.status === null ? 1 : r.status,
    stdout: (r.stdout ?? "").toString(),
  };
}

/* ---------------------------------------------------------------------- */
/* Report merging                                                          */
/* ---------------------------------------------------------------------- */

interface PerBackendDoc {
  schema_version?: number;
  run_id?: string;
  started_at?: string;
  ended_at?: string;
  backend?: string;
  totals?: {
    cases?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
  };
  aggregates?: Record<string, unknown>;
}

function readBackendDoc(absPath: string): PerBackendDoc | null {
  if (!existsSync(absPath)) return null;
  try {
    const parsed = YAML.parse(readFileSync(absPath, "utf-8")) as PerBackendDoc;
    return parsed ?? null;
  } catch {
    return null;
  }
}

function totalsFrom(doc: PerBackendDoc | null): {
  cases: number;
  passed: number;
  failed: number;
  skipped: number;
} {
  const t = doc?.totals ?? {};
  return {
    cases: Number(t.cases ?? 0),
    passed: Number(t.passed ?? 0),
    failed: Number(t.failed ?? 0),
    skipped: Number(t.skipped ?? 0),
  };
}

function aggregatesFrom(doc: PerBackendDoc | null): Record<string, unknown> {
  return (doc?.aggregates as Record<string, unknown> | undefined) ?? {};
}

export function buildMergedReport(args: {
  runId: string;
  runTs: string;
  runDir: string;
  startedAt: string;
  endedAt: string;
  staticDoc: PerBackendDoc | null;
  llmDoc: PerBackendDoc | null;
  staticPath: string | null;
  llmPath: string | null;
  notes: string[];
  modelId?: string;
}): Record<string, unknown> {
  const { staticDoc, llmDoc, staticPath, llmPath } = args;
  const ranStatic = Boolean(staticDoc);
  const ranLlm = Boolean(llmDoc);

  const sTot = totalsFrom(staticDoc);
  const lTot = totalsFrom(llmDoc);

  const totals = {
    cases: sTot.cases + lTot.cases,
    passed: sTot.passed + lTot.passed,
    failed: sTot.failed + lTot.failed,
    skipped: sTot.skipped + lTot.skipped,
  };

  const aggregates: Record<string, number> = {};
  const sAgg = aggregatesFrom(staticDoc);
  const lAgg = aggregatesFrom(llmDoc);
  const sumNumber = (a: unknown, b: unknown): number => {
    const an = typeof a === "number" ? a : 0;
    const bn = typeof b === "number" ? b : 0;
    return an + bn;
  };
  aggregates.tokens_total = sumNumber(sAgg.tokens_total, lAgg.tokens_total);
  aggregates.duration_ms_total = sumNumber(
    sAgg.duration_ms_total,
    lAgg.duration_ms_total,
  );

  const backend: "mixed" | "static" | "llm" =
    ranStatic && ranLlm ? "mixed" : ranLlm ? "llm" : "static";

  const report: Record<string, unknown> = {
    backend,
  };
  if (ranStatic) {
    report.static = {
      backend: "static",
      totals: sTot,
      aggregates: sAgg,
      source_path: staticPath
        ? relative(args.runDir, staticPath)
        : "static.yml",
    };
  }
  if (ranLlm) {
    report.llm = {
      backend: "llm",
      totals: lTot,
      aggregates: lAgg,
      source_path: llmPath ? relative(args.runDir, llmPath) : "llm.yml",
    };
  }

  const doc: Record<string, unknown> = {
    schema_version: 1,
    run_id: args.runId,
    started_at: args.startedAt,
    ended_at: args.endedAt,
    backend,
    totals,
    aggregates,
    cases: [],
    report,
  };
  if (args.modelId) doc.model = args.modelId;
  if (args.notes.length > 0) doc.notes = args.notes.join(" | ");

  return doc;
}

function writeYamlSorted(absPath: string, doc: Record<string, unknown>): void {
  mkdirSync(join(absPath, ".."), { recursive: true });
  writeFileSync(
    absPath,
    YAML.stringify(doc, { sortMapEntries: true }),
    "utf-8",
  );
}

/* ---------------------------------------------------------------------- */
/* Orchestration                                                            */
/* ---------------------------------------------------------------------- */

export async function orchestrate(
  opts: OrchestrateOpts = {},
): Promise<OrchestrateResult> {
  const argv = opts.argv ?? process.argv.slice(2);
  const args = parseArgs(argv);
  const hostRepoRoot = opts.hostRepoRoot ?? REPO_ROOT;
  const cfg = loadResolvedConfig(hostRepoRoot);

  const startedAt = (opts.now ?? new Date()).toISOString();
  const stamp = computeRunStamp(opts.now ?? new Date());
  const runDir = join(hostRepoRoot, cfg.evalsDir, "_runs", stamp.runTs);
  mkdirSync(runDir, { recursive: true });

  const notes: string[] = [];
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ZOTO_EVAL_RUN_ID: stamp.runId,
    ZOTO_EVAL_RUN_TS: stamp.runTs,
    ZOTO_EVAL_RUNS_DIR: join(hostRepoRoot, cfg.evalsDir, "_runs"),
    ZOTO_EVAL_DIR: cfg.evalsDir,
  };
  if (args.model) {
    childEnv.ZOTO_EVAL_MODEL = args.model;
  } else if (process.env.ZOTO_EVAL_MODEL) {
    childEnv.ZOTO_EVAL_MODEL = process.env.ZOTO_EVAL_MODEL;
  }

  const apiKeyPresent =
    opts.cursorApiKeyPresent ?? Boolean(process.env.CURSOR_API_KEY);

  const runStatic = !args.llmOnly;
  const runLlm = args.full;
  const skipLlmReason = (() => {
    if (!runLlm) return "llm not requested (pass --full to enable)";
    if (!apiKeyPresent) return "CURSOR_API_KEY missing — llm backend skipped";
    return null;
  })();
  const llmEnabled = runLlm && apiKeyPresent;

  let staticOutcome: BackendOutcome | null = null;
  let llmOutcome: BackendOutcome | null = null;

  const spawnFn =
    opts.spawnRunner ??
    ((script, env, modelCli) =>
      spawnBackend(hostRepoRoot, cfg.hostLayout, script, env, modelCli));

  if (cfg.staticFramework === "vitest") {
    const vitestModel = llmEnabled ? args.model : undefined;
    const result = spawnFn(VITEST_SCRIPT, childEnv, vitestModel);

    if (runStatic) {
      staticOutcome = {
        ranScript: VITEST_SCRIPT,
        exitCode: result.exitCode,
        skipped: false,
      };
    }

    if (llmEnabled) {
      llmOutcome = {
        ranScript: VITEST_SCRIPT,
        exitCode: result.exitCode,
        skipped: false,
      };
    } else if (runLlm) {
      notes.push(`llm_skip: ${skipLlmReason}`);
      llmOutcome = {
        ranScript: VITEST_SCRIPT,
        exitCode: 0,
        skipped: true,
        skipReason: skipLlmReason ?? "skipped",
      };
    } else if (!args.llmOnly) {
      notes.push("llm_skip: --full not passed; static-only run");
    }
  } else {
    if (runStatic) {
      const script = `eval:static:${cfg.staticFramework}`;
      const result = spawnFn(script, childEnv);
      staticOutcome = {
        ranScript: script,
        exitCode: result.exitCode,
        skipped: false,
      };
    }

    if (llmEnabled) {
      const result = spawnFn(VITEST_SCRIPT, { ...childEnv }, args.model);
      llmOutcome = {
        ranScript: VITEST_SCRIPT,
        exitCode: result.exitCode,
        skipped: false,
      };
    } else if (runLlm) {
      notes.push(`llm_skip: ${skipLlmReason}`);
      llmOutcome = {
        ranScript: VITEST_SCRIPT,
        exitCode: 0,
        skipped: true,
        skipReason: skipLlmReason ?? "skipped",
      };
    } else {
      notes.push("llm_skip: --full not passed; static-only run");
    }
  }

  /* --------- Read per-backend reports + validate ---------- */
  const staticPath = join(runDir, "static.yml");
  const llmPath = join(runDir, "llm.yml");

  const staticDoc = runStatic ? readBackendDoc(staticPath) : null;
  const llmDoc = llmEnabled ? readBackendDoc(llmPath) : null;

  const validationErrors: string[] = [];
  if (staticDoc) {
    try {
      validateAgainstResultSchema(staticDoc, "static.yml");
    } catch (e) {
      validationErrors.push((e as Error).message);
    }
  } else if (runStatic && (staticOutcome?.exitCode ?? 0) !== 0) {
    notes.push(
      `static_runner_exit_${staticOutcome?.exitCode}: no static.yml emitted`,
    );
  } else if (runStatic) {
    notes.push("static_runner: no static.yml emitted");
  }
  if (llmDoc) {
    try {
      validateAgainstResultSchema(llmDoc, "llm.yml");
    } catch (e) {
      validationErrors.push((e as Error).message);
    }
  } else if (llmEnabled && (llmOutcome?.exitCode ?? 0) !== 0) {
    notes.push(
      `llm_runner_exit_${llmOutcome?.exitCode}: no llm.yml emitted`,
    );
  }

  const endedAt = new Date().toISOString();

  const reportDoc = buildMergedReport({
    runId: stamp.runId,
    runTs: stamp.runTs,
    runDir,
    startedAt,
    endedAt,
    staticDoc,
    llmDoc,
    staticPath: staticDoc ? staticPath : null,
    llmPath: llmDoc ? llmPath : null,
    notes,
    modelId: args.model ?? cfg.modelId,
  });

  /* --------- Drift hook (warn-only) ---------- */
  const driftFn =
    opts.spawnDrift ??
    ((env) => spawnDriftHook(hostRepoRoot, cfg.hostLayout, env));
  let driftBlock: Record<string, unknown> = {
    status: "unknown",
    exit_code: 0,
    message: "drift hook not run",
  };
  try {
    const driftEnv: NodeJS.ProcessEnv = { ...childEnv };
    const r = driftFn(driftEnv);
    driftBlock = {
      status:
        r.exitCode === 0
          ? "clean"
          : r.exitCode === 2
            ? "critical"
            : "non-critical",
      exit_code: r.exitCode,
      message: (r.stdout ?? "").trim().slice(0, 4000) || "drift hook completed",
    };
  } catch (e) {
    driftBlock = {
      status: "unknown",
      exit_code: 1,
      message: `drift hook failed: ${(e as Error).message}`,
    };
  }
  reportDoc.drift = driftBlock;

  if (existsSync(llmPath)) {
    try {
      const llmWithDrift = YAML.parse(
        readFileSync(llmPath, "utf-8"),
      ) as Record<string, unknown>;
      llmWithDrift.drift = driftBlock;
      validateAgainstResultSchema(llmWithDrift, "llm.yml");
      writeYamlSorted(llmPath, llmWithDrift);
    } catch (e) {
      validationErrors.push((e as Error).message);
    }
  }

  try {
    validateAgainstResultSchema(reportDoc, "report.yml");
  } catch (e) {
    validationErrors.push((e as Error).message);
  }

  writeYamlSorted(join(runDir, "report.yml"), reportDoc);

  /* --------- .run-meta.json ---------- */
  const meta = {
    runId: stamp.runId,
    static_framework: runStatic ? cfg.staticFramework : null,
    model: args.model ?? cfg.modelId,
    git_ref: headSha(),
    started_at: startedAt,
    ended_at: endedAt,
    notes,
  };
  writeFileSync(
    join(runDir, ".run-meta.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf-8",
  );

  /* --------- Compute exit code ---------- */
  let exitCode = 0;
  if (validationErrors.length > 0) {
    process.stderr.write(
      `[eval-orchestrate] schema validation failures:\n${validationErrors.join("\n")}\n`,
    );
    exitCode = 3;
  }
  if (staticOutcome && staticOutcome.exitCode !== 0) exitCode = exitCode || 1;
  if (llmOutcome && !llmOutcome.skipped && llmOutcome.exitCode !== 0) {
    exitCode = exitCode || 1;
  }

  return {
    runId: stamp.runId,
    runTs: stamp.runTs,
    runDir,
    reportPath: join(runDir, "report.yml"),
    staticReportPath: staticDoc ? staticPath : null,
    llmReportPath: llmDoc ? llmPath : null,
    exitCode,
    notes,
  };
}

/* ---------------------------------------------------------------------- */
/* CLI entrypoint                                                           */
/* ---------------------------------------------------------------------- */

async function main(): Promise<number> {
  const result = await orchestrate();
  process.stdout.write(
    `${JSON.stringify(
      {
        run_id: result.runId,
        run_dir: relative(REPO_ROOT, result.runDir),
        report_path: relative(REPO_ROOT, result.reportPath),
        static_path: result.staticReportPath
          ? relative(REPO_ROOT, result.staticReportPath)
          : null,
        llm_path: result.llmReportPath
          ? relative(REPO_ROOT, result.llmReportPath)
          : null,
        exit_code: result.exitCode,
        notes: result.notes,
      },
      null,
      2,
    )}\n`,
  );
  return result.exitCode;
}

const isCli =
  typeof process.argv[1] === "string" &&
  /eval-orchestrate(\.ts)?$/.test(process.argv[1] ?? "");
if (isCli) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      process.stderr.write(`${(err as Error).stack ?? String(err)}\n`);
      process.exit(1);
    },
  );
}
