# Subtask: CRUX Rule Sync

## Metadata
- **Subtask ID**: 06
- **Feature**: command-prefix-shortening
- **Assigned Subagent**: crux-cursor-rule-manager
- **Dependencies**: 04
- **Created**: 20260506

## Objective

For every source rule (`.cursor/rules/*.mdc`, `plugins/*/rules/*.mdc`, or `AGENTS.md`) that subtask 04 edited and that has a corresponding `.crux.md` / `.crux.mdc` derived file, regenerate the derived file so the CRUX-compressed view stays in sync with its source. Per `.cursor/rules/_CRUX-RULE.mdc`, generated files are read-only and must be regenerated, never hand-edited.

## Deliverables Checklist
- [ ] Identify every `.cursor/rules/*.crux.md` / `*.crux.mdc` whose source `.mdc` was edited in subtask 04 (subtask 01's inventory should already list these candidates)
- [ ] For each candidate, verify the `generated:` + `sourceChecksum:` (or `sourceUrl:`) frontmatter contract still holds — i.e. the file is genuinely a derived CRUX output
- [ ] Recompute the source checksum (use the `crux-utils` skill: `Read(.cursor/skills/crux-utils/SKILL.md)`)
- [ ] If the new source checksum equals the persisted `sourceChecksum`, skip — content unchanged
- [ ] Otherwise, regenerate the derived `.crux.md` / `.crux.mdc` using surgical-diff updates that preserve the original CRUX notation style
- [ ] Update the `sourceChecksum` (or equivalent metadata) inside the derived file's frontmatter
- [ ] Confirm token-reduction remains within the project's CRUX target (≤ 20% of source) — if a regenerated file no longer reduces sufficiently, flag it for follow-up rather than degrade the source
- [ ] Check `AGENTS.md` for an inline `⟦CRUX:...⟧` block. **Current state (verified at spec time): `AGENTS.md` carries the `<CRUX agents="always">` annotation tag at line 1 but contains NO inline `⟦CRUX:...⟧`-encoded block — therefore no regeneration is required for this spec.** This deliverable acts as a **guard against future regression**: if a future change adds an inline CRUX block, that block must be regenerated in place when the source content changes; do NOT create an `AGENTS.source.md` (`AGENTS.md` is the source file in this repo)

## Definition of Done
- [ ] Every regenerated CRUX file's `sourceChecksum` matches its current source content
- [ ] No CRUX file was hand-edited (only regenerated through the proper mechanism)
- [ ] No source `.mdc` was edited in this subtask (sources were already finalised in subtask 04)
- [ ] Cross-check: every `.crux.md`/`.crux.mdc` whose source mentions slash commands has been visited and either updated or skipped (with the skip reason recorded)

### Expected outcome for THIS spec

**Most likely outcome: no-op.** The repo currently contains exactly two CRUX-derived files — `install.crux.md` (source: `install.py`, unrelated to slash commands) and `.cursor/rules/crux-memories-integration.crux.mdc` (references `/crux-amnesia`, `/crux-dream`, `/crux-recall`, etc., which are NOT in scope of this spec). Neither has a source that mentions `/zoto-spec-*` or `/zoto-eval-*` slash commands.

If subtask 04 produced no edits to a source rule with a paired CRUX derivative, this subtask completes immediately with `extra.judge.notes: "no candidates"` (or equivalent) recorded in the subtask's `.status.yml`. That is the expected, healthy outcome — not a failure.

## Implementation Notes

- Reference: `.cursor/rules/_CRUX-RULE.mdc` (always-applied) — it forbids editing files with `.crux.md` / `.crux.mdc` extensions or files carrying the `> [!IMPORTANT] > Generated file - do not edit!` banner directly. Always go through the source.
- The agent for this work is `crux-cursor-rule-manager` (per `AGENTS.md` allocation table). Use it via the standard delegation pattern.
- Token-budget guidance from CRUX rules: if a regenerated CRUX file no longer beats the ≤ 20% target, the rule says **abort** rather than ship a degraded compression. If that happens, leave the original CRUX file as-is and surface the source-vs-CRUX divergence in the subtask's status `extra` block so the verifier (subtask 07) sees it.
- Common candidates in this repo (verify against subtask 01's inventory):
  - `.cursor/rules/crux-memories-integration.crux.mdc` (source: `.cursor/rules/crux-memories-integration.mdc` if it exists, otherwise this is itself the source — verify)
  - Any `*.crux.md` derivative of an edited plugin rule
- If subtask 04 produced **no** edits to any source with a paired CRUX derivative, this subtask completes immediately with a "no candidates" status.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Re-run the project's CRUX validator if available, otherwise spot-check that frontmatter checksums match
- Defer all global testing to subtask 07

## Execution Notes

_To be filled by executing agent._

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log

### Blockers Encountered

### Files Modified
