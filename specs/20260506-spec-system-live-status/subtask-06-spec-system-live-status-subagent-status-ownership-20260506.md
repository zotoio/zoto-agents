# Subtask: Spawned Subagents Own Their Status Pair

## Metadata
- **Subtask ID**: 06
- **Feature**: spec-system-live-status
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 02, 05
- **Created**: 20260506

## Objective

Update the `zoto-execute-spec` skill (and the `zoto-spec-executor` agent) so every spawned subtask subagent **owns** its paired `.status.md` + `.status.yml` files: writes a heartbeat at start, ticks checklist items as work completes, records artifacts and errors, and finalizes with a terminal `state` value. The judge subagent uses the same files to record adversarial-verification outcomes after the subtask completes.

## Deliverables Checklist

### Skill / agent updates (text-only — runtime is the prompt prefix from subtask 04 + the helper from subtask 05)
- [ ] `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` — add a new section `### Status File Ownership` immediately after the existing **Step 3: Execute Subtasks** block. Required content:
  - Each spawned subagent receives the **prompt prefix** from subtask 04, which lists the absolute paths to its paired `.status.md` and `.status.yml`. The subagent **owns** these files for the duration of execution.
  - **Heartbeat protocol**: at start, write `state: in_progress`, set `started_at` to now, set `last_heartbeat` to now. After every checklist tick or artifact write, update `last_heartbeat`. On completion, set `completed_at` and finalise `state` (`completed | blocked | failed`).
  - **Checklist updates**: ticking is performed by editing the `.status.yml` (`checklist[].done = true`, optionally `checklist[].evidence_path = "<file path>"`) and re-running `spec-status-roundtrip md-from-yml` to refresh the `.status.md`. Agents are explicitly told **not** to edit the markdown directly during execution — yml is authoritative.
  - **Artifacts**: every file the subagent creates / modifies / deletes is recorded in `artifacts[]` with `kind: created | modified | deleted` and a short `note`.
  - **Errors and blockers**: structured errors land in `errors[]` with `severity: info | warn | error`. A subagent that cannot proceed (e.g. external dependency unavailable) sets `state: blocked`, records the reason as a `severity: error` entry, and exits — the aggregator promotes the entry into the spec-root `blockers[]`.
  - **Completion contract**: a subagent must not report Verified / Done unless `state: completed` AND every `checklist[].done` is true.
- [ ] Modify Step 3 of `zoto-execute-spec/SKILL.md` so the "Provide each subagent with" bullet list adds a new bullet: `Status file pair (paths from the prompt prefix from subtask 04). Subagent must own these per the Status File Ownership section.`
- [ ] Modify Step 4 (Adversarial Verification) of `zoto-execute-spec/SKILL.md`:
  - The judge reads the subtask's `.status.yml` and the subtask file itself. It validates each `checklist[].done = true` against the actual filesystem state.
  - The judge writes its verdict back into the **same** `.status.yml` under a new `judge` field (subtask 02's schema's `extra` block accepts this). Specifically: `extra.judge = { verdict: "verified" | "partial" | "failed", at: <iso>, notes: <string> }`. The judge also re-renders the `.status.md` via the round-trip helper.
  - Subtask file checklist ticks (the file in the spec directory, not the status pair) remain authoritative for spec-level rollup but the live truth during execution is the `.status.yml`.
- [ ] `plugins/zoto-spec-system/agents/zoto-spec-executor.md` — append a paragraph under **Subagent Coordination → Delegation Guidelines** restating: "Every spawned subagent owns its `.status.yml` + `.status.md` pair. The executor never writes to a subtask's `.status.yml` after spawning (the aggregator only reads); the subagent's own writes are the truth." Same wording added under `## Critical Rules → During Execution`.
- [ ] `plugins/zoto-spec-system/agents/zoto-spec-judge.md` — add a paragraph under Mode 1 (Adversarial Verification) describing the `extra.judge` write and the round-trip helper invocation.
- [ ] `plugins/zoto-spec-system/commands/zoto-spec-execute.md` — extend the **Execution safeguards** table with a new row: `| Status pair ownership | Each spawned subagent owns its .status.md + .status.yml; aggregator only reads |`.

### Helper extension
- [ ] `plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts` — add a new sub-command `heartbeat`:
  - `spec-status-roundtrip heartbeat --in <path>.status.yml [--state <state>] [--tick <checklistId>] [--artifact <path>:<kind>:<note>] [--error <severity>:<message>]`
  - Updates `last_heartbeat`, optionally updates `state`, optionally toggles a checklist item by ID, optionally appends to `artifacts[]` / `errors[]`, validates against `subtask-status.schema.json`, then re-renders the `.status.md`
  - Returns non-zero on validation failure
  - Designed to be called from inside subagent prompts (the prompt prefix references the helper path so the subagent knows how to invoke it)
- [ ] Extend `spec-status-roundtrip.test.ts` from subtask 05:
  - Heartbeat sub-command updates `last_heartbeat` and `state`
  - Heartbeat sub-command refuses to set `state: completed` if any checklist item is still `done: false` (returns non-zero, prints actionable message)
  - Heartbeat sub-command rejects an unknown checklist ID
  - **Atomic-write contract**: every helper sub-command that mutates `.status.yml` or `.status.md` writes via `<path>.tmp` then `rename` — assert that no `.tmp` files remain after a successful run and that a partial write (simulated by killing the process between `tmp` and `rename`) leaves the original target file untouched. Document the contract in `plugins/zoto-spec-system/docs/status-schema.md` (subtask 02 owns the file; this subtask appends the rule).

## Definition of Done
- [ ] All three text files (skill, executor agent, judge agent) document the ownership contract with the same wording (no drift)
- [ ] `spec-status-roundtrip heartbeat` works end-to-end against a fixture
- [ ] All vitest tests pass: `pnpm --filter @zoto-agents/zoto-spec-system test scripts/spec-status-roundtrip.test.ts`
- [ ] No linter errors in modified files
- [ ] `rg "owns its" plugins/zoto-spec-system` finds the ownership phrase in skill, executor agent, and judge agent (consistent wording check)

## Implementation Notes

- The heartbeat sub-command is the recommended way for spawned subagents to update their status — it enforces validation. Subagents *may* edit `.status.yml` directly with their file tools, but the prompt prefix instructs them to use the helper for safety.
- The judge writing `extra.judge` is intentional: the schema's root is `additionalProperties: false`, but the `extra` field is `additionalProperties: true`, giving the judge a typed escape hatch without bumping the schema version.
- Do not introduce new dependencies in this subtask — `yaml`, `ajv`, `ajv-formats` are already in the lockfile after subtask 03 / 05.
- Keep the skill changes surgical: this subtask is text-heavy. Subtask 07 implements the aggregator that reads these files; do not anticipate aggregator concerns here.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Run only the helper's expanded vitest file
- Defer integration / cross-subtask tests to subtask 08

## Execution Notes
[To be filled by executing agent]

### Agent Session Info
- Agent: crux-software-engineer
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
