# Subtask 09 — Eval Prompt Realism Audit — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 09 |
| feature | Eval Prompt Realism Audit |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-25T07:04:00.000Z |
| last_heartbeat | 2026-05-25T07:04:35.000Z |
| completed_at | 2026-05-25T07:04:35.000Z |
| git_sha | e49961ff5330e60d9adf4aa48727cf8247371d5e |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `.cursor/evals/commands/sync-plugins.json` updated per the payload. (`.cursor/evals/commands/sync-plugins.json`)
- [x] **D02** — `.cursor/evals/commands/zoto-create-plugin.json` updated per the payload. (`.cursor/evals/commands/zoto-create-plugin.json`)
- [x] **D03** — `.cursor/evals/agents/zoto-plugin-manager.json` updated per the payload. (`.cursor/evals/agents/zoto-plugin-manager.json`)
- [x] **D04** — `.cursor/evals/hooks/hooks.json` updated per the payload. (`.cursor/evals/hooks/hooks.json`)
- [x] **D05** — `.cursor/skills/zoto-create-plugin/evals/evals.json` user-authored rows byte-preserved; any generated rows (if present) rewritten per the payload. (`.cursor/skills/zoto-create-plugin/evals/evals.json`)
- [x] **D06** — `plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json` byte-identical to pre-spec state — recorded in the status report as `bytes_preserved: true, generated_cases: 0`. (`plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json`)
- [x] **D07** — Per-file byte-preservation proof captured in the status report. (`specs/20260525-eval-prompt-realism-audit/status/subtask-09-eval-prompt-realism-audit-rewrite-workspace-and-cursor-top-20260525.status.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260525-eval-prompt-realism-audit/audit/apply-subtask09-rewrites.py` — Mechanical applier with JSONDecoder span extraction and user-row byte preservation
- **modified** `.cursor/evals/commands/sync-plugins.json` — 2 generated cases rewritten per eval-rewrites.json
- **modified** `.cursor/evals/commands/zoto-create-plugin.json` — 3 generated cases rewritten per eval-rewrites.json
- **modified** `.cursor/evals/agents/zoto-plugin-manager.json` — 6 generated cases rewritten per eval-rewrites.json
- **modified** `.cursor/evals/hooks/hooks.json` — 3 generated cases rewritten per eval-rewrites.json
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
14 generated cases rewritten across 4 .cursor/evals files; 3 user-authored cases byte-preserved in zoto-create-plugin skill evals; cursor-top monitor evals byte-identical to HEAD (bytes_preserved: true, generated_cases: 0). Payload parity 0 mismatches; source_hash vs HEAD 0 changes on rewritten cases; JSON parse sweep OK.
<!-- status:notes:end -->
