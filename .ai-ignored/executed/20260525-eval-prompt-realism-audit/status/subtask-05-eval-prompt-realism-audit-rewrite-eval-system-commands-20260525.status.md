# Subtask 05 — Eval Prompt Realism Audit — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 05 |
| feature | Eval Prompt Realism Audit |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-25T07:00:00.000Z |
| last_heartbeat | 2026-05-25T07:02:30.000Z |
| completed_at | 2026-05-25T07:02:30.000Z |
| git_sha | e49961ff5330e60d9adf4aa48727cf8247371d5e |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — All 13 files under `plugins/zoto-eval-system/evals/commands/*.json` updated per `audit/eval-rewrites.json`. (`plugins/zoto-eval-system/evals/commands/`)
- [x] **D02** — Each rewritten generated case carries a refreshed `_meta.last_updated` (ISO-8601 timestamp at write time); `_meta.generated_by` remains the existing stable string `"zoto-update-evals"` (per user decision 2026-05-25 — see spec KD-7); `_meta.source_hash` is preserved per "Source-hash recomputation rule" below. (`plugins/zoto-eval-system/evals/commands/`)
- [x] **D03** — Each rewritten generated case retains `_meta.generated: true`. (`plugins/zoto-eval-system/evals/commands/`)
- [x] **D04** — The top-level `target_id` field is preserved verbatim per file (no schema reshape). (`plugins/zoto-eval-system/evals/commands/`)
- [x] **D05** — Per-file byte-preservation proof for user-authored cases written to `specs/20260525-eval-prompt-realism-audit/status/subtask-05-...status.md` (a diff hunk count of `0` for non-generated cases). (`specs/20260525-eval-prompt-realism-audit/status/subtask-05-eval-prompt-realism-audit-rewrite-eval-system-commands-20260525.status.md`)
- [x] **D06** — A summary table in the status report listing each file, the number of generated cases rewritten, and the number of user-authored cases preserved. (`specs/20260525-eval-prompt-realism-audit/status/subtask-05-eval-prompt-realism-audit-rewrite-eval-system-commands-20260525.status.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260525-eval-prompt-realism-audit/audit/apply-command-rewrites.ts` — Helper applying eval-rewrites.json to command eval suites
- **modified** `plugins/zoto-eval-system/evals/commands/z-eval-advise.json` — Phase 3 realism rewrite (9 generated cases)
- **modified** `plugins/zoto-eval-system/evals/commands/z-eval-compare.json` — Phase 3 realism rewrite (4 generated cases)
- **modified** `plugins/zoto-eval-system/evals/commands/z-eval-configure.json` — Phase 3 realism rewrite (9 generated cases)
- **modified** `plugins/zoto-eval-system/evals/commands/z-eval-create.json` — Phase 3 realism rewrite (3 generated cases); judge fix 2026-05-25T13:29:12Z — eval-rewrites parity + KD-7 generated_by
- **modified** `plugins/zoto-eval-system/evals/commands/z-eval-execute.json` — Phase 3 realism rewrite (6 generated cases)
- **modified** `plugins/zoto-eval-system/evals/commands/z-eval-help.json` — Phase 3 realism rewrite (7 generated cases)
- **modified** `plugins/zoto-eval-system/evals/commands/z-eval-init.json` — Phase 3 realism rewrite (5 generated cases)
- **modified** `plugins/zoto-eval-system/evals/commands/z-eval-judge.json` — Phase 3 realism rewrite (3 generated cases)
- **modified** `plugins/zoto-eval-system/evals/commands/z-eval-jump.json` — Phase 3 realism rewrite (2 generated cases)
- **modified** `plugins/zoto-eval-system/evals/commands/z-eval-operator.json` — Phase 3 realism rewrite (2 generated cases)
- **modified** `plugins/zoto-eval-system/evals/commands/z-eval-start.json` — Phase 3 realism rewrite (4 generated cases)
- **modified** `plugins/zoto-eval-system/evals/commands/z-eval-update.json` — Phase 3 realism rewrite (9 generated cases)
- **modified** `plugins/zoto-eval-system/evals/commands/z-eval-workflow.json` — Phase 3 realism rewrite (11 generated cases)
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
74 generated cases rewritten across 13 files; 0 user-authored cases in scope. Payload parity check 0 mismatches; source_hash vs HEAD 0 changes; JSON parse sweep OK. z-eval-create.json remediated 2026-05-25T13:29:12Z from eval-rewrites.json (cases 1–3 prompt/assertions/expected_output/follow_ups; KD-7 generated_by; source_hash preserved).
<!-- status:notes:end -->
