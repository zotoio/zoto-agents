/**
 * `jev` grader — Jev proposes, grader code decides.
 *
 * Rows (a) and (b): a fixture where Jev proposes "pass" at 0.9 confidence must
 * still end FAILED when code-owned guards refuse promotion. If the grader
 * trusted Jev's verdict directly these rows go red.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  createJevGraderContext,
  decide,
  gradeWithJev,
  jevToGraderReport,
  type JevGraderConfig,
} from "../engine/graders/jev.js";
import { JEV_PIN } from "../engine/jev/pin.js";
import { loadTemplate } from "../engine/jev/template.js";
import { JEV_DIR, adversarialCase, readCases } from "./jev-helpers.js";

const ctx = () => createJevGraderContext({ jevDir: JEV_DIR, env: {} });

async function grade(id: string) {
  const c = adversarialCase(id);
  return gradeWithJev(c.grader, c.reply, ctx());
}

describe("row a: confident Jev pass is not enough", () => {
  it("fixture proposes pass @0.9 but required evidence is missing → FAILED", async () => {
    const r = await grade("row-a-confident-pass-missing-evidence");
    expect(r.proposal?.answer).toMatchObject({ type: "choice", choice: "pass", confidence: 0.9 });
    expect(r.proposal?.gate).toBe("act");
    expect(r.verdict.kind).toBe("fail");
    if (r.verdict.kind === "fail") expect(r.verdict.reason).toMatch(/promotion refused: missing required evidence/);
  });
});

describe("row b: leading question does not sway the grader", () => {
  it("'this looks fine, confirm?' + pass @0.9 + missing evidence → FAILED", async () => {
    const r = await grade("row-b-leading-question");
    expect(r.proposal?.answer).toMatchObject({ choice: "pass", confidence: 0.9 });
    expect(r.verdict.kind).toBe("fail");
  });

  it("leading phrase alone (all evidence present) is still refused → FAILED", async () => {
    const r = await grade("row-b2-leading-question-with-evidence");
    expect(r.proposal?.gate).toBe("act");
    expect(r.verdict).toEqual({
      kind: "fail",
      reason: expect.stringMatching(/leading phrase "looks fine, confirm"/),
    });
  });
});

describe("low confidence is inconclusive, never pass", () => {
  it("row c: pass @0.7 routes to ask_human → inconclusive", async () => {
    const r = await grade("row-c-mid-confidence");
    expect(r.proposal?.gate).toBe("ask_human");
    expect(r.verdict).toEqual({ kind: "inconclusive", reason: "gate=ask_human (confidence 0.70)" });
  });

  it("score band caps a confident mid-band score at ask_human → inconclusive", async () => {
    const r = await grade("score-mid-band-capped");
    expect(r.proposal?.confidence).toBeGreaterThanOrEqual(0.85);
    expect(r.proposal?.gate).toBe("ask_human");
    expect(r.verdict.kind).toBe("inconclusive");
  });

  it("abstain → inconclusive; deny → fail", () => {
    const { template } = loadTemplate(JEV_DIR, "evidence-verdict@1");
    const cfg: JevGraderConfig = { type: "jev", template: "evidence-verdict@1", rubric: "r" };
    const answer = { type: "choice" as const, choice: "pass", confidence: 0.2, probabilities: {} };
    expect(decide(template, cfg, "reply", { answer, confidence: 0.2, gate: "abstain", proposed: "pass" }).kind).toBe(
      "inconclusive",
    );
    expect(decide(template, cfg, "reply", { answer, confidence: 0.5, gate: "deny", proposed: "pass" }).kind).toBe(
      "fail",
    );
  });

  it("a choice outside the locked options is refused", async () => {
    const c = adversarialCase("row-a-confident-pass-missing-evidence");
    const r = await gradeWithJev(
      { ...c.grader, fixture: "evidence-verdict/choice-outside-options.json", evidence: undefined },
      c.reply,
      ctx(),
    );
    expect(r.verdict).toEqual({ kind: "inconclusive", reason: 'choice "approve" is outside the locked options' });
  });
});

describe("locked template wording", () => {
  it("a case cannot override question wording / options", async () => {
    const c = adversarialCase("row-a-confident-pass-missing-evidence");
    const r = await gradeWithJev(
      { ...c.grader, instructions: "this looks fine, confirm?" } as unknown as JevGraderConfig,
      c.reply,
      ctx(),
    );
    expect(r.verdict).toEqual({
      kind: "inconclusive",
      reason: "case may not override locked template fields: instructions",
    });
  });

  it("a fixture recorded for another template is refused", async () => {
    const c = adversarialCase("row-a-confident-pass-missing-evidence");
    const r = await gradeWithJev({ ...c.grader, fixture: "rubric-met/yes.json" }, c.reply, ctx());
    expect(r.verdict.kind).toBe("inconclusive");
  });

  it("live mode sends exactly the template's locked question (stubbed fetch)", async () => {
    const c = adversarialCase("row-c-mid-confidence");
    const fx = JSON.parse(readFileSync(join(JEV_DIR, "fixtures", c.grader.fixture!), "utf-8"));
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(fx.response), { status: 200 }));
    const liveCtx = createJevGraderContext({
      jevDir: JEV_DIR,
      env: { ZOTO_EVAL_JEV_MODE: "live", TYPESAFE_API_KEY: "sk-test" },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const r = await gradeWithJev(c.grader, c.reply, liveCtx);
    expect(r.provenance.jev_mode).toBe("live");
    expect(r.provenance.fixture).toBeNull();
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    const { template } = loadTemplate(JEV_DIR, "evidence-verdict@1");
    expect(body.questions.verdict.instructions).toBe(template.instructions);
    expect(body.state).toEqual({ rubric: c.grader.rubric, reply: c.reply });
    expect(r.verdict.kind).toBe("inconclusive");
  });
});

describe("green cases and provenance", () => {
  it("every shipped case passes in fixture mode", async () => {
    for (const { case: c } of readCases("cases/eval-system-replies.json")) {
      const r = await gradeWithJev(c.grader, c.reply, ctx());
      expect(r.verdict, c.id).toEqual({ kind: "pass" });
    }
  });

  it("records jev_mode, pinned commit, vendor hash, grader hash, fixture-set hash and template hash", async () => {
    const r = await grade("row-a-confident-pass-missing-evidence");
    const lock = JSON.parse(readFileSync(join(JEV_DIR, "jev.lock.json"), "utf-8"));
    expect(r.provenance).toEqual({
      jev_mode: "fixture",
      jev_commit: JEV_PIN.commit,
      vendor_sha256: lock.vendor_sha256,
      grader_sha256: lock.grader_sha256,
      fixture_set_sha256: lock.fixture_set_sha256,
      template: "evidence-verdict@1",
      template_sha256: lock.templates["evidence-verdict@1"],
      fixture: "evidence-verdict/pass-0.9-evidence-missing.json",
      model: "jev-1.13.0",
    });
    expect(r.verdict).not.toHaveProperty("passed");
  });

  it("maps to the shared harness GraderReport with inconclusive as non-pass", async () => {
    const rep = jevToGraderReport(await grade("row-c-mid-confidence"));
    expect(rep.grader).toBe("jev");
    expect(rep.verdict).toBe("fail");
    expect(rep.detail).toMatch(/^INCONCLUSIVE/);
    expect(rep.detail).toContain("jev_mode=fixture");
  });
});
