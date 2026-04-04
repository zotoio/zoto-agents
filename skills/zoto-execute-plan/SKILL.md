---
name: zoto-execute-plan
description: Executes an engineering plan by spawning subagents for each subtask, tracking progress, adversarial verification, and final quality checks. Use when a plan exists under the configured plans directory and is ready for execution.
---

# Spec System Execute Plan

Executes an existing engineering plan by coordinating subagents, tracking progress, and verifying completion. This workflow is repo-agnostic beyond `.spec-system/config.json` and the plan files themselves.

## Configuration

Before execution, read `.spec-system/config.json` from the repository root (a missing file or `{}` is valid — defaults apply). Use these values in user-facing text and limits:

| Key | Default | Use |
|-----|---------|-----|
| `plansDir` | `plans` | Root directory for plan folders; substitute `{plansDir}` in paths below |
| `unitOfWork` | `spec` | Singular term in messages (e.g. plan scope, nudges) |
| `plan.parallelLimit` | `4` | Maximum concurrent subagents during a phase |

## When to Use

Use this skill when a plan exists under `{plansDir}/` with status **Ready for Review** (or the user explicitly requests execution of a **Draft** plan). The plan should follow the format produced by the `zoto-create-plan` skill or an equivalent manifest layout.

## Workflow

### Step 1: Load Plan and Validate Manifest

1. Read the plan index file (`plan-[feature-name]-[yyyymmdd].md`) under the relevant `{plansDir}/[feature-directory]/`
2. Parse the **Subtask Manifest** table — source of truth for subtask-to-agent mapping and dependency ordering
3. For each row in the manifest:
   - Verify the subtask file exists at the listed path
   - Read the subtask file and confirm its Metadata section matches the manifest (same subagent, same dependencies)
   - Confirm no subtask depends on a higher-numbered subtask ID
4. Build the execution order from the manifest's Phase column
5. If any inconsistencies are found (missing files, mismatched agents, dependency violations), report them and stop

### Step 2: Confirm Execution

Present the manifest as the execution summary and wait for user approval. Use `unitOfWork` from config where it fits the repository's vocabulary (e.g. describing the plan or scope):

```
## Execution Summary

- **Plan**: [feature name]
- **Subtasks**: [total count]
- **Phases**: [phase count]
- **Parallel limit**: [plan.parallelLimit from config, default 4]

### Subtask Manifest
| ID | File | Subagent | Dependencies | Phase |
|----|------|----------|-------------|-------|
| 01 | subtask-01-...-yyyymmdd.md | generalPurpose | — | 1 |
| 02 | subtask-02-...-yyyymmdd.md | generalPurpose | — | 1 |
| 03 | subtask-03-...-yyyymmdd.md | generalPurpose | 01, 02 | 2 |
| 04 | subtask-04-...-yyyymmdd.md | generalPurpose | 03 | 3 |

Proceed with execution? [Yes / No]
```

### Step 3: Execute Subtasks

Read `plan.parallelLimit` from `.spec-system/config.json` (default **4**). Use it as the maximum number of subagents running at once for a phase.

For each phase in order:

1. **Spawn the subagent listed in the manifest** for each subtask in the current phase (up to `plan.parallelLimit` in parallel). The subagent type comes from the manifest's Subagent column — do not override or reassign. The manifest is the single source of truth for agent assignment
2. **Provide each subagent** with:
   - The full subtask file content (read from the File column path)
   - Any relevant context from the plan index (key decisions, requirements)
   - **Checklist tracking instructions**: As the agent works, it MUST update the subtask file in place:
     - Tick each **Deliverables Checklist** item (`- [ ]` → `- [x]`) immediately after completing that deliverable
     - Tick each **Definition of Done** item (`- [ ]` → `- [x]`) as the corresponding quality gate is satisfied (e.g. code implemented, tests added, no linter errors)
     - Both sections must be fully checked before the agent reports completion
   - Instructions to record files modified and any blockers in Execution Notes
3. **Wait for all phase subtasks** to complete before starting the next phase

If a phase has more subtasks than `plan.parallelLimit`, batch them (N at a time per config) and wait for each batch before the next.

### Step 4: Adversarial Verification (per subtask) — mandatory

After each subtask's assigned agent completes, spawn a **fresh `zoto-spec-judge` subagent** to adversarially verify the work. This is a dedicated judge agent — it did not execute the subtask and has no bias toward the implementation. Run the judge as a **background subagent** so verification can proceed while the next phase's subtasks are being prepared.

For each completed subtask, the adversarial verifier must:

1. **Read the subtask file** — both the **Deliverables Checklist** and the **Definition of Done**
2. **Inspect every deliverable**: For each Deliverables Checklist item, verify the deliverable actually exists and is correct:
   - Files listed as created → verify they exist and have expected content
   - Code changes → verify they build or typecheck as appropriate for the project; **check for linter errors on modified files**
   - Tests added → verify test files exist and are syntactically valid
   - Config changes → verify structured config is valid and references resolve
3. **Inspect every Definition of Done item**: For each quality gate, verify it is genuinely satisfied:
   - "Code implemented" → confirm the code exists and is functional
   - "Tests added" → confirm tests exist and cover the stated functionality
   - "No linter errors" → run linter checks on modified files and confirm clean
   - Any other DoD items → verify against the actual project state
