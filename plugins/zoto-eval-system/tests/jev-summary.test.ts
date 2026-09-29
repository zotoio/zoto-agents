/**
 * Row c: pass / fail / inconclusive are three separate counts, and any
 * inconclusive (or fail) makes the run non-green.
 */
import { describe, expect, it } from "vitest";

import { formatJevSummary, loadJevCases, runJevSuite } from "../engine/jev/suite.js";
import { countVerdicts, exitCodeFor } from "../engine/jev/verdict.js";
import { JEV_DIR, readCases } from "./jev-helpers.js";

describe("row c: inconclusive is counted separately", () => {
  it("countVerdicts keeps three buckets", () => {
    expect(
      countVerdicts([
        { kind: "pass" },
        { kind: "inconclusive", reason: "gate=ask_human" },
        { kind: "fail", reason: "x" },
        { kind: "inconclusive", reason: "gate=abstain" },
      ]),
    ).toEqual({ pass: 1, fail: 1, inconclusive: 2 });
  });

  it("an all-pass run with one inconclusive is NOT green", () => {
    expect(exitCodeFor({ pass: 5, fail: 0, inconclusive: 1 })).toBe(1);
    expect(exitCodeFor({ pass: 5, fail: 0, inconclusive: 0 })).toBe(0);
    expect(exitCodeFor({ pass: 5, fail: 1, inconclusive: 0 })).toBe(1);
  });

  it("pass @0.7 + otherwise green suite → inconclusive=1, pass unchanged, exit 1", async () => {
    const cases = [
      ...readCases("cases/eval-system-replies.json"),
      ...readCases("adversarial/cases.json").filter((c) => c.case.id === "row-c-mid-confidence"),
    ];
    const report = await runJevSuite({ jevDir: JEV_DIR, env: {}, cases });
    expect(report.counts).toEqual({ pass: 3, fail: 0, inconclusive: 1 });
    expect(report.exit_code).toBe(1);
    const text = formatJevSummary(report);
    expect(text).toContain("pass: 3");
    expect(text).toContain("fail: 0");
    expect(text).toContain("inconclusive: 1");
    expect(text).toContain("NOT green");
  });

  it("adversarial set: 3 refused fails, 2 inconclusive, 0 pass", async () => {
    const report = await runJevSuite({ jevDir: JEV_DIR, env: {}, cases: readCases("adversarial/cases.json") });
    expect(report.counts).toEqual({ pass: 0, fail: 3, inconclusive: 2 });
    expect(report.exit_code).toBe(1);
    for (const r of report.results) {
      expect(r.provenance.jev_mode).toBe("fixture");
      expect(r.provenance.template_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(r.provenance.fixture_set_sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("shipped suite (evals/jev/cases) is green", async () => {
    expect(loadJevCases(JEV_DIR).length).toBeGreaterThanOrEqual(3);
    const report = await runJevSuite({ jevDir: JEV_DIR, env: {} });
    expect(report.counts).toEqual({ pass: 3, fail: 0, inconclusive: 0 });
    expect(report.exit_code).toBe(0);
  });
});
