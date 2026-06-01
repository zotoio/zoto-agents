#!/usr/bin/env tsx
/* zoto-declarative-strategy:active */
/**
 * LLM eval runner — `declarative` strategy (subtask 10).
 *
 * Reads enriched `evals.json` cases (analyser payload merged into
 * `case.prompt`, `case.assertions[]`, `case.fixtures.files[]`, and
 * `_meta.primitive_analysis`) and runs them through `@cursor/sdk`. Every
 * case is funnelled through `validateEnriched(case)` before the SDK is
 * touched; cases without a real prompt, ≥1 assertion, or a valid
 * `_meta.primitive_analysis` block (when `_meta.generated === true`) are
 * rejected with a clear stderr message and the runner exits 1 BEFORE
 * paying for any Agent invocations.
 *
 * `--full`: per-case sandbox under /tmp/zoto-eval/<runId>/<caseSlug>/, repo
 * snapshots (excluding eval runs tree and common vendor dirs). Optional
 * fixtures and `expected_filesystem`. The ONLY allowed writes under the
 * workspace are logs under `evals/_runs/` (handled by writer after each case
 * completes).
 *
 * `--list`: discover JSON case files — no sandbox, no CURSOR_API_KEY.
 *
 * Two-gate startup for execution:
 *   1. `--full` must be passed explicitly (unless `--judge-only`).
 *   2. CURSOR_API_KEY must be present when executing agents.
 *
 * `--judge-only`: smoke validation of latest llm.yml (no Agent, no sandbox).
 *
 * Output filename: subtask 10 renamed the per-backend file from
 * `results.yml` to `llm.yml` to sit alongside the static backend's
 * `static.yml` and the merged top-level `report.yml` (subtask 12).
 *
 * The literal `/* zoto-declarative-strategy:active *\u002F` marker on line
 * 2 is the explicit signal subtask 09's mutual-exclusion guard
 * (`scripts/eval-stamp.ts#assertNoConflictingLlmStrategy`) checks for to
 * decide whether the host repo is currently using the declarative strategy.
 *
 * Environment loading: `.env` at the repo root is loaded via `dotenv/config`
 * before any process.env reads. Anything already exported in the shell wins
 * over `.env` (standard dotenv precedence). `.env.example` ships as a placeholder.
 */
import "dotenv/config";

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __engine_dir = dirname(fileURLToPath(import.meta.url));

import YAML from "yaml";

import {
  casesOf,
  isRunnerCase,
  loadEvalFile,
  validateEnriched,
  type DeclarativeEvalCase,
  type EvalCase,
  type EvalFile,
} from "./case.js";
import { loadAndValidateEvalFile } from "./update.js";
import { computeMetrics } from "./metrics.js";
import { writeResults, type WriterCase } from "./writer.js";
import { contains } from "./graders/contains.js";
import { regex } from "./graders/regex.js";
import { toolCalled } from "./graders/tool-called.js";
import { llmJudge } from "./graders/llm-judge.js";
import type { GraderReport } from "./graders/common.js";
import type { SnapshotDiff } from "./sandbox.js";
import { loadEvalConfig, resolveHostRepoRoot } from "../src/config-loader.js";
import {
  createSandbox,
  diffSnapshots,
  materializeFixtures,
  snapshotDir,
  snapshotRepo,
  verifyExpectedFilesystemAgainstDiff,
  caseSlug,
} from "./sandbox.js";
/* Subtask 10: route every `@cursor/sdk` call through the bridge so a
 * future SDK breaking change only needs one patch. The bridge owns the
 * canonical `Agent.create` / `agent.send` / `run.wait` shape and the
 * offline-safe token resolver. */
import {
  createAgent,
  sendPrompt,
  awaitRun,
  closeAgent,
  resolveTokens,
  type SDKAgent,
} from "./sdk-bridge.js";

const REPO_ROOT = resolveHostRepoRoot();

const DEFAULT_EXCLUDE = [
  "evals/_runs",
  "node_modules",
  ".git",
  ".venv",
  "evals/__pycache__",
];

