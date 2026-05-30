# Subtask: SVG Workflow & Architecture Diagrams

## Metadata
- **Subtask ID**: 02
- **Feature**: github-pages-site
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260406

## Objective

Create pre-rendered SVG diagrams that illustrate the zoto-spec-system's architecture, workflow, and execution model. These diagrams will be embedded in the overview, quickstart, and design pages.

## Deliverables Checklist
- [x] `site/images/diagrams/workflow-overview.svg` — The full spec lifecycle flow:
  - `/zoto-spec-create` → requirements gathering → codebase exploration → spec files created
  - → `/zoto-spec-judge` → independent assessment → scoring rubric → verdict
  - → `/zoto-spec-execute` → phased execution → adversarial verification per subtask → execution report
  - Show the three stages as distinct swim lanes or connected phases
  - Include the key artifacts produced at each stage (spec files, assessment, execution report)
- [x] `site/images/diagrams/agent-architecture.svg` — Component relationship diagram:
  - Three agents: `zoto-spec-generator`, `zoto-spec-executor`, `zoto-spec-judge`
  - Three skills: `zoto-create-spec`, `zoto-judge-spec`, `zoto-execute-spec`
  - Three commands: `/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute`
  - Show how commands invoke agents, agents use skills
  - Include hooks (`zoto-session-start`) and rules (`zoto-spec-system.mdc`)
  - Show config (`.zoto-spec-system/config.json`) feeding into all components
- [x] `site/images/diagrams/phase-execution.svg` — Parallel phase execution model:
  - Show a sample spec with phases 1–4
  - Illustrate how subtasks within a phase run in parallel (up to `parallelLimit`)
  - Show the adversarial judge verification gate between phases
  - Indicate that a failed verification blocks progression
- [x] `site/images/diagrams/spec-directory-layout.svg` — File structure diagram:
  - Show the spec directory layout: `specs/[yyyymmdd]-[feature]/`
  - Index file, subtask files, assessment file, execution report
  - Annotate each file's purpose
- [x] All SVGs use a consistent visual style matching the site's dark theme

## Definition of Done
- [x] All 4 SVG files created and render correctly in modern browsers
- [x] Visual style is consistent: same colors, fonts, line weights, arrow styles
- [x] Diagrams are accurate to the current plugin implementation (v0.6.0)
- [x] SVGs are optimized (no unnecessary metadata, reasonable file size)
- [x] Each SVG includes a `<title>` element for accessibility

## Implementation Notes

**Visual style requirements**:
- Background: transparent or `#0d1117` (matches site background)
- Node/box fills: `#161b22` with `#30363d` borders
- Text: `#e6edf3` (primary), `#8b949e` (secondary/labels)
- Arrows/connections: `#58a6ff` or `#8b949e`
- Accent highlights: `#58a6ff` (links/active), `#3fb950` (success), `#d29922` (warning)
- Font: `system-ui, -apple-system, sans-serif` (or embed a clean sans-serif)
- Consistent padding, border-radius (6-8px), and spacing

**Content accuracy**: Read the following files for accurate component information:
- `plugins/zoto-spec-system/.cursor-plugin/plugin.json` — component registry
- `plugins/zoto-spec-system/agents/*.md` — agent descriptions and behaviors
- `plugins/zoto-spec-system/skills/*/SKILL.md` — skill workflows
- `plugins/zoto-spec-system/commands/*.md` — command interfaces
- `plugins/zoto-spec-system/hooks/hooks.json` — hook configuration
- `plugins/zoto-spec-system/docs/config-schema.md` — config keys

**SVG sizing**: Design at ~800–1000px wide, height as needed. Use `viewBox` for responsive scaling.

## Testing Strategy
- Open each SVG directly in a browser to verify rendering
- Embed in a test HTML page with the dark theme CSS to verify visual integration
- Check that text is readable and diagrams are clear at both full and reduced sizes

## Execution Notes

### Agent Session Info
- Agent: generalPurpose (subtask 02 executor)
- Started: 2026-04-06
- Completed: 2026-04-06

### Work Log
- Read all plugin source files (plugin.json, agents, commands, skills, hooks) for content accuracy
- Created all 4 SVG diagrams with consistent dark-theme visual style
- All SVGs use viewBox for responsive scaling, `<title>` for accessibility
- Visual style: #0d1117 background, #161b22 fills, #30363d borders, #58a6ff/#3fb950/#d29922 accents
- Verified file sizes are reasonable (5.9–10KB each, no unnecessary metadata)

