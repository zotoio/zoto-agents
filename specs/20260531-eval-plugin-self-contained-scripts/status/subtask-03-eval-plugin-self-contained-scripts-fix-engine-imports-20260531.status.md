# Subtask 03 — Eval Plugin Self-Contained Scripts Consolidation — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 03 |
| feature | Eval Plugin Self-Contained Scripts Consolidation |
| assigned_agent | zoto-eval-engineer |
| model | composer-2.5-fast |
| token_budget | 300000 |
| state | completed |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `engine/update.ts` imports analyser + stamper from `../scripts/` not `../../../scripts/` (`plugins/zoto-eval-system/engine/update.ts`)
- [x] **D02** — `engine/update.ts` parity check path references `../scripts/check-analyser-payload-parity.ts` (or equivalent relative path) (`plugins/zoto-eval-system/engine/update.ts`)
- [x] **D03** — Grep clean: `rg '../../../scripts' plugins/zoto-eval-system/` → zero hits in `.ts` files (`plugins/zoto-eval-system/scripts/stamp-host-layout.ts`)
- [x] **D04** — Update `evals/llm/_shared/zoto-create-plugin-suite.ts` and `.test.ts` imports to plugin script paths (`evals/llm/_shared/zoto-create-plugin-suite.ts`)
- [x] **D05** — Update any `evals/_llm/*.ts` smoke files importing root scripts (`evals/_llm/sandbox.smoke.ts`)
- [x] **D06** — Resolve circular import risk between `engine/update.ts` and moved scripts (extract shared types to `engine/` or `src/` if needed — minimal extraction only) (`plugins/zoto-eval-system/engine/update.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-eval-system/engine/update.ts` — Retargeted imports to ../scripts/ within plugin tree
- **modified** `plugins/zoto-eval-system/scripts/eval-discover.ts` — Canonical discover script in plugin scripts/
- **modified** `evals/llm/_shared/zoto-create-plugin-suite.ts` — Retargeted analyser import to plugin script path
- **modified** `evals/llm/_shared/zoto-create-plugin-suite.test.ts` — Retargeted test imports to plugin script path
- **modified** `evals/_llm/analyser.cache.selftest.ts` — Retargeted smoke imports to plugin script path
- **modified** `evals/_llm/sandbox.smoke.ts` — Retargeted smoke imports to plugin script path
- **modified** `plugins/zoto-eval-system/tests/plugin.test.ts` — Updated discover import path
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
tsc reports pre-existing unrelated errors (CJS/import.meta, json-source-map types, eval-stamp hostRepoRoot, ajv construct signatures). Smoke `--check` exit 2 = expected critical drift (3 modified skills). Vitest engine-runner-update-spec04: 24/24 pass. evals/test_*.ts dogfood files: 0 runtime imports of root scripts/ (comments only).
<!-- status:notes:end -->