type Args = {
  full: boolean;
  list: boolean;
  judgeOnly: boolean;
  model?: string;
};

function emptyRepoDiff(): SnapshotDiff {
  return { added: [], modified: [], removed: [] };
}

function parseArgs(argv: string[]): Args {
  const args: Args = { full: false, list: false, judgeOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--full") args.full = true;
    else if (a === "--list") args.list = true;
    else if (a === "--judge-only") args.judgeOnly = true;
    else if (a === "--model") args.model = argv[++i];
    else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(
    "Usage: tsx evals/_llm/runner.ts [--full] [--list] [--judge-only] [--model <id>]",
  );
  console.log("");
  console.log("  --full        Execute LLM cases. Requires CURSOR_API_KEY.");
  console.log("  --list        List discovered cases and exit.");
  console.log(
    "  --judge-only  Smoke: validate latest llm.yml exists (no Agent run).",
  );
  console.log("  --model <id>  Override model (composer-2.5 | claude-opus-4-8[] | sonnet).");
}

function loadConfig(): Record<string, unknown> {
  try {
    return loadEvalConfig(REPO_ROOT).config as unknown as Record<string, unknown>;
  } catch {
    return {};
  }
}

function resolveModel(args: Args, config: Record<string, unknown>): string {
  if (args.model) return args.model;
  if (process.env.ZOTO_EVAL_MODEL) return process.env.ZOTO_EVAL_MODEL;
  const llm = (config.llm ?? {}) as Record<string, unknown>;
  const model = (llm.model ?? {}) as Record<string, unknown>;
  return (model.id as string) ?? "composer-2.5";
}

function discoverCentralPluginEvalJson(): string[] {
  const pluginsRoot = join(REPO_ROOT, "plugins");
  if (!existsSync(pluginsRoot)) return [];
  const kinds = ["commands", "agents", "hooks"] as const;
  const out: string[] = [];
  for (const plugin of readdirSync(pluginsRoot)) {
    const pluginDir = join(pluginsRoot, plugin);
    let st;
    try {
      st = statSync(pluginDir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    for (const kind of kinds) {
      const dir = join(pluginDir, "evals", kind);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      for (const f of readdirSync(dir).sort()) {
        if (!f.endsWith(".json")) continue;
        out.push(join(dir, f));
      }
    }
  }
  return out;
}

function discoverCursorCentralEvalJson(): string[] {
  const cursor = join(REPO_ROOT, ".cursor");
  if (!existsSync(cursor)) return [];
  const kinds = ["commands", "agents", "hooks"] as const;
  const out: string[] = [];
  for (const kind of kinds) {
    const dir = join(cursor, "evals", kind);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir).sort()) {
      if (!f.endsWith(".json")) continue;
      out.push(join(dir, f));
    }
  }
  return out;
}

const COLOCATED_EVAL_JSON_KINDS = ["commands", "agents", "hooks"] as const;

/**
 * Walk co-located non-skill JSON eval files:
 *   `<host>/{plugins/*, .cursor}/{commands,agents,hooks}/evals/*.json`
 *
 * Excludes the legacy central tree at `plugins/<p>/evals/{commands,...}/`.
 */
export function discoverCoLocatedEvalJson(
  hostRepoRoot: string = REPO_ROOT,
): string[] {
  const out: string[] = [];

  function pushFromKindDir(kindDir: string): void {
    if (!existsSync(kindDir) || !statSync(kindDir).isDirectory()) return;
    const evalsDir = join(kindDir, "evals");
    if (!existsSync(evalsDir) || !statSync(evalsDir).isDirectory()) return;
    for (const entry of readdirSync(evalsDir).sort()) {
      if (!entry.endsWith(".json")) continue;
      const full = join(evalsDir, entry);
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
      for (const kind of COLOCATED_EVAL_JSON_KINDS) {
        pushFromKindDir(join(pluginDir, kind));
      }
    }
  }

  const cursorRoot = join(hostRepoRoot, ".cursor");
  if (existsSync(cursorRoot) && statSync(cursorRoot).isDirectory()) {
    for (const kind of COLOCATED_EVAL_JSON_KINDS) {
      pushFromKindDir(join(cursorRoot, kind));
    }
  }

  return Array.from(new Set(out)).sort();
}

function discoverCaseFiles(
  evalsDir: string,
  config: Record<string, unknown>,
): string[] {
  const roots = (config.skillsRoots as string[]) ?? [
    ".cursor/skills",
    "skills",
    "plugins/*/skills",
  ];
  const out: string[] = [];
  for (const rootPat of roots) {
    const root = resolve(REPO_ROOT, rootPat.replace(/\*.*$/, ""));
    walk(root, (f: string) => {
      if (f.endsWith("/evals/evals.json")) out.push(f);
    });
  }
  out.push(...discoverCentralPluginEvalJson());
  out.push(...discoverCursorCentralEvalJson());
  const llmCases = join(REPO_ROOT, evalsDir, "_llm", "cases.json");
  if (existsSync(llmCases)) out.push(llmCases);
  return Array.from(new Set(out)).sort();
}

function walk(dir: string, fn: (f: string) => void): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, fn);
    else fn(full);
  }
}

