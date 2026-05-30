/**
 * runner-params — typed contract for the JSON-first eval system's
 * `runner` escape hatch.
 *
 * ## Purpose
 *
 * The unified JSON-first eval format (spec
 * `20260527-evals-json-first-migration`) collapses every non-skill
 * primitive eval into a single `<name>.json` shape. A JSON case may
 * opt out of declarative grading by carrying a `runner` field — a
 * relative path to a `.test.ts` file whose default export implements
 * the `RunnerFn` signature exported below.
 *
 * The harness (subtask 03) resolves the runner path relative to the
 * JSON file's directory (`new URL(runner, jsonFileUrl)`), dynamically
 * imports the module, asserts a `default` export of type `RunnerFn`,
 * and awaits it with a fully-populated `RunnerParams`. The runner's
 * `RunnerResult` is recorded through the existing `reportCase` API.
 *
 * ## Why named interfaces (and not `typeof import("./sdk-bridge")`)
 *
 * Runner authors should not need to know the location of the SDK
 * bridge module to consume its public surface. `SdkBridge` mirrors
 * that surface as a named interface so runner files can `import type
 * { RunnerParams, RunnerFn, RunnerResult }` from this single contract
 * module and never reach into harness internals directly.
 *
 * ## Backwards compatibility
 *
 * Adding this file is non-breaking. Subtask 01 only ships the contract;
 * subtask 03 wires the dispatcher and subtask 07 begins emitting `runner`
 * cases. The existing co-located `.test.ts` LLM evals keep compiling
 * unchanged.
 *
 * ## Consumers
 *
 *   - `evals/llm/_shared/run-llm-suite.ts` (subtask 03) — passes
 *     `RunnerContext` to each runner via `RunnerParams`.
 *   - `evals/llm/_shared/vitest-json-loader.ts` (subtask 02) — sets
 *     the JSON file's source path on the synthesised suite via
 *     `DefineLlmEvalOptions.__sourcePath` (see `llm-case.ts`).
 *   - User-authored `<runner-name>.test.ts` files — `default export`
 *     implements `RunnerFn`.
 *
 * The JSON-Schema mirror lives at
 * `plugins/zoto-eval-system/templates/schema/runner-params.schema.json`.
 */
import type {
  Run,
  RunResult,
  SDKAgent,
} from "@cursor/sdk";

import type {
  AwaitedRun,
  CreateAgentOptions,
} from "./sdk-bridge.js";
import type { BuildSandboxOptions } from "./sandbox-helpers.js";
import type { SandboxHandle, RepoSnapshot, SnapshotDiff } from "./sandbox-helpers.js";

/* ---------------------------------------------------------------------- */
/* SdkBridge — mirrored public surface of evals/llm/_shared/sdk-bridge.ts */
/* ---------------------------------------------------------------------- */

/**
 * Named mirror of `evals/llm/_shared/sdk-bridge.ts`'s public surface.
 * Runner authors consume the bridge through this interface so they
 * never need to know the bridge module's import path.
 *
 * The functions are exposed by reference (not invoked) so the harness
 * remains the single owner of the underlying SDK calls. Drift between
 * this interface and the real bridge is caught by the type-checker
 * when subtask 03 wires `RunnerContext`.
 */
export interface SdkBridge {
  /** Exact pinned `@cursor/sdk` version (e.g. `"1.0.12"`). */
  readonly PINNED_SDK_VERSION: string;
  /** Documented source of the per-run token count (or the fallback heuristic id). */
  readonly TOKEN_RESULT_FIELD: string;
  /** Canonical agent factory. Mirrors `sdk-bridge.createAgent`. */
  createAgent: (opts: CreateAgentOptions) => Promise<SDKAgent>;
  /** Sends a prompt to the agent and returns the in-flight `Run`. */
  sendPrompt: (agent: SDKAgent, prompt: string) => Promise<Run>;
  /** Waits for a `Run` and returns the `{ text, result }` pair. */
  awaitRun: (run: Run) => Promise<AwaitedRun>;
  /** Best-effort agent teardown. Always safe to call. */
  closeAgent: (agent: SDKAgent) => void;
  /** Resolves the token count + provenance source for a `RunResult`. */
  resolveTokens: (
    result: RunResult,
    prompt: string,
    response: string,
  ) => {
    tokens: number;
    source:
      | "result.tokens"
      | "run.tokens"
      | "result.usage.totalTokens"
      | "approximate:chars/4";
  };
}

/* ---------------------------------------------------------------------- */
/* SandboxHelper — mirrored public surface of sandbox-helpers.ts          */
/* ---------------------------------------------------------------------- */

/**
 * Named mirror of `evals/llm/_shared/sandbox-helpers.ts`. Surfaces just
 * the four helpers a runner needs to build, snapshot, and diff a
 * sandbox.
 */
export interface SandboxHelper {
  buildSandbox: (opts: BuildSandboxOptions) => SandboxHandle;
  preSnapshot: (rootDir: string) => RepoSnapshot;
  postSnapshot: (rootDir: string) => RepoSnapshot;
  diffSandbox: (before: RepoSnapshot, after: RepoSnapshot) => SnapshotDiff;
}

/* ---------------------------------------------------------------------- */
/* Reporter callback                                                       */
/* ---------------------------------------------------------------------- */

