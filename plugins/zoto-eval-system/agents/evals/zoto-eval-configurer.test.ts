// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-eval-configurer`.
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
    "id": "manifest-snapshot-declarative-refresh-with-cleanup-plan-hand-off",
    "prompt": "I already ran `/z-eval-configure` and confirmed overwrite when needed; the payload lists vitest static tests, declarative LLM evals, and both `update.preserveUserAuthoredCases` and `update.writeMetaMarker` forwarded as true. Please drive configuration so the YAML matches those choices and give me the cleanup summary the command expects next.",
    "assertions": [
      "`.zoto/eval-system/config.yml` records `static.framework: vitest` and `llm.strategy: declarative` after the run.",
      "The closing report includes a `cleanup_plan` object whose field names match the cleanup-plan schema contract and whose `totals.files` equals the summed file counts across all groups.",
      "The agent fulfills the escalation contract without emitting `askQuestion` from the delegated run and relies solely on fields the command prefilled.",
      "When totals show no cleanup work, the guidance still directs me toward `/z-eval-create` or routine maintenance wording consistent with idle cleanup."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml",
      "cleanup_plan",
      "askQuestion",
      "/z-eval-create"
    ],
    "expected_output": "The final reply states the effective static and LLM settings, summarizes whether files need cleanup, and returns a structured cleanup plan describing grouped stale assets by reason with matching totals while pointing me toward the next eval-system step when nothing requires cleanup."
  },
  {
    "id": "immutable-update-flags-refuse-before-any-write",
    "prompt": "The forwarded bundle from `/z-eval-configure` shows `update.writeMetaMarker` set to false in every mirrored path even though pytest static plus matched vitest-code answers are otherwise ready—handle that contradiction and halt cleanly.",
    "assertions": [
      "The refusal appears before acknowledging any YAML write completion, emitting a cleanup plan draft, or appending manifest-history entries.",
      "`.zoto/eval-system/config.yml` stays byte-identical to the pre-run sandbox copy.",
      "No structured `cleanup_plan` accompanies the refusal."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml",
      "cleanup_plan"
    ],
    "expected_output": "The response is an explicit refusal that names the non-negotiable `true` requirement for both update flags and ends without producing a cleanup plan or claiming the config file changed."
  },
  {
    "id": "code-strategy-without-llm-codeframework-needs-user-input-escalation",
    "prompt": "With orchestrated questionnaire answers otherwise valid, apply llm.strategy \"code\" but omit llm.codeFramework so I can replay how `/z-eval-configure` resumes after your structured escalation.",
    "assertions": [
      "The agent returns structured `needs_user_input` describing the absent `llm.codeFramework` instead of inventing silent defaults.",
      "The escalation honors the delegated no-askQuestion contract while surfacing blocker text the host command can rerun.",
      "No passage claims `.zoto/eval-system/config.yml` satisfies the published config-schema contract until the harness field is supplied."
    ],
    "assertion_patterns": [
      "needs_user_input",
      "\\.zoto/eval-system/config\\.yml"
    ],
    "expected_output": "The assistant responds with structured `needs_user_input` that lists the missing code-framework detail the command must collect, without claiming the YAML update completed."
  },
  {
    "id": "legacy-filesystem-snapshot-static-only-diff-without-phantom-strategy-churn",
    "prompt": "Our workspace only had pytest inferred from `evals/conftest.py` with no prior LLM strategy stored in YAML, and `/z-eval-configure` now captured answers adopting jest static plus declarative LLM runs. Produce the cleanup diff without inventing a historic declarative-vs-code switch that never existed in config snapshots.",
    "assertions": [
      "The cleanup plan documents a `framework-switch` bucket covering the prior pytest fingerprint and associated generated static artifacts instead of silent omissions.",
      "No `strategy-switch` group appears solely because older filesystem snapshots lacked populated `llm.strategy` rows.",
      "Any `removed-target` lines ignore tooling-only phantom catalogue listings already filtered out of the snapshot eval file list yet still reconcile ignore-driven orphans against live YAML rules."
    ],
    "assertion_patterns": [
      "framework-switch",
      "strategy-switch",
      "removed-target"
    ],
    "expected_output": "The narrative highlights the static-framework migration, summarizes declarative LLM adoption, and groups cleanup strictly around real fingerprints without a hollow strategy churn bucket tied to imaginary prior LLM metadata."
  },
  {
    "id": "missing-manifest-snapshot-inaugural-config-with-empty-cleanup-plan",
    "prompt": "Bootstrap eval-system on a checkout that never shipped `.zoto/eval-system/manifest.yml`; `/z-eval-configure` already gathered vitest static plus declarative LLM answers plus both immutable update mirrors set to true. Land the YAML and characterize cleanup fallout.",
    "assertions": [
      "`.zoto/eval-system/config.yml` captures the questionnaire frameworks and strategies on disk.",
      "The emitted `cleanup_plan` reports `totals.files` equal to zero because no stale manifest-linked assets exist yet.",
      "The closing guidance mentions `/z-eval-create` onboarding even when grouped cleanup buckets stay empty."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml",
      "cleanup_plan",
      "/z-eval-create"
    ],
    "expected_output": "The write succeeds, the cleanup summary shows zero orphaned rows because no catalogue existed previously, yet the conversational close still pushes me toward eval scaffolding afterward."
  },
  {
    "id": "llm-strategy-switch-invalidate-cached-primitive-analysis-rows",
    "prompt": "Shift from declarative LLM suites to jest-backed code-strategy suites while keeping static suites on jest; the manifest catalogue already enumerates generated eval JSON rows whose cached primitive analyses must be marked stale.",
    "assertions": [
      "Each generated entry listed under the bundled manifest `eval_files` collection picks up `_meta.primitive_analysis.invalidate: true` when `llm.strategy` changes.",
      "The reply never tells me to delete files directly; instead it publishes a structured `cleanup_plan` for whichever cleanup driver the command launches.",
      "The cleanup plan includes a `strategy-switch` bucket tallying erstwhile declarative case rows now superseded."
    ],
    "assertion_patterns": [
      "eval_files",
      "cleanup_plan",
      "strategy-switch"
    ],
    "expected_output": "After the YAML succeeds, the final note calls out `_meta.primitive_analysis.invalidate: true` on generated manifest-hosted rows while hashed analyser caches remain untouched on disk."
  },
  {
    "id": "cross-field-mismatch-warn-when-static-vitest-diverges-from-jest-code-harness",
    "prompt": "`/z-eval-configure` fused answers that pin `static.framework` to vitest while selecting `llm.strategy: \"code\"` paired with `llm.codeFramework: jest`; reproduce how soft diagnostics surface alongside the hardened write.",
    "assertions": [
      "`cleanup_plan.warnings` records a non-blocking vitest-vs-jest inconsistency narrative.",
      "A `framework-switch` bucket lists artefacts tied to the displaced static-framework fingerprint alongside explicit filenames.",
      "The summary reiterates effective field selections and distinguishes drafting guidance from destructive confirmation dialogs that `/z-eval-configure` retains."
    ],
    "assertion_patterns": [
      "cleanup_plan\\.warnings",
      "framework-switch",
      "/z-eval-configure"
    ],
    "expected_output": "The YAML still persists, narrative warnings cite the tooling mismatch, and framework-specific removals stay grouped distinctly while the handshake reminds me destructive approvals stay with the calling command palette entry."
  }
];

defineLlmEval({
  targetId: "agent:zoto-eval-configurer",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
