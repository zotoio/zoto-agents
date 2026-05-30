# Subtask: Spec-System Pages Restyled to Matrix Theme

## Metadata
- **Subtask ID**: 03
- **Feature**: site-evals-matrix-revamp
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 01, 02
- **Created**: 20260506

## Objective

Re-skin the existing `site/spec-system/{index,quickstart,configuration,design}.html` pages so they fully adopt the Matrix theme tokens introduced in subtask 01 (no `--charcoal-*` aliases, no inline `landing-charcoal` overrides), refresh inline copy where it leans on charcoal-era visual metaphors, and add the second-plugin dropdown to the top nav. **Information architecture and section structure stay exactly as they are today** — this is a presentation-layer pass plus a small navigation update; full copy rewrites for non-site documents happen in subtask 06.

## Deliverables Checklist

- [ ] **All four pages** (`site/spec-system/index.html`, `quickstart.html`, `configuration.html`, `design.html`):
  - body wrapper uses the Matrix-rain backdrop wiring from subtask 01 (`<canvas class="matrix-rain-canvas">`, `class="matrix-rain-soft"` on `<body>`, `prism-matrix.css` link, `matrix-rain.js` script include).
  - any inline `<style>` blocks that re-declare `--charcoal-*` (none expected today — verify with `grep`) are removed; pages rely on `style.css` tokens.
  - top nav becomes peer-aware: add the second dropdown for **Eval System** (Overview / Quickstart / Design / Configuration) mirroring the existing Spec System dropdown.
  - existing breadcrumb + sidebar + main-content structure is **preserved**.
  - active-page highlighting in the sidebar still uses `class="sidebar-link active"`.
- [ ] **Inline copy adjustments** — light edits only:
  - replace any references to "the flagship plugin" / "our flagship plugin" with neutral wording.
  - keep deep technical content (the Plan-mode comparison table, the workflow lifecycle diagram, the configuration tables) intact.
  - if any page contains the literal "Flagship" or "the only plugin" wording, rewrite in place.
- [ ] **`--charcoal-*` site-wide sweep** — verify (via `git grep -i 'charcoal' site/`) that no `--charcoal-*` token, `landing-charcoal` class, or inline override remains anywhere in `site/` after subtask 02 has migrated `site/index.html`. The spec-system pages do not use `--charcoal-*` today (they consume `--color-*` from `style.css`, which subtask 01 has already pointed at the Matrix palette), so this is a verification step rather than an active rewrite. If any stragglers are found, fix in place by replacing the consumer with its `--matrix-*` equivalent or with the existing `--color-*` semantic name.
- [ ] **Sidebar headings** — keep "Spec System" as the heading. No structural changes to the sidebar list.
- [ ] **Cross-links** — verify all in-page links to `../index.html` and to GitHub still resolve. Any broken anchors flagged for subtask 07.

## Definition of Done

- [ ] All four spec-system pages render under the Matrix theme with no visible regressions to the existing IA, sidebar nav, or section copy.
- [ ] Top nav on every spec-system page exposes both plugins via dropdowns.
- [ ] `git grep -i 'charcoal' site/` returns no matches across the whole `site/` tree (no token, no class, no inline override).
- [ ] `grep -n -i 'flagship' site/spec-system/*.html` returns no matches.
- [ ] All Prism-highlighted code blocks remain readable on the new palette.
- [ ] No linter errors in modified files.

## Implementation Notes

- This subtask depends on subtask 02 mostly as a defensive serialisation against parallel edits to `site/css/style.css` — subtask 02 may add `.plugin-grid` / `.plugin-card` rules to `style.css` if `.featured-card` does not generalise; this subtask is restricted to spec-system HTML edits and the cross-tree `--charcoal-*` verification sweep, so it should not need to write `style.css` at all. After subtask 02's inline `--charcoal-*` migration, this subtask only verifies the sweep is clean and patches any straggler in `site/spec-system/*.html` (the spec-system pages already consume `--color-*` semantic tokens, so the verification should be a no-op in practice).
- Be conservative on copy edits — the spec-system pages were authored by the prior github-pages-site spec and are intentionally precise. Restrict copy changes to "flagship" / "primary plugin" mentions and to phrases that explicitly cast the spec-system as the only plugin in the monorepo.
- Preserve every existing `id` attribute; subtask 07's link-check will fail if you rename anchors.
- Both dropdown menus (Spec System and Eval System) should follow the existing `.nav-dropdown` / `.nav-dropdown-menu` markup pattern from `site/index.html`.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Manual visual diff at `python3 -m http.server` against the prior version of each page.
- Confirm sidebar `.active` state still highlights the current page.
- Confirm both top-nav dropdowns open via hover and via keyboard focus.

## Execution Notes

[To be filled by executing agent]

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
