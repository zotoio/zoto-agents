# Subtask: Configuration Reference Page

## Metadata
- **Subtask ID**: 05
- **Feature**: github-pages-site
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260406

## Objective

Create the configuration reference page (`site/spec-system/configuration.html`) documenting all configuration options for the zoto-spec-system plugin.

## Deliverables Checklist
- [x] `site/spec-system/configuration.html` — Complete configuration reference with:
  - **Introduction**: Brief explanation of `.zoto-spec-system/config.json` and when/why to configure it
  - **Configuration table**: All config keys with type, default value, and description
  - **Example configurations**: 2-3 example config files for different use cases (minimal, customized team setup, enterprise)
  - **Installation section**: How to create the config file in a consuming repo
  - **Defaults behavior**: What happens when no config file exists
- [x] Page uses the shared sidebar navigation layout from subtask 01
- [x] Sidebar highlights "Configuration" as the active page
- [x] Code examples use Prism.js syntax highlighting (JSON language)
- [x] Navigation links to sibling spec-system pages

## Definition of Done
- [x] All config keys from the plugin's `docs/config-schema.md` are documented
- [x] Example configurations are valid JSON
- [x] Code blocks have syntax highlighting
- [x] Sidebar navigation works and highlights the active page
- [x] Content is accurate to the current plugin implementation

## Implementation Notes

**Source of truth for config keys**: Read `plugins/zoto-spec-system/docs/config-schema.md` and `plugins/zoto-spec-system/templates/config.json` for the complete schema.

**Config keys to document** (from the plugin):
- `unitOfWork` — term for work items (default: `spec`)
- `specsDir` — directory for spec files (default: `specs`)
- `workDir` — working directory for active specs (default: `specs/current`)
- Any additional keys from the config schema

**Example configs**:
1. Minimal (empty or just `unitOfWork`)
2. Team setup (custom `specsDir`, `unitOfWork` set to "story")
3. Full config with all options

**Sidebar navigation** for spec-system pages:
```
Spec System
├── Overview        → spec-system/index.html
├── Quickstart      → spec-system/quickstart.html
├── Design          → spec-system/design.html
└── Configuration   → spec-system/configuration.html (active)
```

## Testing Strategy
- Verify all config keys match the plugin's actual schema
- Verify JSON examples are valid (parse with `JSON.parse()` mentally)
- Check sidebar navigation links

## Execution Notes

### Agent Session Info
- Agent: generalPurpose
- Started: 2026-04-06
- Completed: 2026-04-06

### Work Log
- Read `plugins/zoto-spec-system/docs/config-schema.md` (10 config keys) and `plugins/zoto-spec-system/templates/config.json` (template with 3 top-level keys)
- Read `site/css/style.css` header comment for HTML template pattern and available CSS classes
- Read `site/js/main.js` for sidebar toggle and nav highlighting logic
- Created `site/spec-system/configuration.html` with sidebar layout, all 11 config keys documented in a table, 3 example configurations (minimal, team setup, full), installation section, defaults behaviour section, and key-groups explanations
- All code blocks use Prism.js `language-json` / `language-bash` classes for syntax highlighting
- Relative paths used throughout (`../css/style.css`, `../js/main.js`, `../index.html`, sibling pages)

### Blockers Encountered
None.

### Files Modified
- `site/spec-system/configuration.html` (created)
- `specs/20260406-github-pages-site/subtask-05-github-pages-site-config-reference-20260406.md` (updated checklist)

### Adversarial Verification (Judge)
- **Verdict: Verified**
- **Verified by**: zoto-spec-judge
- **Date**: 2026-04-06

**Deliverables Checklist verification**:
- `site/spec-system/configuration.html` exists (338 lines) — CONFIRMED
- Introduction with `.zoto-spec-system/config.json` explanation — CONFIRMED (lines 57-71)
- Configuration table with all 11 keys (Key, Type, Default, Description columns) — CONFIRMED (lines 128-205). Every key cross-checked against `plugins/zoto-spec-system/docs/config-schema.md`: all types, defaults, and descriptions match exactly.
- 3 example configs (minimal, team setup, full) — CONFIRMED (lines 210-277). All are syntactically valid JSON.
- Installation section ("Creating the Config File") — CONFIRMED (line 74)
- Defaults behavior section ("Default Behaviour") — CONFIRMED (line 99)
- Shared sidebar layout from subtask 01 — CONFIRMED (lines 33-42)
- Sidebar highlights "Configuration" as active (`class="sidebar-link active"`) — CONFIRMED (line 40)
- Code blocks use Prism.js: CDN loaded (lines 9-12), blocks use `class="language-json"` / `class="language-bash"` — CONFIRMED
- Navigation links to sibling pages present in sidebar — CONFIRMED (links to index.html, quickstart.html, design.html, configuration.html)

**Definition of Done verification**:
- All 11 config keys from schema documented — CONFIRMED (cross-checked key-by-key)
- Example configurations are valid JSON — CONFIRMED (3 examples, all valid)
- Code blocks have syntax highlighting — CONFIRMED (Prism.js classes on all `<code>` blocks)
- Sidebar navigation works and highlights active page — CONFIRMED
- Content accurate to current plugin implementation — CONFIRMED (matches `docs/config-schema.md` and `templates/config.json`)

**Observation (non-blocking)**: Sidebar links to `index.html`, `quickstart.html`, `design.html` which don't yet exist in `site/spec-system/`. These pages are the responsibility of other subtasks — not a defect in this subtask.
