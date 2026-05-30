/**
 * Centralized LLM eval harness (single backend after KD-3 of
 * spec-eval-single-backend-colocated-restructure-20260526).
 *
 * Eliminates the ~180-line boilerplate loop duplicated across every
 * stamped `<kind>/evals/<name>.test.ts` file. A thin test file imports
 * this module, defines its `CASES` array and env constants, then calls
 * `defineLlmEval(config)` to wire up the full `describe` block.
 *
 * ## Suite-load guard (interactions ↔ requiresInteraction)
 *
 * Cases that declare `interactions` (non-empty `answers` or `questions`)
 * on a **stamped** row (`_meta.generated === true`) MUST also carry
 * `_meta.primitive_analysis.requiresInteraction === true`. Mismatches
 * throw at suite-load time inside `defineLlmEval`. Hand-written
 * fixture cases without `_meta` (or with `_meta.generated !== true`) are
 * exempt — they are treated as unstamped/manual tests.
 *
 * ## Usage (thin test file pattern)
 *
 * ```ts
 * import { describe, it, afterAll, expect } from "vitest";
 * import type { LlmCaseDefinition } from "<relpath>/llm-case.js";
 * import { defineLlmEval } from "<relpath>/run-llm-suite.js";
 *
 * const CASES: LlmCaseDefinition[] = [ ... ];
 *
 * defineLlmEval({
 *   targetId: "agent:zoto-eval-comparer",
 *   cases: CASES,
 *   describe, it, afterAll, expect,
 * });
 * ```
 *
 * ## Design decisions
 *
 * - Vitest globals (`describe`, `it`, `afterAll`, `expect`) are passed in
 *   by the caller so the harness remains framework-agnostic (vitest or
 *   jest) and doesn't force `globals: true` in the vitest config.
 * - Token accounting (`resolveTokens`) and `afterAll`→`reportSuite`
 *   semantics are preserved exactly.
 * - The `CURSOR_API_KEY` skip pattern matches the existing per-test
 *   `it.skip` behavior verbatim.
 * - Grader dispatch, `parseJudgeScore`, and the assertion rubric are
 *   shared (no forked logic).
 */
import { pathToFileURL } from "node:url";

import type { LlmCaseDefinition } from "./llm-case.js";
import type { RunnerFn, RunnerParams, RunnerResult } from "./runner-params.js";
import {
  resolveInteractionPlanFromCase,
  runCaseWithScriptedAnswers,
} from "./askquestion-bridge.js";
import { isGeneratedCase } from "./_user-case-guards.js";
import {
  createAgent,
  sendPrompt,
  awaitRun,
  closeAgent,
  resolveTokens,
  PINNED_SDK_VERSION,
  TOKEN_RESULT_FIELD,
} from "#eval-engine/sdk-bridge.js";
import {
  buildSandbox,
  diffSandbox,
  postSnapshot,
  preSnapshot,
} from "./sandbox-helpers.js";
import { reportCase, reportSuite } from "./zoto-llm-reporter.js";
import { contains } from "#eval-engine/graders/contains.js";
import { regex } from "#eval-engine/graders/regex.js";
import { toolCalled } from "#eval-engine/graders/tool-called.js";
import { llmJudge } from "#eval-engine/graders/llm-judge.js";
import type { GraderReport } from "#eval-engine/graders/common.js";

/* ---------------------------------------------------------------------- */
/* Public API                                                              */
/* ---------------------------------------------------------------------- */

/** Report-facing interaction style (distinct from SDK bridge `InteractionStyle`). */
export type ReportInteractionStyle = "scripted" | "synthetic" | "none";

/**
 * Map a case definition to the comparer-facing `interaction_style` tag.
 * `scripted` = explicit `interactions.answers`; `synthetic` = legacy
 * `follow_ups[]`; `none` = single-prompt case.
 */
export function resolveReportInteractionStyle(
  c: Pick<LlmCaseDefinition, "interactions" | "follow_ups">,
): ReportInteractionStyle {
  if ((c.interactions?.answers?.length ?? 0) > 0) return "scripted";
  if ((c.follow_ups?.length ?? 0) > 0) return "synthetic";
  return "none";
}

function caseDeclaresInteractions(c: LlmCaseDefinition): boolean {
  if (!c.interactions) return false;
  return (
    (c.interactions.answers?.length ?? 0) > 0 ||
    (c.interactions.questions?.length ?? 0) > 0
  );
}

