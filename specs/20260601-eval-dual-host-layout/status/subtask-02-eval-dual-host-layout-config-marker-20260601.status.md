# Subtask 02 — eval-dual-host-layout — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 02 |
| feature | eval-dual-host-layout |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-06-01T04:34:35.625Z |
| last_heartbeat | 2026-06-01T14:37:00.000Z |
| completed_at | 2026-06-01T04:36:03.957Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Add `hostLayout` enum (`"plugin"` | `"ejected"`) to `templates/schema/config.schema.json` with default `"plugin"`
- [x] **D02** — Add `hostLayout` field to `EvalSystemConfig` type in `plugins/zoto-eval-system/src/config-loader.ts`
- [x] **D03** — Update `templates/config.json` baseline with `hostLayout: "plugin"` default
- [x] **D04** — Update `templates/init-config.yml` template with commented `# hostLayout: plugin`
- [x] **D05** — Existing `detectLayout()` in `paths.ts` updated to consult `config.hostLayout` first, falling back to filesystem heuristics only when not set
- [x] **D06** — Update `EvalLayoutMode` type to align with new config-driven detection: `"plugin"` (lean) maps to resolving from plugin, `"ejected"` maps to self-contained
- [x] **D07** — Config validation tests pass with both values and with the field omitted (defaults to `"plugin"`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/templates/schema/config.schema.json` — hostLayout enum
- **modified** `plugins/zoto-eval-system/src/config-loader.ts` — HostLayout type and loader
- **modified** `plugins/zoto-eval-system/templates/config.json` — default hostLayout
- **modified** `plugins/zoto-eval-system/templates/init-config.yml` — commented hostLayout
- **modified** `plugins/zoto-eval-system/src/paths.ts` — config-driven detectLayout
- **modified** `plugins/zoto-eval-system/src/config-loader.test.ts` — hostLayout tests
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
