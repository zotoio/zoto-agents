# Subtask: Design Deep-Dive Page

## Metadata
- **Subtask ID**: 08
- **Feature**: github-pages-site
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01, 02
- **Created**: 20260406

## Objective

Create the design deep-dive page (`site/spec-system/design.html`) that provides detailed technical documentation of the spec system's architecture, component design, and internal workflows.

## Deliverables Checklist
- [x] `site/spec-system/design.html` — Complete design documentation with:
  - **Architecture Overview**: High-level architecture, embed `agent-architecture.svg`
  - **Agents** section:
    - `zoto-spec-generator`: Role, capabilities, when it's invoked, how it uses skills
    - `zoto-spec-executor`: Phased execution, subagent spawning, adversarial verification flow
    - `zoto-spec-judge`: Dual-mode operation (repo assessment vs spec assessment vs subtask verification), scoring rubric, independence guarantees
    - Table comparing all three agents
  - **Skills** section:
    - `zoto-create-spec`: The 8-step workflow in detail, dependency graph construction algorithm, file naming conventions
    - `zoto-judge-spec`: 6 scoring dimensions with weights, verdict thresholds, report format
    - `zoto-execute-spec`: Manifest loading, phase execution, parallel limits, adversarial verification loop, resume semantics
    - How skills relate to agents
  - **Commands** section:
    - `/zoto-spec-create`: Arguments, invocation modes (interactive, file-attached, quoted description)
    - `/zoto-spec-judge`: With/without arguments behavior, repo vs spec assessment
    - `/zoto-spec-execute`: Spec discovery (latest, path, `--resume`), execution flow
  - **Hooks & Rules**:
    - Session start hook: when it fires, what it checks, nudge behavior
    - Integration rule: what it teaches agents, when it applies
  - **Configuration System**: How `.zoto-spec-system/config.json` is loaded and used (link to Configuration page for full reference)
  - **Spec File Format** section:
    - Index file structure (status, overview, key decisions, manifest, dependency graph, execution order, DoD)
    - Subtask file structure (metadata, objective, deliverables, DoD, implementation notes, execution notes)
    - Assessment file structure
    - Execution report structure
    - Embed `spec-directory-layout.svg`
  - **Execution Model** section:
    - Dependency graph and phase computation
    - Parallel execution with `parallelLimit`
    - Adversarial verification: why fresh agents, what they check, failure handling
    - Embed `phase-execution.svg`
  - **Extension Points**: Memory system extension (documented but not included), custom `unitOfWork`, custom `specsDir`
- [x] Table of contents at the top of the page (anchor links to each section)
- [x] Sidebar navigation with "Design" highlighted
- [x] All relevant SVG diagrams from subtask 02 embedded (note: `spec-directory-layout.svg` was never created by subtask 02; the 2 existing SVGs — `agent-architecture.svg` and `phase-execution.svg` — are embedded; a code block directory listing substitutes for the missing diagram)
- [x] Code examples showing actual file formats (spec index, subtask, config)

## Definition of Done
- [x] All components (agents, skills, commands, hooks, rules) are documented accurately — verified: all 3 agents, 3 skills, 3 commands, session hook, and integration rule cross-referenced against source files
- [x] Architecture diagrams are embedded and referenced in text — verified: `agent-architecture.svg` and `phase-execution.svg` embedded with `<figure>` elements
- [x] A developer could understand the system's internals from this page alone — verified: 1347-line comprehensive reference covering all components, workflows, formats, and extension points
- [x] Code examples show real file formats, not pseudocode — verified: 7 code examples match actual plugin file formats
- [x] Table of contents links work correctly — verified: all 24 anchor `href`s match corresponding element `id` attributes
- [x] Content matches the current plugin implementation (v0.6.0) — verified: descriptions, workflows, scoring dimensions, thresholds, and safeguards all match source files

## Implementation Notes

