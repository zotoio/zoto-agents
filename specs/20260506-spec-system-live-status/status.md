# Spec 20260506-spec-system-live-status — aggregate live status

<!-- status:overview:start -->
| Key | Value |
|-----|-------|
| spec_id | 20260506-spec-system-live-status |
| phase | 0 |
| aggregate_state | completed |
| started_at | 2026-05-06T09:23:50.285Z |
| updated_at | 2026-05-06T09:23:50.285Z |

**config_reloaded**
_None._
<!-- status:overview:end -->

<!-- status:progress:start -->
| Metric | Count |
|--------|-------|
| Total | 9 |
| Completed | 9 |
| In progress | 0 |
| Blocked | 0 |
| Failed | 0 |
<!-- status:progress:end -->

<!-- status:subtasks:start -->
| Subtask | State | Status (yml) | Last heartbeat |
|---------|-------|--------------|----------------|
| 01 | completed | `specs/20260506-spec-system-live-status/status/subtask-01-spec-system-live-status-token-budget-audit-20260506.status.yml` | 2026-05-06T08:04:23.744Z |
| 02 | completed | `specs/20260506-spec-system-live-status/status/subtask-02-spec-system-live-status-status-schemas-20260506.status.yml` | 2026-05-06T08:03:50.886Z |
| 03 | completed | `specs/20260506-spec-system-live-status/status/subtask-03-spec-system-live-status-config-loader-20260506.status.yml` | 2026-05-06T08:03:20.945Z |
| 04 | completed | `specs/20260506-spec-system-live-status/status/subtask-04-spec-system-live-status-executor-wiring-20260506.status.yml` | 2026-05-06T08:17:15.949Z |
| 05 | completed | `specs/20260506-spec-system-live-status/status/subtask-05-spec-system-live-status-status-scaffold-20260506.status.yml` | 2026-05-06T08:05:12.606Z |
| 06 | completed | `specs/20260506-spec-system-live-status/status/subtask-06-spec-system-live-status-subagent-status-ownership-20260506.status.yml` | 2026-05-06T08:16:54.225Z |
| 07 | completed | `specs/20260506-spec-system-live-status/status/subtask-07-spec-system-live-status-aggregator-20260506.status.yml` | 2026-05-06T08:55:42.000Z |
| 08 | completed | `specs/20260506-spec-system-live-status/status/subtask-08-spec-system-live-status-evals-20260506.status.yml` | 2026-05-06T09:11:45.309Z |
| 09 | completed | `specs/20260506-spec-system-live-status/status/subtask-09-spec-system-live-status-docs-20260506.status.yml` | 2026-05-06T09:04:15.139Z |
<!-- status:subtasks:end -->

<!-- status:blockers:start -->
_None._
<!-- status:blockers:end -->

<!-- status:definition-of-done:start -->
- [ ] **DOD01** — All subtasks completed and adversarially verified
- [ ] **DOD02** — `.zoto/spec-system/config.json` schema includes `subagents.*` and `aggregator.*` blocks; defaults populated in `plugins/zoto-spec-system/templates/config.json`
- [ ] **DOD03** — `spec-status.schema.json` and `subtask-status.schema.json` exist, are draft-07-valid, and round-trip via the helper script
- [ ] **DOD04** — Spec creation scaffolds `status/` with the paired files for every subtask
- [ ] **DOD05** — Spawned subagents own and update their `.status.md` + `.status.yml` during execution
- [ ] **DOD06** — Aggregator rebuilds spec-root `status.md` + `status.yml` on every status-pair change and surfaces blocked/failed subtasks promptly
- [ ] **DOD07** — Token-budget changes in `.zoto/spec-system/config.json` apply to the next spawned subagent without restarting the executor (asserted by eval)
- [ ] **DOD08** — README, rule, AGENTS.md, and skill / agent / command files updated
- [ ] **DOD09** — No linter errors in modified files
- [ ] **DOD10** — Plugin tests pass (`pnpm --filter @zoto-agents/zoto-spec-system test`)
<!-- status:definition-of-done:end -->

<!-- status:events:start -->
- **2026-05-06T09:23:50.285Z** `rebuild` — Aggregated 9 subtask source(s); digest f6dbd757…
<!-- status:events:end -->
