/**
 * sdk-bridge — the single wrapper around `@cursor/sdk` used by every LLM
 * eval code path in this repo.
 *
 * ## Why this file exists
 *
 * `@cursor/sdk` evolves. A future API change (renamed methods, extra
 * required options, different result field names, …) should need a
 * one-place patch, not a sweep across every stamped template. Every
 * consumer below MUST import the SDK through this bridge:
 *
 *   Consumers (direct):
 *     - `scripts/eval-analyse.ts` (subtask 04 — kept using the canonical
 *       pattern; the bridge re-exports the same shape).
 *     - `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/` — every
 *       stamped `*.test.ts` imports `createAgent`, `sendPrompt`, and
 *       `awaitRun` from a thin per-repo copy of this bridge
 *       (`evals/llm/_shared/sdk-bridge.ts`).
 *     - `evals/_llm/sdk-bridge.selftest.ts` — runtime probe that pins the
 *       token-field constant below.
 *
 *   Consumers (indirect via `zoto-llm-reporter`):
 *     - `evals/llm/_shared/zoto-llm-reporter.ts`
 *
 * ## Canonical pattern (subtask 09 / spec "Cursor SDK doc anchor")
 *
 *   const agent = await createAgent({ apiKey, modelId, cwd });
 *   const run = await sendPrompt(agent, prompt);
 *   const { text, result } = await awaitRun(run);
 *
 * `text` is always a plain string (possibly empty). `result` is the raw
 * `RunResult` from `@cursor/sdk` so callers can extract `durationMs`,
 * `model`, etc. without reimporting the SDK types.
 *
 * ## Token-field pinning
 *
 * See the JSDoc on `TOKEN_RESULT_FIELD` and `resolveTokens(...)` below.
 * The `RunResult` type exposed by `@cursor/sdk` v1.0.12 (the version
 * pinned by this repo) DOES NOT carry a per-run token count — `tokens`,
 * `run.tokens`, and `result.usage.totalTokens` are all absent from the
 * public surface (confirmed by inspecting
 * `node_modules/@cursor/sdk/dist/esm/run.d.ts#RunResult`). The bridge
 * therefore falls back to a char-based heuristic (`metrics.ts#computeMetrics`
 * shape) and the `sdk-bridge.selftest.ts` probe asserts that fallback
 * remains correct on the installed SDK. Bump the pin and re-run the
 * self-test whenever `@cursor/sdk` ships a release that exposes a real
 * token count.
 */
import { Agent } from "@cursor/sdk";
import type { Run, RunResult, SDKAgent } from "@cursor/sdk";

export type { SDKAgent, Run, RunResult };

/**
 * Exact SDK version this bridge was last verified against. When you bump
 * `@cursor/sdk`, also update this constant and re-run
 * `tsx evals/_llm/sdk-bridge.selftest.ts --probe-types` so the token-field
 * pin below stays honest.
 */
export const PINNED_SDK_VERSION = "1.0.12" as const;

/**
 * The resolved path on a `RunResult` that carries the per-run token count.
 *
 *   - `"result.tokens"`         — not present on SDK 1.0.12
 *   - `"run.tokens"`            — not present on SDK 1.0.12
 *   - `"result.usage.totalTokens"` — not present on SDK 1.0.12
 *   - `"approximate:chars/4"`   — current fallback (char-based heuristic)
 *
 * The reporter reads this constant verbatim so it can annotate the
 * per-case report with the honest provenance of the token number.
 * Whenever a future SDK release exposes a real token count, change this
 * constant together with `resolveTokens(...)` below and update every
 * template README cross-reference in one patch.
 */
export const TOKEN_RESULT_FIELD = "approximate:chars/4" as const;

/**
 * Minimal shape every stamped template expects from `awaitRun(...)`.
 * Kept intentionally thin so tests can inject a stub without pulling the
 * real `@cursor/sdk` surface.
 */
export interface AwaitedRun {
  /** Guaranteed non-null string (empty when the SDK returned no text). */
  text: string;
  /** Raw `RunResult` pass-through — consumers may read `durationMs`, etc. */
  result: RunResult;
}

