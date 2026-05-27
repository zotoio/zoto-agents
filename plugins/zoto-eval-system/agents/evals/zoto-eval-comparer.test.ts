// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-eval-comparer`.
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
    "id": "handoff-after-pinned-runs-with-judge-columns",
    "prompt": "From this chat thread, please orchestrate zoto-eval-comparer to reconcile `run-a` versus `run-b` under the eval `_runs` tree: both folders already hold `report.yml` with `report.static` and `report.llm` slices from the latest passes, and several cases were adjudicated upstream so accuracy and confidence should remain populated. Walk the delegate through flattening every case into table rows (including `log_path` values that point at each run’s `logs/<case>.log`), copy the compare canvas instructions without editing them, package the JSON hand-off for `/canvas`, and tell me how the host chat should forward that payload so charts never render inside this thread.",
    "assertions": [
      "Each flattened row includes `run_id`, `model`, `case_id`, `status`, `tokens`, `duration_ms`, `verbosity`, `accuracy`, `confidence`, and `log_path`, with `log_path` targeting `logs/<case>.log` under the resolved run directory.",
      "Primary figures come from each operand’s `report.yml` via `report.static` and `report.llm` before any optional file reads.",
      "The `/canvas` JSON payload carries instruction text that is byte-identical to `templates/canvas/compare-prompt.md.tmpl` together with the complete non-aggregated dataset the template describes.",
      "Closing guidance tells the host agent to pass the payload to Cursor’s `/canvas` tool rather than attempting chart layout in chat.",
      "The comparer does not emit askQuestion while producing the hand-off."
    ],
    "assertion_patterns": [
      "run_id",
      "report\\.yml",
      "/canvas",
      "/canvas"
    ],
    "expected_output": "A single structured response that lists every merged row with the documented columns, embeds the exact compare-prompt template text, names `/canvas` as the rendering tool, and reminds the host to relay the blob instead of drawing plots here."
  },
  {
    "id": "prefix-fragment-collision-returns-needs-user-input",
    "prompt": "I need you to delegate to zoto-eval-comparer and steer compare-mode until operands are unambiguous: I only supplied the short stamp `20260503` for the first run and `20260504` for the second, and each fragment matches multiple sibling directories under `evals/_runs/` while I never paired a unique path to either argument. Have the comparer stop for human-readable disambiguation before merging anything.",
    "assertions": [
      "The agent returns structured `needs_user_input` without emitting askQuestion from the subagent loop.",
      "Each unresolved operand lists every matching run directory as a distinct `options[].label` showing the complete `evals/_runs/<basename>/` path.",
      "No flattened merge or `/canvas` payload ships until every operand resolves to a single directory containing `report.yml`."
    ],
    "assertion_patterns": [
      "needs_user_input",
      "options\\[\\]\\.label",
      "/canvas"
    ],
    "expected_output": "A schema-valid `needs_user_input` object with one unresolved-operand entry per ambiguous argument and option labels that spell out the full `evals/_runs/<basename>/` path for every candidate."
  },
  {
    "id": "supplemental-yaml-fills-backend-gaps",
    "prompt": "Walk `zoto-eval-comparer` through a three-way comparison where `run-alpha`, `run-beta`, and `run-gamma` all have `report.yml`, but one backend slice is missing from the embedded rollups so row normalisation must read the matching `static.yml` or `llm.yml` beside `report.yml` before flattening. Keep every per-case row in the export for `/canvas` and double-check judge-facing columns stay intact when those auxiliary files carry the missing metrics.",
    "assertions": [
      "When `report.static` / `report.llm` omit a backend measure, the comparer merges in values from neighbouring `static.yml` or `llm.yml` before emitting rows so tokens, durations, or related fields stay truthful.",
      "The resulting dataset retains judge-tier fields such as `accuracy` and `confidence` wherever the source artefacts provide them after flattening.",
      "The emitted JSON still forbids downsampling or aggregating rows away before the `/canvas` transfer and the comparer refrains from askQuestion throughout."
    ],
    "assertion_patterns": [
      "report\\.static",
      "accuracy",
      "/canvas"
    ],
    "expected_output": "A completed hand-off whose flat table still lists every case without downsampling while rows reflect backend figures reconciled via the supplemental yaml read the documentation allows."
  }
];

defineLlmEval({
  targetId: "agent:zoto-eval-comparer",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
