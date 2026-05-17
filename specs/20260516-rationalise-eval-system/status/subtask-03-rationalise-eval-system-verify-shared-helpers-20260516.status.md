# Subtask 03 — Rationalise Eval System — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 03 |
| feature | Rationalise Eval System |
| assigned_agent | crux-software-engineer |
| model | composer-2-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-16T12:38:00Z |
| last_heartbeat | 2026-05-16T12:42:00Z |
| completed_at | 2026-05-16T12:42:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Confirm via `Grep` that all 43 `evals/llm/test_*.test.ts` files contain `defineLlmCodeEval` exactly once (matches the count from subtask 01's audit).
- [x] **D02** — Confirm via `Grep` that no `evals/llm/test_*.test.ts` declares `interface CaseDefinition` inline. Any survivor is reported as a Blocker.
- [x] **D03** — Confirm via `Grep` that no `evals/llm/test_*.test.ts` imports from `../../_llm/*` directly. Allowed imports are `./_shared/*` and `#eval-engine/*`.
- [x] **D04** — Confirm `evals/llm/_shared/` contains exactly the five helpers from spec Decision 3: `code-strategy-case.ts`, `run-code-strategy-suite.ts`, `sandbox-helpers.ts`, `setup.ts`, `zoto-llm-reporter.ts`. Anything else is reported as a Blocker.
- [x] **D05** — Confirm `evals/llm/vitest.config.ts` registers the `#eval-engine` alias correctly.
- [x] **D06** — Update `scripts/eval-analyse.ts` so its comment near line ~1011 references `plugins/zoto-eval-system/engine/analyser-payload.ts` instead of `evals/_llm/analyser-payload.ts`. Cosmetic edit — no functional change. (`scripts/eval-analyse.ts`)
- [x] **D07** — Update `evals/llm/test_skill_zoto-configure-evals.test.ts`'s assertion text near line ~24 from `evals/_llm/manifest-snapshot.ts` to `#eval-engine/manifest-snapshot.js`. Also fixed evals.json source and bonus-fixed test_command_z-eval-configure.test.ts (F-08 second file). (`evals/llm/test_skill_zoto-configure-evals.test.ts`)
- [x] **D08** — Re-grep after the two edits to confirm zero remaining stale references in non-doc files (specs and cached analyser payloads are out of scope).
- [x] **D09** — Run `ReadLints` on touched files; resolve any introduced errors.
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `scripts/eval-analyse.ts` — D06: comment fix line 1011
- **modified** `evals/llm/test_skill_zoto-configure-evals.test.ts` — D07: assertion text fix line 24 (in-place)
- **modified** `plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json` — D07: evals.json source fix
- **modified** `evals/llm/test_command_z-eval-configure.test.ts` — D07 bonus: F-08 second file assertion fix line 60 (in-place)
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
All 9 deliverables completed. Verification confirmed 43 defineLlmCodeEval matches, 0 inline CaseDefinition, 0 direct _llm imports, exactly 5 _shared helpers, correct vitest alias. Three surgical edits fixed stale evals/_llm/manifest-snapshot.ts references (2 test files + 1 script comment) and the evals.json source. Re-stamp not used — CLI lacks targeted LLM code-strategy mode; in-place edits used per subtask fallback. No new linter errors.

<!-- status:notes:end -->
