# Subtask 07 — Eval Prompt Realism Audit — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 07 |
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
- [x] **D01** — `plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json` updated per the payload (hook cases stay framed around concrete Cursor lifecycle events). (`plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json`)
- [x] **D02** — All 9 per-skill `evals.json` files under `plugins/zoto-eval-system/skills/*/evals/` updated per the payload. (`plugins/zoto-eval-system/skills/`)
- [x] **D03** — User-authored rows (those lacking `_meta` or with `_meta.generated !== true`) are byte-identical to pre-spec state. (`specs/20260525-eval-prompt-realism-audit/status/subtask-07-eval-prompt-realism-audit-rewrite-eval-system-hooks-and-skills-20260525.status.md`)
- [x] **D04** — Generated rows carry refreshed `_meta.last_updated` + `_meta.generated_by`; `_meta.source_hash` and `_meta.primitive_analysis` preserved per Subtask 05's rule. (`plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json`)
- [x] **D05** — Per-file byte-preservation proof captured in the status report (diff hunk count = 0 for non-generated rows). (`specs/20260525-eval-prompt-realism-audit/status/subtask-07-eval-prompt-realism-audit-rewrite-eval-system-hooks-and-skills-20260525.status.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260525-eval-prompt-realism-audit/audit/apply-subtask07-rewrites.py` — Mechanical applier with JSONDecoder span extraction and user-row byte preservation
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Applied audit/eval-rewrites.json via apply-subtask07-rewrites.py from git HEAD. 60 generated cases rewritten; 23 user-authored rows byte-preserved (0 violations). zoto-advise-evals unchanged (all preserve:true).

Per-file rewrite counts: hook 4/0; advise 0/4; compare 2/2; configure 7/2; create 5/3; tooling 8/0; execute 7/3; help 13/3; judge 5/3; update 9/3 (generated/user).

Byte-preservation proof (D03/D05): user-authored spans extracted via JSONDecoder.raw_decode from git HEAD compared byte-for-byte post-write — 0 violations across 23 user rows. zoto-advise-evals byte-identical to HEAD.

_meta contract (D04): source_hash and primitive_analysis preserved on all rewritten rows; last_updated refreshed on 60 generated rows.

<!-- status:notes:end -->
