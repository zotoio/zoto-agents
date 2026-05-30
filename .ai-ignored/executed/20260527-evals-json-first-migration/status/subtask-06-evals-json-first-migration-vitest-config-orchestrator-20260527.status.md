# Subtask 06 — evals-json-first-migration — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 06 |
| feature | evals-json-first-migration |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-29T19:10:00.000Z |
| last_heartbeat | 2026-05-29T19:18:00.000Z |
| completed_at | 2026-05-29T19:18:00.000Z |
| git_sha | 1fa87d469166c5a78ba836ca4bebb8667fcdc6fb |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Update `evals/vitest.config.ts`: (`evals/vitest.config.ts`)
- [x] **D02** — Update `package.json`: (`package.json`)
- [x] **D03** — Update `scripts/eval-orchestrate.ts`: (`scripts/eval-orchestrate.ts`)
- [x] **D04** — Update `evals/llm/_shared/zoto-llm-reporter.ts`: (`evals/llm/_shared/zoto-llm-reporter.ts`)
- [x] **D05** — Update `evals/reporters/zoto-eval-reporter.ts`: (`evals/reporters/zoto-eval-reporter.ts`)
- [x] **D06** — Smoke-test the wiring locally (without API key): (`tmp/smoke/commands/evals/sample-eval.json`)
- [x] **D07** — Document the new flow with a short paragraph at the top of `evals/vitest.config.ts` (replace the stale "subtask 08 will relocate" comment block). (`evals/vitest.config.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `evals/vitest.config.ts` — unified config with evalJsonLoader, repo-root include/exclude, dual reporters
- **modified** `package.json` — removed eval:llm; added eval:vitest; eval:static:vitest aliases to eval:vitest
- **modified** `scripts/eval-orchestrate.ts` — single eval:vitest spawn when static.framework is vitest
- **modified** `scripts/__tests__/eval-orchestrate.test.ts` — updated stubs for unified vitest dispatch
- **modified** `evals/llm/_shared/zoto-llm-reporter.ts` — path-classifier re-exports, lazy logs dir, ZotoLlmVitestReporter shim
- **modified** `evals/reporters/zoto-eval-reporter.ts` — isStaticEvalPath filter; skip empty static.yml
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Smoke (no API key): declarative-greeting skipped, runner-noop passed — exit 0.
Smoke (API key present): both cases passed — exit 0.
eval-orchestrate.test.ts: 14/14 passed — exit 0.
vitest-json-loader.test.ts: 32/32 passed — exit 0.

<!-- status:notes:end -->
