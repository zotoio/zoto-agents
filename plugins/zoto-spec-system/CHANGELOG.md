# Changelog

All notable changes to the Spec System plugin will be documented in this file.

## [unreleased] — 2026-05-26

### Changed

- **Eval restructure cross-impact.** Three Spec System eval artefacts were relocated to the co-located layout introduced by the eval-system single-backend migration: `plugins/zoto-spec-system/commands/evals/z-spec-*.test.ts` and `plugins/zoto-spec-system/agents/evals/zoto-spec-*.test.ts`. The Spec System plugin's source MD files are unchanged; only the eval test paths moved. See the repo-root [`CHANGELOG.md`](../../CHANGELOG.md) for the canonical BREAKING entry.

## [Unreleased]

### Fixed
- Local Spec System installs now copy the runtime `scripts/` and `src/` directories so live-status CLIs referenced by the installed plugin are present.

### Changed
- **`/z-spec-create`** — Enforces the `zoto-create-spec` requirement gate before `{specsDir}/` writes (host-led minimum clarifiers or generator `needs_user_input` + resume); mandates spawning **`zoto-spec-generator`** with a reasoning-class model ladder (Opus/thinking slugs).
- **`zoto-spec-generator`** — Default model moved to **`claude-opus-4-7-thinking-xhigh`**; judge spawn aligned with skill (**after** user approval, not before).
- Renamed slash commands from `/zoto-spec-*` to `/z-spec-*`. The old `/zoto-spec-*` names have been removed.

### Documentation
- Voice / positioning pass for the equal-billing site revamp — README opening voice aligned with the landing-page hero (peer billing alongside the eval-system, no single-plugin-highlight wording).

## [0.7.0] - 2026-05-06

### Added

- Per-subtask **`status/*.status.{md,yml}`** pairs with schema-backed HTML markers and the **`spec-status-roundtrip`** helper (`heartbeat`, `md-from-yml`, `yml-from-md`, `validate`).
- **`spec-aggregator`** CLI with **`--once`**, **`--watch`**, and **`--validate-only`** modes rolling subtask YAML into spec-root **`status.{md,yml}`**.
- **`spec-spawn-prefix`** CLI so executor prompts resolve **`subagents.*`** budgets without importing loader internals.
- **`subagents.*`** and **`aggregator.*`** blocks in **`templates/schema/config.schema.json`** plus companion **`spec-status`** / **`subtask-status`** schemas.

### Changed

- Config loader is **mtime-aware** so **`/z-spec-execute`** can reload **`aggregator.*`**, **`spec.parallelLimit`**, **`subagents.*`** keys during a run while **`hooks.*`**, **`extensions.*`**, paths, and **`unitOfWork`** stay fresh-invocation-only.
- **`/z-spec-execute`** backgrounds **`spec-aggregator --watch`** for the lifetime of a spec that ships **`status/`** (legacy specs without that folder skip aggregation wiring).

### Documentation

- README **Live Status & No-Restart Configuration**, refreshed **`docs/config-schema.md`**, extended **`docs/status-schema.md`**, **`docs/aggregator.md`** cross-links, **`docs/example-config.yml`**, integration rule (`plugins/zoto-spec-system/rules/zoto-spec-system.mdc`), repo **`AGENTS.md`** guidance, and **`.cursor/rules/zoto-plugin-conventions.mdc`** workspace-local config convention.

## [0.6.0] - 2026-04-05

### Changed
- Renamed all "plan" identifiers to "spec" terminology throughout the plugin
  - Skills: `zoto-create-plan` → `zoto-create-spec`, `zoto-execute-plan` → `zoto-execute-spec`, `zoto-judge-plan` → `zoto-judge-spec`
  - Commands: `/zoto-plan` → `/z-spec-create`, `/zoto-execute` → `/z-spec-execute`, `/zoto-judge` → `/z-spec-judge`
  - Agent: `zoto-spec-planner` → `zoto-spec-generator`
  - Config: `plansDir` → `specsDir`, default directory `plans` → `specs`
  - Artifact pattern: `plan-[feature]-[date].md` → `spec-[feature]-[date].md`

### Added
- `zoto-spec-executor` agent — dedicated execution coordinator that spawns subagents for each subtask, tracks progress through dependency phases, coordinates adversarial verification, and produces execution reports

## [0.5.0] - 2026-04-04

### Changed
- Migrated to TypeScript pnpm monorepo (`zoto-agents`)
- Converted all Python scripts and tests to TypeScript
- Test suite now uses vitest instead of pytest
- Hook script (`zoto-session-start`) rewritten in TypeScript, compiled to ESM JS via tsup
- Dev scripts (`install-local`, `uninstall-local`, `validate-plugin`) rewritten in TypeScript, run via tsx

## [0.4.0] - 2026-04-04

### Added
- `.gitignore` with Python, IDE, OS, and eval workspace exclusions
- Skill evaluation test cases (`evals/evals.json`) for all three skills following [agentskills.io eval format](https://agentskills.io/skill-creation/evaluating-skills)
- `scripts/install-local.py` — local plugin installation for development and testing
- `scripts/uninstall-local.py` — removes locally-installed plugin and deregisters from config
- `scripts/validate-plugin.py` — standalone pre-submission validation (manifest, structure, naming, cross-references, evals, content integrity)

## [0.3.0] - 2026-04-04

### Changed
- Replaced Bats test suite with pytest (`tests/test_plugin.py`); removed `test-plugin.bats` and `run-tests.sh`
- Plugin is now Python-only — no bash or shell scripts remain

## [0.2.0] - 2026-04-04

### Added
- `zoto-spec-judge` agent — dedicated adversarial verifier and independent quality gate
- Judge agent used for `/zoto-judge` assessments and adversarial verification during `/zoto-execute`
- Background subagent support for judge verifications during plan execution

### Changed
- `/zoto-judge` now spawns `zoto-spec-judge` instead of `zoto-spec-planner` for independent assessments
- `/zoto-execute` adversarial verification uses `zoto-spec-judge` instead of generic `generalPurpose` agent
- `zoto-spec-planner` available subagents table now includes `zoto-spec-judge`

## [0.1.0] - 2026-04-04

### Added
- Plugin scaffold with `.cursor-plugin/plugin.json` manifest
- `zoto-spec-planner` agent with plan, judge, and execute modes
- `zoto-create-plan` skill for guided plan creation
- `zoto-judge-plan` skill for independent assessment with 6-dimension scoring
- `zoto-execute-plan` skill for phased execution with adversarial verification
- `/zoto-plan`, `/zoto-judge`, `/zoto-execute` commands
- `zoto-spec-system.mdc` integration rule
- Session start hook with configurable nudge threshold
- Configuration schema with `unitOfWork`, `plansDir`, `workDir` support
- Memory extension guide for future integration
