# Subtask 02 — site-evals-matrix-revamp — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 02 |
| feature | site-evals-matrix-revamp |
| assigned_agent | crux-software-engineer |
| model | claude-opus-4.7 |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T12:36:00Z |
| last_heartbeat | 2026-05-06T12:42:00Z |
| completed_at | 2026-05-06T12:42:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — "Flagship Plugin" section + featured-card removed. (`site/index.html`)
- [x] **D02** — New <section id="plugins"> with .plugin-grid and two .plugin-card articles for zoto-spec-system and zoto-eval-system; each card has <h3>, version badge (sourced via comment), one-sentence pitch, primary CTA, and three quick-link chips. (`site/index.html`)
- [x] **D03** — Hero refreshed: tagline 'Plan and verify your specs. Generate and update your evals.', description ≤2 sentences positioning both plugins, primary CTA links to #plugins. (`site/index.html`)
- [x] **D04** — How It Works split into two flow-rows: spec-system (create/judge/execute) and eval-system (create/execute/update/judge/advise/compare). (`site/index.html`)
- [x] **D05** — Explore section now has 6 link-cards: 3 spec-system + 2 eval-system + GitHub. (`site/index.html`)
- [x] **D06** — Specs-ship-with-code section reframed to 'Commit Specs and Eval Cases Alongside Your Code'; CRUX-Memories link retained. (`site/index.html`)
- [x] **D07** — Install snippet has two cursor plugin install lines (zoto-spec-system + zoto-eval-system) plus an independence note. (`site/index.html`)
- [x] **D08** — Top-nav has a second nav-dropdown for Eval System mirroring the Spec System dropdown (Overview / Quickstart / Design / Configuration). Targets eval-system/*.html (subtask 05 creates them). (`site/index.html`)
- [x] **D09** — Footer Documentation link points to #plugins anchor; GitHub + MIT License preserved. (`site/index.html`)
- [x] **D10** — <title>, description meta, og:*, twitter:* updated to cover both plugins. Title is 'Zoto Agents — Spec System & Eval System for Cursor'. (`site/index.html`)
- [x] **D11** — 404.html copy rewritten to remove spec-system-only language; CTA points to index.html#plugins; Eval System link added to top-nav. (`site/404.html`)
- [x] **D12** — site/robots.txt unchanged (sitemap URL is stable; structural changes out of scope). (`site/robots.txt`)
- [x] **D13** — Inline --charcoal-* declarations migrated to --matrix-* / --color-* tokens; body class renamed from landing-charcoal to landing-matrix; grep -ni 'charcoal' site/index.html site/404.html returns 0 matches. (`site/index.html`)
- [x] **D14** — No 'flagship' / 'primary' / 'main plugin' wording remains. grep -ni 'flagship' site/index.html site/404.html returns 0 matches. (`site/index.html`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `site/index.html` — Full landing-page rewrite — peer plugin grid, two-pane How It Works, refreshed hero + meta, eval-system dropdown, charcoal->matrix migration.
- **modified** `site/404.html` — Spec-system-only language removed; CTA now points at index.html#plugins; eval-system link added to top-nav.
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
2026-05-06T12:42:00Z completed: full landing-page revamp. Both plugins billed as peers; grep -ni 'flagship|charcoal' site/index.html site/404.html returns 0 matches. Eval-system targets (eval-system/*.html) referenced but not yet present — subtask 05 will create them; subtask 07 sweeps the broken-link pass at the end.

<!-- status:notes:end -->
