# Changelog

All notable changes to the Eval System plugin will be documented in this file.

## [Unreleased]

### Changed
- Renamed slash commands from `/zoto-eval-*` to `/z-eval-*`. The old `/zoto-eval-*` names have been removed.

### Added
- `zoto-eval-adviser` agent for interactive eval coverage gap analysis
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
