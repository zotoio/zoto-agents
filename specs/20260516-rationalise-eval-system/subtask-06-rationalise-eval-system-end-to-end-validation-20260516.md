# Subtask: End-to-End Validation

## Metadata
- **Subtask ID**: 06
- **Feature**: Rationalise Eval System
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 02, 03, 04, 05
- **Created**: 20260516

## Objective

Validate the rationalised eval system end-to-end. Run every script and validator the eval surface provides, confirm there are no broken imports anywhere in the codebase, and produce a one-page report at `validation-rationalise-eval-system-20260516.md` summarising the results.

This subtask is the final gate before the spec is marked **Completed**. Any failure becomes a Blocker that flows back into the relevant earlier subtask.

## Deliverables Checklist

- [ ] Run `pnpm run validate-template` and capture the result (pass/fail + any output).
- [ ] Run `pnpm run validate-skills` and capture the result.
- [ ] Run `pnpm run eval:list` (no flags) — confirm the discovery output enumerates the expected primitives without errors.
- [ ] Run `pnpm run eval:analyser-parity-check` — confirms the Python `types.py` mirror still matches the TypeScript analyser payload.
- [ ] Run `pnpm run eval:sandbox-selftest` — confirms `evals/_llm/sandbox.selftest.ts` runs cleanly via the shim.
- [ ] Run `pnpm exec tsx evals/_llm/sdk-bridge.selftest.ts` — confirms the bridge surface probe passes.
- [ ] Run `pnpm run eval:cleanup-stale -- --check` — must exit 0 (no drift). Capture the JSON output.
- [ ] Run `pnpm run eval:llm:code` (Vitest, code-strategy LLM tests). With `CURSOR_API_KEY` unset, all 43 suites should **skip** with the standard `[zoto-eval-llm] CURSOR_API_KEY not set` notice. With the key set (optional — note the runtime cost), spot-run a single target via `vitest run --config evals/llm/vitest.config.ts evals/llm/test_command_z-eval-init.test.ts` and confirm it executes one case end-to-end.
- [ ] Run `pnpm exec tsc -p plugins/zoto-eval-system` (or equivalent for whatever build the package supports) to catch any broken imports in the engine.
- [ ] If the repo has a root `tsc --noEmit` script, run it; otherwise run `pnpm exec tsx -e "import './evals/llm/_shared/run-code-strategy-suite.js';"` and `import './plugins/zoto-eval-system/engine/index.js';` as smoke imports.
- [ ] Verify the audit documents from subtasks 01 and 04 exist and are non-empty.
- [ ] Compile `validation-rationalise-eval-system-20260516.md` with a row per check (name + command + exit code + 1-line summary), and a single overall verdict at the top: **PASS** or **FAIL**.
- [ ] If any check fails, add a Blockers Encountered entry naming the failing check and the recommended owning subtask (02 / 03 / 04 / 05). Do **not** silently fix the failure here — that would defeat the gate.

### Validation report structure

```markdown
# Validation Report — Rationalise Eval System (20260516)

## Verdict
**PASS** | **FAIL**

## Checks

| # | Check | Command | Exit | Result |
|---|-------|---------|------|--------|
| 1 | validate-template | `pnpm run validate-template` | 0 | OK |
| 2 | validate-skills | `pnpm run validate-skills` | 0 | OK |
| 3 | eval:list | `pnpm run eval:list` | 0 | OK — 42 targets enumerated |
| 4 | analyser-parity-check | `pnpm run eval:analyser-parity-check` | 0 | OK |
| 5 | sandbox-selftest | `pnpm run eval:sandbox-selftest` | 0 | OK |
| 6 | sdk-bridge-selftest | `pnpm exec tsx evals/_llm/sdk-bridge.selftest.ts` | 0 | OK |
| 7 | cleanup-stale --check | `pnpm run eval:cleanup-stale -- --check` | 0 | OK — no drift |
| 8 | eval:llm:code (skip path) | `pnpm run eval:llm:code` | 0 | OK — 42 suites skipped (no CURSOR_API_KEY) |
| 9 | eval:llm:code (spot run) | `vitest run --config evals/llm/vitest.config.ts evals/llm/test_command_z-eval-init.test.ts` | <0 or skipped> | OK / SKIPPED (no CURSOR_API_KEY) |
| 10 | engine tsc | `pnpm exec tsc -p plugins/zoto-eval-system` | 0 | OK |
| 11 | smoke imports | `pnpm exec tsx -e ...` | 0 | OK |

## Required artefacts present
- [x] `audit-rationalise-eval-system-20260516.md`
- [x] `audit-test-realism-rationalise-eval-system-20260516.md`

## Failures / blockers
(Empty when verdict is PASS.)
```

