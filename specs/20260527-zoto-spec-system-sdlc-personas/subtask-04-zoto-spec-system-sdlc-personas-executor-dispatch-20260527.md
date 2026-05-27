---
persona: zoto-backend-engineer
---

# Subtask: Executor dispatch — read `persona:` and route via `spec-spawn-prefix`

## Metadata
- **Subtask ID**: 04
- **Feature**: zoto-spec-system-sdlc-personas
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 01
- **Created**: 20260527

## Objective

Update `zoto-spec-executor` and the `zoto-execute-spec` skill so each subtask
is dispatched to its persona agent via `spec-spawn-prefix --role persona-<name>`.
A subtask without `persona:` frontmatter or with a non-Tier-1 value MUST cause
the executor to **fail loudly** with a clear error naming the offending file.

## Deliverables Checklist

- [ ] **D01** — Updated `plugins/zoto-spec-system/agents/zoto-spec-executor.md`:
      - In **Live Configuration**, replace the `--role` enum reference with
        the new persona-aware contract (legacy roles + `persona-*` regex).
        Cite the `TIER1_PERSONAS` constant introduced in subtask 01.
      - In **Operating Modes → Execution → Step 3 (spawn subagent)**, replace
        the manifest-Subagent-column source-of-truth with: read `persona:`
        from each subtask's YAML frontmatter; **validate against
        `templates/schema/subtask-spec.schema.json`** via the shared
        `validateSubtaskFrontmatter` helper from subtask 01 D10; spawn that
        persona agent; compute `--role persona-<persona>`; pass through
        `spec-spawn-prefix`.
      - Add a **Hard error** subsection: missing, schema-invalid, or
        non-Tier-1 `persona:` frontmatter aborts execution before any spawn,
        with an error message of the form
        `"Subtask <file> failed subtask-spec.schema.json validation: <error>. Run /z-spec-create or /z-spec-judge to fix."`
      - Update the **Subagent Coordination** "Available subagents" table to
        list the 10 persona agents alongside the existing `generalPurpose`,
        `explore`, `shell` rows — including their phase-skill pointers.
      - Update the **Re-spawn protocol** to re-spawn the same persona on
        retry, not the legacy `generalPurpose`.
      - Update the legacy-compatibility note: subtasks without frontmatter
        are no longer accepted (breaking change in `1.0.0` — the Spec
        System stability milestone).
- [ ] **D02** — Updated `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md`:
      - **Step 1 (Load Spec and Validate Manifest)** gains a new check:
        every subtask file MUST have YAML frontmatter that validates against
        `templates/schema/subtask-spec.schema.json` (the canonical contract
        from subtask 01 D09). Validation failure aborts before spawning
        anything.
      - **Step 3 (Execute Subtasks)** is updated to spawn the persona agent
        named in the subtask's frontmatter and to call
        `spec-spawn-prefix --role persona-<persona>`. The Subagent column
        in the manifest becomes informational; `persona:` is the source of
        truth.
      - **Step 4 (Adversarial Verification)** re-spawn rule reads the same
        `persona:` value (not the manifest column) when retrying.
- [ ] **D03** — If the executor spawn logic lives in TypeScript anywhere
      under `plugins/zoto-spec-system/src/` (e.g. `aggregator.ts`,
      `spawn-prompt.ts`, or a future executor helper), update it to read
      `persona:` from the subtask file via the new shared parser introduced
      in subtask 01 (D04 / D08). Otherwise, the LLM-driven executor agent
      handles the read directly per the prose contract in D01/D02.
- [ ] **D04** — Add a regression check to
      `plugins/zoto-spec-system/scripts/spec-status-roundtrip.ts validate`
      (or the executor entry point if that's where validation lives) that
      cross-checks every `persona:` in subtasks against `TIER1_PERSONAS`
      and exits non-zero with the offending filename if any are missing or
      unknown. Reuse the parser/predicate from subtask 01.
- [ ] **D05** — Update or extend any unit/integration tests that hardcoded
      the legacy `--role subtask` flow (e.g. `no-restart-token-budget.test.ts`,
      `spec-spawn-prefix.test.ts`) to also exercise the new `persona-*`
      path. Do **not** add the dispatch *fixture* integration test here —
      that lives in subtask 08.
- [ ] **D06** — Confirm that when a subtask has `persona: zoto-backend-engineer`
      and config defines `subagents.persona-zoto-backend-engineer.tokenBudget = 175000`,
      the executor's spawn prompt contains `Token budget: 175000.`. Capture
      this as a focused unit/integration test in
      `plugins/zoto-spec-system/src/` (or `tests/integration/`) — keep it
      narrow; the broader fixture-driven dispatch test stays in subtask 08.

## Definition of Done
- [ ] Executor agent file references the persona contract; legacy enum is gone.
- [ ] `zoto-execute-spec` skill validates `persona:` before spawning.
- [ ] Missing/invalid `persona:` aborts execution with a clear, file-named error.
- [ ] Subagent Coordination table lists 10 personas + their phase skills.
- [ ] At least one focused test proves persona budget resolution end-to-end.
- [ ] No linter errors in modified files.

## Implementation Notes

- The executor is an LLM agent — most of the dispatch behaviour is prose,
  not code. Be explicit and concrete in the agent file so the LLM doesn't
  improvise.
- Use the shared `TIER1_PERSONAS` / `isPersonaRole` exports from
  `src/personas.ts` (introduced in subtask 01) wherever code-level
  validation is needed.
- The "Available subagents" table grows from 3 rows to 13 rows. Group it
  by phase (Workflow / Discovery / Design / Implementation / Quality /
  Operations / Generic) to keep it scannable.
- If you need to add a YAML-frontmatter parser to executor-side TS, reuse
  the one introduced in subtask 01 (D04). Do not duplicate parsing logic.
- The `--role persona-<persona>` mapping is mechanical: `persona:` value
  → prepend `persona-`. Document this verbatim in the executor agent file.
- Coordinate with subtask 06 (judge validation): the judge surfaces
  missing `persona:` as a *finding* before execution; the executor enforces
  it as a *hard error* at run time. Both must use the same canonical
  persona list and predicate.

## Testing Strategy

**Do NOT trigger global test suites during parallel execution.** Instead:

- Run `pnpm --filter @zoto-agents/zoto-spec-system test` for unit + targeted
  integration tests scoped to spawn-prefix and config resolution.
- Add a small new test for the persona-budget-resolution flow as part of
  D06.
- Defer the repo-wide `pnpm test`, the dispatch fixture integration test,
  and the per-persona smoke tests to subtasks 08 and 09.

## Execution Notes
_(to be filled by the executing agent)_

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
