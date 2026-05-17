# Subtask 05 — site-evals-matrix-revamp — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 05 |
| feature | site-evals-matrix-revamp |
| assigned_agent | crux-platform-architect |
| model | claude-opus-4.7 |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T13:02:30Z |
| last_heartbeat | 2026-05-06T13:18:00Z |
| completed_at | 2026-05-06T13:18:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — site/eval-system/index.html — Overview with hero, when-to-use, dual-backend, askQuestion, _meta.generated, see-also. (`site/eval-system/index.html`)
- [x] **D02** — site/eval-system/quickstart.html — Lifecycle walk-through (install → init → configure → create → update → execute → judge → advise → compare) + CI integration. (`site/eval-system/quickstart.html`)
- [x] **D03** — site/eval-system/configuration.html — Schema-grounded reference for .zoto/eval-system/config.yml; init template; field tables; env vars; migration note. (`site/eval-system/configuration.html`)
- [x] **D04** — site/eval-system/design.html — Architecture deep-dive: lifecycle, askQuestion flow, static/LLM backends, run output schema, _meta.generated contract, critical-change rubric, manifest example, judge vs adviser comparison, /canvas hand-off. (`site/eval-system/design.html`)
- [x] **D05** — Sidebar nav on every eval-system page — heading 'Eval System', 4 entries, active state correct per page. (`site/eval-system/`)
- [x] **D06** — Top nav on every eval-system page mirrors landing-page peer dropdowns (Spec System / Eval System / GitHub). (`site/eval-system/`)
- [x] **D07** — Breadcrumbs Home > Eval System > <page> on every page. (`site/eval-system/`)
- [x] **D08** — Meta tags (title / description / og:* / twitter:*) populated per page. (`site/eval-system/`)
- [x] **D09** — Workspace path consistency — every workspace-local path reads .zoto/eval-system/ (the only .zoto-eval-system reference is the migration callout in configuration.html, intentionally framed as no-longer-supported). (`site/eval-system/configuration.html`)
- [x] **D10** — Code samples — every code block uses the correct Prism language tag (bash, yaml, json, typescript, markdown). (`site/eval-system/`)
- [x] **D11** — site/index.html cross-links resolve — hero CTA, dropdown entries, Explore quick-link cards, and the plugin grid all point at the four new pages. (`site/index.html`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `site/eval-system/index.html` — New page. 221 lines. References eval-lifecycle.svg, eval-askquestion-flow.svg, eval-update-contract.svg.
- **created** `site/eval-system/quickstart.html` — New page. 276 lines. References eval-run-report.svg, eval-canvas-compare.svg.
- **created** `site/eval-system/configuration.html` — New page. 274 lines. Init template + 5 reference tables + env vars table.
- **created** `site/eval-system/design.html` — New page. 309 lines. References all 4 diagrams + 3 mockups; manifest + result schema examples.
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Source-of-truth content was sourced from plugins/zoto-eval-system/README.md. Each claim that materially shapes the page (the lifecycle command list, the dual-backend story, the manifest layout, the critical-change rubric, the judge vs adviser comparison, the result schema example) traces back to a labelled section of that README and is reproduced verbatim where appropriate. All workspace-local paths reference .zoto/eval-system/; the lone reference to the legacy .zoto-eval-system path lives in the configuration.html migration callout, framed as no-longer-supported. Page sizes (221–309 lines) sit well under the 600-line guidance and on par with site/spec-system/ equivalents. All four SVG diagrams and three mockups from subtask 04 are referenced via <img src="../images/..."> with descriptive alt text.

<!-- status:notes:end -->