/** Declarative fields forbidden on runner cases (hybrid rejection). */
const RUNNER_FORBIDDEN_DECLARATIVE_FIELDS = [
  "prompt",
  "assertions",
  "graders",
  "fixtures",
  "expected_filesystem",
  "expected_output",
  "follow_ups",
  "assertion_patterns",
] as const;

/**
 * Returns true when `c` is a runner case — carries a non-empty `runner`
 * string. Runner cases bypass declarative grading entirely.
 */
export function isRunnerCase(c: LlmCaseDefinition): boolean {
  return typeof c.runner === "string" && c.runner.length > 0;
}

/**
 * Throws when a case carries both `runner` and any declarative field.
 * Mirrors the engine `validateEnriched` hybrid check at suite-load time.
 */
export function assertNoHybridCase(c: LlmCaseDefinition): void {
  if (!isRunnerCase(c)) return;
  for (const field of RUNNER_FORBIDDEN_DECLARATIVE_FIELDS) {
    const val = c[field as keyof LlmCaseDefinition];
    if (val === undefined || val === null) continue;
    if (field === "assertions" && Array.isArray(val) && val.length === 0) {
      continue;
    }
    if (typeof val === "string" && val.trim().length === 0) continue;
    if (Array.isArray(val) && val.length === 0) continue;
    throw new Error(
      `run-llm-suite: runner case "${c.id}" must not carry declarative field "${field}"`,
    );
  }
  if (caseDeclaresInteractions(c)) {
    throw new Error(
      `run-llm-suite: runner case "${c.id}" must not carry declarative field "interactions"`,
    );
  }
}

export interface ValidateCasesAtSuiteLoadOptions {
  /** JSON eval file path or `file://` URL — required when any case is a runner case. */
  __sourcePath?: string;
}

/**
 * Suite-load guard: stamped cases with `interactions` must declare
 * `requiresInteraction: true` in `_meta.primitive_analysis`. Runner
 * cases must not be hybrid and require `__sourcePath` for path resolution.
 */
export function validateCasesAtSuiteLoad(
  cases: LlmCaseDefinition[],
  opts?: ValidateCasesAtSuiteLoadOptions,
): void {
  for (const c of cases) {
    if (isRunnerCase(c)) {
      assertNoHybridCase(c);
      continue;
    }
    if (!caseDeclaresInteractions(c)) continue;
    if (!isGeneratedCase(c)) continue;
    if (c._meta?.primitive_analysis?.requiresInteraction !== true) {
      throw new Error(
        `run-llm-suite: case "${c.id}" declares interactions but ` +
          `_meta.primitive_analysis.requiresInteraction !== true — misclassified ` +
          `stamped case; re-run the analyser/stamper or remove interactions`,
      );
    }
  }

  const hasRunnerCase = cases.some(isRunnerCase);
  const sourcePath = opts?.__sourcePath?.trim();
  if (hasRunnerCase && !sourcePath) {
    throw new Error(
      "run-llm-suite: runner cases require `__sourcePath` on defineLlmEval options " +
        "(set by the JSON loader to the eval JSON file URL, or `import.meta.url` for hand-authored suites)",
    );
  }
}

/** Normalise `__sourcePath` to a `file://` URL for `new URL(runner, base)`. */
function normaliseSourcePath(sourcePath: string): string {
  if (sourcePath.startsWith("file:")) return sourcePath;
  return pathToFileURL(sourcePath).href;
}

/** Resolve a runner module URL relative to the JSON eval file location. */
function resolveRunnerImportUrl(sourcePath: string, runner: string): string {
  return new URL(runner, normaliseSourcePath(sourcePath)).href;
}

/**
 * Vitest (or jest) framework primitives injected by the thin test file.
 * Keeps this module decoupled from any specific test runner.
 */
export interface TestFramework {
  describe: (name: string, fn: () => void) => void;
  it: ((name: string, fn: () => Promise<void>, timeout?: number) => void) & {
    skip: (name: string, fn: () => void) => void;
  };
  afterAll: (fn: () => void) => void;
  expect: (val: unknown, message?: string) => {
    toMatch: (re: RegExp) => void;
    toBe: (expected: unknown) => void;
  };
}

/** Options accepted by {@link defineLlmEval}. */
export type DefineLlmEvalOptions = LlmEvalConfig;

