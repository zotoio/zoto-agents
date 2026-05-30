# Changelog

All notable changes to the Eval System plugin will be documented in this file.

## [unreleased] — eval-system v3 (self-contained host layout)

### Added

- **`src/paths.ts`** — central path resolver for eval-system host installs. Exports `resolveEvalPaths`, `loadEvalPaths`, `resultSchemaPath`, `analyserSchemaPath`, and `analyserAgentPath`.
- **Layout detection** — `legacy-root` (repo-root `evals/` + `scripts/`) vs `self-contained` (everything under `.zoto/eval-system/`). Greenfield installs default to self-contained.
- **Dogfood wiring** — `scripts/eval-orchestrate.ts`, `eval-discover.ts`, and `eval-analyse.ts` now resolve templates, cache, schema, and evalsDir via `loadEvalPaths()` instead of hard-coded `plugins/zoto-eval-system/…` strings.

### Changed

- `discovery_config` from `eval:discover` now emits resolved `evalsDir` (repo-relative) and `layout` for manifest snapshots.

### Added (Phase 2)

- **`scripts/stamp-host-layout.ts`** — copies self-contained runtime (`src/`, `templates/`, `engine/`, vendored CLI scripts, analyser agent) into `.zoto/eval-system/` and writes nested `package.json`.
- **`scripts/migrate-host-layout-v3.ts`** — moves legacy root `evals/` + `scripts/eval-*` into `.zoto/eval-system/`, strips eval pollution from root `package.json`, optional root aliases.
- **`templates/host-package/package.json`** — eval-only scripts and devDependencies for nested install.

### Changed (Phase 2)

- **`eval-stamp.ts`** — template/engine/evals paths resolved via `loadEvalPaths()`.
- **`zoto-create-evals` skill** — stamps self-contained layout instead of merging root `package.json`.
- **`templates/config.json`** — `manifestPath` / `historyPath` relative to eval home (`manifest.yml`).
- **`eval-ensure-host.ts.tmpl`** — self-contained paths under `.zoto/eval-system/`.

### Removed from Phase 2 plan

- Root `package-json-merger.ts` merge on greenfield hosts (legacy migration still strips old keys).

## [unreleased] — 2026-05-27

### BREAKING

- **All non-skill primitive evals are now stored as `.json` instead of co-located `.test.ts` files.** The Vitest JSON loader plugin (`evals/llm/_shared/vitest-json-loader.ts`) synthesises in-memory test suites from `<kind>/evals/<name>.json` at discovery time. Skills retain `skills/<name>/evals/evals.json` per the Cursor Agent Skills spec.
- **New `runner` + `parameters` case shape documented.** JSON cases may opt into TypeScript via a `runner` field pointing at a sibling `.test.ts` file whose default export implements `RunnerFn` from `evals/llm/_shared/runner-params.ts`. See the README "Eval formats" / "Advanced TS escape hatch" sections.
- **Multi-primitive scenarios convention.** Advanced flows spanning multiple primitives live under `evals/scenarios/<name>.test.ts`. `/z-eval-create` copies an underscore-excluded example via `scripts/eval-ensure-host.ts`.
- **`eval:llm` script removed.** The unified `evals/vitest.config.ts` handles static smoke, JSON evals, and scenarios in a single Vitest invocation.
- **Manifest schema enforces JSON eval paths.** `manifest.yml` `eval_files[]` entries now reference `.json` paths for non-skill primitives.
- **Migration script `scripts/eval-migrate-ts-to-json.ts`** runs idempotently for any latecomers still on the old `.test.ts` layout.

### Added

- `plugins/zoto-eval-system/templates/scenarios/_example-multi-primitive.test.ts.tmpl` — canonical multi-primitive scenario walkthrough.
- `zoto-help-evals` skill: new Q&A surface covering the runner escape hatch and the underscore-excluded scenarios convention; a new user-authored eval case (`id: 4`) asserts the help skill answers correctly when users ask "How do I write a TS eval?".

## [unreleased] — 2026-05-26