/** Non-skill JSON eval files carry `target_id`; legacy shapes use named fields. */
type EvalFileWithTarget = EvalFile & { target_id?: string };

function targetIdOf(file: EvalFileWithTarget): string | null {
  if (typeof file.target_id === "string" && file.target_id.length > 0) {
    return file.target_id;
  }
  if (typeof file.target === "string" && file.target.length > 0) {
    return file.target;
  }
  if (file.skill_name) return `skill:${file.skill_name}`;
  if (file.command_name) return `command:${file.command_name}`;
  if (file.agent_name) return `agent:${file.agent_name}`;
  if (file.hook_plugin) return `hook:${file.hook_plugin}`;
  return null;
}

export interface PartitionedEvalFile {
  targetId: string | null;
  declarative: EvalCase[];
  runners: EvalCase[];
}

/**
 * Load a JSON eval file and partition cases into declarative vs runner
 * buckets. Returns `null` when the file cannot be parsed.
 */
export function loadAndPartitionEvalFile(
  path: string,
): PartitionedEvalFile | null {
  try {
    const file = loadAndValidateEvalFile(path) as EvalFileWithTarget;
    const declarative: EvalCase[] = [];
    const runners: EvalCase[] = [];
    for (const c of casesOf(file)) {
      if (isRunnerCase(c)) runners.push(c);
      else declarative.push(c);
    }
    return {
      targetId: targetIdOf(file),
      declarative,
      runners,
    };
  } catch {
    return null;
  }
}

/** `--list` line format: `<targetId>#<caseId>` with optional runner suffix. */
export function formatListLine(
  targetId: string | null,
  c: EvalCase,
): string {
  const tid = targetId ?? "unknown:target";
  const base = `${tid}#${c.id}`;
  if (isRunnerCase(c) && typeof c.runner === "string") {
    return `${base} [runner: ${c.runner}]`;
  }
  return base;
}

/** Summary log emitted once per target during `--full` when runner cases defer to Vitest. */
export function formatDeferredRunnerLine(
  targetId: string | null,
  count: number,
): string {
  const tid = targetId ?? "unknown:target";
  return `[runner-cases] target=${tid} count=${count} deferred-to-vitest`;
}

/* Subtask 10: bridge-backed agent factory. The bridge owns the
 * canonical `Agent.create(...)` shape; the runner only knows about the
 * (apiKey, modelId, cwd) → Promise<SDKAgent> contract. Tests inject a
 * stub that mirrors this shape so we never need to mock `@cursor/sdk`. */
type AgentFactory = (cwd: string) => Promise<SDKAgent>;

