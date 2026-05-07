# Spec 20260506-site-evals-matrix-revamp — aggregate live status

<!-- status:overview:start -->
| Key | Value |
|-----|-------|
| spec_id | 20260506-site-evals-matrix-revamp |
| phase | 0 |
| aggregate_state | completed |
| started_at | 2026-05-06T12:26:18.664Z |
| updated_at | 2026-05-07T07:42:37.293Z |

**config_reloaded**
_None._
<!-- status:overview:end -->

<!-- status:progress:start -->
| Metric | Count |
|--------|-------|
| Total | 8 |
| Completed | 8 |
| In progress | 0 |
| Blocked | 0 |
| Failed | 0 |
<!-- status:progress:end -->

<!-- status:subtasks:start -->
| Subtask | State | Status (yml) | Last heartbeat |
|---------|-------|--------------|----------------|
| 01 | completed | `specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml` | 2026-05-06T12:33:00Z |
| 02 | completed | `specs/20260506-site-evals-matrix-revamp/status/subtask-02-site-evals-matrix-revamp-landing-revamp-20260506.status.yml` | 2026-05-06T12:42:00Z |
| 03 | completed | `specs/20260506-site-evals-matrix-revamp/status/subtask-03-site-evals-matrix-revamp-spec-system-restyle-20260506.status.yml` | 2026-05-06T13:02:00Z |
| 04 | completed | `specs/20260506-site-evals-matrix-revamp/status/subtask-04-site-evals-matrix-revamp-eval-svg-diagrams-20260506.status.yml` | 2026-05-06T12:55:00Z |
| 05 | completed | `specs/20260506-site-evals-matrix-revamp/status/subtask-05-site-evals-matrix-revamp-eval-subtree-20260506.status.yml` | 2026-05-06T13:18:00Z |
| 06 | completed | `specs/20260506-site-evals-matrix-revamp/status/subtask-06-site-evals-matrix-revamp-copy-polish-20260506.status.yml` | 2026-05-06T13:30:00Z |
| 07 | completed | `specs/20260506-site-evals-matrix-revamp/status/subtask-07-site-evals-matrix-revamp-accessibility-perf-links-20260506.status.yml` | 2026-05-07T05:58:34.254Z |
| 08 | completed | `specs/20260506-site-evals-matrix-revamp/status/subtask-08-site-evals-matrix-revamp-preview-publish-verify-20260506.status.yml` | 2026-05-07T06:02:32.214Z |
<!-- status:subtasks:end -->

<!-- status:blockers:start -->
_None._
<!-- status:blockers:end -->

<!-- status:definition-of-done:start -->
- [x] **DOD01** — Landing page presents both plugins as peers; the word "flagship" appears nowhere on the site or in plugin READMEs.
- [x] **DOD02** — `site/eval-system/{index,quickstart,configuration,design}.html` all exist, mirror `plugins/zoto-eval-system/README.md`, and link to / from the landing page.
- [x] **DOD03** — Matrix trailing-code theme is applied site-wide, respects `prefers-reduced-motion: reduce`, and passes WCAG AA on body copy and links.
- [x] **DOD04** — Hero / section copy is rewritten to be more engaging without losing technical precision; no single-plugin highlight remains.
- [x] **DOD05** — Marketplace `description` fields, top-level `README.md`, and both plugin READMEs are consistent with the new positioning.
- [x] **DOD06** — All site pages pass `linkinator` link check, `pa11y` accessibility check, and a local preview smoke test; the GitHub Pages workflow still publishes successfully.
- [x] **DOD07** — No CRUX-generated files were edited; source files were edited and CRUX outputs regenerated where applicable.
- [x] **DOD08** — All eval-system documentation paths reference `.zoto/eval-system/` (not legacy `.zoto-eval-system/`).
- [x] **DOD09** — No JS framework was introduced; no plugin source / schema / template / runtime was changed.
<!-- status:definition-of-done:end -->

