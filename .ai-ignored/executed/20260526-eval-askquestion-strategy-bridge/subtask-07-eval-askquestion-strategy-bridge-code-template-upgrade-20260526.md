# Subtask: Code-strategy template upgrade

## Metadata
- **Subtask ID**: 07
- **Feature**: Eval AskQuestion Strategy Bridge
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: claude-opus-4-7-thinking-xhigh
- **Dependencies**: 04, 05
- **Created**: 20260526

## Objective

Upgrade the code-strategy template (`plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`) and the shared harness (`evals/llm/_shared/run-code-strategy-suite.ts`) to consume the new `askquestion-bridge.ts` module so stamped tests can declare scripted answers cleanly instead of misusing `follow_ups[]` as a synthetic interaction.

## Deliverables Checklist
- [ ] `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` imports the new `askquestion-bridge` re-export (path matches the per-repo copy under `evals/llm/_shared/`); preserves the leading `// _meta.generated: true` line; preserves the existing `defineLlmCodeEval` call shape (additive only).
- [ ] `evals/llm/_shared/run-code-strategy-suite.ts` `runCase` flow is updated so that when a case carries `interactions` (or whatever shape the ADR pins), the bridge is used instead of the bare follow-up loop. Cases without `interactions` keep the existing follow-up behaviour byte-for-byte.
- [ ] Per-case `interactions` data flows into the per-case report under a new `interactions` field next to `expected_output`; the reporter (`_shared/zoto-llm-reporter.ts`) MAY tag the row `interaction_style: scripted | synthetic | none` so the comparer can flatten it.
- [ ] Targeted unit tests covering the new branch in `runCase` (vitest scoped to `_shared/`).
- [ ] Compile-time guard rule documented at the top of `run-code-strategy-suite.ts`: cases declaring `interactions` MUST have `_meta.primitive_analysis.requiresInteraction === true` (or be unstamped, like manually written test fixtures). Mismatches throw at suite-load time.

## Definition of Done
- [ ] `pnpm exec tsc --noEmit` clean across the touched files.
- [ ] Existing stamped tests still parse without modification (the change is additive — `interactions` is optional on `CodeStrategyCaseDefinition`).
- [ ] At least one unit test covers the scripted-interaction path; at least one covers the legacy `follow_ups`-only path; both pass.
- [ ] No edits to declarative-template files (subtask 08 owns those).
- [ ] No edits to existing stamped `evals/llm/test_*.test.ts` files (subtask 09 owns the migration).
- [ ] No global test suite triggered.

## Implementation Notes

Template editing rules:
- The first line of `per-primitive-test.ts.tmpl` MUST remain `// _meta.generated: true`. The runtime guard in `_user-case-guards.ts` checks for this line.
- `{{...}}` placeholders are filled by the stamper. Keep the existing placeholders (`{{TARGET_ID}}`, `{{CASES_JSON}}`, `{{MODEL_ID}}`, `{{JUDGE_MODEL}}`, `{{CASE_TIMEOUT_MS}}`, `{{FRAMEWORK_IMPORTS}}`).
- Add a new placeholder `{{ASKQUESTION_BRIDGE_IMPORT}}` that the stamper sets to a single-line import when the analyser flag is true, and to an empty string when false. This keeps the emitted file noise-free for non-interactive primitives (so a declarative migration is possible later via subtask 09).

Suite-harness rules:
- Maintain `defineLlmCodeEval`'s existing signature; add the new case-level field through `CodeStrategyCaseDefinition` only.
- The `runCase` branch that handles `interactions` MUST still call `dispatchExplicitGraders` and `dispatchAssertionJudge` exactly the same way — only the prompt-injection step changes.
- Token resolution stays delegated to `sdk-bridge.resolveTokens`.

Reporter changes are minimal: pass `interaction_style` through to `reportCase` as an opaque string. The comparer/judge updates fall into Phase 5 doc work, not here.

Coordination with subtask 08: that subtask updates the declarative-template runner to refuse cases with `interactions`. The two templates are now mutually exclusive on the `interactions` field — if a case declares it, only the code template can carry it.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- `pnpm exec vitest run evals/llm/_shared/run-code-strategy-suite.test.ts` (create if absent — keep test fixtures local).
- `pnpm exec tsc --noEmit` scoped to the touched files.

Do not run `pnpm run eval:llm` in this subtask; the stamped files are not yet migrated to the new shape (that's subtask 09).

## Execution Notes

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
