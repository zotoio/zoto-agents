# Subtask 04 — Eval Plugin Self-Contained Scripts Consolidation — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 04 |
| feature | Eval Plugin Self-Contained Scripts Consolidation |
| assigned_agent | zoto-eval-engineer |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `stamp-host-layout.ts` — `HOST_SCRIPT_NAMES` copied from `join(PLUGIN_ROOT, "scripts", name)` not `join(agentsRoot, "scripts", name)` (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D02** — Add `check-analyser-payload-parity.ts` to stamper list if `engine/update.ts --check` expects it under stamped host `scripts/` (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D03** — Simplify `rewriteScriptBody` — remove `../plugins/zoto-eval-system/` replacements if source scripts already use `../src/` and `../engine/` (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D04** — `rewriteEngineFile` — change `../../../scripts/` → `../scripts/` rewrite may become unnecessary if engine imports are already `../scripts/` in plugin source; keep rewrite for backward compatibility during migration or remove if redundant (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D05** — `migrate-host-layout-v3.ts` — update comments and any hardcoded root script paths (`plugins/zoto-eval-system/scripts/migrate-host-layout-v3.ts`)
- [x] **D06** — `install-local.ts` — add `engine` and `src` to `PLUGIN_DIRS` (`plugins/zoto-eval-system/scripts/install-local.ts`)
- [x] **D07** — Dry-run verification: `pnpm exec tsx plugins/zoto-eval-system/scripts/stamp-host-layout.ts --dry-run --repo-root .` reports copies from plugin scripts (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/scripts/stamp-host-layout.ts` — Script sourcing defaults to PLUGIN_ROOT; added parity + cleanup-stale scripts; simplified rewriteScriptBody
- **modified** `plugins/zoto-eval-system/scripts/migrate-host-layout-v3.ts` — Updated legacy-move comments; expanded scriptNames; removed zotoAgentsRoot override
- **modified** `plugins/zoto-eval-system/scripts/install-local.ts` — Added engine and src to PLUGIN_DIRS
- **modified** `plugins/zoto-eval-system/templates/host-package/package.json` — Added eval:analyser-parity-check, eval:cleanup-stale, eval:cleanup-stale:apply aliases
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Dry-run stamp lists eval-cleanup-stale.ts and check-analyser-payload-parity.ts under .zoto/eval-system/scripts/. Temp-dir force-stamp confirms eval-stamp.ts imports ../src/config-loader.js (no monorepo import paths). install-local --dry-run copies engine/ and src/. plugin.test.ts had no stamper assertions requiring updates.
<!-- status:notes:end -->
