# Subtask 05 — Refactor LLM eval approach — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 05 |
| feature | Refactor LLM eval approach |
| assigned_agent | crux-software-engineer |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-08T10:50:00Z |
| last_heartbeat | 2026-05-08T10:56:47.698Z |
| completed_at | 2026-05-08T10:55:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Template emits: imports, `CASES` injection (`{{CASES_JSON}}`), `TARGET_ID` / model placeholders, **single** call into shared runner (no inlined `CaseDefinition`, no duplicate loop) (`plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`)
- [x] **D02** — `eval-stamp.ts` updated if placeholders or paths change; smoke **stamp dry-run** or unit test if available
- [x] **D03** — Plugin tests (`plugins/zoto-eval-system/tests/plugin.test.ts` or equivalent) updated if they assert on template substring literals
- [x] **D04** — Regenerate or verify **bootstrap** path `pnpm run eval:bootstrap-llm-code` / caches if documented in README (`scripts/bootstrap-llm-code-from-cache.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` — Refactored from ~240-line inlined runner to ~30-line thin file importing shared types + harness
- **modified** `plugins/zoto-eval-system/CHANGELOG.md` — Added Unreleased entry describing template/harness refactor
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
- eval-stamp.ts renderLlmCodePerPrimitiveTest() required NO changes — all placeholders are a superset of what the new template uses.
- Plugin tests (62/62 pass) had no assertions on template substring content.
- eval:update --check shows 4 pre-existing critical deltas (skill content drift), none introduced by this change.
- Bootstrap script (bootstrap-llm-code-from-cache.ts) calls stampLlmCodeStrategy which reads the template at runtime — verified compatible.
- Subtask 06 should own bulk regen of existing evals/llm/test_*.test.ts files to use the new thin pattern.

<!-- status:notes:end -->
