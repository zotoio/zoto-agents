import { describe, expect, it } from "vitest";

import {
  validateEnriched,
  type EvalCase,
  type EvalCaseWithOptionalInteractions,
} from "../engine/case.js";

const VALID_HASH = "a".repeat(64);

/**
 * Build a well-formed *declarative* case used as the baseline for
 * positive tests and as the seed for hybrid-rejection scenarios.
 */
function declarativeCase(
  id: string,
  overrides: Partial<EvalCase> = {},
): EvalCase {
  return {
    id,
    prompt: `${id} — realistic declarative user turn for validation.`,
    assertions: ["Response references the requested skill."],
    _meta: {
      generated: true,
      source_hash: VALID_HASH,
      last_updated: "2026-05-27T00:00:00Z",
      generated_by: "zoto-create-evals",
      primitive_analysis: {
        source_hash: VALID_HASH,
        analysed_at: "2026-05-27T00:00:00Z",
        analyser_version: "1.1.0",
        summary: `Stub analyser summary for ${id}.`,
      },
    },
    ...overrides,
  };
}

/**
 * Build a well-formed *runner* case. Runner cases skip declarative
 * grading so they do not need a real `prompt`/`assertions` block; the
 * schema only requires `id`, `runner`, and `parameters`.
 */
function runnerCase(
  id: string,
  overrides: Partial<EvalCase> = {},
): EvalCase {
  return {
    id,
    runner: "./multi-step-flow.test.ts",
    parameters: { scenario: "happy-path", steps: 3 },
    _meta: {
      generated: true,
      source_hash: VALID_HASH,
      last_updated: "2026-05-27T00:00:00Z",
      generated_by: "zoto-create-evals",
    },
    ...overrides,
  };
}

describe("validateEnriched — runner branch", () => {
  it("accepts a well-formed runner case", () => {
    const v = validateEnriched(runnerCase("runner-ok"));
    expect(v.ok).toBe(true);
    expect(v.reason).toBeUndefined();
  });

  it("accepts a runner case with an empty parameters object", () => {
    const v = validateEnriched(runnerCase("runner-empty-params", { parameters: {} }));
    expect(v.ok).toBe(true);
  });

  it("accepts a runner case with no _meta block (user-authored)", () => {
    const c = runnerCase("runner-no-meta");
    delete c._meta;
    const v = validateEnriched(c);
    expect(v.ok).toBe(true);
  });

  it("rejects a runner with an empty `runner` string", () => {
    const v = validateEnriched(runnerCase("runner-empty-path", { runner: "" }));
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/empty `runner` path/);
  });

  it("rejects a runner whose path does not end in `.test.ts`", () => {
    const v = validateEnriched(
      runnerCase("runner-bad-ext", { runner: "./helpers.ts" }),
    );
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/invalid extension on `runner` path/);
    expect(v.reason).toMatch(/\.test\.ts/);
  });

  it("rejects a runner with a .js extension", () => {
    const v = validateEnriched(
      runnerCase("runner-bad-ext-js", { runner: "./flow.test.js" }),
    );
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/invalid extension on `runner` path/);
  });

  it("rejects a runner missing the `parameters` object", () => {
    const c = runnerCase("runner-no-params");
    delete c.parameters;
    const v = validateEnriched(c);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/missing the `parameters` object/);
  });

  it("rejects a runner where `parameters` is an array", () => {
    const v = validateEnriched(
      runnerCase("runner-array-params", {
        parameters: [1, 2, 3] as unknown as Record<string, unknown>,
      }),
    );
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/missing the `parameters` object/);
  });

  it("rejects a hybrid case that carries both `runner` and `prompt`", () => {
    const v = validateEnriched(
      runnerCase("hybrid-prompt", {
        prompt: "this should not be here",
      }),
    );
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/must not carry declarative field "prompt"/);
  });

  it("rejects a hybrid case that carries both `runner` and `assertions`", () => {
    const v = validateEnriched(
      runnerCase("hybrid-assertions", {
        assertions: ["should never be evaluated"],
      }),
    );
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/must not carry declarative field "assertions"/);
  });

  it("rejects a hybrid case that carries both `runner` and `graders`", () => {
    const v = validateEnriched(
      runnerCase("hybrid-graders", {
        graders: [{ type: "contains", needle: "hello" }],
      }),
    );
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/must not carry declarative field "graders"/);
  });

  it("rejects a hybrid case that carries both `runner` and `fixtures`", () => {
    const v = validateEnriched(
      runnerCase("hybrid-fixtures", {
        fixtures: { files: [{ path: "x", content: "" }] },
      }),
    );
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/must not carry declarative field "fixtures"/);
  });

  it("rejects a hybrid case that carries both `runner` and `expected_filesystem`", () => {
    const v = validateEnriched(
      runnerCase("hybrid-fs", {
        expected_filesystem: { created: ["out.txt"] },
      }),
    );
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/must not carry declarative field "expected_filesystem"/);
  });

  it("rejects a hybrid case that carries both `runner` and `expected_output`", () => {
    const v = validateEnriched(
      runnerCase("hybrid-output", {
        expected_output: "shouldn't be here",
      }),
    );
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/must not carry declarative field "expected_output"/);
  });

  it("rejects a hybrid case that carries both `runner` and `follow_ups`", () => {
    const v = validateEnriched(
      runnerCase("hybrid-followups", {
        follow_ups: ["a", "b"],
      }),
    );
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/must not carry declarative field "follow_ups"/);
  });

  it("rejects a hybrid case that carries `runner` and `interactions`", () => {
    const c = runnerCase("hybrid-interactions") as EvalCaseWithOptionalInteractions;
    c.interactions = { questions: ["q?"], answers: ["a"] };
    const v = validateEnriched(c as EvalCase);
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/must not carry declarative field "interactions"/);
  });
});

describe("validateEnriched — declarative branch still works", () => {
  it("accepts a well-formed declarative case (regression)", () => {
    const v = validateEnriched(declarativeCase("declarative-ok"));
    expect(v.ok).toBe(true);
  });

  it("rejects a declarative case with placeholder prompt (regression)", () => {
    /* Use a prompt long enough to bypass the min-length check so the
     * placeholder marker branch is exercised. The validator's regex
     * matches `\bTODO` so a `TODO` prefix on a long prompt is rejected. */
    const v = validateEnriched(
      declarativeCase("declarative-placeholder", {
        prompt: "TODO write a realistic prompt for this case later.",
      }),
    );
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/placeholder marker/);
  });

  it("rejects a declarative case with no assertions (regression)", () => {
    const v = validateEnriched(declarativeCase("declarative-no-asserts", { assertions: [] }));
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/has no assertions/);
  });
});
