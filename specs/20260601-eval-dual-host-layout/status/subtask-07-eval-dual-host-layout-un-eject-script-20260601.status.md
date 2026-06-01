# Subtask 07 — eval-dual-host-layout — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 07 |
| feature | eval-dual-host-layout |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-06-01T14:45:00Z |
| last_heartbeat | 2026-06-01T14:52:00Z |
| completed_at | 2026-06-01T14:48:00Z |
| git_sha | fbfecad |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — New script: `plugins/zoto-eval-system/scripts/eval-un-eject.ts` (`plugins/zoto-eval-system/scripts/eval-un-eject.ts`)
- [x] **D02** — Removes vendored directories: `.zoto/eval-system/src/`, `engine/`, `templates/`, `scripts/` (`plugins/zoto-eval-system/scripts/eval-un-eject.ts`)
- [x] **D03** — Removes nested `.zoto/eval-system/package.json` (`plugins/zoto-eval-system/scripts/eval-un-eject.ts`)
- [x] **D04** — Removes ejected primitives: `.cursor/agents/eval-sys/`, `.cursor/skills/eval-sys/`, `.cursor/commands/eval-sys/` (`plugins/zoto-eval-system/scripts/stamp-primitives.ts`)
- [x] **D05** — Patches config.yml: sets `hostLayout: plugin` (preserves all other config) (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D06** — Updates root `package.json` eval aliases from self-contained paths back to plugin-resolved paths (`plugins/zoto-eval-system/scripts/stamp-lean-layout.ts`)
- [x] **D07** — Preserves repo-specific assets: config.yml, manifest.yml, manifest.history.yml, cache/, evals/ (`plugins/zoto-eval-system/scripts/eval-un-eject.ts`)
- [x] **D08** — `--dry-run` flag: prints what would be deleted/modified without acting (`plugins/zoto-eval-system/tests/eval-un-eject.test.ts`)
- [x] **D09** — `--force` flag: skip confirmation prompt (for CI/automation) (`plugins/zoto-eval-system/scripts/eval-un-eject.ts`)
- [x] **D10** — Interactive confirmation by default: lists files to delete, asks y/N (`plugins/zoto-eval-system/scripts/eval-un-eject.ts`)
- [x] **D11** — Prints clear summary of changes made and next steps (`plugins/zoto-eval-system/scripts/eval-un-eject.ts`)
- [x] **D12** — Add `eval:un-eject` alias to root package.json and to `templates/package-scripts/base.json` (`package.json`)
- [x] **DoD1** — Un-eject reverses eject cleanly (eject → un-eject round-trip) (`plugins/zoto-eval-system/tests/eval-un-eject.test.ts`)
- [x] **DoD2** — Lean mode works after un-eject (eval:* scripts resolve from plugin) (`plugins/zoto-eval-system/tests/eval-un-eject.test.ts`)
- [x] **DoD3** — No linter errors in modified files (`plugins/zoto-eval-system/scripts/eval-un-eject.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-eval-system/scripts/eval-un-eject.ts` — un-eject CLI and unEjectHostLayout core
- **created** `plugins/zoto-eval-system/tests/eval-un-eject.test.ts` — round-trip, dry-run, guard tests (4 cases)
- **modified** `plugins/zoto-eval-system/templates/package-scripts/base.json` — eval:un-eject alias
- **modified** `package.json` — eval:un-eject alias
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Judge verified eval-un-eject.ts removes vendored dirs, nested package.json, flat-prefix and nested primitives via ejectedPrimitivesCleanupTargets, patches hostLayout to plugin, stamps lean aliases via stampLeanLayout. CLI supports --dry-run, --force, interactive y/N, --json, --repo-root=. vitest run tests/eval-un-eject.test.ts 4/4 pass. ReadLints clean. Corrected status yml from invalid map checklist to schema array.

<!-- status:notes:end -->
