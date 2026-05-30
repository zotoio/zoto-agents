# Subtask: Spec System Overview Page

## Metadata
- **Subtask ID**: 06
- **Feature**: github-pages-site
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01, 02
- **Created**: 20260406

## Objective

Create the spec system overview page (`site/spec-system/index.html`) — the primary introduction to what the zoto-spec-system is, why it exists, and how it fits together.

## Deliverables Checklist
- [x] `site/spec-system/index.html` — Complete overview page with:
  - **What is the Spec System?**: High-level explanation — a Cursor plugin that brings structured engineering specs to AI-assisted development
  - **The Problem**: Why unstructured AI coding sessions fail for complex tasks — context loss, inconsistency, no verification
  - **The Solution**: Three-phase workflow with adversarial verification — plan thoroughly, assess independently, execute with guardrails
  - **Key Features** section:
    - Structured spec creation with dependency graphs
    - Independent quality assessment with scoring rubric
    - Phased parallel execution with configurable limits
    - Adversarial verification — fresh agents verify each subtask
    - Configurable terminology and directory structure
  - **Workflow Overview**: Embed `workflow-overview.svg` diagram with explanatory text for each phase
  - **Components**: Embed `agent-architecture.svg` diagram showing the agents, skills, commands, and how they relate
  - **Getting Started**: Brief "next steps" — link to Quickstart for hands-on tutorial, Design for deep-dive, Configuration for setup
- [x] Page uses sidebar navigation layout, "Overview" highlighted as active
- [x] Proper heading hierarchy for SEO and accessibility
- [x] Diagrams from subtask 02 embedded as `<img>` with alt text

## Definition of Done
- [x] Page clearly explains what the spec system is and why someone would use it
- [x] Both SVG diagrams (workflow overview, agent architecture) are embedded and render correctly
- [x] Sidebar navigation works with "Overview" as active page
- [x] Content is accurate to the current plugin (v0.6.0)
- [x] Writing is clear and accessible to developers unfamiliar with the system

## Implementation Notes

**Content guidance**: The overview should sell the value proposition before diving into mechanics. Start with the problem (AI coding sessions losing context on complex tasks), then the solution (structured specs), then the components.

**Diagram embedding**:
```html
<figure>
  <img src="../images/diagrams/workflow-overview.svg" alt="Spec System workflow: Create → Judge → Execute">
  <figcaption>The three-phase spec lifecycle</figcaption>
</figure>
```

**Source material for accurate content**:
- `plugins/zoto-spec-system/README.md` — overview and feature list
- `plugins/zoto-spec-system/agents/*.md` — agent capabilities
- `plugins/zoto-spec-system/skills/*/SKILL.md` — workflow details

**Tone**: Professional developer documentation. Clear, concise, no marketing fluff. Think Stripe docs or Tailwind docs in tone.

## Testing Strategy
- Read through as a developer unfamiliar with the system — does it make sense?
- Verify diagram images load and have descriptive alt text
- Check all links to other spec-system pages

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 2026-04-06
- Completed: 2026-04-06

### Work Log
- Read `site/css/style.css` to understand the HTML template pattern and available CSS classes
- Read `site/js/main.js` for sidebar toggle and nav highlight behavior
- Read `site/spec-system/configuration.html` as reference for sidebar layout, breadcrumbs, and page structure
- Read `plugins/zoto-spec-system/README.md` for feature list and workflow overview
- Read all three agent files (`zoto-spec-generator.md`, `zoto-spec-executor.md`, `zoto-spec-judge.md`) for accurate component descriptions
- Read both SVG diagrams (`workflow-overview.svg`, `agent-architecture.svg`) to write accurate alt text
- Created `site/spec-system/index.html` with all required sections:
  - Hero intro paragraph explaining the plugin at a glance
  - "The Problem" section covering context loss, dependency issues, inconsistency, and lack of verification
  - "The Solution" section with a 3-card grid for Create/Judge/Execute phases
  - "Key Features" with 5 subsections matching deliverables checklist
  - "Workflow Overview" embedding `workflow-overview.svg` with descriptive alt text and per-phase explanations
  - "Components" embedding `agent-architecture.svg` with full component table (commands, agents, skills, hook, rule, config)
  - "Getting Started" with 3-card grid linking to Quickstart, Design, and Configuration
- Used sidebar layout matching `configuration.html` with "Overview" as active link
- Used proper heading hierarchy (h1 > h2 > h3) throughout
- All paths are relative (../css/style.css, ../images/diagrams/*.svg, etc.)

### Blockers Encountered
None.

### Files Modified
- `site/spec-system/index.html` (created)

### Adversarial Verification
- **Verdict: Verified**
- Verifier: zoto-spec-judge
- Date: 2026-04-06

**Deliverables Checklist — all items confirmed:**
- `site/spec-system/index.html` exists (351 lines)
- All seven required content sections present: intro "What is" paragraph under h1, The Problem (h2), The Solution (h2), Key Features (h2 with 5 h3 subsections), Workflow Overview (h2), Components (h2), Getting Started (h2)
- `workflow-overview.svg` embedded at line 196 with detailed alt text; file exists on disk at `site/images/diagrams/workflow-overview.svg`
- `agent-architecture.svg` embedded at line 236 with detailed alt text; file exists on disk at `site/images/diagrams/agent-architecture.svg`
- Sidebar navigation present (lines 33–43) with `class="sidebar-link active"` on "Overview" link
- Heading hierarchy is correct: single h1 → six h2s → h3s nested only under h2s, no skipped levels
- All internal links use relative paths (`../css/style.css`, `../js/main.js`, `../images/diagrams/*.svg`, `quickstart.html`, etc.); CDN links for Prism.js are external and match the pattern in `configuration.html`
- Semantic HTML confirmed: `<nav>`, `<aside>`, `<main>`, `<figure>`/`<figcaption>`, `<table>` with `<thead>`/`<tbody>`, `<footer>`, `<html lang="en">`

**Definition of Done — all items confirmed:**
- Page clearly explains what the system is (intro paragraph) and why (Problem section with 4 pain points, Solution section with 3-phase workflow)
- Both SVGs embedded via `<img>` inside `<figure>` elements with descriptive alt text; source files verified on disk
- Sidebar active state confirmed with CSS class
- Content accuracy verified against `plugin.json` (v0.6.0), `README.md`, executor skill, and config schema: commands, agents, skills, hook, rule, config, parallel limit (default 4), verdict thresholds (4.0+/3.0–3.9/<3.0), six scoring dimensions all match
- Writing follows a logical progression (problem → solution → features → workflow → components → next steps) accessible to newcomers
