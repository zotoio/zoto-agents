// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-update`.
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
    "id": "initialization-gate-aborts-before-discovery",
    "prompt": "/z-eval-update --check",
    "assertions": [
      "The closing guidance echoes the refusal text `Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml.` verbatim.",
      "Neither drift discovery nor the parity helper output appears because precondition handling ran first."
    ],
    "assertion_patterns": [
      "Eval System is not initialised\\. Run "
    ],
    "expected_output": "The command stops immediately and prints the prerequisite guidance asking the operator to initialise the Eval System configuration first."
  },
  {
    "id": "rediscovery-dry-run-without-mutating-approvals",
    "prompt": "/z-eval-update",
    "assertions": [
      "Stdout or closing guidance identifies rediscovery preview semantics matching the documented no-args path.",
      "User-authored eval JSON rows lacking `_meta.generated: true` and user-authored suites missing the opening generated marker stay untouched on disk throughout the dry pass."
    ],
    "assertion_patterns": [
      "_meta\\.generated: true"
    ],
    "expected_output": "The command summarizes drift in rediscovery preview mode without writing regenerated eval artefacts until approvals exist."
  },
  {
    "id": "parity-first-ci-drift-gate-exits-deterministically",
    "prompt": "/z-eval-update --check",
    "assertions": [
      "After `/z-eval-update --check`, the manifest records `pnpm exec tsx scripts/check-analyser-payload-parity.ts` parity output under the documented `parity_drift` summary field prior to branching on drift severity.",
      "The process exits with status `config.update.checkExitCodeOnCriticalDrift` when critical drift is surfaced, otherwise status zero matching the markdown contract."
    ],
    "assertion_patterns": [
      "/z-eval-update --check",
      "config\\.update\\.checkExitCodeOnCriticalDrift"
    ],
    "expected_output": "The command emits a parity report object and then classifies evaluator drift severity before exiting using the configured drift exit semantics."
  },
  {
    "id": "targeted-minimatch-restricts-reviewed-primitives",
    "prompt": "/z-eval-update --target \"command:z-eval-help\"",
    "assertions": [
      "After `/z-eval-update --target`, only manifest entries matching `command:z-eval-help` by id or POSIX path contribute to the reported drift rollup.",
      "The summary references targeted discovery sourcing from `.zoto/eval-system/config.yml` enumeration rather than widening to unrelated manifest rows."
    ],
    "assertion_patterns": [
      "/z-eval-update --target",
      "\\.zoto/eval-system/config\\.yml"
    ],
    "expected_output": "Scoped drift review narrows enumerated targets whose ids or repository paths satisfy the minimatch glob."
  },
  {
    "id": "interactive-apply-resumes-after-command-confirmations",
    "prompt": "/z-eval-update --apply",
    "follow_ups": [
      "Confirm the first proposed regeneration bundle.",
      "Defer the remaining prompts so the updater can finalize with partial writes plus preserved user artefacts."
    ],
    "assertions": [
      "After `/z-eval-update --apply`, the command emits askQuestion for each queued drift acceptance before stamping files.",
      "The updater subagent returns structured `needs_user_input` payloads that the command maps into those confirmations without emitting askQuestion from the subagent loop itself.",
      "`.zoto/eval-system/manifest.yml` records a newer `updated_at`, revised `targets[]`, and `.zoto/eval-system/manifest.history.yml` receives an appended snapshot reflecting accepted writes."
    ],
    "assertion_patterns": [
      "/z-eval-update --apply",
      "needs_user_input",
      "\\.zoto/eval-system/manifest\\.yml"
    ],
    "expected_output": "Each surfaced drift prompts through the palette, consumed answers resume the updater skill loop, generated rows refresh while guarded content stays untouched, and manifests gain a refreshed snapshot appended to history."
  },
  {
    "id": "scoped-apply-honours-minimatch-targeting",
    "prompt": "/z-eval-update --target \"skill:*\" --apply",
    "follow_ups": [
      "Approve regenerations only for dex skill targets currently showing drift."
    ],
    "assertions": [
      "Accepting dex targets inside the glob executes `runAnalyser({ invalidate: true })` equivalents per queued skill before dispatching framework or strategy helpers.",
      "Out-of-scope manifest rows omit fresh `_meta.generated: true` rows because they never entered the regeneration queue for this invocation."
    ],
    "assertion_patterns": [
      "runAnalyser\\(\\{ invalidate: true \\}\\)",
      "_meta\\.generated: true"
    ],
    "expected_output": "Targeted apply processes drifts constrained toskill ids paths covered by glob while respecting preservation gates."
  },
  {
    "id": "cached-analyser-payloads-skip-freshness",
    "prompt": "/z-eval-update --check --no-analyser",
    "assertions": [
      "stderr includes the `[CI WARNING] skipping fresh primitive analysis in CI; reusing payloads from .zoto/eval-system/cache/analyser/` banner whenever cached analyser mode is engaged as documented for automation without `--with-analyser`.",
      "Parity instrumentation still executes ahead of classify-every-target logic because `--check` mandates the prelude even when skipping fresh analysis."
    ],
    "assertion_patterns": [
      "\\[CI WARNING\\] skipping fresh primitive analysis in CI; reusing payloads from \\.zoto/eval-system/cache/analyser/",
      "--check"
    ],
    "expected_output": "CI-style drift review reuses payloads from `.zoto/eval-system/cache/analyser/` instead of spawning new analyser calls."
  },
  {
    "id": "forces-fresh-primitive-analysis-overriding-cached-ci-defaults",
    "prompt": "/z-eval-update --check --with-analyser",
    "assertions": [
      "Workload logs show refreshed `_meta.primitive_analysis` payloads rather than blindly re-reading `.zoto/eval-system/cache/analyser/` entries for drifted primitives.",
      "Parity prelude output still precedes regenerated drift classifications per the `--check` sequencing contract."
    ],
    "assertion_patterns": [
      "_meta\\.primitive_analysis",
      "--check"
    ],
    "expected_output": "Even under automation profiles that ordinarily reuse analyser payloads, rerunning analysis invalidates caches before stamping helpers execute."
  },
  {
    "id": "regeneration-honours-generated-versus-author-guardrails",
    "prompt": "/z-eval-update --apply",
    "follow_ups": [
      "Reject overwriting the guarded user-authored case while accepting generated-only rows."
    ],
    "assertions": [
      "Helpers consult `plugins/zoto-eval-system/engine/_user-case-guards.ts` so JSON rows lacking `_meta` or declaring `_meta.generated` false persist verbatim.",
      "TypeScript,Jest,and Vitest artefacts without the mandated opening `// _meta.generated: true` comment remain untouched on disk despite apply requests."
    ],
    "assertion_patterns": [
      "plugins/zoto-eval-system/engine/_user-case-guards\\.ts",
      "// _meta\\.generated: true"
    ],
    "expected_output": "Writes touch only evaluator rows flagged generated and typescript or json tests whose first-line marker proves machine ownership."
  }
];

defineLlmEval({
  targetId: "command:z-eval-update",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
