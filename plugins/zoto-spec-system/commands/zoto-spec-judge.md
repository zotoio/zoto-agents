---
name: zoto-spec-judge
description: Independently assess the repository or a specific engineering spec for quality, feasibility, and completeness. For spec assessments, offers to apply recommended fixes directly to spec files.
---

# zoto-spec-judge

Independently assess the repository or a specific engineering spec for quality, feasibility, and completeness. For spec assessments, offers to apply recommended fixes directly to the spec files after producing the assessment.

## Usage

```
/zoto-spec-judge                                          - Assess the entire repository
/zoto-spec-judge specs/20260403-feature-name              - Assess a specific spec by directory
/zoto-spec-judge specs/20260403-feature-name/spec-feature-name-20260403.md  - Assess by index file path
```

In examples above, `specs/` is the default `{specsDir}`; substitute your configured specs directory when it differs.

## Instructions

When this command is invoked, spawn a **fresh `zoto-spec-judge` subagent** to perform an independent assessment. The judge uses the `zoto-judge-spec` skill for the assessment workflow. Pass `$ARGUMENTS` through to the spawned agent. Using a dedicated judge agent in a fresh context avoids bias from prior sessions.

### Argument handling

- **No arguments**: Assess the entire repository — audit codebase health, structure, test coverage, documentation, and convention compliance. Write the report to `{specsDir}/assessment-repo-[yyyymmdd].md`
- **Directory path**: Assess the spec in the specified directory (finds the `spec-*.md` index file automatically). Write the report to that spec's directory under `{specsDir}/`
- **File path**: Assess the spec using the specified index file directly. Write the report to that spec's directory

### Mode 1: Repository assessment (no arguments)

1. Explores the full codebase structure (agents, skills, commands, hooks, tests, scripts, config)
2. Evaluates six dimensions adapted for repo health:
   - **Completeness**: Are agents, skills, and commands properly wired? Orphaned or missing files?
   - **Feasibility**: Is the architecture sustainable? Scaling concerns?
   - **Structure**: Directory conventions, clear dependencies?
   - **Specificity**: Concrete responsibilities and definitions?
   - **Risk awareness**: Security, untested paths, error handling?
   - **Convention compliance**: Frontmatter, naming, testing patterns?
3. Produces a report at `{specsDir}/assessment-repo-[yyyymmdd].md`

### Mode 2: Spec assessment (with path argument)

1. Loads the spec index and all subtask files
2. Explores the codebase to verify assumptions in the spec
3. Evaluates the same six dimensions in a spec context
4. Audits the dependency graph for correctness
5. Checks each subtask for quality (objectives, deliverables, agent assignments)
6. Performs risk analysis
7. Produces a report in the spec's directory as `assessment-[feature-name]-[yyyymmdd].md`
8. **Offers to apply fixes** — presents actionable findings and asks the user whether to apply the recommended changes directly to the spec files (index, subtasks, dependency graph). Only modifies spec files, never application source code.

### Verdicts and follow-up

| Verdict | Score | Action |
|---------|-------|--------|
| **Approve** | 4.0+ | Repo is healthy / spec is ready for `/zoto-spec-execute` |
| **Conditional** | 3.0–3.9 | Address the listed findings before proceeding |
| **Reject** | < 3.0 | Significant issues — needs rework |

After producing a **spec assessment**, the judge presents actionable findings and offers to apply fixes. If accepted, it modifies spec files (index, subtask files, dependency graph) to address the identified issues — fixing dependencies, clarifying vague deliverables, adding missing sections, or splitting oversized subtasks. The assessment report is updated to note which fixes were applied.

## Assessment report locations

**Repo assessment** (no arguments):

```
{specsDir}/
└── assessment-repo-20260403.md
```

**Spec assessment** (with spec path):

```
{specsDir}/20260403-feature-name/
├── spec-feature-name-20260403.md
├── assessment-feature-name-20260403.md
├── subtask-01-...
└── ...
```

## Related

- `zoto-spec-judge` agent — independent quality gate and adversarial verifier
- `zoto-spec-generator` agent — creates specs
- `zoto-spec-executor` agent — executes specs with subagent coordination
- `zoto-judge-spec` skill — assessment methodology and scoring rubric
- `/zoto-spec-create` — create a spec
- `/zoto-spec-execute` — execute a spec with guided coordination
