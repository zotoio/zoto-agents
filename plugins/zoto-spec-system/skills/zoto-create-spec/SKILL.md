---
name: zoto-create-spec
description: Guided workflow for creating engineering specs. Gathers requirements, explores the codebase, proposes a spec structure, and generates spec files under the configured specs directory. Use when planning a new feature, refactor, or multi-step initiative before implementation.
---

# Spec System Create Spec

Guided workflow for creating structured engineering specs in your project.

## Configuration

Read `.zoto-spec-system/config.json` for repository settings:

- **`specsDir`** — directory for spec files (default: `specs`). Used as `{specsDir}` throughout this skill.
- **`unitOfWork`** — term for work items in user-facing messages (default: `spec`). Use this term when referring to units of work in prompts and summaries shown to the user.
- **`spec.parallelLimit`** — maximum concurrent execution subagents (default: `4`). Use this to shape phases.
- **`spec.preferredModel`** — preferred model for spawned agents when supported (default: `composer-2`).

If the config file is missing, use defaults for all fields.

## When to Use

Use this skill when the user wants to plan a new feature, refactor, or multi-step initiative **before** writing code. The output is a set of spec files under `{specsDir}/` that can later be executed via the `zoto-execute-spec` skill.

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

### Step 5: Optimize for End-to-End Execution Time

Before writing files, apply these top five optimization rules:

1. **Critical path first**: Keep the dependency graph as shallow as correctness allows. Add dependencies only for required outputs, migrations, generated artifacts, or shared contracts.
2. **Right-size subtasks**: Make each subtask independently executable by one agent with one ownership area, a small changed-file set, 2-5 concrete deliverables, and an explicit targeted test. Split broad mixed-domain work; merge tiny coordination-only tasks.
3. **Fill parallel capacity**: Pack independent subtasks into each phase up to `spec.parallelLimit`. Avoid long single-agent phases unless the work is inherently sequential.
4. **Prefer `composer-2`**: Use `spec.preferredModel` or agent frontmatter to prefer `composer-2` for creation, execution, and judging when supported. Record fallback choices in Key Decisions.
5. **Reduce context and test fan-out**: Give each subtask exact paths, interfaces, and targeted checks. Defer global test suites and broad quality sweeps to final verification.

### Step 6: Assign Subagents
Assign based on work type:

| Work Type | Recommended Subagent |
|-----------|---------------------|
| Implementation | generalPurpose |
| Exploration | explore |
| Command execution | shell |

If your environment enables optional memory-extension agents, you may also assign memory-related work to those agents when appropriate; otherwise keep assignments to the three rows above.

### Step 7: Create Spec Files

After dependencies and agents are determined, create the spec directory and files:

1. **Create directory**: `{specsDir}/[yyyymmdd]-[feature-name]/`
2. **Write index file**: `spec-[feature-name]-[yyyymmdd].md` with status `Draft`, overview, key decisions, requirements, Subtask Manifest table, dependency graph (mermaid), execution order by phase, and Definition of Done checklist
3. **Write subtask files**: One per subtask, following the subtask template from the `zoto-spec-generator` agent. Each file's Metadata section must include the assigned subagent and dependency list matching the index manifest

### Step 8: Review and Finalize

Present the complete spec to the user for review:

- **Feature**: name
- **Subtasks**: count
- **Phases**: count
- **Subtask Manifest**: table of IDs, files, subagents, dependencies, phases

Wait for user approval before proceeding to the automatic judge review.

### Step 9: Automatic Judge Review

After user approval in Step 8:

1. Spawn a **fresh `zoto-spec-judge` subagent** to independently assess the spec using the `zoto-judge-spec` skill
2. The judge produces an assessment file in the spec directory
3. Present both the spec summary AND the judge's verdict/findings to the user
4. Based on the verdict:
   - **Approve** (4.0+): Update the spec status from `Draft` to `Ready for Review`
   - **Conditional** (3.0–3.9): Flag the issues and ask the user whether to revise or proceed
   - **Reject** (< 3.0): Flag the issues and ask the user whether to revise or proceed anyway
5. Only move the spec status to `Ready for Review` after the judge completes and the user confirms

## Conventions
- Directory: `{specsDir}/[yyyymmdd]-[feature-name]/`
- Index: `spec-[feature-name]-[yyyymmdd].md`
- Subtask: `subtask-[NN]-[feature]-[subtask-name]-[yyyymmdd].md`
- Assessment (from `zoto-judge-spec`): `zoto-judge-assessment-[feature-name]-[yyyymmdd].md`
- Execution report (from `zoto-execute-spec`): `zoto-execute-report-[feature-name]-[yyyymmdd].md`
- Dates: YYYYMMDD format
- IDs: zero-padded two-digit

## What NOT to Do
- Do not create or modify code files
- Do not create files outside `{specsDir}/`
- Do not execute the spec
- Do not create knowledge or memory files
- Do not skip user confirmation
