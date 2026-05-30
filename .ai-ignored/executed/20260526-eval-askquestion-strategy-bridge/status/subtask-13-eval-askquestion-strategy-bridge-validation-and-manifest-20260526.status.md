# Subtask 13 — Eval AskQuestion Strategy Bridge — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 13 |
| feature | Eval AskQuestion Strategy Bridge |
| assigned_agent | shell |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at |  |
| last_heartbeat | 2026-05-25T17:46:40.147Z |
| completed_at | 2026-05-25T17:46:40.147Z |
| git_sha | e49961ff5330e60d9adf4aa48727cf8247371d5e |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `pnpm run eval:list` exit 0 — log captured. (`specs/20260526-eval-askquestion-strategy-bridge/audit/gate-eval-list.log`)
- [x] **D02** — `pnpm run eval -- --collect-only` exit 0 — log captured. (`specs/20260526-eval-askquestion-strategy-bridge/audit/gate-collect-only.log`)
- [x] **D03** — `pnpm run eval:update --check` exit 0 — log captured. If non-zero, run `pnpm run eval:update --apply --no-analyser` to refresh `_meta.last_updated` using cached analyser payloads (analyser version is already at the bumped value from Subtask 04), then re-run `--check` and capture the second log. (`specs/20260526-eval-askquestion-strategy-bridge/audit/gate-update-check.log`)
- [x] **D04** — `pnpm run eval:llm` smoke cohort with `CURSOR_API_KEY` exported — at least two case ids per backend (one declarative, one code-strategy with scripted interactions) — log captured. Mark each row with its `backend:` annotation. (`specs/20260526-eval-askquestion-strategy-bridge/audit/gate-summary.md`)
- [x] **D05** — `.zoto/eval-system/manifest.yml` snapshot refreshed exactly once (the `eval:update --apply` from Subtask 09 may have already done this — confirm via `git diff` before refreshing again; do not double-refresh). (`specs/20260526-eval-askquestion-strategy-bridge/audit/gate-summary.md`)
- [x] **D06** — `.zoto/eval-system/manifest.history.yml` gains exactly one new appended entry; no prior entry is mutated. (`specs/20260526-eval-askquestion-strategy-bridge/audit/gate-summary.md`)
- [x] **D07** — Execution report at `specs/20260526-eval-askquestion-strategy-bridge/execution-report-eval-askquestion-strategy-bridge-20260526.md` captures: every gate command + its exit code; the per-backend distribution post-migration (e.g. "23 declarative, 20 code"); the manifest history diff; any blockers encountered and how they were resolved. (`specs/20260526-eval-askquestion-strategy-bridge/execution-report-eval-askquestion-strategy-bridge-20260526.md`)
- [x] **D08** — Final spec status update: edit the index file's `## Status` block from `Draft` (or `Ready for Review`, depending on Step 8 outcome) to `Completed`. (`specs/20260526-eval-askquestion-strategy-bridge/spec-eval-askquestion-strategy-bridge-20260526.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/gate-eval-list.log` — eval:list gate log EXIT_CODE=0
- **modified** `specs/20260526-eval-askquestion-strategy-bridge/audit/gate-collect-only.log` — collect-only gate log EXIT_CODE=0 after llm/** exclude fix
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/gate-update-check.log` — update --check initial exit 2, apply recovery, recheck exit 0
- **modified** `specs/20260526-eval-askquestion-strategy-bridge/audit/gate-llm-smoke.log` — code backend exit 0; declarative hook deferred per conditional DoD
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/gate-summary.md` — Gate exit table, backend distribution, manifest history diff, D04 deferral
- **created** `specs/20260526-eval-askquestion-strategy-bridge/execution-report-eval-askquestion-strategy-bridge-20260526.md` — Executor report with gate exits, backend counts, manifest diff, blockers
- **modified** `specs/20260526-eval-askquestion-strategy-bridge/spec-eval-askquestion-strategy-bridge-20260526.md` — Spec index Status block set to Completed with exceptions
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Static gates (eval:list, collect-only, update --check) exit 0. D04 code-strategy smoke passed; declarative hook:cursor-workspace case deferred (LLM judge grading, not bridge infra) per conditional DoD in gate-summary.md. Executor execution report and index status update landed; subtask finalized after executor run.
<!-- status:notes:end -->
