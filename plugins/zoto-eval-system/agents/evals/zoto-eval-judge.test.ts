// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-eval-judge`.
 *
 * Stamped by `scripts/eval-stamp.ts#stampLlmCodeStrategy` from
 * `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`.
 *
 * The literal first line of this file MUST remain `// _meta.generated: true`.
 * Subtask 03's cleanup engine and subtask 11's overwrite gate both use
 * `evals/_llm/_user-case-guards.ts#isGeneratedFile(path, { strict: true })`
 * to decide whether this file is safe to replace or delete. Edit the
 * template, not this emitted file.
 * Interaction classification: requiresInteraction=true, interactionStyle=subagent-escalated
 * Analyser version: 2026.05.26-1
 * Backend: code-strategy (LLM)
 */
import { describe, it, afterAll, expect } from "vitest";
import { resolveInteractionPlanFromCase } from "../../../../evals/llm/_shared/askquestion-bridge.js";

import type { LlmCaseDefinition } from "../../../../evals/llm/_shared/llm-case.js";
import { defineLlmEval } from "../../../../evals/llm/_shared/run-llm-suite.js";

const CASES: LlmCaseDefinition[] = [
  {
    "id": "judge-latest-run-artefacts-and-annotate-llm-yml",
    "prompt": "Fresh results landed under evals `_runs`; act as `zoto-eval-judge`. Open the newest run directory only, pull `static.yml`, `llm.yml`, and `report.yml`, and only go into `logs/<case>.log` when a discrepancy needs line-level proof. Stay post-hoc—do not queue another eval execution—and respect the `judgeModel` value from `.zoto/eval-system/config.yml`. Follow the documented judge-mode playbook (rollup triage via `zoto-judge-evals`, then annotate): map eval assertions to what graders actually reported, critique shallow `contains` checks or absent `llm-judge` sections, and call out softness where chatter exceeds verbosity two, confidence falls under 0.4, accuracy under 0.5, or a case duration spikes past roughly two sigma. Describe appending an extra `judge` record into that run's `llm.yml` without overwriting existing `totals` or `aggregates`. Keep eval JSON untouched on disk—if something needs rewriting, steer me toward `/z-eval-update`/`zoto-update-evals`, not manual JSON surgery.",
    "assertions": [
      "The answer treats the chronologically newest `evals/_runs/<timestamp>/` folder as the sole source for `static.yml`, `llm.yml`, `report.yml`, and any cited `logs/<case>.log` paths.",
      "The response clearly states no case reruns or fresh execute passes are attempted while judging.",
      "Coverage commentary compares evaluator assertions with grader-visible outcomes surfaced in the run rollups.",
      "Grader-strength commentary flags vague `contains` expectations or rubrics lacking `llm-judge` material when those gaps show up.",
      "Soft-metric commentary addresses verbosity beyond two, confidence under 0.4, accuracy under 0.5, or duration outliers beyond roughly two sigma when those signals appear in the supplied YAML summaries.",
      "The plan for persisting findings describes appending judge metadata beneath the existing LLM rollup in `llm.yml` while leaving previously recorded totals and aggregates intact.",
      "The narrative cites the configured `judgeModel` entry from `.zoto/eval-system/config.yml` as the model stance for adjudication commentary.",
      "The work plan sequences consolidated rollup review ahead of pinpoint log reads to mirror the sequencing encoded for `zoto-judge-evals`.",
      "Any remediation touching evaluator JSON routes through `/z-eval-update` (with `zoto-update-evals` as the downstream automation) instead of editing eval JSON files directly inside the judge response.",
      "Remediation guidance avoids invoking askQuestion from the judge agent; any approve-or-defer workflow is attributed to `/z-eval-judge` rather than tooling inside this turn."
    ],
    "assertion_patterns": [
      "evals/_runs/<timestamp>/",
      "contains",
      "llm\\.yml",
      "judgeModel",
      "zoto-judge-evals",
      "/z-eval-update",
      "/z-eval-judge"
    ],
    "expected_output": "A structured briefing that summarizes coverage gaps, brittle graders, questionable soft metrics, and an explicit append-only `judge` addition plan for `llm.yml`, all grounded strictly in artefacts already stored for the latest `_runs` entry."
  },
  {
    "id": "escalate-weak-graders-through-needs-user-input",
    "prompt": "You already reviewed the latest `_runs` bundle and found graders that need regeneration. I have not approved anything yet—return the structured `needs_user_input` payload with clear accept vs reject options so the owning `/z-eval-judge` command can prompt me and resume you with answers. Keep your reply free of interactive `askQuestion` calls inside the judge loop.",
    "assertions": [
      "The agent returns structured `needs_user_input` with mutually exclusive approve vs defer choices tailored to handing off `/z-eval-update` work.",
      "The escalation copy names `/z-eval-update` (and implicitly the `zoto-update-evals` automation) as the path for applying evaluator fixes rather than patching eval JSON during the judge turn.",
      "The agent returned structured `needs_user_input` without emitting askQuestion from the subagent loop."
    ],
    "assertion_patterns": [
      "needs_user_input",
      "/z-eval-update",
      "needs_user_input"
    ],
    "expected_output": "A structured escalation payload that lays out regeneration choices for `/z-eval-update`, explicitly deferring conversational prompting to the parent command workflow."
  }
];

defineLlmEval({
  targetId: "agent:zoto-eval-judge",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
