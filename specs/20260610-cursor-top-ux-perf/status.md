# Spec 20260610-cursor-top-ux-perf — aggregate live status

<!-- status:overview:start -->
| Key | Value |
|-----|-------|
| spec_id | 20260610-cursor-top-ux-perf |
| phase | 0 |
| aggregate_state | completed |
| started_at | 2026-06-10T13:52:51.263Z |
| updated_at | 2026-06-10T22:53:18.317Z |

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
| 01 | completed | `specs/20260610-cursor-top-ux-perf/status/subtask-01-cursor-top-ux-perf-baseline-bench-contracts-20260610.status.yml` | 2026-06-10T14:45:06.458Z |
| 02 | completed | `specs/20260610-cursor-top-ux-perf/status/subtask-02-cursor-top-ux-perf-theme-density-20260610.status.yml` | 2026-06-10T14:55:40.982Z |
| 03 | completed | `specs/20260610-cursor-top-ux-perf/status/subtask-03-cursor-top-ux-perf-collector-caching-20260610.status.yml` | 2026-06-11T08:14:00.000Z |
| 04 | completed | `specs/20260610-cursor-top-ux-perf/status/subtask-04-cursor-top-ux-perf-filter-search-20260610.status.yml` | — |
| 05 | completed | `specs/20260610-cursor-top-ux-perf/status/subtask-05-cursor-top-ux-perf-status-events-20260610.status.yml` | — |
| 06 | completed | `specs/20260610-cursor-top-ux-perf/status/subtask-06-cursor-top-ux-perf-detail-pane-20260610.status.yml` | 2026-06-11T08:25:00Z |
| 07 | completed | `specs/20260610-cursor-top-ux-perf/status/subtask-07-cursor-top-ux-perf-render-windowing-20260610.status.yml` | 2026-06-11T08:32:00Z |
| 08 | completed | `specs/20260610-cursor-top-ux-perf/status/subtask-08-cursor-top-ux-perf-integration-verification-20260610.status.yml` | 2026-06-11T08:55:00Z |
<!-- status:subtasks:end -->

<!-- status:blockers:start -->
_None._
<!-- status:blockers:end -->

<!-- status:definition-of-done:start -->
- [x] **DOD01** — All 8 subtasks completed and adversarially verified
- [x] **DOD02** — All hard constraints preserved: no native deps, macOS/Linux/Windows parity, stable default `--once`/`--json`/`--demo` output, backward-compatible JSON snapshot shape
- [x] **DOD03** — Contract tests from subtask 01 pass unchanged at spec completion
- [x] **DOD04** — `bench/BASELINE.md` contains baseline + post-03 + post-07 + final (08) measurements demonstrating per-tick discovery and render improvements at the 1k-agent tier
- [x] **DOD05** — Plugin test suite green: `pnpm --filter @zoto-agents/zoto-cursor-top test`
- [x] **DOD06** — Monorepo gates green: `node scripts/validate-template.mjs`, `node scripts/validate-skills.mjs`, `pnpm test` (per-package signal), `pnpm run eval:update --check`
- [x] **DOD07** — No linter errors in modified files
- [x] **DOD08** — README, CHANGELOG (0.2.0), command/skill/rule/agent docs reflect all new flags, keys, and behaviour
<!-- status:definition-of-done:end -->

