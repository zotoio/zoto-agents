# Subtask 02 — Eval AskQuestion Strategy Bridge — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 02 |
| feature | Eval AskQuestion Strategy Bridge |
| assigned_agent | explore |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-26T00:00:00.000Z |
| last_heartbeat | 2026-05-25T15:18:20.477Z |
| completed_at | 2026-05-26T00:16:00.000Z |
| git_sha | e49961f |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `specs/20260526-eval-askquestion-strategy-bridge/audit/eval-corpus-inventory.md` — human-readable table listing every target id (from `.zoto/eval-system/manifest.yml#targets[]`), the source path, the present `eval_files[]`, the stamped `evals/llm/test_<kind>_<name>.test.ts` (if any), and the heuristic classification (`interaction_evidence` field citing the source line that contains `AskQuestion` / `askQuestion`, or `none`). (`specs/20260526-eval-askquestion-strategy-bridge/audit/eval-corpus-inventory.md`)
- [x] **D02** — `specs/20260526-eval-askquestion-strategy-bridge/audit/eval-corpus-baseline.json` — machine-readable mirror keyed by `target_id` → `{ kind, source_path, eval_files: [...], llm_test_path: string | null, requires_interaction: boolean, interaction_style: "command-owned" | "subagent-escalated" | "none", interaction_evidence: string[], generated_case_count: number, user_authored_case_count: number, migration_class: "migrate-to-declarative" | "keep-code-bridge-only" | "user-authored-byte-preserve" | "no-eval-yet" }`. (`specs/20260526-eval-askquestion-strategy-bridge/audit/eval-corpus-baseline.json`)
- [x] **D03** — Migration-class summary appended to `eval-corpus-inventory.md` (rows: kind; columns: each migration_class; cells: count). (`specs/20260526-eval-askquestion-strategy-bridge/audit/eval-corpus-inventory.md#migration-class-by-kind`)
- [x] **D04** — Reconciliation note: every `evals/llm/test_*.test.ts` file is accounted for in the baseline JSON; every manifest target either has a stamped LLM test or is documented as `no-eval-yet`. (`specs/20260526-eval-askquestion-strategy-bridge/audit/eval-corpus-inventory.md#reconciliation`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/eval-corpus-inventory.md` — Human-readable inventory table plus migration summary for 52 manifest targets
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/eval-corpus-baseline.json` — Machine-readable baseline keyed by target_id (43 LLM tests reconciled)
- **created** `specs/20260526-eval-askquestion-strategy-bridge/audit/build-eval-corpus-baseline.py` — Regenerates inventory and baseline from manifest plus static source scan
- **modified** `specs/20260526-eval-askquestion-strategy-bridge/audit/build-eval-corpus-baseline.py` — Emit eval_files[] column in inventory table
- **modified** `specs/20260526-eval-askquestion-strategy-bridge/audit/eval-corpus-inventory.md` — Regenerated with eval_files[] column per target
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Manifest lists 52 targets (not 56). Cross-checked pnpm run eval:list total=299. Migration totals: keep-code-bridge-only=32, migrate-to-declarative=11, no-eval-yet=9, user-authored-byte-preserve=0.
<!-- status:notes:end -->
