# Subtask 06 — spec-system-live-status — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 06 |
| feature | spec-system-live-status |
| assigned_agent | crux-software-engineer |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-06T08:15:45.535Z |
| last_heartbeat | 2026-05-06T08:16:54.225Z |
| completed_at | 2026-05-06T08:16:54.225Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` — add a new section `### Status File Ownership` immediately after the existing **Step 3: Execute Subtasks** block. Required content: (`plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md`)
- [x] **D02** — Modify Step 3 of `zoto-execute-spec/SKILL.md` so the "Provide each subagent with" bullet list adds a new bullet: `Status file pair (paths from the prompt prefix from subtask 04). Subagent must own these per the Status File Ownership section.` (`plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md`)
- [x] **D03** — Modify Step 4 (Adversarial Verification) of `zoto-execute-spec/SKILL.md`: (`plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md`)
- [x] **D04** — `plugins/zoto-spec-system/agents/zoto-spec-executor.md` — append a paragraph under **Subagent Coordination → Delegation Guidelines** restating: "Every spawned subagent owns its `.status.yml` + `.status.md` pair. The executor never writes to a subtask's `.status.yml` after spawning (the aggregator only reads); the subagent's own writes are the truth." Same wording added under `## Critical Rules → During Execution`. (`plugins/zoto-spec-system/agents/zoto-spec-executor.md`)
- [x] **D05** — `plugins/zoto-spec-system/agents/zoto-spec-judge.md` — add a paragraph under Mode 1 (Adversarial Verification) describing the `extra.judge` write and the round-trip helper invocation. (`plugins/zoto-spec-system/agents/zoto-spec-judge.md`)
- [x] **D06** — `plugins/zoto-spec-system/commands/zoto-spec-execute.md` — extend the **Execution safeguards** table with a new row: `| Status pair ownership | Each spawned subagent owns its .status.md + .status.yml; aggregator only reads |`. (`plugins/zoto-spec-system/commands/zoto-spec-execute.md`)
- [x] **D07** — `plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts` — add a new sub-command `heartbeat`: (`plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts`)
- [x] **D08** — Extend `spec-status-roundtrip.test.ts` from subtask 05: (`plugins/zoto-spec-system/scripts/spec-status-roundtrip.test.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` — Status File Ownership; heartbeat checklist guidance
- **modified** `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` — Step 3 status pair bullet
- **modified** `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` — Step 4 judge verdict + heartbeat nuance
- **modified** `plugins/zoto-spec-system/agents/zoto-spec-executor.md` — Delegation + Critical Rules ownership
- **modified** `plugins/zoto-spec-system/agents/zoto-spec-judge.md` — Mode 1 extra.judge + round-trip + heartbeat
- **modified** `plugins/zoto-spec-system/commands/zoto-spec-execute.md` — Execution safeguards row
- **modified** `plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts` — heartbeat verified compliant
- **modified** `plugins/zoto-spec-system/scripts/spec-status-roundtrip.test.ts` — heartbeat tests + atomic tmp assertions
- **modified** `plugins/zoto-spec-system/docs/status-schema.md` — Atomic write contract incl. heartbeat
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
