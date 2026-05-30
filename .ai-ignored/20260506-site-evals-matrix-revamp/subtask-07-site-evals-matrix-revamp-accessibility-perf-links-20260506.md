# Subtask: Accessibility, Performance & Link Validation

## Metadata
- **Subtask ID**: 07
- **Feature**: site-evals-matrix-revamp
- **Assigned Subagent**: integrity-expert
- **Dependencies**: 02, 03, 05, 06
- **Created**: 20260506

## Objective

Independently verify that the revamped site (landing + spec-system + eval-system) meets the accessibility, performance, motion-respect, and link-integrity bars stated in the spec's Definition of Done. Flag and (where straightforward) fix issues; otherwise file a structured findings list and hand back to the subtask whose surface owns the regression.

## Deliverables Checklist

- [ ] **Accessibility — `pa11y`** run against every HTML file in `site/`:
  - landing (`site/index.html`)
  - spec-system tree (`site/spec-system/{index,quickstart,configuration,design}.html`)
  - eval-system tree (`site/eval-system/{index,quickstart,configuration,design}.html`)
  - 404 page (`site/404.html`)
  - record any WCAG-AA failures with file + selector + rule id.
- [ ] **Accessibility — `axe-core`** run via headless puppeteer (or `pa11y --runner axe`) on the same set of pages — record overlap with pa11y findings.
- [ ] **Contrast** — verify body copy, headings, links, and button labels meet WCAG AA against the Matrix palette (`#c8ffc8` on `#000` for body; `#00ff7f` on `#000` for accents). Flag any token combinations that fall below 4.5:1 (normal text) / 3:1 (large text) and propose hex adjustments back to subtask 01's executor.
- [ ] **Motion respect** — DevTools "Emulate CSS media: prefers-reduced-motion: reduce" on landing + 404 + at least one docs page; verify the matrix-rain canvas does not animate (pixel-snapshot delta = 0 across two frames separated by ≥5 s).
- [ ] **Tab visibility** — open the landing page in a tab, switch tabs for ≥10 s, return; verify CPU usage drops to near zero while hidden (DevTools Performance Monitor).
- [ ] **Link integrity** — run `linkinator site/ --recurse` (or equivalent); record every broken in-site link and every broken external link. Fix the in-site links (typically a missing href fragment or a wrong relative depth); flag external 404s back to the owning subtask.
- [ ] **Markup** — run an HTML validator (`html-validate` or `vnu`) over every modified HTML file; record any errors and fix common ones (missing `alt`, mismatched tags, invalid `meta` formatting). Warnings are acceptable; document them.
- [ ] **Lighthouse** — run a Lighthouse pass (Performance + Accessibility + Best Practices + SEO) against the landing page on a desktop profile and a Moto-G-class mobile profile. Record scores in the findings file. **Block / warn split**: a mobile Performance score **< 70** blocks this subtask; a score in the **70–74** band does **not** block but records a `warn` finding plus a structured recommendation (in the findings file) for subtask 01 to reduce canvas DPR / glyph density on mobile. The same recommendation also appears in the judge `fix_list` so the executor can route it back to subtask 01 if a follow-up pass is needed. Score ≥ 75 is a clean pass. Desktop Performance and Accessibility / Best Practices / SEO scores are documented but not blocking on this subtask.
- [ ] **Findings file** — `specs/20260506-site-evals-matrix-revamp/findings-accessibility-perf-links.md` with sections: pa11y, axe, contrast, motion, links, markup, Lighthouse. Each finding cites a `start:end:filepath` reference and names which earlier subtask owns the surface.
- [ ] **In-place fixes** — apply trivial fixes directly (broken anchor hrefs, missing `alt` text, missing `lang` attributes, focus-trap on dropdowns). Anything beyond trivial scope is logged as a follow-up for the owning subtask.

## Definition of Done

- [ ] All eight HTML files (landing + spec-system × 4 + eval-system × 4 + 404) pass pa11y at WCAG-AA.
- [ ] All eight HTML files pass an HTML validator (warnings allowed; errors fixed).
- [ ] `linkinator` reports no broken in-site links; external 4xx/5xx links are documented.
- [ ] Manual reduced-motion smoke test confirms the canvas does not animate when `prefers-reduced-motion: reduce` is set.
- [ ] Lighthouse mobile Performance score on the landing page is ≥ 70 (≥ 75 is a clean pass; 70–74 is documented as a `warn` finding with a recommendation routed back to subtask 01); Accessibility score ≥ 95 on every page.
- [ ] `findings-accessibility-perf-links.md` exists with a complete log of fixed and flagged issues.

## Implementation Notes

- Recommended tooling install (one-time, locally — no devDep change required for the spec):
  - `pnpm dlx pa11y site/index.html`
  - `pnpm dlx linkinator site/ --recurse --silent`
  - `pnpm dlx html-validate site/**/*.html`
  - Lighthouse via Chrome DevTools or `pnpm dlx lighthouse http://localhost:8080`.
- For pa11y on a static folder, run a local server first (`python3 -m http.server 8080` from `site/`) then point pa11y at `http://localhost:8080/...`.
- Contrast checks: use Chrome DevTools Color Picker → Contrast ratio swatch on representative selectors (body, links, button labels, accent badges). Capture results in the findings file with file + selector + ratio.
- For dropdown focus-trap, the existing `.nav-dropdown` markup pattern relies on `:hover` + `:focus-within`. Verify Tab + Enter still opens each dropdown via keyboard.
- The matrix-rain canvas is **not** part of the focus order — confirm it has `tabindex="-1"` (or no `tabindex`, with `pointer-events: none` from CSS).
- Do not introduce new build steps. Tooling runs ad-hoc; Lighthouse output is captured in the findings file.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- All checks run only over `site/` — no impact on plugin source.
- All fixes are scoped to the file that owns the regression.

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