export interface LlmEvalConfig {
  /** Suite target identifier, e.g. `"agent:zoto-eval-comparer"`. */
  targetId: string;
  /** Array of case definitions (the CASES blob from the stamped file). */
  cases: LlmCaseDefinition[];
  /**
   * Absolute path (or `file://` URL) to the JSON eval file that sourced
   * this test suite. **Set by the JSON loader** (`vitest-json-loader.ts`);
   * hand-authored callers may set it to `import.meta.url`. The harness
   * runner dispatch (subtask 03) resolves relative `runner` paths via
   * `new URL(runner, __sourcePath)`.
   */
  __sourcePath?: string;
  /** Model to use for the agent under test. Defaults to `ZOTO_EVAL_MODEL` or `"composer-2.5"`. */
  modelId?: string;
  /** Model to use for the LLM judge. Defaults to `ZOTO_EVAL_JUDGE_MODEL` or `"opus-4.6"`. */
  judgeModel?: string;
  /**
   * Per-case Vitest timeout in milliseconds for **light** cases. Heavy
   * cases (>= `heavyAssertionThreshold` assertions, or any `follow_ups`)
   * automatically receive `caseTimeoutMs * heavyTimeoutMultiplier`.
   * Defaults to `180_000`.
   */
  caseTimeoutMs?: number;
  /**
   * Number of assertions at which a case is considered "heavy" and
   * receives the multiplied timeout. Defaults to `9`.
   * Override repo-wide via `ZOTO_EVAL_HEAVY_THRESHOLD`.
   */
  heavyAssertionThreshold?: number;
  /**
   * Multiplier applied to `caseTimeoutMs` for heavy cases. Defaults to
   * `2`. Override repo-wide via `ZOTO_EVAL_HEAVY_MULTIPLIER`.
   */
  heavyTimeoutMultiplier?: number;
  /** Vitest/jest framework bindings. */
  describe: TestFramework["describe"];
  it: TestFramework["it"];
  afterAll: TestFramework["afterAll"];
  expect: TestFramework["expect"];
}

/**
 * Decide whether a case should receive the heavy-tier timeout. Heavy =
 * either crosses the assertion threshold OR uses follow-up turns (which
 * double the subject-agent wall time).
 */
function isHeavyCase(
  c: LlmCaseDefinition,
  heavyAssertionThreshold: number,
): boolean {
  const assertionCount = c.assertions?.length ?? 0;
  const followUpCount = c.follow_ups?.length ?? 0;
  const scriptedAnswerCount = c.interactions?.answers?.length ?? 0;
  return (
    assertionCount >= heavyAssertionThreshold ||
    followUpCount > 0 ||
    scriptedAnswerCount > 0
  );
}

/**
 * Wire up a complete `describe` block for one target's LLM eval suite.
 * This is the primary entry point — call it once from each thin test file.
 */
export function defineLlmEval(config: LlmEvalConfig): void {
  const {
    targetId,
    cases,
    describe: desc,
    it: testIt,
    afterAll: after,
    expect: assertExpect,
  } = config;

  const MODEL_ID = config.modelId ?? process.env.ZOTO_EVAL_MODEL ?? "composer-2.5";
  const JUDGE_MODEL = config.judgeModel ?? process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
  const CASE_TIMEOUT = config.caseTimeoutMs ?? 300_000;
  const HEAVY_THRESHOLD =
    config.heavyAssertionThreshold ??
    parseIntEnv("ZOTO_EVAL_HEAVY_THRESHOLD", 9);
  const HEAVY_MULTIPLIER =
    config.heavyTimeoutMultiplier ??
    parseFloatEnv("ZOTO_EVAL_HEAVY_MULTIPLIER", 2);
  const REPO_ROOT = process.cwd();
  const SUITE_START = Date.now();
  const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

  validateCasesAtSuiteLoad(cases, { __sourcePath: config.__sourcePath });

  desc(targetId, () => {
    after(() => {
      reportSuite({
        target_id: targetId,
        started_at: new Date(SUITE_START).toISOString(),
        ended_at: new Date().toISOString(),
        model: MODEL_ID,
      });
    });

    for (const c of cases) {
      const heavy = isHeavyCase(c, HEAVY_THRESHOLD);
      const perCaseTimeout = heavy
        ? Math.round(CASE_TIMEOUT * HEAVY_MULTIPLIER)
        : CASE_TIMEOUT;
      const label = heavy ? `${c.id} [heavy]` : c.id;

      if (isRunnerCase(c)) {
        const testFn = async (): Promise<void> => {
          await runRunnerCase(c, {
            targetId,
            sourcePath: config.__sourcePath!,
            modelId: MODEL_ID,
            judgeModel: JUDGE_MODEL,
            repoRoot: REPO_ROOT,
            expect: assertExpect,
          });
        };
        testIt(label, testFn, perCaseTimeout);
        continue;
      }

      const testFn = async (): Promise<void> => {
        await runCase(c, {
          targetId,
          modelId: MODEL_ID,
          judgeModel: JUDGE_MODEL,
          repoRoot: REPO_ROOT,
          expect: assertExpect,
        });
      };

      if (!API_KEY_PRESENT) {
        testIt.skip(`${c.id} (skipped: CURSOR_API_KEY missing)`, () => {});
      } else {
        testIt(label, testFn, perCaseTimeout);
      }
    }
  });
}

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseFloatEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/* ---------------------------------------------------------------------- */
/* Internal: runner-case dispatch                                          */
/* ---------------------------------------------------------------------- */

