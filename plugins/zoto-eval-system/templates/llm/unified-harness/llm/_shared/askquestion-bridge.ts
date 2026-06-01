/**
 * askquestion-bridge — scripted AskQuestion simulation for the unified
 * LLM eval harness.
 *
 * ## Why this file exists
 *
 * Commands such as /z-eval-configure and /z-eval-create use Cursor's
 * AskQuestion tool. The eval harness must supply scripted user answers
 * without a human in the loop. @cursor/sdk 1.0.12 exposes **observe-only**
 * tool streaming (run.stream(), SendOptions.onDelta) but **no** API to
 * intercept or inject AskQuestion replies mid-run.
 *
 * This bridge therefore implements the **synthetic fallback**: after the
 * initial prompt completes, each scripted answer is sent as an ordinary
 * agent.send(answer) follow-up. Every turn and aggregate result is tagged
 * interaction_style: "synthetic" so report.yml can surface the degraded
 * mode honestly.
 *
 *   Consumers (direct):
 *     - evals/llm/_shared/run-llm-suite.ts — resolveInteractionPlanFromCase,
 *       runCaseWithScriptedAnswers
 *     - Stamped <kind>/evals/<name>.test.ts (via #eval-engine/askquestion-bridge.js)
 *       — case authors declare interactions.answers
 *
 *   Dependencies (must not import @cursor/sdk directly):
 *     - evals/llm/_shared/sdk-bridge.ts — createAgent, sendPrompt,
 *       awaitRun, resolveTokens, PINNED_SDK_VERSION
 *
 * ## Answer precedence
 *
 *   1. interactions.answers (when non-empty)
 *   2. follow_ups[] (legacy migration fallback)
 *   3. none — single-prompt case
 *
 * ## SDK version pin
 *
 * Verified against @cursor/sdk **1.0.12** (see sdk-bridge.ts#PINNED_SDK_VERSION).
 * A future SDK release with native AskQuestion interception may add
 * interaction_style: "native" internally without changing case JSON or
 * exported function names.
 */
import type { Run, RunResult, SDKAgent } from "@cursor/sdk";
import type { LlmCaseDefinition, CaseInteractions } from "./llm-case.js";
import {
  createAgent,
  sendPrompt,
  awaitRun,
  resolveTokens,
  PINNED_SDK_VERSION,
  TOKEN_RESULT_FIELD,
  type CreateAgentOptions,
  type AwaitedRun,
} from "#eval-engine/sdk-bridge.js";

export type { CaseInteractions };

/** Report + turn tagging; only `"synthetic"` is used on SDK 1.0.12. */
export type InteractionStyle = "synthetic" | "native";

export type InteractionPlanSource =
  | "interactions.answers"
  | "follow_ups[]"
  | "none";

export interface InteractionPlan {
  style: InteractionStyle;
  scriptedAnswers: string[];
  source: InteractionPlanSource;
}

/** Best-effort stream capture for the `tool-called` grader. */
export interface ObservedToolCall {
  tool: string;
  callId?: string;
  status?: string;
  ok: boolean;
}

export interface ScriptedRunTurn {
  prompt: string;
  text: string;
  result: RunResult;
  interactionStyle: InteractionStyle;
  toolCalls: ObservedToolCall[];
}

export interface ScriptedRunResult {
  turns: ScriptedRunTurn[];
  text: string;
  tokens: number;
  tokenSource: string;
  interactionStyle: InteractionStyle;
}

/** Single-style default for SDK 1.0.12 (no native interception). */
export const DEFAULT_INTERACTION_STYLE: InteractionStyle = "synthetic";

/** Thrown when observed AskQuestion tool calls exceed scripted answers. */
export class ScriptedAnswersExhaustedError extends Error {
  readonly observedAskQuestions: number;
  readonly scriptedAnswers: number;

  constructor(observedAskQuestions: number, scriptedAnswers: number) {
    super(
      `askquestion-bridge: observed ${observedAskQuestions} AskQuestion tool call(s) ` +
        `but only ${scriptedAnswers} scripted answer(s) — increase interactions.answers ` +
        `or follow_ups[] before re-running`,
    );
    this.name = "ScriptedAnswersExhaustedError";
    this.observedAskQuestions = observedAskQuestions;
    this.scriptedAnswers = scriptedAnswers;
  }
}

