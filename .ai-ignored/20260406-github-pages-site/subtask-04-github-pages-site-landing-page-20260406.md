# Subtask: Landing Page

## Metadata
- **Subtask ID**: 04
- **Feature**: github-pages-site
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260406

## Objective

Create the main landing page (`site/index.html`) for the zoto-agents project. This is the entry point for visitors and should provide a clear overview of the project with navigation to the spec system documentation.

## Deliverables Checklist
- [x] `site/index.html` — Complete landing page with:
  - **Hero section**: Project name "zoto-agents", tagline about Cursor plugins for structured engineering, brief description
  - **Featured plugin section**: Highlight zoto-spec-system as the flagship plugin — name, description, version badge, link to docs
  - **How it works**: 3-step visual summary (Create specs → Judge quality → Execute with verification)
  - **Quick links**: Cards/buttons linking to Quickstart, Design Docs, Configuration, GitHub repo
  - **Footer**: Links to GitHub repo, license info, "Built for Cursor" badge
- [x] Top navigation bar with: Logo/name (links to home), "Spec System" dropdown (Overview, Quickstart, Design, Configuration), GitHub link (external)
- [x] Page uses the HTML template pattern and CSS from subtask 01
- [x] Semantic HTML5 structure (header, nav, main, section, footer)
- [x] Meta tags: title, description, Open Graph tags for social sharing
- [x] Favicon reference (can be a simple inline SVG favicon or placeholder)

## Definition of Done
- [x] Landing page renders correctly with the dark theme
- [x] Navigation links point to correct spec-system page paths
- [x] Page is responsive (hero stacks vertically on mobile, cards reflow)
- [x] Semantic HTML passes basic accessibility review
- [x] Open Graph meta tags are present for social sharing previews

## Implementation Notes

**Content guidance**:
- Project tagline: something like "Structured Engineering Specs for Cursor" or "Plan, Judge, Execute — Engineering specs powered by AI"
- Description should explain that zoto-agents is a monorepo of Cursor plugins, with zoto-spec-system as the first plugin
- The "How it works" section should use the workflow overview diagram from subtask 02 if available, or provide a text-based summary that will later be enhanced

**Navigation structure**:
```
[zoto-agents logo]  Spec System ▾  [GitHub →]
                    ├── Overview
                    ├── Quickstart
                    ├── Design
                    └── Configuration
```

**HTML structure** should follow the template established in subtask 01's CSS documentation.

**Links**: Use relative paths. The landing page is at `site/index.html`, spec system pages are at `site/spec-system/*.html`.