<!-- status:events:start -->
- **2026-05-06T12:26:18.664Z** `rebuild` — Aggregated 8 subtask source(s); digest 456a5410…
- **2026-05-06T12:32:16.261Z** `rebuild` — Aggregated 8 subtask source(s); digest 90b36bee…
- **2026-05-06T12:32:26.825Z** `rebuild` — Aggregated 8 subtask source(s); digest 2941255b…
- **2026-05-06T12:33:30.254Z** `rebuild` — Aggregated 8 subtask source(s); digest c55adfbf…
- **2026-05-06T12:33:40.816Z** `rebuild` — Aggregated 8 subtask source(s); digest d860baa7…
- **2026-05-06T12:35:12.857Z** `rebuild` — Aggregated 8 subtask source(s); digest de0999e9…
- **2026-05-06T12:38:01.935Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T12:38:01.935Z** `rebuild` — Aggregated 7 subtask source(s); digest 91d5c388…
- **2026-05-06T12:39:49.085Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T12:39:49.085Z** `rebuild` — Aggregated 7 subtask source(s); digest d6c16ef7…
- **2026-05-06T12:42:27.548Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T12:42:27.548Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-02-site-evals-matrix-revamp-landing-revamp-20260506.status.yml
- **2026-05-06T12:42:27.548Z** `rebuild` — Aggregated 6 subtask source(s); digest 6d84a995…
- **2026-05-06T12:44:25.286Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T12:44:25.286Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-02-site-evals-matrix-revamp-landing-revamp-20260506.status.yml
- **2026-05-06T12:44:25.286Z** `rebuild` — Aggregated 6 subtask source(s); digest 8d1d9b87…
- **2026-05-06T12:50:23.077Z** `source_validation_warn` — YAML parse failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml: Map keys must be unique at line 137, column 3:

      Verdict: Approve, score 4 / 5, confidence high. Executor can move on to d…
  judge:
  ^

- **2026-05-06T12:50:23.077Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-02-site-evals-matrix-revamp-landing-revamp-20260506.status.yml
- **2026-05-06T12:50:23.077Z** `rebuild` — Aggregated 6 subtask source(s); digest d45348f2…
- **2026-05-06T12:51:29.543Z** `source_validation_warn` — YAML parse failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml: Map keys must be unique at line 137, column 3:

      Verdict: Approve, score 4 / 5, confidence high. Executor can move on to d…
  judge:
  ^

- **2026-05-06T12:51:29.543Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-02-site-evals-matrix-revamp-landing-revamp-20260506.status.yml
- **2026-05-06T12:51:29.543Z** `source_validation_warn` — YAML parse failed for specs/20260506-site-evals-matrix-revamp/status/subtask-04-site-evals-matrix-revamp-eval-svg-diagrams-20260506.status.yml: Nested mappings are not allowed in compact mappings at line 58, column 11:

    note: New SVG. Three-panel: run dir, outputs, /canvas hand-off.
          ^

- **2026-05-06T12:51:29.543Z** `rebuild` — Aggregated 5 subtask source(s); digest ea2c1937…
- **2026-05-06T12:52:05.817Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T12:52:05.817Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-02-site-evals-matrix-revamp-landing-revamp-20260506.status.yml
- **2026-05-06T12:52:05.817Z** `source_validation_warn` — YAML parse failed for specs/20260506-site-evals-matrix-revamp/status/subtask-04-site-evals-matrix-revamp-eval-svg-diagrams-20260506.status.yml: Nested mappings are not allowed in compact mappings at line 58, column 11:

    note: New SVG. Three-panel: run dir, outputs, /canvas hand-off.
          ^

