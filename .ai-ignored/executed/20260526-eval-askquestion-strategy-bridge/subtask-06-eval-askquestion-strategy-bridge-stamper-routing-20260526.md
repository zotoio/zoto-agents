# Subtask: Stamper routing & mutual-exclusion guard

## Metadata
- **Subtask ID**: 06
- **Feature**: Eval AskQuestion Strategy Bridge
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: claude-opus-4-7-thinking-xhigh
- **Dependencies**: 04
- **Created**: 20260526

## Objective

Update the eval-system stamper to consume the analyser's new `requiresInteraction` / `interactionStyle` fields and route every target to exactly one backend — declarative JSON OR code-strategy TypeScript. Enforce mutual exclusion at write time so misclassification cannot ship two backends for the same target.

## Deliverables Checklist
- [ ] Stamper code path identified and updated. Likely entry points (verify in Phase 1 read of `scripts/eval-stamp.ts` or wherever `stampLlmCodeStrategy` lives — the `per-primitive-test.ts.tmpl` JSDoc names the function): the analyser-payload reader, the per-target dispatch, and the file-write call.
- [ ] Per-target dispatch logic: when `_meta.primitive_analysis.requiresInteraction === true`, stamp the code-strategy TypeScript file under `evals/llm/test_<kind>_<name>.test.ts`; when `false` (or omitted), stamp the declarative JSON case row(s) under the appropriate `plugins/<plugin>/evals/<kind>/<name>.json`. Hooks always default to declarative (they never call `AskQuestion`).
- [ ] Mutual-exclusion guard: before writing, the stamper checks the OPPOSITE backend's expected output path; if it exists, the stamper either rewrites away (when `--apply` AND we are migrating intentionally) or fails with a clear stderr message + non-zero exit (when not migrating). The guard reuses `_user-case-guards.isGeneratedFile` to avoid touching user-authored stamps.
- [ ] Per-target classification echoed into stamped output: every generated case row gets `_meta.primitive_analysis.requiresInteraction` + `_meta.primitive_analysis.interactionStyle` mirroring the analyser payload; every stamped TypeScript file gets a leading JSDoc comment annotating the choice and the analyser version that drove it.
- [ ] Targeted unit tests for the new dispatch + guard logic (vitest scoped to the stamper file).

## Definition of Done
- [ ] `pnpm exec tsc --noEmit` clean across the touched files.
- [ ] Unit tests cover: (a) `requiresInteraction:true` → code-strategy path; (b) `requiresInteraction:false` → declarative path; (c) `requiresInteraction` omitted → declarative path (default); (d) both backend artefacts existing pre-write → guard fires; (e) intentional migration (`--apply` + the opposite backend exists) → existing artefact is removed first, new one is written.
- [ ] No new declarative-JSON or code-strategy artefacts are written to the live tree by this subtask — the actual migration runs in subtask 09.
- [ ] Mutual-exclusion guard error message is human-readable and cites both candidate paths.
- [ ] No edits to existing template files (subtasks 07/08 own template upgrades).

## Implementation Notes

Read first to find the stamping entry point:

- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl` JSDoc names `scripts/eval-stamp.ts#stampLlmCodeStrategy`.
- `scripts/eval-analyse.ts` references the same flow indirectly via `_meta.primitive_analysis`.
- `plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md` documents how `eval:update --apply` invokes the stamper per drifted primitive.

When the analyser flag is missing (e.g. legacy cached payload from before subtask 04's bump), the stamper MUST default to declarative JSON AND tag the case with `_meta.classification_source: "fallback-default"`. This matches the plugin-creation fallback in KD-7 and gives a later `pnpm run eval:update --with-analyser` an explicit signal to re-classify.

Write-side ordering: when migrating, the stamper MUST remove the opposite-backend artefact BEFORE writing the new one. The remove step must respect `isGeneratedFile(path, { strict: true })` — never delete a user-authored file.

For declarative JSON output, the stamper writes per-case rows into the existing per-plugin file (`plugins/<plugin>/evals/<kind>/<name>.json`). The case shape MUST match Subtask 08's runner expectations (the runner is also updated in Phase 3 in parallel; coordinate via the analyser-payload schema).

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- `pnpm exec vitest run` scoped to the stamper test file added here.
- `pnpm exec tsc --noEmit` scoped to the touched files.

Do not invoke `pnpm run eval:update --apply` in this subtask; that runs in subtask 09.

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
