# Subtask 04 — spec-system-live-status — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 04 |
| feature | spec-system-live-status |
| assigned_agent | crux-software-engineer |
| model | composer-2-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T08:14:47.514Z |
| last_heartbeat | 2026-05-06T08:17:15.949Z |
| completed_at | 2026-05-06T08:17:15.949Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-spec-system/agents/zoto-spec-executor.md` — new section `## Live Configuration` (between `## Load Configuration` and `## Your Expertise`) that: (`plugins/zoto-spec-system/agents/zoto-spec-executor.md`)
- [x] **D02** — `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` — extend the **Configuration** section table with the new keys (`subagents.default.tokenBudget`, `aggregator.pollIntervalMs`, `aggregator.debounceMs`) and add a new sub-section `### Live Reload` that: (`plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md`)
- [x] **D03** — `plugins/zoto-spec-system/commands/zoto-spec-execute.md` — extend the **Execution safeguards** table with the row `| Live config reload | Token-budget and aggregator-cadence keys take effect on the next spawn — no executor restart required |`. Add a one-line note under the table that other keys (specsDir, unitOfWork, etc.) require a fresh invocation. (`plugins/zoto-spec-system/commands/zoto-spec-execute.md`)
- [x] **D04** — `plugins/zoto-spec-system/src/spawn-prompt.ts` — pure function that builds the prompt prefix: (`plugins/zoto-spec-system/src/spawn-prompt.ts`)
- [x] **D05** — `plugins/zoto-spec-system/src/spawn-prompt.test.ts` — vitest: (`plugins/zoto-spec-system/src/spawn-prompt.test.ts`)
- [x] **D06** — `plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts` — `tsx` CLI used by the executor LLM per spawn. Args: `--role <generator|executor|judge|subtask> --status-yml <path> --status-md <path>`. Behaviour: reads the repo root from `process.cwd()`, calls `loadConfig`, calls `resolveSubagentBudget(cfg, role)`, calls `buildSpawnPrefix({ role, tokenBudget, model, statusYmlPath, statusMdPath })`, and prints the resolved prefix to stdout. Exit 0 on success; non-zero with a structured `{ error, code }` JSON line on stderr if `loadConfig` throws (e.g. `ConfigValidationError`). The executor LLM treats a non-zero exit as "fall back to last known prefix and emit a `kind: 'config_reload_failed'` event in the spec-root `status.yml` via the next aggregator tick". (`plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts`)
- [x] **D07** — `plugins/zoto-spec-system/scripts/spec-spawn-prefix.test.ts` — vitest: (`plugins/zoto-spec-system/scripts/spec-spawn-prefix.test.ts`)
- [x] **D08** — **Legacy spec compatibility**: document in the agent / skill that if `<specDir>/status/` does not exist, the executor logs a one-line warning (`"status/ directory absent — running legacy spawn path"`), skips the `spec-aggregator --watch` background, and skips the `spec-spawn-prefix` shell-out (spawned subagents do not receive status-file paths in the prompt prefix). Subtask 08 ships an integration test covering this path. The agent doc must call this out explicitly so future maintainers don't regress legacy specs. (`plugins/zoto-spec-system/agents/zoto-spec-executor.md`)
- [x] **D09** — `plugins/zoto-spec-system/docs/config-schema.md` — append a new section `## Live reload` summarising the no-restart contract. The section MUST include the canonical contract phrase verbatim: **Token budget changes apply to the next spawned subagent without restarting the executor.** (Full prose lives in subtask 09's docs sweep — this subtask adds the bare minimum so subtask 04's tests and subtask 09's grep DoD can find the phrase.) (`plugins/zoto-spec-system/docs/config-schema.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-spec-system/agents/zoto-spec-executor.md` — Live
- **modified** `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` — Config
- **modified** `plugins/zoto-spec-system/commands/zoto-spec-execute.md` — Execution
- **modified** `plugins/zoto-spec-system/docs/config-schema.md` — Live
- **modified** `plugins/zoto-spec-system/scripts/spec-spawn-prefix.test.ts` — CLI
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
