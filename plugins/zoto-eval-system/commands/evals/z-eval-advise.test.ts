// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-advise`.
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
    "id": "precondition-halts-before-init",
    "prompt": "/z-eval-advise",
    "assertions": [
      "Whenever `workspace/.zoto/eval-system/config.yml` is absent beforehand, assistant-facing text cites Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`. verbatim with no substitutions.",
      "No palette questionnaire referencing Full scan versus Specific plugin versus Specific skill executes while that precondition stays unsatisfied.",
      "No `/z-eval-create` or `/z-eval-update` routing chatter appears ahead of provisioning the missing YAML."
    ],
    "assertion_patterns": [
      "workspace/\\.zoto/eval-system/config\\.yml",
      "/z-eval-create"
    ],
    "expected_output": "The operator-visible refusal quotes the initialise-first wording and nothing attempts scope selection thereafter."
  },
  {
    "id": "skill-token-keeps-scope-tight",
    "prompt": "/z-eval-advise zoto-advise-evals",
    "assertions": [
      "After verifying `workspace/.zoto/eval-system/config.yml`, the orchestration resolves that token onto the manifest-declared skill tree instead of analysing unrelated targets.",
      "Briefing materials name both `.zoto/eval-system/config.yml` plus `.zoto/eval-system/manifest.yml` as mandatory inputs ahead of substantive scanning.",
      "The consolidated summary cites trigger phrase, schema, regression, citation, plus checklist statuses with quantitative counts or severities bounded to that scope.",
      "Palette questions following the gap summary replay per-axis severities aligned with breakpoint one wording before handing control back downward."
    ],
    "assertion_patterns": [
      "workspace/\\.zoto/eval-system/config\\.yml",
      "\\.zoto/eval-system/config\\.yml"
    ],
    "expected_output": "The adviser reads canonical config plus manifest files, confines findings to one skill subtree, inventories every enumerated gap axis from the command brief, then surfaces breakpoint drill-down palettes before resuming deeper work."
  },
  {
    "id": "plugin-token-triggers-handoff-matrix",
    "prompt": "/z-eval-advise zoto-eval-system",
    "follow_ups": [
      "Drill solely into citation verification gaps for follow-up scrutiny.",
      "Accept entirely every scaffolding plus tightening suggestion you enumerated."
    ],
    "assertions": [
      "Immediately after precondition success, lookups stay limited to artefacts inside that declared plugin subtree rather than the entire monorepo.",
      "Scope briefing states whether work is full versus targeted and names the resolved glob before deeper scanning begins.",
      "Recommendations surfaced at breakpoint two stay numbered plus paired with deterministic action labels referencing create versus update intents.",
      "Palette copy after breakpoint two surfaces accept all, walk each individually, create-only, update-only, plus no action choices exactly as written for Breakpoint 2.",
      "Whenever accepted rows mix scaffolding plus tightening intents, surfaced operator-facing routing orders `/z-eval-create` strictly before referencing `/z-eval-update --apply` with glob arguments.",
      "Structured hand-off payloads keep `source: /z-eval-advise`, enumerated `accepted_recommendations` entries detailing `id`, `target_id`, `dimension`, and `action`, and parallel `create_targets` plus `update_targets` blobs that mirror what the operator sanctioned."
    ],
    "assertion_patterns": [
      "/z-eval-create",
      "source: /z-eval-advise"
    ],
    "expected_output": "Plugin-scoped coverage flows through breakpoint drill-down palettes, enumerated breakpoint-two actions, blended recommendations, deterministic create-first sequencing, plus YAML-aligned adviser hand-offs when anything is adopted."
  },
  {
    "id": "palette-picker-targets-listed-plugin-branch",
    "prompt": "/z-eval-advise",
    "follow_ups": [
      "Choose Specific plugin from the questionnaire and pick zoto-spec-system so every downstream read stays inside that subtree."
    ],
    "assertions": [
      "Immediately after precondition success without inline arguments, palette copy lists Full scan, Specific plugin listings, plus Specific skill listings exactly as mandated for pre-collection.",
      "Once Specific plugin resolves, ensuing manifest reads constrain themselves to manifests plus sources covered by `plugins/zoto-spec-system/` rather than unrelated plugins.",
      "Continuing analysis still inventories every enumerated gap dimension for that narrowed corpus before breakpoint follow-ups rerun."
    ],
    "assertion_patterns": [
      "plugins/zoto-spec-system/"
    ],
    "expected_output": "Bare invocation executes the precondition, runs the advertised scope-selection questionnaire listing three heading styles, persists the Specific plugin disposition, binds the enumerated plugin subtree, then continues into adviser workloads."
  },
  {
    "id": "palette-full-sweep-from-manifest",
    "prompt": "/z-eval-advise",
    "follow_ups": [
      "Select Full scan from the opening questionnaire so every manifest row stays inside the adviser's working set."
    ],
    "assertions": [
      "Palette copy still enumerates Full scan, Specific plugin, plus Specific skill choices before the operator answers.",
      "Once Full scan is chosen, ensuing summaries quantify gaps across each manifest-listed target rather than narrowing to isolated plugin subtrees.",
      "Initial summaries score trigger phrase, schema, regression, citation, plus checklist axes across the whole manifest-facing catalogue ahead of breakpoint one drill-down questionnaires."
    ],
    "assertion_patterns": [],
    "expected_output": "After preconditions pass, the operator picks the full manifest sweep so gap scoring spans every listed target without narrowing to a single plugin or skill subtree."
  },
  {
    "id": "palette-picker-targets-listed-skill-card",
    "prompt": "/z-eval-advise",
    "follow_ups": [
      "Choose Specific skill inside the questionnaire and nominate zoto-create-evals so analysis stays bound to one skill card."
    ],
    "assertions": [
      "Immediately after precondition success without inline arguments, palette copy still enumerates Full scan alongside Specific plugin and Specific skill options exactly as mandated for pre-collection.",
      "Once Specific skill resolves against zoto-create-evals, ensuing reads stay confined to that lone skill subtree instead of neighbouring plugins.",
      "Gap summaries for that skill continue narrating trigger phrase plus schema plus regression plus citation plus checklist statuses before breakpoint one questionnaires appear."
    ],
    "assertion_patterns": [],
    "expected_output": "Palette-driven Specific skill routing mirrors typed skill arguments by tightening reads to one manifest-listed skill subtree before breakpoints fire."
  },
  {
    "id": "breakpoint-two-walk-lines-and-resume-loop",
    "prompt": "/z-eval-advise zoto-spec-system",
    "follow_ups": [
      "At breakpoint two insist on reviewing each enumerated recommendation sequentially, accepting lines one through three whilst skipping the remainder before resuming advisers."
    ],
    "assertions": [
      "Per-line palette questioning appears between adviser resumes when the operator insists on walking each recommendation individually.",
      "Final accepted payloads reflect only sanctioned rows after skipping later recommendations."
    ],
    "assertion_patterns": [],
    "expected_output": "The operator traverses iterative palette prompts per breakpoint-two line item until the sanctioned subset settles, preserving command-owned pacing between adviser resumes."
  },
  {
    "id": "breakpoint-two-create-filter-routing",
    "prompt": "/z-eval-advise zoto-eval-system",
    "follow_ups": [
      "At breakpoint two choose the disposition that limits execution to scaffolding-only approvals without tightening existing JSON rows."
    ],
    "assertions": [
      "When creation-only disposition prevails after breakpoint two palettes, surfaced `/z-eval-create` guidance activates while analogous `/z-eval-update … --apply` guidance stays absent.",
      "Structured `adviser_handoff` payloads mark only creation-side targets within `create_targets`, leaving tightening queues empty when nothing qualifies."
    ],
    "assertion_patterns": [
      "/z-eval-create",
      "adviser_handoff"
    ],
    "expected_output": "Create-filtered approvals route purely through `/z-eval-create` equivalents while withholding `/z-eval-update … --apply` sequences."
  },
  {
    "id": "breakpoint-two-update-filter-routing",
    "prompt": "/z-eval-advise zoto-eval-system",
    "follow_ups": [
      "At breakpoint two pick the tightening-only disposition that refuses brand-new scaffolding work."
    ],
    "assertions": [
      "When update-only disposition prevails after breakpoint two palettes, surfaced `/z-eval-update --target … --apply` guidance activates while `/z-eval-create` guidance stays absent.",
      "Structured `adviser_handoff` payloads enumerate only `update_targets` globs with rationale rows and leave `create_targets` empty when nothing qualifies."
    ],
    "assertion_patterns": [
      "/z-eval-update --target … --apply",
      "adviser_handoff"
    ],
    "expected_output": "Tightening-only approvals route purely through `/z-eval-update … --apply` equivalents while withholding `/z-eval-create` introductions."
  },
  {
    "id": "breakpoint-two-dismissal-without-handoff",
    "prompt": "/z-eval-advise zoto-eval-system",
    "follow_ups": [
      "After recommendations appear, tell the workflow to take no further automated action so you can review textually without routing."
    ],
    "assertions": [
      "Palette selections that decline every recommendation close with textual recap only and never emit `/z-eval-create` plus never emit `/z-eval-update`.",
      "No structured `adviser_handoff` payload gets forwarded onward after dismissing actionable work wholesale."
    ],
    "assertion_patterns": [
      "/z-eval-create",
      "adviser_handoff"
    ],
    "expected_output": "The closing guidance replays report highlights yet omits creation or tightening command routing when nothing is adopted."
  }
];

defineLlmEval({
  targetId: "command:z-eval-advise",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