async function finishCase(
  c: DeclarativeEvalCase,
  opts: {
    started: number;
    logLines: string[];
    response: string;
    agentError?: string;
    fixtureError?: string;
    toolCalls: Array<{ tool: string; ok: boolean }>;
    beforeRepo: import("./sandbox.js").RepoSnapshot | null;
    afterRepo: import("./sandbox.js").RepoSnapshot | null;
    beforeSandbox: import("./sandbox.js").RepoSnapshot | null;
    afterSandbox: import("./sandbox.js").RepoSnapshot | null;
    skipSnapshots: boolean;
  },
): Promise<WriterCase> {
  const started = opts.started;
  const ended = Date.now();

  let repoMut = emptyRepoDiff();
  let fsAgg = { passed: 0, failed: 0, detail: [] as string[] };

  if (!opts.skipSnapshots && opts.beforeRepo && opts.afterRepo) {
    repoMut = diffSnapshots(opts.beforeRepo, opts.afterRepo);
  }

  if (
    !opts.skipSnapshots &&
    opts.beforeSandbox &&
    opts.afterSandbox
  ) {
    const sandboxDiff = diffSnapshots(opts.beforeSandbox, opts.afterSandbox);
    fsAgg = verifyExpectedFilesystemAgainstDiff(
      sandboxDiff,
      opts.beforeSandbox,
      opts.afterSandbox,
      c.expected_filesystem,
    );
  } else if (!c.expected_filesystem) {
    fsAgg = { passed: 0, failed: 0, detail: [] };
  }

  const reports: GraderReport[] = [];

  const repoIntegrityFail =
    repoMut.added.length > 0 ||
    repoMut.modified.length > 0 ||
    repoMut.removed.length > 0;

  if (repoIntegrityFail) {
    reports.push({
      grader: "repo_mutation",
      verdict: "fail",
      detail: [
        `added: ${repoMut.added.join(", ") || "(none)"}`,
        `modified: ${repoMut.modified.join(", ") || "(none)"}`,
        `removed: ${repoMut.removed.join(", ") || "(none)"}`,
      ].join(" | "),
    });
  } else {
    reports.push({
      grader: "repo_mutation",
      verdict: "pass",
      detail: "no disallowed tracked repo mutations (evals/_runs excluded from snapshot)",
    });
  }

  if (opts.fixtureError) {
    reports.push({
      grader: "fixtures",
      verdict: "fail",
      detail: opts.fixtureError,
    });
  }

  if (opts.agentError) {
    reports.push({
      grader: "runtime",
      verdict: "fail",
      detail: opts.agentError,
    });
  }

  const hasExpectedFilesystem = Boolean(
    c.expected_filesystem &&
      (c.expected_filesystem.created?.length ||
        c.expected_filesystem.modified?.length ||
        c.expected_filesystem.removed?.length ||
        c.expected_filesystem.unchanged?.length),
  );

  if (hasExpectedFilesystem) {
    reports.push({
      grader: "filesystem",
      verdict: fsAgg.failed === 0 ? "pass" : "fail",
      detail:
        fsAgg.detail.join("; ") ||
        (fsAgg.failed === 0 ? "filesystem expectations satisfied" : "filesystem mismatch"),
    });
  }

  const response = opts.response ?? "";

  /** Post-hoc graders (only when runner reached agent invocation without fixture fatal). */
  if (!opts.fixtureError && opts.beforeSandbox !== null) {
    for (const g of c.graders ?? []) {
      const t = (g as { type?: string }).type;
      if (t === "contains") reports.push(contains(g as never, response));
      else if (t === "regex") reports.push(regex(g as never, response));
      else if (t === "tool-called")
        reports.push(toolCalled(g as never, opts.toolCalls));
      else if (t === "llm-judge") {
        reports.push(
          await llmJudge(g as never, response, {
            judge: async ({ prompt }) => ({
              score: 0.5,
              detail: `stub: ${prompt.length} chars`,
            }),
          }),
        );
      }
    }
  }

  const assertionsMet = reports.filter((r) => r.verdict === "pass").length;
  const assertionsTotal =
    reports.length > 0 ? reports.length : c.assertions.length;
  const metrics = computeMetrics({
    prompt: c.prompt,
    response,
    assertionsMet,
    assertionsTotal,
    toolCalls: opts.toolCalls,
    startedAt: started,
    endedAt: ended,
  });

  opts.logLines.push("grader reports:");
  for (const r of reports) {
    opts.logLines.push(`  - ${r.grader}: ${r.verdict} - ${r.detail}`);
  }
  opts.logLines.push(`metrics: ${JSON.stringify(metrics)}`);

  let status: WriterCase["status"] = "passed";
  if (opts.fixtureError) status = "errored";
  else if (opts.agentError) status = "errored";
  else if (reports.some((r) => r.verdict === "fail")) status = "failed";

  /* Subtask 10: surface the analyser-payload provenance per case so
   * downstream consumers (judge, comparer, updater) can correlate
   * runner outcomes with the analyser version that produced the case. */
  const primitiveAnalysis = c._meta?.primitive_analysis
    ? {
        source_hash: c._meta.primitive_analysis.source_hash,
        analyser_version: c._meta.primitive_analysis.analyser_version,
        summary: c._meta.primitive_analysis.summary,
      }
    : undefined;

  return {
    id: String(c.id),
    status,
    metrics,
    grader_reports: reports,
    log: opts.logLines.join("\n"),
    repo_mutations: repoMut,
    filesystem_assertions: {
      passed: fsAgg.passed,
      failed: fsAgg.failed,
      detail: fsAgg.detail,
    },
    ...(primitiveAnalysis ? { primitive_analysis: primitiveAnalysis } : {}),
  } as unknown as WriterCase;
}

