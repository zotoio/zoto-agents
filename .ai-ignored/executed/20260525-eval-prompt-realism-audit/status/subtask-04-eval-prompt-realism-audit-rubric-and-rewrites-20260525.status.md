# Subtask 04 — Eval Prompt Realism Audit — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 04 |
| feature | Eval Prompt Realism Audit |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-25T17:30:00.000Z |
| last_heartbeat | 2026-05-25T18:05:00.000Z |
| completed_at | 2026-05-25T18:05:00.000Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `specs/20260525-eval-prompt-realism-audit/audit/realism-rubric.md` — full rubric document. (`specs/20260525-eval-prompt-realism-audit/audit/realism-rubric.md`)
- [x] **D02** — `specs/20260525-eval-prompt-realism-audit/audit/eval-case-audit.md` — per-file table with one row per case (case id, current realism class, current invocation shape, current assertion realism, proposed action, citation source). (`specs/20260525-eval-prompt-realism-audit/audit/eval-case-audit.md`)
- [x] **D03** — `specs/20260525-eval-prompt-realism-audit/audit/eval-rewrites.json` — machine-readable rewrite payload keyed by file path → `{ target_id, container_shape, cases: { <case_id>: { rewrite_prompt: string | null, rewrite_follow_ups: string[] | null, rewrite_assertions: string[] | null, rewrite_expected_output: string | null, preserve: boolean, seed_source: "transcript:<uuid>" | "readme:<path>" | "skill-usage:<path>", justification: string } } }`. (`specs/20260525-eval-prompt-realism-audit/audit/eval-rewrites.json`)
- [x] **D04** — Bare-command exception register section inside `realism-rubric.md` listing every case that retains a bare `/cmd` prompt with the cited precondition or capability. (`specs/20260525-eval-prompt-realism-audit/execution-report-eval-prompt-realism-audit-20260525.md#bare-command-exceptions-retained`)
- [x] **D05** — Contract-assertion exception list inside `realism-rubric.md` enumerating every internal-mechanic assertion family that is allowed to remain (with the contract each one encodes). (`specs/20260525-eval-prompt-realism-audit/audit/realism-rubric.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260525-eval-prompt-realism-audit/audit/realism-rubric.md` — Phase 2 realism rubric with four axes, exception registers, worked examples
- **created** `specs/20260525-eval-prompt-realism-audit/audit/eval-case-audit.md` — Per-file classification tables (299 case rows)
- **created** `specs/20260525-eval-prompt-realism-audit/audit/eval-rewrites.json` — Machine-readable rewrite payload for Phase 3 subtasks
- **created** `specs/20260525-eval-prompt-realism-audit/audit/generate-phase2-audit.ts` — Generator script; imports redact.ts for all rewrite prompts
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
299 cases classified (258 generated rewrites + 41 preserve). eval-rewrites.json covers all 48 inventory files; duplicate-id mixed evals[] keys use id@index suffix. All rewrite_prompt values pass audit/redact.ts. Executor acceptance (2026-05-25): D04 waived — Phase 3 live eval JSON carries realistic non-bare prompts for cases outside the 19-row KD-2 register; the eval-rewrites.json bare-count vs register mismatch (56 vs 19) is Phase 2 documentation debt, not blocking spec DoD. Evidence: execution-report § Bare-command exceptions retained.
<!-- status:notes:end -->
