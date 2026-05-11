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
      "\\{evalsDir\\}/_runs/",
      "(?is)(?=.*static\\.yml)(?=.*\\bllm\\.yml\\b)(?=.*report\\.yml).*",
      "\\bjudge\\b.{0,220}\\bfindings\\b|\\bfindings\\b.{0,220}\\bjudge\\b",
      "\\brecommendations\\b.{0,120}(?:grader|/z-eval-update|eval-update|regex|llm)"
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
      "/z-eval-execute",
      "(?i)(?:\\{evalsDir\\}/_runs/|evals/_runs).{0,200}(?:no|missing|without|empty|never).{0,120}(?:timestamp|run directory|eligible)",
      "(?i)(?:does not|do not|won't|refuses to).{0,80}(?:append|judge|\\byaml\\b)"
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
      "(?i)brittle-case|noisy-case",
      "(?i)dimension[^\\n]{0,72}\\bgrader\\b",
      "(?i)dimension[^\\n]{0,72}\\bassertion\\b",
      "(?i)(?:verbosity|confidence|accuracy).{0,40}(?:2\\.9|0\\.35|0\\.45|0\\.4|0\\.5|2\\.0)",
      "(?i)\\brecommendations\\b.{0,220}(?:regex|llm[- ]?judge|/z-eval-update)",
      "(?i)(?:2σ|two\\s+sigma|standard\\s+deviation).{0,100}(?:duration|outlier|5200|1185)"
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
          "content": "totals:\n  cases: 2\naggregates:\n  mean_duration_ms: 1200\n  stddev_duration_ms: 95\n\ncases:\n  noisy-case:\n    verbosity: 2.9\n    confidence: 0.35\n    accuracy: 0.45\n    duration_ms: 5200\n  brittle-case:\n    graders:\n      - kind: contains\n        matched_token: \"ai\"\n      - kind: contains\n        matched_token: \"to\"\n      - kind: contains\n        matched_token: \"no\"\n    duration_ms: 1185\nassertions_checked:\n  noisy-case:\n    - id: parity\n      satisfied: false\n"
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
      "needs_user_input\\s*:\\s*(?:\\n|$)|`needs_user_input`|needs_user_input\\.reason",
      "(?i)\\bid:\\s*handoff\\b",
      "/z-eval-update|z-eval-update",
      "(?i)plugins/\\*\\*/evals/evals\\.json|evals/evals\\.json"
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
      "(?is)\\.zoto/eval-system/config\\.yml.{0,400}_runs/",
      "needs_user_input|/z-eval-update"
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
