import { describe, expect, it, vi, beforeEach } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Run, RunResult, SDKAgent } from "@cursor/sdk";
import type { LlmCaseDefinition } from "./llm-case.js";
import { getLastParams } from "./__fixtures__/sample-runner.test.js";

const {
  sendPrompt,
  awaitRun,
  createAgent,
  closeAgent,
  resolveTokens,
  reportCase,
  sdkBridgeMock,
} = vi.hoisted(() => {
  const sendPrompt = vi.fn();
  const awaitRun = vi.fn();
  const createAgent = vi.fn();
  const closeAgent = vi.fn();
  const resolveTokens = vi.fn(
    (_result: RunResult, prompt: string, response: string) => ({
      tokens: Math.ceil((prompt.length + response.length) / 4),
      source: "approximate:chars/4",
    }),
  );
  const reportCase = vi.fn();
  const sdkBridgeMock = {
    createAgent: (opts: unknown) => createAgent(opts),
    sendPrompt: (agent: unknown, prompt: unknown) => sendPrompt(agent, prompt),
    awaitRun: (run: unknown) => awaitRun(run),
    closeAgent: (agent: unknown) => closeAgent(agent),
    resolveTokens: (result: unknown, prompt: unknown, response: unknown) =>
      resolveTokens(result as RunResult, prompt as string, response as string),
    TOKEN_RESULT_FIELD: "approximate:chars/4",
    PINNED_SDK_VERSION: "1.0.12",
  };
  return { sendPrompt, awaitRun, createAgent, closeAgent, resolveTokens, reportCase, sdkBridgeMock };
});

vi.mock("./zoto-llm-reporter.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./zoto-llm-reporter.js")>();
  return {
    ...actual,
    reportCase,
    reportSuite: vi.fn(),
  };
});

vi.mock("./sandbox-helpers.js", () => ({
  buildSandbox: vi.fn(() => ({ rootDir: "/tmp/sandbox" })),
  preSnapshot: vi.fn(() => ({ files: [] })),
  postSnapshot: vi.fn(() => ({ files: [] })),
  diffSandbox: vi.fn(() => ({ added: [], modified: [], removed: [] })),
}));

vi.mock("#eval-engine/sdk-bridge.js", () => sdkBridgeMock);
vi.mock("./sdk-bridge.js", () => sdkBridgeMock);

import {
  resolveReportInteractionStyle,
  runCase,
  runRunnerCase,
  validateCasesAtSuiteLoad,
  assertNoHybridCase,
  isRunnerCase,
} from "./run-llm-suite.js";

const FIXTURE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "__fixtures__");
const SAMPLE_EVAL_PATH = resolve(FIXTURE_DIR, "sample-eval.json");
const SOURCE_PATH = pathToFileURL(SAMPLE_EVAL_PATH).href;

function stubRunResult(text: string, id = "run-1"): RunResult {
  return { id, status: "finished", result: text };
}

function createStubRun(text: string): Run {
  return {
    id: "run-id",
    agentId: "agent-id",
    status: "finished",
    supports: () => false,
    unsupportedReason: () => undefined,
    wait: async () => stubRunResult(text),
    stream: async function* () {},
    conversation: async () => [],
    cancel: async () => {},
    onDidChangeStatus: () => () => {},
  } as Run;
}

