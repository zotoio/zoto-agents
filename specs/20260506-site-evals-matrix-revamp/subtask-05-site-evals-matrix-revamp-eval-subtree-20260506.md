# Subtask: Build the `site/eval-system/` Documentation Subtree

## Metadata
- **Subtask ID**: 05
- **Feature**: site-evals-matrix-revamp
- **Assigned Subagent**: crux-platform-architect
- **Dependencies**: 01, 04
- **Created**: 20260506

## Objective

Stand up the full `site/eval-system/` documentation subtree, mirroring the structure of `site/spec-system/` and the content of `plugins/zoto-eval-system/README.md`, so the eval-system has equal-billing parity with the spec-system on the public site. Information architecture, copy, and code samples must remain accurate to the shipping plugin (commands, agents, skills, schemas, file layouts, and configuration paths). All workspace-local paths must reference **`.zoto/eval-system/`** per the workspace plugin convention.

## Deliverables Checklist

- [ ] **`site/eval-system/index.html`** — Overview page. Sections:
  - hero / what it is
  - "When to use" comparison (eval-system as a coverage + run-quality engine; not a replacement for plugin tests)
  - the dual-backend story (`pytest` static + `@cursor/sdk` LLM, gated on `--full` + `CURSOR_API_KEY`)
  - askQuestion-driven configuration overview
  - the `_meta.generated` contract and the `eval:update` core value-add
  - "see also" links into Quickstart / Design / Configuration
- [ ] **`site/eval-system/quickstart.html`** — Lifecycle walk-through page. Sections:
  - Install (`cursor plugin install zoto-eval-system`)
  - `/zoto-eval-init` (one-time scaffold of `.zoto/eval-system/config.yml`)
  - `/zoto-eval-configure` (interactive askQuestion flow)
  - `/zoto-eval-create` (scaffolds static + LLM backends, writes `manifest.yml`)
  - `/zoto-eval-update` (dry-run / `--apply` / `--check`; targeted vs rediscovery)
  - `/zoto-eval-execute` (writes `static.yml`, `llm.yml`, `report.yml` per run)
  - `/zoto-eval-judge` and `/zoto-eval-advise` and `/zoto-eval-compare`
  - CI integration snippet (the existing GitHub Actions block from the plugin README)
  - References the lifecycle and run-report SVG diagrams from subtask 04
- [ ] **`site/eval-system/configuration.html`** — Schema-grounded reference page. Sections:
  - file location (`.zoto/eval-system/config.yml`, no other path supported)
  - the init template — every key commented, defaults inlined
  - field reference table sourced from `plugins/zoto-eval-system/README.md` (`static.framework`, `llm.strategy`, `llm.codeFramework`, `evalsDir`, `skillsRoots[]`, `discoveryTargets[]`, `llm.runtime`, `llm.model.id`, `judgeModel`, `manualChecklists.enabled`, `additionalAutomation[]`, `update.criticalChangeRules.*`, `update.preserveUserAuthoredCases`, `update.writeMetaMarker`)
  - environment variables (`CURSOR_API_KEY`, `ZOTO_EVAL_MODEL`, `.env.example` policy)
  - migration note: `.zoto-eval-system/config.json` is no longer supported
- [ ] **`site/eval-system/design.html`** — Architecture deep-dive. Sections:
  - architecture diagram (`eval-lifecycle.svg`)
  - the askQuestion flow (`eval-askquestion-flow.svg`) — commands own askQuestion; agents and skills return `needs_user_input`
  - the static backend (`templates/static/{pytest,vitest,jest}/`) and the LLM backend (`{evalsDir}/_llm/`)
  - run output layout (`static.yml`, `llm.yml`, `report.yml`, `logs/<case>.log`)
  - the `_meta.generated` contract (`eval-update-contract.svg`)
  - critical-change rubric (table, sourced from README)
  - `manifest.yml` + `manifest.history.yml` example
  - judge vs adviser comparison (table, sourced from README)
  - cross-run compare (`eval-canvas-compare.svg`)
- [ ] **Sidebar nav** on every eval-system page — heading "Eval System", entries `Overview / Quickstart / Design / Configuration`, with `class="sidebar-link active"` on the current page.
- [ ] **Top nav** matches subtask 02's landing-page peer dropdowns (Spec System / Eval System / GitHub).
- [ ] **Breadcrumbs** — `Home → Eval System → <page>`.
- [ ] **Meta tags** on every eval-system page — `<title>` reflects the page (`Quickstart — Eval System — Zoto Agents` etc.); `<meta name="description">` summarises the page; `og:*` and `twitter:*` mirror the landing page's positioning where appropriate.
- [ ] **Workspace path consistency** — every reference to plugin config / manifests / caches uses `.zoto/eval-system/` (never legacy `.zoto-eval-system/`).
- [ ] **Code samples** — every code block uses correct Prism language tags (`bash`, `yaml`, `json`, `typescript`).
- [ ] **`site/index.html` cross-links resolve** — the eval-system landing-page CTA, the dropdown entries, and the Explore quick-link cards from subtask 02 all point at real files in this subtree.

## Definition of Done

- [ ] Four `site/eval-system/*.html` files exist with full sidebar nav, breadcrumbs, and Matrix theme wiring inherited from subtask 01.
- [ ] Every claim on these pages can be cited back to a `start:end:plugins/zoto-eval-system/README.md` or to a primary plugin file (command / agent / skill / schema).
- [ ] All workspace-local paths read `.zoto/eval-system/`.
- [ ] All four SVGs from subtask 04 are referenced via `<img src="../images/...">` with `alt` text.
- [ ] All cross-links inside the subtree resolve; cross-links from `site/index.html` (subtask 02) resolve.
- [ ] No CRUX-generated files touched; no plugin source / schema / template / runtime change.

## Implementation Notes

- Source-of-truth for content is `plugins/zoto-eval-system/README.md`. Where the README is terse, expand for a docs-site reader; where it is detailed, link back rather than duplicate.
- Do **not** invent commands, agents, or skills that are not in `plugins/zoto-eval-system/{commands,agents,skills}`. Verify each claim against the directory listing before publishing.
- The plugin currently has no `plugins/zoto-eval-system/docs/` subdirectory — do not link to it. If you find content that would benefit from such a directory, surface it back to subtask 06 / a follow-up rather than creating one in this spec.
- Keep code samples short. Prefer one canonical example per concept, with a "See README §X" link for full reference.
- Page sizes should be comparable to the spec-system equivalents (≈300–600 lines of HTML each). Long reference tables (the field reference, the critical-change rubric) belong in `configuration.html` and `design.html` respectively.
- Keep all in-page anchors (`#install`, `#configure`, `#create`, `#update`, `#execute`, `#judge`, `#advise`, `#compare`) stable so external blog posts or follow-up specs can link in.
- After authoring, walk every page once with the assumption a reader has never used the plugin — punch up sentences that confused you on the first read.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Local preview with `python3 -m http.server` from `site/`; click through Home → Eval System → each page.
- Spot-check that every SVG referenced under `images/diagrams/` and `images/mockups/` exists (subtask 04 ships them).
- Citations to README sections — pick five and confirm they still match the README text exactly.

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