### Adversarial Verification (zoto-spec-judge)
- **Verdict: Partial**
- **Verified by**: zoto-spec-judge (independent adversarial verification)
- **Date**: 2026-04-06

**File Existence**: All 4 SVG files confirmed present on disk. File sizes are reasonable (5.9–10.0 KB). `file` command identifies all as "SVG Scalable Vector Graphics image".

**CRITICAL — Invalid XML in all 4 SVGs**: Every SVG file fails XML parsing (`xml.etree.ElementTree.parse()` reports "not well-formed (invalid token)" on line 2 for each). Root cause: control characters and invalid bytes embedded throughout:

1. **workflow-overview.svg** (5 lines affected):
   - `0x14` (DC4 control char) used as separator in `<title>` and footer where `—` (em-dash) was intended
   - `0x13` (DC3) in verdict score text ("4.0+" and "3.0–3.9")
   - `0x17` (ETB) in "< 3.0" text

2. **agent-architecture.svg** (4 lines affected):
   - `0x14` in `<title>`
   - `0x92` (Windows-1252 right single quote) used where `→` arrows were intended in subtitle "Commands → Agents → Skills"
   - `0x92` in XML comments (lines 37, 64)

3. **phase-execution.svg** (4 lines affected):
   - `0x14` in `<title>`, legend text ("Pass → next phase"), and footer

4. **spec-directory-layout.svg** (10 lines affected — worst case):
   - `0x14` in `<title>` and footer
   - `0x1C` (file separator) + `0x00` (NULL bytes) on 7 lines — used where tree connector characters (`├──`, `└──`) were intended
   - **NULL bytes (`0x00`) are absolutely forbidden in XML 1.0** and will cause hard failures in strict parsers

**Impact**: These encoding errors mean the SVGs are not valid XML documents. While lenient browser HTML parsers may render them as `<img>` sources, they will fail in any context that requires XML parsing (inline SVG embedding, server-side rendering, accessibility tools, SVG editors). The `<title>` elements contain corrupt bytes in every file, defeating their accessibility purpose.

**Content — phase-execution.svg**: The deliverable specifies "Show a sample spec with phases 1–4" but the diagram only contains 3 phases (Phase 1, Phase 2, Phase 3). The "Final Verification" section is not labeled as Phase 4.

**What passed**:
- Color palette is fully consistent across all 4 files: `#0d1117` background, `#161b22` fills, `#30363d` borders, `#e6edf3`/`#8b949e` text, `#58a6ff`/`#3fb950`/`#d29922` accents
- Font family consistent: `system-ui, -apple-system, sans-serif`
- All files use `viewBox` for responsive scaling
- All files have `<svg>` root with `xmlns` declaration
- Diagram structure and component labels are accurate to plugin v0.6.0 (correct agent/skill/command names, correct workflow stages, correct hook/rule/config references)
- File sizes are reasonable and proportional to content complexity

**Required fixes**:
1. Replace all invalid bytes with proper UTF-8 characters or XML entities (`&#x2014;` for em-dash, `&#x2192;` for arrow, `&#x251C;&#x2500;&#x2500;` for tree connectors, `&#x2013;` for en-dash)
2. Eliminate all NULL bytes from spec-directory-layout.svg
3. Add a 4th phase to phase-execution.svg to match the deliverable spec
4. Re-validate all files parse as valid XML after fixes

### Post-Verification Fixes (2026-04-06)
- **Invalid XML characters**: Removed embedded control characters (0x14, 0x13, 0x17, 0x92, 0x1C) and NULL bytes (0x00) from all 4 SVG files. Replaced with proper UTF-8/XML entities: em-dash (&#x2014;), en-dash (&#x2013;), right arrow (&#x2192;), tree connectors (&#x2514;&#x2500;&#x2500; / &#x251C;&#x2500;&#x2500;). All files now pass `xml.etree.ElementTree.parse()` validation.
- **phase-execution.svg Phase 4**: Redesigned diagram to show 4 phases (was 3). Added Phase 4 with Subtasks 08-09, plus a third Judge Gate between Phase 3 and Phase 4. Compact layout fits all 4 phases with verification gates within the 960px viewBox.

### Blockers Encountered
None

### Files Modified
- `site/images/diagrams/workflow-overview.svg` (created, 9.9KB)
- `site/images/diagrams/agent-architecture.svg` (created, 10.0KB)
- `site/images/diagrams/phase-execution.svg` (created, 9.9KB)
- `site/images/diagrams/spec-directory-layout.svg` (created, 5.9KB)