**Source material** — read these files for accurate content:
- `plugins/zoto-spec-system/agents/zoto-spec-generator.md` — generator agent details
- `plugins/zoto-spec-system/agents/zoto-spec-executor.md` — executor agent details
- `plugins/zoto-spec-system/agents/zoto-spec-judge.md` — judge agent details
- `plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md` — creation workflow
- `plugins/zoto-spec-system/skills/zoto-judge-spec/SKILL.md` — judging workflow and rubric
- `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` — execution workflow
- `plugins/zoto-spec-system/commands/*.md` — command interfaces
- `plugins/zoto-spec-system/hooks/hooks.json` — hook config
- `plugins/zoto-spec-system/hooks/zoto-session-start.ts` — hook implementation
- `plugins/zoto-spec-system/rules/zoto-spec-system.mdc` — integration rule
- `plugins/zoto-spec-system/docs/config-schema.md` — config schema
- `specs/20260403-zoto-spec-system/` — real spec examples for format reference

**This is the longest page** — use clear section headings, good whitespace, and a sticky table of contents to keep it navigable.

**Code examples**: Show actual file snippets from the existing spec (`specs/20260403-zoto-spec-system/`) as format examples. Use abbreviated versions with `// ...` for long sections.

## Testing Strategy
- Verify each section heading has a corresponding TOC anchor link
- Cross-reference agent/skill/command descriptions with actual plugin files
- Check all embedded diagrams load
- Verify the page is navigable despite its length

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 2026-04-06
- Completed: 2026-04-06

### Work Log
- Read all source material: 3 agent files, 3 skill files, 3 command files, hooks.json, session-start hook, integration rule, config schema
- Read `site/css/style.css` for HTML template pattern and available CSS classes
- Read `site/spec-system/configuration.html` as reference for sidebar layout and page structure
- Verified available SVG diagrams: `agent-architecture.svg`, `phase-execution.svg`, `workflow-overview.svg` (note: `spec-directory-layout.svg` does not exist, used code block directory listing instead)
- Created `site/spec-system/design.html` with all 9 sections:
  1. Architecture Overview with `agent-architecture.svg` embed
  2. Agents section (generator, executor, judge) with full comparison table
  3. Skills section (create-spec 8-step workflow, judge-spec 6 scoring dimensions, execute-spec manifest/phase/verify/resume) with skills-to-agents mapping table
  4. Commands section (/zoto-spec-create, /zoto-spec-judge, /zoto-spec-execute) with argument handling and safeguards table
  5. Hooks & Rules (session start hook behavior, integration rule)
  6. Configuration System (summary + link to Configuration page)
  7. Spec File Format (index, subtask, assessment, execution report with full code examples)
  8. Execution Model with `phase-execution.svg` embed, dependency graph invariants, parallel execution, adversarial verification
  9. Extension Points (memory system, custom unitOfWork, custom specsDir)
- Included Table of Contents with anchor links to all sections and subsections
- Used sidebar layout with "Design" highlighted as active
- Used breadcrumb navigation (Home > Spec System > Design)
- Embedded `agent-architecture.svg` and `phase-execution.svg` with alt text
- All code examples use real file formats derived from actual plugin source files

### Blockers Encountered
- `spec-directory-layout.svg` does not exist in `site/images/diagrams/`; used a code block directory listing instead

### Files Modified
- `site/spec-system/design.html` (created)
- `specs/20260406-github-pages-site/subtask-08-github-pages-site-design-page-20260406.md` (updated)

### Adversarial Verification
- **Verdict: Verified**
- **Verifier**: zoto-spec-judge (fresh context)
- **Date**: 2026-04-06
- All 5 Deliverables Checklist items independently confirmed
- All 6 Definition of Done items independently confirmed
- Cross-referenced page content against 11 source files (3 agents, 3 skills, 3 commands, hooks.json, integration rule)
- All 24 TOC anchor links resolve to matching `id` attributes
- Both existing SVG diagrams confirmed embedded; missing `spec-directory-layout.svg` is an upstream subtask 02 issue (diagram was never created), not a subtask 08 failure — code block substitute is reasonable
- All relative paths confirmed (CSS, JS, images, page links)
