# Subtask 02 — spec-system-live-status — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 02 |
| feature | spec-system-live-status |
| assigned_agent | crux-platform-architect |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T08:02:51.030Z |
| last_heartbeat | 2026-05-06T08:03:50.886Z |
| completed_at | 2026-05-06T08:03:50.886Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-spec-system/templates/schema/subtask-status.schema.json` (draft-07) — required fields: (`plugins/zoto-spec-system/templates/schema/subtask-status.schema.json`)
- [x] **D02** — `plugins/zoto-spec-system/templates/schema/spec-status.schema.json` (draft-07) — required fields: (`plugins/zoto-spec-system/templates/schema/spec-status.schema.json`)
- [x] **D03** — `plugins/zoto-spec-system/templates/schema/config.schema.json` — **new file** (today there is no schema for `.zoto/spec-system/config.yml`; only a free-text doc). Mirror the eval-system style and include: (`plugins/zoto-spec-system/templates/schema/config.schema.json`)
- [x] **D04** — `plugins/zoto-spec-system/docs/status-schema.md` — single canonical source describing: (`plugins/zoto-spec-system/docs/status-schema.md`)
- [x] **D05** — `plugins/zoto-spec-system/templates/status/subtask-status.md.tmpl` — markdown template with all block markers in place and `{{placeholder}}` slots so subtask 05 can stamp it (`plugins/zoto-spec-system/templates/status/subtask-status.md.tmpl`)
- [x] **D06** — `plugins/zoto-spec-system/templates/status/subtask-status.yml.tmpl` — yml template mirroring the md template's marker set (`plugins/zoto-spec-system/templates/status/subtask-status.yml.tmpl`)
- [x] **D07** — `plugins/zoto-spec-system/templates/status/spec-status.md.tmpl` and `.yml.tmpl` — same for the spec-root aggregate (subtask 07 stamps these) (`plugins/zoto-spec-system/templates/status/spec-status.md.tmpl`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-spec-system/templates/schema/subtask-status.schema.json` — draft-07 subtask status schema
- **created** `plugins/zoto-spec-system/templates/schema/spec-status.schema.json` — draft-07 spec aggregate schema
- **created** `plugins/zoto-spec-system/templates/schema/config.schema.json` — Zoto Spec System config schema
- **created** `plugins/zoto-spec-system/docs/status-schema.md` — block markers and round-trip documentation
- **created** `plugins/zoto-spec-system/templates/status/subtask-status.md.tmpl` — subtask status md template
- **created** `plugins/zoto-spec-system/templates/status/subtask-status.yml.tmpl` — subtask status yml template
- **created** `plugins/zoto-spec-system/templates/status/spec-status.md.tmpl` — spec aggregate md template
- **created** `plugins/zoto-spec-system/templates/status/spec-status.yml.tmpl` — spec aggregate yml template
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
