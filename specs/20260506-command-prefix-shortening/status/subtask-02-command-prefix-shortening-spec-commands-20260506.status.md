# Subtask 02 — command-prefix-shortening — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 02 |
| feature | command-prefix-shortening |
| assigned_agent | crux-software-engineer |
| model | composer-2-fast |
| token_budget | 200000 |
| state | pending |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [ ] **D01** — Create `plugins/zoto-spec-system/commands/z-spec-create.md` — canonical command, instructions migrated verbatim from `zoto-spec-create.md` with all in-body slash references switched to the new short form (`/z-spec-execute`, `/z-spec-judge`, etc.)
- [ ] **D02** — Create `plugins/zoto-spec-system/commands/z-spec-execute.md` — canonical command, mirrored from `zoto-spec-execute.md`
- [ ] **D03** — Create `plugins/zoto-spec-system/commands/z-spec-judge.md` — canonical command, mirrored from `zoto-spec-judge.md`
- [ ] **D04** — Create `plugins/zoto-spec-system/commands/z-spec-init.md` — canonical command, mirrored from `zoto-spec-init.md`
- [ ] **D05** — Convert `plugins/zoto-spec-system/commands/zoto-spec-create.md` to a thin alias that spawns the same `zoto-spec-generator` subagent and invokes the same `zoto-create-spec` skill, passing `$ARGUMENTS` through; description must include the phrase **"alias for `/z-spec-create`"**
- [ ] **D06** — Convert `plugins/zoto-spec-system/commands/zoto-spec-execute.md` to a thin alias for `/z-spec-execute`
- [ ] **D07** — Convert `plugins/zoto-spec-system/commands/zoto-spec-judge.md` to a thin alias for `/z-spec-judge`
- [ ] **D08** — Convert `plugins/zoto-spec-system/commands/zoto-spec-init.md` to a thin alias for `/z-spec-init`
- [ ] **D09** — Each canonical file's "Related" section references the new short names (`/z-spec-*`)
- [ ] **D10** — Each alias file is < 30 lines and contains a single delegation block — no instruction duplication
- [ ] **D11** — Frontmatter `name:` matches the file basename in every case (plugin convention — `scripts/validate-template.mjs` only enforces that `name` and `description` are present and non-empty, but matching basename keeps command discovery predictable)
- [ ] **D12** — `node scripts/validate-template.mjs` passes for the spec-system plugin
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
