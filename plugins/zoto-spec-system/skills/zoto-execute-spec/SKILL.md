---
name: zoto-execute-spec
description: Executes an engineering spec by spawning subagents for each subtask, tracking progress, adversarial verification, and final quality checks. Use when a spec exists under the configured specs directory and is ready for execution.
---

# Spec System Execute Spec

Executes an existing engineering spec by coordinating subagents, tracking progress, and verifying completion. This workflow is repo-agnostic beyond `.zoto-spec-system/config.json` and the spec files themselves.

## Configuration

Before execution, read `.zoto-spec-system/config.json` from the repository root (a missing file or `{}` is valid — defaults apply). Use these values in user-facing text and limits:

| Key | Default | Use |
|-----|---------|-----|
| `specsDir` | `specs` | Root directory for spec folders; substitute `{specsDir}` in paths below |
| `unitOfWork` | `spec` | Singular term in messages (e.g. spec scope, nudges) |
| `spec.parallelLimit` | `4` | Maximum concurrent subagents during a phase |
| `spec.preferredModel` | `composer-2` | Preferred model for spawned agents when supported |

## When to Use

Use this skill when a spec exists under `{specsDir}/` with status **Ready for Review** (or the user explicitly requests execution of a **Draft** spec). The spec should follow the format produced by the `zoto-create-spec` skill or an equivalent manifest layout.

## Workflow

### Step 1: Load Spec and Validate Manifest

1. Read the spec index file (`spec-[feature-name]-[yyyymmdd].md`) under the relevant `{specsDir}/[feature-directory]/`
2. Parse the **Subtask Manifest** table — source of truth for subtask-to-agent mapping and dependency ordering
3. For each row in the manifest:
   - Verify the subtask file exists at the listed path
   - Read the subtask file and confirm its Metadata section matches the manifest (same subagent, same dependencies)
   - Confirm no subtask depends on a higher-numbered subtask ID
4. Build the execution order from the manifest's Phase column
5. If any inconsistencies are found (missing files, mismatched agents, dependency violations), report them and stop

### Step 2: Confirm Execution

Present the manifest as the execution summary and wait for user approval. Use `unitOfWork` from config where it fits the repository's vocabulary (e.g. describing the spec or scope):

```
## Execution Summary

- **Spec**: [feature name]
- **Subtasks**: [total count]
- **Phases**: [phase count]
- **Parallel limit**: [spec.parallelLimit from config, default 4]
- **Preferred model**: [spec.preferredModel from config, default composer-2]

### Subtask Manifest
| ID | File | Subagent | Dependencies | Phase |
|----|------|----------|-------------|-------|
| 01 | subtask-01-...-yyyymmdd.md | generalPurpose | — | 1 |
| 02 | subtask-02-...-yyyymmdd.md | generalPurpose | — | 1 |
| 03 | subtask-03-...-yyyymmdd.md | generalPurpose | 01, 02 | 2 |
| 04 | subtask-04-...-yyyymmdd.md | generalPurpose | 03 | 3 |

Proceed with execution? [Yes / No]
```

### Step 2b: Record Start Time

Immediately after the user confirms execution, capture the start timestamp by running `date -u '+%Y-%m-%d %H:%M:%S UTC'`. Store this value for the execution report.

### Step 3: Execute Subtasks

Read `spec.parallelLimit` from `.zoto-spec-system/config.json` (default **4**). Use it as the maximum number of execution subagents running at once for a phase. Read `spec.preferredModel` (default **composer-2**) and prefer it when spawning agents if the environment supports model selection.

For each phase in order:

1. **Spawn the subagent listed in the manifest** for each subtask in the current phase (up to `spec.parallelLimit` in parallel). The subagent type comes from the manifest's Subagent column — do not override or reassign. The manifest is the single source of truth for agent assignment
2. **Provide each subagent** with:
   - The full subtask file content (read from the File column path)
   - Any relevant context from the spec index (key decisions, requirements)
   - **Checklist tracking instructions**: As the agent works, it MUST update the subtask file in place:
     - Tick each **Deliverables Checklist** item (`- [ ]` → `- [x]`) immediately after completing that deliverable
     - Tick each **Definition of Done** item (`- [ ]` → `- [x]`) as the corresponding quality gate is satisfied (e.g. code implemented, tests added, no linter errors)
     - Both sections must be fully checked before the agent reports completion
   - Instructions to record files modified and any blockers in Execution Notes
