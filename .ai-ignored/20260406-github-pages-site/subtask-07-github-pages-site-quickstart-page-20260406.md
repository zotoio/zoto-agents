# Subtask: Quickstart Walkthrough Page

## Metadata
- **Subtask ID**: 07
- **Feature**: github-pages-site
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01, 02, 03
- **Created**: 20260406

## Objective

Create the step-by-step quickstart page (`site/spec-system/quickstart.html`) that walks a developer through the complete spec system lifecycle using a realistic example scenario.

## Deliverables Checklist
- [x] `site/spec-system/quickstart.html` — Complete quickstart with:
  - **Prerequisites**: Cursor IDE installed, zoto-spec-system plugin installed (link to installation), a project to work in
  - **Step 0: Configure** (optional): Creating `.zoto-spec-system/config.json`, explain defaults work fine
  - **Step 1: Create a Spec** (`/zoto-spec-create`):
    - What to type in the Cursor chat
    - What happens: agent asks clarifying questions, explores codebase, proposes decisions
    - What you'll see: embed `create-spec.svg` mockup
    - What gets created: spec directory with index and subtask files
    - Embed `spec-files.svg` mockup showing the generated files
    - Show example spec index file content (code block with syntax highlighting)
  - **Step 2: Judge the Spec** (`/zoto-spec-judge`):
    - Running the judge command with the spec path
    - What happens: independent agent assesses quality across 6 dimensions
    - What you'll see: embed `judge-output.svg` mockup
    - Understanding the verdict: Approve (4.0+), Conditional (3.0–3.9), Reject (<3.0)
    - What to do if the score is low
  - **Step 3: Execute the Spec** (`/zoto-spec-execute`):
    - Running the execute command
    - What happens: phased execution, subagents spawned, adversarial verification
    - What you'll see: embed `execute-progress.svg` mockup
    - Phase execution model: parallel within phases, sequential across phases
    - What happens when a subtask fails verification
  - **Step 4: Verify & Ship**:
    - Reading the execution report
    - Reviewing the changes made
    - Final manual review checklist
  - **What's Next**: Links to Design deep-dive, Configuration reference
- [x] Each step has:
  - Clear numbered heading (Step 1, Step 2, etc.)
  - Brief description of what happens
  - Code snippet showing the command or output
  - Mockup image where applicable
  - "What to expect" summary
- [x] Sidebar navigation with "Quickstart" highlighted
- [x] All Cursor IDE mockups from subtask 03 embedded appropriately
- [x] Code samples use Prism.js highlighting (bash for commands, markdown/json for output)

## Definition of Done
- [x] A developer could follow this guide from start to finish and understand the full lifecycle
- [x] All 4 Cursor IDE mockup images are embedded with alt text
- [x] Code examples are realistic and accurate to the actual command/output format
- [x] Steps flow logically and each builds on the previous
- [x] Page is not overwhelming — good use of headings, whitespace, and progressive disclosure

## Implementation Notes

**Example scenario**: Use a realistic but generic example. Something like "adding a caching layer to a web application" — concrete enough to be believable, generic enough to apply broadly.

**Command examples**:
```
Step 1: /zoto-spec-create Add a Redis caching layer to our API endpoints
Step 2: /zoto-spec-judge specs/20260406-redis-caching/spec-redis-caching-20260406.md
Step 3: /zoto-spec-execute specs/20260406-redis-caching/
Step 4: (manual review)
```

**Code blocks for output**: Show abbreviated but realistic output. Don't show full spec files — show the key parts (manifest table, dependency graph, scoring rubric).

**Source material**:
- `plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md` — the 8-step creation workflow
- `plugins/zoto-spec-system/skills/zoto-judge-spec/SKILL.md` — scoring dimensions and verdicts
- `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` — execution workflow
- `plugins/zoto-spec-system/commands/*.md` — command syntax and arguments
- `specs/20260403-zoto-spec-system/` — a real example of generated spec files

**Mockup placement**: Each Step section should have its mockup image near the top, showing what the developer will see in Cursor when running that step.

## Testing Strategy
- Read through as a first-time user — is each step clear?
- Verify all mockup images load and have alt text
- Check that command syntax matches actual command definitions
- Verify links to other pages work

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 2026-04-06
- Completed: 2026-04-06

### Work Log
- Read `site/css/style.css` for HTML template pattern and available CSS classes
- Read `site/spec-system/configuration.html` as reference for sidebar layout and page structure
- Read all three SKILL.md files (create, judge, execute) for accurate workflow descriptions
- Read command definitions for correct syntax examples
- Confirmed all 4 mockup SVGs exist at `site/images/mockups/`
- Created `site/spec-system/quickstart.html` with full lifecycle walkthrough
- Used "Redis caching layer" as the running example throughout
- Embedded all 4 mockups (create-spec.svg, spec-files.svg, judge-output.svg, execute-progress.svg) with descriptive alt text
- Used Prism.js highlighting: bash for commands, markdown for spec output, json for config
- Included workflow-overview.svg diagram at the top for visual overview
- Structured with clear numbered steps (0–4), callouts, tables, and "What to expect" summaries
- Added "What's Next" section with card links to Design and Configuration pages

### Blockers Encountered
None

### Files Modified
- `site/spec-system/quickstart.html` (created)
- `specs/20260406-github-pages-site/subtask-07-github-pages-site-quickstart-page-20260406.md` (updated checklists)
