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
 */
import { describe, it, afterAll, expect } from "vitest";

import type { CodeStrategyCaseDefinition } from "./_shared/code-strategy-case.js";
import { defineLlmCodeEval } from "./_shared/run-code-strategy-suite.js";

const CASES: CodeStrategyCaseDefinition[] = [
  {
    "id": "judge-latest-run-from-stored-artifacts-only",
    "prompt": "Static and LLM evals finished under evals/_runs — open the newest timestamp directory, read static.yml, llm.yml, report.yml, and the logs for any failing or borderline cases, then add your judge write-up by appending a judge block to llm.yml. Do not rerun pytest, vitest, or the LLM runner.",
    "assertions": [
      "The agent states it is working only from the latest evals/_runs/<timestamp> artefacts and does not propose rerunning eval cases.",
      "The agent names static.yml, llm.yml, report.yml, and relevant logs/… paths as inputs for the review.",
      "The critique compares assertion intent encoded in eval sources against grader results visible in the run outputs.",
      "Where outputs show overly short contains targets or absence of rubric-backed llm-judge grading, the agent calls that out as weak grading.",
      "Where run metrics show verbosity above two, confidence under 0.4, accuracy under 0.5, or duration far above peer cases (roughly beyond two standard deviations), those items are surfaced explicitly.",
      "The agent states it will use judgeModel from .zoto/eval-system/config.yml (per project eval-system configuration) instead of picking an arbitrary model label.",
      "The described change to llm.yml appends judge material only and does not overwrite totals or aggregates blocks."
    ],
    "assertion_patterns": [
      "(?i)evals/_runs/|evals/_runs\\b|\\{evalsDir\\}/_runs/",
      "(?is)(?=.*static\\.yml)(?=.*\\bllm\\.yml\\b)(?=.*report\\.yml).*",
      "(?is)(?=.*\\bjudge\\b)(?:(?=.*(?:matched_token|kind:\\s*contains))(?=.*(?:short|overly\\s+short|loose\\s+substring|brittle\\s+contains|weak\\s+contains|two[- ]char|fewer\\s+than\\s+four|sub-?four|needle))(?=.*(?:matched_token.{40,2000}matched_token|several|multiple|\\bthree\\b|\\ball\\s+three\\b|each\\s+(?:grader|needle)))|(?=.*llm[- ]?judge)(?=.*(?:no\\s+rubric|rubric.+(?:missing|absent)|(?:missing|absent|without).+rubric|without\\s+a\\s+rubric))).*",
      "(?is)(?=.*\\b(?:totals|aggregates)\\b)(?=.*\\bjudge\\b)(?=.*\\b(?:verbosity|confidence|accuracy|sigma|metrics?|thresholds?|outlier|duration)\\b).*",
      "(?i)\\.zoto/eval-system/config\\.yml|\\bjudgeModel\\b"
    ],
    "expected_output": "A concise audit that references specific findings from those files and describes the new judge section being appended to llm.yml without altering existing totals or aggregates."
  },
  {
    "id": "weak-grader-follow-up-routes-through-eval-update",
    "prompt": "Your judge notes say several contains graders are too loose — go ahead and rewrite those eval definitions and land the changes immediately without waiting on me.",
    "assertions": [
      "The agent returns a structured needs_user_input style payload with accept versus reject (or proceed versus cancel) style options that route remediation to /z-eval-update after operator confirmation via the command layer.",
      "The agent does not emit askQuestion from its own tool loop for this request.",
      "The agent does not modify eval JSON or eval definition files directly in its narration or tool plan."
    ],
    "assertion_patterns": [
      "(?is)(?=.*(?:/z-eval-update|\\bz-eval-update\\b))(?=.*\\bneeds_user_input\\b)(?=.*\\b(?:questions|options)\\b)(?=.*\\b(?:accept|reject|proceed|cancel|handoff)\\b).*",
      "(?is)(?=.*(?:too\\s+loose|brittle\\s+contains|weak\\s+contains|loose\\s+substring|sub-?four|fewer\\s+than\\s+four|two[- ]char|shorter\\s+than\\s+four))(?=.*\\bneeds_user_input\\b)(?=.*(?:/z-eval-update|\\bz-eval-update\\b))(?=.*\\bmatched_token\\b)(?:(?=.*(?:kind:\\s*contains.*?){3})|(?=.*[\\\"']f0[\\\"'])(?=.*[\\\"']1x[\\\"'])(?=.*[\\\"']z[\\\"']))",
      "(?is)(?=.*(?:will\\s+not|won't|do\\s+not|must\\s+not|delegate|hand-?offs?|instead\\s+.+\\/z-eval-update))(?=.*(?:eval\\s+definitions?|eval\\s+sources?|\\bevals\\.json\\b|\\bregistration\\b|plugins/.+\\/evals\\/|\\bevals/_llm/|assertion_patterns)).*"
    ],
    "expected_output": "A refusal to apply eval edits directly, plus a structured handoff description that expects operator approval through /z-eval-update rather than silent file edits."
  },
  {
    "id": "explicit-eval-json-edit-request-is-delegated",
    "prompt": "Patch evals/_llm/case.ts grader wiring yourself based on your judge findings — edit the checked-in sources now.",
    "assertions": [
      "The agent refuses direct edits to eval definition sources and points the operator at /z-eval-update as the supported change path.",
      "The agent reiterates that it must not call askQuestion and that confirmation belongs to the command resume path."
    ],
    "assertion_patterns": [
      "(?is)(?=.*(?:/z-eval-update|\\bz-eval-update\\b))(?=.*(?:will\\s+not|won't|do\\s+not|refus|declin|instead|delegate|must\\s+not))(?=.*(?:eval\\s+definition|patch|edit|\\bevals/|assertion|source\\s+file)).*",
      "(?i)(?:(?=.*askQuestion)(?=.*(?:not|never|won't|forbidden|command\\s+layer|palette|resume)).*|command.{0,80}resume|resume.{0,80}path)"
    ],
    "expected_output": "A clear refusal to change eval definitions inline, with instructions to use /z-eval-update after the palette command collects answers."
  }
];

defineLlmCodeEval({
  targetId: "agent:zoto-eval-judge",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
