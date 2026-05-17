// _meta.generated: true
/**
 * LLM `code`-strategy eval for skill `zoto-judge-evals`.
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
    "id": "post-run-adjudication-pulls-config-and-merges-judge-notes",
    "prompt": "Cursor just finished wiring the newest LLM eval batch. Pull up the adversarial judge evals guidance, open the freshest `_runs` slice under our configured evals folder, ingest the three YAML aggregates plus the raw case logs, and append a sceptical critique without rerun.",
    "assertions": [
      "Before touching artefacts the agent reads `.zoto/eval-system/config.yml` and honours both `evalsDir` and `judgeModel` when naming the model inside the new `judge` stanza.",
      "The agent chooses the single newest directory under `{evalsDir}/_runs/`, then loads `static.yml`, `llm.yml`, `report.yml`, and each relevant `logs/<case>.log` entry together.",
      "The agent appends a `judge` block where each `findings` item names a concrete case id, restricts `dimension` to verbosity, accuracy, confidence, grader, or assertion, and keeps `severity` within warn or flag.",
      "The agent lists concrete `recommendations` strings such as grader upgrades or updater follow-ups without deleting or rewriting pre-existing `totals` or `aggregates` keys in `llm.yml`.",
      "The agent refrains from launching eval executors or otherwise re-executing cases during the review pass."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml",
      "\\{evalsDir\\}/_runs/|evals/_runs/",
      "(?is)(?=.*static\\.yml)(?=.*\\bllm\\.yml\\b)(?=.*report\\.yml).*",
      "(?is)(?=.*\\bfindings\\b)(?=.*\\b(?:noisy-case|brittle-case)\\b)(?=.*\\bdimension:\\s*(?:verbosity|accuracy|confidence|grader|assertion)\\b).*",
      "(?is)(?=.*\\brecommendations\\b)(?:(?=.*\\/z-eval-update)(?=.*(?:grader|assertions?|scores?))(?=.*(?:matched_token|kind:\\s*contains))|(?=.*(?:regex|llm[- ]?judge))(?=.*grader)(?=.*(?:matched_token|kind:\\s*contains))(?=.*(?:brittle|substring|needle|sub-?four|four\\s+char|two[- ]char))).*"
    ],
    "expected_output": "The agent cites the resolved run timestamp, summarizes cross-case risks, updates only the trailing judge section in `llm.yml`, leaves prior totals untouched, and never schedules another evaluation pass."
  },
  {
    "id": "empty-run-history-blocks-analysis",
    "prompt": "I need the coverage critic on our eval harness, but this checkout has never written a timestamped folder under `_runs`. Route me through the correct recovery action.",
    "assertions": [
      "The agent states that no eligible timestamped directory exists beneath `{evalsDir}/_runs/` and points the operator toward `/z-eval-execute` before attempting analysis.",
      "The agent does not append a `judge` block or alter `llm.yml` because there is nothing to adjudicate.",
      "The agent avoids inventing sandbox paths outside the declared `evalsDir` hierarchy."
    ],
    "assertion_patterns": [
      "\\{evalsDir\\}/_runs/|evals/_runs/",
      "/z-eval-execute",
      "(?i)(?:no|without|never).{0,120}(?:timestamped|eligible).{0,100}(?:run|director|folder)|nothing\\s+to\\s+adjudicate|do\\s+not\\s+append.{0,80}\\bjudge\\b"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "evalsDir: evals\njudgeModel: opus-4.6\n"
        },
        {
          "path": "workspace/evals/_runs/.keep",
          "content": "marker only\n"
        }
      ]
    },
    "expected_output": "The agent explains that no recent run directory exists, tells the operator to execute the suite first, and never fabricates `judge` output."
  },
  {
    "id": "heuristic-scan-flags-brittle-graders-and-drifting-metrics",
    "prompt": "Load the adversarial evaluator skill, focus on run `20260201T090000Z`, and tell me whether our graders and soft metrics deserve tightening before release.",
    "assertions": [
      "The agent records at least one `findings` row whose `dimension` equals assertion when eval assertions lack matching grader corroboration for the same case.",
      "The agent records a `findings` row whose `dimension` equals grader when a contains grader depends on fewer than four characters of evidence.",
      "The agent records `findings` tied to verbosity above 2.0, confidence under 0.4, and accuracy under 0.5 when those thresholds appear for any case.",
      "When brittle contains graders are flagged the subsequent `recommendations` steer operators toward richer scorer stacks such as regex matchers or llm-backed judges consistent with the skill playbook.",
      "When durations are interpretable versus the suite mean, anomalies beyond two sigma are surfaced as severity warn or flag instead of silently passing.",
      "The resulting `llm.yml` retains the preceding `totals` and `aggregates` verbatim while nesting the appended `judge` content afterward."
    ],
    "assertion_patterns": [
      "(?is)(?=.*\\bfindings\\b)(?=.*\\b(?:noisy-case|brittle-case)\\b).*",
      "(?is)(?=.*\\bfindings\\b)(?=.*\\bdimension:\\s*grader\\b)(?=.*\\bbrittle-case\\b)(?=.*matched_token\\s*:\\s*\"f0\")(?=.*matched_token\\s*:\\s*\"1x\")(?=.*matched_token\\s*:\\s*\"z\").*",
      "(?is)(?=.*\\bfindings\\b)(?=.*\\bdimension:\\s*assertion\\b)(?=.*\\bnoisy-case\\b)(?=.*(?:parity|corroborat|assertion_parity|grader_contains|satisfied:\\s*false)).*",
      "(?is)(?=.*\\brecommendations\\b)(?:(?=.*\\/z-eval-update)(?=.*(?:matched_token|kind:\\s*contains))(?=.*(?:grader|assertion))|(?=.*(?:regex|llm[- ]?judge))(?=.*grader)(?=.*(?:matched_token|kind:\\s*contains))(?=.*(?:brittle|substring|needle|sub-?four|four\\s+char|two[- ]char))).*",
      "(?is)(?=.*\\bfindings\\b)(?=.*\\b(?:verbosity|confidence|accuracy)\\b)(?=.*(?:2\\.9|0\\.35|0\\.45|>?\\s*2\\.?0|\\bconfidence\\s*<|\\baccuracy\\s*<|\\bverbosity\\s*>|below\\s+0\\.?4|above\\s+2|two\\s+sigma|\\bmetrics\\b.+\\bcase\\b)).*",
      "(?is)(?=.*\\bfindings\\b)(?=.*(?:5200|1185|mean_duration|stddev|sigma|outlier|two\\s+sigma)).*",
      "(?is)(?=.*\\btotals\\b)(?=.*\\baggregates\\b)(?=.*\\bjudge\\b)(?=.*(?:llm\\.yml|llm\\s+yaml)).*"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "evalsDir: evals\njudgeModel: opus-4.6\n"
        },
        {
          "path": "workspace/evals/_runs/20260201T090000Z/static.yml",
          "content": "totals:\n  cases: 1\n\n"
        },
        {
          "path": "workspace/evals/_runs/20260201T090000Z/llm.yml",
          "content": "totals:\n  cases: 2\naggregates:\n  mean_duration_ms: 1200\n  stddev_duration_ms: 95\n\ncases:\n  noisy-case:\n    verbosity: 2.9\n    confidence: 0.35\n    accuracy: 0.45\n    duration_ms: 5200\n  brittle-case:\n    graders:\n      - kind: contains\n        matched_token: \"f0\"\n      - kind: contains\n        matched_token: \"1x\"\n      - kind: contains\n        matched_token: \"z\"\n    duration_ms: 1185\nassertions_checked:\n  noisy-case:\n    - id: parity\n      satisfied: false\n"
        },
        {
          "path": "workspace/evals/_runs/20260201T090000Z/report.yml",
          "content": "summary:\n  overall: unstable\n\n"
        },
        {
          "path": "workspace/evals/_runs/20260201T090000Z/logs/noisy-case.log",
          "content": "prompt: reconcile metrics\nresponse: stretched narrative\ngrader_contains: PASS\nassertion_parity: FAIL\n\n"
        }
      ]
    },
    "expected_output": "The agent writes nuanced findings tying log evidence to verbosity, accuracy, confidence, assertion gaps, and feeble graders, obeying merge-only edits on `llm.yml`."
  },
  {
    "id": "updater-coupling-surfaces-through-structured-yaml-only",
    "prompt": "The judge surfaced weak assertions on two skills — prepare the guarded hand-off exactly as documented so `/z-eval-judge` can route the prompts, and do not open interactive questions yourself.",
    "assertions": [
      "The emitted hand-off includes `needs_user_input.reason` plus a `questions` array whose first item uses `id: handoff`, offers labelled `options`, and aligns with updater delegation wording from the workflow.",
      "The agent never invokes `askQuestion` or analogous interactive widgets from inside the judged skill reasoning path.",
      "The narrative names specific downstream skills or eval targets deserving `/z-eval-update`, matching the sceptical findings it already enumerated.",
      "No `plugins/**/evals/evals.json` files nor other eval registrations are rewritten during this step; escalation stays descriptive."
    ],
    "assertion_patterns": [
      "(?is)(?=.*needs_user_input\\.reason)(?=.*(?:/z-eval-update|\\bz-eval-update\\b))(?=.*\\b(?:questions|options)\\b)(?=.*\\b(?:handoff|delegat|approve|batch)\\b).*",
      "(?is)(?=.*\\baskQuestion\\b)(?=.*(?:not|never|won't|do\\s+not|without|avoid|forbidden|must\\s+not)).*",
      "(?is)(?=.*(?:plugins/\\*\\*/evals/evals\\.json|plugins/[^\\s]{1,120}/evals/evals\\.json))(?=.*(?:not|never|won't|without|no\\s+rewrite|unchanged|descriptive\\s+only)).*"
    ],
    "expected_output": "The agent returns a YAML `needs_user_input` fragment with enumerated options covering batch approval, supervised updates, or cancellation, referencing affected skill targets implicitly or explicitly."
  },
  {
    "id": "slash-palette-alignment-still-routes-through-canonical-reads",
    "prompt": "/z-eval-judge is available now — treat that palette entry exactly like the sceptical evaluator skill: reuse the artefacts from the freshest suite run and summarise what still looks fragile.",
    "assertions": [
      "The interaction transcript lists reading `.zoto/eval-system/config.yml` prior to traversing `_runs/`, preserving the documented ordering.",
      "Reported outcomes remain post-hoc: no runner scripts are re-triggered unless the operator explicitly exits this flow to execute something else.",
      "When risk warrants follow-up automation, structured YAML matches the prescribed `needs_user_input` scaffold instead of ad hoc prose questionnaires."
    ],
    "assertion_patterns": [
      "(?is)(?=.*\\.zoto/eval-system/config\\.yml)(?=.*_runs).*",
      "\\bneeds_user_input\\b",
      "(?i)post-hoc|read-only|without\\s+rerun|does\\s+not\\s+re-?run"
    ],
    "expected_output": "Even when invoked via the palette hook, behaviour matches the textual workflow loads, critiques, merge-only edits, and optional structured hand-off payloads."
  }
];

defineLlmCodeEval({
  targetId: "skill:zoto-judge-evals",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
