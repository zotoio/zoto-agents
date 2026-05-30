# Subtask: Site documentation & SVG update

## Metadata
- **Subtask ID**: 11
- **Feature**: Eval AskQuestion Strategy Bridge
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: claude-opus-4-7-thinking-xhigh
- **Dependencies**: 03, 09, 10
- **Created**: 20260526

## Objective

Update the static HTML documentation site under `site/eval-system/` to describe the new analyser-driven hybrid strategy, and regenerate `site/images/diagrams/eval-askquestion-flow.svg` so the visual matches the new flow. Cross-link from `site/spec-system/` where references exist.

## Deliverables Checklist
- [ ] `site/eval-system/index.html` — overview gains a "Strategy bridge" section explaining declarative-vs-code + the analyser classification, with a link to the design page.
- [ ] `site/eval-system/design.html` — full flow described: analyser → classification → stamper → backend → bridge (when interactive) → SDK → report. Reference `_shared/askquestion-bridge.ts` and the `interaction_style` annotation.
- [ ] `site/eval-system/configuration.html` — `llm.strategy` documentation refreshed to explain that strategy is per-target (analyser-driven) within a hybrid scaffold; the global `llm.strategy:` knob in `.zoto/eval-system/config.yml` becomes the **fallback default** when classification is unavailable, not the per-target choice.
- [ ] `site/eval-system/quickstart.html` — new "What gets stamped where?" callout pointing to the design page.
- [ ] `site/images/diagrams/eval-askquestion-flow.svg` regenerated to show: source primitive → analyser → `{requiresInteraction, interactionStyle}` → stamper → declarative JSON OR code-strategy TS → askquestion-bridge (interactive only) → @cursor/sdk → `report.yml` with `backend: declarative|code`.
- [ ] Cross-link audit performed against `site/spec-system/{index,design,configuration,quickstart}.html` per Subtask 03's `docs-spec-system-impact.md`; broken or stale links fixed.
- [ ] Markup smoke check: pages render without unclosed tags (use a simple HTML linter or `node --check` on any inline scripts touched).

## Definition of Done
- [ ] Every page touched validates as well-formed HTML (or, if a strict validator isn't available, a hand check confirms no obvious tag mismatches).
- [ ] The SVG has a `<title>` and `<desc>` element describing the bridge so the page stays accessible.
- [ ] `rg -l "strategy.*declarative" site/eval-system/` returns the same set of files before vs after, with each match in the new context (no orphaned old phrasing).
- [ ] Subtask 03's `docs-update-map.md` checklist is fully ticked.
- [ ] No code files outside `site/` and the spec audit directory are modified.

## Implementation Notes

Source-of-truth alignment:
- The site references `plugins/zoto-eval-system/README.md` indirectly through the eval-help skill. Subtask 12 updates the README; this subtask updates the site. Keep the two consistent — if a README section is renamed there, the corresponding site link needs updating here.
- The site uses Prism.js for syntax highlighting; preserve existing class names on `<code>` elements.

SVG redraw guidance:
- Subtask 03 produced a redraw spec. Implement it with a vector editor or by hand-editing the SVG XML. Prefer the latter to keep the diff reviewable.
- Use the existing colour palette (the other diagrams in `site/images/diagrams/` are a reference).
- Add `aria-hidden="false"` and a `<title>` so the diagram is discoverable to screen readers.

Cross-link audit:
- For every match in Subtask 03's cross-link list, follow the link and verify it still resolves. Update or remove broken links.
- If `site/spec-system/` references the eval system (for Spec → Eval handoff), refresh those mentions.

Avoid:
- Editing `site/index.html` unless explicitly listed in Subtask 03's map.
- Touching `site/css/` or `site/js/` files (unless absolutely required for accessibility).

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- A simple HTML validator (browser open + visual check OR `node` script that walks `site/eval-system/*.html`).
- Open the page in a browser and visually verify the SVG renders.

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
