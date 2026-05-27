// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-create`.
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
    "id": "preflight-blocks-without-config",
    "prompt": "/z-eval-create",
    "assertions": [
      "When `.zoto/eval-system/config.yml` is absent at the repository root, assistant-visible text repeats verbatim Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.",
      "Assistant-visible narration does not run through configure hand-offs or checklist prompts before refusal; precondition ordering dominates so no askQuestion batch precedes spawning `zoto-eval-generator`.",
      "No assistant-visible claim updates `.zoto/eval-system/manifest.yml`, `manifest.history.yml`, stamped eval JSON beneath plugin or `.cursor/eval/` trees, or repository `.env.example` edits while that refusal fires."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml",
      "zoto-eval-generator",
      "\\.zoto/eval-system/manifest\\.yml"
    ],
    "expected_output": "The chat stops with only the mandated initialisation refusal and makes no scaffolding, manifest stamping, dual-backend authoring, hygiene file, or gate claims."
  },
  {
    "id": "dual-backends-manifest-and-gates-with-default-checklists",
    "prompt": "/z-eval-create",
    "follow_ups": [
      "Approve every surfaced default across the skill, command (`plugins/*/commands/*.md` plus `.cursor/commands/*.md`), agent (`plugins/*/agents/*.md` plus `.cursor/agents/*.md`), and hook bundles (workspace hook manifests mapping to consolidated `hook:cursor` when applicable).",
      "Paste `USER_EVAL_CHECKLISTS.md` at the workspace root recounting those four approvals for future reviewers once scaffolding claims success."
    ],
    "assertions": [
      "After `/z-eval-create`, the interaction emitted askQuestion before delegating toward `zoto-eval-generator`, surfacing disjoint lists for discovered skills, plugin plus workspace Markdown commands and agents, plus hook inventories consistent with inventories from running `pnpm run eval:discover`.",
      "Delegation text references `zoto-eval-generator` using the `zoto-create-evals` skill with the persisted approval lists for downstream stamping.",
      "Newly routed eval rows authored through this pass expose `_meta.generated: true`.",
      "Approved skills expose `evals/evals.json` beneath each sanctioned skill folder, while sanctioned commands/agents/hooks receive stamped paths under matching `plugins/<plugin>/evals/{commands,agents,hooks}/` shards or mirrored `.cursor/evals/{commands,agents,hooks}/` locations for workspace-hosted Markdown primitives.",
      "The repository root honours `scripts/ensure-host-env-and-gitignore.ts`: if `.env.example` was missing it mirrors `templates/env/.env.example.tmpl`, `.gitignore` gains `.env` without duplicate lines already present, and `.env` is never authored.",
      "`package.json` shows merged harness scripts/devDependencies mentioning `dotenv`, and closing guidance insists on running the host package-manager install afterward.",
      "`.zoto/eval-system/manifest.yml` inventories every sanctioned target alongside an appended `.zoto/eval-system/manifest.history.yml` scaffold record.",
      "Closure cites successful `pnpm run eval:list`, `pnpm run eval -- --collect-only`, and `pnpm run eval:update --check` validations."
    ],
    "assertion_patterns": [
      "/z-eval-create",
      "zoto-eval-generator",
      "_meta\\.generated: true",
      "evals/evals\\.json",
      "scripts/ensure-host-env-and-gitignore\\.ts",
      "package\\.json",
      "\\.zoto/eval-system/manifest\\.yml",
      "pnpm run eval:list"
    ],
    "expected_output": "Checklists funnel into the generator-backed dual-backend authoring pass, yielding stamped rows, refreshed manifests plus history entry, hygienic `.env.example` coverage with `.gitignore` guarding `.env`, merged runner scripts mentioning `dotenv`, and cited passing eval:list pytest collect-only plus update drift checks after install guidance."
  },
  {
    "id": "command-owned-resume-after-generator-pause",
    "prompt": "/z-eval-create",
    "follow_ups": [
      "Approve only the narrowly chosen skill/command/agent/hook tiles so scaffolding briefly emits structured clarifications labelled `needs_user_input`.",
      "When that pause appears in chat, reply through guided askQuestion fields so scaffolding can finish cleanly."
    ],
    "assertions": [
      "Structured `needs_user_input` payloads from `zoto-eval-generator` routed through assistant-visible askQuestion follow-ups rather than terminating silently.",
      "After answers feed back into delegated work, `.zoto/eval-system/manifest.yml` records only checklist-approved primitives and scaffolding closes without dangling `needs_user_input` blockers surfaced in-chat."
    ],
    "assertion_patterns": [
      "needs_user_input",
      "\\.zoto/eval-system/manifest\\.yml"
    ],
    "expected_output": "The command chains additional askQuestion turns until generator blockers dissolve, manifests reflect the tightened approvals, and no unresolved structured pause persists in the transcript."
  }
];

defineLlmEval({
  targetId: "command:z-eval-create",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
