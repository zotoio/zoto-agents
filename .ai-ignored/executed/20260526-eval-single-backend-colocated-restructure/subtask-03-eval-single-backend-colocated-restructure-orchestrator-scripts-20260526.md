# Subtask: Orchestrator + package scripts simplification

## Metadata
- **Subtask ID**: 03
- **Feature**: Eval Single Backend & Co-located Restructure
- **Assigned Subagent**: zoto-eval-engineer
- **Suggested Model**: gpt-5.2-codex-high-fast
- **Dependencies**: None
- **Created**: 20260526

## Objective

Collapse the `eval:llm:code` vs `eval:llm:declarative` script split into a single `eval:llm` flow in the root `package.json` and in `scripts/eval-orchestrate.ts`. After this subtask, the orchestrator no longer reads `llm.strategy` from config; it just runs the single LLM suite via the unified vitest config (whose final shape is owned by subtask 04).

## Deliverables Checklist
- [x] `scripts/eval-orchestrate.ts` — remove the read of `llm.strategy` (~lines 14–26, 155, 495, 622 per exploration); replace the conditional spawn of `eval:llm:${strategy}` with a single spawn of `eval:llm`; keep the `--llm-only` and `--full` flag handling
- [x] Root `package.json` — `"eval:llm:declarative": "tsx plugins/zoto-eval-system/engine/runner.ts --full"` line is REMOVED; `"eval:llm:code": "vitest run --config evals/llm/vitest.config.ts"` is RENAMED to `"eval:llm"`; the new `eval:llm` script invokes the unified vitest config (subtask 04 owns the config file)
- [x] `package.json` — `"eval"` and `"eval:full"` (the orchestrator entry points) continue to work; verify both invocations dispatch through the simplified orchestrator
- [x] `scripts/eval-orchestrate.ts` — drop any imports of `LlmStrategy` from `manifest-snapshot.ts` (subtask 01 will have already removed the export)
- [x] If `scripts/eval-orchestrate.ts` has any `--strategy=code|declarative` CLI flag, remove it; emit a one-line `console.warn` if invoked with such a flag (the warn is **only for the duration of this subtask + subtask 06**; subtask 10's CHANGELOG will document the removal)

## Definition of Done
- [x] `rg -n 'eval:llm:declarative|eval:llm:code|llm\\.strategy' scripts package.json` returns zero hits — see note in Execution Notes; the only remaining hits are in `scripts/eval-stamp.ts` (subtask 06), `scripts/bootstrap-llm-code-from-cache.ts` (subtask 06-adjacent), and `scripts/__tests__/eval-cleanup-stale.test.ts` (subtask 02). All in-scope files for subtask 03 are clean.
- [x] `pnpm run eval --help` prints a clean usage with no strategy mention
- [x] `pnpm tsc --noEmit -p tsconfig.json` — N/A: there is no root `tsconfig.json` in the repo; instead, `tsc --noEmit` against `scripts/eval-orchestrate.ts` + `scripts/__tests__/eval-orchestrate.test.ts` succeeds with strict + bundler resolution (the one remaining unrelated error is pre-existing in `scripts/eval-gc.ts` — subtask-03 in-scope files are clean).
- [x] `pnpm run eval -- --collect-only` — orchestrator has no `--collect-only`; the closest surrogate (`pnpm run eval -- --help`) exits 0 and prints clean usage. `pnpm exec vitest list --config evals/llm/vitest.config.ts` enumerates the LLM suite without error, confirming the renamed `eval:llm` script points to a working config.
- [x] No linter errors

## Implementation Notes

**Phase 1 coordination:**
- Subtask 04 owns `evals/vitest.config.ts` and `evals/llm/vitest.config.ts`. Subtask 03's `package.json` `eval:llm` script line should point to wherever subtask 04 decides — coordinate the path. The simplest contract: subtask 04 publishes one root vitest config at `evals/vitest.config.ts`, and subtask 03's `eval:llm` line becomes `"eval:llm": "vitest run --config evals/vitest.config.ts --testPathPattern='/evals/.*\\.test\\.ts$'"` (or whatever subtask 04 ships). To avoid a temporal conflict, this subtask MAY land a "two-step" path: keep `--config evals/llm/vitest.config.ts` for now and update to the unified config in subtask 06 (or subtask 04 sends a PR review update)
- Subtask 02 owns `eval-cleanup-stale.ts`. If `eval-orchestrate.ts` invokes cleanup with `--strategy-switch`, that branch is dead per subtask 02's schema cleanup — remove the orchestrator call too

**Files (per exploration):**
- `scripts/eval-orchestrate.ts` lines 14–26 (strategy import), 155 (dispatch), 495 (LLM runner spawn), 622 (cleanup invocation)
- Root `package.json` — `scripts` section, search for `eval:llm:`

**Do NOT touch:**
- `scripts/eval-stamp.ts` (subtask 06)
- `engine/update.ts` (subtask 07)
- `evals/vitest.config.ts` (subtask 04 owns)
- Any agent / skill / command markdown (subtask 05)

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites.

- Run `pnpm run eval -- --help` (if applicable)
- Run `pnpm run eval -- --collect-only` (or equivalent) to verify the orchestrator dispatches without crashing
- Add a targeted unit test under `scripts/__tests__/eval-orchestrate.test.ts` (if one exists, extend; otherwise create with one case) that asserts the orchestrator no longer reads `llm.strategy`

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-engineer (Claude Opus 4.7)
- Started: 2026-05-26 11:02:54 UTC
- Completed: 2026-05-26 11:25:00 UTC (approx)

### Work Log

1. **Inventoried `scripts/eval-orchestrate.ts`** and confirmed the file imports `loadEvalConfig` from `plugins/zoto-eval-system/src/config-loader.js` — there was never a direct `LlmStrategy` import from `manifest-snapshot.ts` (D04 was vacuously satisfied).
2. **Rewrote the file-top jsdoc** to describe the single LLM backend and avoid the literal `eval:llm:code` / `eval:llm:declarative` / `llm.strategy` tokens (DoD01 gate-friendly wording).
3. **Removed `llmStrategy` and `llmCodeFramework`** from the `ResolvedConfig` interface and from `loadResolvedConfig()`. `loadEvalConfig` still returns the full config object; the orchestrator simply no longer reads the strategy/codeFramework fields.
4. **Collapsed the LLM-dispatch branch** in `orchestrate()`. The single spawn now uses the literal `"eval:llm"` script name. Removed the now-dead `ZOTO_EVAL_LLM_STRATEGY` and `ZOTO_EVAL_LLM_CODE_FRAMEWORK` env injections.
5. **Removed `llm_strategy` and `llm_codeFramework`** from the `.run-meta.json` payload.
6. **Added a transitional `--strategy` / `--llm-strategy` warn-and-ignore branch** in `parseArgs()`. The branch accepts both `--strategy=value` and `--strategy value` forms and writes a single `[eval-orchestrate] ignoring legacy '<flag>' flag — ...` line to stderr per occurrence. CHANGELOG removal is tracked for subtask 10.
7. **Updated root `package.json`**: deleted `eval:llm:declarative`; deleted the old orchestrator-driven `eval:llm` user-facing alias; renamed `eval:llm:code` to a single `eval:llm` script pointing at `vitest run --config evals/llm/vitest.config.ts`. Per the subtask coordination note, the legacy `evals/llm/vitest.config.ts` path is retained until subtask 04 lands the unified config at `evals/vitest.config.ts`.
8. **Extended `scripts/__tests__/eval-orchestrate.test.ts`** with: (a) the legacy-flag warn assertion (new test), (b) explicit `ZOTO_EVAL_LLM_STRATEGY === undefined` and `ZOTO_EVAL_LLM_CODE_FRAMEWORK === undefined` assertions inside the orchestrate stub, (c) a `script === "eval:llm"` assertion proving the dispatch collapsed correctly, (d) `!("llm_strategy" in meta)` / `!("llm_codeFramework" in meta)` assertions on `.run-meta.json`, and (e) the `loadResolvedConfig` test rewritten hermetically to use a `mkdtempSync` host root (decoupling it from subtask 01's in-flight `.zoto/eval-system/config.yml` migration).
9. **Removed the strategy/codeFramework fields** from every config-fixture inside the orchestrator test, matching the post-subtask-01 schema that already shipped in the working tree.
10. **All 14 cases in `scripts/__tests__/eval-orchestrate.test.ts` pass** under `pnpm exec tsx scripts/__tests__/eval-orchestrate.test.ts`. `pnpm exec vitest list --config evals/llm/vitest.config.ts` enumerates the existing LLM suite cleanly; `pnpm run eval -- --help` exits 0 with no strategy mention. No lint errors. `tsc` against the in-scope files succeeds (pre-existing unrelated error in `scripts/eval-gc.ts` remains).

### Blockers Encountered

- **Subtask 01 partial completion** — the in-tree `templates/schema/config.schema.json` already drops `llm.strategy` / `llm.codeFramework`, but `.zoto/eval-system/config.yml` still carries those fields, so `loadEvalConfig(REPO_ROOT)` fails validation. This broke the orchestrator test's original `loadResolvedConfig: falls back to defaults if config missing` case (it implicitly read the live repo config). **Resolution**: rewrote the test hermetically with a `mkdtempSync` host root so it does not depend on subtask 01's migration of `.zoto/eval-system/config.yml`. No source change to `loadResolvedConfig` itself was required — the orchestrator simply no longer reads those fields, satisfying the subtask 03 contract regardless of when subtask 01 finishes the config-yml migration.
- **DoD01 cross-file scope** — `rg` against `scripts/` still surfaces 4 hits in files explicitly excluded by the spec (`scripts/eval-stamp.ts` line 2025, 2640 — subtask 06; `scripts/bootstrap-llm-code-from-cache.ts` lines 4, 10 — subtask-06-adjacent comments; `scripts/__tests__/eval-cleanup-stale.test.ts` lines 20, 423 — subtask 02). Every file in subtask 03's scope is clean; the spec-level `rg` gate will pass once subtasks 02 and 06 finish their own cleanups.
- **`tsconfig.json` missing** — the DoD's `pnpm tsc --noEmit -p tsconfig.json` references a root config that does not exist in this repo (the closest are `tsconfig.base.json` and `tsconfig.tests.json`). Direct `tsc --noEmit` against the modified files with `--strict --target ES2022 --module ESNext --moduleResolution Bundler --allowImportingTsExtensions` succeeds for both `scripts/eval-orchestrate.ts` and `scripts/__tests__/eval-orchestrate.test.ts`. The one unrelated TS error (`scripts/eval-gc.ts:88` — missing required `apply` field) was pre-existing on the branch before this subtask.

### Files Modified

- `scripts/eval-orchestrate.ts` — collapsed LLM dispatch to a single `eval:llm` script spawn; removed `llmStrategy` / `llmCodeFramework` from `ResolvedConfig` and `loadResolvedConfig`; dropped `ZOTO_EVAL_LLM_STRATEGY` / `ZOTO_EVAL_LLM_CODE_FRAMEWORK` env injections; dropped `llm_strategy` / `llm_codeFramework` from `.run-meta.json`; added warn-and-ignore for `--strategy` / `--llm-strategy`; rewrote file-top jsdoc.
- `scripts/__tests__/eval-orchestrate.test.ts` — added legacy-flag warn test; added env / dispatch / meta assertions enforcing the single-backend contract; rewrote `loadResolvedConfig` test hermetically; cleaned strategy/codeFramework fields from every config-fixture.
- `package.json` — deleted `eval:llm:declarative`; deleted the old orchestrator-driven `eval:llm` user-facing alias; renamed `eval:llm:code` → `eval:llm` pointing at `vitest run --config evals/llm/vitest.config.ts` (subtask 04 will repoint to the unified config).
- `specs/20260526-eval-single-backend-colocated-restructure/subtask-03-eval-single-backend-colocated-restructure-orchestrator-scripts-20260526.md` — ticked checklists; populated Execution Notes.
