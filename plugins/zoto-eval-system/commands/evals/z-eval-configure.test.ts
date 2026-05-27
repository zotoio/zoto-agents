// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-configure`.
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
    "id": "abort-when-config-missing",
    "prompt": "/z-eval-configure",
    "assertions": [
      "When `.zoto/eval-system/config.yml` is absent at the repository root, the assistant output is exactly: Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.",
      "No `.zoto/eval-system/config.yml` file is created by this invocation."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml",
      "\\.zoto/eval-system/config\\.yml"
    ],
    "expected_output": "The run stops immediately with initialise guidance and leaves the workspace without a new config file."
  },
  {
    "id": "pre-collect-sequence-spawns-configurer",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Overwrite existing config and continue.",
      "Keep default evals directory.",
      "Include `.cursor/skills`, `skills`, and `plugins/*/skills`.",
      "Enable discovery for skill, command, agent, hook, cli, and lib.",
      "Use vitest for static.framework.",
      "Use declarative llm.strategy.",
      "Run LLM specs with tsx.",
      "Pick composer-2.5 for llm.model.id.",
      "Set judgeModel to opus-4.6.",
      "Leave manualChecklists.enabled on.",
      "Add vitest under additionalAutomation.",
      "Keep all five update.criticalChangeRules toggles enabled."
    ],
    "assertions": [
      "Before the Task starts, command-owned askQuestion prompts appear in documented order covering overwrite vs cancel vs show-only paths, evalsDir, skillsRoots selections, discoveryTargets selections, static.framework, llm.strategy, llm.runtime, llm.model.id, judgeModel, manualChecklists.enabled, additionalAutomation picks, and the five update.criticalChangeRules booleans — including the conditional llm.codeFramework questionnaire whenever llm.strategy is code rather than declarative — and omit preserveUserAuthoredCases and writeMetaMarker entirely or keep both logically true-only in the outbound payload.",
      "The hand-off bundles `readManifestSnapshot()` output describing whether values came from `manifest.yml` discovery blocks, inferred filesystem fingerprints, or a missing-manifest stub.",
      "zoto-eval-configurer finishes without emitting askQuestion; operator prompts after the Task are limited to cleanup confirmation owned by the host command path."
    ],
    "assertion_patterns": [
      "readManifestSnapshot\\(\\)"
    ],
    "expected_output": "The command completes the full askQuestion ladder, launches zoto-eval-configurer once with the collected answers plus an oldSnapshot from manifest-snapshot, and writes refreshed `.zoto/eval-system/config.yml` validated against the bundled config schema without asking for preserveUserAuthoredCases or writeMetaMarker fields."
  },
  {
    "id": "framework-switch-stamps-invalidations-and-confirms-cleanup",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Overwrite existing config.",
      "Retain default evals directory.",
      "Select `.cursor/skills` plus `skills` only for skillsRoots.",
      "Limit discoveryTargets to skill, command, agent, hook.",
      "Flip static.framework to vitest while prior snapshot used pytest for static tests.",
      "Keep llm.strategy on code and align llm.codeFramework with vitest after the conditional prompt fires.",
      "Run LLM tooling under tsx.",
      "Use sonnet for llm.model.id.",
      "Retain judgeModel opus-4.6.",
      "Turn manualChecklists.enabled off and pick bats for additionalAutomation.",
      "Leave critical change toggles unchanged."
    ],
    "assertions": [
      "Returning cleanup_plan totals with files greater than zero forces the command to summarise each cleanup group summary with listed paths kinds before posing Apply this cleanup plan with Apply, Skip cleanup, or Re-run /z-eval-configure with different choices.",
      "Selecting Apply runs `pnpm run eval:cleanup-stale` with stdin or a tempfile mirroring the JSON plan validated against `templates/schema/cleanup-plan.schema.json`.",
      "After the configuration write, `.zoto/eval-system/manifest.yml` eval_file entries stamped as generated expose `_meta.primitive_analysis.invalidate: true` wherever static.framework or llm.strategy drifted against oldSnapshot.",
      "Choosing Skip cleanup records the deferral in `.zoto/eval-system/manifest.history.yml` so operators know cleanup was postponed."
    ],
    "assertion_patterns": [
      "pnpm run eval:cleanup-stale",
      "\\.zoto/eval-system/manifest\\.yml",
      "\\.zoto/eval-system/manifest\\.history\\.yml"
    ],
    "expected_output": "A non-empty cleanup_plan lists affected assets, surfaced warnings precede Apply this cleanup plan, choosing Apply invokes pnpm eval:cleanup-stale with the negotiated plan bytes, manifest rows referencing generated eval files inherit `_meta.primitive_analysis.invalidate: true`, and manifests history notes the cleanup decision."
  },
  {
    "id": "preserve-meta-contract-refusal-and-fix",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "First attempt purposely forwards bundled answers omitting repaired integrity flags.",
      "Immediately repair the outbound payload removing false preserveUserAuthoredCases or writeMetaMarker flags so both protections stay true-only."
    ],
    "assertions": [
      "Until preserveUserAuthoredCases and writeMetaMarker are both affirmed true-only, configurier rejects before emitting any config write operator-side text calls that out the contract breach verbatim from the markdown contract.",
      "After the corrections, the resumed Task writes `.zoto/eval-system/config.yml` without asking the operator to loosen those safeguards."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml"
    ],
    "expected_output": "Configurer refuses prior to modifying disk until markers stay true-only, after which `.zoto/eval-system/config.yml` is written cleanly."
  },
  {
    "id": "resume-missing-codeframework",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Attempt code strategy answers but defer llm.codeFramework until the corrective turn."
    ],
    "assertions": [
      "When llm.strategy is code and llm.codeFramework is absent from the payload, the returned report contains structured needs_user_input referencing the missing field instead of fabricating defaults.",
      "After the command-owned follow-up records vitest, the resumed Task writes configuration where llm.codeFramework is populated."
    ],
    "assertion_patterns": [],
    "expected_output": "Configurer returns structured needs_user_input describing the missing llm.codeFramework linkage, command-owned askQuestion supplies vitest, resume completes the write."
  },
  {
    "id": "cleanup-plan-schema-rejection-resume",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Approve overwrite and standard answers until configurier rejects an unexpected cleanup_plan kind value."
    ],
    "assertions": [
      "Cleanup plans that violate `cleanup-plan.schema.json` produce structured needs_user_input rather than silently deleting artefacts.",
      "The command relays follow-up answers and resumes until the sanitised cleanup_plan validates."
    ],
    "assertion_patterns": [
      "cleanup-plan\\.schema\\.json"
    ],
    "expected_output": "Command surfaces configurier rejection, relays repair guidance, resumes until validation passes."
  },
  {
    "id": "judge-model-tweak-skips-empty-cleanup-confirm",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Overwrite while keeping frameworks and strategies unchanged but change judgeModel from opus-4.6 to sonnet only."
    ],
    "assertions": [
      "cleanup_plan totals report zero removable files skip the Apply this cleanup plan askQuestion altogether for that pass."
    ],
    "assertion_patterns": [],
    "expected_output": "Configurer writes config with new judgeModel and skips Apply this cleanup plan because totals.files is zero."
  },
  {
    "id": "static-versus-code-framework-mismatch-warning",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Overwrite with static.framework vitest yet deliberately pick llm.codeFramework jest despite documentation recommending alignment."
    ],
    "assertions": [
      "Mismatch between static.framework and llm.codeFramework surfaces cleanup_plan.warning entries readable before Apply this cleanup plan.",
      "The mismatched grouping still lists framework-switch assets with per-file kind metadata for operator review."
    ],
    "assertion_patterns": [],
    "expected_output": "Returning cleanup_plan includes warnings surfaced prior to Apply this cleanup plan and still enumerates orphaned framework artefacts."
  },
  {
    "id": "rerun-choice-restarts-wizard",
    "prompt": "/z-eval-configure",
    "follow_ups": [
      "Reach cleanup confirmation and pick Re-run /z-eval-configure with different choices so the flow discards the in-flight write."
    ],
    "assertions": [
      "Choosing Re-run /z-eval-configure with different choices abandons the pending write, restores the prior backup state described in command guidance, and restarts askQuestion from the overwrite vs cancel decision."
    ],
    "assertion_patterns": [],
    "expected_output": "No partial config remains applied, and the command restarts from the existing-config decision step."
  }
];

defineLlmEval({
  targetId: "command:z-eval-configure",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