- **2026-05-06T12:52:05.817Z** `rebuild` — Aggregated 5 subtask source(s); digest 609830c8…
- **2026-05-06T12:53:31.910Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T12:53:31.910Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-02-site-evals-matrix-revamp-landing-revamp-20260506.status.yml
- **2026-05-06T12:53:31.910Z** `source_validation_warn` — YAML parse failed for specs/20260506-site-evals-matrix-revamp/status/subtask-04-site-evals-matrix-revamp-eval-svg-diagrams-20260506.status.yml: Nested mappings are not allowed in compact mappings at line 58, column 11:

    note: New SVG. Three-panel: run dir, outputs, /canvas hand-off.
          ^

- **2026-05-06T12:53:31.910Z** `rebuild` — Aggregated 5 subtask source(s); digest 9bea080d…
- **2026-05-06T12:54:39.946Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T12:54:39.946Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-02-site-evals-matrix-revamp-landing-revamp-20260506.status.yml
- **2026-05-06T12:54:39.946Z** `source_validation_warn` — YAML parse failed for specs/20260506-site-evals-matrix-revamp/status/subtask-04-site-evals-matrix-revamp-eval-svg-diagrams-20260506.status.yml: Nested mappings are not allowed in compact mappings at line 58, column 11:

    note: New SVG. Three-panel: run dir, outputs, /canvas hand-off.
          ^

- **2026-05-06T12:54:39.946Z** `rebuild` — Aggregated 5 subtask source(s); digest f1d57216…
- **2026-05-06T12:55:08.674Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T12:55:08.674Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-02-site-evals-matrix-revamp-landing-revamp-20260506.status.yml
- **2026-05-06T12:55:08.674Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-03-site-evals-matrix-revamp-spec-system-restyle-20260506.status.yml
- **2026-05-06T12:55:08.674Z** `source_validation_warn` — YAML parse failed for specs/20260506-site-evals-matrix-revamp/status/subtask-04-site-evals-matrix-revamp-eval-svg-diagrams-20260506.status.yml: Nested mappings are not allowed in compact mappings at line 58, column 11:

    note: New SVG. Three-panel: run dir, outputs, /canvas hand-off.
          ^