4. **Set checklist state**: Update the subtask file — tick (`- [x]`) items the verifier confirms are complete, untick (`- [ ]`) any items the executing agent marked done but the verifier cannot confirm. The judge's checklist state is authoritative.
5. **Flag failures**: If any item is missing, incomplete, or incorrect, leave it unchecked and add a note in the subtask's Execution Notes explaining what is wrong
6. **Report verdict**: Return one of:
   - **Verified** — all Deliverables Checklist AND Definition of Done items confirmed
   - **Partial** — some items incomplete (list which from both sections)
   - **Failed** — critical deliverables missing or DoD items unsatisfied

After adversarial verification:

- **Update the index manifest** Status column:
  - `Verified` → set status to `Done`
  - `Partial` → set status to `Partial` and report to user for decision (fix and re-verify, or accept)
  - `Failed` → set status to `Failed` and stop dependent subtasks
- Add verification notes to the Execution Notes section

**The adversarial verifier must be a `zoto-spec-judge` instance, not the agent that executed the subtask.** Independent validation is required for every subtask.

### Step 5: Final Verification

After all phases complete and all subtasks have been adversarially verified:

1. **Confirm all subtasks are `Done`**: Every row in the manifest must have status `Done`. If any are `Partial` or `Failed`, report and ask the user before proceeding
2. **Run tests**: Run the **project's test suite** (use the repository's standard test command, or what the plan index documents). Prefer a `shell` subagent if your environment routes heavy commands that way
3. **Linter**: **Check for linter errors on modified files** (all files touched during execution)
4. **Quality audit**: Spawn a **fresh `zoto-spec-judge` subagent** for a concise quality audit of changed areas (correctness, consistency with project conventions, obvious security or reliability issues)
5. **Documentation**: **Update documentation if needed** when behavior, public APIs, or user-facing flows changed — no dedicated doc agent is assumed

### Step 6: Write Execution Report

Write a persistent execution report in the plan directory as `execution-report-[feature-name]-[yyyymmdd].md`. This is a durable record of the execution — not only a chat summary.

```markdown
# Execution Report: [Feature Name]

**Plan**: `plan-[feature-name]-[yyyymmdd].md`
**Executed**: [YYYY-MM-DD]
**Status**: Completed | Completed with exceptions

## Summary

[1-3 sentence overview of what was accomplished]

## Subtask Results

| ID | Subtask | Subagent | Verification | Files Modified | Notes |
|----|---------|----------|-------------|----------------|-------|
| 01 | [name] | generalPurpose | Verified | [count] | [brief note] |
| 02 | [name] | generalPurpose | Verified | [count] | [brief note] |
| 03 | [name] | generalPurpose | Verified | [count] | [brief note] |

## Verification Results

### Adversarial Verification
- Subtasks verified: [N/N]
- Issues found during verification: [count]
- Issues resolved: [count]

### Test Suite
- Status: [PASS / FAIL]
- Tests run: [count]
- [details if failures]

### Linter
- Status: [CLEAN / N errors]
- [details if errors]

### Quality Audit
- Status: [PASS / WARN / FAIL]
- [findings if any]

### Documentation
- Status: [Updated / No changes needed / Skipped]
- [files updated if any]

## Files Modified (all subtasks combined)

[Deduplicated list of all files created or modified across all subtasks]

## Outstanding Items

- [Any items requiring manual follow-up]

## Lessons Learned

[Optional: blockers encountered, unexpected issues, process improvements]
```

### Step 7: Final Review

Present the execution report to the user for approval:

```
Execution report written to: {plansDir}/[directory]/execution-report-[feature-name]-[yyyymmdd].md

All [N] subtasks verified. Tests: PASS. Linter: CLEAN.

Approve and mark plan as Completed? [Yes / No]
```

Replace `{plansDir}` with the configured value (e.g. `plans`).

### Step 8: Mark Complete

After user approval:

1. Update the plan index status to `Completed`
2. Fill in final execution notes in the index
3. Report completion

## Execution Rules

### Dependency Management

- Never start a subtask before all its listed dependencies are complete
- If a dependency fails, stop and report — do not continue with dependent subtasks
- Independent subtasks within a phase may run in parallel

### Parallel Limits

- Maximum concurrent subagents = `plan.parallelLimit` from `.spec-system/config.json` (default **4**)
- If a phase has more subtasks than that limit, batch them and wait for each batch before the next

### Error Handling

- If a subtask fails, update its status in the index and report to the user
- Ask the user how to proceed: retry, skip, or abort the plan
- Never silently skip a failed subtask

### Progress Updates

- Update the index file after each subtask completes (not just at the end)
- Include: subtask status, files modified, any blockers, time taken
- Keep the user informed between phases

### Testing During Execution

- Individual subtasks should only run **targeted** tests on files they modified
- The **full project test suite** runs only during the final verification phase
- This reduces interference from parallel file modifications

## Resuming Execution

If execution is interrupted (e.g. session ends):

1. Read the plan index to determine which subtasks are complete
2. Identify the next incomplete subtask based on the dependency graph
3. Resume from that point — do not re-execute completed subtasks
4. Verify completed subtask deliverables still hold (files exist, no regressions)

## What NOT to Do

- Do not modify code files directly — only subagents modify code
- Do not skip the user confirmation step before starting execution
- Do not run the **full** project test suite during parallel subtask execution
- Do not mark a subtask complete if any Deliverables Checklist or Definition of Done item is unchecked
- Do not continue past a failed dependency without user approval
- Do not skip **adversarial verification** for any subtask
- Do not create auxiliary knowledge-base or memory artifacts from plan execution unless the repository explicitly enables a memory extension for this workflow