async function runCase(
  c: DeclarativeEvalCase,
  agentFactory: AgentFactory,
  ctx: { runId: string },
): Promise<WriterCase> {
  const started = Date.now();
  const log: string[] = [];
  log.push(`# Case ${c.id}`);
  const handle = createSandbox(ctx.runId, c.id);
  log.push(`sandbox_path: ${handle.rootDir}`);
  log.push(`case_slug: ${caseSlug(c.id)}`);
  log.push(`prompt: ${c.prompt}`);

  try {
    materializeFixtures(handle, c.fixtures, REPO_ROOT);
  } catch (e) {
    log.push(`FIXTURE_ERROR: ${(e as Error).message}`);
    return await finishCase(c, {
      started,
      logLines: log,
      response: "",
      fixtureError: (e as Error).message,
      toolCalls: [],
      beforeRepo: null,
      afterRepo: null,
      beforeSandbox: null,
      afterSandbox: null,
      skipSnapshots: true,
    });
  }

  const beforeRepo = snapshotRepo(REPO_ROOT, DEFAULT_EXCLUDE);
  const beforeSandbox = snapshotDir(handle.rootDir);

  let response = "";
  let agentError: string | undefined;
  let tokenSource: string | undefined;
  const toolCalls: Array<{ tool: string; ok: boolean }> = [];
  const originalCwd = process.cwd();
  let agent: SDKAgent | undefined;

  try {
    process.chdir(handle.rootDir);
    log.push(`chdir: ${handle.rootDir}`);
    /* Subtask 10: agent is created PER CASE because `local.cwd` is
     * fixed at construction time on the live SDK (`@cursor/sdk` v1.0.12).
     * The bridge re-uses Agent.create under the hood — see
     * `evals/_llm/sdk-bridge.ts` for the canonical pattern. */
    agent = await agentFactory(handle.rootDir);
    const run = await sendPrompt(agent, c.prompt);
    const awaited = await awaitRun(run);
    response = awaited.text;
    const tokens = resolveTokens(awaited.result, c.prompt, response);
    tokenSource = tokens.source;
    log.push("response:");
    log.push(response);
    log.push(`tokens: ${tokens.tokens} (source: ${tokens.source})`);
  } catch (err) {
    agentError = (err as Error).message;
    log.push(`ERROR: ${agentError}`);
  } finally {
    if (agent) closeAgent(agent);
    process.chdir(originalCwd);
  }
  /* Surface token-resolver provenance in the per-case log so the judge
   * skill can flag runs whose token counts came from the chars/4
   * heuristic vs a real SDK field. */
  void tokenSource;

  let afterRepo;
  let afterSandbox;
  try {
    afterRepo = snapshotRepo(REPO_ROOT, DEFAULT_EXCLUDE);
    afterSandbox = snapshotDir(handle.rootDir);
  } catch (snapErr) {
    agentError ??= `post-run snapshot failed: ${(snapErr as Error).message}`;
    log.push(`SNAPSHOT_ERROR: ${(snapErr as Error).message}`);
    afterRepo = beforeRepo;
    afterSandbox = beforeSandbox;
  }

  return await finishCase(c, {
    started,
    logLines: log,
    response,
    agentError,
    toolCalls,
    beforeRepo,
    afterRepo,
    beforeSandbox,
    afterSandbox,
    skipSnapshots: false,
  });
}

