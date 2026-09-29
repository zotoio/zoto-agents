// _meta.generated: false  (hand-edited scenario)
/**
 * Jev-graded eval scenario — runs the `evals/jev/cases/*.json` suite through
 * the `jev` grader (Typesafe Jev / System One via the vendored JevClient).
 *
 * Fixture mode by default: no API key, no network. The unified Vitest config
 * runs `_zoto/stamp-trust-setup.ts` before this file, so the stamp-trust gate
 * guards every Jev-graded case. Opt into live grading with
 * `ZOTO_EVAL_JEV_MODE=live TYPESAFE_API_KEY=...` (see evals/jev/README.md).
 */
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { formatJevSummary, loadJevCases, runJevSuite } from "#eval-engine/jev/suite.js";
import { JEV_PIN } from "#eval-engine/jev/pin.js";
import { verifyLock } from "#eval-engine/jev/template.js";

import { repoRoot } from "../_zoto/plugin-root.js";

const jevDir = join(repoRoot, "evals", "jev");

describe("Jev-graded evals (evals/jev)", () => {
  it("lock is in sync with fixtures, templates and the pinned jev commit", () => {
    const check = verifyLock(jevDir);
    expect(check.kind === "drift" ? check.problems : []).toEqual([]);
  });

  it("every case passes through Jev with pass/fail/inconclusive counted separately", async () => {
    const report = await runJevSuite({ jevDir });
    console.log(formatJevSummary(report));
    expect(report.results.length).toBe(loadJevCases(jevDir).length);
    for (const r of report.results) {
      expect(r.provenance.jev_commit).toBe(JEV_PIN.commit);
      expect(r.provenance.template_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(r.provenance.fixture_set_sha256).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(report.counts).toEqual({ pass: report.results.length, fail: 0, inconclusive: 0 });
    expect(report.exit_code).toBe(0);
  });
});
