# Changelog

All notable changes to the Spec System plugin will be documented in this file.

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
