# Subtask 01 — Eval Prompt Realism Audit — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 01 |
| feature | Eval Prompt Realism Audit |
| assigned_agent | explore |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-25T06:55:00.000Z |
| last_heartbeat | 2026-05-25T06:57:38.222Z |
| completed_at | 2026-05-25T06:58:00.000Z |
| git_sha | e49961ff5330e60d9adf4aa48727cf8247371d5e |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `specs/20260525-eval-prompt-realism-audit/audit/eval-inventory.md` — human-readable table per scope bucket (eval-system commands / eval-system agents / eval-system hooks / eval-system skills / spec-system commands / spec-system agents / spec-system hooks / spec-system skills / cursor-top skills / workspace `.cursor/evals` / workspace `.cursor/skills`). (`specs/20260525-eval-prompt-realism-audit/audit/eval-inventory.md`)
- [x] **D02** — `specs/20260525-eval-prompt-realism-audit/audit/eval-inventory.json` — machine-readable mirror keyed by `path` → `{ container_shape: "cases[]" | "evals[]" | "mixed", target_id?: string, case_count_generated: number, case_count_user_authored: number, manifest_listed: boolean }`. (`specs/20260525-eval-prompt-realism-audit/audit/eval-inventory.json`)
- [x] **D03** — Manifest reconciliation diff — list any in-scope file the manifest does not list, and any manifest `eval_files[]` entry that points at a missing file (zero of either is the expected outcome). (`specs/20260525-eval-prompt-realism-audit/audit/eval-inventory.md`)
- [x] **D04** — Per-target case-count totals (rows: target kind; columns: generated, user-authored, total) appended to `eval-inventory.md`. (`specs/20260525-eval-prompt-realism-audit/audit/eval-inventory.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260525-eval-prompt-realism-audit/audit/eval-inventory.md` — Human-readable inventory tables, manifest reconciliation, per-target-kind totals
- **created** `specs/20260525-eval-prompt-realism-audit/audit/eval-inventory.json` — 48 path-keyed entries with container_shape, case counts, manifest_listed
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Re-verified 48 in-scope eval JSON files (299 cases: 258 generated, 41 user-authored). Container shapes: 30 cases[], 8 evals[], 10 mixed. Manifest has 47 eval_files entries; 0 broken pointers; 1 missing from manifest (zoto-cursor-top-monitor, byte-preserve per Subtask 09). git ls-files grep returns 52 paths; 4 are out-of-scope template stubs under plugins/zoto-eval-system/templates/.
<!-- status:notes:end -->
