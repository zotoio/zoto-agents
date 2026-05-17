// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-start`.
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
    "id": "init-gate-satisfied-lifecycle-menu-matches-workflow-router",
    "prompt": "/z-eval-start",
    "assertions": [
      "After `/z-eval-start`, the assistant emits exactly one askQuestion whose ordered options preserve the workflow table ids and implied slash targets, matching what `/z-eval-workflow` would surface for the same repo state.",
      "The Probe outcome is visible in the reply or routing context: `.zoto/eval-system/manifest.yml` is treated as absent without writing that path or altering `.zoto/eval-system/config.yml`.",
      "The transcript shows no Task or subagent spawn and no skill load for routing; behaviour stays confined to the command and delegated workflow text.",
      "No askQuestion appears before the init gate when `.zoto/eval-system/config.yml` is present."
    ],
    "assertion_patterns": [
      "/z-eval-start",
      "\\.zoto/eval-system/manifest\\.yml",
      "\\.zoto/eval-system/config\\.yml"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/plugins/zoto-eval-system/commands/z-eval-start.md",
          "from": "plugins/zoto-eval-system/commands/z-eval-start.md"
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
    "expected_output": "One askQuestion lists the lifecycle stages with stable ids configure, scaffold, drift-check, drift-apply, execute, judge, compare, advise, help in that order, the execute option reminds operators about --full and CURSOR_API_KEY as required by z-eval-workflow, and the assistant records that manifest.yml is missing without creating or editing it."
  },
  {
    "id": "resolution-after-compare-choice-names-slash-handoff",
    "prompt": "/z-eval-start",
    "follow_ups": [
      "I am at the comparison step—take the compare branch and tell me the exact next slash to paste."
    ],
    "assertions": [
      "After `/z-eval-start` and the operator selecting the compare stage, the Resolution section yields no more than four bullets and each bullet references behaviours described in `plugins/zoto-eval-system/README.md`.",
      "The closing line names `/z-eval-compare` with the two-run placeholder pattern from z-eval-workflow and does not silently run compare in-process or touch `manifest.yml` or `config.yml`.",
      "No subagent or skill invocation appears while resolving the compare hand-off."
    ],
    "assertion_patterns": [
      "/z-eval-start",
      "/z-eval-compare"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/plugins/zoto-eval-system/commands/z-eval-start.md",
          "from": "plugins/zoto-eval-system/commands/z-eval-start.md"
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
    "expected_output": "The follow-up applies Resolution: at most four short bullets tied to README behaviours, then gives the verbatim `/z-eval-compare <r1> <r2>` invocation pattern plus the `/canvas`-oriented cross-run review the workflow promises, without performing writes or spawning workers."
  },
  {
    "id": "manifest-absent-execute-follow-up-prepends-create-warning",
    "prompt": "/z-eval-start",
    "follow_ups": [
      "Run the eval suite now; I am choosing the execute branch rather than configure or help."
    ],
    "assertions": [
      "After `/z-eval-start`, when `.zoto/eval-system/manifest.yml` is absent and the operator pursues execute (not configure or help), the assistant prepends or inserts the required bold one-liner about `/z-eval-create` ahead of execute guidance.",
      "The named next slash includes `/z-eval-execute` and repeats the `--full` plus `CURSOR_API_KEY` warning from the execute row of the router table.",
      "Filesystem writes do not occur: no new manifest, no config rewrite, and no automated eval execution inside the command turn."
    ],
    "assertion_patterns": [
      "/z-eval-start",
      "/z-eval-execute"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/plugins/zoto-eval-system/commands/z-eval-start.md",
          "from": "plugins/zoto-eval-system/commands/z-eval-start.md"
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
    "expected_output": "Because manifest.yml is still missing, the reply leading into or following the execute choice includes the bold reminder that `/z-eval-create` has not run and artefacts may be incomplete, then names `/z-eval-execute` with the --full and CURSOR_API_KEY caveat, all without writing files or delegating to a subagent."
  },
  {
    "id": "missing-config-stops-before-workflow-delegation",
    "prompt": "/z-eval-start",
    "assertions": [
      "When `.zoto/eval-system/config.yml` is missing at the repository root, the first assistant message after `/z-eval-start` matches the documented Eval System is not initialised text that references `/z-eval-init` and creating `.zoto/eval-system/config.yml`, with no synthesized default config.",
      "No askQuestion, Task spawn, or skill load runs after the failed precondition, so z-eval-workflow sections are not exercised in that turn.",
      "No manifest or config file is created or edited while refusing the command."
    ],
    "assertion_patterns": [
      "\\.zoto/eval-system/config\\.yml"
    ],
    "expected_output": "The only user-visible outcome is the exact init gate refusal that tells the operator Eval System is not initialised and to run `/z-eval-init` first; there is no lifecycle askQuestion, no workflow probe output, and no delegated routing."
  }
];

defineLlmCodeEval({
  targetId: "command:z-eval-start",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