> **Superseded by the 2026-05-27 BREAKING entry above.** The statements below describe the intermediate co-located `.test.ts` layout that preceded the JSON-first migration.

### BREAKING

- **Removed `llm.strategy` and `llm.codeFramework` config fields.** The eval system now uses a single unified LLM backend; all non-skill primitives emit a co-located `<kind>/evals/<name>.test.ts` file. Skills retain `skills/<name>/evals/evals.json` per the [Cursor Agent Skills spec](https://github.com/agentskills/agentskills/blob/5d4c1fda3f786fff826c7f56b6cb3341e7f3a911/docs/skill-creation/evaluating-skills.mdx#L20). See the repo-root [`CHANGELOG.md`](../../CHANGELOG.md) for the canonical entry.
- **Cleanup engine `strategy-switch` branch removed.** Cleanup now only handles framework-switch (vitest ↔ jest for the static side).

### Changed

- **Relocated 38 stamped artefacts** to co-located paths under `plugins/<p>/{commands,agents,hooks}/evals/` and `.cursor/{commands,agents,hooks}/evals/`. User-authored content was preserved verbatim through a strict `_meta.generated === true` migration gate.
- **Renamed harness module** `evals/llm/_shared/run-code-strategy-suite.ts` → `evals/llm/_shared/run-llm-suite.ts`; renamed exported entry `defineLlmCodeEval` → `defineLlmEval` and case type `CodeStrategyCaseDefinition` → `LlmCaseDefinition`.
- **Vitest config rooted at repo root** with include glob `**/evals/*.test.ts`; the LLM-specific `evals/llm/vitest.config.ts` is removed.

### Removed

- 10 redundant `evals/llm/test_skill_*.test.ts` files (skill coverage moves entirely to `evals.json`).
- 2 static-stamped Vitest pilots for skill primitives at `evals/test_skill_skill_*.test.ts`.

## [Unreleased]

### Changed
- Renamed slash commands from `/zoto-eval-*` to `/z-eval-*`. The old `/zoto-eval-*` names have been removed.
- **LLM code-strategy template refactored to thin-file pattern.** `templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` reduced from ~240 lines to ~30 lines. The inlined `CaseDefinition` interface and the full runner loop are replaced by imports from `_shared/code-strategy-case.ts` (shared types, subtask 03) and `_shared/run-code-strategy-suite.ts` (central harness, subtask 04). Stamped test files now call `defineLlmCodeEval()` instead of duplicating the describe/it/grader dispatch. All existing template placeholders (`{{CASES_JSON}}`, `{{TARGET_ID}}`, `{{MODEL_ID}}`, etc.) are preserved; no changes required in `eval-stamp.ts` substitution logic.

### Added
- `/z-eval-start` slash command — operator-facing jump into the evaluator lifecycle; delegates to `commands/z-eval-workflow.md` after the init gate (read-only; no subagents)
- `/z-eval-jump` slash command — same read-only delegation as `/z-eval-start` for docs and runbooks that prefer a “jump” verb
- `/z-eval-operator` slash command — same read-only delegation as `/z-eval-start` for runbooks and ops-facing docs
- `/z-eval-workflow` slash command — single `askQuestion` lifecycle router to the right `/z-eval-*` command (read-only; no subagents)
- `zoto-advise-evals` skill implementing five-dimension gap taxonomy
- `/z-eval-advise` command with multi-turn askQuestion interaction

### Documentation
- Voice / positioning pass for the equal-billing site revamp — README opening voice aligned with the landing-page hero (peer billing alongside the spec-system, no single-plugin-highlight wording).

## [0.1.0] - 2026-05-03

### Added
- Initial plugin scaffold with Cursor plugin manifest
- Two eval backends:
  - Static pytest backend (`templates/static/pytest/`) — conftest, fixtures, runner script
  - LLM backend (`templates/llm/agent-sdk/`) — `@cursor/sdk`-driven runner with per-case logs, YAML results, graders (contains, regex, tool-called, llm-judge), and soft metrics (tokens, duration, verbosity, accuracy, confidence)
- Seven agents: `zoto-eval-generator`, `zoto-eval-configurer`, `zoto-eval-updater`, `zoto-eval-executor`, `zoto-eval-judge`, `zoto-eval-comparer`
- Seven commands: `/z-eval-configure`, `/z-eval-create`, `/z-eval-update`, `/z-eval-execute`, `/z-eval-judge`, `/z-eval-compare`, `/z-eval-help`
- Seven skills (each with ≥2 eval cases): configure, create, update, execute, judge, compare, help
- Diff-aware update system:
  - `_meta.generated` contract — user-authored cases are never mutated
  - Targeted mode (by file/glob) and rediscovery mode
  - `--check` mode for CI (exit 2 on critical drift)
  - Append-only `.zoto/eval-system/manifest.history.yml`
- Schemas: `config.schema.json`, `manifest.schema.json`, `result.schema.json`, `case-meta.schema.json`
- `/canvas` hand-off for cross-run comparison (skill emits structured dataset; host `/canvas` tool renders)
- Session-start hook nudging on stale runs, missing evals, detected drift
- Validation pipeline (`scripts/validate-plugin.ts`) enforcing the `_meta.generated` invariant at compile time

## [0.2.0] - eval-system v2 — 2026-05-04

### Breaking / behavioural (from-current-state migration)

Host repos should treat the items below as the migration checklist when aligning with eval-system v2:

- **Config**: New fields — `static.framework` (`pytest` \| `vitest` \| `jest`), `llm.strategy` (`code` \| `declarative`), `llm.codeFramework` (`vitest` \| `jest`, required when LLM strategy is `code`). **Analyser**: `analyser.concurrency`, `analyser.maxCallsPerInvocation` (subtask 04 guardrails). **Runs**: `runs.retention` consumed by `pnpm run eval:gc` / `eval:gc:apply`. Switching static framework or LLM strategy is not a silent edit: run `/z-eval-configure`, review the `cleanup_plan`, and confirm execution of `scripts/eval-cleanup-stale.ts`.

- **Outputs**: The monolithic `results.yml` name is retired for new runs. Per backend: `static.yml` (static framework), `llm.yml` (LLM strategy). Merged roll-up: `report.yml` (references per-backend files; includes optional `drift` from the post-run `eval:update --check` hook). Each run folder also has `.run-meta.json` (run id, frameworks, model, git ref). Legacy `results.yml` may still be read for historical snapshots only.

- **Mutual exclusion**: Static framework and LLM strategy are chosen in config and drive mutually exclusive stamping paths; flipping them requires configure + cleanup — not an in-place tweak of a single field without the cleanup flow.

- **Generated cases**: Rows/stamped files embed `_meta.primitive_analysis` with at least `source_hash`, `analyser_version`, and `summary`, aligned with subtask 04’s `AnalyserPayload` and the updater’s refresh path.

- **User-authored preservation**: Hard-coded — no opt-out. Guards live in `evals/_llm/_user-case-guards.ts` (`isGeneratedFile` for first-line marker on test sources, `isGeneratedCase` for `evals.json` rows).

- **Templates**: Bats additional templates under `templates/additional/bats/` are removed. Orphan generated assets from config or discovery changes may be grouped under cleanup reason `removed-target` (subtask 03).

### Changed

- **Help skill (`zoto-help-evals`) is now project-tailored with mandatory citations.** The skill no longer prints README sections verbatim. It anchors on the chosen section, reads the host repo's eval-system signals (`.zoto/eval-system/config.yml`, `manifest.yml`, `.env*`, `package.json` `eval*` scripts, latest `evals/_runs/<run-id>/`), and composes a paraphrased answer that cites the README inline using the `start:end:plugins/zoto-eval-system/README.md` code-reference syntax. Project-specific facts must be backed by reading the actual file (no inferred defaults). The `/z-eval-help` command and the `Help-Intent Routing` rule were updated to match. The skill still does not call `askQuestion` — the command pre-collects answers and the skill returns `needs_user_input` when missing context. Eval cases for the help skill were rewritten accordingly.
