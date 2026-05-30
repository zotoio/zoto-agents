# Subtask: Plugin Integration, Documentation & Validation

## Metadata
- **Subtask ID**: 06
- **Feature**: Eval Adviser
- **Assigned Subagent**: crux-platform-architect
- **Dependencies**: 02, 03, 04, 05
- **Created**: 20260506

## Objective

Integrate all new components into the `zoto-eval-system` plugin, update documentation, and run all validation scripts to ensure the plugin remains consistent and well-documented.

## Deliverables Checklist
- [x] Eval system rule updated: `plugins/zoto-eval-system/rules/zoto-eval-system.mdc` — add `/zoto-eval-advise` to Available Commands
- [x] Plugin README updated: `plugins/zoto-eval-system/README.md` — add Adviser section
- [x] Plugin CHANGELOG updated: `plugins/zoto-eval-system/CHANGELOG.md` — add adviser entry
- [x] Validation: `node scripts/validate-template.mjs` passes
- [x] Validation: `node scripts/validate-skills.mjs` passes
- [x] Validation: `pnpm test` passes (existing tests not broken)
- [x] Plugin version bumped in `plugins/zoto-eval-system/.cursor-plugin/plugin.json` (`0.1.0` → `0.3.0`)
- [x] Quick start section in README updated to include `/zoto-eval-advise`

## Definition of Done
- [x] `/zoto-eval-advise` appears in the rule file's Available Commands list
- [x] README has a dedicated Adviser section explaining the feature
- [x] CHANGELOG has a dated entry for the new feature
- [x] All three validation scripts pass without errors
- [x] No linter errors in modified files

## Implementation Notes

### Rule Update (`zoto-eval-system.mdc`)

Add to the Available Commands list:

```
- `/zoto-eval-advise [<scope>]` — interactive eval coverage gap analysis and recommendations.
```

Also consider adding a help-intent routing clause so that questions about "what tests am I missing?" or "eval coverage gaps" route through the adviser.

### README Update (`README.md`)

Add a section after the existing "Lifecycle walk-through" or in the command reference area:

- **Adviser** — Explain what the adviser does (coverage gap analysis vs judge's run analysis)
- How to use: `/zoto-eval-advise`, `/zoto-eval-advise <plugin>`, `/zoto-eval-advise <skill>`
- The five gap dimensions
- How it differs from the judge
- Interactive flow overview

### CHANGELOG Update (`CHANGELOG.md`)

Add entry:
```
## [Unreleased]
### Added
- `zoto-eval-adviser` agent for interactive eval coverage gap analysis
- `zoto-advise-evals` skill implementing five-dimension gap taxonomy
- `/zoto-eval-advise` command with multi-turn askQuestion interaction
```

### Validation Commands

Run in sequence:
1. `node scripts/validate-template.mjs`
2. `node scripts/validate-skills.mjs`
3. `pnpm test`

If any validation fails, fix the issues before marking this subtask complete.

### Files to Modify
- `plugins/zoto-eval-system/rules/zoto-eval-system.mdc`
- `plugins/zoto-eval-system/README.md`
- `plugins/zoto-eval-system/CHANGELOG.md`

### Files to Study
- All outputs from subtasks 02, 03, 04, 05
- Existing rule structure in `zoto-eval-system.mdc`
- Existing README structure

## Testing Strategy
**IMPORTANT**: This is the final integration subtask — run the full validation suite here.
- Run `node scripts/validate-template.mjs`
- Run `node scripts/validate-skills.mjs`
- Run `pnpm test`
- Fix any failures introduced by the new components

## Execution Notes

### Agent Session Info
- Agent: crux-platform-architect
- Started: 2026-05-06T21:14:00+10:00
- Completed: 2026-05-06T21:16:00+10:00

### Work Log
1. Read all target files and verified subtask 02–05 outputs exist (agent, skill, command, evals).
2. Updated `zoto-eval-system.mdc`: added `/zoto-eval-advise` to Available Commands and extended help-intent routing to cover adviser queries.
3. Updated `README.md`: added `/zoto-eval-advise` to Quick Start block and added full "Adviser — pre-hoc coverage gap analysis" section (usage, five dimensions, interactive flow, adviser-vs-judge comparison table) before Manual checklists.
4. Updated `CHANGELOG.md`: added `[Unreleased]` section with three Added entries.
5. Bumped `plugin.json` version from `0.1.0` to `0.3.0` (skipping 0.2.0 which was documented in staged changes for eval-system v2).
6. Ran all three validation scripts — all pass:
   - `validate-template.mjs`: passed (2 info-level warnings about missing mcp.json, not errors).
   - `validate-skills.mjs`: 12/12 skills valid (including new `zoto-advise-evals`).
   - `pnpm test`: 177 tests passed (50 eval-system + 127 spec-system), 0 failures.
7. Checked linter errors on all modified files — none found.

### Blockers Encountered
None.

### Files Modified
- `plugins/zoto-eval-system/rules/zoto-eval-system.mdc`
- `plugins/zoto-eval-system/README.md`
- `plugins/zoto-eval-system/CHANGELOG.md`
- `plugins/zoto-eval-system/.cursor-plugin/plugin.json`
