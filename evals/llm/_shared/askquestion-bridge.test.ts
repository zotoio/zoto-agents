import { describe, expect, it, vi } from "vitest";
import type { Run, RunResult, SDKAgent } from "@cursor/sdk";
import type { LlmCaseDefinition } from "./llm-case.js";
import {
  ASKQUESTION_BRIDGE_SURFACE,
  DEFAULT_INTERACTION_STYLE,
  ScriptedAnswersExhaustedError,
  beginScriptedInteractionCase,
  observeToolCallsFromRun,
  resolveInteractionPlanFromCase,
  runCaseWithScriptedAnswers,
} from "./askquestion-bridge.js";
import { TOKEN_RESULT_FIELD, resolveTokens } from "./sdk-bridge.js";

const stubResolveTokens: typeof resolveTokens = (_result, prompt, response) => ({
  tokens: Math.ceil((prompt.length + response.length) / 4),
  source: "approximate:chars/4",
});

function stubRunResult(text: string, id = "run-1"): RunResult {
  return { id, status: "finished", result: text };
}

function createStubRun(
  text: string,
  opts?: { streamMessages?: Array<{ type: string; name?: string; call_id?: string; status?: string }> },
): Run {
  const streamMessages = opts?.streamMessages ?? [];
  return {
    id: "run-id",
    agentId: "agent-id",
    status: "finished",
    supports: (op: string) => op === "stream" || op === "wait",
    unsupportedReason: () => undefined,
    wait: async () => stubRunResult(text),
    stream: async function* () {
      for (const msg of streamMessages) {
        yield msg as never;
      }
    },
    conversation: async () => [],
    cancel: async () => {},
    onDidChangeStatus: () => () => {},
  } as Run;
}

function createScriptedAgent(
  responses: string[],
  streamByTurn?: Array<Array<{ type: string; name?: string; call_id?: string; status?: string }>>,
): SDKAgent {
  let turn = 0;
  return {
    agentId: "stub-agent",
    model: { id: "composer-2.5" },
    send: vi.fn(async () => {
      const text = responses[turn] ?? "";
      const streamMessages = streamByTurn?.[turn] ?? [];
      turn += 1;
      return createStubRun(text, { streamMessages });
    }),
    close: vi.fn(),
  } as unknown as SDKAgent;
}

describe("askquestion-bridge surface", () => {
  it("exports the ADR-pinned drift guard tuple", () => {
    expect(ASKQUESTION_BRIDGE_SURFACE).toContain("resolveInteractionPlanFromCase");
    expect(ASKQUESTION_BRIDGE_SURFACE).toContain("runCaseWithScriptedAnswers");
    expect(ASKQUESTION_BRIDGE_SURFACE).toContain("beginScriptedInteractionCase");
  });
});

describe("resolveInteractionPlanFromCase", () => {
  it("prefers interactions.answers over follow_ups[]", () => {
    const plan = resolveInteractionPlanFromCase({
      interactions: { answers: ["pytest", "code"] },
      follow_ups: ["legacy-should-not-run"],
    });
    expect(plan).toEqual({
      style: DEFAULT_INTERACTION_STYLE,
      scriptedAnswers: ["pytest", "code"],
      source: "interactions.answers",
    });
  });

  it("falls back to follow_ups[] when interactions.answers is absent", () => {
    const plan = resolveInteractionPlanFromCase({
      follow_ups: ["answer-a", "answer-b"],
    });
    expect(plan.source).toBe("follow_ups[]");
    expect(plan.scriptedAnswers).toEqual(["answer-a", "answer-b"]);
  });

  it("returns source none for single-prompt cases", () => {
    const plan = resolveInteractionPlanFromCase({});
    expect(plan.source).toBe("none");
    expect(plan.scriptedAnswers).toEqual([]);
  });
});

describe("beginScriptedInteractionCase", () => {
  it("creates an agent and runs the scripted answer sequence", async () => {
    const agent = createScriptedAgent([
      "Which framework?",
      "Configured pytest.",
      "Configured code strategy.",
    ]);
    const createAgent = vi.fn(async () => agent);

    const { plan, result } = await beginScriptedInteractionCase({
      modelId: "composer-2.5",
      cwd: "/tmp/repo",
      apiKey: "test-key",
      prompt: "Run /z-eval-configure.",
      case: {
        interactions: {
          questions: ["Static framework?", "LLM strategy?"],
          answers: ["pytest", "code"],
        },
      },
      resolveTokens: stubResolveTokens,
      createAgent,
    });

    expect(createAgent).toHaveBeenCalledOnce();
    expect(plan.source).toBe("interactions.answers");
    expect(result.interactionStyle).toBe("synthetic");
    expect(result.turns).toHaveLength(3);
    expect(result.text).toBe(
      "Which framework?\nConfigured pytest.\nConfigured code strategy.",
    );
    expect(agent.send).toHaveBeenCalledTimes(3);
  });
});

