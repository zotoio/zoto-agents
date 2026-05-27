# Subtask 07 — spec-system-live-status — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 07 |
| feature | spec-system-live-status |
| assigned_agent | crux-software-engineer |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T08:39:07.167Z |
| last_heartbeat | 2026-05-06T08:55:42.000Z |
| completed_at | 2026-05-06T08:54:32.662Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-spec-system/src/aggregator.ts` — public surface: (`plugins/zoto-spec-system/src/aggregator.ts`)
- [x] **D02** — `plugins/zoto-spec-system/src/aggregator.test.ts` — vitest unit tests, all running against a temp-dir spec fixture: (`plugins/zoto-spec-system/src/aggregator.test.ts`)
- [x] **D03** — `plugins/zoto-spec-system/scripts/spec-aggregator.ts` — `tsx` CLI: (`plugins/zoto-spec-system/scripts/spec-aggregator.ts`)
- [x] **D04** — `plugins/zoto-spec-system/scripts/spec-aggregator.test.ts` — vitest: (`plugins/zoto-spec-system/scripts/spec-aggregator.test.ts`)
- [x] **D05** — `plugins/zoto-spec-system/package.json` — add the `bin` entry `"spec-aggregator": "scripts/spec-aggregator.ts"` so `pnpm --filter @zoto-agents/zoto-spec-system exec spec-aggregator ...` works. **Note**: no other plugin in this monorepo currently uses `bin`. Run a one-shot smoke check after `pnpm install` to confirm `pnpm --filter @zoto-agents/zoto-spec-system exec spec-aggregator --once --spec-dir <fixture>` resolves correctly. If it does not, fall back to invoking via `pnpm --filter @zoto-agents/zoto-spec-system exec tsx scripts/spec-aggregator.ts ...` and remove the `bin` field — document the chosen invocation pattern in `docs/aggregator.md`. (`plugins/zoto-spec-system/package.json`)
- [x] **D06** — `plugins/zoto-spec-system/agents/zoto-spec-executor.md` — extend `## Live Configuration` (added in subtask 04) with a new sub-section `### Aggregator Loop`: (`plugins/zoto-spec-system/agents/zoto-spec-executor.md`)
- [x] **D07** — `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` — add a new section `### Spec-Root Aggregation` immediately after the `### Status File Ownership` section from subtask 06: (`plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md`)
- [x] **D08** — `plugins/zoto-spec-system/commands/zoto-spec-execute.md` — extend the **Execution safeguards** table with a new row: `| Spec-root aggregation | Executor backgrounds spec-aggregator --watch for the spec's lifetime; rebuilds status.md + status.yml on every source change; --once / --validate-only modes available for resume / CI |`. (`plugins/zoto-spec-system/commands/zoto-spec-execute.md`)
- [x] **D09** — `plugins/zoto-spec-system/agents/zoto-spec-judge.md` — append a paragraph under Mode 1 (Adversarial Verification) noting that the judge **may** invoke `spec-aggregator --validate-only --spec-dir <spec>` as a final pass to ensure no source went out of sync during execution. (`plugins/zoto-spec-system/agents/zoto-spec-judge.md`)
- [x] **D10** — `plugins/zoto-spec-system/docs/aggregator.md` — single canonical doc covering: (`plugins/zoto-spec-system/docs/aggregator.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-spec-system/src/aggregator.ts` — aggregator core
- **created** `plugins/zoto-spec-system/src/aggregator.test.ts` — vitest unit tests
- **created** `plugins/zoto-spec-system/scripts/spec-aggregator.ts` — standalone CLI
- **created** `plugins/zoto-spec-system/scripts/spec-aggregator.test.ts` — CLI tests
- **modified** `plugins/zoto-spec-system/templates/schema/config.schema.json` — resolve merge conflict markers (valid JSON)
- **created** `plugins/zoto-spec-system/docs/aggregator.md` — canonical aggregator doc + tsx invocation pattern (with documented bin fallback)
- **modified** `plugins/zoto-spec-system/package.json` — add `bin` entry `spec-aggregator` -> `scripts/spec-aggregator.ts` (D05)
- **modified** `plugins/zoto-spec-system/agents/zoto-spec-executor.md` — Aggregator Loop subsection
- **modified** `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` — Spec-Root Aggregation section
- **modified** `plugins/zoto-spec-system/commands/zoto-spec-execute.md` — execution safeguards row
- **modified** `plugins/zoto-spec-system/agents/zoto-spec-judge.md` — optional validate-only pass
- **modified** `plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts` — merge conflict resolution (stage :3)
- **modified** `plugins/zoto-spec-system/docs/status-schema.md` — merge conflict resolution
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Resume completed: D01–D04 reconciled (existing on-disk implementation matches contract); D05–D10 verified/finalised.
- `pnpm --filter @zoto-agents/zoto-spec-system test src/aggregator.test.ts scripts/spec-aggregator.test.ts` -> 15/15 pass (11 unit + 4 CLI).
- `pnpm --filter @zoto-agents/zoto-spec-system validate` -> 50/50 checks pass.
- Validate-only smoke check via tsx against this spec fixture exits 0 (9 valid sources, 0 invalid).
- `pnpm --filter @zoto-agents/zoto-spec-system exec spec-aggregator ...` does NOT resolve (no `pnpm install` since `bin` add) — tsx fallback documented in `docs/aggregator.md`.
- rg "spec-aggregator" plugins/zoto-spec-system returns hits in executor agent, judge agent, skill, command, and docs (DoD satisfied).
- During reconcile: aggregator core needed `forceAudit` included in `wouldRebuild` to make the two audit-event tests pass; that fix was already on disk after the first re-run, but the first vitest pass failed because of an earlier in-flight state. No second in-place edit required.
- Config migration directive honoured: tests use `<tmpdir>/.zoto/spec-system/config.yml`, docs reference `.zoto/spec-system/config.yml` only.

<!-- status:notes:end -->
