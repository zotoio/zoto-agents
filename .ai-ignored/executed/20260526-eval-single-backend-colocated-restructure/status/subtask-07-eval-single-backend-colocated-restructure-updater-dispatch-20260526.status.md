# Subtask 07 — Eval Single Backend & Co-located Restructure — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 07 |
| feature | Eval Single Backend & Co-located Restructure |
| assigned_agent | zoto-eval-engineer |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | pending |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [ ] **D01** — `plugins/zoto-eval-system/engine/update.ts` — `resolveLlmStrategyFromOpts` removed (lines ~1307–1313 per exploration); `dispatchRegeneration` (lines ~1321–1344) collapses into a single `regenerate(target, opts)` call site
- [ ] **D02** — `engine/update.ts` — `regenerateLlmCode` (lines ~934–985) and `regenerateLlmDeclarative` (lines ~1038+) merged into a single `regenerateLlm` function. The merged function calls `stampLlmTarget` (subtask 06's renamed function) and the per-target path resolver
- [ ] **D03** — `engine/update.ts` — `llmCodeTestPathForTarget` (lines ~1373–1386) renamed to `llmTestPathForTarget`; the returned path matches the new co-located pattern (`<kind>/evals/<name>.test.ts`)
- [ ] **D04** — `engine/update.ts` — drift detection (the function that diffs manifest `eval_files[]` against on-disk files) is updated to recognise the new co-located paths AND emit a clear "drift: file at LEGACY path `evals/llm/test_*.test.ts` should be at `<new>`" message when the legacy file still exists (this message guides subtask 08's migration)
- [ ] **D05** — `engine/update.ts` — `regenerateVitest/Pytest/Jest` (the static framework regenerators) keep their separate dispatch — they are NOT in scope for this collapse
- [ ] **D06** — Updater test file(s) under `plugins/zoto-eval-system/engine/__tests__/` or `scripts/__tests__/eval-update-*.test.ts` — drop strategy-branch test fixtures; ADD tests for the new path pattern + legacy-drift detection message
- [ ] **D07** — `engine/update.ts` — verify the `_meta.generated === true` case-level guard and the `// _meta.generated: true` file-level guard still gate every `--apply` write (per `_user-case-guards.ts` lines 7–10 references — KD-7)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
