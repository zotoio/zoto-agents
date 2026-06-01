# Subtask 02 — Eval Plugin Self-Contained Scripts Consolidation — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 02 |
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
- [x] **D01** — Move (with import rewrites): `eval-analyse.ts`, `eval-stamp.ts`, `eval-orchestrate.ts`, `eval-discover.ts`, `eval-gc.ts`, `eval-cleanup-vendored.ts`, `eval-cleanup-stale.ts`, `check-analyser-payload-parity.ts`, `test.py` (`plugins/zoto-eval-system/scripts/`)
- [x] **D02** — Consolidate `eval-ensure-host.ts` — move root copy into plugin OR align root to delegate to plugin; ensure imports use `../templates/…` not `../plugins/zoto-eval-system/templates/…` (`plugins/zoto-eval-system/scripts/eval-ensure-host.ts`)
- [x] **D03** — Delete `plugins/zoto-eval-system/scripts/eval-discover.ts` stale fork (if not overwritten by move) (`plugins/zoto-eval-system/scripts/eval-discover.ts`)
- [x] **D04** — Delete `plugins/zoto-eval-system/scripts/eval-update.ts` (superseded by `engine/update.ts`)
- [x] **D05** — All moved scripts import `loadEvalConfig` / `loadEvalPaths` from `../src/config-loader.js` (`plugins/zoto-eval-system/scripts/`)
- [x] **D06** — Engine imports in moved scripts use `../engine/…` (e.g. `analyser-payload.js`, `_user-case-guards.ts`) (`plugins/zoto-eval-system/scripts/eval-analyse.ts`)
- [x] **D07** — `const REPO_ROOT = resolve(process.cwd())` replaced with `resolveHostRepoRoot()` where host-layout awareness is required (match existing stamper rewrite behaviour) (`plugins/zoto-eval-system/scripts/`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-eval-system/scripts/eval-analyse.ts` — Moved from root with import rewrites
- **created** `plugins/zoto-eval-system/scripts/eval-stamp.ts` — Moved from root with import rewrites
- **created** `plugins/zoto-eval-system/scripts/eval-orchestrate.ts` — Moved from root with import rewrites
- **modified** `plugins/zoto-eval-system/scripts/eval-discover.ts` — Replaced stale plugin fork with canonical root copy
- **created** `plugins/zoto-eval-system/scripts/eval-gc.ts` — Moved from root with import rewrites
- **created** `plugins/zoto-eval-system/scripts/eval-cleanup-vendored.ts` — Moved from root with import rewrites
- **created** `plugins/zoto-eval-system/scripts/eval-cleanup-stale.ts` — Moved from root with import rewrites
- **created** `plugins/zoto-eval-system/scripts/check-analyser-payload-parity.ts` — Moved from root with import rewrites
- **created** `plugins/zoto-eval-system/scripts/test.py` — Moved from root
- **created** `plugins/zoto-eval-system/scripts/eval-ensure-host.ts` — Consolidated with ../templates/ path
- **deleted** `plugins/zoto-eval-system/scripts/eval-update.ts` — Superseded by engine/update.ts
- **modified** `plugins/zoto-eval-system/tsconfig.json` — Added engine/**/*.ts to include
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Heartbeat: completed subtask 02.
Smoke: `pnpm exec tsx plugins/zoto-eval-system/scripts/eval-discover.ts --pretty | head` exit 0.
rg '../plugins/zoto-eval-system' plugins/zoto-eval-system/scripts/ — zero import hits (only comment/rewrite strings in install-local, uninstall-local, stamp-host-layout).
tsc --noEmit under plugin tsconfig reports pre-existing engine/update.ts ../../../scripts/ imports (subtask 03 scope) plus unrelated engine CJS/ESM errors; moved scripts compile alongside those.
Repo-root script copies intentionally retained per spec (subtask 05 retargets package.json).

<!-- status:notes:end -->
