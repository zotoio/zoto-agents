# Spec 20260527-evals-json-first-migration — aggregate live status

<!-- status:overview:start -->
| Key | Value |
|-----|-------|
| spec_id | 20260527-evals-json-first-migration |
| phase | 0 |
| aggregate_state | completed |
| started_at | 2026-05-27T14:34:42.199Z |
| updated_at | 2026-05-29T12:17:38.890Z |

**config_reloaded**
_None._
<!-- status:overview:end -->

<!-- status:progress:start -->
| Metric | Count |
|--------|-------|
| Total | 10 |
| Completed | 10 |
| In progress | 0 |
| Blocked | 0 |
| Failed | 0 |
<!-- status:progress:end -->

<!-- status:subtasks:start -->
| Subtask | State | Status (yml) | Last heartbeat |
|---------|-------|--------------|----------------|
| 01 | completed | `specs/20260527-evals-json-first-migration/status/subtask-01-evals-json-first-migration-schema-contract-20260527.status.yml` | 2026-05-29T19:09:00.000Z |
| 02 | completed | `specs/20260527-evals-json-first-migration/status/subtask-02-evals-json-first-migration-vitest-json-loader-20260527.status.yml` | 2026-05-29T19:10:00.000Z |
| 03 | completed | `specs/20260527-evals-json-first-migration/status/subtask-03-evals-json-first-migration-harness-runner-dispatch-20260527.status.yml` | 2026-05-29T19:12:00.000Z |
| 04 | completed | `specs/20260527-evals-json-first-migration/status/subtask-04-evals-json-first-migration-engine-runner-update-20260527.status.yml` | 2026-05-29T09:11:29.182Z |
| 05 | completed | `specs/20260527-evals-json-first-migration/status/subtask-05-evals-json-first-migration-manifest-schema-20260527.status.yml` | 2026-05-29T19:14:00.000Z |
| 06 | completed | `specs/20260527-evals-json-first-migration/status/subtask-06-evals-json-first-migration-vitest-config-orchestrator-20260527.status.yml` | 2026-05-29T19:18:00.000Z |
| 07 | completed | `specs/20260527-evals-json-first-migration/status/subtask-07-evals-json-first-migration-migration-script-execute-20260527.status.yml` | 2026-05-29T19:22:00.000Z |
| 08 | completed | `specs/20260527-evals-json-first-migration/status/subtask-08-evals-json-first-migration-stamper-template-cleanup-20260527.status.yml` | 2026-05-29T09:21:13.903Z |
| 09 | completed | `specs/20260527-evals-json-first-migration/status/subtask-09-evals-json-first-migration-scenarios-docs-20260527.status.yml` | 2026-05-29T12:00:00Z |
| 10 | completed | `specs/20260527-evals-json-first-migration/status/subtask-10-evals-json-first-migration-validation-ci-20260527.status.yml` | 2026-05-29T12:10:18.540Z |
<!-- status:subtasks:end -->

<!-- status:blockers:start -->
_None._
<!-- status:blockers:end -->

<!-- status:definition-of-done:start -->
- [x] **DOD01** — All 10 subtasks completed with paired `.status.md` + `.status.yml` marked `state: completed`
- [x] **DOD02** — No co-located `*.test.ts` LLM eval files remain anywhere under `plugins/*/{commands,agents,hooks}/evals/`, `.cursor/{commands,agents,hooks}/evals/`
- [x] **DOD03** — Every non-skill primitive has a co-located `<name>.json` (or `hooks.json` for hooks) with `_meta.generated: true` where appropriate
- [x] **DOD04** — Migration audit shows 0 skipped files (all discovered `.test.ts` files successfully migrated)
- [x] **DOD05** — `pnpm eval` and `pnpm eval:full` succeed (or skip gracefully without `CURSOR_API_KEY`) using only the unified `evals/vitest.config.ts`
- [x] **DOD06** — `pnpm eval:update:check` reports zero critical drift
- [x] **DOD07** — `pnpm eval:list` enumerates every migrated `.json` file
- [x] **DOD08** — `scripts/validate-template.mjs`, `scripts/validate-skills.mjs`, and `pnpm test` all pass
- [x] **DOD09** — Eval-system README has an "Advanced TS escape hatch" section with a working `runner` example
- [x] **DOD10** — `evals/scenarios/_example-multi-primitive.test.ts` exists in the host repo template AND is copied by `/z-eval-create` on init
- [x] **DOD11** — CHANGELOG.md records the breaking change
- [x] **DOD12** — `manifest.schema.json` rejects non-`.json` entries for non-skill primitives (smoke-tested with an invalid fixture)
<!-- status:definition-of-done:end -->