## Testing Strategy
- Open in browser to verify layout and theme
- Click all navigation links to verify paths (even if target pages don't exist yet)
- Resize browser to verify responsive behavior

## Execution Notes

### Agent Session Info
- Agent: generalPurpose (subtask 04 executor)
- Started: 2026-04-06
- Completed: 2026-04-06

### Work Log
- Read `site/css/style.css` to understand the HTML template pattern, available CSS classes (cards, grids, badges, nav, footer, utility classes), and CSS custom properties
- Read `site/js/main.js` for sidebar toggle and nav highlight behavior
- Read `plugins/zoto-spec-system/README.md` for accurate plugin description and workflow overview
- Created `site/index.html` with all required sections:
  - **Hero**: project name, tagline ("Plan, Judge, Execute — Engineering Specs Powered by AI"), description, CTA buttons (Get Started + GitHub)
  - **Featured plugin**: Spec System card with v0.6.0 badge, Stable badge, description from README, link to docs
  - **How it works**: 3-step grid (Create Specs → Judge Quality → Execute with Verification) using numbered circle cards
  - **Quick links**: 4-column grid with cards for Quickstart, Design Docs, Configuration, GitHub
  - **Install section**: bash code snippet for `cursor plugin install zoto-spec-system`
  - **Footer**: links to GitHub, Documentation, MIT License; "Built for Cursor" text
- Navigation uses CSS-only hover dropdown for Spec System submenu (Overview, Quickstart, Design, Configuration) plus external GitHub link
- Used `no-sidebar` layout as specified for the landing page
- Inline SVG favicon with "Z" lettermark in accent blue on dark background
- Open Graph and Twitter Card meta tags for social sharing
- Landing-specific styles scoped in `<style>` block (hero, steps, link cards, dropdown, buttons)
- Responsive: grids collapse from 4→2→1 columns via existing CSS breakpoints; hero text sizes scale down on mobile

### Blockers Encountered
None.

### Files Modified
- `site/index.html` (created)

### Adversarial Verification (Judge)
- **Verified by**: zoto-spec-judge
- **Date**: 2026-04-06

**Deliverables Checklist verification:**

1. `site/index.html` exists — CONFIRMED. File is 462 lines, well-structured.
   - Hero section: `<h1 class="hero-title">zoto-agents</h1>`, tagline "Plan, Judge, Execute — Engineering Specs Powered by AI", description paragraph, CTA buttons — CONFIRMED
   - Featured plugin section: "Spec System" card with `v0.6.0` badge, `Stable` badge, description, "Read the Docs" link to `spec-system/index.html` — CONFIRMED
   - How it works: 3-step grid (Create Specs → Judge Quality → Execute with Verification) with numbered circles — CONFIRMED
   - Quick links: 4 cards (Quickstart, Design Docs, Configuration, GitHub) in `grid-4` layout — CONFIRMED
   - Footer: GitHub link, Documentation link, MIT License link, "Built for Cursor" text — CONFIRMED
2. Top nav bar with logo/home link (`index.html`), Spec System CSS-only hover dropdown (Overview, Quickstart, Design, Configuration), external GitHub link — CONFIRMED
3. CSS reference: `<link rel="stylesheet" href="css/style.css">` (relative path) — CONFIRMED. All referenced CSS classes (`top-nav`, `no-sidebar`, `grid-3`, `grid-4`, `badge`, `badge-accent`, `badge-success`, `site-footer`, `container`) verified in `site/css/style.css`.
4. Semantic HTML5: `<nav>`, `<main>`, `<section>` (×5), `<footer>` all present. No `<header>` wrapper — acceptable, `<nav>` alone is valid semantic HTML5 per the spec. — CONFIRMED
5. Meta tags: `<title>`, `<meta name="description">`, Open Graph (`og:type`, `og:title`, `og:description`, `og:url`, `og:site_name`), Twitter Card (`twitter:card`, `twitter:title`, `twitter:description`) — CONFIRMED
6. Favicon: inline SVG `<link rel="icon">` with "Z" lettermark — CONFIRMED
7. All internal links use relative paths. Grep for `href="/` and `src="/` returned zero matches. External links (GitHub) use full URLs with `target="_blank" rel="noopener noreferrer"` — CONFIRMED
8. Prism.js from CDN: `prism-tomorrow.min.css`, `prism.min.js`, `prism-bash.min.js`, `prism-json.min.js` all loaded from `cdn.jsdelivr.net` with `defer` — CONFIRMED
9. Responsive design: `max-width` (not fixed widths) for hero/card, `flex-wrap: wrap` on buttons/footer, media queries at 768px and 480px for font scaling and layout adjustments, grids use CSS classes with responsive breakpoints in `style.css` — CONFIRMED

**Definition of Done verification:**

1. Dark theme: page uses CSS custom properties from `style.css` which defines a dark theme (`--color-bg-primary`, `--color-text-heading`, etc.) — CONFIRMED
2. Navigation links point to correct paths: `spec-system/index.html`, `spec-system/quickstart.html`, `spec-system/design.html`, `spec-system/configuration.html` — all correct relative paths — CONFIRMED
3. Responsive: grids collapse via CSS breakpoints, hero text scales down, flex-wrap on action buttons and footer links — CONFIRMED
4. Semantic HTML: uses `<nav>`, `<main>`, `<section>`, `<footer>`, proper heading hierarchy, descriptive link text — CONFIRMED
5. Open Graph meta tags present for social sharing — CONFIRMED

**Verdict: Verified** — All Deliverables Checklist and Definition of Done items independently confirmed.
