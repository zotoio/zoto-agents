# Subtask 08 — Eval Prompt Realism Audit — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 08 |
| feature | Eval Prompt Realism Audit |
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
- [x] **D01** — All 4 files under `plugins/zoto-spec-system/evals/commands/*.json` updated. (`plugins/zoto-spec-system/evals/commands/`)
- [x] **D02** — All 3 files under `plugins/zoto-spec-system/evals/agents/*.json` updated. (`plugins/zoto-spec-system/evals/agents/`)
- [x] **D03** — The 1 file under `plugins/zoto-spec-system/evals/hooks/*.json` updated. (`plugins/zoto-spec-system/evals/hooks/zoto-spec-system.json`)
- [x] **D04** — All 3 files under `plugins/zoto-spec-system/skills/*/evals/evals.json` updated. (`plugins/zoto-spec-system/skills/`)
- [x] **D05** — Each generated case carries refreshed `_meta.last_updated` + `_meta.generated_by`; `_meta.source_hash` and `_meta.primitive_analysis` preserved per Subtask 05's rule. (`specs/20260525-eval-prompt-realism-audit/status/subtask-08-eval-prompt-realism-audit-rewrite-spec-system-suite-20260525.status.md`)
- [x] **D06** — User-authored cases byte-identical to pre-spec state. (`specs/20260525-eval-prompt-realism-audit/status/subtask-08-eval-prompt-realism-audit-rewrite-spec-system-suite-20260525.status.md`)
- [x] **D07** — Per-file byte-preservation proof captured in the status report. (`specs/20260525-eval-prompt-realism-audit/status/subtask-08-eval-prompt-realism-audit-rewrite-spec-system-suite-20260525.status.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-spec-system/evals/commands/z-spec-create.json` — Applied eval-rewrites payload (5 generated cases)
- **modified** `plugins/zoto-spec-system/evals/commands/z-spec-execute.json` — Applied eval-rewrites payload (9 generated cases)
- **modified** `plugins/zoto-spec-system/evals/commands/z-spec-init.json` — Applied eval-rewrites payload (4 generated cases)
- **modified** `plugins/zoto-spec-system/evals/commands/z-spec-judge.json` — Applied eval-rewrites payload (5 generated cases)
- **modified** `plugins/zoto-spec-system/evals/agents/zoto-spec-executor.json` — Applied eval-rewrites payload (9 generated cases)
- **modified** `plugins/zoto-spec-system/evals/agents/zoto-spec-generator.json` — Applied eval-rewrites payload (6 generated cases)
- **modified** `plugins/zoto-spec-system/evals/agents/zoto-spec-judge.json` — Applied eval-rewrites payload (4 generated cases)
- **modified** `plugins/zoto-spec-system/evals/hooks/zoto-spec-system.json` — Applied eval-rewrites payload (2 generated cases)
- **modified** `plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json` — Applied eval-rewrites payload (5 generated; 4 user preserved)
- **modified** `plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json` — Applied eval-rewrites payload (10 generated; 5 user preserved); repaired invalid HEAD JSON
- **modified** `plugins/zoto-spec-system/skills/zoto-judge-spec/evals/evals.json` — Applied eval-rewrites payload (4 generated; 3 user preserved)
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Applied audit/eval-rewrites.json to all 11 spec-system eval files. 63 generated cases rewritten; 12 user-authored cases preserved from git HEAD (0 object diffs). Fixed pre-existing invalid JSON in zoto-execute-spec/evals/evals.json (`,]` → `]`). JSON parse sweep: 11/11 OK.

## Summary table (D07)

| File | Generated rewritten | User-authored preserved | Total |
|------|--------------------:|------------------------:|------:|
| evals/commands/z-spec-create.json | 5 | 0 | 5 |
| evals/commands/z-spec-execute.json | 9 | 0 | 9 |
| evals/commands/z-spec-init.json | 4 | 0 | 4 |
| evals/commands/z-spec-judge.json | 5 | 0 | 5 |
| evals/agents/zoto-spec-executor.json | 9 | 0 | 9 |
| evals/agents/zoto-spec-generator.json | 6 | 0 | 6 |
| evals/agents/zoto-spec-judge.json | 4 | 0 | 4 |
| evals/hooks/zoto-spec-system.json | 2 | 0 | 2 |
| skills/zoto-create-spec/evals/evals.json | 5 | 4 | 9 |
| skills/zoto-execute-spec/evals/evals.json | 10 | 5 | 15 |
| skills/zoto-judge-spec/evals/evals.json | 4 | 3 | 7 |
| **Totals** | **63** | **12** | **75** |

## User-authored preservation proof (D06/D07)

| File | User case keys | Diff vs HEAD object |
|------|----------------|---------------------|
| zoto-create-spec/evals/evals.json | 1@0, 2@1, 3@2, 4@3 | 0 |
| zoto-execute-spec/evals/evals.json | 1@0–5@4 | 0 (HEAD required `,]` repair) |
| zoto-judge-spec/evals/evals.json | 1@0, 2@1, 3@2 | 0 |

## _meta proof (D05)

All 63 generated cases: source_hash/primitive_analysis/generated_by unchanged vs HEAD; last_updated refreshed to 2026-05-25T07:03:29.000Z.
<!-- status:notes:end -->
