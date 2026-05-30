# Subtask: Site Scaffolding, CSS Dark Theme & GitHub Actions

## Metadata
- **Subtask ID**: 01
- **Feature**: github-pages-site
- **Assigned Subagent**: generalPurpose
- **Dependencies**: None
- **Created**: 20260406

## Objective

Create the foundational site directory structure, the CSS dark theme, an HTML template that all pages will share, and the GitHub Actions workflow for automated deployment to GitHub Pages.

## Deliverables Checklist
- [x] Directory structure created:
  ```
  site/
  ├── css/
  │   └── style.css
  ├── js/
  │   └── main.js (stub)
  ├── images/
  │   ├── diagrams/
  │   └── mockups/
  └── spec-system/
  ```
- [x] `site/css/style.css` — complete dark theme stylesheet with:
  - CSS custom properties for color palette (backgrounds, text, accents, borders, code blocks)
  - Dark background (#0d1117 or similar GitHub dark), light text, accent colors for links/headings
  - Typography: system font stack, appropriate sizing hierarchy
  - Layout: fixed sidebar (280px) + main content area, responsive breakpoints
  - Top navigation bar styling
  - Code block styling (dark pre/code backgrounds, border-radius, padding)
  - Table styling (striped rows, dark theme)
  - Responsive breakpoints: mobile (<768px sidebar collapses), tablet, desktop
  - Utility classes for common patterns (containers, grids, cards)
- [x] HTML template pattern documented in a comment block at the top of style.css showing the expected HTML structure (doctype, head with meta/CSS/Prism links, body with nav/sidebar/main)
- [x] Prism.js integration: CDN links for `prism-tomorrow` theme (dark) + core languages (bash, json, markdown, javascript, typescript)
- [x] `.github/workflows/deploy-pages.yml` — GitHub Actions workflow:
  - Triggers on push to `main` when `site/**` files change
  - Uses `actions/configure-pages`, `actions/upload-pages-artifact` (path: `site/`), `actions/deploy-pages`
  - Permissions: `pages: write`, `id-token: write`
  - Concurrency group to prevent parallel deployments
- [x] `site/robots.txt` and `site/404.html` (simple dark-themed 404 page)

## Definition of Done
- [x] CSS custom properties define the complete color palette
- [x] Sidebar layout works on desktop, collapses on mobile
- [x] GitHub Actions workflow YAML is valid
- [x] HTML template is documented so all subsequent page subtasks produce consistent markup
- [x] Prism.js loads and highlights code when pages are opened

## Implementation Notes

**Color palette guidance** (GitHub dark mode inspired):
- Background: `#0d1117`
- Surface/card: `#161b22`
- Border: `#30363d`
- Text primary: `#e6edf3`
- Text secondary: `#8b949e`
- Accent/link: `#58a6ff`
- Success: `#3fb950`
- Warning: `#d29922`
- Code background: `#1c2129`

**CSS custom property names**: Use `--color-bg-primary`, `--color-bg-secondary`, `--color-text-primary`, `--color-text-secondary`, `--color-accent`, `--color-border`, etc.

**GitHub Actions**: The workflow should use the latest stable versions of the actions. Reference: https://github.com/actions/deploy-pages

**Base path**: Since this is a project site (not user/org site), assets must work under `/zoto-agents/`. Use `<base href="/zoto-agents/">` in the HTML template, or use relative paths throughout.

## Testing Strategy
- Open `site/404.html` in a browser to verify dark theme renders
- Validate GitHub Actions YAML syntax
- Verify CSS custom properties are defined and used consistently

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 2026-04-06
- Completed: 2026-04-06

### Work Log
- Created full directory structure under `site/` with `.gitkeep` files for empty directories
- Built comprehensive dark theme CSS (~500 lines) with 20 sections covering all spec requirements
- HTML template pattern documented as a comment block at the top of `style.css` with full structure including Prism.js CDN links pinned to v1.29.0
- Created `main.js` with sidebar toggle logic and nav highlighting
- GitHub Actions workflow uses latest stable action versions: checkout@v4, configure-pages@v5, upload-pages-artifact@v3, deploy-pages@v4
- 404 page uses the dark theme CSS and provides a "Go Home" link
- All paths are relative throughout — works with both `file://` and GitHub Pages

### Decisions Made
- Prism.js pinned to v1.29.0 via jsDelivr CDN
- Used `cancel-in-progress: false` in the concurrency group to avoid cancelling active deployments
- Added `prism-typescript` component alongside the other requested languages
- Included print styles to hide nav/sidebar when printing
- Added `.gitkeep` files to `images/diagrams/`, `images/mockups/`, and `spec-system/` so Git tracks empty directories

### Blockers Encountered
None

### Adversarial Verification (Judge)
- **Verdict: Verified**
- **Verified by**: zoto-spec-judge (independent, fresh context)
- **Date**: 2026-04-06

**Deliverables Checklist — all items independently confirmed:**
- Directory structure: all 7 files/dirs exist on disk (`style.css`, `main.js`, `diagrams/.gitkeep`, `mockups/.gitkeep`, `spec-system/.gitkeep`, `robots.txt`, `404.html`)
- `style.css`: 866 lines, 20 sections, 20+ CSS custom properties matching the specified palette (`#0d1117`, `#161b22`, `#e6edf3`, `#58a6ff`, `#30363d`, `#1c2129`), system font stack, sizing hierarchy, fixed sidebar (280px), responsive breakpoints at 1024px/768px/480px, code block styling, striped table rows, utility classes (grid, flex, spacing, text)
- HTML template comment block: 68 lines at top of `style.css` showing full page structure with Prism.js CDN links
- Prism.js: pinned to `v1.29.0` via jsDelivr, `prism-tomorrow` theme, 5 language components (bash, json, markdown, javascript, typescript)
- GitHub Actions workflow: valid YAML, correct triggers (`push` to `main` on `site/**`), correct actions (`checkout@v4`, `configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4`), correct permissions (`pages: write`, `id-token: write`), concurrency group present
- `404.html`: uses dark theme CSS, relative paths, no `<base>` tag
- `robots.txt`: valid format

**Definition of Done — all items independently confirmed:**
- CSS custom properties: comprehensive palette defined in `:root` block (lines 75-137)
- Sidebar layout: fixed 280px desktop, `translateX(-100%)` collapse at 768px with `.open` toggle
- Workflow YAML: syntactically valid, all required fields present
- HTML template documented: 68-line comment block with usage notes
- Prism.js: `@1.29.0` pinned (not `@latest`), `defer` attribute on scripts, CSS overrides for background consistency

**No issues found.**

### Files Modified
- `site/css/style.css` — Created (dark theme stylesheet with HTML template comment)
- `site/js/main.js` — Created (sidebar toggle + nav highlighting)
- `site/404.html` — Created (dark-themed 404 page)
- `site/robots.txt` — Created
- `site/images/diagrams/.gitkeep` — Created
- `site/images/mockups/.gitkeep` — Created
- `site/spec-system/.gitkeep` — Created
- `.github/workflows/deploy-pages.yml` — Created (GitHub Pages deployment workflow)
