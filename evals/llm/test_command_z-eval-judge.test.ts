// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-judge`.
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
    "id": "hard-stop-when-eval-system-config-is-missing",
    "prompt": "/z-eval-judge",
    "assertions": [
      "The assistant message is exactly: Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.",
      "No `zoto-eval-judge` subagent or `zoto-judge-evals` skill workflow starts and `llm.yml` under any `evals/_runs/` path is untouched."
    ],
    "assertion_patterns": [
      "/z-eval-init",
      "(?i)eval system is not initiali[sz]ed|`/z-eval-init`|config\\.yml"
    ],
    "expected_output": "A single refusal that tells the operator to initialise the eval system first, without opening run directories or editing YAML under evals."
  },
  {
    "id": "happy-path-annotates-newest-run-directory-into-llm-yml",
    "prompt": "/z-eval-judge",
    "assertions": [
      "After `/z-eval-judge`, `workspace/evals/_runs/20260507120000Z/llm.yml` contains a newly appended top-level `judge` mapping that was absent in the fixture.",
      "The command run spawns a `zoto-eval-judge` subagent wired to the `zoto-judge-evals` skill before mutating `llm.yml`.",
      "The judge narrative references signals that could only come from `static.yml`, `llm.yml`, `report.yml`, and `logs/case-a.log` together (for instance citing the passing total and the logged turn text).",
      "`workspace/evals/_runs/20260507120000Z/static.yml` and `workspace/evals/_runs/20260507120000Z/report.yml` are not deleted or replaced wholesale; only `llm.yml` receives the documented append-only edit."
    ],
    "assertion_patterns": [
      "/z-eval-judge",
      "zoto-eval-judge|zoto-judge-evals",
      "(?is)(?=.*static\\.yml)(?=.*\\bllm\\.yml\\b)(?=.*report\\.yml).*",
      "20260507120000Z.*llm\\.yml|llm\\.yml.*20260507120000Z"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "evalsDir: evals\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/static.yml",
          "content": "totals:\n  passed: 1\n  failed: 0\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/llm.yml",
          "content": "runs:\n  primary:\n    cases:\n      - id: case-a\n        verdict: pass\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/report.yml",
          "content": "totals:\n  passed: 1\n  failed: 0\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/logs/case-a.log",
          "content": "turn 0: assistant summarised coverage\n"
        }
      ]
    },
    "expected_output": "The subagent finishes analysis, `llm.yml` in that run folder contains a new `judge` section summarising findings from the loaded artefacts, and `static.yml` plus `report.yml` stay consistent with a read-only pass."
  },
  {
    "id": "askquestion-handoff-to-z-eval-update-then-resumes",
    "prompt": "/z-eval-judge",
    "follow_ups": [
      "Choose the handoff option that runs `/z-eval-update` next."
    ],
    "assertions": [
      "Immediately after `/z-eval-judge` while `report.yml` advertises `needs_user_input` for `/z-eval-update`, the assistant calls `askQuestion` whose choices name that command.",
      "After the follow-up answer selecting `/z-eval-update`, the assistant resumes with the chosen handoff and does not emit the identical `askQuestion` card again on the next turn.",
      "Throughout the loop, `workspace/evals/_runs/20260507120000Z/llm.yml` still receives the append-only `judge` block expected from the analysis pass."
    ],
    "assertion_patterns": [
      "/z-eval-judge",
      "/z-eval-update",
      "(?i)askQuestion",
      "workspace/evals/_runs/20260507120000Z/llm\\.yml"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "evalsDir: evals\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/static.yml",
          "content": "totals:\n  passed: 0\n  failed: 1\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/llm.yml",
          "content": "runs:\n  primary:\n    cases:\n      - id: case-b\n        verdict: fail\n        graders:\n          - type: regex\n            pattern: \"^$\"\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/report.yml",
          "content": "needs_user_input:\n  kind: handoff\n  propose_command: /z-eval-update\n  detail: Regex grader cannot substantiate the assertion.\ntotals:\n  passed: 0\n  failed: 1\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/logs/case-b.log",
          "content": "turn 0: assistant noted brittle grading\n"
        }
      ]
    },
    "expected_output": "First turn surfaces `askQuestion` options that include `/z-eval-update`; after the operator picks that path, the assistant resumes the judge flow without repeating the same prompt."
  }
];

defineLlmCodeEval({
  targetId: "command:z-eval-judge",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