- **2026-05-06T12:55:08.674Z** `rebuild` — Aggregated 4 subtask source(s); digest 1e2c377f…
- **2026-05-06T12:55:35.908Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T12:55:35.908Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-02-site-evals-matrix-revamp-landing-revamp-20260506.status.yml
- **2026-05-06T12:55:35.908Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-03-site-evals-matrix-revamp-spec-system-restyle-20260506.status.yml
- **2026-05-06T12:55:35.908Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-04-site-evals-matrix-revamp-eval-svg-diagrams-20260506.status.yml
- **2026-05-06T12:55:35.908Z** `rebuild` — Aggregated 4 subtask source(s); digest 8c4b27db…
- **2026-05-06T12:56:22.775Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T12:56:22.775Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-02-site-evals-matrix-revamp-landing-revamp-20260506.status.yml
- **2026-05-06T12:56:22.775Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-03-site-evals-matrix-revamp-spec-system-restyle-20260506.status.yml
- **2026-05-06T12:56:22.775Z** `rebuild` — Aggregated 5 subtask source(s); digest a1618783…
- **2026-05-06T12:57:36.895Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T12:57:36.895Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-03-site-evals-matrix-revamp-spec-system-restyle-20260506.status.yml
- **2026-05-06T12:57:36.895Z** `rebuild` — Aggregated 6 subtask source(s); digest 3d3f3b8a…
- **2026-05-06T12:58:14.733Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T12:58:14.733Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-03-site-evals-matrix-revamp-spec-system-restyle-20260506.status.yml
- **2026-05-06T12:58:14.733Z** `rebuild` — Aggregated 6 subtask source(s); digest e1f7c10d…
- **2026-05-06T12:59:07.675Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T12:59:07.675Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-03-site-evals-matrix-revamp-spec-system-restyle-20260506.status.yml
- **2026-05-06T12:59:07.675Z** `rebuild` — Aggregated 6 subtask source(s); digest 0cd7aa49…
- **2026-05-06T13:01:45.072Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T13:01:45.072Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-03-site-evals-matrix-revamp-spec-system-restyle-20260506.status.yml
- **2026-05-06T13:01:45.072Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-05-site-evals-matrix-revamp-eval-subtree-20260506.status.yml
- **2026-05-06T13:01:45.072Z** `rebuild` — Aggregated 5 subtask source(s); digest aabb4e67…
- **2026-05-06T13:02:41.109Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T13:02:41.109Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-03-site-evals-matrix-revamp-spec-system-restyle-20260506.status.yml
- **2026-05-06T13:02:41.109Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-05-site-evals-matrix-revamp-eval-subtree-20260506.status.yml
- **2026-05-06T13:02:41.109Z** `rebuild` — Aggregated 5 subtask source(s); digest 6a8852c4…
- **2026-05-06T13:02:53.220Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T13:02:53.220Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-03-site-evals-matrix-revamp-spec-system-restyle-20260506.status.yml
- **2026-05-06T13:02:53.220Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-05-site-evals-matrix-revamp-eval-subtree-20260506.status.yml
- **2026-05-06T13:02:53.220Z** `rebuild` — Aggregated 5 subtask source(s); digest aab8238a…
- **2026-05-06T13:03:20.471Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-01-site-evals-matrix-revamp-theme-foundations-20260506.status.yml
- **2026-05-06T13:03:20.471Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-03-site-evals-matrix-revamp-spec-system-restyle-20260506.status.yml
- **2026-05-06T13:03:20.471Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-05-site-evals-matrix-revamp-eval-subtree-20260506.status.yml
- **2026-05-06T13:03:20.471Z** `rebuild` — Aggregated 5 subtask source(s); digest d524e4e2…
- **2026-05-06T13:03:47.724Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-03-site-evals-matrix-revamp-spec-system-restyle-20260506.status.yml
- **2026-05-06T13:03:47.724Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-05-site-evals-matrix-revamp-eval-subtree-20260506.status.yml
- **2026-05-06T13:03:47.724Z** `rebuild` — Aggregated 6 subtask source(s); digest d76f7d0c…
- **2026-05-06T13:04:18.059Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-03-site-evals-matrix-revamp-spec-system-restyle-20260506.status.yml
- **2026-05-06T13:04:18.059Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-05-site-evals-matrix-revamp-eval-subtree-20260506.status.yml
- **2026-05-06T13:04:18.059Z** `rebuild` — Aggregated 6 subtask source(s); digest 5d4a8477…
- **2026-05-06T13:06:52.694Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-05-site-evals-matrix-revamp-eval-subtree-20260506.status.yml
- **2026-05-06T13:06:52.694Z** `rebuild` — Aggregated 7 subtask source(s); digest 3394c6e0…
- **2026-05-06T13:08:05.406Z** `source_validation_warn` — Schema validation failed for specs/20260506-site-evals-matrix-revamp/status/subtask-05-site-evals-matrix-revamp-eval-subtree-20260506.status.yml
- **2026-05-06T13:08:05.406Z** `rebuild` — Aggregated 7 subtask source(s); digest 9bd2e86d…
- **2026-05-06T13:09:02.981Z** `rebuild` — Aggregated 8 subtask source(s); digest d121fb8e…
- **2026-05-06T13:09:28.733Z** `rebuild` — Aggregated 8 subtask source(s); digest ebdd6516…
- **2026-05-06T13:09:48.425Z** `rebuild` — Aggregated 8 subtask source(s); digest 54066418…
- **2026-05-06T13:14:02.889Z** `rebuild` — Aggregated 8 subtask source(s); digest d476a7fc…
- **2026-05-07T07:42:37.293Z** `rebuild` — Aggregated 8 subtask source(s); digest 345c022f…
<!-- status:events:end -->