interface RunRunnerCaseOpts {
  targetId: string;
  sourcePath: string;
  modelId: string;
  judgeModel: string;
  repoRoot: string;
  expect: TestFramework["expect"];
}

function buildRunnerContext(opts: RunRunnerCaseOpts): RunnerParams["context"] {
  return {
    sdk: {
      PINNED_SDK_VERSION,
      TOKEN_RESULT_FIELD,
      createAgent,
      sendPrompt,
      awaitRun,
      closeAgent,
      resolveTokens,
    },
    sandbox: {
      buildSandbox,
      preSnapshot,
      postSnapshot,
      diffSandbox,
    },
    modelId: opts.modelId,
    judgeModel: opts.judgeModel,
    report: reportCase as RunnerParams["context"]["report"],
    expect: opts.expect as RunnerParams["context"]["expect"],
    agentFactory: ({ cwd, modelId }) =>
      createAgent({ modelId: modelId ?? opts.modelId, cwd }),
  };
}

/**
 * Dispatch a runner case to its external `.test.ts` module. Bypasses all
 * declarative grading — the runner owns assertion logic.
 *
 * @internal Exported for unit tests only.
 */
export async function runRunnerCase(
  c: LlmCaseDefinition,
  opts: RunRunnerCaseOpts,
): Promise<void> {
  const caseStart = Date.now();
  const sandbox = buildSandbox({
    runId: opts.targetId,
    caseId: c.id,
    repoRoot: opts.repoRoot,
  });
  const before = preSnapshot(sandbox.rootDir);

  let status: "passed" | "failed" | "errored" = "passed";
  let result: RunnerResult = { passed: false, reason: "runner did not execute" };
  const runnerRel = c.runner!;

  try {
    const runnerUrl = resolveRunnerImportUrl(opts.sourcePath, runnerRel);
    let mod: { default?: unknown };
    try {
      mod = await import(/* @vite-ignore */ runnerUrl);
    } catch (err) {
      throw new Error(
        `Runner case '${c.id}' could not load runner file '${runnerRel}': ${(err as Error).message}`,
      );
    }

    if (typeof mod.default !== "function") {
      throw new Error(
        `Runner case '${c.id}' runner file '${runnerRel}' does not default-export a function`,
      );
    }

    const params: RunnerParams = {
      targetId: opts.targetId,
      caseId: c.id,
      parameters: c.parameters ?? {},
      context: buildRunnerContext(opts),
    };

    result = await (mod.default as RunnerFn)(params);
    status = result.passed ? "passed" : "failed";

    opts.expect(result.passed, result.reason ?? "runner case failed").toBe(true);
  } catch (err) {
    if (status !== "failed") {
      status = "errored";
    }
    throw err;
  } finally {
    const after = postSnapshot(sandbox.rootDir);
    const mutations = diffSandbox(before, after);
    const caseEnd = Date.now();
    const graderReports: GraderReport[] = [
      {
        grader: "runner",
        verdict: status === "passed" ? "pass" : status === "failed" ? "fail" : "fail",
        detail: result.reason ?? (status === "errored" ? "runner errored" : ""),
      },
    ];
    reportCase({
      target_id: opts.targetId,
      case: {
        id: c.id,
        status,
        tokens: 0,
        duration_ms: caseEnd - caseStart,
        verbosity: 0,
        accuracy: result.passed ? 1 : 0,
        confidence: result.passed ? 1 : 0,
        grader_reports: graderReports,
        repo_mutations: mutations,
        token_source: "runner",
        ...(result.diagnostics ? { runner_diagnostics: result.diagnostics } : {}),
      },
    });
  }
}

