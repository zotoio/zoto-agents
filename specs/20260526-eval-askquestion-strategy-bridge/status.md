# Spec 20260526-eval-askquestion-strategy-bridge — aggregate live status

<!-- status:overview:start -->
| Key | Value |
|-----|-------|
| spec_id | 20260526-eval-askquestion-strategy-bridge |
| phase | 0 |
| aggregate_state | completed |
| started_at | 2026-05-25T15:06:57.207Z |
| updated_at | 2026-05-25T17:47:51.922Z |

**config_reloaded**
_None._
<!-- status:overview:end -->

<!-- status:progress:start -->
| Metric | Count |
|--------|-------|
| Total | 13 |
| Completed | 13 |
| In progress | 0 |
| Blocked | 0 |
| Failed | 0 |
<!-- status:progress:end -->

<!-- status:subtasks:start -->
| Subtask | State | Status (yml) | Last heartbeat |
|---------|-------|--------------|----------------|
| 01 | completed | `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-01-eval-askquestion-strategy-bridge-sdk-investigation-20260526.status.yml` | 2026-05-25T15:12:12.473Z |
| 02 | completed | `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-02-eval-askquestion-strategy-bridge-eval-corpus-baseline-20260526.status.yml` | 2026-05-25T15:18:20.477Z |
| 03 | completed | `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-03-eval-askquestion-strategy-bridge-docs-discovery-20260526.status.yml` | — |
| 04 | completed | `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-04-eval-askquestion-strategy-bridge-analyser-classification-20260526.status.yml` | — |
| 05 | completed | `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-05-eval-askquestion-strategy-bridge-bridge-helper-module-20260526.status.yml` | — |
| 06 | completed | `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-06-eval-askquestion-strategy-bridge-stamper-routing-20260526.status.yml` | — |
| 07 | completed | `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-07-eval-askquestion-strategy-bridge-code-template-upgrade-20260526.status.yml` | 2026-05-25T15:28:50Z |
| 08 | completed | `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-08-eval-askquestion-strategy-bridge-declarative-template-upgrade-20260526.status.yml` | — |
| 09 | completed | `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-09-eval-askquestion-strategy-bridge-existing-eval-migration-20260526.status.yml` | 2026-05-25T17:46:29.228Z |
| 10 | completed | `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml` | — |
| 11 | completed | `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-11-eval-askquestion-strategy-bridge-site-docs-update-20260526.status.yml` | — |
| 12 | completed | `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-12-eval-askquestion-strategy-bridge-readme-and-help-update-20260526.status.yml` | — |
| 13 | completed | `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-13-eval-askquestion-strategy-bridge-validation-and-manifest-20260526.status.yml` | 2026-05-25T17:46:40.147Z |
<!-- status:subtasks:end -->

<!-- status:blockers:start -->
_None._
<!-- status:blockers:end -->

<!-- status:definition-of-done:start -->
- [x] **DOD01** — `analyser-payload.schema.json` carries optional `requiresInteraction` and `interactionStyle` fields; `analyser_version` is bumped exactly once.
- [x] **DOD02** — `evals/llm/_shared/askquestion-bridge.ts` exists with the ADR-pinned surface and unit-test coverage.
- [x] **DOD03** — Stamper picks one backend per target and rejects dual-backend scaffolds.
- [x] **DOD04** — Every eligible non-interactive stamped LLM test is migrated to declarative JSON; every interactive one switches to the new bridge import; user-authored cases are byte-identical (except 1-line pre-existing JSON fix on execute-spec).
- [x] **DOD05** — `/zoto-create-plugin` produces the right backend on first stamp; the smoke test passes.
- [x] **DOD06** — `evals/_runs/<ts>/llm.yml` carries a `backend:` field per case row (code backend verified).
- [x] **DOD07** — `site/eval-system/*.html`, `site/images/diagrams/eval-askquestion-flow.svg`, `plugins/zoto-eval-system/README.md`, `evals/llm/_shared/README.md`, and the `zoto-help-evals` anchor table are updated.
- [x] **DOD08** — `pnpm run eval:list` exits 0.
- [x] **DOD09** — `pnpm run eval -- --collect-only` exits 0.
- [x] **DOD10** — `pnpm run eval:update --check` exits 0.
- [ ] **DOD11** — A smoke `pnpm run eval:llm` cohort with `CURSOR_API_KEY` set passes both backends (declarative hook case deferred — see execution report).
- [x] **DOD12** — `.zoto/eval-system/manifest.yml` is refreshed exactly once and `manifest.history.yml` gains exactly one new appended entry.
- [x] **DOD13** — Execution report captures all four gate exit logs and the backend distribution (per-plugin, per-kind).
<!-- status:definition-of-done:end -->

