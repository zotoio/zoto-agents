# Subtask 05 — eval-dual-host-layout — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 05 |
| feature | eval-dual-host-layout |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-06-01T14:40:00Z |
| last_heartbeat | 2026-06-01T14:50:00Z |
| completed_at | 2026-06-01T14:45:00Z |
| git_sha | fbfecad |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Create `stampEjectedPrimitives()` in `stamp-primitives.ts` (opts object with repoRoot, pluginRoot, layout, dryRun) (`plugins/zoto-eval-system/scripts/stamp-primitives.ts`)
- [x] **D02** — On eject, copy all eval agents from plugin (flat-prefix default; nested eval-sys via primitivesLayout nested) (`plugins/zoto-eval-system/scripts/stamp-primitives.ts`)
- [x] **D03** — On eject, copy all eval skills from plugin (flat-prefix default; nested via opt-in) (`plugins/zoto-eval-system/scripts/stamp-primitives.ts`)
- [x] **D04** — On eject, copy all eval commands from plugin (flat-prefix default; nested via opt-in) (`plugins/zoto-eval-system/scripts/stamp-primitives.ts`)
- [x] **D05** — Ensure ejected primitive paths exist (flat-prefix `.cursor/*/eval-sys--*` default; nested `eval-sys/` dirs when opted in) (`plugins/zoto-eval-system/tests/stamp-primitives.test.ts`)
- [x] **D06** — Add `.cursor/*/eval-sys/` and flat-prefix patterns to host-package `.gitignore` template (`plugins/zoto-eval-system/templates/host-package/.gitignore`)
- [x] **D07** — `stamp-host-layout.ts` calls `stampEjectedPrimitives()` as part of the eject flow (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D08** — Document the primitives layout in the eject CLI's output summary (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D09** — `analyserAgentPath()` checks flat-prefix and nested `.cursor/agents/eval-sys/` before plugin source (`plugins/zoto-eval-system/src/paths.ts`)
- [x] **P0** — Phase 0 — validate Cursor discovery; record result before stamp logic (`specs/20260601-eval-dual-host-layout/subtask-05-eval-dual-host-layout-ejected-primitives-20260601.md`)
- [x] **FB** — Phase 0 fail fallback — flat-prefix layout + un-eject cleanup helper (`plugins/zoto-eval-system/scripts/stamp-primitives.ts`)
- [x] **DoD1** — Eject produces primitives under `.cursor/` (flat-prefix default after Phase 0) (`plugins/zoto-eval-system/tests/stamp-primitives.test.ts`)
- [x] **DoD2** — `analyserAgentPath()` resolves correctly in ejected mode (`plugins/zoto-eval-system/tests/stamp-primitives.test.ts`)
- [x] **DoD3** — No primitives land under `.zoto/eval-system/agents/` (`plugins/zoto-eval-system/tests/stamp-primitives.test.ts`)
- [x] **DoD4** — No linter errors in modified files (`plugins/zoto-eval-system/scripts/stamp-primitives.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-eval-system/scripts/stamp-primitives.ts` — stampEjectedPrimitives module
- **created** `plugins/zoto-eval-system/tests/stamp-primitives.test.ts` — targeted primitive stamping tests
- **modified** `plugins/zoto-eval-system/scripts/stamp-host-layout.ts` — integrate stampEjectedPrimitives and CLI summary
- **modified** `plugins/zoto-eval-system/src/paths.ts` — analyserAgentPath ejected resolution
- **modified** `plugins/zoto-eval-system/templates/host-package/.gitignore` — ignore flat-prefix and nested ejected primitives
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Phase 0 FAILED for nested `.cursor/agents/eval-sys/` discovery (Cursor forum: agents only at top-level; skills need direct `.cursor/skills/<name>/`; commands inconsistent IDE vs CLI). Default layout is flat-prefix (`eval-sys--*`) with nested opt-in via `primitivesLayout: "nested"`. Targeted tests: 6/6 pass in stamp-primitives.test.ts (vitest run 2026-06-01). Judge verified stampEjectedPrimitives, analyserAgentPath, integration, gitignore, no .zoto/agents copy.

<!-- status:notes:end -->