/**
 * Resolve the scripted-answer plan from a case definition. Single source of
 * precedence rules for the harness and reporters.
 */
export function resolveInteractionPlanFromCase(
  c: Pick<LlmCaseDefinition, "interactions" | "follow_ups">,
): InteractionPlan {
  if (c.interactions?.answers?.length) {
    return {
      style: DEFAULT_INTERACTION_STYLE,
      scriptedAnswers: [...c.interactions.answers],
      source: "interactions.answers",
    };
  }
  if (c.follow_ups?.length) {
    return {
      style: DEFAULT_INTERACTION_STYLE,
      scriptedAnswers: [...c.follow_ups],
      source: "follow_ups[]",
    };
  }
  return {
    style: DEFAULT_INTERACTION_STYLE,
    scriptedAnswers: [],
    source: "none",
  };
}

/**
 * Optional wrapper so answers read like user choices in the agent transcript.
 * Default pass-through — callers may extend formatting in a future SDK release.
 */
export function formatSyntheticAnswer(
  answer: string,
  _ctx?: { questionIndex?: number },
): string {
  return answer;
}

interface SDKToolUseStreamMessage {
  type: "tool_call";
  call_id?: string;
  name: string;
  status?: "running" | "completed" | "error";
}

/**
 * Consumes `run.stream()` until terminal and filters `SDKToolUseMessage`
 * events. Best-effort — returns an empty array when streaming is unsupported
 * or the stream errors.
 */
export async function observeToolCallsFromRun(run: Run): Promise<ObservedToolCall[]> {
  const calls: ObservedToolCall[] = [];
  if (!run.supports("stream")) {
    return calls;
  }
  try {
    for await (const msg of run.stream()) {
      if (msg.type !== "tool_call") continue;
      const tc = msg as SDKToolUseStreamMessage;
      calls.push({
        tool: tc.name,
        callId: tc.call_id,
        status: tc.status,
        ok: tc.status !== "error",
      });
    }
  } catch {
    /* observe-only — never fail the run */
  }
  return calls;
}

function countAskQuestionCalls(turns: ScriptedRunTurn[]): number {
  return turns.reduce(
    (n, turn) => n + turn.toolCalls.filter((c) => c.tool === "AskQuestion").length,
    0,
  );
}

function assertScriptedAnswersSufficient(
  turns: ScriptedRunTurn[],
  scriptedAnswerCount: number,
): void {
  const askCount = countAskQuestionCalls(turns);
  if (askCount > scriptedAnswerCount) {
    throw new ScriptedAnswersExhaustedError(askCount, scriptedAnswerCount);
  }
}

async function awaitRunWithOptionalObserve(
  run: Run,
  observeToolCalls: boolean,
  wait: (run: Run) => Promise<AwaitedRun>,
): Promise<{ awaited: AwaitedRun; toolCalls: ObservedToolCall[] }> {
  if (!observeToolCalls) {
    return { awaited: await wait(run), toolCalls: [] };
  }
  const [awaited, toolCalls] = await Promise.all([
    wait(run),
    observeToolCallsFromRun(run),
  ]);
  return { awaited, toolCalls };
}

export interface RunCaseWithScriptedAnswersOptions {
  agent: SDKAgent;
  prompt: string;
  plan: InteractionPlan;
  resolveTokens: typeof resolveTokens;
  observeToolCalls?: boolean;
  /** Test seam — defaults to `sdk-bridge.sendPrompt`. */
  sendPrompt?: typeof sendPrompt;
  /** Test seam — defaults to `sdk-bridge.awaitRun`. */
  awaitRun?: typeof awaitRun;
}

/**
 * Advance a run with synthetic answer injection: initial prompt, then each
 * scripted answer as a normal `agent.send` follow-up.
 */
