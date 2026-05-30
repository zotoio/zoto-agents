# Subtask: Cursor IDE Mockup SVGs

## Metadata
- **Subtask ID**: 03
- **Feature**: github-pages-site
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260406

## Objective

Create SVG mockup images that resemble the Cursor IDE interface, showing the zoto-spec-system commands being used in realistic scenarios. These mockups will be used in the quickstart walkthrough and other documentation pages.

## Deliverables Checklist
- [x] `site/images/mockups/create-spec.svg` — Shows `/zoto-spec-create` in action:
  - Cursor IDE layout: sidebar (file explorer showing `specs/` directory), editor pane, chat/AI pane
  - Chat pane shows user typing `/zoto-spec-create` and the agent responding with clarifying questions
  - File explorer shows spec directory being created
  - Realistic Cursor chrome (title bar, tab bar, status bar)
- [x] `site/images/mockups/judge-output.svg` — Shows `/zoto-spec-judge` assessment:
  - Chat pane displays the judge's scoring rubric output
  - Show the 6 dimensions with scores (e.g., Feasibility: 4.2/5, Completeness: 4.5/5)
  - Overall verdict shown (e.g., "Approve" with score 4.3)
  - Editor pane shows the assessment markdown file being written
- [x] `site/images/mockups/execute-progress.svg` — Shows `/zoto-spec-execute` running:
  - Chat pane shows phase execution progress
  - Phase indicators: Phase 1 ✓, Phase 2 [in progress], Phase 3 [pending]
  - Subtask status table visible
  - Editor pane shows a subtask file with execution notes being filled in
- [x] `site/images/mockups/spec-files.svg` — Shows the generated spec files:
  - File explorer expanded showing the spec directory structure
  - Editor showing the spec index file with the subtask manifest table
  - Tab bar showing multiple spec files open
- [x] All mockups use consistent Cursor IDE chrome styling
- [x] Mockups match the site's dark theme

## Definition of Done
- [x] All 4 mockup SVGs created and render correctly
- [x] Cursor IDE chrome is consistent across all mockups (title bar, sidebar, panels)
- [x] Content shown in mockups is accurate to real spec system output
- [x] Text is readable at the expected display size (~800px wide)
- [x] Dark theme matches Cursor's actual dark theme reasonably well

## Implementation Notes

**Cursor IDE visual reference**:
- Dark background, similar to VS Code dark theme
- Title bar: dark gray with window controls
- Sidebar: slightly lighter dark, file tree with icons
- Editor: dark background with syntax-highlighted content
- Chat/AI pane: right side panel with message bubbles
- Status bar: bottom bar with branch info, language mode
- Tab bar: file tabs above editor

**Content for mockups** — use realistic text based on:
- The existing spec at `specs/20260403-zoto-spec-system/` as example output
- Skill workflows from `plugins/zoto-spec-system/skills/*/SKILL.md`
- Command descriptions from `plugins/zoto-spec-system/commands/*.md`

**SVG approach**: Build reusable SVG components (IDE chrome frame, sidebar, editor pane, chat pane) and compose them with different content for each mockup. Use `<text>` elements for content, `<rect>` for panels, consistent padding and spacing.

**Sizing**: Design at ~900px wide × ~550px tall to match a typical IDE window aspect ratio. Use `viewBox` for responsive scaling.

## Testing Strategy
- Open each SVG in a browser to verify rendering
- Verify text is legible at 50% and 100% display size
- Check that the IDE chrome looks consistent across all mockups

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 2026-04-06
- Completed: 2026-04-06

### Work Log
- Read skill and command files to gather accurate content for mockups (zoto-create-spec, zoto-judge-spec, zoto-execute-spec)
- Designed consistent IDE chrome layout: 900x550 viewBox, 3-panel layout (sidebar 200px, editor 370px, chat 330px), shared dark theme CSS
- Created all 4 SVG mockups with realistic content derived from actual spec system workflows
- Each mockup features: title bar with window controls, tab bar, sidebar file explorer, editor pane with line numbers, and contextual content panels
- Content uses accurate terminology: subtask manifest tables, 6-dimension scoring rubric, phase-based execution, deliverables checklists

### Blockers Encountered
None

### Files Modified
- `site/images/mockups/create-spec.svg` (created) — 12KB, shows /zoto-spec-create workflow
- `site/images/mockups/judge-output.svg` (created) — 13KB, shows /zoto-spec-judge assessment with score bars
- `site/images/mockups/execute-progress.svg` (created) — 13KB, shows /zoto-spec-execute phase progress
- `site/images/mockups/spec-files.svg` (created) — 13KB, shows spec file structure with manifest table and dependency graph

### Adversarial Verification (zoto-spec-judge)
- **Verdict: Verified**
- **Verified by**: zoto-spec-judge (independent)
- **Date**: 2026-04-06

**File existence**: All 4 SVG files confirmed on disk via glob search and direct read.

**SVG validity**: All 4 files have `<svg>` root with `xmlns` and `viewBox="0 0 900 550"`. All contain well-formed SVG elements (`<rect>`, `<text>`, `<circle>`, `<line>`, `<animate>`).

**IDE chrome per mockup**:
- `create-spec.svg` (197 lines): title bar + window controls, tab bar (2 tabs), sidebar file explorer with `specs/` tree, editor pane with line numbers showing spec content, chat pane with `/zoto-spec-create` dialog, status bar.
- `judge-output.svg` (211 lines): title bar, tab bar (2 tabs), sidebar, editor showing assessment markdown with scores table, chat pane with 6-dimension score bars + "Approve" verdict badge, status bar.
- `execute-progress.svg` (215 lines): title bar, tab bar (3 tabs), sidebar with subtask status indicators, editor showing subtask file with execution notes + blinking cursor animation, chat pane with phase indicators (Phase 1 ✓, Phase 2 in-progress, Phase 3 pending) + subtask status table + progress bar, status bar.
- `spec-files.svg` (215 lines): title bar, tab bar (5 tabs showing multiple spec files), sidebar with fully expanded spec directory tree, full-width editor showing spec index with manifest table + inline dependency graph visualization. No chat pane — acceptable per deliverable requirements which only specified file explorer, editor, and tab bar for this mockup.

**Dark theme**: All 4 share identical dark color palette (#0d1117 bg, #161b22 surface, #1c2128 title-bar, #30363d borders, #e6edf3 primary text, #8b949e secondary text) matching Cursor/GitHub dark theme.

**Consistency**: Nearly identical CSS `<style>` blocks across all 4 files. Same viewBox, layout geometry, font families, and color classes. Minor harmless variance: 2 files omit unused CSS classes (.string, .chat-*-bg).

**Text readability**: Font sizes 10-12px at 900px viewBox width. At ~800px display, text renders at legible sizes. All mockups contain substantive, non-placeholder content.

**Content accuracy**: Commands shown match actual spec system (`/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute`). Scoring rubric shows correct 6 dimensions. Phase-based execution and subtask manifest tables reflect real system behavior.
