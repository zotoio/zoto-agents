// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-workflow`.
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
    "id": "precondition-aborts-when-eval-config-is-absent",
    "prompt": "/z-eval-workflow",
    "assertions": [
      "Response includes the sentence Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.",
      "No askQuestion is emitted.",
      "No files are created or modified and no subagent or skill work is started."
    ],
    "assertion_patterns": [
      "/z-eval-init"
    ],
    "expected_output": "The run stops with the initialisation error and points the operator to `/z-eval-init` before any routing question appears."
  },
  {
    "id": "single-askquestion-lists-lifecycle-stages-in-documented-order",
    "prompt": "/z-eval-workflow",
    "assertions": [
      "Before resolution, exactly one askQuestion is emitted.",
      "The question options use ids configure, scaffold, drift-check, drift-apply, execute, judge, compare, advise, help in that order.",
      "The execute option mentions `--full` and CURSOR_API_KEY.",
      "The compare option describes supplying two run directories for `/z-eval-compare`.",
      "No manifest.yml reads mutate disk and no subagent launches occur during the probe."
    ],
    "assertion_patterns": [
      "--full",
      "/z-eval-compare"
    ],
    "expected_output": "One workflow question offers nine ordered choices that align with configure through help, with execute and compare details matching the command doc."
  },
  {
    "id": "tailored-warning-after-non-configure-pick-with-missing-manifest",
    "prompt": "/z-eval-workflow",
    "follow_ups": [
      "Choose drift-check; this checkout never produced `.zoto/eval-system/manifest.yml`."
    ],
    "assertions": [
      "Because manifest.yml is absent and drift-check is not configure or help, the opening line is bold and states `/z-eval-create` has not run yet and artefacts may be incomplete.",
      "The body contains at most four concise bullets tying drift-check to `/z-eval-update` dry-run behaviour from the README routing notes.",
      "The closing instruction quotes `/z-eval-update` without `--apply`.",
      "No filesystem writes occur and no subagents or skills are spawned."
    ],
    "assertion_patterns": [
      "/z-eval-create",
      "/z-eval-update",
      "/z-eval-update"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "roots: []\n"
        }
      ]
    },
    "expected_output": "After the drift-check answer, the reply leads with a bold reminder about missing manifest stamping, adds at most four bullets, and ends with the dry-run drift slash command."
  },
  {
    "id": "configure-pick-skips-incomplete-manifest-banner",
    "prompt": "/z-eval-workflow",
    "follow_ups": [
      "configure — interactive YAML setup only"
    ],
    "assertions": [
      "Response does not add the bold `/z-eval-create` incomplete-manifest warning when configure is selected.",
      "The reply quotes `/z-eval-configure` for interactive YAML setup.",
      "No filesystem writes happen and no subagent or skill loops start."
    ],
    "assertion_patterns": [
      "/z-eval-create",
      "/z-eval-configure"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "roots: []\n"
        }
      ]
    },
    "expected_output": "The assistant moves straight into routing guidance for `/z-eval-configure` with no bold missing-manifest preamble."
  },
  {
    "id": "drift-apply-resolution-repeats-apply-flag",
    "prompt": "/z-eval-workflow",
    "follow_ups": [
      "drift-apply to reconcile generator output"
    ],
    "assertions": [
      "Bold incomplete-manifest reminder appears before the bullets because manifest.yml is missing and drift-apply is outside configure and help.",
      "Closing text includes `/z-eval-update --apply` exactly.",
      "No repository files change and no subagents run."
    ],
    "assertion_patterns": [
      "/z-eval-update --apply"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "roots: []\n"
        }
      ]
    },
    "expected_output": "The tailored warning appears first, bullets justify drift-apply, and the operator receives `/z-eval-update --apply` to paste."
  },
  {
    "id": "compare-hand-off-with-manifest-present",
    "prompt": "/z-eval-workflow",
    "follow_ups": [
      "compare — need a cross-run verdict"
    ],
    "assertions": [
      "No bold `/z-eval-create` incomplete-manifest warning appears because manifest.yml exists.",
      "Answer includes `/z-eval-compare` together with language that the operator must supply two run directories.",
      "Bullet list length stays at four items or fewer.",
      "No filesystem updates occur and no subagents launch."
    ],
    "assertion_patterns": [
      "/z-eval-create",
      "/z-eval-compare"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "roots: []\n"
        },
        {
          "path": "workspace/.zoto/eval-system/manifest.yml",
          "content": "targets: []\n"
        }
      ]
    },
    "expected_output": "A concise bullet summary and a paste-ready `/z-eval-compare` line referencing two run folders appear without extra subagent work."
  },
  {
    "id": "execute-resolution-restates-execute-cautions",
    "prompt": "/z-eval-workflow",
    "follow_ups": [
      "execute the full harness pass"
    ],
    "assertions": [
      "Closing instruction names `/z-eval-execute` and mentions `--full`.",
      "Response reminds the operator about CURSOR_API_KEY when describing the execute stage.",
      "No files are written and no delegated subagent executes the run."
    ],
    "assertion_patterns": [
      "/z-eval-execute"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "roots: []\n"
        },
        {
          "path": "workspace/.zoto/eval-system/manifest.yml",
          "content": "targets: []\n"
        }
      ]
    },
    "expected_output": "Bullets explain execute mode and the final line gives `/z-eval-execute` including the `--full` and CURSOR_API_KEY cautions from the execute command documentation."
  },
  {
    "id": "judge-resolution-quotes-analyse-latest-run-flow",
    "prompt": "/z-eval-workflow",
    "follow_ups": [
      "judge the latest `_runs/` outputs"
    ],
    "assertions": [
      "Resolution quotes `/z-eval-judge` for analysing latest `_runs/` artefacts.",
      "Bullet list respects the four-bullet cap and cites README-aligned reasoning.",
      "No filesystem writes occur and no subagent executes the judge pass."
    ],
    "assertion_patterns": [
      "/z-eval-judge"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "roots: []\n"
        },
        {
          "path": "workspace/.zoto/eval-system/manifest.yml",
          "content": "targets: []\n"
        }
      ]
    },
    "expected_output": "Short bullets justify judge mode and the operator gets `/z-eval-judge` with no automated follow-through inside the same command."
  },
  {
    "id": "advise-resolution-highlights-pre-run-coverage-review",
    "prompt": "/z-eval-workflow",
    "follow_ups": [
      "advise — surface coverage gaps before the next harness batch"
    ],
    "assertions": [
      "Resolution names `/z-eval-advise` for coverage-gap review ahead of new eval runs.",
      "No more than four bullets appear before the slash command line.",
      "No repository writes occur and no skills or subagents are spawned from this command."
    ],
    "assertion_patterns": [
      "/z-eval-advise"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "roots: []\n"
        },
        {
          "path": "workspace/.zoto/eval-system/manifest.yml",
          "content": "targets: []\n"
        }
      ]
    },
    "expected_output": "Bullets connect advise mode to pre-run coverage checks and finish with `/z-eval-advise` for a fresh turn."
  },
  {
    "id": "help-routing-documents-optional-topic-form",
    "prompt": "/z-eval-workflow",
    "follow_ups": [
      "help — deep README topic on compare"
    ],
    "assertions": [
      "No bold `/z-eval-create` incomplete-manifest warning appears when help is selected even though manifest.yml is missing.",
      "Closing text includes `/z-eval-help` plus wording that an optional topic argument is allowed.",
      "No filesystem writes occur and no subagents start."
    ],
    "assertion_patterns": [
      "/z-eval-create",
      "/z-eval-help"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "roots: []\n"
        }
      ]
    },
    "expected_output": "The assistant explains help usage and gives `/z-eval-help` with an optional topic token for compare documentation."
  },
  {
    "id": "scaffold-path-highlights-create-command",
    "prompt": "/z-eval-workflow",
    "follow_ups": [
      "scaffold new backends and refresh the manifest"
    ],
    "assertions": [
      "Bold reminder notes `/z-eval-create` has not run yet because manifest.yml is absent.",
      "Resolution quotes `/z-eval-create` for stamping backends and the manifest.",
      "No files are mutated and no subagent executes the scaffold work."
    ],
    "assertion_patterns": [
      "/z-eval-create",
      "/z-eval-create"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "roots: []\n"
        }
      ]
    },
    "expected_output": "Bold warning precedes bullets that explain stamping needs, ending with `/z-eval-create` for the operator to run next turn."
  }
];

defineLlmCodeEval({
  targetId: "command:z-eval-workflow",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
