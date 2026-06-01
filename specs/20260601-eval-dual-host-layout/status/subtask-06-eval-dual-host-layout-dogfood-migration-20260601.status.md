# Subtask 06 — eval-dual-host-layout — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 06 |
| feature | eval-dual-host-layout |
| assigned_agent | generalPurpose |
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
- [x] **D01** — Delete `.zoto/eval-system/src/` directory (vendored config-loader, paths, etc.)
- [x] **D02** — Delete `.zoto/eval-system/engine/` directory (vendored runner, update, compare, etc.)
- [x] **D03** — Delete `.zoto/eval-system/templates/` directory (vendored templates tree)
- [x] **D04** — Delete `.zoto/eval-system/scripts/` directory (vendored eval-discover, eval-analyse, etc.)
- [x] **D05** — Delete `.zoto/eval-system/agents/` directory (vendored analyser agent)
- [x] **D06** — Delete `.zoto/eval-system/package.json` (nested package)
- [x] **D07** — Delete `.zoto/eval-system/.env.example` (if sourced from plugin template)
- [x] **D08** — Delete `.zoto/eval-system/.gitignore` (if sourced from plugin template — or replace with lean version)
- [x] **D09** — Keep `.zoto/eval-system/config.yml` (repo-specific config) (`.zoto/eval-system/config.yml`)
- [x] **D10** — Keep `.zoto/eval-system/manifest.yml` and `manifest.history.yml` (repo-specific state) (`.zoto/eval-system/manifest.yml`)
- [x] **D11** — Set `hostLayout: plugin` in `.zoto/eval-system/config.yml` (`.zoto/eval-system/config.yml`)
- [x] **D12** — Verify root `package.json` eval:* scripts already point to `plugins/zoto-eval-system/scripts/` (they do currently — confirm no breakage) (`package.json`)
- [x] **D13** — Remove any root-level devDeps that were only needed for the vendored nested package (if any)
- [x] **D14** — Verify `pnpm run eval:discover`, `pnpm run eval:update --check`, and `pnpm run eval:list` work post-migration
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `.zoto/eval-system/config.yml` — Added hostLayout:plugin; fixed judgeModel to claude-opus-4-8[]
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Vendored runtime was untracked; deletions are filesystem-only (no git deletions). eval:discover reports layout:plugin, 52 targets. eval:list succeeds. eval:update --check exits 2 with 6 pre-existing critical skill drifts (S01–S03 plugin edits); layout_drift_count=0 — not migration-related. Fixed judgeModel opus-4.6 → claude-opus-4-8[] (schema-invalid value restored from stash). No root devDep removals needed — all deps serve plugin/host eval harness.
<!-- status:notes:end -->