3. **Use slot-filling scheduling**: If the phase contains more ready subtasks than `spec.parallelLimit`, start the next ready subtask as soon as an execution slot opens. Do not wait for fixed batches that leave slots idle.
4. **Wait for all phase subtasks** to complete and verify before starting the next dependent phase

If a phase has more subtasks than `spec.parallelLimit`, keep a ready queue ordered by critical-path importance: prerequisites for later phases first, then lower-risk independent work.

### Step 4: Adversarial Verification (per subtask) — mandatory

After each subtask's assigned agent completes, immediately spawn a **fresh `zoto-spec-judge` subagent** to adversarially verify the work. This is a dedicated judge agent — it did not execute the subtask and has no bias toward the implementation. Run the judge as a **background subagent** so verification can proceed while ready execution work continues.

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
2. **Run tests**: Run the **project's test suite** (use the repository's standard test command, or what the spec index documents). Prefer a `shell` subagent if your environment routes heavy commands that way
3. **Linter**: **Check for linter errors on modified files** (all files touched during execution)
4. **Quality audit**: Spawn a **fresh `zoto-spec-judge` subagent** for a concise quality audit of changed areas (correctness, consistency with project conventions, obvious security or reliability issues)
5. **Documentation**: **Update documentation if needed** when behavior, public APIs, or user-facing flows changed — no dedicated doc agent is assumed

### Step 6: Write Execution Report

Write a persistent execution report in the spec directory as `execution-report-[feature-name]-[yyyymmdd].md`. This is a durable record of the execution — not only a chat summary.

Before writing the report, capture the end timestamp by running `date -u '+%Y-%m-%d %H:%M:%S UTC'`. Calculate the duration from the start timestamp recorded in Step 2b.

```markdown
# Execution Report: [Feature Name]

**Spec**: `spec-[feature-name]-[yyyymmdd].md`
**Started**: [YYYY-MM-DD HH:MM:SS UTC]
**Completed**: [YYYY-MM-DD HH:MM:SS UTC]
**Duration**: [Xm Ys]
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
Execution report written to: {specsDir}/[directory]/execution-report-[feature-name]-[yyyymmdd].md

All [N] subtasks verified. Tests: PASS. Linter: CLEAN.

Approve and mark spec as Completed? [Yes / No]
```

Replace `{specsDir}` with the configured value (e.g. `specs`).

### Step 8: Mark Complete

After user approval:

1. Update the spec index status to `Completed`
2. Fill in final execution notes in the index
3. Report completion

## Execution Rules

### Dependency Management

- Never start a subtask before all its listed dependencies are complete
- If a dependency fails, stop and report — do not continue with dependent subtasks
- Independent subtasks within a phase may run in parallel

### Parallel Limits

- Maximum concurrent subagents = `spec.parallelLimit` from `.zoto-spec-system/config.json` (default **4**)
- If a phase has more subtasks than that limit, use slot-filling scheduling instead of fixed batches
- Prefer `spec.preferredModel` (default **composer-2**) where model selection is available; record unsupported fallbacks in the report

### End-to-End Performance Rules

Use these top five rules to reduce wall-clock execution time while preserving quality:

1. **Critical path first**: Launch prerequisite subtasks before optional or isolated work when ready work exceeds available slots.
2. **Right-size before launch**: Pause for spec adjustment if a subtask is too broad, too vague, or likely to dominate the phase.
3. **Slot-fill execution**: Keep execution slots full up to `spec.parallelLimit`; avoid idle waits inside a phase.
4. **Immediate focused judging**: Start verification as soon as each subtask completes and verify only the stated deliverables, touched files, and targeted checks.
5. **Measure and report**: Capture per-subtask execution and verification timing plus bottlenecks in the execution report.

### Error Handling

- If a subtask fails, update its status in the index and report to the user
- Ask the user how to proceed: retry, skip, or abort the spec
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

1. Read the spec index to determine which subtasks are complete
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
- Do not create auxiliary knowledge-base or memory artifacts from spec execution unless the repository explicitly enables a memory extension for this workflow
