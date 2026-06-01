# Subtask 05 — Eval Plugin Self-Contained Scripts Consolidation — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 05 |
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
- [x] **D01** — Root `package.json` — every `eval:*` script points at `plugins/zoto-eval-system/scripts/<file>` or `plugins/zoto-eval-system/engine/<file>` (for `eval:update`, `eval:compare`, etc.) (`package.json`)
- [x] **D02** — Delete repo-root moved files: `scripts/eval-analyse.ts`, `eval-stamp.ts`, `eval-orchestrate.ts`, `eval-discover.ts`, `eval-gc.ts`, `eval-cleanup-vendored.ts`, `eval-cleanup-stale.ts`, `check-analyser-payload-parity.ts`, `test.py`, `eval-ensure-host.ts` (after retargeting) (`scripts/`)
- [x] **D03** — Update `evals/llm/_shared/vitest.config.ts` or other configs referencing root `scripts/` paths (`evals/vitest.config.ts`)
- [x] **D04** — Update `.cursor/agents/*.md` or workspace eval JSON if they hardcode root script paths (grep `scripts/eval-`) (`.cursor/agents/`)
- [x] **D05** — Optional: add `scripts/README.md` one paragraph explaining eval CLI moved to plugin (monorepo-only note) (`scripts/README.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `package.json` — All eval:* aliases retargeted to plugins/zoto-eval-system/; removed orphan eval:bootstrap-llm-code; eval:llm → evals/vitest.config.ts
- **created** `plugins/zoto-eval-system/scripts/eval-cleanup-sandboxes.ts` — Copied so eval:cleanup-sandboxes satisfies DoD grep (root scripts/eval-cleanup-sandboxes.ts retained per spec)
- **created** `scripts/README.md` — Monorepo-only pointer to plugin CLI paths
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
DoD verified: `pnpm run eval:list` exit 0; `pnpm run eval:stamp -- --help` exit 0;
`rg 'tsx scripts/eval-' package.json` zero hits; deleted root scripts absent.
`scripts/__tests__/` still imports deleted `../eval-*.ts` — left intact for subtask 06 relocation.

<!-- status:notes:end -->
