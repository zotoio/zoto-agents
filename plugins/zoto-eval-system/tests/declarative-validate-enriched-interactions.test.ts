import { describe, expect, it } from "vitest";

import {
  assertNoDeclarativeInteractions,
  validateEnriched,
  type EvalCase,
  type EvalCaseWithOptionalInteractions,
} from "../engine/case.js";

const VALID_HASH = "a".repeat(64);

function enrichedCase(
  id: string,
  overrides: Partial<EvalCaseWithOptionalInteractions> = {},
): EvalCaseWithOptionalInteractions {
  return {
    id,
    prompt: `${id} — realistic declarative user turn for validation.`,
    assertions: ["Response references the requested skill."],
    _meta: {
      generated: true,
      source_hash: VALID_HASH,
      last_updated: "2026-05-26T00:00:00Z",
      generated_by: "zoto-create-evals",
      primitive_analysis: {
        source_hash: VALID_HASH,
        analysed_at: "2026-05-26T00:00:00Z",
        analyser_version: "1.1.0",
        summary: `Stub analyser summary for ${id}.`,
      },
    },
    ...overrides,
  };
}

describe("declarative validateEnriched — interactions forbidden", () => {
  it("accepts a well-formed case without interactions", () => {
    const c = enrichedCase("declarative-ok");
    const v = validateEnriched(c as EvalCase);
    expect(v.ok).toBe(true);
    expect(() => assertNoDeclarativeInteractions(c)).not.toThrow();
  });

  it("rejects a case declaring interactions via validateEnriched", () => {
    const c = enrichedCase("misclassified-interaction", {
      interactions: {
        questions: ["Which framework?"],
        answers: ["pytest"],
      },
    });
    const v = validateEnriched(c as EvalCase);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe(
      "declarative runner cannot handle scripted interactions; case misclassified-interaction declares interactions but the analyser classified its target as requiresInteraction:false",
    );
  });

  it("throws from assertNoDeclarativeInteractions naming the case id", () => {
    const c = enrichedCase("interactive-leak", {
      interactions: { answers: ["code"] },
    });
    expect(() => assertNoDeclarativeInteractions(c)).toThrow(
      "declarative runner cannot handle scripted interactions; case interactive-leak declares interactions but the analyser classified its target as requiresInteraction:false",
    );
  });
});
