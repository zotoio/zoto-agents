# Subtask: Declarative-strategy template upgrade

## Metadata
- **Subtask ID**: 08
- **Feature**: Eval AskQuestion Strategy Bridge
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: claude-opus-4-7-thinking-xhigh
- **Dependencies**: 04
- **Created**: 20260526

## Objective

Upgrade the declarative-strategy runner template (`plugins/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl`) so it (a) refuses to accept cases that declare scripted `interactions` (those belong to the code-strategy backend), and (b) carries the `requiresInteraction:false` invariant forward into the per-run report so misclassification is loud.

## Deliverables Checklist
- [ ] `plugins/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl` validation step rejects any loaded case where `case.interactions` (or the field name pinned by the ADR) is non-empty, with a clear error pointing at the analyser-classification mismatch.
- [ ] `plugins/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl` (the case-shape source for the declarative runner) updated to mark the `interactions` field as forbidden in declarative mode (a top-level type or runtime guard, depending on what makes the rejection reliable).
- [ ] Per-target rollup in the runner (the path that writes `evals/_runs/<ts>/llm.yml`) annotates each row with `backend: declarative` (constant — this runner only handles declarative cases) and `requires_interaction: false` (constant — anything else is rejected upstream).
- [ ] Targeted unit tests for the new validation: a fixture case that declares `interactions` MUST cause `validateEnriched` (or the equivalent check) to throw with a specific error message that names the offending case id.

## Definition of Done
- [ ] `pnpm exec tsc --noEmit` clean across the touched files.
- [ ] Unit tests pass: a declarative-mode case with `interactions` set throws the expected error; a declarative-mode case without it loads successfully.
- [ ] No edits to the code-strategy template (subtask 07 owns it).
- [ ] No edits to live `plugins/<plugin>/evals/<kind>/<name>.json` files (subtask 09 migrates content).
- [ ] No global test suite triggered.

## Implementation Notes

The declarative runner template is at `plugins/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl`. Its current shape:

- `validateEnriched(case)` runs before SDK invocation; `--full` gate; per-case logs to `{evalsDir}/_runs/<ts>/logs/<case>.log`; suite YAML to `llm.yml`.
- The `/* zoto-declarative-strategy:active */` marker on line 2 is the mutual-exclusion signal subtask 09 will look for. Preserve it verbatim.

Validation guidance:
- The simplest rejection point is `validateEnriched`. Add a check for `case.interactions` (or the ADR field name); if present and non-empty, throw `new Error('declarative runner cannot handle scripted interactions; case <id> declares interactions but the analyser classified its target as requiresInteraction:false')`.
- Avoid silent stripping — that would mask analyser misclassification.

Per-row annotation guidance:
- The runner's writer step (`writer.ts.tmpl` consumed by `runner.ts.tmpl`) emits one row per case. Add the `backend: "declarative"` constant unconditionally (when written by this runner) so subtask 13's report-shape DoD can verify presence.
- `requires_interaction: false` is similarly constant — declarative cases never have interactions because the validator rejected them upstream.

The corresponding **code-strategy** runner (`run-code-strategy-suite.ts` from subtask 07) emits `backend: "code"` and the runtime `interaction_style` ("scripted" | "synthetic" | "none") for its cases. The comparer's `/canvas` template (`plugins/zoto-eval-system/templates/canvas/compare-prompt.md.tmpl`) needs no edit here — the new column is additive and the docs update lands in subtask 11/12.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- `pnpm exec vitest run` scoped to the new declarative-runner test file added here.
- `pnpm exec tsc --noEmit` scoped to the touched files.

Do not run `pnpm run eval:llm`; that runs in subtask 13.

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
