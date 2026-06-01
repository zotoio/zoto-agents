# Subtask 08 — eval-dual-host-layout — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 08 |
| feature | eval-dual-host-layout |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-06-01T04:48:03Z |
| last_heartbeat | 2026-06-01T04:55:26Z |
| completed_at | 2026-06-01T04:55:26Z |
| git_sha | fbfecad15cca5de07f40ec150555f1b8d2fff64c |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Update `plugins/zoto-eval-system/README.md` "Plugin vs host runtime layout" section — rewrite the three-layer table to describe: Plugin package (source of truth), Lean host (default), Ejected host (opt-in) (`plugins/zoto-eval-system/README.md`)
- [x] **D02** — Document resolution precedence chain in README (monorepo → env → Cursor install dir) (`plugins/zoto-eval-system/README.md`)
- [x] **D03** — Document `hostLayout` config field in README Configuration section (`plugins/zoto-eval-system/README.md`)
- [x] **D04** — Document eject CLI usage: `pnpm run eval:stamp-host-layout` (when, why, what it does) (`plugins/zoto-eval-system/README.md`)
- [x] **D05** — Document un-eject CLI usage: `pnpm run eval:un-eject` (when, why, what it does) (`plugins/zoto-eval-system/README.md`)
- [x] **D06** — Document ejected primitives layout (`.cursor/*/eval-sys/`) in README (`plugins/zoto-eval-system/README.md`)
- [x] **D07** — Update `plugins/zoto-eval-system/commands/z-eval-init.md` — mention lean deps install (`plugins/zoto-eval-system/commands/z-eval-init.md`)
- [x] **D08** — Update `plugins/zoto-eval-system/commands/z-eval-create.md` — clarify lean-only stamping (`plugins/zoto-eval-system/commands/z-eval-create.md`)
- [x] **D09** — Update `plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md` — document lean flow (`plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md`)
- [x] **D10** — Update `plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md` — ensure script path docs reflect both modes (`plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md`)
- [x] **D11** — Add "Migration from ejected to lean" section in README for existing users (`plugins/zoto-eval-system/README.md`)
- [x] **D12** — Update CHANGELOG.md with breaking change notice (`plugins/zoto-eval-system/CHANGELOG.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/README.md` — four-layer layout, precedence, eject/un-eject, migration, hostLayout, scenarios ensure-host dual-mode
- **modified** `plugins/zoto-eval-system/CHANGELOG.md` — BREAKING dual-mode entry; self-contained section superseded annotation
- **modified** `plugins/zoto-eval-system/commands/z-eval-init.md` — lean deps pnpm install step
- **modified** `plugins/zoto-eval-system/commands/z-eval-create.md` — lean-only stamping and lean vs ejected table
- **modified** `plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md` — lean flow, stamp-lean-layout, eject/un-eject operator CLI
- **modified** `plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md` — eval:stamp allowlist lean/ejected paths, eval:stamp-host-layout, eval:un-eject, host layout modes
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Judge fix pass complete. Dual-mode script resolution documented in zoto-eval-tooling eval:stamp note, README scenarios ensure-host alias/bridge, CHANGELOG self-contained section annotated superseded.
<!-- status:notes:end -->