<!-- status:events:start -->
- **2026-06-10T13:52:51.263Z** `rebuild` — Aggregated 8 subtask source(s); digest 3d2ea62f…
- **2026-06-10T13:52:52.812Z** `rebuild` — Aggregated 8 subtask source(s); digest 1a40ad82…
- **2026-06-10T14:01:25.692Z** `rebuild` — Aggregated 8 subtask source(s); digest 7e37ddb5…
- **2026-06-10T14:01:27.205Z** `rebuild` — Aggregated 8 subtask source(s); digest 5c905f3f…
- **2026-06-10T14:17:32.665Z** `rebuild` — Aggregated 8 subtask source(s); digest 086d51b5…
- **2026-06-10T14:20:21.791Z** `rebuild` — Aggregated 8 subtask source(s); digest 9aa471e7…
- **2026-06-10T14:22:31.560Z** `rebuild` — Aggregated 8 subtask source(s); digest 65c550e8…
- **2026-06-10T14:22:46.735Z** `rebuild` — Aggregated 8 subtask source(s); digest 0d48b2d6…
- **2026-06-10T14:22:48.244Z** `rebuild` — Aggregated 8 subtask source(s); digest 7f5974e7…
- **2026-06-10T14:27:13.732Z** `rebuild` — Aggregated 8 subtask source(s); digest 265893e0…
- **2026-06-10T14:30:05.949Z** `rebuild` — Aggregated 8 subtask source(s); digest f503df8c…
- **2026-06-10T14:30:07.461Z** `rebuild` — Aggregated 8 subtask source(s); digest bb8e233f…
- **2026-06-10T14:30:16.516Z** `rebuild` — Aggregated 8 subtask source(s); digest f3a2b46c…
- **2026-06-10T14:32:55.024Z** `rebuild` — Aggregated 8 subtask source(s); digest 8e5ce731…
- **2026-06-10T14:33:14.647Z** `rebuild` — Aggregated 8 subtask source(s); digest 03ae6470…
- **2026-06-10T14:37:22.228Z** `rebuild` — Aggregated 8 subtask source(s); digest 4b20aa48…
- **2026-06-10T14:38:05.324Z** `source_validation_warn` — Schema validation failed for specs/20260610-cursor-top-ux-perf/status/subtask-02-cursor-top-ux-perf-theme-density-20260610.status.yml
- **2026-06-10T14:38:05.324Z** `rebuild` — Aggregated 7 subtask source(s); digest 6304e6f0…
- **2026-06-10T14:38:14.768Z** `rebuild` — Aggregated 8 subtask source(s); digest deb1c070…
- **2026-06-10T14:39:26.244Z** `rebuild` — Aggregated 8 subtask source(s); digest b0e17262…
- **2026-06-10T14:39:52.169Z** `rebuild` — Aggregated 8 subtask source(s); digest e39c552e…
- **2026-06-10T14:41:58.721Z** `rebuild` — Aggregated 8 subtask source(s); digest 7380e043…
- **2026-06-10T14:41:58.844Z** `rebuild` — Aggregated 8 subtask source(s); digest 986e7137…
- **2026-06-10T14:42:01.755Z** `rebuild` — Aggregated 8 subtask source(s); digest 5ce36acf…
- **2026-06-10T14:42:03.388Z** `source_validation_warn` — Schema validation failed for specs/20260610-cursor-top-ux-perf/status/subtask-02-cursor-top-ux-perf-theme-density-20260610.status.yml
- **2026-06-10T14:42:03.388Z** `rebuild` — Aggregated 7 subtask source(s); digest b69785c8…
- **2026-06-10T14:42:04.785Z** `source_validation_warn` — Schema validation failed for specs/20260610-cursor-top-ux-perf/status/subtask-02-cursor-top-ux-perf-theme-density-20260610.status.yml
- **2026-06-10T14:42:04.785Z** `rebuild` — Aggregated 7 subtask source(s); digest f6c5fbc7…
- **2026-06-10T14:42:22.934Z** `source_validation_warn` — Schema validation failed for specs/20260610-cursor-top-ux-perf/status/subtask-02-cursor-top-ux-perf-theme-density-20260610.status.yml
- **2026-06-10T14:42:22.934Z** `rebuild` — Aggregated 7 subtask source(s); digest 7f6ae067…
- **2026-06-10T14:42:24.446Z** `source_validation_warn` — Schema validation failed for specs/20260610-cursor-top-ux-perf/status/subtask-02-cursor-top-ux-perf-theme-density-20260610.status.yml
- **2026-06-10T14:42:24.446Z** `rebuild` — Aggregated 7 subtask source(s); digest fcb18388…
- **2026-06-10T14:42:27.471Z** `source_validation_warn` — Schema validation failed for specs/20260610-cursor-top-ux-perf/status/subtask-02-cursor-top-ux-perf-theme-density-20260610.status.yml
- **2026-06-10T14:42:27.471Z** `rebuild` — Aggregated 7 subtask source(s); digest 130cf9af…
- **2026-06-10T14:42:33.518Z** `rebuild` — Aggregated 8 subtask source(s); digest 3af2afa2…
- **2026-06-10T14:42:33.619Z** `rebuild` — Aggregated 8 subtask source(s); digest 833ddad3…
- **2026-06-10T14:42:36.546Z** `rebuild` — Aggregated 8 subtask source(s); digest 248c4459…
- **2026-06-10T14:43:32.687Z** `rebuild` — Aggregated 8 subtask source(s); digest d47efc8f…
- **2026-06-10T14:43:35.727Z** `rebuild` — Aggregated 8 subtask source(s); digest c8b6e774…
- **2026-06-10T14:43:52.869Z** `rebuild` — Aggregated 8 subtask source(s); digest 8fab5212…
- **2026-06-10T14:44:08.289Z** `rebuild` — Aggregated 8 subtask source(s); digest c837a37e…
- **2026-06-10T14:44:11.391Z** `rebuild` — Aggregated 8 subtask source(s); digest 18a7c2bb…
- **2026-06-10T14:44:26.528Z** `rebuild` — Aggregated 8 subtask source(s); digest 1e4a8d9f…
- **2026-06-10T14:44:46.192Z** `rebuild` — Aggregated 8 subtask source(s); digest 9e1d22dc…
- **2026-06-10T14:44:46.204Z** `rebuild` — Aggregated 8 subtask source(s); digest 50a2aa74…
- **2026-06-10T14:44:52.240Z** `rebuild` — Aggregated 8 subtask source(s); digest 2a26e192…
- **2026-06-10T14:44:55.271Z** `rebuild` — Aggregated 8 subtask source(s); digest 26b9b69b…
- **2026-06-10T14:45:07.383Z** `rebuild` — Aggregated 8 subtask source(s); digest a0678f0c…
- **2026-06-10T14:51:06.375Z** `rebuild` — Aggregated 8 subtask source(s); digest 3b231aee…
- **2026-06-10T14:51:06.437Z** `rebuild` — Aggregated 8 subtask source(s); digest d0d7cb21…
- **2026-06-10T14:51:32.075Z** `source_validation_warn` — Schema validation failed for specs/20260610-cursor-top-ux-perf/status/subtask-02-cursor-top-ux-perf-theme-density-20260610.status.yml
- **2026-06-10T14:51:32.075Z** `rebuild` — Aggregated 7 subtask source(s); digest 36fa6464…
- **2026-06-10T14:51:32.148Z** `source_validation_warn` — Schema validation failed for specs/20260610-cursor-top-ux-perf/status/subtask-02-cursor-top-ux-perf-theme-density-20260610.status.yml
- **2026-06-10T14:51:32.148Z** `rebuild` — Aggregated 7 subtask source(s); digest d7973bca…
- **2026-06-10T14:52:15.922Z** `source_validation_warn` — Schema validation failed for specs/20260610-cursor-top-ux-perf/status/subtask-02-cursor-top-ux-perf-theme-density-20260610.status.yml
- **2026-06-10T14:52:15.922Z** `rebuild` — Aggregated 7 subtask source(s); digest c481cf0e…
- **2026-06-10T14:52:18.946Z** `rebuild` — Aggregated 8 subtask source(s); digest cada58af…
- **2026-06-10T14:52:19.030Z** `rebuild` — Aggregated 8 subtask source(s); digest 3a73bd38…
- **2026-06-10T14:52:41.628Z** `rebuild` — Aggregated 8 subtask source(s); digest f11d5daa…
- **2026-06-10T14:54:54.799Z** `rebuild` — Aggregated 8 subtask source(s); digest 99e693be…
- **2026-06-10T14:54:54.948Z** `rebuild` — Aggregated 8 subtask source(s); digest ca0057a1…
- **2026-06-10T14:54:57.830Z** `rebuild` — Aggregated 8 subtask source(s); digest d53ce2b1…
- **2026-06-10T14:55:15.982Z** `rebuild` — Aggregated 8 subtask source(s); digest 685b61ec…
- **2026-06-10T14:55:41.774Z** `rebuild` — Aggregated 8 subtask source(s); digest 515f014d…
- **2026-06-10T22:53:18.317Z** `rebuild` — Aggregated 8 subtask source(s); digest d8250559…
<!-- status:events:end -->
