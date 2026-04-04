---
name: zoto-judge-plan
description: Independent assessment of a repository or Spec System engineering plans. Reviews quality, feasibility, completeness, risk, and structure without executing work. Use to audit a codebase or to assess a plan before running zoto-execute-plan.
---

# Spec System Judge Plan

Independent assessment workflow for the repository or individual engineering plans managed by the Spec System. Provides a structured review with scores, findings, and actionable recommendations. The judge should ideally run in a **fresh agent context** to avoid bias from prior sessions.

**Paths**: Resolve `{plansDir}` from `.spec-system/config.json` in the repository root (default `plans`). All report paths below are relative to the repository root unless noted.

## When to Use

- **No target specified**: Assess the entire repository — write report to `{plansDir}/assessment-repo-[yyyymmdd].md`
- **Plan path specified**: Assess a specific plan — write report to that plan's directory as `assessment-[feature-name]-[yyyymmdd].md`

## Assessment Dimensions

The judge evaluates plans (or the repo as a whole) across six dimensions, each scored 1–5:

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| **Completeness** | 25% | All requirements covered, no gaps in deliverables, definition of done is thorough |
| **Feasibility** | 20% | Subtasks are achievable, scope is realistic, no impossible demands |
| **Structure** | 20% | Dependencies are correct, phases are logical, no circular dependencies |
| **Specificity** | 15% | Subtasks have clear objectives; deliverables are concrete and verifiable |
| **Risk Awareness** | 10% | Edge cases considered, potential blockers identified, rollback possible |
| **Convention Compliance** | 10% | Aligns with **this repository's** established patterns (layout, tooling, naming, tests, docs) |

### Scoring

| Score | Label | Meaning |
|-------|-------|---------|
| 5 | Excellent | No issues found |
| 4 | Good | Minor improvements possible |
| 3 | Adequate | Some gaps but executable |
| 2 | Needs Work | Significant issues — revise before executing |
| 1 | Deficient | Major problems — plan should be reworked |

**Overall verdict** is the weighted average:

- **4.0+**: Approve — ready for execution (e.g. via the `zoto-execute-plan` skill)
- **3.0–3.9**: Conditional — address findings before executing
- **< 3.0**: Reject — plan needs rework via `/zoto-plan`

## Workflow: Repository Assessment (no target)

### Step 1: Explore Codebase

Spawn an `explore` subagent for a thorough survey:

- Directory structure (source, tests, scripts, configuration, documentation)
- Wiring and integration points (CI, hooks, editor/agent config if present)
- Test and quality tooling — which areas are covered and which are not
- Documentation state (README, contributing guides, architecture notes)

### Step 2: Perform Quality Checks (judge directly)

The assessing agent performs **read-only** checks suitable for the stack and repo — do **not** assume a dedicated audit subagent exists in the consuming project. Tailor checks to what the repository actually contains, for example:

- CI/CD workflow files: syntax, obvious misconfiguration, missing jobs for critical paths
- Test configuration and coverage gaps (by file area, not necessarily line percentages)
- Lint or formatter configuration presence and consistency with stated standards
- Dependency and security hygiene as visible from manifests (outdated pins, known risky patterns in config)
- Build or packaging scripts: error handling, idempotence where relevant
- Documentation drift (README vs actual commands, missing setup steps)

Document what was reviewed and any limitations (e.g. cannot run full CI locally).

### Step 3: Evaluate Dimensions (repo-adapted)

Apply the six dimensions to the repository as a whole:

- **Completeness**: Are components wired consistently? Orphaned configs or missing docs?
- **Feasibility**: Is the architecture sustainable for the stated goals?
- **Structure**: Are module boundaries and dependencies understandable?
- **Specificity**: Are responsibilities and interfaces clear where they matter?
- **Risk Awareness**: Untested paths, fragile integrations, operational gaps?
- **Convention Compliance**: Does the tree follow **this repo's** own conventions (not an external framework's unless the repo adopted it)?

### Step 4: Generate Report

Write `{plansDir}/assessment-repo-[yyyymmdd].md` with scores, findings, and recommendations.

---

## Workflow: Plan Assessment (with target)

### Step 1: Load Plan