<!-- status:events:start -->
- **2026-05-25T17:04:37.613Z** `rebuild` — Aggregated 12 subtask source(s); digest f1e3d17b…
- **2026-05-25T17:09:39.881Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:09:39.881Z** `rebuild` — Aggregated 12 subtask source(s); digest d8326791…
- **2026-05-25T17:11:33.864Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:11:33.864Z** `rebuild` — Aggregated 12 subtask source(s); digest 045da4f5…
- **2026-05-25T17:11:37.247Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:11:37.247Z** `rebuild` — Aggregated 12 subtask source(s); digest c42476a9…
- **2026-05-25T17:12:56.821Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:12:56.821Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-12-eval-askquestion-strategy-bridge-readme-and-help-update-20260526.status.yml
- **2026-05-25T17:12:56.821Z** `rebuild` — Aggregated 11 subtask source(s); digest d82bc0cd…
- **2026-05-25T17:12:58.390Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:12:58.390Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-12-eval-askquestion-strategy-bridge-readme-and-help-update-20260526.status.yml
- **2026-05-25T17:12:58.390Z** `rebuild` — Aggregated 11 subtask source(s); digest 95fd972b…
- **2026-05-25T17:13:04.982Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:13:04.982Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-12-eval-askquestion-strategy-bridge-readme-and-help-update-20260526.status.yml
- **2026-05-25T17:13:04.982Z** `rebuild` — Aggregated 11 subtask source(s); digest 63363eac…
- **2026-05-25T17:13:06.640Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:13:06.640Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-11-eval-askquestion-strategy-bridge-site-docs-update-20260526.status.yml
- **2026-05-25T17:13:06.640Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-12-eval-askquestion-strategy-bridge-readme-and-help-update-20260526.status.yml
- **2026-05-25T17:13:06.640Z** `rebuild` — Aggregated 10 subtask source(s); digest af18c6ce…
- **2026-05-25T17:13:08.238Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:13:08.238Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-11-eval-askquestion-strategy-bridge-site-docs-update-20260526.status.yml
- **2026-05-25T17:13:08.238Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-12-eval-askquestion-strategy-bridge-readme-and-help-update-20260526.status.yml
- **2026-05-25T17:13:08.238Z** `rebuild` — Aggregated 10 subtask source(s); digest b0adc1f1…
- **2026-05-25T17:14:27.292Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:14:27.292Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-11-eval-askquestion-strategy-bridge-site-docs-update-20260526.status.yml
- **2026-05-25T17:14:27.292Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-12-eval-askquestion-strategy-bridge-readme-and-help-update-20260526.status.yml
- **2026-05-25T17:14:27.292Z** `rebuild` — Aggregated 10 subtask source(s); digest 8ab806c4…
- **2026-05-25T17:14:36.907Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:14:36.907Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-11-eval-askquestion-strategy-bridge-site-docs-update-20260526.status.yml
- **2026-05-25T17:14:36.907Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-12-eval-askquestion-strategy-bridge-readme-and-help-update-20260526.status.yml
- **2026-05-25T17:14:36.907Z** `rebuild` — Aggregated 10 subtask source(s); digest eacb3abe…
- **2026-05-25T17:14:58.984Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:14:58.984Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-12-eval-askquestion-strategy-bridge-readme-and-help-update-20260526.status.yml
- **2026-05-25T17:14:58.984Z** `rebuild` — Aggregated 11 subtask source(s); digest 9ef2514d…
- **2026-05-25T17:15:00.597Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:15:00.597Z** `rebuild` — Aggregated 12 subtask source(s); digest ba64e739…
- **2026-05-25T17:15:02.161Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:15:02.161Z** `rebuild` — Aggregated 12 subtask source(s); digest 6aafd806…
- **2026-05-25T17:38:22.865Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:38:22.865Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-13-eval-askquestion-strategy-bridge-validation-and-manifest-20260526.status.yml
- **2026-05-25T17:38:22.865Z** `rebuild` — Aggregated 11 subtask source(s); digest bc7c8791…
- **2026-05-25T17:38:24.467Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:38:24.467Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-13-eval-askquestion-strategy-bridge-validation-and-manifest-20260526.status.yml
- **2026-05-25T17:38:24.467Z** `rebuild` — Aggregated 11 subtask source(s); digest 045a3fab…
- **2026-05-25T17:39:18.063Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:39:18.063Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-13-eval-askquestion-strategy-bridge-validation-and-manifest-20260526.status.yml
- **2026-05-25T17:39:18.063Z** `rebuild` — Aggregated 11 subtask source(s); digest da537305…
- **2026-05-25T17:39:33.258Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:39:33.258Z** `rebuild` — Aggregated 12 subtask source(s); digest 5ebdef90…
- **2026-05-25T17:39:34.782Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:39:34.782Z** `rebuild` — Aggregated 12 subtask source(s); digest 75660214…
- **2026-05-25T17:43:18.328Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:43:18.328Z** `rebuild` — Aggregated 12 subtask source(s); digest 3fad280f…
- **2026-05-25T17:43:19.848Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:43:19.848Z** `rebuild` — Aggregated 12 subtask source(s); digest a499df65…
- **2026-05-25T17:43:22.895Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:43:22.895Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-13-eval-askquestion-strategy-bridge-validation-and-manifest-20260526.status.yml
- **2026-05-25T17:43:22.895Z** `rebuild` — Aggregated 11 subtask source(s); digest 667a797d…
- **2026-05-25T17:43:24.425Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:43:24.425Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-13-eval-askquestion-strategy-bridge-validation-and-manifest-20260526.status.yml
- **2026-05-25T17:43:24.425Z** `rebuild` — Aggregated 11 subtask source(s); digest 215e97a0…
- **2026-05-25T17:44:51.142Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:44:51.142Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-13-eval-askquestion-strategy-bridge-validation-and-manifest-20260526.status.yml
- **2026-05-25T17:44:51.142Z** `rebuild` — Aggregated 11 subtask source(s); digest 88d82e50…
- **2026-05-25T17:45:00.257Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:45:00.257Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-13-eval-askquestion-strategy-bridge-validation-and-manifest-20260526.status.yml
- **2026-05-25T17:45:00.257Z** `rebuild` — Aggregated 11 subtask source(s); digest 6bc4889f…
- **2026-05-25T17:45:03.302Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:45:03.302Z** `rebuild` — Aggregated 12 subtask source(s); digest 85fb7c98…
- **2026-05-25T17:45:04.826Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:45:04.826Z** `rebuild` — Aggregated 12 subtask source(s); digest 33bd80d9…
- **2026-05-25T17:45:39.740Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:45:39.740Z** `rebuild` — Aggregated 12 subtask source(s); digest d6b36e09…
- **2026-05-25T17:45:42.823Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:45:42.823Z** `rebuild` — Aggregated 12 subtask source(s); digest b3060ad4…
- **2026-05-25T17:45:45.864Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:45:45.864Z** `rebuild` — Aggregated 12 subtask source(s); digest 39ad25e7…
- **2026-05-25T17:45:48.914Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:45:48.914Z** `rebuild` — Aggregated 12 subtask source(s); digest 7aef6652…
- **2026-05-25T17:46:17.786Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:46:17.786Z** `rebuild` — Aggregated 12 subtask source(s); digest 4beb9d4e…
- **2026-05-25T17:46:19.308Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:46:19.308Z** `rebuild` — Aggregated 12 subtask source(s); digest dfa6df3e…
- **2026-05-25T17:46:22.351Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:46:22.351Z** `rebuild` — Aggregated 12 subtask source(s); digest d7073e71…
- **2026-05-25T17:46:23.872Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:46:23.872Z** `rebuild` — Aggregated 12 subtask source(s); digest dcce8f08…
- **2026-05-25T17:46:30.046Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:46:30.046Z** `rebuild` — Aggregated 12 subtask source(s); digest 63f023cf…
- **2026-05-25T17:46:37.660Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:46:37.660Z** `rebuild` — Aggregated 12 subtask source(s); digest 3b8fb133…
- **2026-05-25T17:46:40.701Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:46:40.701Z** `rebuild` — Aggregated 12 subtask source(s); digest 56239229…
- **2026-05-25T17:47:33.818Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:47:33.818Z** `rebuild` — Aggregated 12 subtask source(s); digest aa23aa4f…
- **2026-05-25T17:47:35.340Z** `source_validation_warn` — Schema validation failed for specs/20260526-eval-askquestion-strategy-bridge/status/subtask-10-eval-askquestion-strategy-bridge-plugin-creation-integration-20260526.status.yml
- **2026-05-25T17:47:35.340Z** `rebuild` — Aggregated 12 subtask source(s); digest 7453c748…
- **2026-05-25T17:47:50.552Z** `rebuild` — Aggregated 13 subtask source(s); digest 8e9d21e0…
- **2026-05-25T17:47:51.922Z** `rebuild` — Aggregated 13 subtask source(s); digest 2ba02054…
<!-- status:events:end -->
