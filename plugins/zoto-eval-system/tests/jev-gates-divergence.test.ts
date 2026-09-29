/**
 * Pins vendored divergence G1 (VENDOR.md): non-finite confidence abstains.
 * Upstream `routeByConfidence(Infinity)` returns "act"; here it must be
 * "abstain" → the grader verdict is inconclusive, never pass.
 */
import { describe, expect, it } from "vitest";

import { createJevGraderContext, gradeWithJev } from "../engine/graders/jev.js";
import type { Answer, JevTransport } from "../engine/jev/client.js";
import { routeByConfidence, routeScore } from "../engine/jev/gates.js";
import { JEV_DIR, readCases } from "./jev-helpers.js";

function transportAnswering(answer: Answer, key: string): JevTransport {
  return {
    mode: "live",
    systemOne: async () => ({ model: "stub", answers: { [key]: answer }, usage: { input_tokens: 1, output_tokens: 1 } }),
  };
}

describe("G1: non-finite confidence abstains", () => {
  it.each([Infinity, -Infinity, NaN])("routeByConfidence(%s) → abstain", (c) => {
    expect(routeByConfidence(c)).toBe("abstain");
    expect(routeScore(0, c)).toBe("abstain");
  });

  const green = readCases("cases/eval-system-replies.json");
  const choiceCase = green.find((c) => c.case.grader.template === "evidence-verdict@1")!.case;
  const scoreCase = green.find((c) => c.case.grader.template === "guardrail-risk@1")!.case;

  it.each([Infinity, NaN])("Choice pass with confidence %s → inconclusive (evidence present)", async (confidence) => {
    const ctx = createJevGraderContext({ jevDir: JEV_DIR, env: {} });
    ctx.mode = "live";
    ctx.liveTransport = transportAnswering(
      { type: "choice", choice: "pass", confidence, probabilities: { pass: 1 } },
      "verdict",
    );
    const r = await gradeWithJev(choiceCase.grader, choiceCase.reply, ctx);
    expect(r.proposal?.gate).toBe("abstain");
    expect(r.verdict.kind).toBe("inconclusive");
  });

  it.each([Infinity, NaN])("Score 0.0 with confidence %s → inconclusive", async (confidence) => {
    const ctx = createJevGraderContext({ jevDir: JEV_DIR, env: {} });
    ctx.mode = "live";
    ctx.liveTransport = transportAnswering({ type: "score", score: 0, confidence }, "risk");
    const r = await gradeWithJev(scoreCase.grader, scoreCase.reply, ctx);
    expect(r.verdict.kind).toBe("inconclusive");
  });
});
