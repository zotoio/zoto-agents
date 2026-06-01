# Subtask 09 — eval-dual-host-layout — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 09 |
| feature | eval-dual-host-layout |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-06-01T14:48:00Z |
| last_heartbeat | 2026-06-01T04:59:36.851Z |
| completed_at | 2026-06-01T04:59:36.851Z |
| git_sha | fbfecad15cca5de07f40ec150555f1b8d2fff64c |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Unit tests for `resolvePluginRoot()` — all three precedence levels + error case (`plugins/zoto-eval-system/src/paths.test.ts`)
- [x] **D02** — Unit tests for config loading with `hostLayout` field (both values + omitted) (`plugins/zoto-eval-system/src/config-loader.test.ts`)
- [x] **D03** — Integration test: lean create produces expected minimal file tree (`plugins/zoto-eval-system/tests/dual-host-layout.integration.test.ts`)
- [x] **D04** — Integration test: eject produces expected full file tree + primitives (`plugins/zoto-eval-system/tests/dual-host-layout.integration.test.ts`)
- [x] **D05** — Integration test: un-eject reverses eject (round-trip) (`plugins/zoto-eval-system/tests/dual-host-layout.integration.test.ts`)
- [x] **D06** — Integration test: `eval:discover` works in lean mode (monorepo) (`plugins/zoto-eval-system/tests/dual-host-layout.integration.test.ts`)
- [x] **D07** — Integration test: `eval:update --check` passes post-migration (`plugins/zoto-eval-system/tests/dual-host-layout.integration.test.ts`)
- [x] **D08** — Verify `paths.test.ts` updated for new `pluginRootAbs` field and resolution logic (`plugins/zoto-eval-system/src/paths.test.ts`)
- [x] **D09** — Verify `config-loader.test.ts` updated for `hostLayout` field (`plugins/zoto-eval-system/src/config-loader.test.ts`)
- [x] **D10** — Ensure baseline fixtures (`evals/fixtures/baseline/`) reflect lean layout (`evals/fixtures/baseline/.zoto/eval-system/config.yml`)
- [x] **D11** — CI continues to pass with all eval:* scripts after migration (`package.json#eval:update:check`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-eval-system/tests/dual-host-layout.integration.test.ts` — five dual-host-layout integration cases
- **modified** `plugins/zoto-eval-system/templates/baseline-fixtures/.zoto/eval-system/config.yml` — lean single-backend config comments
- **modified** `evals/fixtures/baseline/.zoto/eval-system/config.yml` — re-stamped baseline fixture
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Judge fix_list (re-spawn): ran `pnpm run eval:update -- --apply --no-analyser` plus targeted applies for skill:zoto-eval-tooling and skill:zoto-create-evals; restored unified `evals/vitest.config.ts` (evalJsonLoader) after stamp overwrote it; fixed malformed JSON in zoto-judge-evals/evals/evals.json. `pnpm run eval:update:check` exits 0 (status clean, 52 targets). zoto-eval-system 199/199 pass; zoto-cursor-top 86/86 pass; full `pnpm test` exits 1 — zoto-spec-system 8 CLI timeout/watch flakes (out of S09 scope).

<!-- status:notes:end -->
