---
name: zoto-judge-spec
description: Independent assessment of a repository or Spec System engineering specs. Reviews quality, feasibility, completeness, risk, and structure. After producing a spec assessment, offers to apply recommended fixes directly to the spec files. Use to audit a codebase or to assess and improve a spec before running zoto-execute-spec.
---

# Spec System Judge Spec

Independent assessment workflow for the repository or individual engineering specs managed by the Spec System. Provides a structured review with scores, findings, and actionable recommendations. For spec assessments, offers to apply fixes directly to the spec files after producing the report. The judge should ideally run in a **fresh agent context** to avoid bias from prior sessions.

**Paths**: Resolve `{specsDir}` from `.zoto-spec-system/config.json` in the repository root (default `specs`). All report paths below are relative to the repository root unless noted.

## When to Use

- **No target specified**: Assess the entire repository — write report to `{specsDir}/assessment-repo-[yyyymmdd].md`
- **Spec path specified**: Assess a specific spec — write report to that spec's directory as `assessment-[feature-name]-[yyyymmdd].md`

## Assessment Dimensions

The judge evaluates specs (or the repo as a whole) across six dimensions, each scored 1–5:

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
| 1 | Deficient | Major problems — spec should be reworked |

**Overall verdict** is the weighted average:

- **4.0+**: Approve — ready for execution (e.g. via the `zoto-execute-spec` skill)
- **3.0–3.9**: Conditional — address findings before executing
- **< 3.0**: Reject — spec needs rework via `/zoto-spec-create`

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

Write `{specsDir}/assessment-repo-[yyyymmdd].md` with scores, findings, and recommendations.

---

## Workflow: Spec Assessment (with target)

### Step 1: Load Spec

1. Read the spec index file and all subtask files
2. Read any referenced design docs or specs (from the spec's overview or requirements)
3. Build a mental model of the full initiative

### Step 2: Explore Context

Spawn an `explore` subagent to verify:

- Referenced files and directories exist
- Existing patterns match what the spec assumes
- No obvious conflicts with current codebase state

### Step 3: Evaluate Each Dimension

For each dimension, produce:

- A score (1–5)
- Specific findings (what is strong, what is missing)
- Recommendations (actionable fixes if score < 5)

### Step 4: Validate Subtask Manifest

The Subtask Manifest in the index is the source of truth. For each row, verify:

- [ ] The listed file exists in the spec directory
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

Write `assessment-[feature-name]-[yyyymmdd].md` into the spec's directory (under `{specsDir}/`).

### Step 9: Offer to Apply Fixes

After generating the assessment report, present a summary of the verdict and actionable findings to the user, then **offer to apply the recommended fixes** directly to the spec files.

#### What to present

```
## Assessment Complete

**Verdict**: [Approve | Conditional | Reject] ([X.X/5])

### Actionable Findings ([N] issues)

| # | Severity | Subtask | Fix |
|---|----------|---------|-----|
| 1 | HIGH | 03 | Add missing dependency on subtask 01 |
| 2 | MEDIUM | 05 | Replace vague deliverable with specific test files |
| 3 | LOW | — | Add rollback plan to spec index |

Apply these fixes to the spec files? [Yes / No]
```

#### If user accepts — apply fixes

Work through each actionable finding and modify the spec files directly:

1. **Dependency fixes**: Update the Subtask Manifest table in the spec index (add/remove dependency columns), update the corresponding subtask file's Metadata dependencies, update the Mermaid dependency graph, and recompute phase assignments if dependencies changed
2. **Deliverable fixes**: Update vague deliverable items in subtask files with the specific, concrete versions from the recommendation
3. **Missing content**: Add missing sections (rollback plans, testing strategies, implementation notes) to the appropriate files
4. **Subtask scope fixes**: If a subtask is flagged as too large, split it into multiple subtask files — create new files, update the manifest, and adjust the dependency graph
5. **Manifest/metadata consistency**: Fix any mismatches between the spec index manifest and subtask file metadata
6. **Graph corrections**: Fix the Mermaid dependency graph to match the corrected manifest

After applying all fixes:

1. Update the assessment report to note which fixes were applied
2. Report a summary of changes to the user:
   ```
   Applied [N] fixes:
   - [spec-index.md]: Added dependency 01→03, updated phase assignments
   - [subtask-05.md]: Replaced vague deliverable with specific test file list
   - [spec-index.md]: Added rollback plan section

   The spec is now ready for /zoto-spec-execute.
   ```

#### If user declines

No changes are made. The assessment report stands as-is for the user to address manually.

#### Scope of fixes

The judge may modify **spec files only** (index, subtask files, dependency graph) — never application source code, configuration, or test files. Fixes are limited to what the assessment identified; the judge does not add new requirements or expand scope.

## Report Format

### Report Location

| Mode | Output File |
|------|-------------|
| Repo assessment | `{specsDir}/assessment-repo-[yyyymmdd].md` |
| Spec assessment | `{specsDir}/[spec-directory]/assessment-[feature-name]-[yyyymmdd].md` |

### Template

```markdown
# [Repo Assessment | Spec Assessment: [Feature Name]]

**Target**: `[repository root | {specsDir}/[directory]/spec-[name]-[yyyymmdd].md]`
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
- [What the spec or repo does well]

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

- Do not modify spec files **before** presenting the assessment — the assessment itself must be unbiased
- Do not apply fixes without explicit user approval
- Do not execute any subtasks — assessment and spec-level fixes only
- Do not modify application source code, configuration, or test files — only spec files (index, subtasks, dependency graph)
- Do not skip dimensions — score all six even if they appear fine
- Do not rubber-stamp — provide genuine critical analysis
- Do not expand scope when applying fixes — only address what the assessment identified