function createStubAgent(): SDKAgent {
  return {
    agentId: "stub-agent",
    model: { id: "composer-2.5" },
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as SDKAgent;
}

const runCaseOpts = {
  targetId: "agent:test-target",
  modelId: "composer-2.5",
  judgeModel: "opus-4.6",
  repoRoot: "/tmp/repo",
  expect: (val: unknown, message?: string) => ({
    toMatch: (re: RegExp) => {
      expect(String(val)).toMatch(re);
    },
    toBe: (expected: unknown) => {
      expect(val, message).toBe(expected);
    },
  }),
};

const runRunnerCaseOpts = {
  ...runCaseOpts,
  sourcePath: SOURCE_PATH,
};

beforeEach(() => {
  vi.clearAllMocks();
  createAgent.mockResolvedValue(createStubAgent());
  closeAgent.mockResolvedValue(undefined);
});

describe("resolveReportInteractionStyle", () => {
  it("returns scripted when interactions.answers is present", () => {
    expect(
      resolveReportInteractionStyle({
        interactions: { answers: ["pytest"] },
        follow_ups: ["legacy"],
      }),
    ).toBe("scripted");
  });

  it("returns synthetic for legacy follow_ups-only cases", () => {
    expect(resolveReportInteractionStyle({ follow_ups: ["answer-a"] })).toBe("synthetic");
  });

  it("returns none for single-prompt cases", () => {
    expect(resolveReportInteractionStyle({})).toBe("none");
  });
});

describe("validateCasesAtSuiteLoad", () => {
  it("throws when a stamped case declares interactions without requiresInteraction", () => {
    const cases: LlmCaseDefinition[] = [
      {
        id: "misclassified",
        prompt: "Run /z-eval-configure.",
        interactions: { answers: ["pytest"] },
        assertions: ["config written"],
        _meta: {
          generated: true,
          primitive_analysis: { requiresInteraction: false },
        },
      },
    ];
    expect(() => validateCasesAtSuiteLoad(cases)).toThrow(/requiresInteraction !== true/);
  });

  it("allows unstamped fixture cases with interactions", () => {
    const cases: LlmCaseDefinition[] = [
      {
        id: "manual-fixture",
        prompt: "interactive",
        interactions: { answers: ["yes"] },
        assertions: ["ok"],
      },
    ];
    expect(() => validateCasesAtSuiteLoad(cases)).not.toThrow();
  });

  it("allows stamped cases when requiresInteraction is true", () => {
    const cases: LlmCaseDefinition[] = [
      {
        id: "classified",
        prompt: "Run /z-eval-configure.",
        interactions: { answers: ["pytest", "code"] },
        assertions: ["config written"],
        _meta: {
          generated: true,
          primitive_analysis: { requiresInteraction: true },
        },
      },
    ];
    expect(() => validateCasesAtSuiteLoad(cases)).not.toThrow();
  });

  it("rejects hybrid runner cases at suite load", () => {
    const cases: LlmCaseDefinition[] = [
      {
        id: "hybrid",
        runner: "./sample-runner.test.ts",
        parameters: { ok: true },
        prompt: "forbidden",
      },
    ];
    expect(() => validateCasesAtSuiteLoad(cases, { __sourcePath: SOURCE_PATH })).toThrow(
      /must not carry declarative field "prompt"/,
    );
  });

  it("requires __sourcePath when any case is a runner case", () => {
    const cases: LlmCaseDefinition[] = [
      {
        id: "runner-noop",
        runner: "./sample-runner.test.ts",
        parameters: {},
      },
    ];
    expect(() => validateCasesAtSuiteLoad(cases)).toThrow(/require `__sourcePath`/);
  });
});

describe("isRunnerCase / assertNoHybridCase", () => {
  it("detects runner cases by non-empty runner string", () => {
    expect(isRunnerCase({ id: "r", runner: "./foo.test.ts", parameters: {} })).toBe(true);
    expect(isRunnerCase({ id: "d", prompt: "hi", assertions: ["ok"] })).toBe(false);
    expect(isRunnerCase({ id: "empty", runner: "" })).toBe(false);
  });

  it("throws on hybrid cases via assertNoHybridCase", () => {
    expect(() =>
      assertNoHybridCase({
        id: "hybrid",
        runner: "./sample-runner.test.ts",
        parameters: {},
        assertions: ["nope"],
      }),
    ).toThrow(/must not carry declarative field "assertions"/);
  });
});

describe("runRunnerCase dispatch", () => {
  it("invokes the runner default export and reports pass", async () => {
    const c: LlmCaseDefinition = {
      id: "runner-noop",
      runner: "./sample-runner.test.ts",
      parameters: { expected: "noop" },
    };

    await runRunnerCase(c, runRunnerCaseOpts);

    const params = getLastParams();
    expect(params?.targetId).toBe("agent:test-target");
    expect(params?.caseId).toBe("runner-noop");
    expect(params?.parameters).toEqual({ expected: "noop" });
    expect(params?.context.modelId).toBe("composer-2.5");
    expect(params?.context.judgeModel).toBe("opus-4.6");
    expect(typeof params?.context.sdk.createAgent).toBe("function");
    expect(typeof params?.context.sandbox.buildSandbox).toBe("function");

    expect(reportCase).toHaveBeenCalledOnce();
    const reported = reportCase.mock.calls[0]?.[0];
    expect(reported?.case.status).toBe("passed");
    expect(reported?.case.grader_reports?.[0]?.detail).toBe("ok");
  });

  it("fails with a clear message when the runner lacks a default export", async () => {
    const c: LlmCaseDefinition = {
      id: "runner-bad-export",
      runner: "./no-default-export.test.ts",
      parameters: {},
    };

    await expect(runRunnerCase(c, runRunnerCaseOpts)).rejects.toThrow(
      /runner file '\.\/no-default-export\.test\.ts' does not default-export a function/,
    );
  });
});

describe("runCase interaction paths", () => {
  it("uses the askquestion bridge when interactions.answers is present", async () => {
    const responses = ["turn-0", "turn-1", "turn-2"];
    let call = 0;
    sendPrompt.mockImplementation(async () => createStubRun(responses[call++] ?? ""));
    awaitRun.mockImplementation(async (run: Run) => ({
      text: (await run.wait()).result as string,
      result: await run.wait(),
    }));

    const c: LlmCaseDefinition = {
      id: "scripted-case",
      prompt: "Run /z-eval-configure.",
      interactions: {
        questions: ["Framework?", "Strategy?"],
        answers: ["pytest", "code"],
      },
      follow_ups: ["legacy-should-not-run"],
      assertions: [],
    };

    await runCase(c, runCaseOpts);

    expect(sendPrompt).toHaveBeenCalledTimes(3);
    expect(sendPrompt.mock.calls[0]?.[1]).toBe("Run /z-eval-configure.");
    expect(sendPrompt.mock.calls[1]?.[1]).toBe("pytest");
    expect(sendPrompt.mock.calls[2]?.[1]).toBe("code");

    expect(reportCase).toHaveBeenCalledOnce();
    const reported = reportCase.mock.calls[0]?.[0];
    expect(reported?.case.interaction_style).toBe("scripted");
    expect(reported?.case.interactions).toEqual({
      questions: ["Framework?", "Strategy?"],
      answers: ["pytest", "code"],
    });
  });

  it("keeps the legacy follow_ups loop when interactions.answers is absent", async () => {
    const responses = ["initial", "follow-a", "follow-b"];
    let call = 0;
    sendPrompt.mockImplementation(async () => createStubRun(responses[call++] ?? ""));
    awaitRun.mockImplementation(async (run: Run) => ({
      text: (await run.wait()).result as string,
      result: await run.wait(),
    }));

    const c: LlmCaseDefinition = {
      id: "legacy-case",
      prompt: "start",
      follow_ups: ["follow-a", "follow-b"],
      assertions: [],
    };

    await runCase(c, runCaseOpts);

    expect(sendPrompt).toHaveBeenCalledTimes(3);
    expect(sendPrompt.mock.calls[0]?.[1]).toBe("start");
    expect(sendPrompt.mock.calls[1]?.[1]).toBe("follow-a");
    expect(sendPrompt.mock.calls[2]?.[1]).toBe("follow-b");

    expect(reportCase).toHaveBeenCalledOnce();
    const reported = reportCase.mock.calls[0]?.[0];
    expect(reported?.case.interaction_style).toBe("synthetic");
    expect(reported?.case.interactions).toBeUndefined();
  });
});
