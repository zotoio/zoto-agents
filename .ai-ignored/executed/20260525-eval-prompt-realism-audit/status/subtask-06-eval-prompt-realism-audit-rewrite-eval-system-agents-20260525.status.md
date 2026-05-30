# Subtask 06 — Eval Prompt Realism Audit — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 06 |
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
- [x] **D01** — All 8 files under `plugins/zoto-eval-system/evals/agents/*.json` updated per `audit/eval-rewrites.json`. (`plugins/zoto-eval-system/evals/agents/`)
- [x] **D02** — Each rewritten generated case carries a refreshed `_meta.last_updated`; `_meta.generated_by` remains the existing stable string `"zoto-update-evals"` (per user decision 2026-05-25 — see spec KD-7); `_meta.source_hash` and `_meta.primitive_analysis` are preserved verbatim (per Subtask 05's "Source-hash recomputation rule"). (`plugins/zoto-eval-system/evals/agents/zoto-eval-generator.json`)
- [x] **D03** — Each rewritten generated case retains `_meta.generated: true`. (`plugins/zoto-eval-system/evals/agents/`)
- [x] **D04** — Top-level `target_id` preserved per file. (`plugins/zoto-eval-system/evals/agents/`)
- [x] **D05** — Per-file byte-preservation proof for user-authored cases written to the status report. (`specs/20260525-eval-prompt-realism-audit/status/subtask-06-eval-prompt-realism-audit-rewrite-eval-system-agents-20260525.status.md`)
- [x] **D06** — Summary table in the status report mirrors Subtask 05's shape. (`specs/20260525-eval-prompt-realism-audit/status/subtask-06-eval-prompt-realism-audit-rewrite-eval-system-agents-20260525.status.md`)
- [x] **D07** — Agent prompt style across rewrites obeys the analyser contract's `kind: agent` row: natural-English delegation, no leading `/`, ideally mirroring how a parent command would hand off (e.g. `From /z-eval-create, please continue stamping the approved skill bundle once the configurer's needs_user_input is satisfied; …`). (`plugins/zoto-eval-system/evals/agents/zoto-eval-generator.json`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/evals/agents/zoto-eval-adviser.json` — 
- **modified** `plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json` — 
- **modified** `plugins/zoto-eval-system/evals/agents/zoto-eval-comparer.json` — 
- **modified** `plugins/zoto-eval-system/evals/agents/zoto-eval-configurer.json` — 
- **modified** `plugins/zoto-eval-system/evals/agents/zoto-eval-executor.json` — 
- **modified** `plugins/zoto-eval-system/evals/agents/zoto-eval-generator.json` — 
- **modified** `plugins/zoto-eval-system/evals/agents/zoto-eval-judge.json` — 
- **modified** `plugins/zoto-eval-system/evals/agents/zoto-eval-updater.json` — 
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Applied audit/eval-rewrites.json to all 8 agent eval files (47 generated cases). Judge fix pass (2026-05-25): zoto-eval-generator.json — all 5 cases now carry generated_by zoto-update-evals; primitive_analysis restored from git HEAD (analysed_at 2026-05-17T13:36:46.889Z); cases 1 and 4 prompts reframed with "From …" / "After …" so no prompt starts with `/`. zoto-eval-analyser-subagent.json generated_by left to Subtasks 10/12 (S10 guard assertions + S12 cache/restamp own that file). Zero user-authored cases across all 8 files.

## Summary table (D06)

| File | target_id | Generated rewritten | User-authored preserved | Byte-proof |
|------|-----------|--------------------:|------------------------:|------------|
| evals/agents/zoto-eval-adviser.json | agent:zoto-eval-adviser | 6 | 0 | ok |
| evals/agents/zoto-eval-analyser-subagent.json | agent:zoto-eval-analyser-subagent | 6 | 0 | ok |
| evals/agents/zoto-eval-comparer.json | agent:zoto-eval-comparer | 3 | 0 | ok |
| evals/agents/zoto-eval-configurer.json | agent:zoto-eval-configurer | 10 | 0 | ok |
| evals/agents/zoto-eval-executor.json | agent:zoto-eval-executor | 4 | 0 | ok |
| evals/agents/zoto-eval-generator.json | agent:zoto-eval-generator | 5 | 0 | ok |
| evals/agents/zoto-eval-judge.json | agent:zoto-eval-judge | 3 | 0 | ok |
| evals/agents/zoto-eval-updater.json | agent:zoto-eval-updater | 10 | 0 | ok |
| **Totals** | | **47** | **0** | **ok (vacuous)** |
<!-- status:notes:end -->
