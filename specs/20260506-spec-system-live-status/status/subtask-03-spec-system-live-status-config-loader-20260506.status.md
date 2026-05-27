# Subtask 03 — spec-system-live-status — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 03 |
| feature | spec-system-live-status |
| assigned_agent | crux-software-engineer |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T08:02:52.956Z |
| last_heartbeat | 2026-05-06T08:03:20.945Z |
| completed_at | 2026-05-06T08:03:20.945Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-spec-system/src/config-loader.ts` — public surface: (`plugins/zoto-spec-system/src/config-loader.ts`)
- [x] **D02** — `plugins/zoto-spec-system/src/config-loader.test.ts` — vitest unit tests: (`plugins/zoto-spec-system/src/config-loader.test.ts`)
- [x] **D03** — `plugins/zoto-spec-system/src/index.ts` (new or extended) — re-exports the loader so other plugin code can `import { loadConfig } from "@zoto-agents/zoto-spec-system"` (`plugins/zoto-spec-system/src/index.ts`)
- [x] **D04** — `plugins/zoto-spec-system/templates/config.json` — extend with the new defaults (preserving existing keys): (`plugins/zoto-spec-system/templates/config.json`)
- [x] **D05** — `plugins/zoto-spec-system/docs/example-config.json` — extend with a more complete example showing per-role overrides (left for subtask 09 to refine if needed; create a minimal copy here so the loader's "fully populated" test fixture stays close to docs) (`plugins/zoto-spec-system/docs/example-config.json`)
- [x] **D06** — `plugins/zoto-spec-system/package.json` — add the runtime deps (`ajv@^8`, `ajv-formats@^3`, `yaml@^2`) and the dev dep (`@types/node`); use the latest minor / patch versions and run via `pnpm` (the repo's package manager). Use the `yaml` package (matches `plugins/zoto-eval-system`'s existing usage of `import YAML from "yaml"`); do **not** introduce `js-yaml`. The user's preference is `yarn`, but this plugin already uses `pnpm` per the repo's `pnpm-workspace.yaml` — keep `pnpm` here for consistency and call that out in the work log. (`plugins/zoto-spec-system/package.json`)
- [x] **D07** — `plugins/zoto-spec-system/tsconfig.json` — extend `include` to add `"src/**/*.ts"` so the new loader, integration tests, and downstream subtask 07 modules are typechecked. Current include is `["scripts/**/*.ts", "tests/**/*.ts", "hooks/**/*.ts"]`. (`plugins/zoto-spec-system/tsconfig.json`)
- [x] **D08** — Re-export `SpecSystemConfig`, `loadConfig`, `resolveSubagentBudget` from the plugin package's main entry so external scripts can import them. (`plugins/zoto-spec-system/src/index.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-spec-system/src/config-loader.ts` — schema-validated synchronous loader
- **created** `plugins/zoto-spec-system/src/config-loader.test.ts` — vitest coverage for loadConfig and resolveSubagentBudget
- **created** `plugins/zoto-spec-system/src/index.ts` — public package entry re-exports
- **modified** `plugins/zoto-spec-system/templates/config.json` — defaults for aggregator and subagents
- **created** `plugins/zoto-spec-system/docs/example-config.json` — example with per-role overrides
- **modified** `plugins/zoto-spec-system/package.json` — ajv, ajv-formats, yaml, @types/node
- **modified** `plugins/zoto-spec-system/tsconfig.json` — include src/**/*.ts
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
