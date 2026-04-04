# zoto-execute

Execute an engineering plan with guided subagent coordination, progress tracking, and completion verification.

## Usage

```
/zoto-execute                                          - Execute the most recent plan in {plansDir}
/zoto-execute plans/20260403-feature-name              - Execute a specific plan by directory
/zoto-execute plans/20260403-feature-name/plan-feature-name-20260403.md  - Execute by index file path
/zoto-execute --resume                                  - Resume an interrupted execution
```

In examples above, `plans/` is the default `{plansDir}`; substitute your configured plans directory when it differs.

## Instructions

When this command is invoked, spawn a `zoto-spec-planner` subagent to execute an engineering plan. The planner uses the `zoto-execute-plan` skill to coordinate the work. Pass `$ARGUMENTS` through to the spawned agent.

### Argument handling

- **No arguments**: Find the most recently modified plan directory under `{plansDir}` and execute it
- **Directory path**: Execute the plan in the specified directory (finds the `plan-*.md` index file automatically)
- **File path**: Execute the plan using the specified index file directly
- **`--resume`**: Resume an interrupted execution — the planner reads the plan index to determine which subtasks are already complete and continues from the next incomplete one

### What happens

1. **Load and validate**: Read the plan index and validate the subtask manifest — confirm files exist, agent assignments match metadata, dependencies are ordered correctly
2. **Confirm**: Present the manifest as an execution summary (phases, subtask count, agent assignments per subtask) and wait for user approval
3. **Execute**: For each phase in order, spawn the **exact subagent listed in the manifest** for each subtask (up to four in parallel). Agent assignments are never overridden. Executing agents tick off each **Deliverables Checklist** and **Definition of Done** item in the subtask file as they complete it. Wait for the phase to finish before the next.
4. **Adversarial verification**: After each subtask completes, a **fresh `zoto-spec-judge` agent** (not the agent that did the work) independently verifies every Deliverables Checklist and Definition of Done item — confirms files exist, checks compile or validity, sets authoritative checklist state (ticking confirmed items, unticking unverified ones), returns Verified / Partial / Failed. Judge runs as a background subagent.
5. **Final verification**: After all subtasks are verified: run the project's test suite, check linter errors on modified files, and run an overall quality pass
6. **Execution report**: Write a persistent report to the plan directory as `execution-report-[feature-name]-[yyyymmdd].md` with per-subtask results, verification outcomes, test and lint status, and files modified
7. **Review**: Present the execution report and ask for user approval
8. **Complete**: After user approval, mark the plan status as **Completed**

### Execution safeguards

| Safeguard | Behaviour |
|-----------|-----------|
| **Manifest-driven dispatch** | Subagent for each subtask comes from the manifest — never overridden |
| **Adversarial verification** | Each subtask's Deliverables Checklist and Definition of Done verified by a fresh `zoto-spec-judge` agent that did not execute the work |
| **Dependency enforcement** | No subtask starts before its dependencies are complete |
| **Failure handling** | On failure or Failed verification, stop and ask: retry, skip, or abort |
| **Parallel limit** | Maximum four concurrent subagents per batch |
| **No global tests mid-execution** | Targeted tests per subtask where appropriate; full suite deferred to final verification |
| **Progress persistence** | Plan index manifest updated after each subtask — supports `--resume` |
| **User gates** | Approval before starting and before marking complete |
| **Durable execution report** | Written under the plan directory as an audit trail |

### Execution report location

```
{plansDir}/20260403-feature-name/
├── plan-feature-name-20260403.md
├── subtask-01-...
└── execution-report-feature-name-20260403.md
```

## Related

- `zoto-spec-planner` agent — creates and executes plans
- `zoto-spec-judge` agent — adversarial verification and quality gate
- `zoto-execute-plan` skill — execution workflow, dependency management, verification steps
- `/zoto-plan` — create a plan
- `/zoto-judge` — assess a plan before execution
