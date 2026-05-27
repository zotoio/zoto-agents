// _meta.generated: true
/**
 * LLM eval for command `sync-plugins`.
 *
 * Stamped by `scripts/eval-stamp.ts#stampLlmTarget` from
 * `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`.
 *
 * The literal first line of this file MUST remain `// _meta.generated: true`.
 * The cleanup engine and overwrite gate both use
 * `plugins/zoto-eval-system/engine/_user-case-guards.ts#isGeneratedFile(path, { strict: true })`
 * to decide whether this file is safe to replace or delete. Edit the
 * template, not this emitted file.
 */
import { describe, it, afterAll, expect } from "vitest";

import type { LlmCaseDefinition } from "../../../evals/llm/_shared/llm-case.js";
import { defineLlmEval } from "../../../evals/llm/_shared/run-llm-suite.js";

const CASES: LlmCaseDefinition[] = [
  {
    "id": "full-sync-with-hook-stdin-protocol",
    "prompt": "/sync-plugins — realign bundled workspace plugins with my Cursor local install after I pulled teammate updates.",
    "assertions": [
      "After `/sync-plugins`, the assistant directs execution of `node .cursor/hooks/sync-plugins.mjs --full` with the workspace root as the working directory",
      "The sync invocation supplies an empty JSON object on standard input matching the hook-protocol requirement in the command instructions",
      "Once the runner finishes, the assistant lists plugin bundles that synced according to the run output or clearly states when none were reported"
    ],
    "assertion_patterns": [
      "/sync-plugins"
    ],
    "expected_output": "The assistant runs the sync script from the repository root with the full flag, feeds an empty JSON object on stdin per the hook protocol, relays which plugin directories the runner reports as synced, and tells me to reload Cursor so the copies take effect."
  },
  {
    "id": "post-sync-inventory-and-reload-guidance",
    "prompt": "/sync-plugins — push this repo's curated plugin payloads out so tooling inside Cursor sees the freshest copies.",
    "assertions": [
      "The assistant answer lists synced plugin bundles by recognizable names grounded in the workspace `plugins/` layout",
      "The assistant explicitly warns that a Cursor window reload is necessary before refreshed plugin files surface in the IDE"
    ],
    "assertion_patterns": [
      "plugins/"
    ],
    "expected_output": "The assistant shares a readable inventory of synced plugin bundles grounded in the workspace layout and closes with reload guidance so refreshed local artefacts load in the IDE."
  }
];

defineLlmEval({
  targetId: "command:sync-plugins",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
