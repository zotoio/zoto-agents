// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-eval-generator`.
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
    "id": "generate-mode-stamps-dual-backends-plus-checklist-artefacts",
    "prompt": "I just finished `/z-eval-create` with approvals for every surfaced skill plus all plugin commands, agents, and hook bundles, and evaluation config is already under `.zoto/eval-system/config.yml`. Please drive discovery, stamp the static test harness and the LLM runner, run the host env and gitignore helper, merge the eval package scripts, refresh `manifest.yml` with an append-only `manifest.history.yml` entry, run the eval:list, collect-only, and eval:update check validations, and close with what I should run locally for devDependencies.",
    "assertions": [
      "`pnpm run eval:discover` ran before any stamping so approval lists reconcile with on-disk primitives.",
      "Closing output documents both the static vitest layout and the LLM code-strategy harness under the configured `evalsDir`.",
      "Every newly stamped eval entry includes `_meta.generated: true`, a 64-character hex `source_hash`, an ISO-8601 `last_updated`, and `generated_by` set to `zoto-create-evals`.",
      "The final report embeds JSON from `pnpm exec tsx` on `scripts/ensure-host-env-and-gitignore.ts`, including whether `.gitignore` was created, appended, or left unchanged, and whether `.env.example` was skipped because it already existed.",
      "`pnpm run eval:list`, `pnpm run eval -- --collect-only`, and `pnpm run eval:update --check` each finish with exit status 0 right after scaffolding.",
      "`USER_EVAL_CHECKLISTS.md` exists because `manualChecklists.enabled` is true in this workspace configuration.",
      "`.zoto/eval-system/manifest.yml` lists each approved primitive with its eval artefact paths, and `.zoto/eval-system/manifest.history.yml` gains a new tail entry without rewriting earlier history snapshots.",
      "The agent returned structured `needs_user_input` only when prerequisites were genuinely absent; whenever work proceeds, responses avoid askQuestion emissions from the subagent loop per the escalation contract."
    ],
    "assertion_patterns": [
      "pnpm run eval:discover",
      "evalsDir",
      "_meta\\.generated: true",
      "pnpm exec tsx",
      "pnpm run eval:list",
      "USER_EVAL_CHECKLISTS\\.md",
      "\\.zoto/eval-system/manifest\\.yml",
      "needs_user_input"
    ],
    "fixtures": {
      "files": [
        {
          "path": ".zoto/eval-system/config.yml",
          "content": "evalsDir: evals\nskillsRoots:\n  - skills\ndiscoveryTargets:\n  - skill\n  - command\n  - agent\n  - hook\nstatic:\n  framework: vitest\nllm:\n  strategy: code\n  codeFramework: vitest\n  model:\n    id: composer-2.5\njudgeModel: opus-4.6\nmanualChecklists:\n  enabled: true\n"
        }
      ]
    },
    "expected_output": "Manifest and history record the approved targets, both backends and checklist artefacts land on disk, generated rows carry the documented `_meta` markers, validation commands exit cleanly, and the closing narrative quotes the ensure-host-env JSON plus gitignore actions without mutating paths outside the documented eval layout."
  },
  {
    "id": "unreadable-evaluation-config-escalates-configure-hand-off",
    "prompt": "This disposable workspace overlay shipped an empty `.zoto/eval-system/config.yml` before I routed you straight from scaffolding automation—halt generate mode immediately and spell out exactly what `/z-eval-configure` must capture before stamping resumes; do not start discovery while configuration is unreadable.",
    "assertions": [
      "Returned payload is structured `needs_user_input` that names rerunning `/z-eval-configure` (or echoes equivalent prerequisite guidance) rather than scaffolding files.",
      "No discovery, manifest writes, or eval stamping commands executed because configuration could not be loaded.",
      "Responses respect the escalation contract against askQuestion despite blocking on missing operative configuration keys."
    ],
    "assertion_patterns": [
      "needs_user_input"
    ],
    "fixtures": {
      "files": [
        {
          "path": ".zoto/eval-system/config.yml",
          "content": ""
        }
      ]
    },
    "expected_output": "The assistant answers with structured `needs_user_input` referencing `/z-eval-configure`, without attempting discovery or stamping and without emitting askQuestion for configuration fields inside the delegation loop."
  },
  {
    "id": "handset-eval-rows-persist-without-overwriting",
    "prompt": "`/z-eval-create` already narrowed which skills and hook bundles matter; rerun generate mode inside this repo snapshot and preserve the handset coverage already sitting in `skills/retained-handset/evals/evals.json`. Only extend that file if you append freshly generated neighbours—never rewrite rows marked `_meta.generated: false`.",
    "assertions": [
      "Post-run filesystem comparison shows `skills/retained-handset/evals/evals.json` retains the handset entry content from before regeneration for id 9001, including `_meta.generated: false`.",
      "Any appended generated neighbours still carry `_meta.generated: true` with fresh `source_hash` and timestamps per the scaffolding contract.",
      "`.zoto/eval-system/manifest.yml` records the handset eval path alongside any newly scaffolded artefacts without stripping prior handset references.",
      "The agent complied with needs_user_input-only escalation whenever anything essential was unclear, never substituting configuration questions via askQuestion from the delegated loop."
    ],
    "assertion_patterns": [
      "skills/retained-handset/evals/evals\\.json",
      "_meta\\.generated: true",
      "\\.zoto/eval-system/manifest\\.yml"
    ],
    "fixtures": {
      "files": [
        {
          "path": "skills/retained-handset/evals/evals.json",
          "content": "{\n  \"skill_name\": \"retained-handset\",\n  \"evals\": [\n    {\n      \"id\": 9001,\n      \"prompt\": \"Operator-maintained regression guard\",\n      \"expected_output\": \"Hand-tuned behavioural notes stay authoritative.\",\n      \"assertions\": [\n        \"Operator-maintained behavioural notes remain authoritative\"\n      ],\n      \"_meta\": {\n        \"generated\": false\n      }\n    }\n  ]\n}\n"
        }
      ]
    },
    "expected_output": "The handset regression row survives untouched while any new neighbouring cases honour `_meta.generated: true`; manifests update to cover new targets yet the delegated agent never swaps to inline askQuestion for configuration gaps."
  }
];

defineLlmEval({
  targetId: "agent:zoto-eval-generator",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
