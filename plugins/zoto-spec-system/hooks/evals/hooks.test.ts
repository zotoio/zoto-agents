// _meta.generated: true
/**
 * LLM eval for hook `zoto-spec-system`.
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
    "prompt": "Cursor executes the registered Spec System `sessionStart` hook bundle right after attaching this workspace so `node hooks/zoto-session-start.mjs` consumes stdin and probes the backlog.",
    "assertions": [
      "The `hooks/zoto-session-start.mjs` process completes with exit status 0 for the staged repository root.",
      "The final stdout line parses as JSON and either equals `{}` or defines a string `additional_context` message that interpolates the detected backlog count and references `/z-spec-create` per the default template contract.",
      "No `askQuestion` exchange is issued by this hook binary; success is limited to stdin consumption, filesystem reads, JSON on stdout, and the zero exit code."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "ad7bc4133e8e7b86a533ac56848c2e9cb28766817a0022a092fdc607693d855c",
      "last_updated": "2026-05-26T03:26:10.417Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "ad7bc4133e8e7b86a533ac56848c2e9cb28766817a0022a092fdc607693d855c",
        "analysed_at": "2026-05-26T03:26:10.417Z",
        "analyser_version": "2026.05.26-1",
        "summary": "`sessionStart` runs `hooks/zoto-session-start.mjs` so Cursor can remind operators when backlog folders spike, while `stop` runs `hooks/zoto-onstop-check.mjs` to reconcile authoritative YAML status with rendered Markdown, validate configuration, and return structured hook JSON summaries.",
        "requiresInteraction": false,
        "interactionStyle": "none",
        "fixture_justifications": [
          "Provides Spec System YAML with a deliberate low threshold so backlog counting resolves without relying on an operator-checked-in host tree.",
          "Creates the first child directory counted under `workDir` toward the scripted backlog heuristic.",
          "Creates the second child directory aggregated by the subdirectory counter before the finale.",
          "Creates the third child directory whose presence makes the subdirectory total surpass `hooks.sessionStartNudge.threshold`, forcing the scripted nudge text."
        ]
      }
    },
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "unitOfWork: spec\nworkDir: specs/current\nhooks:\n  sessionStartNudge:\n    enabled: true\n    threshold: 2\n"
        },
        {
          "path": "workspace/specs/current/wip-queue-one/keep.txt",
          "content": "\n"
        },
        {
          "path": "workspace/specs/current/wip-queue-two/keep.txt",
          "content": "\n"
        },
        {
          "path": "workspace/specs/current/wip-queue-three/keep.txt",
          "content": "\n"
        }
      ]
    },
    "expected_output": "The hook exits cleanly and emits one JSON envelope on stdout ending with newline, either `{}` when no nudge fires or `{ \"additional_context\": \"...\" }` when folders push past the backlog threshold referenced in `.zoto/spec-system/config.yml`."
  },
  {
    "id": 2,
    "prompt": "Cursor fires the bundled `stop` hook after terminating the IDE turn sequence so `node hooks/zoto-onstop-check.mjs` inspects tracked spec directories beneath `specs/`.",
    "assertions": [
      "Stdout ends with newline-terminated JSON that `JSON.parse` accepts unchanged, honoring the Cursor supplemental-context contract emitted by programmatic hooks.",
      "The emitted JSON includes prose beginning with \"Spec System onStop check:\" describing at least one automatic repair referencing `rerendered_md_from_yml` for the orphaned markdown twin path.",
      "The stop hook behaves as a headless Node subprocess: stderr may carry diagnostic chatter from validation, stdout carries the structured JSON envelope, and no `askQuestion` prompt is mediated through this lifecycle script."
    ],
    "_meta": {
      "generated": true,
      "source_hash": "ad7bc4133e8e7b86a533ac56848c2e9cb28766817a0022a092fdc607693d855c",
      "last_updated": "2026-05-26T03:26:10.417Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "ad7bc4133e8e7b86a533ac56848c2e9cb28766817a0022a092fdc607693d855c",
        "analysed_at": "2026-05-26T03:26:10.417Z",
        "analyser_version": "2026.05.26-1",
        "summary": "`sessionStart` runs `hooks/zoto-session-start.mjs` so Cursor can remind operators when backlog folders spike, while `stop` runs `hooks/zoto-onstop-check.mjs` to reconcile authoritative YAML status with rendered Markdown, validate configuration, and return structured hook JSON summaries.",
        "requiresInteraction": false,
        "interactionStyle": "none",
        "fixture_justifications": [
          "Leaves a schema-valid YAML subtask status artefact inside `specs/*/status/` without its companion `.status.md`, compelling the hook to auto-render Markdown instead of emitting `{}`."
        ]
      }
    },
    "fixtures": {
      "files": [
        {
          "path": "workspace/specs/active-run/status/subtask-01-scope.status.yml",
          "content": "schema_version: 1\nsubtask_id: \"01\"\nfeature: backlog-hygiene\nassigned_agent: generalPurpose\nmodel: composer-2.5\ntoken_budget: 180000\nstate: pending\nchecklist:\n  - id: D01\n    text: Ship documented behaviour\n    done: false\n    evidence_path: null\nartifacts: []\nerrors: []\nnotes: \"\"\nextra: {}\n"
        }
      ]
    },
    "expected_output": "The subprocess finishes with exit code 0 while printing JSON whose `additional_context` block narrates regenerated markdown or outstanding validation bullets when problems remain, adhering to Cursor hook envelope expectations."
  }
] as unknown as LlmCaseDefinition[];

defineLlmEval({
  targetId: "hook:zoto-spec-system",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
