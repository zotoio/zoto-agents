# Subtask 04 — site-evals-matrix-revamp — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 04 |
| feature | site-evals-matrix-revamp |
| assigned_agent | crux-software-engineer |
| model | claude-opus-4.7 |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T12:36:00Z |
| last_heartbeat | 2026-05-06T12:55:00Z |
| completed_at | 2026-05-06T12:55:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — site/images/diagrams/eval-lifecycle.svg — six-step horizontal flow init/configure/create/execute/judge/compare with update below the spine. (`site/images/diagrams/eval-lifecycle.svg`)
- [x] **D02** — site/images/diagrams/eval-run-report.svg — three-panel run directory / outputs / /canvas hand-off. (`site/images/diagrams/eval-run-report.svg`)
- [x] **D03** — site/images/diagrams/eval-update-contract.svg — two columns (generated touch zone, user-authored no-touch) with blocked arrow. (`site/images/diagrams/eval-update-contract.svg`)
- [x] **D04** — site/images/diagrams/eval-askquestion-flow.svg — sequence diagram User / Command / Subagent with needs_user_input + resume. (`site/images/diagrams/eval-askquestion-flow.svg`)
- [x] **D05** — site/images/mockups/eval-create.svg — Cursor IDE mockup of /zoto-eval-create. (`site/images/mockups/eval-create.svg`)
- [x] **D06** — site/images/mockups/eval-canvas-compare.svg — Cursor IDE mockup of /zoto-eval-compare driving /canvas. (`site/images/mockups/eval-canvas-compare.svg`)
- [x] **D07** — site/images/mockups/eval-judge-output.svg — Cursor IDE mockup of /zoto-eval-judge with the judge: block in llm.yml. (`site/images/mockups/eval-judge-output.svg`)
- [x] **D08** — site/images/mockups/eval-advise-flow.svg — Cursor IDE mockup of /zoto-eval-advise five-dimension scoreboard. (`site/images/mockups/eval-advise-flow.svg`)
- [x] **D09** — All eight assets are valid SVG (validated via Python ElementTree XML parse). (`site/images/`)
- [x] **D10** — All eight assets use the canonical Matrix palette mapping (no charcoal-era #8ec0d6 / #1a1a1a / #2a2a2a / #3a3a3a / #e0e0e0); palette mapping table in subtask 04 honoured. (`site/images/`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `site/images/diagrams/eval-lifecycle.svg` — New SVG. 1200x700 viewBox; matrix palette; <title> + <desc> present.
- **created** `site/images/diagrams/eval-run-report.svg` — New SVG. Three-panel: run dir, outputs, /canvas hand-off.
- **created** `site/images/diagrams/eval-update-contract.svg` — New SVG. _meta.generated contract; touch zone vs no-touch column.
- **created** `site/images/diagrams/eval-askquestion-flow.svg` — New SVG. Sequence-style diagram, User / Command / Subagent.
- **created** `site/images/mockups/eval-create.svg` — New mockup. Cursor IDE rendering of /zoto-eval-create.
- **created** `site/images/mockups/eval-canvas-compare.svg` — New mockup. Cursor IDE rendering of /zoto-eval-compare + /canvas.
- **created** `site/images/mockups/eval-judge-output.svg` — New mockup. Cursor IDE rendering of /zoto-eval-judge.
- **created** `site/images/mockups/eval-advise-flow.svg` — New mockup. Cursor IDE rendering of /zoto-eval-advise scoreboard.
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
All eight SVGs validate as well-formed XML and use only the canonical Matrix palette listed in subtask 04. Each <svg> root has both <title> and <desc> for screen-reader / pa11y accessibility (subtask 07 will run the formal a11y check). System-stack fonts only; no external font dependencies.

<!-- status:notes:end -->
