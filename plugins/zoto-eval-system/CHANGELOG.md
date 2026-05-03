# Changelog

All notable changes to the Eval System plugin will be documented in this file.

## [0.1.0] - 2026-05-03

### Added
- Initial plugin scaffold with Cursor plugin manifest
- Two eval backends:
  - Static pytest backend (`templates/static/pytest/`) — conftest, fixtures, runner script
  - LLM backend (`templates/llm/agent-sdk/`) — `@cursor/sdk`-driven runner with per-case logs, YAML results, graders (contains, regex, tool-called, llm-judge), and soft metrics (tokens, duration, verbosity, accuracy, confidence)
- Seven agents: `zoto-eval-generator`, `zoto-eval-configurer`, `zoto-eval-updater`, `zoto-eval-executor`, `zoto-eval-judge`, `zoto-eval-comparer`
- Seven commands: `/zoto-eval-configure`, `/zoto-eval-create`, `/zoto-eval-update`, `/zoto-eval-execute`, `/zoto-eval-judge`, `/zoto-eval-compare`, `/zoto-eval-help`
- Seven skills (each with ≥2 eval cases): configure, create, update, execute, judge, compare, help
- Diff-aware update system:
  - `_meta.generated` contract — user-authored cases are never mutated
  - Targeted mode (by file/glob) and rediscovery mode
  - `--check` mode for CI (exit 2 on critical drift)
  - Append-only `.zoto-eval-system/manifest.history.yml`
- Schemas: `config.schema.json`, `manifest.schema.json`, `result.schema.json`, `case-meta.schema.json`
- `/canvas` hand-off for cross-run comparison (skill emits structured dataset; host `/canvas` tool renders)
- Session-start hook nudging on stale runs, missing evals, detected drift
- Validation pipeline (`scripts/validate-plugin.ts`) enforcing the `_meta.generated` invariant at compile time
