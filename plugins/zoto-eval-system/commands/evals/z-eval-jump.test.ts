// _meta.generated: true
/**
 * LLM eval for command `z-eval-jump`.
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
    "prompt": "/z-eval-jump",
    "assertions": [
      "The refusal text repeats exactly: Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.",
      "No lifecycle-stage askQuestion appears and no Probe or Resolution output from workflow routing accompanies the refusal.",
      "Files under `.zoto/eval-system/` inside the sandbox stay unchanged aside from incidental reads—the command stops before delegated workflow steps.",
      "No guidance appears that fabricates YAML defaults beyond the precondition message."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "50ca8110fcc25fedb9a9e208cd56e5711377410ce2e2e19cc8a29158d5f1a5fb",
      "last_updated": "2026-05-26T03:21:21.641Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "50ca8110fcc25fedb9a9e208cd56e5711377410ce2e2e19cc8a29158d5f1a5fb",
        "analysed_at": "2026-05-26T03:21:21.641Z",
        "analyser_version": "2026.05.26-1",
        "summary": "/z-eval-jump repeats the documented init gate, then behaves like /z-eval-workflow: Probe notes manifest.yml without mutating it, the lifecycle router emits a single staged askQuestion aligned to the canonical stage table, Resolution names pasteable /z-eval-* invocations within four bullets anchored on README guidance, nothing writes configs or manifests, and tailoring reminds operators when scaffolding never ran.",
        "requiresInteraction": false,
        "interactionStyle": "none",
        "fixture_justifications": [
          "Supplies `/z-eval-jump` wording so testers can cite the verbatim init-gate string that must halt before delegation.",
          "Keeps delegated workflow copy present only to guard against accidental reads; precondition failure must prevent loading its Probe section."
        ]
      }
    },
    "fixtures": {
      "files": [
        {
          "path": "workspace/plugins/zoto-eval-system/commands/z-eval-jump.md",
          "from": "plugins/zoto-eval-system/commands/z-eval-jump.md"
        },
        {
          "path": "workspace/plugins/zoto-eval-system/commands/z-eval-workflow.md",
          "from": "plugins/zoto-eval-system/commands/z-eval-workflow.md"
        }
      ]
    },
    "expected_output": "Operators only see the exact init refusal telling them `/z-eval-init` is needed; no evaluator routing prompts or filesystem churn follow."
  },
  {
    "id": 2,
    "prompt": "/z-eval-jump",
    "assertions": [
      "Assistant guidance references loading `commands/z-eval-workflow.md` (monorepo or mirrored plugin wording) before describing Probe behaviour.",
      "Probe-only awareness is visible: markdown or chat copy mentions whether `.zoto/eval-system/manifest.yml` exists without asserting new manifest rows landed on disk.",
      "Exactly one askQuestion fires before edits, exposing lifecycle ids `configure`, `scaffold`, `drift-check`, `drift-apply`, `execute`, `judge`, `compare`, `advise`, `help` in that sequence with slash focuses matching `/z-eval-configure`, `/z-eval-create`, `/z-eval-update` plus `--apply` where documented, `/z-eval-execute`, `/z-eval-judge`, `/z-eval-compare` with two explicit run-folder operands printed as in workflow copy, `/z-eval-advise`, `/z-eval-help` including the optional-topic pattern from workflow copy.",
      "After answering execute, Resolution names `/z-eval-execute` verbatim, echoes `--full`, and cites the Cursor API credential caveat spelled out beside execute in workflow copy.",
      "Resolution keeps at most four short bullets grounding behaviours in [`plugins/zoto-eval-system/README.md`](plugins/zoto-eval-system/README.md) before naming the slash for the next turn.",
      "`workspace/.zoto/eval-system/config.yml` and `workspace/.zoto/eval-system/manifest.yml` stay byte-stable across scripted turns unless unrelated tooling modifies those files."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "50ca8110fcc25fedb9a9e208cd56e5711377410ce2e2e19cc8a29158d5f1a5fb",
      "last_updated": "2026-05-26T03:21:21.641Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "50ca8110fcc25fedb9a9e208cd56e5711377410ce2e2e19cc8a29158d5f1a5fb",
        "analysed_at": "2026-05-26T03:21:21.641Z",
        "analyser_version": "2026.05.26-1",
        "summary": "/z-eval-jump repeats the documented init gate, then behaves like /z-eval-workflow: Probe notes manifest.yml without mutating it, the lifecycle router emits a single staged askQuestion aligned to the canonical stage table, Resolution names pasteable /z-eval-* invocations within four bullets anchored on README guidance, nothing writes configs or manifests, and tailoring reminds operators when scaffolding never ran.",
        "requiresInteraction": false,
        "interactionStyle": "none",
        "fixture_justifications": [
          "Satisfies the precondition that `/z-eval-jump.md` documents before Probe runs.",
          "Supplies realistic manifest probes without requiring writers to mutate the manifest during routing.",
          "Anchors testers on the delegated jump command wording for read-only semantics.",
          "Embeds Probe + Lifecycle router + Resolution text that `/z-eval-jump` must mirror verbatim.",
          "Gives README facts Resolution bullets must cite when summarising behaviours."
        ]
      }
    },
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "from": ".zoto/eval-system/config.yml"
        },
        {
          "path": "workspace/.zoto/eval-system/manifest.yml",
          "from": ".zoto/eval-system/manifest.yml"
        },
        {
          "path": "workspace/plugins/zoto-eval-system/commands/z-eval-jump.md",
          "from": "plugins/zoto-eval-system/commands/z-eval-jump.md"
        },
        {
          "path": "workspace/plugins/zoto-eval-system/commands/z-eval-workflow.md",
          "from": "plugins/zoto-eval-system/commands/z-eval-workflow.md"
        },
        {
          "path": "workspace/plugins/zoto-eval-system/README.md",
          "from": "plugins/zoto-eval-system/README.md"
        }
      ]
    },
    "expected_output": "Configured workspace: assistant reads delegation instructions, observes manifest presence narratively, issues the ordered lifecycle router askQuestion covering every evaluator slash, resolves execute with pasted `/z-eval-execute --full`, warning about Cursor API credential needs, cites README-aligned bullets only, leaves tracked fixtures untouched.",
    "follow_ups": [
      "Use the execute lifecycle stage—I need `--full` coverage and guidance about the authenticated runner caveat mentioned beside execute."
    ]
  },
  {
    "id": 3,
    "prompt": "/z-eval-jump",
    "assertions": [
      "When this sandbox omits `workspace/.zoto/eval-system/manifest.yml`, the routed reply opens with bold copy warning `/z-eval-create` never stamped evals so downstream artefacts remain incomplete.",
      "The clarification appears before urging `/z-eval-update` behaviour so operators see the tailoring clause ahead of staged guidance.",
      "Routing still honours read-only Probe rules: no fabricated manifest arrives on disk as part of the exchange."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "50ca8110fcc25fedb9a9e208cd56e5711377410ce2e2e19cc8a29158d5f1a5fb",
      "last_updated": "2026-05-26T03:21:21.641Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "50ca8110fcc25fedb9a9e208cd56e5711377410ce2e2e19cc8a29158d5f1a5fb",
        "analysed_at": "2026-05-26T03:21:21.641Z",
        "analyser_version": "2026.05.26-1",
        "summary": "/z-eval-jump repeats the documented init gate, then behaves like /z-eval-workflow: Probe notes manifest.yml without mutating it, the lifecycle router emits a single staged askQuestion aligned to the canonical stage table, Resolution names pasteable /z-eval-* invocations within four bullets anchored on README guidance, nothing writes configs or manifests, and tailoring reminds operators when scaffolding never ran.",
        "requiresInteraction": false,
        "interactionStyle": "none",
        "fixture_justifications": [
          "Keeps the init gate satisfied so delegation runs while manifest probing can truthfully observe absence.",
          "Provides authoritative `/z-eval-jump.md` wording on read-only constraints.",
          "Embeds tailoring rules from delegated workflow prose.",
          "Ensures summaries stay README-grounded despite missing manifest artefacts."
        ]
      }
    },
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "from": ".zoto/eval-system/config.yml"
        },
        {
          "path": "workspace/plugins/zoto-eval-system/commands/z-eval-jump.md",
          "from": "plugins/zoto-eval-system/commands/z-eval-jump.md"
        },
        {
          "path": "workspace/plugins/zoto-eval-system/commands/z-eval-workflow.md",
          "from": "plugins/zoto-eval-system/commands/z-eval-workflow.md"
        },
        {
          "path": "workspace/plugins/zoto-eval-system/README.md",
          "from": "plugins/zoto-eval-system/README.md"
        }
      ]
    },
    "expected_output": "Dry-run stance: assistants acknowledge missing manifest scaffolding, prepend bold `/z-eval-create` reminder tailored to drift-check selections, cite `/z-eval-update` drift guidance read-only.",
    "follow_ups": [
      "Select drift-check—I only want `/z-eval-update` dry-run coverage right now."
    ]
  }
] as unknown as LlmCaseDefinition[];

defineLlmEval({
  targetId: "command:z-eval-jump",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
