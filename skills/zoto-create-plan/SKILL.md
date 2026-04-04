---
name: zoto-create-plan
description: Guided workflow for creating engineering plans. Gathers requirements, explores the codebase, proposes a plan structure, and generates plan files under the configured plans directory. Use when planning a new feature, refactor, or multi-step initiative before implementation.
---

# Spec System Create Plan

Guided workflow for creating structured engineering plans in your project.

## Configuration

Read `.spec-system/config.json` for repository settings:

- **`plansDir`** — directory for plan files (default: `plans`). Used as `{plansDir}` throughout this skill.
- **`unitOfWork`** — term for work items in user-facing messages (default: `spec`). Use this term when referring to units of work in prompts and summaries shown to the user.

If the config file is missing, use defaults for both fields.

## When to Use

Use this skill when the user wants to plan a new feature, refactor, or multi-step initiative **before** writing code. The output is a set of plan files under `{plansDir}/` that can later be executed via the `zoto-execute-plan` skill.

## Workflow

### Step 1: Gather Requirements
Ask the user clarifying questions to understand the scope. Ask one question at a time, up to 10 questions maximum.

### Step 2: Explore the Codebase
Spawn an `explore` subagent to identify relevant files, patterns, conflicts, conventions.

### Step 3: Propose Key Decisions
Present key architectural decisions for user confirmation.

### Step 4: Determine Dependencies and Sequencing

Before creating any files, build the dependency graph:

1. **Identify all subtasks** and their inputs/outputs
2. **Map dependencies**: If subtask B requires output from subtask A, B depends on A
3. **Assign IDs in dependency order**: Lower IDs never depend on higher IDs. If subtask A must finish before B, A gets a lower ID than B
4. **Group into phases**: Subtasks with no unresolved dependencies form a phase. Within a phase, tasks can run in parallel. A new phase starts when all prior-phase tasks are complete
5. **Validate**: No circular dependencies. Every dependency target exists. No subtask depends on a higher-numbered subtask

### Step 5: Assign Subagents
Assign based on work type:

| Work Type | Recommended Subagent |
|-----------|---------------------|
| Implementation | generalPurpose |
| Exploration | explore |
| Command execution | shell |

If your environment enables optional memory-extension agents, you may also assign memory-related work to those agents when appropriate; otherwise keep assignments to the three rows above.

### Step 6: Create Plan Files

After dependencies and agents are determined, create the plan directory and files:

1. **Create directory**: `{plansDir}/[yyyymmdd]-[feature-name]/`
2. **Write index file**: `plan-[feature-name]-[yyyymmdd].md` with status `Draft`, overview, key decisions, requirements, Subtask Manifest table, dependency graph (mermaid), execution order by phase, and Definition of Done checklist
3. **Write subtask files**: One per subtask, following the subtask template from the `zoto-spec-planner` agent. Each file's Metadata section must include the assigned subagent and dependency list matching the index manifest

### Step 7: Review and Finalize

Present the complete plan to the user for review:

- **Feature**: name
- **Subtasks**: count
- **Phases**: count
- **Subtask Manifest**: table of IDs, files, subagents, dependencies, phases

After user approval, update the plan status from `Draft` to `Ready for Review`. Independent quality review is handled later via `zoto-judge-plan` (producing an assessment file). Execution tracking uses `zoto-execute-plan` (producing an execution report).

## Conventions
- Directory: `{plansDir}/[yyyymmdd]-[feature-name]/`
- Index: `plan-[feature-name]-[yyyymmdd].md`
- Subtask: `subtask-[NN]-[feature]-[subtask-name]-[yyyymmdd].md`
- Assessment (from `zoto-judge-plan`): `zoto-judge-assessment-[feature-name]-[yyyymmdd].md`
- Execution report (from `zoto-execute-plan`): `zoto-execute-report-[feature-name]-[yyyymmdd].md`
- Dates: YYYYMMDD format
- IDs: zero-padded two-digit

## What NOT to Do
- Do not create or modify code files
- Do not create files outside `{plansDir}/`
- Do not execute the plan
- Do not create knowledge or memory files
- Do not skip user confirmation
