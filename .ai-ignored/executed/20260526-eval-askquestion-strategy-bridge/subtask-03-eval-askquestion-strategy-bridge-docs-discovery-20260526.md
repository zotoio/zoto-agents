# Subtask: Documentation surface discovery

## Metadata
- **Subtask ID**: 03
- **Feature**: Eval AskQuestion Strategy Bridge
- **Assigned Subagent**: explore
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: None
- **Created**: 20260526

## Objective

Map every documentation surface that needs an update for this spec, so Phase 5 (subtasks 11 + 12) can edit with surgical precision. The deliverable is a map keyed by URL/page → exact section anchor → expected change description, plus a verification list of links the docs cross-reference.

## Deliverables Checklist
- [x] `specs/20260526-eval-askquestion-strategy-bridge/audit/docs-update-map.md` — table grouped by section: (a) `site/eval-system/index.html`; (b) `site/eval-system/design.html`; (c) `site/eval-system/configuration.html`; (d) `site/eval-system/quickstart.html`; (e) `site/images/diagrams/eval-askquestion-flow.svg` (current contents summary + redraw instructions); (f) `plugins/zoto-eval-system/README.md` (every `## section` with a one-line summary of what changes); (g) the planned new `evals/llm/_shared/README.md` (outline only); (h) `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md` anchor table (current entries + new "Strategy bridge" anchor).
- [x] List of cross-links the docs currently cite (e.g. README anchors referenced from the site, code references like `12:14:evals/llm/_shared/sdk-bridge.ts` that will be invalidated by Phase 3 changes); flagged for re-resolution in subtasks 11/12.
- [x] `specs/20260526-eval-askquestion-strategy-bridge/audit/docs-spec-system-impact.md` — short note on whether `site/spec-system/*.html` references the eval-system pages; if so, list the cross-links.
- [x] Suggested SVG-redraw spec for `site/images/diagrams/eval-askquestion-flow.svg`: arrows from analyser → classification flag → stamper → declarative JSON OR code-strategy TS → askquestion-bridge → SDK → report.yml with backend annotation.

## Definition of Done
- [x] Every `site/eval-system/*.html` file is enumerated; every section that mentions `strategy`, `LLM eval`, `declarative`, `code`, `AskQuestion`, or the eval-help skill is flagged with a one-line change description.
- [x] The `zoto-help-evals` SKILL anchor table is reproduced verbatim with the proposed addition labelled `[NEW]`.
- [x] Cross-link impact list cites at least the file path and the line range; broken-link risk is called out per entry.
- [x] No code files outside `specs/20260526-eval-askquestion-strategy-bridge/` are modified.

## Implementation Notes

Read-only mapping. Useful sources:

- `site/eval-system/*.html` — main targets; use `rg` for tokens like `declarative`, `code-strategy`, `AskQuestion`, `interactive`, `_shared/`.
- `plugins/zoto-eval-system/README.md` — the eval-help skill cites it as the source of truth; refresh the section list now so Phase 5 can patch precisely.
- `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md` — section/anchor menu lives in Step 2 / Step 3 tables.
- `evals/llm/_shared/sdk-bridge.ts` — its JSDoc lists every consumer; the planned `_shared/README.md` should mirror this discipline.
- `site/images/diagrams/eval-askquestion-flow.svg` — read it as a text file to summarise the current arrows; the redraw spec lives in this subtask, the actual redraw lands in subtask 11.

Reconcile against `site/eval-system/configuration.html`'s strategy-selection section: today it is documented as "set `llm.strategy: declarative` or `code` in `.zoto/eval-system/config.yml`"; after this spec, the strategy is **per-target** (analyser-driven) within a hybrid scaffold. The configuration page MUST be updated to explain the new defaults vs override semantics.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. This subtask is read-only enumeration.

## Execution Notes

### Agent Session Info
- Agent: generalPurpose (fix round; explore completed discovery)
- Started: 20260526
- Completed: 20260526

### Work Log
- Read `site/eval-system/*.html`, `eval-askquestion-flow.svg`, `plugins/zoto-eval-system/README.md`, `zoto-help-evals/SKILL.md`, `site/spec-system/*.html`.
- Wrote `audit/docs-update-map.md` (19 flagged HTML sections, README + help anchor map, SVG redraw spec, 14 cross-link entries).
- Wrote `audit/docs-spec-system-impact.md` (nav-only; no spec-system content edits required).

### Blockers Encountered
- Explore subagent could not write audit files (fix round).

### Files Modified
- `specs/20260526-eval-askquestion-strategy-bridge/audit/docs-update-map.md` (created)
- `specs/20260526-eval-askquestion-strategy-bridge/audit/docs-spec-system-impact.md` (created)
- `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-03-*.status.{yml,md}` (completed)
- `specs/20260526-eval-askquestion-strategy-bridge/subtask-03-*.md` (checklists ticked)