/* ---------------------------------------------------------------------- */
/* Internal: single-case runner (declarative)                              */
/* ---------------------------------------------------------------------- */

interface RunCaseOpts {
  targetId: string;
  modelId: string;
  judgeModel: string;
  repoRoot: string;
  expect: TestFramework["expect"];
}

async function runCase(
  c: LlmCaseDefinition,
  opts: RunCaseOpts,
): Promise<void> {
  const caseStart = Date.now();
  const sandbox = buildSandbox({
    runId: opts.targetId,
    caseId: c.id,
    repoRoot: opts.repoRoot,
    fixtures: c.fixtures as never,
  });

  const before = preSnapshot(sandbox.rootDir);
  const agent = await createAgent({ modelId: opts.modelId, cwd: sandbox.rootDir });

  let text = "";
  let tokens = 0;
  let tokenSource = "approximate:chars/4";
  let status: "passed" | "failed" | "errored" = "passed";
  const reports: GraderReport[] = [];

  try {
    const usesScriptedInteractions = (c.interactions?.answers?.length ?? 0) > 0;

    if (usesScriptedInteractions) {
      const plan = resolveInteractionPlanFromCase(c);
      const scripted = await runCaseWithScriptedAnswers({
        agent,
        prompt: c.prompt,
        plan,
        resolveTokens,
      });
      text = scripted.text;
      tokens = scripted.tokens;
      tokenSource = scripted.tokenSource;
    } else {
      const run = await sendPrompt(agent, c.prompt);
      const awaited = await awaitRun(run);
      text = awaited.text;
      const resolved = resolveTokens(awaited.result, c.prompt, text);
      tokens = resolved.tokens;
      tokenSource = resolved.source;

      for (const followUp of c.follow_ups ?? []) {
        const followRun = await sendPrompt(agent, followUp);
        const followAwaited = await awaitRun(followRun);
        text += "\n" + followAwaited.text;
        tokens += resolveTokens(followAwaited.result, followUp, followAwaited.text).tokens;
      }
    }

    // Cheap objective checks run first so an obvious failure can
    // short-circuit the expensive assertion judge below.
    for (const pattern of c.assertion_patterns ?? []) {
      reports.push(regex({ type: "regex", pattern, flags: "s" }, text));
    }

    await dispatchExplicitGraders(c, text, reports, opts);

    // The assertion-derived rubric judge is the most expensive grader
    // (one full LLM call against the judge model). Skip it when an
    // objective grader has already failed — the case is going to fail
    // either way, and skipping reclaims the judge wall-time for the
    // per-case timeout budget. Users can disable the short-circuit with
    // `ZOTO_EVAL_NO_JUDGE_SHORTCIRCUIT=1` if they want full diagnostics.
    const objectiveFailed = reports.some((r) => r.verdict === "fail");
    const shortCircuitDisabled =
      process.env.ZOTO_EVAL_NO_JUDGE_SHORTCIRCUIT === "1";

    if (c.assertions.length > 0) {
      if (objectiveFailed && !shortCircuitDisabled) {
        reports.push({
          grader: "llm-judge",
          verdict: "warn",
          detail: `assertion judge skipped — objective grader/pattern already failed (${c.assertions.length} assertions not evaluated; set ZOTO_EVAL_NO_JUDGE_SHORTCIRCUIT=1 to force)`,
        });
      } else {
        await dispatchAssertionJudge(c, text, reports, opts);
      }
    }

    const failed = reports.some((r) => r.verdict === "fail");
    status = failed ? "failed" : "passed";
  } catch (err) {
    status = "errored";
    reports.push({
      grader: "runtime",
      verdict: "fail",
      detail: (err as Error).message,
    });
    throw err;
  } finally {
    await closeAgent(agent);
    const after = postSnapshot(sandbox.rootDir);
    const mutations = diffSandbox(before, after);
    const caseEnd = Date.now();
    reportCase({
      target_id: opts.targetId,
      case: {
        id: c.id,
        status,
        tokens,
        duration_ms: caseEnd - caseStart,
        verbosity:
          c.prompt.length === 0
            ? 0
            : Math.round((text.length / Math.max(1, c.prompt.length)) * 1000) / 1000,
        accuracy:
          reports.length === 0
            ? 0
            : Math.round(
                (reports.filter((r) => r.verdict === "pass").length / reports.length) * 1000,
              ) / 1000,
        confidence:
          reports.length === 0
            ? 0
            : Math.round(
                (reports.filter((r) => r.verdict !== "fail").length / reports.length) * 1000,
              ) / 1000,
        grader_reports: reports,
        repo_mutations: mutations,
        token_source: tokenSource,
        expected_output: c.expected_output,
        assertions: c.assertions,
        interactions: c.interactions,
        interaction_style: resolveReportInteractionStyle(c),
      },
    });
  }
}

