# Test inventory — `scripts/__tests__/` relocation (2026-06-01)

Aligns with **KD-9**. Existing plugin tests: `plugins/zoto-eval-system/tests/` (7513 lines total across 5 files).

## `scripts/__tests__/` (5300 lines total)

| File | Lines | Primary subject | Relocate to plugin? | Notes |
|------|------:|-----------------|---------------------|-------|
| `eval-update-guards.test.ts` | 839 | `engine/update.ts`, `_user-case-guards` | **Yes** | Imports `../../plugins/zoto-eval-system/engine/...` and `../../scripts/eval-analyse.ts` → update to `../engine/`, `../scripts/` |
| `eval-stamp-json-first.test.ts` | 614 | `eval-stamp.ts`, `eval-analyse.ts`, engine | **Yes** | Imports `../eval-stamp.ts`, dynamic import `engine/update.ts` |
| `eval-relocate-migration.test.ts` | 734 | `eval-relocate-migration.ts` (root-only) | **No (stay root)** | Tests monorepo migration script per spec non-goal |
| `eval-orchestrate.test.ts` | 581 | `eval-orchestrate.ts`, `eval-gc.ts` | **Yes** | Moves with orchestrator |
| `eval-stamp-jest.selftest.ts` | 695 | `eval-stamp.ts` templates | **Yes** | Selftest for jest stamping |
| `eval-cleanup-stale.test.ts` | 497 | `eval-cleanup-stale.ts` | **Yes** | KD-7 script |
| `eval-stamp-routing.test.ts` | 382 | `eval-stamp.ts` routing | **Yes** | — |
| `eval-stamp-pytest.smoke.ts` | 336 | `eval-stamp.ts` pytest path | **Yes** | Smoke, not `*.test.ts` suffix |
| `vitest-backend.selftest.ts` | 522 | static vitest templates | **Yes** | Template paths under plugin |
| `analyser-payload-schema.test.ts` | 100 | schema JSON | **Yes** | Fixture path `plugins/zoto-eval-system/templates/schema/...` |

### Relocation summary

| Destination | Count | Files |
|-------------|------:|-------|
| `plugins/zoto-eval-system/tests/` | **9** | All except `eval-relocate-migration.test.ts` |
| Stay `scripts/__tests__/` | **1** | `eval-relocate-migration.test.ts` |

Also relocate with host scripts (subtask 06):

- `scripts/eval-migrate-ts-to-json.test.ts` (583 lines, co-located with migration script) — **optional stay root** with migration script; spec allows root-only tests for root-only tools.

## Plugin tests already present (no move)

| File | Lines | Coverage |
|------|------:|----------|
| `plugin.test.ts` | 1243 | Plugin integration |
| `engine-runner-update-spec04.test.ts` | 490 | Engine runner/update |
| `compare-merger.test.ts` | 189 | Compare merger |
| `validate-enriched-runner.test.ts` | 225 | Runner validation |
| `declarative-validate-enriched-interactions.test.ts` | 66 | Declarative interactions |

## `evals/llm/_shared/` tests (import path, not relocation)

| File | Lines | Imports root scripts |
|------|------:|----------------------|
| `zoto-create-plugin-suite.test.ts` | — | `../../../scripts/eval-analyse.ts` |
| `zoto-create-plugin-suite.ts` | — | `eval-analyse`, `eval-stamp` |

Retarget in subtask 05/06 alongside script move — not part of `scripts/__tests__/` tree.

## Vitest / jest config impact (subtask 06)

After move, update:

- Any `vitest`/`jest` config that globs `scripts/__tests__/**`
- `package.json` test scripts if they pin `scripts/__tests__`
- Import paths from `../eval-*` to plugin-relative paths

## Tests referencing `plugins/zoto-eval-system` from `scripts/__tests__`

| File | Pattern |
|------|---------|
| `eval-update-guards.test.ts` | `../../plugins/zoto-eval-system/engine/...` |
| `eval-stamp-json-first.test.ts` | `../../plugins/zoto-eval-system/engine/update.ts` (spawn path) |
| `eval-stamp-pytest.smoke.ts`, `eval-stamp-jest.selftest.ts`, `vitest-backend.selftest.ts` | String paths to `plugins/zoto-eval-system/templates/...` |
| `eval-relocate-migration.test.ts` | Many `plugins/zoto-eval-system/...` string fixtures (stays at root) |
| `eval-stamp-routing.test.ts`, `eval-cleanup-stale.test.ts` | Template/plugin path strings |

Post-consolidation, plugin tests should prefer paths relative to `plugins/zoto-eval-system/` root, not `../../plugins/...` from `scripts/`.
