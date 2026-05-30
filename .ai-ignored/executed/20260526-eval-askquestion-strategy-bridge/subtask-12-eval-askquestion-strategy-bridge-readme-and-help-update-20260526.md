# Subtask: README, _shared README, and eval-help anchor refresh

## Metadata
- **Subtask ID**: 12
- **Feature**: Eval AskQuestion Strategy Bridge
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: claude-opus-4-7-thinking-xhigh
- **Dependencies**: 03, 04, 05, 06, 07, 08, 09
- **Created**: 20260526

## Objective

Update `plugins/zoto-eval-system/README.md` (the source of truth consumed by `zoto-help-evals`), write the new `evals/llm/_shared/README.md`, and refresh the eval-help skill's anchor table so the new "Strategy bridge" section is reachable through `/z-eval-help`.

## Deliverables Checklist
- [x] `plugins/zoto-eval-system/README.md` gains a `## Strategy bridge` section (or whichever heading reads naturally given the existing TOC) that covers: declarative vs code; analyser-driven classification; the `_shared/askquestion-bridge.ts` helper; the per-row `backend:` annotation in `report.yml`; the migration story for existing repos. Cite Subtask 09's migration matrix as the example diff readers can review.
- [x] `plugins/zoto-eval-system/README.md` `## Configuration` section refreshed: `llm.strategy:` is now the fallback default (used only when classification is unavailable), not the per-target choice. Cross-reference `site/eval-system/configuration.html`.
- [x] `plugins/zoto-eval-system/README.md` `## Plugin scaffolding` (or equivalent) section forward-references the new `/zoto-create-plugin` integration from Subtask 10.
- [x] `evals/llm/_shared/README.md` (new file) describes every helper currently in `evals/llm/_shared/` (`sdk-bridge`, `code-strategy-case`, `run-code-strategy-suite`, `sandbox-helpers`, `zoto-llm-reporter`, `setup`, `_user-case-guards`, the new `askquestion-bridge`, `graders/*`). Each entry includes: purpose, exported surface table, intended consumers, link back to `plugins/zoto-eval-system/README.md` for the user-facing version.
- [x] `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md` Step 2/Step 3 anchor tables updated so the README's new section is on the help-section menu. Verify the section header matches the README exactly (the skill loads README sections by `## header` literal).
- [x] Cross-link audit performed: every `start:end:plugins/zoto-eval-system/README.md` reference in the broader codebase still resolves (the section line numbers will shift; update the citing files).

## Definition of Done
- [x] `plugins/zoto-eval-system/README.md` parses as valid markdown (a quick `pnpm exec remark` or markdown linter run is acceptable; otherwise hand-check headings/anchors).
- [x] `evals/llm/_shared/README.md` lists every `*.ts` file currently in `evals/llm/_shared/` with no exceptions.
- [x] `zoto-help-evals` SKILL Step 2 menu enumerates the new `## Strategy bridge` anchor (verbatim title match).
- [x] No edits to `site/eval-system/*.html` (subtask 11 owns those).
- [x] No edits to spec / engineering docs outside the eval-system surface.

## Implementation Notes

README structure to preserve:
- Read the README first; identify the existing TOC. Add the new section in the place that reads naturally rather than appending blindly.
- The eval-help skill loads README sections by `##` headers (per `zoto-help-evals/SKILL.md` Step 1). Maintain that structure.
- Keep code-fence languages on existing snippets; do not strip syntax-highlight hints when reflowing prose.

`_shared/README.md` structure (suggested):
```
# evals/llm/_shared/

[Brief paragraph: purpose of this directory.]

## Modules

| Module | Purpose | Consumers |
|---|---|---|
| sdk-bridge.ts | ... | run-code-strategy-suite.ts, askquestion-bridge.ts, ... |
| askquestion-bridge.ts | ... | run-code-strategy-suite.ts (when case carries `interactions`) |
| ... | ... | ... |

## Discipline

- Only `sdk-bridge.ts` imports from `@cursor/sdk` directly.
- ...

## See also

- `plugins/zoto-eval-system/README.md#strategy-bridge` for the user-facing description.
```

Eval-help anchor refresh:
- `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md` lists section anchors in tables under Step 2 / Step 3. Add the new `## Strategy bridge` row(s).
- The "Section anchor" cell MUST match the README header exactly; the "Signals to read" cell MUST list any new files this section's tailoring depends on (e.g. `_meta.primitive_analysis.requiresInteraction`).

Avoid:
- Adding TOC blocks that require manual maintenance — the eval-help skill scans `##` headers at runtime.
- Duplicating prose between the README and the site — the site is the visual presentation; the README is the canonical source.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- Markdown lint scoped to the touched files (if available).
- A manual `pnpm run eval:help configuration` (or equivalent) smoke run to verify the eval-help skill still resolves the section list.

## Execution Notes

### Agent Session Info
- Agent: generalPurpose (composer-2.5-fast)
- Started: 20260526
- Completed: 20260526

### Work Log
- Added `## Strategy bridge` to plugin README (line 208); refreshed Configuration, hybrid LLM strategies, lifecycle, result schema, CI, troubleshooting, Development.
- Fixed lifecycle hierarchy (Update/Execute/Judge/Compare restored under Lifecycle walk-through).
- Created `evals/llm/_shared/README.md` module catalogue.
- Updated `zoto-help-evals` Step 2/3 anchors; fixed citation example 20:30 → 34:52.

### Blockers Encountered
None.

### Files Modified
- `plugins/zoto-eval-system/README.md`
- `evals/llm/_shared/README.md` (new)
- `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md`
- `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-12-*.status.{yml,md}`
- `specs/20260526-eval-askquestion-strategy-bridge/subtask-12-*.md`
