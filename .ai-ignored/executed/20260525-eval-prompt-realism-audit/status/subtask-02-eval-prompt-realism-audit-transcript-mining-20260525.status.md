# Subtask 02 — Eval Prompt Realism Audit — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 02 |
| feature | Eval Prompt Realism Audit |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-25T06:56:03.704Z |
| last_heartbeat | 2026-05-25T06:56:08.358Z |
| completed_at | 2026-05-25T06:56:08.358Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `specs/20260525-eval-prompt-realism-audit/audit/transcript-index.json` keyed by `target_id` (e.g. `command:z-eval-create`, `agent:zoto-eval-generator`, `hook:zoto-eval-system`) → array of `{ transcript_uuid, first_user_prompt, follow_ups, source_path }`, with each `first_user_prompt` captured **verbatim** (redaction is performed downstream).
- [x] **D02** — `specs/20260525-eval-prompt-realism-audit/audit/transcript-index.md` — short prose summary: transcripts scanned, hits per target, list of zero-coverage targets, sampling strategy notes.
- [x] **D03** — Coverage matrix at the bottom of `transcript-index.md`: rows = target ids, columns = `transcript_hits`, `recommended_seed_source` (one of `transcript` / `readme` / `skill-usage`).
- [x] **D04** — Sampling cap recorded: at most 5 distinct transcript hits per target (the rewrite needs realism, not bulk). Hits beyond 5 are truncated and the truncation is noted per target.
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `specs/20260525-eval-prompt-realism-audit/audit/transcript-index.json` — 798 transcripts scanned, 48 targets keyed
- **created** `specs/20260525-eval-prompt-realism-audit/audit/transcript-index.md` — coverage summary + matrix
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
