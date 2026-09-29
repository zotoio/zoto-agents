/** `jev` is a declarative grader kind alongside contains / regex / tool-called / llm-judge. */
import { describe, expect, it } from "vitest";

import { validateEnriched, type EvalCase } from "../engine/case.js";

function caseWith(grader: Record<string, unknown>): EvalCase {
  return {
    id: "jev-1",
    prompt: "Run /z-eval-execute on the zoto-eval-judge agent evals and summarise the failures for me.",
    assertions: ["Names the failing eval file and gives a targeted re-run command"],
    graders: [grader as never],
  };
}

describe("declarative case validation: jev grader", () => {
  it("accepts a jev grader with a versioned template and rubric", () => {
    expect(
      validateEnriched(
        caseWith({
          type: "jev",
          template: "evidence-verdict@1",
          rubric: "Names the failing file and a re-run command.",
          fixture: "evidence-verdict/pass-high-confidence.json",
          evidence: { mustMatch: ["evals/"] },
        }),
      ),
    ).toEqual({ ok: true });
  });

  it("requires <id>@<version> template refs", () => {
    const r = validateEnriched(caseWith({ type: "jev", template: "evidence-verdict", rubric: "r" }));
    expect(r.ok).toBe(false);
  });

  it("rejects case-level question wording (locked in the template)", () => {
    const r = validateEnriched(
      caseWith({ type: "jev", template: "evidence-verdict@1", rubric: "r", instructions: "looks fine, confirm?" }),
    );
    expect(r).toMatchObject({ ok: false, reason: expect.stringMatching(/may not set "instructions"/) });
  });

  it("still rejects unknown grader kinds", () => {
    const r = validateEnriched(caseWith({ type: "vibes" }));
    expect(r).toMatchObject({ ok: false, reason: expect.stringContaining("| jev)") });
  });
});
