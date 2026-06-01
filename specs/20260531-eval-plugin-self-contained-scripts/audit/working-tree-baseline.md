# Working tree baseline (2026-06-01)

Subtask 01 precondition recommends a **clean tree** or dedicated branch. This audit ran on a **dirty** working tree.

## Git context

| Field | Value |
|-------|-------|
| Branch | `feat/site-updates` |
| HEAD | `fbfecad15cca5de07f40ec150555f1b8d2fff64c` |
| Total changed paths (`git status --short`) | **53** |
| Untracked (`??`) | **1** (under spec tree / unrelated) |
| Overlap: `scripts/` | **10** modified |
| Overlap: `plugins/zoto-eval-system/` | **26** modified |
| Overlap: `evals/llm/_shared/` | **7** modified |

**Stash before subtask 02?** Recommended — overlapping paths include the exact files slated for move/delete (`eval-analyse.ts`, `eval-stamp.ts`, `engine/update.ts`, etc.). WIP may reflect in-flight consolidation work; re-baseline if those edits land before subtask 02.

## Modified files on overlap paths (snapshot)

### `scripts/` (10)

- `eval-analyse.ts`, `eval-ensure-host.ts`, `eval-relocate-migration.ts`, `eval-stamp.ts`
- `__tests__/eval-orchestrate.test.ts`, `eval-relocate-migration.test.ts`, `eval-stamp-json-first.test.ts`, `eval-stamp-routing.test.ts`, `eval-update-guards.test.ts`
- `eval-migrate-ts-to-json.test.ts` (co-located test)

### `plugins/zoto-eval-system/` (26)

Includes `engine/update.ts`, `engine/runner.ts`, `engine/sdk-bridge.ts`, `src/config-loader.ts`, skills/commands/agents docs, templates/schemas, `tests/plugin.test.ts`, README.

### `evals/llm/_shared/` (7)

- `run-llm-suite.ts`, `run-llm-suite.test.ts`, `runner-params.ts`, `sdk-bridge.ts`, `vitest-json-loader.test.ts`, `zoto-create-plugin-suite.ts`, `zoto-create-plugin-suite.test.ts`, fixture JSON

## Implications for audit artefacts

- Line counts and import greps reflect **working tree content**, not necessarily last commit on `feat/site-updates`.
- `diff` between `eval-discover` forks and `engine/update` vs `eval-update` used same dirty snapshot.
- Subtask 02 executor should either commit/stash WIP or note delta vs this baseline in their status file.

## Untracked spec work (same feature)

Untracked under `specs/20260531-eval-plugin-self-contained-scripts/` (assessment, spec, subtasks, status files) — expected for active spec execution; does not affect import graph counts.

## Audit execution constraints

- **No files modified** outside `specs/20260531-eval-plugin-self-contained-scripts/` during subtask 01 (read-only audit satisfied).
