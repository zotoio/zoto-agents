# Changelog

All notable changes to the Spec System plugin will be documented in this file.

## Unreleased

### Changed
- Spec creation and execution guidance now optimizes end-to-end runtime through critical-path planning, balanced subtask sizing, slot-filling execution, focused verification, and `composer-2` preference.

## [0.6.0] - 2026-04-05

### Changed
- Renamed all "plan" identifiers to "spec" terminology throughout the plugin
  - Skills: `zoto-create-plan` → `zoto-create-spec`, `zoto-execute-plan` → `zoto-execute-spec`, `zoto-judge-plan` → `zoto-judge-spec`
  - Commands: `/zoto-plan` → `/zoto-spec-create`, `/zoto-execute` → `/zoto-spec-execute`, `/zoto-judge` → `/zoto-spec-judge`
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
