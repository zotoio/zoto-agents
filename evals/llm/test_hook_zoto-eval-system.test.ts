// _meta.generated: true
/**
 * LLM `code`-strategy eval for hook `zoto-eval-system`.
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
    "id": "sessionstart-with-unreadable-eval-config-prints-empty-hook-json",
    "prompt": "Cursor fires `sessionStart` for this workspace; the hook command is `node hooks/zoto-eval-session-start.mjs` with current working directory set to the sandbox workspace root, and `.zoto/eval-system/config.yml` exists but its contents are not valid YAML for `yaml.parse`.",
    "assertions": [
      "Exit status was 0 and stdout parsed as a JSON object with no keys.",
      "No interactive prompt or askQuestion channel was used because the hook is a non-interactive Node script."
    ],
    "assertion_patterns": [],
    "fixtures": {
      "files": [
        {
          "path": ".zoto/eval-system/config.yml",
          "content": "[\n"
        }
      ]
    },
    "expected_output": "The hook process exits cleanly and writes a single-line JSON object that is exactly `{}` followed by a newline, matching Cursor hook stdout expectations."
  },
  {
    "id": "sessionstart-nudges-when-a-skill-lacks-evals-json",
    "prompt": "On `sessionStart`, Cursor runs `node hooks/zoto-eval-session-start.mjs` from the workspace root after a skill folder under `skills/` contains `SKILL.md` but omits `evals/evals.json`.",
    "assertions": [
      "Exit status was 0 and stdout was valid JSON containing an `additional_context` field mentioning missing `evals.json` paths and `/z-eval-update`.",
      "The `additional_context` text enumerates the `notes-ingest` skill among the missing entries or states the correct missing count including it.",
      "No askQuestion was emitted from the hook binary because hooks must remain non-interactive."
    ],
    "assertion_patterns": [
      "additional_context",
      "additional_context"
    ],
    "fixtures": {
      "files": [
        {
          "path": ".zoto/eval-system/config.yml",
          "content": "evalsDir: evals\n"
        },
        {
          "path": "skills/notes-ingest/SKILL.md",
          "content": "# Notes ingest\n\nOperational checklist for ingestion workflows.\n"
        }
      ]
    },
    "expected_output": "Hook stdout is one JSON object whose `additional_context` string tells the operator how many skills lack `evals/evals.json`, names at least the affected skill, and points them at `/z-eval-update`."
  },
  {
    "id": "sessionstart-drift-reminder-when-manifest-exists",
    "prompt": "`sessionStart` executes `node hooks/zoto-eval-session-start.mjs` in a workspace where `.zoto/eval-system/config.yml` parses successfully, `.zoto/eval-system/manifest.yml` is present, and `.zoto/eval-system/.last-drift-check` is absent so the drift branch may run.",
    "assertions": [
      "Exit status was 0 and stdout parsed as JSON whose `additional_context` mentions `/z-eval-update` for drift checking.",
      "After the hook finishes, `.zoto/eval-system/.last-drift-check` exists under the workspace and contains a UTF-8 ISO-8601 timestamp string.",
      "No askQuestion was emitted from the hook binary."
    ],
    "assertion_patterns": [
      "additional_context",
      "\\.zoto/eval-system/\\.last-drift-check"
    ],
    "fixtures": {
      "files": [
        {
          "path": ".zoto/eval-system/config.yml",
          "content": "evalsDir: evals\n"
        },
        {
          "path": ".zoto/eval-system/manifest.yml",
          "content": "version: 1\ntargets: []\n"
        }
      ]
    },
    "expected_output": "Hook stdout includes JSON with `additional_context` advising `/z-eval-update` for drift detection, and the hook creates or refreshes `.last-drift-check` with an ISO timestamp body."
  },
  {
    "id": "sessionstart-warns-about-stale-eval-run-directories",
    "prompt": "`sessionStart` runs `node hooks/zoto-eval-session-start.mjs` after the sandbox clock and filesystem expose at least one immediate subdirectory under `evals/_runs/` whose directory modification time is at least fourteen days older than the hook invocation instant.",
    "assertions": [
      "Exit status was 0 and stdout remained valid JSON per the Cursor hooks contract even when warnings are present.",
      "When the aged-directory precondition holds, `additional_context` states the stale run count is at least one and references `/z-eval-execute`.",
      "No askQuestion was emitted from the hook binary."
    ],
    "assertion_patterns": [
      "additional_context"
    ],
    "fixtures": {
      "files": [
        {
          "path": ".zoto/eval-system/config.yml",
          "content": "evalsDir: evals\n"
        },
        {
          "path": "evals/_runs/historic-batch/run-summary.txt",
          "content": "completed_at: 2024-01-15\n"
        }
      ]
    },
    "expected_output": "Hook stdout is JSON whose `additional_context` cites how many run folders exceed the fourteen-day threshold and instructs the operator to consider `/z-eval-execute`."
  }
];

defineLlmCodeEval({
  targetId: "hook:zoto-eval-system",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