export async function runCaseWithScriptedAnswers(
  opts: RunCaseWithScriptedAnswersOptions,
): Promise<ScriptedRunResult> {
  const send = opts.sendPrompt ?? sendPrompt;
  const wait = opts.awaitRun ?? awaitRun;
  const observe = opts.observeToolCalls ?? false;

  const turns: ScriptedRunTurn[] = [];
  let text = "";
  let tokens = 0;
  let tokenSource: string = TOKEN_RESULT_FIELD;

  const initialRun = await send(opts.agent, opts.prompt);
  const { awaited: initialAwaited, toolCalls: initialToolCalls } =
    await awaitRunWithOptionalObserve(initialRun, observe, wait);

  const initialResolved = opts.resolveTokens(
    initialAwaited.result,
    opts.prompt,
    initialAwaited.text,
  );
  tokens = initialResolved.tokens;
  tokenSource = initialResolved.source;
  text = initialAwaited.text;

  turns.push({
    prompt: opts.prompt,
    text: initialAwaited.text,
    result: initialAwaited.result,
    interactionStyle: opts.plan.style,
    toolCalls: initialToolCalls,
  });

  for (let i = 0; i < opts.plan.scriptedAnswers.length; i++) {
    const answer = formatSyntheticAnswer(opts.plan.scriptedAnswers[i], {
      questionIndex: i,
    });
    const followRun = await send(opts.agent, answer);
    const { awaited: followAwaited, toolCalls: followToolCalls } =
      await awaitRunWithOptionalObserve(followRun, observe, wait);

    text += "\n" + followAwaited.text;
    tokens += opts.resolveTokens(
      followAwaited.result,
      answer,
      followAwaited.text,
    ).tokens;

    turns.push({
      prompt: answer,
      text: followAwaited.text,
      result: followAwaited.result,
      interactionStyle: opts.plan.style,
      toolCalls: followToolCalls,
    });
  }

  if (observe) {
    assertScriptedAnswersSufficient(turns, opts.plan.scriptedAnswers.length);
  }

  return {
    turns,
    text,
    tokens,
    tokenSource,
    interactionStyle: opts.plan.style,
  };
}

export interface BeginScriptedInteractionCaseOptions extends CreateAgentOptions {
  prompt: string;
  case: Pick<LlmCaseDefinition, "interactions" | "follow_ups">;
  resolveTokens: typeof resolveTokens;
  observeToolCalls?: boolean;
  /** Test seam — defaults to `sdk-bridge.createAgent`. */
  createAgent?: typeof createAgent;
  sendPrompt?: typeof sendPrompt;
  awaitRun?: typeof awaitRun;
}

/**
 * Create an agent, resolve the interaction plan, and run the full scripted
 * sequence. Caller owns `closeAgent(agent)` in a `finally` block.
 */
export async function beginScriptedInteractionCase(
  opts: BeginScriptedInteractionCaseOptions,
): Promise<{ agent: SDKAgent; plan: InteractionPlan; result: ScriptedRunResult }> {
  const create = opts.createAgent ?? createAgent;
  const plan = resolveInteractionPlanFromCase(opts.case);
  const agent = await create({
    apiKey: opts.apiKey,
    modelId: opts.modelId,
    cwd: opts.cwd,
  });
  const result = await runCaseWithScriptedAnswers({
    agent,
    prompt: opts.prompt,
    plan,
    resolveTokens: opts.resolveTokens,
    observeToolCalls: opts.observeToolCalls,
    sendPrompt: opts.sendPrompt,
    awaitRun: opts.awaitRun,
  });
  return { agent, plan, result };
}

/**
 * Surface used by unit tests and drift guards. Kept in-line for test ergonomics.
 */
export const ASKQUESTION_BRIDGE_SURFACE = [
  "InteractionStyle",
  "CaseInteractions",
  "InteractionPlanSource",
  "InteractionPlan",
  "ObservedToolCall",
  "ScriptedRunTurn",
  "ScriptedRunResult",
  "DEFAULT_INTERACTION_STYLE",
  "ScriptedAnswersExhaustedError",
  "resolveInteractionPlanFromCase",
  "beginScriptedInteractionCase",
  "formatSyntheticAnswer",
  "observeToolCallsFromRun",
  "runCaseWithScriptedAnswers",
  "ASKQUESTION_BRIDGE_SURFACE",
] as const;

/** Re-export for module header cross-reference — not part of the public API. */
export const VERIFIED_SDK_VERSION = PINNED_SDK_VERSION;