export interface CreateAgentOptions {
  /** Cursor API key; defaults to `process.env.CURSOR_API_KEY`. */
  apiKey?: string;
  /** Concrete Cursor model id (e.g. `composer-2.5`, `claude-opus-4-8[]`). */
  modelId: string;
  /** Sandbox / workspace cwd — the agent executes against this tree. */
  cwd: string;
}

/**
 * Canonical agent-creation call. Consumers must never call
 * `Agent.create(...)` directly; routing through this function guarantees
 * the next SDK breaking change only needs a single patch here.
 *
 * Returns `SDKAgent` (the instance surface — `Agent` is the
 * static factory class on `@cursor/sdk`).
 */
export async function createAgent(opts: CreateAgentOptions): Promise<SDKAgent> {
  const apiKey = opts.apiKey ?? process.env.CURSOR_API_KEY;
  if (!apiKey) {
    throw new Error(
      "sdk-bridge.createAgent: CURSOR_API_KEY is not set and no apiKey was passed",
    );
  }
  return Agent.create({
    apiKey,
    model: { id: opts.modelId },
    local: { cwd: opts.cwd },
  });
}

/**
 * Canonical "start the run" call. Mirrors `agent.send(prompt)` on the
 * live SDK (`@cursor/sdk` 1.0.12).
 */
export async function sendPrompt(agent: SDKAgent, prompt: string): Promise<Run> {
  return agent.send(prompt);
}

/**
 * Canonical "wait for the run" call. Returns the `text` string
 * (empty-string fallback) alongside the raw `RunResult` so reporters can
 * surface `durationMs`, `model`, and friends.
 */
export async function awaitRun(run: Run): Promise<AwaitedRun> {
  const result = await run.wait();
  const text = (result.result ?? "").toString();
  return { text, result };
}

/**
 * Best-effort "close the agent" call. Tests inject stubs that may or may
 * not expose `close()`; we keep this defensive so a failing stub never
 * masks a real test failure.
 */
export function closeAgent(agent: SDKAgent): void {
  const maybeClose = (agent as unknown as { close?: () => void }).close;
  if (typeof maybeClose === "function") {
    try {
      maybeClose.call(agent);
    } catch {
      /* ignore — close is best-effort */
    }
  }
}

/**
 * Heuristic token resolver. Reads whichever of the three historical SDK
 * token-field paths is populated; falls back to a `chars/4` approximation
 * matching `evals/_llm/metrics.ts#approximateTokens`.
 *
 * The `TOKEN_RESULT_FIELD` constant above records which branch this
 * returned on the pinned SDK so the reporter can surface honest
 * provenance ("tokens are approximate; SDK does not expose a real count").
 */
export function resolveTokens(result: RunResult, prompt: string, response: string): {
  tokens: number;
  source: "result.tokens" | "run.tokens" | "result.usage.totalTokens" | "approximate:chars/4";
} {
  const asAny = result as unknown as {
    tokens?: unknown;
    usage?: { totalTokens?: unknown };
    run?: { tokens?: unknown };
  };
  if (typeof asAny.tokens === "number" && Number.isFinite(asAny.tokens)) {
    return { tokens: asAny.tokens, source: "result.tokens" };
  }
  if (
    asAny.usage &&
    typeof asAny.usage.totalTokens === "number" &&
    Number.isFinite(asAny.usage.totalTokens)
  ) {
    return { tokens: asAny.usage.totalTokens, source: "result.usage.totalTokens" };
  }
  if (
    asAny.run &&
    typeof asAny.run.tokens === "number" &&
    Number.isFinite(asAny.run.tokens)
  ) {
    return { tokens: asAny.run.tokens, source: "run.tokens" };
  }
  return {
    tokens: approximateTokens(prompt) + approximateTokens(response),
    source: "approximate:chars/4",
  };
}

function approximateTokens(s: string): number {
  if (!s) return 0;
  return Math.ceil(s.length / 4);
}

/**
 * Surface used by `sdk-bridge.selftest.ts` to verify the bridge shape
 * without importing every consumer. Kept in-line for test ergonomics.
 */
export const BRIDGE_SURFACE = [
  "PINNED_SDK_VERSION",
  "TOKEN_RESULT_FIELD",
  "createAgent",
  "sendPrompt",
  "awaitRun",
  "closeAgent",
  "resolveTokens",
] as const;
