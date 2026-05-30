# Subtask: Vitest config restructure for co-located tests

## Metadata
- **Subtask ID**: 04
- **Feature**: Eval Single Backend & Co-located Restructure
- **Assigned Subagent**: zoto-eval-engineer
- **Suggested Model**: gpt-5.2-codex-high-fast
- **Dependencies**: None
- **Created**: 20260526

## Objective

Restructure `evals/vitest.config.ts` so it picks up co-located eval tests at `<kind>/evals/*.test.ts` across `plugins/`, `.cursor/`, and the legacy `evals/` root, while preserving the existing reporter wiring (`evals/reporters/zoto-eval-reporter.ts` for static smoke tests, `evals/llm/_shared/zoto-llm-reporter.ts` for LLM tests). Remove `evals/llm/vitest.config.ts` (or repurpose into a thin re-export) so a single config drives the entire eval suite. The actual co-located test files don't exist yet — subtask 08 creates them — but this subtask ships the config that WILL find them.

## Deliverables Checklist
- [x] `evals/vitest.config.ts` — `root: path.resolve(__dirname, "..")` (the repo root); `include: ["**/evals/*.test.ts", "evals/*.test.ts", "evals/smoke-static-eval.test.ts"]`; `exclude: ["**/node_modules/**", "**/_runs/**", "**/fixtures/**", "**/_llm/**", "evals/llm/_shared/**", "evals/llm/test_*.test.ts"]` (the last exclude prevents the migration window — when both old `evals/llm/test_*.test.ts` and new co-located files exist — from running tests twice; subtask 08 removes those old files and the exclude becomes a no-op)
- [x] `evals/vitest.config.ts` — keep the `setupFiles: ["./evals/setup.ts"]` (rewritten relative to the new repo-root `root`) and the existing reporter wiring (both `default` and `./evals/reporters/zoto-eval-reporter.ts`)
- [x] `evals/vitest.config.ts` — add the `#eval-engine` alias from the old `evals/llm/vitest.config.ts` (`resolve.alias` mapping to `plugins/zoto-eval-system/engine`) so co-located tests can import the engine without long relative paths
- [x] `evals/vitest.config.ts` — add the LLM reporter (`evals/llm/_shared/zoto-llm-reporter.ts`) to the `reporters` array as the `ZotoLlmVitestReporter` default-exported shim. Path partitioning is implemented in BOTH reporters (`isStaticEvalPath` + `isLlmCoLocatedPath`) so static cases never reach `llm.yml` and co-located LLM cases never reach `static.yml`.
- [x] `evals/llm/vitest.config.ts` — DELETED (the cleaner option per the deliverable). The `eval:llm:code` script in `package.json` will be re-wired by subtask 03 / 06.
- [x] Verify `evals/reporters/zoto-eval-reporter.ts` still writes `evals/_runs/<runId>/static.yml` (no path change in this subtask). The LLM reporter still writes `evals/_runs/<ts>/llm.yml` and `logs/`; the `logs/` directory is now lazily created on the first `reportCase` call to avoid stub directories during static-only runs.
- [x] Reporter partitioning verified via a temporary probe at `plugins/zoto-eval-system/agents/evals/__subtask04-glob-probe.test.ts`: the file was discovered by the include glob, the static reporter filtered it out (224 case rows in `static.yml`, no probe case), and no `llm.yml` or `logs/` directory was produced because the probe did not call `reportCase`. Probe file deleted after verification.
- [x] Smoke run: `pnpm vitest run --config evals/vitest.config.ts` against the CURRENT layout exits 0 and executes smoke + the 4 legacy stamped pilots (`evals/test_agent_*` / `evals/test_skill_*`). The `evals/llm/test_*.test.ts` files are excluded as required. (Note: this satisfies DoD01/DoD03 which both expect the 4 stamped pilots to be picked up; the "only smoke" wording in the original deliverable is a contradiction with DoD01 — the spec's intent of "smoke + 4 stamped pilots until subtask 08 relocates them" is honoured.)

## Definition of Done
- [x] `pnpm vitest run --config evals/vitest.config.ts` exits 0 against the current repo: 5 test files (smoke + 4 stamped pilots), 224 tests passing, ~700ms wall time.
- [x] `pnpm tsc --noEmit -p tsconfig.json` — no such tsconfig exists at the repo root. Equivalent type-check against my modified files (`evals/vitest.config.ts`, `evals/reporters/zoto-eval-reporter.ts`, `evals/llm/_shared/zoto-llm-reporter.ts`) was run via a temporary tsconfig with `paths.#eval-engine` mapped; the only diagnostic emitted is the pre-existing `evals/llm/_shared/sandbox-helpers.ts(21,8): error TS2305: Module '"../../_llm/sandbox.js"' has no exported member 'CaseFixtures'` which is in HEAD (verified by stashing my changes and re-running — same error). My changes introduce no new TS diagnostics.
- [x] The vitest config picks up `evals/test_agent_agent_zoto-eval-analyser-subagent.test.ts` (and the three sibling stamped pilots) per the verbose run above.
- [x] `evals/llm/vitest.config.ts` deleted.
- [x] No linter errors on the three modified files (`ReadLints` clean).

## Implementation Notes

**Coordination with subtask 03 (orchestrator):**
- Subtask 03 sets `"eval:llm": "vitest run --config evals/vitest.config.ts"` in `package.json`. This subtask MUST keep `evals/vitest.config.ts` as the single config path. If you decide a different path makes more sense (e.g. `evals.config.ts` at repo root), coordinate with subtask 03 owner before changing

**Reporter partitioning** — the trickiest part of this subtask:
- Today, the static reporter is the *only* reporter on `evals/vitest.config.ts` and the LLM reporter is the only one on `evals/llm/vitest.config.ts`. Merging both means each reporter must decide per-file whether it cares
- Option A (recommended): both reporters receive every test event; each filters by `test.file?.filepath` regex. Static reporter only acts on `evals/smoke-*.test.ts` or anything outside the `**/evals/*.test.ts` co-location glob. LLM reporter acts on co-located paths
- Option B: introduce a new `eval-kind` env var or test annotation. More invasive; prefer Option A

**Vitest API note**: `include` is repo-root-relative when `root` is set; verify glob semantics with `vitest --list` before declaring done

**Files (per exploration):**
- `evals/vitest.config.ts` (rewrite — full file)
- `evals/llm/vitest.config.ts` (delete or stub)
- `evals/reporters/zoto-eval-reporter.ts` (extend partition logic — small change)
- `evals/llm/_shared/zoto-llm-reporter.ts` (extend partition logic — small change)

**Do NOT touch:**
- Any stamped test file (subtask 08)
- `evals/llm/_shared/run-code-strategy-suite.ts` (subtask 06 renames)
- `engine/update.ts` (subtask 07)
- `scripts/eval-stamp.ts` (subtask 06)

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites.

- `pnpm vitest run --config evals/vitest.config.ts --reporter=verbose` — confirm the discovered file list
- `pnpm vitest --list --config evals/vitest.config.ts` — confirm the include globs resolve as intended
- Run `evals/smoke-static-eval.test.ts` directly to confirm static reporter still emits `static.yml`
- Pick ONE existing `evals/test_agent_agent_*.test.ts` file and run it; verify the LLM reporter does NOT pick it up (it's not at a co-located path) and the static reporter DOES (it's a stamped per-primitive test until subtask 08 relocates it)

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-engineer
- Started: 2026-05-26 11:06 UTC
- Completed: 2026-05-26 11:23 UTC

### Work Log
- 11:06 UTC — Read subtask, parent spec (KD-10), and the four files in scope (`evals/vitest.config.ts`, `evals/llm/vitest.config.ts`, `evals/reporters/zoto-eval-reporter.ts`, `evals/llm/_shared/zoto-llm-reporter.ts`).
- Confirmed `zoto-llm-reporter.ts` is invoked by test code via `reportCase`/`reportSuite` calls (not a vitest `Reporter` class). Designed a dual-path partitioning: static reporter filters by `testCase.module.moduleId`; LLM reporter gains a default-exported `ZotoLlmVitestReporter` shim that defers `logs/` mkdir to the first `reportCase` and flushes on `onTestRunEnd`.
- 11:10 UTC — Rewrote `evals/vitest.config.ts`: `root: REPO_ROOT`, the three include globs (`**/evals/*.test.ts`, `evals/*.test.ts`, `evals/smoke-static-eval.test.ts`), the spec-listed excludes, `setupFiles: ["./evals/setup.ts"]`, reporters array containing `default`, `./evals/reporters/zoto-eval-reporter.ts`, and `./evals/llm/_shared/zoto-llm-reporter.ts`, `#eval-engine` alias, `pool: "forks"`, `testTimeout: 300_000`.
- 11:13 UTC — Added `isStaticEvalPath` helper to `zoto-eval-reporter.ts` and added a per-event path filter in `onTestCaseResult`; also added a `cases.length === 0` short-circuit in `onTestRunEnd` so LLM-only runs don't leave a stub `static.yml`.
- 11:14 UTC — Added `isLlmCoLocatedPath` to `zoto-llm-reporter.ts`, deferred the module-level `mkdirSync(LOGS_DIR, ...)` behind an `ensureLogsDir()` lazy initialiser called from `reportCase`, and appended the default-exported `ZotoLlmVitestReporter` Vitest-Reporter shim (no-op when no LLM cases buffered).
- 11:16 UTC — Deleted `evals/llm/vitest.config.ts` (per the spec's "cleaner option is deletion" guidance). Subtask 03 / 06 will re-wire any `eval:llm:code` package.json reference.
- 11:18 UTC — Smoke validation: `pnpm vitest run --config evals/vitest.config.ts` exits 0; 5 test files, 224 tests, ~700ms.
- 11:20 UTC — Glob/partitioning probe: created `plugins/zoto-eval-system/agents/evals/__subtask04-glob-probe.test.ts`, re-ran vitest, confirmed (a) the file was discovered (6 test files total), (b) the static reporter excluded the probe (224 cases in `static.yml`, no probe entry), (c) no `llm.yml` or `logs/` directory was created (the LLM reporter's lazy paths held). Deleted the probe.
- 11:22 UTC — Type-check confirmation: the only TS diagnostic in my files chain is a pre-existing error in `evals/llm/_shared/sandbox-helpers.ts` (`CaseFixtures` not exported by `evals/_llm/sandbox.ts`), verified to be present in HEAD by stashing my changes and re-running tsc. My subtask introduces no new errors.

### Blockers Encountered
- `tsconfig.json` referenced by DoD02 does not exist at the repo root. Worked around by running tsc against the modified files only via a temporary config. The pre-existing `sandbox-helpers.ts → CaseFixtures` error cascades through any tsc invocation that resolves the LLM reporter's transitive type import; this is HEAD state and out of subtask 04 scope.
- The deliverable text and the original `D08` clause ("only execute `evals/smoke-static-eval.test.ts`") contradict `DoD01` / `DoD03` (which expect the 4 legacy stamped pilots to be picked up). Resolved in favour of the DoD wording — the include glob explicitly admits `evals/*.test.ts`, the 4 pilots run, and the legacy `evals/llm/test_*.test.ts` files remain excluded. Documented inline in the deliverables checklist.

### Files Modified
- `evals/vitest.config.ts` — rewritten as the unified config (root at repo root, co-location include globs, `#eval-engine` alias, dual-reporter wiring).
- `evals/reporters/zoto-eval-reporter.ts` — added `isStaticEvalPath`, per-event path filter, and the `cases.length === 0` short-circuit in `onTestRunEnd`.
- `evals/llm/_shared/zoto-llm-reporter.ts` — added `isLlmCoLocatedPath`, deferred `logs/` `mkdirSync` behind `ensureLogsDir`, refreshed file docstring, and appended the default-exported `ZotoLlmVitestReporter` Vitest-Reporter shim.
- `evals/llm/vitest.config.ts` — DELETED.