async function runCaseSafely(
  c: DeclarativeEvalCase,
  agentFactory: AgentFactory,
  ctx: { runId: string },
): Promise<WriterCase> {
  try {
    return await runCase(c, agentFactory, ctx);
  } catch (e) {
    const msg = (e as Error).message;
    const started = Date.now();
    const ended = Date.now();
    return {
      id: String(c.id),
      status: "errored",
      metrics: computeMetrics({
        prompt: c.prompt,
        response: "",
        assertionsMet: 0,
        assertionsTotal: c.assertions.length,
        toolCalls: [],
        startedAt: started,
        endedAt: ended,
      }),
      grader_reports: [
        {
          grader: "suite",
          verdict: "fail",
          detail: `uncaught runner error: ${msg}`,
        },
      ],
      log: `# Case ${c.id}\nfatal_suite_error: ${msg}`,
      repo_mutations: emptyRepoDiff(),
      filesystem_assertions: { passed: 0, failed: 0, detail: [] },
    } as unknown as WriterCase;
  }
}

function smokeJudgeOnly(evalsDir: string): number {
  const runsRoot = join(REPO_ROOT, evalsDir, "_runs");
  if (!existsSync(runsRoot)) {
    console.log(
      JSON.stringify({
        smoke: "judge-only",
        skipped: true,
        reason: `no ${evalsDir}/_runs directory — YAML replay skipped`,
        note: "Run tsx evals/_llm/runner.ts --full once to populate llm.yml for replay.",
      }),
    );
    return 0;
  }
  const runs = readdirSync(runsRoot)
    .filter((d) => statSync(join(runsRoot, d)).isDirectory())
    .sort()
    .reverse();
  if (runs.length === 0) {
    console.log(
      JSON.stringify({
        smoke: "judge-only",
        skipped: true,
        reason: "no completed runs under evals/_runs",
        note: "YAML parsed when llm.yml exists; full llm-judge replay not implemented.",
      }),
    );
    return 0;
  }
  /* Subtask 10: prefer the renamed `llm.yml`, fall back to the legacy
   * `results.yml` only for runs created BEFORE the rename so historical
   * snapshots stay replayable. New runs only emit `llm.yml`. */
  const llmPath = join(runsRoot, runs[0]!, "llm.yml");
  const legacyPath = join(runsRoot, runs[0]!, "results.yml");
  const latest = existsSync(llmPath) ? llmPath : legacyPath;
  if (!existsSync(latest)) {
    console.error(`Missing ${llmPath} (and legacy ${legacyPath})`);
    return 1;
  }
  YAML.parse(readFileSync(latest, "utf-8"));
  console.log(
    JSON.stringify({
      smoke: "judge-only",
      llm_yml: latest,
      note: "YAML parsed — full llm-judge replay not implemented",
    }),
  );
  return 0;
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const evalsDir = (config.evalsDir as string) ?? "evals";

  if (args.list) {
    const files = discoverCaseFiles(evalsDir, config);
    for (const f of files) {
      const loaded = loadAndPartitionEvalFile(f);
      if (!loaded) continue;
      try {
        const file = loadEvalFile(f) as EvalFileWithTarget;
        for (const c of casesOf(file)) {
          console.log(formatListLine(loaded.targetId, c));
        }
      } catch {
        /* skip unreadable */
      }
    }
    return 0;
  }

  if (args.judgeOnly) {
    return smokeJudgeOnly(evalsDir);
  }

  if (!args.full) {
    /* Subtask 10: friendly default. Without --full we don't run any
     * SDK calls, so exit cleanly with a skip message rather than
     * failing the script. CI scripts that want a hard "must run"
     * gate use `--full` explicitly. */
    console.log(
      JSON.stringify({
        skipped: true,
        reason: "--full not passed; declarative runner is a no-op without it",
        hint: "pnpm run eval:llm:declarative -- --full   (requires CURSOR_API_KEY)",
      }),
    );
    return 0;
  }
  if (!process.env.CURSOR_API_KEY) {
    /* Subtask 10 DoD #3: skip cleanly + exit 0 when CURSOR_API_KEY
     * is missing so dry runs in CI / dev sandboxes don't fail loudly. */
    console.log(
      JSON.stringify({
        skipped: true,
        reason: "CURSOR_API_KEY not set; declarative runner skipping",
        hint: "Set CURSOR_API_KEY in your environment (or .env) and re-run.",
      }),
    );
    return 0;
  }

  const model = resolveModel(args, config);
  const files = discoverCaseFiles(evalsDir, config);
  const loaded = files
    .map((f) => loadAndPartitionEvalFile(f))
    .filter((x): x is PartitionedEvalFile => x !== null);

  for (const l of loaded) {
    if (l.runners.length === 0) continue;
    console.error(formatDeferredRunnerLine(l.targetId, l.runners.length));
  }

  const allCases = loaded.flatMap((l) => l.declarative);

  /* Subtask 10 enriched-shape gate. Run BEFORE constructing Agent so we
   * fail fast on cheap, deterministic problems (missing prompt, empty
   * assertions, missing _meta.primitive_analysis) without paying for an
   * SDK initialisation. */
  const rejections: Array<{ id: string; reason: string }> = [];
  for (const c of allCases) {
    const v = validateEnriched(c);
    if (!v.ok) {
      rejections.push({ id: String(c.id), reason: v.reason ?? "unknown" });
    }
  }
  if (rejections.length > 0) {
    console.error(
      `LLM declarative runner rejected ${rejections.length} case(s) ` +
        `(declarative strategy requires a real prompt, ≥1 assertion, and ` +
        `_meta.primitive_analysis on every generated case):`,
    );
    for (const r of rejections) {
      console.error(`  - ${r.id}: ${r.reason}`);
    }
    return 1;
  }

  /* Subtask 10: SDK access funnels through `evals/_llm/sdk-bridge.ts`
   * (subtask 09 deliverable) so any future `@cursor/sdk` breaking change
   * only needs a one-place patch. We hand the runner an `AgentFactory`
   * because `local.cwd` is fixed at construction time on SDK 1.0.12 —
   * each case's sandbox dir becomes its own agent's cwd. */
  const apiKey = process.env.CURSOR_API_KEY!;
  const agentFactory: AgentFactory = (cwd) =>
    createAgent({ apiKey, modelId: model, cwd });

  const runId = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
  const startedAt = new Date().toISOString();
  const results: WriterCase[] = [];

  for (const c of allCases) {
    results.push(
      await runCaseSafely(c as DeclarativeEvalCase, agentFactory, { runId }),
    );
  }

  const endedAt = new Date().toISOString();

  const schemaPath = join(__engine_dir, "result.schema.json");
  const out = writeResults({
    runId,
    evalsDir,
    backend: "llm",
    model,
    startedAt,
    endedAt,
    cases: results,
    schemaPath,
  });
  console.log(`Wrote ${out}`);
  return results.every((r) => r.status === "passed") ? 0 : 1;
}

function isRunnerEntrypoint(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return pathToFileURL(resolve(entry)).href === import.meta.url;
  } catch {
    return entry.endsWith("runner.ts") || entry.endsWith("runner.js");
  }
}

if (isRunnerEntrypoint()) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
