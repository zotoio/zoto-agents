# Subtask 05 — spec-system-live-status — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 05 |
| feature | spec-system-live-status |
| assigned_agent | crux-software-engineer |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T08:03:30.917Z |
| last_heartbeat | 2026-05-06T08:05:12.606Z |
| completed_at | 2026-05-06T08:05:12.606Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts` — `tsx` CLI with sub-commands: (`plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts`)
- [x] **D02** — `plugins/zoto-spec-system/scripts/spec-status-roundtrip.test.ts` — vitest unit tests: (`plugins/zoto-spec-system/scripts/spec-status-roundtrip.test.ts`)
- [x] **D03** — `plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md` — extend Step 6 (Create Spec Files) to add a sub-step: (`plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md`)
- [x] **D04** — `plugins/zoto-spec-system/agents/zoto-spec-generator.md` — update the Spec Directory Structure block to show the new layout: (`plugins/zoto-spec-system/agents/zoto-spec-generator.md`)
- [x] **D05** — `plugins/zoto-spec-system/commands/zoto-spec-create.md` — append the row about scaffolding `status/`. (`plugins/zoto-spec-system/commands/zoto-spec-create.md`)
- [x] **D06** — `plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json` — add **one new eval case** (do not delete existing cases): (`plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts` — tsx CLI md-from-yml yml-from-md scaffold validate heartbeat
- **created** `plugins/zoto-spec-system/scripts/spec-status-roundtrip.test.ts` — vitest coverage for round-trip and scaffold
- **modified** `plugins/zoto-spec-system/package.json` — yaml ajv deps and spec-status-roundtrip script
- **modified** `plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md` — Step 6.4 scaffold status pairs
- **modified** `plugins/zoto-spec-system/agents/zoto-spec-generator.md` — spec dir layout status/ and aggregator callout
- **modified** `plugins/zoto-spec-system/commands/zoto-spec-create.md` — document status/ scaffolding in command
- **modified** `plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json` — new eval case for status scaffolding
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