/** @internal Exported for unit tests only. */
export { runCase };

/* ---------------------------------------------------------------------- */
/* Internal: grader dispatch                                               */
/* ---------------------------------------------------------------------- */

/**
 * Runs the explicit grader list declared on the case (cheap regex /
 * contains / tool-called, plus any user-specified `llm-judge` rubrics).
 * The implicit assertion-derived rubric is dispatched separately by
 * `dispatchAssertionJudge` so the runner can short-circuit it when an
 * objective grader has already failed.
 */
async function dispatchExplicitGraders(
  c: LlmCaseDefinition,
  text: string,
  reports: GraderReport[],
  opts: RunCaseOpts,
): Promise<void> {
  for (const g of c.graders ?? []) {
    const gtype = (g as { type?: string }).type;
    if (gtype === "contains") reports.push(contains(g as never, text));
    else if (gtype === "regex") reports.push(regex(g as never, text));
    else if (gtype === "tool-called") reports.push(toolCalled(g as never, []));
    else if (gtype === "llm-judge") {
      reports.push(
        await llmJudge(g as never, text, {
          judge: async ({ prompt }) => {
            const judgeAgent = await createAgent({
              modelId: opts.judgeModel,
              cwd: opts.repoRoot,
            });
            try {
              const jr = await sendPrompt(judgeAgent, prompt);
              const ja = await awaitRun(jr);
              return parseJudgeScore(ja.text);
            } finally {
              await closeAgent(judgeAgent);
            }
          },
        }),
      );
    }
  }
}

/**
 * Runs the implicit assertion-derived rubric. Pulled out of
 * `dispatchExplicitGraders` so callers can decide whether to invoke it
 * (e.g. skip when an objective grader has already produced a `fail`
 * verdict, reclaiming ~one judge LLM call's worth of wall time).
 */
async function dispatchAssertionJudge(
  c: LlmCaseDefinition,
  text: string,
  reports: GraderReport[],
  opts: RunCaseOpts,
): Promise<void> {
  if (c.assertions.length === 0) return;
  const rubric = [
    "You grade an AI agent's final natural-language reply.",
    "Score how well the RESPONSE semantically satisfies EVERY requirement below; paraphrases count.",
    "Return score 1.0 only when all requirements are clearly satisfied; lower scores when any important requirement is missing or contradicted.",
    "",
    "REQUIREMENTS:",
    ...c.assertions.map((a, i) => `${i + 1}. ${a}`),
  ].join("\n");
  reports.push(
    await llmJudge(
      {
        type: "llm-judge",
        rubric,
        passThreshold: 0.72,
      },
      text,
      {
        judge: async ({ prompt }) => {
          const judgeAgent = await createAgent({
            modelId: opts.judgeModel,
            cwd: opts.repoRoot,
          });
          try {
            const jr = await sendPrompt(judgeAgent, prompt);
            const ja = await awaitRun(jr);
            return parseJudgeScore(ja.text);
          } finally {
            await closeAgent(judgeAgent);
          }
        },
      },
    ),
  );
}

/* ---------------------------------------------------------------------- */
/* Internal: judge response parser                                         */
/* ---------------------------------------------------------------------- */

function parseJudgeScore(raw: string): { score: number; detail: string } {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { score: 0, detail: `unparseable judge response: ${raw.slice(0, 200)}` };
  try {
    const obj = JSON.parse(match[0]) as { score?: unknown; detail?: unknown };
    const score = typeof obj.score === "number" ? Math.max(0, Math.min(1, obj.score)) : 0;
    const detail = typeof obj.detail === "string" ? obj.detail : "";
    return { score, detail };
  } catch (err) {
    return { score: 0, detail: `judge JSON parse failure: ${(err as Error).message}` };
  }
}