1. Read the plan index file and all subtask files
2. Read any referenced design docs or specs (from the plan's overview or requirements)
3. Build a mental model of the full initiative

### Step 2: Explore Context

Spawn an `explore` subagent to verify:

- Referenced files and directories exist
- Existing patterns match what the plan assumes
- No obvious conflicts with current codebase state

### Step 3: Evaluate Each Dimension

For each dimension, produce:

- A score (1–5)
- Specific findings (what is strong, what is missing)
- Recommendations (actionable fixes if score < 5)

### Step 4: Validate Subtask Manifest

The Subtask Manifest in the index is the source of truth. For each row, verify:

- [ ] The listed file exists in the plan directory
- [ ] The subtask file's metadata (assigned subagent, dependencies) matches the manifest row
- [ ] The assigned subagent is appropriate for the work type (e.g. focused audit work vs. broad implementation)
- [ ] No subtask depends on a higher-numbered subtask ID
- [ ] Phase assignments are consistent with dependencies (a subtask's phase must be greater than all its dependencies' phases)

### Step 5: Check Subtask Quality

For each subtask file, verify:

- [ ] Clear, single-responsibility objective
- [ ] Deliverables checklist is concrete (not vague)
- [ ] Assigned subagent matches the work type
- [ ] Dependencies are correct (no missing or circular dependencies)
- [ ] Implementation notes give enough guidance for the executing agent
- [ ] Testing strategy is defined where applicable
- [ ] No subtask is doing too much (consider decomposition if there are many unrelated deliverables)

### Step 6: Dependency Graph Audit

- Verify the mermaid graph matches the Subtask Manifest (same edges and nodes)
- Check for missing edges (subtask B uses output of subtask A but does not declare a dependency)
- Check for unnecessary sequential constraints (work that could run in parallel but is over-serialized)
- Verify phase assignments align with dependency ordering
- Confirm subtask IDs respect dependency order (lower IDs do not depend on higher IDs)

### Step 7: Risk Analysis

Identify:

- **Blocking risks**: Single points of failure, hard external dependencies
- **Scope risks**: Subtasks that are too large or vaguely defined
- **Integration risks**: Phases where many subtasks merge and could conflict
- **Convention risks**: Deviations from **this repository's** established patterns

### Step 8: Generate Report

Write `assessment-[feature-name]-[yyyymmdd].md` into the plan's directory (under `{plansDir}/`).

## Report Format

### Report Location

| Mode | Output File |
|------|-------------|
| Repo assessment | `{plansDir}/assessment-repo-[yyyymmdd].md` |
| Plan assessment | `{plansDir}/[plan-directory]/assessment-[feature-name]-[yyyymmdd].md` |

### Template

```markdown
# [Repo Assessment | Plan Assessment: [Feature Name]]

**Target**: `[repository root | {plansDir}/[directory]/plan-[name]-[yyyymmdd].md]`
**Assessed**: [YYYY-MM-DD]
**Verdict**: Approve | Conditional | Reject

## Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | X/5 | [brief note] |
| Feasibility | X/5 | [brief note] |
| Structure | X/5 | [brief note] |
| Specificity | X/5 | [brief note] |
| Risk Awareness | X/5 | [brief note] |
| Convention Compliance | X/5 | [brief note] |
| **Overall** | **X.X/5** | **[verdict]** |

## Findings

### Strengths
- [What the plan or repo does well]

### Issues
| # | Severity | Subtask | Finding | Recommendation |
|---|----------|---------|---------|----------------|
| 1 | HIGH | 03 | Missing dependency on subtask 01 | Add dependency |
| 2 | MEDIUM | 05 | Vague deliverable "update tests" | Specify which test files |
| 3 | LOW | — | No rollback plan | Add rollback notes to index |

### Dependency Graph
- [Any issues with the graph]
- [Suggestions for parallelism improvements]

### Risk Summary
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [risk] | Low/Med/High | Low/Med/High | [suggestion] |

## Recommendation

[1–3 sentences: overall assessment and what to do next]
```

## What NOT to Do

- Do not modify plan files — the judge is read-only
- Do not execute any subtasks — assessment only
- Do not modify application or configuration source files under assessment
- Do not skip dimensions — score all six even if they appear fine
- Do not rubber-stamp — provide genuine critical analysis
