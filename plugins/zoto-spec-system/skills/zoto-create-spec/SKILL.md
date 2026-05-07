---
name: zoto-create-spec
description: Guided workflow for creating engineering specs. Gathers requirements, explores the codebase, proposes a spec structure, and generates spec files under the configured specs directory. Use when planning a new feature, refactor, or multi-step initiative before implementation.
---

# Spec System Create Spec

Guided workflow for creating structured engineering specs in your project.

## Configuration

Read `.zoto/spec-system/config.yml` for repository settings (the only supported path; if missing, abort with *"Run `/z-spec-init` first."*):

- **`specsDir`** — directory for spec files (default: `specs`). Used as `{specsDir}` throughout this skill.
- **`unitOfWork`** — term for work items in user-facing messages (default: `spec`). Use this term when referring to units of work in prompts and summaries shown to the user.

If the config file is missing, use defaults for both fields.

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

### Step 5: Assign Subagents
Assign based on work type:

| Work Type | Recommended Subagent |
|-----------|---------------------|
| Implementation | generalPurpose |
| Exploration | explore |
| Command execution | shell |

If your environment enables optional memory-extension agents, you may also assign memory-related work to those agents when appropriate; otherwise keep assignments to the three rows above.

### Step 6: Create Spec Files

After dependencies and agents are determined, create the spec directory and files:

1. **Create directory**: `{specsDir}/[yyyymmdd]-[feature-name]/`
2. **Write index file**: `spec-[feature-name]-[yyyymmdd].md` with status `Draft`, overview, key decisions, requirements, Subtask Manifest table, **mandatory** Subtask Dependency Graph (mermaid), execution order by phase, and Definition of Done checklist. The graph is required — the aggregator auto-colors its nodes during execution based on each subtask's `state` (green for `completed`, amber for `in_progress`, red for `blocked`/`failed`, grey for `pending`). For nodes to colour correctly, every label must contain the subtask number as a leading two-digit prefix (`S01[01: <name>]`) or via a `subtask-NN` substring (`A[subtask-01]`). Do not author `classDef`/`class` lines inside the fence — the aggregator manages a `%% spec-system:classes:begin` / `%% spec-system:classes:end` block on every tick.
3. **Write subtask files**: One per subtask, following the subtask template from the `zoto-spec-generator` agent. Each file's Metadata section must include the assigned subagent and dependency list matching the index manifest
4. **Step 6.4 — Scaffold status pair per subtask**: After writing the index and subtask files, run `pnpm --filter @zoto-agents/zoto-spec-system run spec-status-roundtrip -- scaffold --spec-dir {specsDir}/<spec>` to generate one paired `.status.md` plus `.status.yml` per subtask under `status/`. Each new `.status.yml` uses `state: pending`, omits `started_at`, sets `errors[]` and `artifacts[]` to empty, and builds `checklist[]` from that subtask file's **Deliverables Checklist** with stable ids `D01`, `D02`, … in deliverable order.

### Step 7: Review and Finalize

Present the complete spec to the user for review:

- **Feature**: name
- **Subtasks**: count
- **Phases**: count
- **Subtask Manifest**: table of IDs, files, subagents, dependencies, phases

Wait for user approval before proceeding to the automatic judge review.

### Step 8: Automatic Judge Review

After user approval in Step 7:

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
