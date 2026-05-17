// _meta.generated: true
/**
 * LLM `code`-strategy eval for skill `zoto-eval-tooling`.
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
    "id": "discover-manifest-and-resolve-one-path",
    "prompt": "Load the eval-system tooling skill. A teammate added a new primitive markdown file under the plugin tree; I need you to run repository discovery and tell me which eval target IDs that path maps to without hand-editing the manifest.",
    "assertions": [
      "After loading `zoto-eval-tooling`, the agent schedules discovery using the `pnpm run eval:discover` alias exactly as written in the skill, not by invoking a raw TypeScript entrypoint under `scripts/`.",
      "The agent states that default discovery walks `skillsRoots` and `discoveryTargets` from the loaded eval config and that emitted stdout matches the manifest YAML shape the skill documents.",
      "When resolving a single file, the agent passes `-- --resolve` plus the file path argument immediately after the `pnpm run eval:discover` token sequence so the package script forwards the flag to the underlying tool.",
      "The agent mentions exit code 0 for successful discovery output and exit code 1 when configuration is absent, matching the skill's exit-code table."
    ],
    "assertion_patterns": [
      "zoto-eval-tooling",
      "skillsRoots",
      "-- --resolve"
    ],
    "expected_output": "The assistant explains it will run `pnpm run eval:discover` (never a direct `tsx` script), uses `pnpm run eval:discover -- --resolve` with the repository-relative path of that markdown file when a single path must be mapped, and notes that success prints manifest-shaped YAML on stdout while a missing eval config yields exit code 1."
  },
  {
    "id": "analyse-primitive-and-persist-json-payload",
    "prompt": "Follow `zoto-eval-tooling`. We need an `AnalyserPayload` JSON blob for `command:z-eval-init` saved to the analyser cache before stamping; run the analyser in normal mode (not dry-run) and confirm where the cache file lands.",
    "assertions": [
      "The agent invokes analysis strictly via `pnpm run eval:analyse` and places the target id after `--` so pnpm forwards it to the script, matching the skill's argument-splitting rule.",
      "The agent states that each successful invocation validates output against `templates/schema/analyser-payload.schema.json` and writes through `@cursor/sdk` as described in the skill.",
      "The agent names `llm.model.id`, `analyser.concurrency`, `analyser.maxCallsPerInvocation`, and `ignore` as config keys that influence analyse runs, consistent with the command table.",
      "The agent correctly distinguishes exit codes 0 (success), 1 (failure), and 2 (budget exhausted) for `eval:analyse` without inventing alternate meanings.",
      "When broadening or narrowing analyser scope, the agent documents optional passthrough flags such as `--target` with a glob pattern, `--pretty`, or `--dry-run` after the initial `--` separator exactly as listed in the skill's analyse command table."
    ],
    "assertion_patterns": [
      "pnpm run eval:analyse",
      "templates/schema/analyser-payload\\.schema\\.json",
      "llm\\.model\\.id",
      "eval:analyse",
      "--target"
    ],
    "expected_output": "The assistant runs `pnpm run eval:analyse -- command:z-eval-init` (optional flags only as needed), describes JSON on stdout per target, names the `.zoto/eval-system/cache/analyser/` cache directory, and cites exit 0 on success, 1 on errors, and 2 when the analyser budget is exhausted."
  },
  {
    "id": "stamp-allowlisted-tooling-skill-only",
    "prompt": "Using the tooling skill guidance, merge the cached analyser rows into this repo's self-contained eval manifest for `skill:zoto-eval-tooling`, and explain what happens if someone tries the same stamp command against another `skill:*` target.",
    "assertions": [
      "The agent uses `pnpm run eval:stamp -- skill:zoto-eval-tooling` and explicitly ties successful tooling stamps to `plugins/zoto-eval-system/skills/zoto-eval-tooling/evals/evals.json`, matching the allowlist note in the skill.",
      "The agent acknowledges `eval:stamp` exit code 1 for missing payloads or invalid targets and exit code 2 when stamping an unapproved `skill:*`, echoing the documented exit semantics.",
      "The agent mentions `static.framework`, `llm.strategy`, `llm.codeFramework`, and `evalsDir` as configuration inputs that drive generated asset layout for non-skill stamps, as the table lists.",
      "The agent surfaces stamp-only safety switches `--dry-run` and `--baseline-only` when describing how to preview or constrain stamping, aligning with the documented args list."
    ],
    "assertion_patterns": [
      "pnpm run eval:stamp -- skill:zoto-eval-tooling",
      "eval:stamp",
      "static\\.framework",
      "--dry-run"
    ],
    "expected_output": "The assistant runs `pnpm run eval:stamp -- skill:zoto-eval-tooling`, notes stdout reports the path under `plugins/zoto-eval-system/skills/zoto-eval-tooling/evals/evals.json`, and warns that non-allowlisted `skill:*` stamps terminate with exit code 2 per `CENTRAL_STAMP_SKILL_ALLOWLIST` while commands or agents write under `{evalsDir}`."
  },
  {
    "id": "cleanup-stale-assets-after-framework-change",
    "prompt": "We switched `static.framework` in `.zoto/eval-system/config.yml`. Per the tooling skill, preview the cleanup plan JSON, then describe how check mode signals drift and how an apply would differ—without fabricating credentials.",
    "assertions": [
      "The agent routes cleanup work through `pnpm run eval:cleanup-stale` rather than bespoke shell deletes, honoring the single-alias mandate.",
      "The agent ties the command's output to the `cleanup-plan.schema.json` contract referenced in the skill when describing machine-readable stdout.",
      "The agent states that the planner compares active `static.framework`, `llm.strategy`, and `llm.codeFramework` settings against the manifest snapshot, aligning with the documented config fields."
    ],
    "assertion_patterns": [
      "pnpm run eval:cleanup-stale",
      "cleanup-plan\\.schema\\.json",
      "static\\.framework"
    ],
    "expected_output": "The assistant defaults to `pnpm run eval:cleanup-stale` dry-run semantics, cites JSON `cleanup_plan` on stdout, explains `-- --check` can yield exit code 2 on drift, and notes apply requires `-- --apply` together with `--session` and `--token` values issued by the authenticated cleanup session."
  },
  {
    "id": "update-drift-detection-and-optional-apply",
    "prompt": "I need a CI-friendly check that fails when AI primitives drift. Leverage the eval update command from the tooling skill and spell out what `--check` changes versus `--apply`.",
    "assertions": [
      "The agent uses `pnpm run eval:update` exclusively via the pnpm alias and mentions passthrough flags such as `--target` with a glob pattern and `--no-analyser` exactly when discussing scoped or analyser-skipped refreshes.",
      "The agent references `update.*`, `discoveryTargets`, `skillsRoots`, and `ignore` as configuration knobs that feed `eval:update`, matching the documented table.",
      "The agent preserves the documented exit semantics: exit 0 when no critical drift is reported and exit 2 when `--check` surfaces critical drift."
    ],
    "assertion_patterns": [
      "pnpm run eval:update",
      "update\\.\\*",
      "--check"
    ],
    "expected_output": "The assistant recommends `pnpm run eval:update -- --check` for non-interactive gates, explains stdout drift reporting, notes `pnpm run eval:update -- --apply` rewrites manifests with confirmation semantics implied by the skill, and calls out exit code 2 when `--check` finds critical drift."
  },
  {
    "id": "full-eval-orchestration-and-retention-gc",
    "prompt": "Walk me through running the bundled static plus LLM eval pass and then pruning ancient `_runs` directories. Assume loadEvalConfig already resolved `.zoto/eval-system/` even if an old `.zoto-eval-system/` folder still existed historically.",
    "assertions": [
      "The agent keeps orchestration on `pnpm run eval` / `pnpm run eval:full` and never substitutes direct `tsx` invocation for the orchestrator scripts.",
      "The agent ties successful runs to writing `static.yml`, `llm.yml`, and `report.yml` beneath `{evalsDir}/_runs/` timestamped folders, echoing the skill's output contract.",
      "The agent states `eval:gc` reads `runs.retention` alongside `evalsDir` and uses exit code 0 on success, matching the gc table.",
      "The agent notes that legacy `.zoto-eval-system/` directories migrate transparently on first run, per the migration bullet, when operators worry about obsolete layouts."
    ],
    "assertion_patterns": [
      "pnpm run eval",
      "static\\.yml",
      "eval:gc",
      "\\.zoto-eval-system/"
    ],
    "expected_output": "The assistant prescribes `pnpm run eval` or `pnpm run eval:full` for orchestrated runs, mentions optional `-- --full`, `-- --llm-only`, and `-- --model` with a concrete model id, points at `{evalsDir}/_runs/` timestamped subdirectories with `static.yml`, `llm.yml`, and `report.yml`, then follows with `pnpm run eval:gc` using documented `--dry-run`, `--apply`, and `--retention` with a numeric cap plus JSON plans on stdout."
  },
  {
    "id": "global-invocation-and-failure-handling-rules",
    "prompt": "If an eval script errors, should I pass `--config` manually? Also confirm the exact separator pattern when passing nested CLI flags to `eval:analyse`.",
    "assertions": [
      "The agent forbids bypassing the `pnpm run eval:*` aliases in favor of direct `pnpm exec tsx scripts/` commands, citing invocation rule 1.",
      "The agent demonstrates argument forwarding with `--` (e.g., `pnpm run eval:analyse -- command:z-eval-init`) whenever nested flags or target ids must reach the script, citing invocation rule 2.",
      "The agent explicitly states config loading through `loadEvalConfig` needs no `--config` flag, citing invocation rule 3.",
      "The agent instructs operators to treat non-zero exits as failure and to inspect stderr for structured JSON error payloads when available, citing invocation rule 5."
    ],
    "assertion_patterns": [
      "pnpm run eval:\\*",
      "--",
      "loadEvalConfig"
    ],
    "expected_output": "The assistant refuses ad-hoc `pnpm exec tsx` calls against a concrete file under `scripts/`, reaffirms automatic loading via `loadEvalConfig` without `--config`, demonstrates `pnpm run eval:analyse -- command:z-eval-init`-style `--` forwarding, and explains that non-zero exits require parsing stderr for JSON objects containing string `error` and `code` fields when present."
  }
];

defineLlmCodeEval({
  targetId: "skill:zoto-eval-tooling",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
