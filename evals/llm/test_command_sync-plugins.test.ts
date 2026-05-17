// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `sync-plugins`.
 *
 * Stamped by `scripts/eval-stamp.ts#stampLlmCodeStrategy` from
 * `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`.
 *
 * The literal first line of this file MUST remain `// _meta.generated: true`.
 * Subtask 03's cleanup engine and subtask 11's overwrite gate both use
 * `evals/_llm/_user-case-guards.ts#isGeneratedFile(path, { strict: true })`
 * to decide whether this file is safe to replace or delete. Edit the
 * template, not this emitted file.
 */
import { describe, it, afterAll, expect } from "vitest";

import type { CodeStrategyCaseDefinition } from "./_shared/code-strategy-case.js";
import { defineLlmCodeEval } from "./_shared/run-code-strategy-suite.js";

const CASES: CodeStrategyCaseDefinition[] = [
  {
    "id": "palette-full-sync-relays-hook-stdin-and-summarizes-copied-plugins",
    "prompt": "/sync-plugins\n\nI tweaked `plugins/` locally — push everything Cursor needs into the IDE plugin tree and summarize what landed.",
    "assertions": [
      "after `/sync-plugins`, the assistant directs execution of `node .cursor/hooks/sync-plugins.mjs --full` with the workspace root as the working directory",
      "the assistant wires stdin so the runner receives an empty JSON object, matching the hook-protocol note in the command",
      "once the runner finishes, the assistant lists the plugin bundles that actually synced according to that run (or clearly states zero output if none were emitted)",
      "the assistant explicitly warns that a Cursor window reload is necessary before refreshed plugin files surface in the IDE"
    ],
    "assertion_patterns": [
      "/sync-plugins"
    ],
    "expected_output": "The assistant runs the documented sync runner from the repository root with the full flag, feeds an empty JSON object on stdin per the hook protocol, relays which plugin directories the runner reports as synced, and ends by telling me to reload Cursor so the copies take effect."
  },
  {
    "id": "follow-up-reinforces-stdin-contract-without-reverting-narration",
    "prompt": "/sync-plugins",
    "follow_ups": [
      "Echo the exact stdin the sync runner demanded on that last step so I can log it elsewhere."
    ],
    "assertions": [
      "after the follow-up, the assistant reiterates that stdin for `sync-plugins.mjs` remains the empty JSON object required by the hook protocol",
      "the clarification keeps the reload reminder tying refreshed plugin payloads to a Cursor reload"
    ],
    "assertion_patterns": [
      "sync-plugins\\.mjs"
    ],
    "expected_output": "The assistant summarizes the synchronized run again, restates that stdin must remain the empty JSON object from the hook contract, and keeps the Cursor reload guidance coherent across turns."
  }
];

defineLlmCodeEval({
  targetId: "command:sync-plugins",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
