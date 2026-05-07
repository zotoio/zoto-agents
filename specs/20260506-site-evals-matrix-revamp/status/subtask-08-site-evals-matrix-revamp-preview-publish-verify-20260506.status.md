# Subtask 08 — site-evals-matrix-revamp — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 08 |
| feature | site-evals-matrix-revamp |
| assigned_agent | crux-software-engineer |
| model | composer-2-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-07T05:33:00Z |
| last_heartbeat | 2026-05-07T06:02:32.214Z |
| completed_at | 2026-05-07T05:38:00Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — **`site/README.md`** — new short README documenting: (`site/README.md`)
- [x] **D02** — **GitHub Pages publish verification** — review `.github/workflows/deploy-pages.yml`, confirm: (`.github/workflows/deploy-pages.yml`)
- [x] **D03** — **Smoke test record** — capture (in this subtask's `Execution Notes`) the result of a local preview run after merge:
- [x] **D04** — **Sitemap** — if a `site/sitemap.xml` does not yet exist, add a minimal one listing every HTML page (landing, spec-system × 4, eval-system × 4, 404). If one exists, update it to include the new eval-system pages. Reference the URL in `site/robots.txt` (already configured). (`site/sitemap.xml`)
- [x] **D05** — **`.github/workflows/deploy-pages.yml`** — leave as-is unless the path filter no longer matches the revamped tree. Any change must be a strict superset (still triggers when `site/**` changes). (`.github/workflows/deploy-pages.yml`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `site/README.md` — Site README with layout, preview instructions, matrix-rain docs, publish path, and smoke test checklist
- **created** `site/sitemap.xml` — Sitemap listing all 10 HTML pages with priority weights
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
GitHub Pages action versions pinned in deploy-pages.yml are behind latest:
- actions/configure-pages@v5 → latest v6 (2026-03-25, Node 24 upgrade)
- actions/upload-pages-artifact@v3 → latest v5 (2026-04-10, Node 24 + hidden-files input)
- actions/deploy-pages@v4 → latest v5 (2026-03-25, Node 24 upgrade)
Per subtask spec, these are logged but NOT bumped.
robots.txt already references sitemap.xml at the correct URL — no change needed.

<!-- status:notes:end -->
