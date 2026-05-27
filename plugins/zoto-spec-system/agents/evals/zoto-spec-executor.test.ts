// _meta.generated: true
/**
 * LLM eval for agent `zoto-spec-executor`.
 *
 * Generated from the legacy declarative JSON eval payload by
 * `scripts/eval-relocate-migration.ts` as part of spec
 * `20260526-eval-single-backend-colocated-restructure` (subtask 08).
 *
 * The literal first line of this file MUST remain `// _meta.generated: true`.
 * The cleanup engine and overwrite gate both use
 * `plugins/zoto-eval-system/engine/_user-case-guards.ts#isGeneratedFile(path, { strict: true })`
 * to decide whether this file is safe to replace or delete. Edit the
 * source primitive and re-run `pnpm run eval:update --apply`, not this
 * emitted file.
 */
import { describe, it, afterAll, expect } from "vitest";

import type { LlmCaseDefinition } from "../../../../evals/llm/_shared/llm-case.js";
import { defineLlmEval } from "../../../../evals/llm/_shared/run-llm-suite.js";

const CASES = [
  {
    "id": 1,
    "prompt": "Take point on executing workspace/specs/20260526-queue-hardening/ end-to-end. The dated directory already bundles the Markdown index plus subtask drafts with a readable Subtask Manifest, dependency-phase table, and mermaid TD graph guarded by %% spec-system:classes comments. Honour every manifest Subagent assignment, keep phase ordering strict, coordinate adversarial judging after each lane finishes, defer the repo-wide suites until terminal verification, lint only what each lane touched beforehand, refresh the manifest Status bullets as checkpoints land, narrate concurrency with the configured ceilings, and steer everything through the scripted execution report plus structured operator confirmations tied to manifest summary and closing report wording. Speak about the bundled work package using whichever unit-of-work label our repo config declares so the chat matches product language. Finish by treating artefacts under that folder as ephemeral coordination scaffolding rather than long-lived lore.",
    "assertions": [
      "After reading configuration, the plan references keys from `.zoto/spec-system/config.yml` such as `unitOfWork`, `specsDir`, `workDir`, `spec.maxSubtasks`, `spec.parallelLimit`, `spec.adversarialVerification`, and `extensions.memory.enabled` when deciding limits and tone.",
      "The plan explains that every aggregator poll reloads live fields such as `subagents.*.tokenBudget`, `subagents.*.model`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`, `aggregator.enabled`, and `spec.parallelLimit`, while calling out that `unitOfWork`, `specsDir`, `workDir`, `hooks.*`, and `extensions.*` edits require restarting the owning executor invocation.",
      "Before each live subtask spawn once `status/` exists, the narration shows `pnpm exec tsx plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts --role` covering `generator | executor | judge | subtask` together with `--status-yml` and `--status-md` pointers, then pipes the emitted prefix so the delegated agent opens with **Token budget: N** verbatim and records **N** into its YAML status bookkeeping.",
      "The plan shells out `pnpm exec tsx plugins/zoto-spec-system/scripts/spec-aggregator.ts --watch --spec-dir --repo-root` from the repository root once the subtree contains `status/`, tracks its PID explicitly, asserts the watcher only reads `status/*.status.yml`, and confines digest writes to the spec-root `status.md` + `status.yml` pair.",
      "The plan describes parallel fan-out bounded by `spec.parallelLimit`, only launching a subtask once every dependency enumerated in both the dependency graph and phases is finished, capturing progress back into the index rows after each milestone.",
      "The plan repeats that executing subagents must lean on TodoWrite-like task tracking plus tick Deliverables/Done checklists straight inside each Markdown subtask, never swapping the manifest Subagent label for convenience.",
      "It schedules a freshly spawned `zoto-spec-judge` pass after each subtask finishes, cites `extra.judge` storage for verdict and `fix_list`, promises background scheduling when realistic, forbids executor-authored fixes despite non-empty verdicts, insists reroutes go back through the manifest’s original agent type until a successor judge validates the lane, and when `spec.adversarialVerification` stays true insists every lane still earns that audit.",
      "It instructs subtask agents to rely on narrowly scoped suites during parallel phases yet explicitly reserves repository-scale tests plus lint reconciliation for terminal verification aligned with Execution Mode sequencing.",
      "It promises `execution-report-[feature]-[yyyymmdd].markdown` authoring inside the dated directory once downstream signals succeed.",
      "It orders `pnpm exec tsx plugins/zoto-spec-system/scripts/spec-onstop-check.ts --human --repo-root <repo-root>` ahead of congratulatory closure whenever exit codes matter, withholding celebratory summaries until stdout reports readiness.",
      "It references structured confirmations before spawning work and once more after reconciliation so operator assent precedes long-lived status flips.",
      "It clarifies that post-spawn the executor never mutates a subtask’s `.status.yml`, leaving those pairs to the spawned agents while the digest layer stays read-only.",
      "It keeps cross-links honest by pointing complex authoring back to `zoto-spec-generator` while treating `zoto-execute-spec` as the skill surface and `zoto-spec-judge` as the verification actor.",
      "It treats the mermaid dependency graph with the `%% spec-system:classes` span as mandatory presentation material when reviewing the index prior to execution."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
      "last_updated": "2026-05-26T03:26:53.006Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
        "analysed_at": "2026-05-26T03:26:53.006Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The executor coordinates dated specs by loading `.zoto/spec-system/config.yml`, running the aggregator watch loop with careful cancellation semantics, enforcing phased subagents, mandatory adversarial judging, onStop reconciliation, operator approvals, and memory-extension follow-ups tied to enabled flags.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "A concrete run plan citing the dated spec subtree, phased queueing, aggregator supervision, judiciary passes, scripted consistency checks ahead of closure, Markdown execution-report authorship, taxonomy aligned to config, and completion bookkeeping without inventing durable knowledge exports."
  },
  {
    "id": 2,
    "prompt": "Subtask 03 under workspace/specs/20260526-queue-hardening/ just finished, but the fresh `zoto-spec-judge` verdict came back Partial with a non-empty `fix_list` living under that subtask’s `.status.yml` `extra.judge` block. As execution lead, spell out how you will route corrections without touching source yourself, which agent type you re-spawn, how you hand the structured list along, and how you line up the next verification pass so reviewer agents never rewrite deliverable files or the spec Markdown.",
    "assertions": [
      "The answer names the manifest-paired subagent for Subtask 03 and states every fix routes through that same type with verbatim `fix_list` payloads plus path context.",
      "The answer orders a brand-new `zoto-spec-judge` spawn after fixes land instead of trusting the earlier reviewer instance.",
      "The answer forbids executor-authored patches or reviewer edits touching deliverables beyond `.status.yml` / `.status.md`, matching the reviewer non-interference contract."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
      "last_updated": "2026-05-26T03:26:53.006Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
        "analysed_at": "2026-05-26T03:26:53.006Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The executor coordinates dated specs by loading `.zoto/spec-system/config.yml`, running the aggregator watch loop with careful cancellation semantics, enforcing phased subagents, mandatory adversarial judging, onStop reconciliation, operator approvals, and memory-extension follow-ups tied to enabled flags.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "A remediation sequence that hands `fix_list` back to the originally assigned subagent, reuses that agent’s status pair, schedules another independent judge pass, and keeps judges read-only beyond their status surfaces."
  },
  {
    "id": 3,
    "prompt": "We need one more pass on archived material under workspace/specs/20240712-cache-rollout/, which lacks a `status/` directory entirely. Outline how execution specialist logic treats that mismatch before any subagents start.",
    "assertions": [
      "The response logs the exact warning banner `status/ directory absent — running legacy spawn path` before branching.",
      "Because the subdirectory is absent, the plan rejects starting `spec-aggregator.ts --watch` and rejects shelling `spec-spawn-prefix.ts`, clarifying delegated agents omit the Token budget preamble sourced from that helper."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
      "last_updated": "2026-05-26T03:26:53.006Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
        "analysed_at": "2026-05-26T03:26:53.006Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The executor coordinates dated specs by loading `.zoto/spec-system/config.yml`, running the aggregator watch loop with careful cancellation semantics, enforcing phased subagents, mandatory adversarial judging, onStop reconciliation, operator approvals, and memory-extension follow-ups tied to enabled flags.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "A succinct branch description warning about the absent directory, opting out of aggregator watch and spawn-prefix gymnastics, yet still marching through manifests if execution proceeds."
  },
  {
    "id": 4,
    "prompt": "During an inflight coordinator run somebody saved `.zoto/spec-system/config.yml` with a syntax breakage while the aggregator was mid-cycle. Explain what the watcher should write into the dated spec-root `status.yml` while still respecting last-known-good limits.",
    "assertions": [
      "The answer states `ConfigValidationError` handling keeps servicing with the previously valid configuration snapshot.",
      "The answer demands the ensuing digest carries an `events` entry labelled `kind: \"config_reload_failed\"` tying the breakage to aggregator telemetry."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
      "last_updated": "2026-05-26T03:26:53.006Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
        "analysed_at": "2026-05-26T03:26:53.006Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The executor coordinates dated specs by loading `.zoto/spec-system/config.yml`, running the aggregator watch loop with careful cancellation semantics, enforcing phased subagents, mandatory adversarial judging, onStop reconciliation, operator approvals, and memory-extension follow-ups tied to enabled flags.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Recognition that ingestion errors keep the prior sane settings live while stamping `events[].kind = config_reload_failed` on the next aggregate write narrative."
  },
  {
    "id": 5,
    "prompt": "An operator halted `/z-spec-execute` mid-flight while `spec-aggregator.ts --watch` was still attached to dated directory workspace/specs/20260526-queue-hardening/. Describe shutdown choreography referencing signal ordering and pacing tied to aggregator polling knobs.",
    "assertions": [
      "Shutdown begins by signaling **SIGINT** to the aggregator child process.",
      "The plan waits roughly one watcher `pollIntervalMs` window sourced from `.zoto/spec-system/config.yml` before escalating to **SIGTERM** ifneeded."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
      "last_updated": "2026-05-26T03:26:53.006Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
        "analysed_at": "2026-05-26T03:26:53.006Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The executor coordinates dated specs by loading `.zoto/spec-system/config.yml`, running the aggregator watch loop with careful cancellation semantics, enforcing phased subagents, mandatory adversarial judging, onStop reconciliation, operator approvals, and memory-extension follow-ups tied to enabled flags.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Directions that PID-targeted SIGINT arrives first, waits up to `pollIntervalMs`, then escalates SIGTERM tied to watcher configuration commentary."
  },
  {
    "id": 6,
    "prompt": "All lanes report green, yet `pnpm exec tsx plugins/zoto-spec-system/scripts/spec-onstop-check.ts --human --repo-root <repo-root>` exits 2 because YAML declares `completed` states while Markdown checklists stay open inside workspace/specs/20260526-queue-hardening/. Map your recovery steps prior to handing the polished execution narrative to the stakeholder.",
    "assertions": [
      "Closure messaging explicitly withholds Completion status flips whenever the onStop CLI still exits non-zero due to mismatched Markdown versus YAML reconciliation.",
      "The plan calls rerunning affected manifest agents until `pnpm exec tsx plugins/zoto-spec-system/scripts/spec-onstop-check.ts --human --repo-root <repo-root>` settles with exit status 0.",
      "The narration references parity between subtask YAML, spec-root rollup YAML, Markdown mirrors, and config validation because those files participate in schema reconciliation."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
      "last_updated": "2026-05-26T03:26:53.006Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
        "analysed_at": "2026-05-26T03:26:53.006Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The executor coordinates dated specs by loading `.zoto/spec-system/config.yml`, running the aggregator watch loop with careful cancellation semantics, enforcing phased subagents, mandatory adversarial judging, onStop reconciliation, operator approvals, and memory-extension follow-ups tied to enabled flags.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Remediation focused on resurfacing inconsistencies, looping affected subagents, re-running CLI until exit 0, delaying celebratory summaries accordingly."
  },
  {
    "id": 7,
    "prompt": "Assume `.zoto/spec-system/config.yml` now enables extensions.memory alongside a resolved plugin slug. Finish describing how coordination closes once execution succeeds given that integration state.",
    "assertions": [
      "When overlays mark `extensions.memory.enabled` truthy alongside a declared plugin slug, concluding guidance cites running that plugin dream/extract workflows after execution without attempting memory writes internally."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
      "last_updated": "2026-05-26T03:26:53.006Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
        "analysed_at": "2026-05-26T03:26:53.006Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The executor coordinates dated specs by loading `.zoto/spec-system/config.yml`, running the aggregator watch loop with careful cancellation semantics, enforcing phased subagents, mandatory adversarial judging, onStop reconciliation, operator approvals, and memory-extension follow-ups tied to enabled flags.",
        "requiresInteraction": false,
        "interactionStyle": "none",
        "fixture_justifications": [
          "Keeps assertions testable against the documented conditional memory follow-up whenever the YAML toggles integrations on."
        ]
      }
    },
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "unitOfWork: initiative\nspecsDir: specs\nworkDir: specs/current\nspec:\n  maxSubtasks: 99\n  parallelLimit: 4\n  adversarialVerification: true\nextensions:\n  memory:\n    enabled: true\n    plugin: crux-memory\n"
        }
      ]
    },
    "expected_output": "Brief wrap-up acknowledging optional memory-ingest chatter pointing at repo-configured tooling without implying this agent executes memory internals."
  },
  {
    "id": 8,
    "prompt": "`.zoto/spec-system/config.yml` currently keeps extensions.memory disabled. While summarising closure for workspace/specs/20260526-queue-hardening/, confirm what you tell the stakeholder about ancillary memory ingestion.",
    "assertions": [
      "Messaging explicitly skips optional memory-ingest tooling references while `extensions.memory.enabled` resolves false inside repo configuration reads."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
      "last_updated": "2026-05-26T03:26:53.006Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
        "analysed_at": "2026-05-26T03:26:53.006Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The executor coordinates dated specs by loading `.zoto/spec-system/config.yml`, running the aggregator watch loop with careful cancellation semantics, enforcing phased subagents, mandatory adversarial judging, onStop reconciliation, operator approvals, and memory-extension follow-ups tied to enabled flags.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Straightforward reassurance that coordination ends without dangling memory-ingest chatter per disabled extension policy."
  },
  {
    "id": 9,
    "prompt": "Subtask manifests now mix lanes marked `generalPurpose`, `explore`, `shell`, and `zoto-spec-judge`. Summarise when execution specialists lean on each delegated type under the Coordination playbook.",
    "assertions": [
      "Responses contrast `generalPurpose`, `explore`, `shell`, and `zoto-spec-judge` according to delegation guidance spanning implementation breadth, codebase discovery, scripted automation, versus verification-only duties."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
      "last_updated": "2026-05-26T03:26:53.006Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "0651ed96296346667a2dcc55d0c9f88d6de8b6d28844aea026d38d71d134a021",
        "analysed_at": "2026-05-26T03:26:53.006Z",
        "analyser_version": "2026.05.26-1",
        "summary": "The executor coordinates dated specs by loading `.zoto/spec-system/config.yml`, running the aggregator watch loop with careful cancellation semantics, enforcing phased subagents, mandatory adversarial judging, onStop reconciliation, operator approvals, and memory-extension follow-ups tied to enabled flags.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "Contrast table-like prose mapping domain coding, codebase discovery, scripted ops, versus adversarial verifying without inventing phantom agent families."
  }
] as unknown as LlmCaseDefinition[];

defineLlmEval({
  targetId: "agent:zoto-spec-executor",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
