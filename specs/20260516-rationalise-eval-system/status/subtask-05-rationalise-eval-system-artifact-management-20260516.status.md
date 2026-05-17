# Subtask 05 — Rationalise Eval System — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 05 |
| feature | Rationalise Eval System |
| assigned_agent | crux-software-engineer |
| model | composer-2-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-16T12:50:00Z |
| last_heartbeat | 2026-05-16T13:01:00Z |
| completed_at | 2026-05-16T12:56:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Add `evals/_runs/` to `.gitignore` with an exception for the directory marker (`!evals/_runs/.gitkeep`). Touch a `.gitkeep` so the directory persists. (`.gitignore`)
- [x] **D02** — Add `.zoto/eval-system/cache/` to `.gitignore` with an exception for `!.zoto/eval-system/cache/.gitkeep`. Touch the placeholder. (`.zoto/eval-system/cache/.gitkeep`)
- [x] **D03** — Verify the gitignore rules apply by running `git status --ignored` and confirming the previously untracked run directories and cache files now show as **ignored**, while the placeholders are tracked. (`evals/_runs/.gitkeep`)
- [x] **D04** — Document retention rules in `plugins/zoto-eval-system/README.md` (or update the existing section): default `runs.retention: 30` (kept the most recent 30 run directories), how to override in `.zoto/eval-system/config.yml`, and the manual cleanup command (`pnpm run eval:gc -- --apply`). (`plugins/zoto-eval-system/README.md`)
- [x] **D05** — Confirm `.zoto/eval-system/config.yml` either uses the default retention or has an explicit override; if the working file has no retention key, leave the default. (`.zoto/eval-system/config.yml`)
- [x] **D06** — Inspect `.github/workflows/eval-cleanup-stale-check.yml`: (`.github/workflows/eval-cleanup-stale-check.yml`)
- [x] **D07** — Add a brief explanation comment block at the top of the workflow file explaining what it gates and how to debug a failure (link to `pnpm run eval:cleanup-stale -- --dry-run`). (`.github/workflows/eval-cleanup-stale-check.yml`)
- [x] **D08** — Spot-check one untracked run directory (e.g. `evals/_runs/20260511T162159Z/`) and confirm its contents are coherent: `report.yml`, `llm.yml`, `static.yml`, optional `.run-meta.json`. If files look corrupt or incomplete, surface in **Blockers Encountered** rather than deleting them — `eval-gc` is the legitimate cleanup path. (`evals/_runs/20260511T162159Z/llm.yml`)
- [x] **D09** — Add `eval:cleanup-runs` documentation to the README **only if** there is no existing equivalent. The existing `eval:gc` already covers retention; do not introduce a new script.
- [x] **D10** — Run `ReadLints` on the workflow YAML and any modified TypeScript / markdown files.
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `.gitignore` — Added eval run and cache ignore rules with .gitkeep exceptions
- **created** `evals/_runs/.gitkeep` — Directory placeholder (force-tracked)
- **created** `.zoto/eval-system/cache/.gitkeep` — Directory placeholder (force-tracked)
- **modified** `plugins/zoto-eval-system/README.md` — Added run retention and cleanup documentation section
- **modified** `.github/workflows/eval-cleanup-stale-check.yml` — Enhanced explanatory comment header with debug instructions
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
All 10 deliverables completed. Judge fix_list addressed: ran git rm --cached -r on evals/_runs/ and .zoto/eval-system/cache/ to untrack previously-committed files, then re-added .gitkeep placeholders. git ls-files now shows ONLY .gitkeep in both directories. D03 verified.
<!-- status:notes:end -->