/**
 * Subset of `zoto-llm-reporter.reportCase` exposed to runners. Runners
 * call this to record a custom case row in the suite report when their
 * `RunnerResult` does not map cleanly to the implicit verdict the
 * harness derives from `passed`.
 *
 * Kept as `unknown` payload here so this contract module stays free of
 * a hard dependency on the reporter's internal `ReportedCase` shape —
 * subtask 03 will pass `reportCase` directly into `RunnerContext.report`.
 */
export type ReportCaseFn = (entry: {
  target_id: string;
  case: Record<string, unknown>;
}) => void;

/* ---------------------------------------------------------------------- */
/* Agent factory                                                           */
/* ---------------------------------------------------------------------- */

/**
 * Convenience factory exposed to runners so they can spawn an agent
 * without re-importing `@cursor/sdk` or `sdk-bridge.ts`. Mirrors
 * `sdk-bridge.createAgent` but pre-binds the harness-resolved model id
 * and api key — runners only supply the sandbox `cwd`.
 */
export type AgentFactory = (opts: {
  cwd: string;
  /** Optional per-call model override. Defaults to `RunnerContext.modelId`. */
  modelId?: string;
}) => Promise<SDKAgent>;

/* ---------------------------------------------------------------------- */
/* Vitest `expect` — kept loose to avoid forcing a `vitest` type import   */
/* ---------------------------------------------------------------------- */

/**
 * Minimal subset of Vitest's `expect` surface the runner needs. The
 * harness passes `vitest.expect` directly; the looser interface keeps
 * this contract module free of a runtime dependency on `vitest`. Runners
 * that need richer matchers may cast as needed.
 */
export interface RunnerExpect {
  (value: unknown): {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toMatch(pattern: RegExp | string): void;
    toContain(value: unknown): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeDefined(): void;
    toThrow(matcher?: RegExp | string | Error): void;
    [matcher: string]: unknown;
  };
  [key: string]: unknown;
}

/* ---------------------------------------------------------------------- */
/* RunnerContext                                                           */
/* ---------------------------------------------------------------------- */

/**
 * Context block surfaced to every runner. Exposes every harness
 * primitive a runner needs (SDK bridge, sandbox helper, model ids,
 * reporter, expect, agent factory) so runner files never need to import
 * harness internals directly.
 *
 * The block is populated by `defineLlmEval` (subtask 03) when it
 * dispatches a runner case; runner authors treat it as opaque input.
 */
export interface RunnerContext {
  /** Mirrored public surface of the canonical SDK bridge. */
  sdk: SdkBridge;
  /** Mirrored public surface of the sandbox helpers. */
  sandbox: SandboxHelper;
  /** Concrete model id resolved by the harness (e.g. `composer-2.5`). */
  modelId: string;
  /** LLM judge model id resolved by the harness (e.g. `opus-4.6`). */
  judgeModel: string;
  /** Reporter hook — records a custom case row in the suite report. */
  report: ReportCaseFn;
  /** Vitest `expect`, passed in by reference so runners avoid importing vitest directly. */
  expect: RunnerExpect;
  /** Convenience agent factory — pre-bound to the harness model id + api key. */
  agentFactory: AgentFactory;
}

/* ---------------------------------------------------------------------- */
/* RunnerParams + RunnerResult + RunnerFn                                  */
/* ---------------------------------------------------------------------- */

/**
 * Payload passed to the runner's default export. Mirrors
 * `runner-params.schema.json`.
 */
export interface RunnerParams {
  /** Suite target id (matches the wrapper's `target_id` field). */
  targetId: string;
  /** Case id (stringified when the JSON used an integer id). */
  caseId: string;
  /** Free-form payload mirrored verbatim from `case.parameters`. */
  parameters: Record<string, unknown>;
  /** Harness context — see {@link RunnerContext}. */
  context: RunnerContext;
}

/**
 * Runner verdict. The harness derives the implicit Vitest pass/fail
 * outcome from `passed`. `reason` is surfaced in the case log; arbitrary
 * `diagnostics` are forwarded to the reporter for ad-hoc dashboards.
 */
export interface RunnerResult {
  passed: boolean;
  reason?: string;
  diagnostics?: Record<string, unknown>;
}

/**
 * Default-export contract every `.test.ts` runner MUST implement:
 *
 * ```ts
 * import type { RunnerFn } from "<...>/runner-params.js";
 *
 * const run: RunnerFn = async (params) => {
 *   // … set up, run, assert …
 *   return { passed: true };
 * };
 *
 * export default run;
 * ```
 *
 * The harness asserts `typeof module.default === "function"` and casts
 * the export to `RunnerFn` before invocation; runners that omit the
 * default export fail at dispatch time with a clear error message.
 */
export type RunnerFn = (params: RunnerParams) => Promise<RunnerResult>;

/**
 * Public surface used by drift guards / unit tests. Mirrors the
 * `BRIDGE_SURFACE` pattern used elsewhere in `evals/llm/_shared/`.
 */
export const RUNNER_PARAMS_SURFACE = [
  "SdkBridge",
  "SandboxHelper",
  "ReportCaseFn",
  "AgentFactory",
  "RunnerExpect",
  "RunnerContext",
  "RunnerParams",
  "RunnerResult",
  "RunnerFn",
] as const;
