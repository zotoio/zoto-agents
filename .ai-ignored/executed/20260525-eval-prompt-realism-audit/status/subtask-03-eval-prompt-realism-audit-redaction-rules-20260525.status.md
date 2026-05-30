# Subtask 03 — Eval Prompt Realism Audit — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 03 |
| feature | Eval Prompt Realism Audit |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-25T06:55:05.134Z |
| last_heartbeat | 2026-05-25T16:59:30.000Z |
| completed_at | 2026-05-25T16:58:29.000Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `specs/20260525-eval-prompt-realism-audit/audit/redaction-rules.md` — one section per rule with the literal regex, the rationale, and a worked input → output example.
- [x] **D02** — `specs/20260525-eval-prompt-realism-audit/audit/redact.ts` — exports `redact(text: string): string` and `redactPath(p: string): string`; the helper is pure (no I/O, no globals), runs under `tsx` with no extra dependencies, and is < 200 lines.
- [x] **D03** — `specs/20260525-eval-prompt-realism-audit/audit/redact.test.ts` — Vitest-compatible self-test (or a tiny `tsx` `assert`-based script) that exercises each rule against the worked examples from the rules document. Runs in < 5 seconds.
- [x] **D04** — Self-test command line and exit code captured in this subtask's execution notes.
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `specs/20260525-eval-prompt-realism-audit/audit/redaction-rules.md` — gh_pat_ suffix minimum lowered to 5 chars
- **modified** `specs/20260525-eval-prompt-realism-audit/audit/redact.ts` — gh_pat_ regex {20,} → {5,}
- **modified** `specs/20260525-eval-prompt-realism-audit/audit/redact.test.ts` — DoD email+token assertion with gh_pat_AAAAA
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Judge fix applied: rule 4 gh_pat_ suffix minimum reduced from 20 to 5 characters so DoD string redact("Email me at andrew@example.com with token gh_pat_AAAAA") yields "Email me at <email> with token <token>". Self-test: npx vitest run specs/20260525-eval-prompt-realism-audit/audit/redact.test.ts --run → exit 0, 12/12 passed in 290ms.
<!-- status:notes:end -->
