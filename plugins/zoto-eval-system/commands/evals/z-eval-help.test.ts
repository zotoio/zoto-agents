// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-help`.
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
    "id": "abort-when-eval-config-missing",
    "prompt": "/z-eval-help",
    "assertions": [
      "Execution stops immediately when `.zoto/eval-system/config.yml` is absent at the workspace root rather than silently fabricating config.",
      "The visible refusal matches the canonical sentence verbatim: Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.",
      "No tailoring pass claims eval manifest counts, eval run identifiers, or package script names sourced from `.zoto/eval-system/config.yml`."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml",
      "/z-eval-init",
      "\\.zoto/eval-system/config\\.yml"
    ],
    "expected_output": "A single refusal line telling the operator to initialise the Eval System before help can run; no numbered README picker and no customised help narrative about this repository."
  },
  {
    "id": "bare-invocation-opens-readme-section-picker",
    "prompt": "/z-eval-help",
    "assertions": [
      "The command emits askQuestion with a numbered list derived from consecutive `##` headings in `plugins/zoto-eval-system/README.md`.",
      "Listing appears before invoking `zoto-help-evals`; there is no intermediate agent requirement for the mainstream path documented in Instructions."
    ],
    "assertion_patterns": [
      "##",
      "zoto-help-evals"
    ],
    "expected_output": "Command-owned AskQuestion listing README sections keyed to `plugins/zoto-eval-system/README.md` before any grounded answer tying section prose to repo-specific eval layout."
  },
  {
    "id": "topic-argument-short-circuits-to-tailored-section",
    "prompt": "/z-eval-help updating",
    "assertions": [
      "Response opens with substantive README-grounded mechanics instead of reopening the full section picker documented for missing topics.",
      "At least one inline citation honours the mandated `start:end:plugins/zoto-eval-system/README.md` pattern whenever README wording is echoed.",
      "Mentioned knobs such as `evalsDir`, manifest row counts, or latest run identifiers line up with the files read from the sandbox rather than stock boilerplate guesses."
    ],
    "assertion_patterns": [
      "start:end:plugins/zoto-eval-system/README\\.md",
      "evalsDir"
    ],
    "expected_output": "Concise prose anchored on README guidance about upkeep or refresh flows, tightened with factual reads from `.zoto/eval-system/config.yml`, `manifest.yml`, and the newest `evals/_runs/` directory naming what is really on disk."
  },
  {
    "id": "ambiguous-topic-triggers-disambiguating-question",
    "prompt": "/z-eval-help eval",
    "assertions": [
      "AskQuestion prompts the operator to disambiguate when the topic token matches multiple `##` headings.",
      "Final answer cites the narrowed README excerpt using `start:end:plugins/zoto-eval-system/README.md`."
    ],
    "assertion_patterns": [
      "##",
      "start:end:plugins/zoto-eval-system/README\\.md"
    ],
    "expected_output": "Intermediate AskQuestion narrowing which README subsection applies, followed by repo-aware explanation once clarified."
  },
  {
    "id": "free-form-reply-recorded-after-picker",
    "prompt": "/z-eval-help",
    "follow_ups": [
      "I am not picking a numbered row—please contrast how compare mode differs from judge mode for our manifest entries."
    ],
    "assertions": [
      "Command-owned prompts accept the improvised follow-up and carry it forward as contextual text instead of insisting on numbered picks only after the refusal path.",
      "Returned guidance references artefacts such as `.zoto/eval-system/manifest.yml` or `.zoto/eval-system/config.yml` when contrasting modes, aligning with observable repo files rather than hypothetical defaults.",
      "README citations obey the `start:end:plugins/zoto-eval-system/README.md` contract for quoted excerpts."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/manifest\\.yml",
      "start:end:plugins/zoto-eval-system/README\\.md"
    ],
    "expected_output": "An answer keyed to whichever README subsection best covers comparison versus adjudication flows, acknowledging the conversational question verbatim or paraphrasing it faithfully while remaining README-sourced and repo-tailored."
  },
  {
    "id": "resume-after-skill-requests-more-context",
    "prompt": "/z-eval-help manifest",
    "follow_ups": [
      "Use the numbering that targets configuration plus manifest bookkeeping, then answer."
    ],
    "assertions": [
      "Whenever `zoto-help-evals` surfaces structured needs_user_input, the immediate next step routes through command-owned AskQuestion before a second invocation with completed help_context delivers the final narration.",
      "The closing narration cites README ranges with `start:end:plugins/zoto-eval-system/README.md`.",
      "Facts about `.zoto/eval-system/manifest.yml` match the sandbox copy after the clarified path settles."
    ],
    "assertion_patterns": [
      "zoto-help-evals",
      "start:end:plugins/zoto-eval-system/README\\.md",
      "\\.zoto/eval-system/manifest\\.yml"
    ],
    "expected_output": "First assistant turn either applies AskQuestion locally or relays structured needs_user_input, then resumes with richer help_context producing a stitched answer tying README excerpts to live manifest metadata."
  },
  {
    "id": "navigation-ask-after-answer-and-route-to-workflow-guidance",
    "prompt": "/z-eval-help workflow",
    "follow_ups": [
      "That helped—now steer me briefly to the slash helpers that skip deep README citations"
    ],
    "assertions": [
      "Baseline answer keeps README citations intact per the citation clause before any pivot to lighter routing chatter.",
      "Subsequent AskQuestion turn offers onward navigation aligned with Related guidance instead of hallucinating undocumented slash routers."
    ],
    "assertion_patterns": [],
    "expected_output": "Initial deep README-grounded synopsis for workflow topics followed by succinct pointers toward `/z-eval-start`, `/z-eval-jump`, `/z-eval-operator`, and `/z-eval-workflow` when the operator wants lighter routing cues."
  }
];

defineLlmEval({
  targetId: "command:z-eval-help",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
