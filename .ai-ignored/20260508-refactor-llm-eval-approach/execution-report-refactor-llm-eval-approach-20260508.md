# Execution Report: Refactor LLM Eval Approach

**Spec**: `spec-refactor-llm-eval-approach-20260508.md`
**Started**: 2026-05-08 10:06:23 UTC
**Completed**: 2026-05-08 11:13:29 UTC
**Duration**: 67m 6s
**Status**: Completed

## Summary

Unified and de-duplicated the host monorepo's LLM evaluation surfaces. Introduced shared types (`CodeStrategyCaseDefinition`, canonical `AnalyserPayload`), a centralized Vitest harness (`defineLlmCodeEval`), and updated plugin templates — reducing all 37 stamped test files from ~240-370 lines to ~30-160 lines each. Documented the dual-strategy model (declarative + code) in the plugin README and reinforced `askQuestion` and `TodoWrite` usage across both spec-system and eval-system plugins.

## Subtask Results

| ID | Subtask | Subagent | Verification | Files Modified | Notes |
|----|---------|----------|-------------|----------------|-------|
| 01 | Audit LLM eval architecture | crux-platform-architect | Verified | 1 (subtask md only) | Read-only audit; inventory, dual-strategy contract, 6 open questions |
| 02 | Docs & eval patterns | crux-platform-architect | Verified (closing gate satisfied by 06) | 2 | README dual-strategy section + AGENTS.md pointer |
| 03 | Shared eval types module | crux-software-engineer | Verified | 6 | `CodeStrategyCaseDefinition`, `AnalyserPayload`, thin re-exports for sdk-bridge and user-case-guards |
| 04 | Central code-strategy runner | crux-software-engineer | Verified | 2 | `defineLlmCodeEval()` harness + proof migration (280→69 lines) |
| 05 | Plugin templates & stamp | crux-software-engineer | Verified | 2 | Template 240→32 lines; CHANGELOG entry |
| 06 | Exemplar refactors & taxonomy | crux-software-engineer | Verified | ~40 | Bulk re-stamp of 37 files; proof file deleted; process.cwd() fix |

## Verification Results

### Adversarial Verification
- Subtasks verified: 6/6
- Issues found during verification: 2 (subtask 01 kind breakdown table inaccuracy — nice_to_have; subtask 02 closing gate — structural, resolved by subtask 06)
- Issues resolved: 2/2

### Test Suite
- Status: PASS
- Eval-system plugin tests: 62/62 passed
- No regressions introduced

### Linter
- Status: CLEAN
- No new linter errors in any modified files

### Quality Audit
- Status: PASS
- Zero inline `interface CaseDefinition` remaining in `evals/llm/`
- All shared types properly imported via canonical modules
- `_meta.generated` contracts preserved throughout

### Documentation
- Status: Updated
- `plugins/zoto-eval-system/README.md`: new dual-strategy section (declarative + code)
- `AGENTS.md`: eval strategy pointer for agents
- `plugins/zoto-eval-system/CHANGELOG.md`: Unreleased entry

### onStop Consistency Check
- Status: PASS (for this spec)
- Our spec: 0 critical issues
- Pre-existing: 1 critical from older spec `20260506-spec-system-live-status` (unrelated)

## Files Modified (all subtasks combined)

### Created
- `evals/llm/_shared/code-strategy-case.ts` — canonical `CodeStrategyCaseDefinition` type
- `evals/llm/_shared/run-code-strategy-suite.ts` — centralized `defineLlmCodeEval()` harness
- `evals/_llm/analyser-payload.ts` — canonical `AnalyserPayload` types

### Modified
- `evals/llm/_shared/sdk-bridge.ts` — verbatim copy → thin re-export (215→34 lines)
- `evals/llm/_shared/_user-case-guards.ts` — verbatim copy → thin re-export (153→28 lines)
- `scripts/eval-analyse.ts` — inline types → import from canonical module
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` — 240→32 lines
- `plugins/zoto-eval-system/README.md` — dual-strategy documentation
- `plugins/zoto-eval-system/CHANGELOG.md` — Unreleased entry
- `AGENTS.md` — eval strategy pointer
- 37× `evals/llm/test_*.test.ts` — bulk re-stamp to thin pattern

### Deleted
- `evals/llm/_shared/code-strategy-case.proof.ts` — compile-time proof (no longer needed)

## Additional Work (during execution)

Two framework-level improvements were made in parallel with spec execution at the user's request:

1. **askQuestion reinforcement**: Updated 10 files across the spec-system plugin to mandate structured `askQuestion` tool usage for all user gates (replacing plain-text `[Yes / No]` prompts). Added a "User Confirmation Contract" section to `plugins/zoto-spec-system/rules/zoto-spec-system.mdc` mirroring the eval-system's established pattern.

2. **TodoWrite reinforcement**: Updated 5 files across both plugins to mandate `TodoWrite` for progress tracking during subtask execution, adversarial verification, and spec creation workflows. Added "TodoWrite Contract" sections to both plugin rule files.

## Outstanding Items

- 6 eval targets were skipped during bulk re-stamp (no cached analyser payload) — these need `pnpm run eval:analyse` run to generate payloads before re-stamping
- Subtask 04 judge noted `process.cwd()` in judge agent cwd — fixed by subtask 06
- Spec-system plugin has 4 pre-existing test failures (unrelated to this spec)

## Lessons Learned

- The closing gate pattern (subtask 02 depending on subtask 06 for final README confirmation) created a structural Partial verdict that was expected — the judge correctly flagged it, and it was resolved when subtask 06 completed the final doc pass.
- The existing `case-runner.ts.tmpl` already contained most of the shared runner logic but was never wired into the stamped tests — the primary win was connecting existing infrastructure rather than building from scratch.
- Verbatim file copies (`sdk-bridge.ts`, `_user-case-guards.ts`, graders) were a significant maintenance burden — thin re-exports are a simple, effective pattern for eliminating them.