<!-- status:events:start -->
- **2026-05-27T16:45:10.829Z** `rebuild` — Aggregated 10 subtask source(s); digest c1b9c571…
- **2026-05-27T16:45:55.613Z** `rebuild` — Aggregated 10 subtask source(s); digest a708a7db…
- **2026-05-27T16:50:18.055Z** `rebuild` — Aggregated 10 subtask source(s); digest 7efa1d31…
- **2026-05-27T16:50:21.136Z** `rebuild` — Aggregated 10 subtask source(s); digest d84095ed…
- **2026-05-27T16:51:09.053Z** `rebuild` — Aggregated 10 subtask source(s); digest 25b1b655…
- **2026-05-27T16:51:41.352Z** `rebuild` — Aggregated 10 subtask source(s); digest 4a66f28a…
- **2026-05-27T16:53:07.104Z** `rebuild` — Aggregated 10 subtask source(s); digest 309b5919…
- **2026-05-27T16:54:12.922Z** `rebuild` — Aggregated 10 subtask source(s); digest 781a3cac…
- **2026-05-27T17:07:01.697Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-09-evals-json-first-migration-scenarios-docs-20260527.status.yml
- **2026-05-27T17:07:01.697Z** `rebuild` — Aggregated 9 subtask source(s); digest 348641d4…
- **2026-05-27T17:07:03.371Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-09-evals-json-first-migration-scenarios-docs-20260527.status.yml
- **2026-05-27T17:07:03.371Z** `rebuild` — Aggregated 9 subtask source(s); digest f3e012bb…
- **2026-05-27T17:07:14.026Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-09-evals-json-first-migration-scenarios-docs-20260527.status.yml
- **2026-05-27T17:07:14.026Z** `rebuild` — Aggregated 9 subtask source(s); digest 3f6d34a0…
- **2026-05-27T17:07:31.005Z** `rebuild` — Aggregated 10 subtask source(s); digest d9d7beb1…
- **2026-05-27T17:07:32.569Z** `rebuild` — Aggregated 10 subtask source(s); digest 92bb2040…
- **2026-05-27T17:10:01.221Z** `rebuild` — Aggregated 10 subtask source(s); digest 288cb1b5…
- **2026-05-27T17:10:21.506Z** `rebuild` — Aggregated 10 subtask source(s); digest b3f6ba3a…
- **2026-05-27T17:16:30.403Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-09-evals-json-first-migration-scenarios-docs-20260527.status.yml
- **2026-05-27T17:16:30.403Z** `rebuild` — Aggregated 9 subtask source(s); digest 2e3d5552…
- **2026-05-27T17:16:31.969Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-09-evals-json-first-migration-scenarios-docs-20260527.status.yml
- **2026-05-27T17:16:31.969Z** `rebuild` — Aggregated 9 subtask source(s); digest 8f8e1961…
- **2026-05-27T17:17:29.280Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-09-evals-json-first-migration-scenarios-docs-20260527.status.yml
- **2026-05-27T17:17:29.280Z** `rebuild` — Aggregated 9 subtask source(s); digest 87160240…
- **2026-05-27T17:17:30.902Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-09-evals-json-first-migration-scenarios-docs-20260527.status.yml
- **2026-05-27T17:17:30.902Z** `rebuild` — Aggregated 9 subtask source(s); digest fc37a60e…
- **2026-05-27T17:18:08.234Z** `rebuild` — Aggregated 10 subtask source(s); digest 5774f7fe…
- **2026-05-27T17:18:09.781Z** `rebuild` — Aggregated 10 subtask source(s); digest a8315203…
- **2026-05-27T17:18:28.293Z** `rebuild` — Aggregated 10 subtask source(s); digest 1ec75512…
- **2026-05-27T17:18:29.843Z** `rebuild` — Aggregated 10 subtask source(s); digest 1674d85c…
- **2026-05-27T17:20:02.787Z** `rebuild` — Aggregated 10 subtask source(s); digest eda5748d…
- **2026-05-27T17:20:04.318Z** `rebuild` — Aggregated 10 subtask source(s); digest 9bb29b41…
- **2026-05-27T17:20:15.078Z** `rebuild` — Aggregated 10 subtask source(s); digest 3981a54d…
- **2026-05-27T17:20:16.660Z** `rebuild` — Aggregated 10 subtask source(s); digest fdc97c0d…
- **2026-05-27T17:20:24.408Z** `rebuild` — Aggregated 10 subtask source(s); digest 77f7199b…
- **2026-05-27T17:20:41.299Z** `rebuild` — Aggregated 10 subtask source(s); digest 1aaff7f7…
- **2026-05-27T17:20:53.712Z** `rebuild` — Aggregated 10 subtask source(s); digest 25b5f35b…
- **2026-05-29T09:08:37.167Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-01-evals-json-first-migration-schema-contract-20260527.status.yml
- **2026-05-29T09:08:37.167Z** `rebuild` — Aggregated 9 subtask source(s); digest 1130d722…
- **2026-05-29T09:08:38.748Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-01-evals-json-first-migration-schema-contract-20260527.status.yml
- **2026-05-29T09:08:38.748Z** `rebuild` — Aggregated 9 subtask source(s); digest 1a83f081…
- **2026-05-29T09:08:51.011Z** `rebuild` — Aggregated 10 subtask source(s); digest 3ec69390…
- **2026-05-29T09:08:52.554Z** `rebuild` — Aggregated 10 subtask source(s); digest ee1c49dd…
- **2026-05-29T09:09:51.251Z** `rebuild` — Aggregated 10 subtask source(s); digest 85d6bf0c…
- **2026-05-29T09:09:52.821Z** `rebuild` — Aggregated 10 subtask source(s); digest d68bbe02…
- **2026-05-29T09:10:25.147Z** `rebuild` — Aggregated 10 subtask source(s); digest 88b74160…
- **2026-05-29T09:11:29.767Z** `rebuild` — Aggregated 10 subtask source(s); digest 0fd43496…
- **2026-05-29T09:11:31.328Z** `rebuild` — Aggregated 10 subtask source(s); digest 0eb6e2ac…
- **2026-05-29T09:12:23.532Z** `rebuild` — Aggregated 10 subtask source(s); digest f8b330e8…
- **2026-05-29T09:12:25.072Z** `rebuild` — Aggregated 10 subtask source(s); digest c77af030…
- **2026-05-29T09:13:31.194Z** `rebuild` — Aggregated 10 subtask source(s); digest 75501f10…
- **2026-05-29T09:13:32.761Z** `rebuild` — Aggregated 10 subtask source(s); digest 4f640e3f…
- **2026-05-29T09:14:45.107Z** `rebuild` — Aggregated 10 subtask source(s); digest aa9db830…
- **2026-05-29T09:14:51.627Z** `rebuild` — Aggregated 10 subtask source(s); digest 04b53853…
- **2026-05-29T09:16:04.121Z** `rebuild` — Aggregated 10 subtask source(s); digest 98e6d3eb…
- **2026-05-29T09:16:36.617Z** `rebuild` — Aggregated 10 subtask source(s); digest 5f086cdd…
- **2026-05-29T09:16:42.825Z** `rebuild` — Aggregated 10 subtask source(s); digest e1179b5e…
- **2026-05-29T09:17:24.901Z** `rebuild` — Aggregated 10 subtask source(s); digest 9623c07b…
- **2026-05-29T09:17:26.463Z** `rebuild` — Aggregated 10 subtask source(s); digest 2e8e8008…
- **2026-05-29T09:19:49.639Z** `rebuild` — Aggregated 10 subtask source(s); digest ffc5b90d…
- **2026-05-29T09:21:12.663Z** `rebuild` — Aggregated 10 subtask source(s); digest f949d7b7…
- **2026-05-29T09:21:14.208Z** `rebuild` — Aggregated 10 subtask source(s); digest 244c76ab…
- **2026-05-29T09:21:15.756Z** `rebuild` — Aggregated 10 subtask source(s); digest 551c5e3b…
- **2026-05-29T09:21:20.394Z** `rebuild` — Aggregated 10 subtask source(s); digest 8e53b8de…
- **2026-05-29T09:21:42.407Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-07-evals-json-first-migration-migration-script-execute-20260527.status.yml
- **2026-05-29T09:21:42.407Z** `rebuild` — Aggregated 9 subtask source(s); digest a267b24f…
- **2026-05-29T09:21:43.981Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-07-evals-json-first-migration-migration-script-execute-20260527.status.yml
- **2026-05-29T09:21:43.981Z** `rebuild` — Aggregated 9 subtask source(s); digest 76f882fd…
- **2026-05-29T09:21:50.181Z** `rebuild` — Aggregated 10 subtask source(s); digest 6e15781a…
- **2026-05-29T09:21:51.750Z** `rebuild` — Aggregated 10 subtask source(s); digest 6681d84a…
- **2026-05-29T09:23:19.474Z** `rebuild` — Aggregated 10 subtask source(s); digest 3e71bf2a…
- **2026-05-29T09:25:56.745Z** `rebuild` — Aggregated 10 subtask source(s); digest bf0565ab…
- **2026-05-29T09:37:11.630Z** `rebuild` — Aggregated 10 subtask source(s); digest 13a395f3…
- **2026-05-29T10:00:27.106Z** `rebuild` — Aggregated 10 subtask source(s); digest 73a20f38…
- **2026-05-29T10:09:43.394Z** `rebuild` — Aggregated 10 subtask source(s); digest 0d0e6faa…
- **2026-05-29T10:09:56.654Z** `rebuild` — Aggregated 10 subtask source(s); digest 26a93c52…
- **2026-05-29T10:17:41.317Z** `rebuild` — Aggregated 10 subtask source(s); digest 037bad03…
- **2026-05-29T10:17:46.194Z** `rebuild` — Aggregated 10 subtask source(s); digest 592bd712…
- **2026-05-29T10:17:55.372Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-09-evals-json-first-migration-scenarios-docs-20260527.status.yml
- **2026-05-29T10:17:55.372Z** `rebuild` — Aggregated 9 subtask source(s); digest 0d705442…
- **2026-05-29T10:17:55.948Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-09-evals-json-first-migration-scenarios-docs-20260527.status.yml
- **2026-05-29T10:17:55.948Z** `rebuild` — Aggregated 9 subtask source(s); digest bc24d3b1…
- **2026-05-29T10:18:16.485Z** `source_validation_warn` — Schema validation failed for specs/20260527-evals-json-first-migration/status/subtask-09-evals-json-first-migration-scenarios-docs-20260527.status.yml
- **2026-05-29T10:18:16.485Z** `rebuild` — Aggregated 9 subtask source(s); digest b9f797d1…
- **2026-05-29T10:18:57.668Z** `rebuild` — Aggregated 10 subtask source(s); digest f895e496…
- **2026-05-29T10:18:59.276Z** `rebuild` — Aggregated 10 subtask source(s); digest f3e4e6f9…
- **2026-05-29T10:19:18.524Z** `rebuild` — Aggregated 10 subtask source(s); digest 603804fb…
- **2026-05-29T10:19:41.349Z** `rebuild` — Aggregated 10 subtask source(s); digest ea9e8e2c…
- **2026-05-29T10:20:07.920Z** `rebuild` — Aggregated 10 subtask source(s); digest 2661c9d8…
- **2026-05-29T10:20:14.032Z** `rebuild` — Aggregated 10 subtask source(s); digest 122108bc…
- **2026-05-29T10:20:17.719Z** `rebuild` — Aggregated 10 subtask source(s); digest 7b4c68ca…
- **2026-05-29T10:20:42.152Z** `rebuild` — Aggregated 10 subtask source(s); digest db6c586a…
- **2026-05-29T10:20:56.137Z** `rebuild` — Aggregated 10 subtask source(s); digest 7b4c68ca…
- **2026-05-29T10:21:18.974Z** `rebuild` — Aggregated 10 subtask source(s); digest db6c586a…
- **2026-05-29T10:21:40.846Z** `rebuild` — Aggregated 10 subtask source(s); digest d8f941f9…
- **2026-05-29T10:21:42.425Z** `rebuild` — Aggregated 10 subtask source(s); digest 3a7c2d93…
- **2026-05-29T10:22:17.652Z** `rebuild` — Aggregated 10 subtask source(s); digest 686ba462…
- **2026-05-29T10:22:38.865Z** `rebuild` — Aggregated 10 subtask source(s); digest 04592440…
- **2026-05-29T10:22:55.982Z** `rebuild` — Aggregated 10 subtask source(s); digest 1ec6963a…
- **2026-05-29T12:17:38.890Z** `rebuild` — Aggregated 10 subtask source(s); digest af236f6c…
<!-- status:events:end -->
