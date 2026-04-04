---
name: zoto-judge
description: Independently assess the repository or a specific engineering plan for quality, feasibility, and completeness.
---

# zoto-judge

Independently assess the repository or a specific engineering plan for quality, feasibility, and completeness.

## Usage

```
/zoto-judge                                          - Assess the entire repository
/zoto-judge plans/20260403-feature-name              - Assess a specific plan by directory
/zoto-judge plans/20260403-feature-name/plan-feature-name-20260403.md  - Assess by index file path
```

In examples above, `plans/` is the default `{plansDir}`; substitute your configured plans directory when it differs.

## Instructions

When this command is invoked, spawn a **fresh `zoto-spec-judge` subagent** to perform an independent assessment. The judge uses the `zoto-judge-plan` skill for the assessment workflow. Pass `$ARGUMENTS` through to the spawned agent. Using a dedicated judge agent in a fresh context avoids bias from prior sessions.

### Argument handling

- **No arguments**: Assess the entire repository — audit codebase health, structure, test coverage, documentation, and convention compliance. Write the report to `{plansDir}/assessment-repo-[yyyymmdd].md`
- **Directory path**: Assess the plan in the specified directory (finds the `plan-*.md` index file automatically). Write the report to that plan's directory under `{plansDir}/`
- **File path**: Assess the plan using the specified index file directly. Write the report to that plan's directory

### Mode 1: Repository assessment (no arguments)

1. Explores the full codebase structure (agents, skills, commands, hooks, tests, scripts, config)
2. Evaluates six dimensions adapted for repo health:
   - **Completeness**: Are agents, skills, and commands properly wired? Orphaned or missing files?
   - **Feasibility**: Is the architecture sustainable? Scaling concerns?
   - **Structure**: Directory conventions, clear dependencies?
   - **Specificity**: Concrete responsibilities and definitions?
   - **Risk awareness**: Security, untested paths, error handling?
   - **Convention compliance**: Frontmatter, naming, testing patterns?
3. Produces a report at `{plansDir}/assessment-repo-[yyyymmdd].md`

### Mode 2: Plan assessment (with path argument)

1. Loads the plan index and all subtask files
2. Explores the codebase to verify assumptions in the plan
3. Evaluates the same six dimensions in a plan context
4. Audits the dependency graph for correctness
5. Checks each subtask for quality (objectives, deliverables, agent assignments)
6. Performs risk analysis
7. Produces a report in the plan's directory as `assessment-[feature-name]-[yyyymmdd].md`

### Verdicts

| Verdict | Score | Action |
|---------|-------|--------|
| **Approve** | 4.0+ | Repo is healthy / plan is ready for `/zoto-execute` |
| **Conditional** | 3.0–3.9 | Address the listed findings before proceeding |
| **Reject** | < 3.0 | Significant issues — needs rework |

## Assessment report locations

**Repo assessment** (no arguments):

```
{plansDir}/
└── assessment-repo-20260403.md
```

**Plan assessment** (with plan path):

```
{plansDir}/20260403-feature-name/
├── plan-feature-name-20260403.md
├── assessment-feature-name-20260403.md
├── subtask-01-...
└── ...
```

## Related

- `zoto-spec-judge` agent — independent quality gate and adversarial verifier
- `zoto-spec-planner` agent — creates and executes plans
- `zoto-judge-plan` skill — assessment methodology and scoring rubric
- `/zoto-plan` — create a plan
- `/zoto-execute` — execute a plan with guided coordination
