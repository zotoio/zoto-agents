# Subtask 12 — Eval Prompt Realism Audit — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 12 |
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
- [x] **D01** — For each `(target_id, kind)` in `audit/eval-rewrites.json` whose `preserve` is `false`, locate the matching cached analyser payload at `.zoto/eval-system/cache/analyser/*.json` via target_id match (loader at `plugins/zoto-eval-system/engine/update.ts:1322–1329`) and update its `cases[].prompt`, `cases[].assertions[]`, `cases[].expected_output`, `cases[].follow_ups` (if present), and `cases[].scenario` (if newly named) to mirror the Phase 3 rewrites. Preserve `schema_version`, `analyser_version`, `model_id`, `target_id`, `kind`, `source_path`, `source_hash`, `summary`, and `fixtures` blocks verbatim. (`.zoto/eval-system/cache/analyser/fb6c6130928650cea7923fc4712caa097ca47567f4631a58a68df180c80c5bd5.json`)
- [x] **D02** — Run `pnpm run eval:update --apply --no-analyser --overwrite` (the `--overwrite` flag is required to re-stamp test files whose first-line guard already reads `// _meta.generated: true`). Capture stdout + exit code in the status report. (`/tmp/eval-restamp.log`)
- [x] **D03** — Verify `git diff --stat evals/llm/test_*.test.ts` shows only `CASES[]` body changes; the first-line `// _meta.generated: true` guard MUST be unchanged on every modified file. (`evals/llm/test_*.test.ts`)
- [x] **D04** — Verify `git diff --stat evals/test_*.test.ts` shows only embedded-case changes if the static-vitest backend has any stamped files; same first-line guard discipline applies.
- [x] **D05** — Confirm no file outside `.zoto/eval-system/cache/analyser/`, `evals/llm/`, `evals/` (root test files only) is touched.
- [x] **D06** — Confirm `.zoto/eval-system/manifest.yml` / `manifest.history.yml` are NOT touched by this subtask (those remain Subtask 11's exclusive responsibility).
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `specs/20260525-eval-prompt-realism-audit/audit/apply-cache-rewrites.py` — Fixed case mapping via (prompt, follow_ups) + central eval id; removed prompt-first dedup
- **created** `specs/20260525-eval-prompt-realism-audit/audit/restamp-llm-from-cache.ts` — Auxiliary LLM code-backend restamp via regenerateLlmCode()
- **created** `/tmp/apply-cache-rewrites-v3.log` — Fixed apply-cache-rewrites.py stdout (15 cache files, 59 case bodies)
- **created** `/tmp/eval-restamp.log` — eval:update --apply --no-analyser --overwrite stdout + exit=0
- **created** `/tmp/restamp-llm-v3.log` — restamp-llm-from-cache.ts stdout (15 LLM test files rewritten)
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Judge fix (prompt-first dedup): `apply-cache-rewrites.py` now maps cache cases by explicit
`scenario`, then `(rewrite_prompt, rewrite_follow_ups)` signature, then central eval JSON
`(prompt, follow_ups)` for the numeric case id — never prompt-only. Re-run touched 15 cache
files / 59 case bodies (the 15 command targets that previously net-zeroed). Example:
`command:z-eval-advise` cache case 1 now has 9 assertions (was 5).

`restamp-llm-from-cache.ts` re-stamped 15 LLM test files from the corrected cache.
`pnpm run eval:update --apply --no-analyser --overwrite` captured in `/tmp/eval-restamp.log`
(exit=0, regenerated_targets=0 — no manifest drift; LLM restamp via auxiliary script).

S12 blocker fix (generator S06 reframe): synced `agent:zoto-eval-generator` cache
(`fb6c6130…c5bd5.json`) cases 1/4 prompts and `evals/llm/test_agent_zoto-eval-generator.test.ts`
to central JSON source of truth (case 1 "From /z-eval-create, you were asked…"; case 4
"After /z-eval-create finished approvals…"). Assertions unchanged; analyser_version untouched.

Parity spot-check (assertion-count multiset vs central JSON):
- command:z-eval-advise: central [9,5,5,4,4,5,5,5,5] = test [9,5,5,4,4,5,5,5,5] ✓
- agent:zoto-eval-analyser-subagent: central [9,6,6,6,6,6] = test [9,6,6,6,6,6] ✓
- agent:zoto-eval-generator: central case 1/4 prompts = cache = test ✓; assertion counts [5,17,9,7,5] ✓

First-line `// _meta.generated: true` guard intact on all 43 LLM test files (32/32 modified
files verified). Manifest diff reverted after eval:update (`git checkout -- manifest*.yml`).
Cache JSON parse sweep OK. No `analyser_version` bumps.

<!-- status:notes:end -->
