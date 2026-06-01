# Subtask 01 — eval-dual-host-layout — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 01 |
| feature | eval-dual-host-layout |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-06-01T04:34:28.200Z |
| last_heartbeat | 2026-06-01T04:36:44.292Z |
| completed_at | 2026-06-01T04:36:44.292Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — New exported function `resolvePluginRoot(repoRoot?: string): string` in `plugins/zoto-eval-system/src/paths.ts` (`plugins/zoto-eval-system/src/paths.ts`)
- [x] **D02** — Precedence chain implemented and documented: (1) monorepo `plugins/zoto-eval-system/` when present relative to repo root, (2) `ZOTO_EVAL_PLUGIN_ROOT` env override, (3) Cursor plugin install dir (`~/.cursor/plugins/…/zoto-eval-system/` — glob for marketplace versions) (`plugins/zoto-eval-system/src/paths.ts`)
- [x] **D03** — Validation: function throws with actionable error if no resolution succeeds (`plugins/zoto-eval-system/src/paths.test.ts`)
- [x] **D04** — Existing `resolvePluginRuntimeRoot()` refactored to delegate to new `resolvePluginRoot()` for the `legacy-root` / non-self-contained case (`plugins/zoto-eval-system/src/paths.ts`)
- [x] **D05** — `EvalPaths` interface updated: add `pluginRootAbs` field pointing to resolved plugin root (`plugins/zoto-eval-system/src/paths.ts`)
- [x] **D06** — Unit tests for all three precedence levels (mock filesystem) (`plugins/zoto-eval-system/src/paths.test.ts`)
- [x] **D07** — JSDoc with precedence documentation (`plugins/zoto-eval-system/src/paths.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/src/paths.ts` — resolvePluginRoot and pluginRootAbs
- **modified** `plugins/zoto-eval-system/src/paths.test.ts` — precedence and layout tests
- **modified** `plugins/zoto-eval-system/src/config-loader.ts` — export resolvePluginRoot
- **modified** `plugins/zoto-eval-system/vitest.config.ts` — include src tests
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
