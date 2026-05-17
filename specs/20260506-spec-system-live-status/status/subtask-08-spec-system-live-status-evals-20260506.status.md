# Subtask 08 — spec-system-live-status — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 08 |
| feature | spec-system-live-status |
| assigned_agent | crux-software-engineer |
| model | composer-2-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T08:58:23.703Z |
| last_heartbeat | 2026-05-06T09:11:45.309Z |
| completed_at | 2026-05-06T09:09:12.294Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-spec-system/tests/integration/no-restart-token-budget.test.ts`: (`plugins/zoto-spec-system/tests/integration/no-restart-token-budget.test.ts`)
- [x] **D02** — `plugins/zoto-spec-system/tests/integration/status-pair-roundtrip.test.ts`: (`plugins/zoto-spec-system/tests/integration/status-pair-roundtrip.test.ts`)
- [x] **D03** — `plugins/zoto-spec-system/tests/integration/aggregator-blocker-surfacing.test.ts`: (`plugins/zoto-spec-system/tests/integration/aggregator-blocker-surfacing.test.ts`)
- [x] **D04** — `plugins/zoto-spec-system/tests/integration/schema-validation.test.ts`: (`plugins/zoto-spec-system/tests/integration/schema-validation.test.ts`)
- [x] **D05** — `plugins/zoto-spec-system/tests/integration/heartbeat-completion-guard.test.ts`: (`plugins/zoto-spec-system/tests/integration/heartbeat-completion-guard.test.ts`)
- [x] **D06** — `plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json` — append two cases (do not delete existing cases): (`plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json`)
- [x] **D07** — `plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json` — extend the new case from subtask 05 with an additional assertion: `Each scaffolded .status.yml validates against subtask-status.schema.json`. Do **not** add a separate case here — keep the existing one richer. (`plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json`)
- [x] **D08** — `plugins/zoto-spec-system/package.json` — add a new script `"test:integration": "vitest run tests/integration"` so the integration tests can run in isolation from unit tests. (`plugins/zoto-spec-system/package.json`)
- [x] **D09** — `plugins/zoto-spec-system/package.json` — extend the existing `"test"` script (currently `vitest run`) to cover both unit suites under `src/`, `scripts/`, and `tests/` plus the new integration suite. Confirm the eval system still picks up the right test files. (`plugins/zoto-spec-system/package.json`)
- [x] **D10** — No new runtime deps. Dev deps may be added if strictly required (e.g. `tmp` for temp-dir helpers); prefer Node's built-in `node:fs.mkdtempSync` first. (`plugins/zoto-spec-system/package.json`)
- [x] **D11** — If subtask 06 introduced a placeholder eval case under `plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json`, leave it alone — this subtask only **adds** to it. Removing existing cases is out of scope. (`plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-spec-system/tests/integration/no-restart-token-budget.test.ts` — integration-test-for-live-config-reload
- **created** `plugins/zoto-spec-system/tests/integration/status-pair-roundtrip.test.ts` — roundtrip-and-md-edit-back-to-yml
- **created** `plugins/zoto-spec-system/tests/integration/aggregator-blocker-surfacing.test.ts` — blocker-surfacing-via-aggregateOnce
- **created** `plugins/zoto-spec-system/tests/integration/schema-validation.test.ts` — schema-validation-and-empty-defaults
- **modified** `plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json` — appended-no-restart-budget-prompt-and-aggregator-surfaces-blocker-cases
- **modified** `plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json` — added-scaffolded-status-yml-schema-validation-assertion
- **created** `plugins/zoto-spec-system/tests/integration/heartbeat-completion-guard.test.ts` — heartbeat-completion-guard-integration
- **created** `plugins/zoto-spec-system/tests/integration/fixtures/status-pair-roundtrip.fixture.yml` — roundtrip-fixture-yml
- **modified** `plugins/zoto-spec-system/src/spawn-prompt.ts` — spawnPromptBudgetLead-helper
- **modified** `plugins/zoto-spec-system/src/spawn-prompt.test.ts` — budget-lead-assertions
- **modified** `plugins/zoto-spec-system/package.json` — test-and-integration-scripts
- **modified** `plugins/zoto-spec-system/scripts/spec-aggregator.test.ts` — watch-smoke-polling
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
All deliverables D01–D11 complete.

Test results (run from repo root):
- `pnpm --filter @zoto-agents/zoto-spec-system test`  → 12 files / 86 tests passed.
- `pnpm --filter @zoto-agents/zoto-spec-system test:integration` → 5 files / 17 tests passed.
- `pnpm --filter @zoto-agents/zoto-spec-system validate` → 52/52 passed.

D11: Verified `evals.json` for `zoto-execute-spec` retains all original cases
(ids 1, 2, 3) and has been **extended** with two new cases (ids 4 = `no-restart-budget-prompt`,
5 = `aggregator-surfaces-blocker`). Cases use `regex` / `contains` graders only —
no `llm-judge`. The `zoto-create-spec` evals retain all four cases; case 4 was
extended in-place with the new assertion `Each scaffolded .status.yml validates
against subtask-status.schema.json`.

Migration directive honoured: integration fixtures use `<tmpdir>/.zoto/spec-system/config.yml`
(YAML, parsed via the `yaml` package); `loadConfig` from `src/config-loader.ts` is
used for live-reload; D04 validates `docs/example-config.yml`. `docs/example-config.json`
was re-created in the working tree by another concurrent agent — its presence does not
affect the YAML coverage required by this subtask. Cleanup of the stale JSON file and
related doc references is the responsibility of subtask 09 (docs sweep).

Files created:
- `tests/integration/no-restart-token-budget.test.ts`
- `tests/integration/status-pair-roundtrip.test.ts`
- `tests/integration/aggregator-blocker-surfacing.test.ts`
- `tests/integration/schema-validation.test.ts`
- `tests/integration/heartbeat-completion-guard.test.ts`
- `tests/integration/fixtures/status-pair-roundtrip.fixture.yml`

Files modified:
- `skills/zoto-execute-spec/evals/evals.json` (appended two cases)
- `skills/zoto-create-spec/evals/evals.json` (extended case 4 with one assertion)
- `package.json` (`test`, `test:integration` scripts)

<!-- status:notes:end -->
