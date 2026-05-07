---
name: zoto-spec-execute
description: Execute an engineering spec with guided subagent coordination, progress tracking, and completion verification.
---

# zoto-spec-execute

Execute an engineering spec with guided subagent coordination, progress tracking, and completion verification.

## Usage

```
/zoto-spec-execute                                          - Execute the most recent spec in {specsDir}
/zoto-spec-execute specs/20260403-feature-name              - Execute a specific spec by directory
/zoto-spec-execute specs/20260403-feature-name/spec-feature-name-20260403.md  - Execute by index file path
/zoto-spec-execute --resume                                  - Resume an interrupted execution
```

In examples above, `specs/` is the default `{specsDir}`; substitute your configured specs directory when it differs.

## Instructions

When this command is invoked, spawn a `zoto-spec-executor` subagent to execute an engineering spec. The executor uses the `zoto-execute-spec` skill to coordinate the work. Pass `$ARGUMENTS` through to the spawned agent.

### Argument handling

- **No arguments**: Find the most recently modified spec directory under `{specsDir}` and execute it
- **Directory path**: Execute the spec in the specified directory (finds the `spec-*.md` index file automatically)
- **File path**: Execute the spec using the specified index file directly
- **`--resume`**: Resume an interrupted execution — the executor reads the spec index to determine which subtasks are already complete and continues from the next incomplete one

### What happens

1. **Load and validate**: Read the spec index and validate the subtask manifest — confirm files exist, agent assignments match metadata, dependencies are ordered correctly
2. **Confirm**: Present the manifest as an execution summary (phases, subtask count, agent assignments per subtask) and wait for user approval
3. **Execute**: For each phase in order, spawn the **exact subagent listed in the manifest** for each subtask (up to `spec.parallelLimit`, default eight, in parallel). Prefer `composer-2` through `spec.preferredModel` when supported. Agent assignments are never overridden. Executing agents tick off each **Deliverables Checklist** and **Definition of Done** item in the subtask file as they complete it. Use slot-filling scheduling: start the next ready subtask as soon as a slot opens.
4. **Adversarial verification**: Immediately after each subtask completes, a **fresh `zoto-spec-judge` agent** (not the agent that did the work) independently verifies every Deliverables Checklist and Definition of Done item — confirms files exist, checks compile or validity, sets authoritative checklist state (ticking confirmed items, unticking unverified ones), returns Verified / Partial / Failed. Judge runs as a background subagent while ready execution work continues.
5. **Final verification**: After all subtasks are verified: run the project's test suite, check linter errors on modified files, and run an overall quality pass
6. **Execution report**: Write a persistent report to the spec directory as `execution-report-[feature-name]-[yyyymmdd].md` with per-subtask results, verification outcomes, test and lint status, and files modified
7. **Review**: Present the execution report and ask for user approval
8. **Complete**: After user approval, mark the spec status as **Completed**

### Execution safeguards

| Safeguard | Behaviour |
|-----------|-----------|
| **Manifest-driven dispatch** | Subagent for each subtask comes from the manifest — never overridden |
| **Adversarial verification** | Each subtask's Deliverables Checklist and Definition of Done verified by a fresh `zoto-spec-judge` agent that did not execute the work |
| **Dependency enforcement** | No subtask starts before its dependencies are complete |
| **Failure handling** | On failure or Failed verification, stop and ask: retry, skip, or abort |
| **Parallel limit** | Maximum `spec.parallelLimit` execution subagents, with slot-filling inside phases |
| **Performance optimization** | Critical-path ordering, balanced subtask size, immediate focused verification, targeted tests, and `composer-2` preference |
| **No global tests mid-execution** | Targeted tests per subtask where appropriate; full suite deferred to final verification |
| **Progress persistence** | Spec index manifest updated after each subtask — supports `--resume` |
| **User gates** | Approval before starting and before marking complete |
| **Durable execution report** | Written under the spec directory as an audit trail |

### Execution report location

```
{specsDir}/20260403-feature-name/
├── spec-feature-name-20260403.md
├── subtask-01-...
└── execution-report-feature-name-20260403.md
```

## Related

- `zoto-spec-executor` agent — executes specs with subagent coordination
- `zoto-spec-generator` agent — creates specs
- `zoto-spec-judge` agent — adversarial verification and quality gate
- `zoto-execute-spec` skill — execution workflow, dependency management, verification steps
- `/zoto-spec-create` — create a spec
- `/zoto-spec-judge` — assess a spec before execution
