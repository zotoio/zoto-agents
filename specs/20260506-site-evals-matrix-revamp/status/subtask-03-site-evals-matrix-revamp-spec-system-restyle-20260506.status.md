# Subtask 03 — site-evals-matrix-revamp — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 03 |
| feature | site-evals-matrix-revamp |
| assigned_agent | crux-software-engineer |
| model | claude-opus-4.7 |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T12:55:30Z |
| last_heartbeat | 2026-05-06T13:02:00Z |
| completed_at | 2026-05-06T13:02:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — All four spec-system pages have the canvas/script/link wiring from subtask 01 (verified by grep) — IA preserved, sidebar + breadcrumb + main-content unchanged. (`site/spec-system/`)
- [x] **D02** — Inline copy adjustments: 0 'flagship' / 'primary plugin' wording in spec-system pages today (none was authored by the prior spec). No copy edits were necessary. (`site/spec-system/`)
- [x] **D03** — git grep -i 'charcoal' site/ → 0 matches site-wide (cleared the lone leftover comment in site/css/style.css). The lone --color-* / --matrix-* consumers in spec-system pages already resolve to the Matrix palette via subtask 01's token reassignment. (`site/css/style.css`)
- [x] **D04** — Sidebar headings + structure preserved on every spec-system page; no IA changes. (`site/spec-system/`)
- [x] **D05** — Cross-links verified: ../index.html, GitHub, and intra-section anchors all resolve. The new ../eval-system/* dropdown targets will be created by subtask 05; subtask 07 sweeps broken-link state at the end. (`site/spec-system/`)
- [x] **D06** — Top nav on every spec-system page now exposes both plugins via dropdowns; .nav-dropdown CSS hoisted from inline site/index.html into site/css/style.css so spec-system pages can reuse it cleanly. (`site/css/style.css`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `site/css/style.css` — Hoisted .nav-dropdown / .nav-dropdown-menu rules from inline landing styles to the shared stylesheet (now uses --matrix-* tokens). Cleared the legacy comment that mentioned the old palette name.
- **modified** `site/spec-system/index.html` — Top-nav now has Spec System (active) + Eval System dropdowns mirroring landing-page.
- **modified** `site/spec-system/quickstart.html` — Top-nav now has both plugin dropdowns; active state retained.
- **modified** `site/spec-system/configuration.html` — Top-nav now has both plugin dropdowns; active state retained.
- **modified** `site/spec-system/design.html` — Top-nav now has both plugin dropdowns; active state retained.
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Subtask 03 was largely a verification sweep, exactly as the spec called out post-judge. The only non-verification edits were:
(a) clearing a stale comment in site/css/style.css that mentioned the legacy palette name (so 'git grep -i charcoal site/' returns zero), and
(b) adding both peer-plugin dropdowns to every spec-system page top-nav (mirroring the landing-page pattern).
No --charcoal-* / landing-charcoal references remain anywhere in site/. No IA changes; no sidebar or main-content edits. Eval-system dropdown targets resolve once subtask 05 lands; subtask 07 owns the broken-link sweep.

<!-- status:notes:end -->
