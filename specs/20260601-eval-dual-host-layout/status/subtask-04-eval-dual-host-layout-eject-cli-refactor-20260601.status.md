# Subtask 04 — eval-dual-host-layout — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 04 |
| feature | eval-dual-host-layout |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at |  |
| last_heartbeat | 2026-06-01T14:43:12.000Z |
| completed_at | 2026-06-01T14:43:12.000Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `stamp-host-layout.ts` refactored: uses `resolvePluginRoot()` (from S01) instead of hardcoded `PLUGIN_ROOT` for source resolution (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D02** — On eject: writes `hostLayout: ejected` into `.zoto/eval-system/config.yml` (preserving all other config) (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D03** — On eject: creates nested `.zoto/eval-system/package.json` with self-contained deps (`plugins/zoto-eval-system/templates/host-package/package.json`)
- [x] **D04** — On eject: copies src/, engine/, templates/, scripts/ to `.zoto/eval-system/` (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D05** — On eject: does NOT copy agents/skills/commands to `.zoto/eval-system/agents/` (that's S05's job — `.cursor/*/eval-sys/`) (`plugins/zoto-eval-system/tests/stamp-host-layout.test.ts`)
- [x] **D06** — Remove the `ANALYSER_AGENT` copy logic that puts agent into `.zoto/eval-system/agents/` (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D07** — Root `package.json` eval aliases updated to point to `.zoto/eval-system/` (self-contained paths) after eject (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D08** — `eval:stamp-host-layout` alias added/verified in root package.json template (`plugins/zoto-eval-system/templates/package-scripts/base.json`)
- [x] **D09** — Prints clear summary of what was ejected and next steps (run `pnpm install` in `.zoto/eval-system/`) (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D10** — `--dry-run` flag continues to work (`plugins/zoto-eval-system/tests/stamp-host-layout.test.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/scripts/stamp-host-layout.ts` — eject CLI refactor
- **created** `plugins/zoto-eval-system/tests/stamp-host-layout.test.ts` — targeted eject tests
- **modified** `plugins/zoto-eval-system/templates/package-scripts/base.json` — eval:stamp-host-layout alias
- **modified** `plugins/zoto-eval-system/templates/host-package/package.json` — nested eval:stamp-host-layout
- **modified** `plugins/zoto-eval-system/scripts/migrate-host-layout-v3.ts` — delegate stampRootEvalAliases to stampHostLayout
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Eject CLI refactored as explicit opt-in. Uses resolvePluginRoot() for source resolution;
patchConfigHostLayout() sets hostLayout via yaml parseDocument; stampRootEvalAliases()
delegates all eval:* scripts to pnpm -C .zoto/eval-system. ANALYSER_AGENT copy removed.
S05 primitives stamping deferred. Judge: vitest stamp-host-layout.test.ts 5/5 pass; no lints.

<!-- status:notes:end -->