describe("runCaseWithScriptedAnswers", () => {
  it("advances through a happy-path interaction sequence", async () => {
    const agent = createScriptedAgent(["step-0", "step-1", "step-2"]);
    const sendPrompt = vi.fn(async (_agent, message: string) => {
      const idx = (sendPrompt.mock.calls.length - 1) as number;
      return createStubRun(["step-0", "step-1", "step-2"][idx] ?? "");
    });

    const plan = resolveInteractionPlanFromCase({
      interactions: { answers: ["pytest", "code"] },
    });

    const result = await runCaseWithScriptedAnswers({
      agent,
      prompt: "configure this repo",
      plan,
      resolveTokens: stubResolveTokens,
      sendPrompt,
    });

    expect(result.turns.map((t) => t.text)).toEqual(["step-0", "step-1", "step-2"]);
    expect(result.interactionStyle).toBe("synthetic");
    expect(sendPrompt).toHaveBeenCalledWith(agent, "configure this repo");
    expect(sendPrompt).toHaveBeenCalledWith(agent, "pytest");
    expect(sendPrompt).toHaveBeenCalledWith(agent, "code");
  });

  it("uses synthetic fallback when the SDK has no native interception", async () => {
    const agent = createScriptedAgent(["done"]);
    const result = await runCaseWithScriptedAnswers({
      agent,
      prompt: "hello",
      plan: resolveInteractionPlanFromCase({}),
      resolveTokens: stubResolveTokens,
    });

    expect(result.interactionStyle).toBe("synthetic");
    expect(result.turns.every((t) => t.interactionStyle === "synthetic")).toBe(true);
    expect(agent.send).toHaveBeenCalledTimes(1);
  });

  it("throws when observed AskQuestion calls exceed scripted answers", async () => {
    const agent = createScriptedAgent(
      ["ask-1", "ask-2"],
      [
        [
          { type: "tool_call", name: "AskQuestion", call_id: "c1", status: "completed" },
          { type: "tool_call", name: "AskQuestion", call_id: "c2", status: "completed" },
        ],
        [],
      ],
    );

    await expect(
      runCaseWithScriptedAnswers({
        agent,
        prompt: "interactive command",
        plan: resolveInteractionPlanFromCase({
          interactions: { answers: ["only-one"] },
        }),
        resolveTokens: stubResolveTokens,
        observeToolCalls: true,
      }),
    ).rejects.toBeInstanceOf(ScriptedAnswersExhaustedError);
  });
});

describe("observeToolCallsFromRun", () => {
  it("collects tool_call messages from the stream", async () => {
    const run = createStubRun("ok", {
      streamMessages: [
        { type: "tool_call", name: "AskQuestion", call_id: "c1", status: "completed" },
        { type: "assistant" },
        { type: "tool_call", name: "Read", call_id: "c2", status: "error" },
      ],
    });

    const calls = await observeToolCallsFromRun(run);
    expect(calls).toEqual([
      { tool: "AskQuestion", callId: "c1", status: "completed", ok: true },
      { tool: "Read", callId: "c2", status: "error", ok: false },
    ]);
  });
});

describe("runCase integration pattern (post-subtask-07 runCase shape)", () => {
  it("round-trips the harness assignment contract with stubbed agent/run mocks", async () => {
    const CASE: LlmCaseDefinition = {
      id: "configure-framework-choice",
      prompt: "Run /z-eval-configure for this repo.",
      interactions: {
        questions: ["Which static framework?", "Which LLM strategy?"],
        answers: ["pytest", "code"],
      },
      follow_ups: ["legacy-should-not-run"],
      assertions: ["Response confirms pytest + code strategy were written to config.yml"],
    };

    const agent = createScriptedAgent([
      "Awaiting choices.",
      "Wrote pytest to config.",
      "Wrote code strategy to config.",
    ]);

    const plan = resolveInteractionPlanFromCase(CASE);
    expect(plan.source).toBe("interactions.answers");
    expect(plan.scriptedAnswers).toEqual(["pytest", "code"]);

    const scripted = await runCaseWithScriptedAnswers({
      agent,
      prompt: CASE.prompt,
      plan,
      resolveTokens: stubResolveTokens,
    });

    // Mirrors the post-subtask-07 runCase assignments:
    let text = scripted.text;
    let tokens = scripted.tokens;
    let tokenSource = scripted.tokenSource;
    const interaction_style = scripted.interactionStyle;

    expect(text).toContain("Awaiting choices.");
    expect(text).toContain("Wrote code strategy to config.");
    expect(tokens).toBeGreaterThan(0);
    expect(tokenSource).toBe(TOKEN_RESULT_FIELD);
    expect(interaction_style).toBe("synthetic");
    expect(scripted.turns).toHaveLength(3);
  });
});
