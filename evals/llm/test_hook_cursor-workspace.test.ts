// _meta.generated: true
/**
 * LLM `code`-strategy eval for hook `cursor-workspace`.
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
    "id": "sessionstart-full-sync-plus-crux-session-banner",
    "prompt": "Cursor raised sessionStart immediately after this workspace attached. Using `.cursor/hooks.json`, treat that lifecycle moment as already fired and confirm the two `sessionStart` hook commands both completed successfully.",
    "assertions": [
      "After sessionStart, `node .cursor/hooks/sync-plugins.mjs --full` completed with exit status 0.",
      "After sessionStart, `python3 .cursor/hooks/crux-session-start.py` completed with exit status 0.",
      "No askQuestion or other interactive prompt was emitted from either sessionStart hook binary."
    ],
    "assertion_patterns": [
      "node \\.cursor/hooks/sync-plugins\\.mjs --full",
      "python3 \\.cursor/hooks/crux-session-start\\.py"
    ],
    "expected_output": "A concise confirmation that the full plugin sync ran first, then the CRUX session-start helper ran, with both finishing without errors and without asking the operator questions."
  },
  {
    "id": "afterfileedit-incremental-sync-and-crux-detectors",
    "prompt": "Assume Cursor fired `afterFileEdit` right after saving a tracked plugin file such as `plugins/zoto-eval-system/package.json`. With `.cursor/hooks.json` as ground truth, verify every registered `afterFileEdit` command ran in order and finished cleanly.",
    "assertions": [
      "After afterFileEdit, `node .cursor/hooks/sync-plugins.mjs --incremental` completed with exit status 0.",
      "After afterFileEdit, `python3 .cursor/hooks/crux-detect-changes.py` completed with exit status 0.",
      "After afterFileEdit, `python3 .cursor/hooks/crux-detect-memory-changes.py` completed with exit status 0.",
      "No askQuestion was emitted from any afterFileEdit hook binary."
    ],
    "assertion_patterns": [
      "node \\.cursor/hooks/sync-plugins\\.mjs --incremental",
      "python3 \\.cursor/hooks/crux-detect-changes\\.py",
      "python3 \\.cursor/hooks/crux-detect-memory-changes\\.py"
    ],
    "expected_output": "Confirmation that incremental plugin sync ran, then both CRUX change detectors ran, each exiting successfully and leaving no unresolved interactive prompts."
  },
  {
    "id": "stop-phase-full-plugin-sync",
    "prompt": "Cursor emitted `stop` while closing this session. According to `.cursor/hooks.json`, the stop hook should perform another full plugin sync; check that run behaved as documented.",
    "assertions": [
      "After stop, `node .cursor/hooks/sync-plugins.mjs --full` completed with exit status 0.",
      "No askQuestion was emitted from the stop hook binary."
    ],
    "assertion_patterns": [
      "node \\.cursor/hooks/sync-plugins\\.mjs --full"
    ],
    "expected_output": "A short statement that the stop-phase full sync exited successfully and did not request operator input mid-run."
  }
];

defineLlmCodeEval({
  targetId: "hook:cursor-workspace",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
