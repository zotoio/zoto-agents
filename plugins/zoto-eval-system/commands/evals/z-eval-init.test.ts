// _meta.generated: true
/**
 * LLM eval for command `z-eval-init`.
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
    "prompt": "/z-eval-init",
    "assertions": [
      "`workspace/.zoto/eval-system/config.yml` exists after the run",
      "`workspace/.zoto/eval-system/config.yml` matches `plugins/zoto-eval-system/templates/init-config.yml` byte-for-byte",
      "Printed output includes an absolute path that ends with `.zoto/eval-system/config.yml`",
      "Printed output states that every supported key ships commented so behaviour matches implicit defaults until lines are uncommented",
      "Printed output references `plugins/zoto-eval-system/templates/schema/config.schema.json`",
      "Printed output recommends `/z-eval-configure` for guided setup while making clear this command stops at scaffolding",
      "No automatic narration claims `/z-eval-configure`, `/z-eval-start`, `/z-eval-create`, `/z-eval-execute`, `/z-eval-judge`, `/z-eval-update`, `/z-eval-compare`, `/z-eval-advise`, `/z-eval-help`, `/z-eval-workflow`, `/z-eval-jump`, or `/z-eval-operator` ran"
    ],
    "_meta": {
      "generated": true,
      "source_hash": "2a4e81796eda20050f7bcf76d57bb8e797301fa58064378c5eb9ee36719582c2",
      "last_updated": "2026-05-26T03:19:43.352Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "2a4e81796eda20050f7bcf76d57bb8e797301fa58064378c5eb9ee36719582c2",
        "analysed_at": "2026-05-26T03:19:43.352Z",
        "analyser_version": "2026.05.26-1",
        "summary": "`/z-eval-init` materialises `.zoto/eval-system/config.yml` from `plugins/zoto-eval-system/templates/init-config.yml`, blocks silent overwrites unless `--force` is passed, prints the mandated confirmation with schema and `/z-eval-configure` pointers, and surfaces precise errors for missing templates or filesystem denials without invoking other Eval System commands.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "The command exits successfully, writes `workspace/.zoto/eval-system/config.yml`, and prints one confirmation line that cites the file path, explains defaults stay commented, points to `plugins/zoto-eval-system/templates/schema/config.schema.json`, and suggests `/z-eval-configure` without launching it."
  },
  {
    "id": 2,
    "prompt": "/z-eval-init",
    "assertions": [
      "Exit status is non-zero",
      "Printed or emitted guidance includes the exact sentence `.zoto/eval-system/config.yml already exists; pass --force to overwrite`",
      "`workspace/.zoto/eval-system/config.yml` still contains `# eval-system prior-state marker` unchanged",
      "No fresh copy of `plugins/zoto-eval-system/templates/init-config.yml` replaces the seeded content"
    ],
    "_meta": {
      "generated": true,
      "source_hash": "2a4e81796eda20050f7bcf76d57bb8e797301fa58064378c5eb9ee36719582c2",
      "last_updated": "2026-05-26T03:19:43.352Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "2a4e81796eda20050f7bcf76d57bb8e797301fa58064378c5eb9ee36719582c2",
        "analysed_at": "2026-05-26T03:19:43.352Z",
        "analyser_version": "2026.05.26-1",
        "summary": "`/z-eval-init` materialises `.zoto/eval-system/config.yml` from `plugins/zoto-eval-system/templates/init-config.yml`, blocks silent overwrites unless `--force` is passed, prints the mandated confirmation with schema and `/z-eval-configure` pointers, and surfaces precise errors for missing templates or filesystem denials without invoking other Eval System commands.",
        "requiresInteraction": false,
        "interactionStyle": "none",
        "fixture_justifications": [
          "Seeds a pre-existing `.zoto/eval-system/config.yml` so the idempotent abort path can be observed without mutating a real developer checkout."
        ]
      }
    },
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "# eval-system prior-state marker\nprior_state: true\n"
        }
      ]
    },
    "expected_output": "The command exits non-zero, emits `.zoto/eval-system/config.yml already exists; pass --force to overwrite`, and leaves the seeded bytes untouched."
  },
  {
    "id": 3,
    "prompt": "/z-eval-init --force",
    "assertions": [
      "Exit status is zero",
      "`workspace/.zoto/eval-system/config.yml` matches `plugins/zoto-eval-system/templates/init-config.yml` byte-for-byte",
      "`# customised eval overrides` no longer appears in `workspace/.zoto/eval-system/config.yml`",
      "Printed output again lists the absolute path, reiterates the commented-default guidance, cites `plugins/zoto-eval-system/templates/schema/config.schema.json`, and mentions `/z-eval-configure` without claiming it executed",
      "Printed output does not announce any other Eval System command beyond this scaffolding step"
    ],
    "_meta": {
      "generated": true,
      "source_hash": "2a4e81796eda20050f7bcf76d57bb8e797301fa58064378c5eb9ee36719582c2",
      "last_updated": "2026-05-26T03:19:43.352Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "2a4e81796eda20050f7bcf76d57bb8e797301fa58064378c5eb9ee36719582c2",
        "analysed_at": "2026-05-26T03:19:43.352Z",
        "analyser_version": "2026.05.26-1",
        "summary": "`/z-eval-init` materialises `.zoto/eval-system/config.yml` from `plugins/zoto-eval-system/templates/init-config.yml`, blocks silent overwrites unless `--force` is passed, prints the mandated confirmation with schema and `/z-eval-configure` pointers, and surfaces precise errors for missing templates or filesystem denials without invoking other Eval System commands.",
        "requiresInteraction": false,
        "interactionStyle": "none",
        "fixture_justifications": [
          "Provides a distinct pre-existing `config.yml` so `--force` must demonstrably rewrite the file instead of short-circuiting."
        ]
      }
    },
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "# customised eval overrides\ncustom: true\n"
        }
      ]
    },
    "expected_output": "The command exits zero, overwrites the fixture with the packaged init template, and repeats the full confirmation requirements about paths, commented defaults, schema reference, and `/z-eval-configure`."
  },
  {
    "id": 4,
    "prompt": "/z-eval-init",
    "assertions": [
      "When `plugins/zoto-eval-system/templates/init-config.yml` cannot be read from the installed plugin directory, stderr or stdout states `templates/init-config.yml not found at` followed by the concrete path that was probed",
      "No synthetic `.zoto/eval-system/config.yml` is written as a fallback while the template is missing"
    ],
    "_meta": {
      "generated": true,
      "source_hash": "2a4e81796eda20050f7bcf76d57bb8e797301fa58064378c5eb9ee36719582c2",
      "last_updated": "2026-05-26T03:19:43.352Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "2a4e81796eda20050f7bcf76d57bb8e797301fa58064378c5eb9ee36719582c2",
        "analysed_at": "2026-05-26T03:19:43.352Z",
        "analyser_version": "2026.05.26-1",
        "summary": "`/z-eval-init` materialises `.zoto/eval-system/config.yml` from `plugins/zoto-eval-system/templates/init-config.yml`, blocks silent overwrites unless `--force` is passed, prints the mandated confirmation with schema and `/z-eval-configure` pointers, and surfaces precise errors for missing templates or filesystem denials without invoking other Eval System commands.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "When the plugin template cannot be read, the command aborts before writing `config.yml` and prints `templates/init-config.yml not found at` with the probed path instead of fabricating a substitute file."
  },
  {
    "id": 5,
    "prompt": "/z-eval-init",
    "assertions": [
      "If creating `workspace/.zoto/eval-system` or writing `workspace/.zoto/eval-system/config.yml` fails because of `EACCES`, `EPERM`, or an equivalent permission failure, the operator-visible error text matches the underlying system message",
      "After such a failure, no silent follow-up write succeeds without a new invocation"
    ],
    "_meta": {
      "generated": true,
      "source_hash": "2a4e81796eda20050f7bcf76d57bb8e797301fa58064378c5eb9ee36719582c2",
      "last_updated": "2026-05-26T03:19:43.352Z",
      "generated_by": "zoto-create-evals",
      "primitive_analysis": {
        "source_hash": "2a4e81796eda20050f7bcf76d57bb8e797301fa58064378c5eb9ee36719582c2",
        "analysed_at": "2026-05-26T03:19:43.352Z",
        "analyser_version": "2026.05.26-1",
        "summary": "`/z-eval-init` materialises `.zoto/eval-system/config.yml` from `plugins/zoto-eval-system/templates/init-config.yml`, blocks silent overwrites unless `--force` is passed, prints the mandated confirmation with schema and `/z-eval-configure` pointers, and surfaces precise errors for missing templates or filesystem denials without invoking other Eval System commands.",
        "requiresInteraction": false,
        "interactionStyle": "none"
      }
    },
    "expected_output": "If directory creation or writing the config file fails with a permission error, the command stops and surfaces the operating-system error text without masking it or retrying silently."
  }
] as unknown as LlmCaseDefinition[];

defineLlmEval({
  targetId: "command:z-eval-init",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
