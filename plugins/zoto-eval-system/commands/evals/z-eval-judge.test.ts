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
 * Interaction classification: requiresInteraction=true, interactionStyle=command-owned
 * Analyser version: 2026.05.26-1
 * Backend: code-strategy (LLM)
 */
import { describe, it, afterAll, expect } from "vitest";
import { resolveInteractionPlanFromCase } from "../../../../evals/llm/_shared/askquestion-bridge.js";

import type { LlmCaseDefinition } from "../../../../evals/llm/_shared/llm-case.js";
import { defineLlmEval } from "../../../../evals/llm/_shared/run-llm-suite.js";

const CASES: LlmCaseDefinition[] = [
  {
    "id": "reject-when-eval-system-config-is-absent",
    "prompt": "/z-eval-judge",
    "assertions": [
      "The refusal text is verbatim: Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.",
      "On that refusal path no `logs/*.log` under `evals/_runs/` is processed and nothing appends `judge:` into any `evals/_runs/*/llm.yml`."
    ],
    "assertion_patterns": [
      "/z-eval-init",
      "logs/\\*\\.log"
    ],
    "expected_output": "Cursor surfaces the initialise-first refusal with no traversal of run artefacts."
  },
  {
    "id": "annotate-freshest-eval-run",
    "prompt": "/z-eval-judge",
    "assertions": [
      "The command targets the freshest `evals/_runs/<timestamp>/` directory before opening any run-scoped artefacts.",
      "`static.yml`, `llm.yml`, merged `report.yml`, and transcripts under `logs/<case>.log` are consulted prior to authoring the critique.",
      "`llm.yml` gains a new append-only `judge:` stanza that summarizes coverage breadth, evaluator rigor, and conspicuous soft-score drift while leaving pre-existing `llm.yml` content untouched outside that append."
    ],
    "assertion_patterns": [
      "evals/_runs/<timestamp>/",
      "static\\.yml",
      "llm\\.yml"
    ],
    "expected_output": "Judge commentary lands as an appended `judge:` section inside `llm.yml`, informed by consolidated YAML artefacts and transcripts for the freshest run snapshot."
  },
  {
    "id": "resume-after-z-eval-update-remediation-choice",
    "prompt": "/z-eval-judge",
    "follow_ups": [
      "Accept the remediation branch that pushes the weakest assertions through `/z-eval-update` regeneration."
    ],
    "assertions": [
      "Whenever `needs_user_input` payloads enumerate `/z-eval-update` remediation options surfaced from judgement, askQuestion executes before persisted hand-off artefacts are written or before the updater is invoked directly.",
      "After the approving follow-up, the resumed exchange continues remediation toward `/z-eval-update` prerequisites instead of spawning a redundant `/z-eval-judge` pass or silently falling back to `/z-eval-execute`.",
      "The judge specialist returns structured `needs_user_input` for remediation paths; AskQuestion is shown only from the parent command, not from the judgement delegate."
    ],
    "assertion_patterns": [
      "needs_user_input",
      "/z-eval-update",
      "needs_user_input"
    ],
    "expected_output": "Remediation routing pauses behind an AskQuestion-backed selection, resumes with that answer, and keeps work aimed at updater preparation instead of rerun execution."
  }
];

defineLlmEval({
  targetId: "command:z-eval-judge",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