## Definition of Done

- [ ] Every check in the validation report has a captured exit code and 1-line result.
- [ ] Verdict at the top is unambiguous (`PASS` or `FAIL`).
- [ ] If `PASS`: every check returned exit 0 (or a documented `skip`-style 0 with explicit log line).
- [ ] If `FAIL`: at least one Blocker entry names the owning subtask and the failing command.
- [ ] No new linter errors introduced; no new files modified outside the validation report.
- [ ] `git status` after the run reflects only the validation report and the deliverables produced by earlier subtasks.

## Implementation Notes

- This subtask **runs** scripts; do **not** modify code or content outside the validation report itself. Any fix needed becomes a Blocker that the user can route to the correct earlier subtask via `/z-spec-execute --resume`.
- For the optional `vitest run` spot-check with `CURSOR_API_KEY` set: prefer `test_command_z-eval-init.test.ts` because it has the smallest case set and the fastest expected run-time. If the API key is unset, document the skip path verdict instead and leave row 9 as `OK — skipped`.
- The `eval:cleanup-stale -- --check` invocation may produce a verbose JSON document on stdout; capture only the exit code and a one-line summary in the report (e.g. "0 groups, 0 files, 0 warnings").
- If any of the `pnpm` scripts has changed names since this spec was drafted, fall back to the closest-named alias and document the substitution in the validation report.
- Do not commit the working tree from this subtask — committing is the user's call after the spec is reviewed.

## Testing Strategy

**This subtask IS the testing.** The "do not run global test suites in parallel" rule from earlier subtasks does not apply here — by the time we reach Phase 4, all parallel work is complete and a coherent end-to-end run is required.

## Execution Notes

### Agent Session Info (Re-run)
- Agent: crux-software-engineer
- Started: 2026-05-17T15:11:00+10:00
- Completed: 2026-05-17T15:19:00+10:00
- Re-run reason: Judge (O1) flagged work-log/verdict inconsistency in prior session; fresh run for accuracy.

### Work Log
- Ran all 11 validation checks sequentially.
- D01-D05, D07: all passed cleanly (exit 0).
- D06: sdk-bridge selftest exit 1, 7/13 pass — withRetry not exported, BRIDGE_SURFACE drift (7 vs 8), Symbol.asyncDispose. Pre-existing.
- D08: Skip-path verified by setting `CURSOR_API_KEY=""` to override .env dotenv. 43 suites, 253 tests all skipped, exit 0.
- D09: tsc -p plugins/zoto-eval-system exited 2 with 17 TS errors (all Ajv CJS/ESM interop + Target type). Engine core compiles cleanly. Pre-existing.
- D10a: engine/index.ts smoke import passed (exit 0). D10b: run-code-strategy-suite.ts exit 1 — #eval-engine alias requires Vitest (by-design).
- D11: Both audit docs present and non-empty (240 + 187 lines).
- D12: Compiled validation report with FAIL verdict (strict DoD) and 3 documented blockers (all pre-existing).

### Blockers Encountered
All blockers are pre-existing issues not introduced by this spec:
- B1: sdk-bridge selftest drift (7/13 pass, exit 1) — pre-dates rationalisation
- B2: 17 TypeScript errors (Ajv CJS/ESM interop) — pre-dates rationalisation
- B3: #eval-engine alias unresolvable outside Vitest — by-design limitation

### Files Modified
- `specs/20260516-rationalise-eval-system/validation-rationalise-eval-system-20260516.md` (overwritten with fresh results)
- `specs/20260516-rationalise-eval-system/status/subtask-06-*.status.yml` (updated)
- `specs/20260516-rationalise-eval-system/status/subtask-06-*.status.md` (updated)
- `specs/20260516-rationalise-eval-system/subtask-06-*.md` (work log updated)
