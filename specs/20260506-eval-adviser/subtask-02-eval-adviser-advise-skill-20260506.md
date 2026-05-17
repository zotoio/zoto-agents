# Subtask: Implement `zoto-advise-evals` Skill

## Metadata
- **Subtask ID**: 02
- **Feature**: Eval Adviser
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 01
- **Created**: 20260506

## Objective

Create the `zoto-advise-evals` skill at `plugins/zoto-eval-system/skills/zoto-advise-evals/SKILL.md`. This is the core analysis engine — it scans the codebase for eval coverage gaps across five dimensions, produces a structured gap report, and returns actionable recommendations via `needs_user_input`.

## Deliverables Checklist
- [x] Skill file: `plugins/zoto-eval-system/skills/zoto-advise-evals/SKILL.md`
- [x] Skill follows frontmatter conventions (`name`, `description`)
- [x] Skill MUST NOT call `askQuestion` — uses `needs_user_input` pattern
- [x] Skill defines the five-dimension gap analysis workflow
- [x] Skill specifies structured gap report output format
- [x] Skill specifies `needs_user_input` blocks for interactive breakpoints
- [x] Skill defines handoff protocol to `/zoto-eval-create` and `/zoto-eval-update`

## Definition of Done
- [x] `SKILL.md` exists at the correct path with valid frontmatter
- [x] Skill is under 500 lines (per plugin conventions) — 413 lines
- [x] All five gap dimensions have explicit detection steps
- [x] `needs_user_input` schema matches `rules/zoto-eval-system.mdc` contract
- [x] No `askQuestion` calls anywhere in the skill
- [x] Handoff actions are concrete (specific command + arguments)

## Implementation Notes

### Skill Structure (follow existing patterns)

Reference `plugins/zoto-eval-system/skills/zoto-judge-evals/SKILL.md` as the closest structural model:
- Configuration section (reads `.zoto/eval-system/config.yml`)
- When to Use section
- Multi-step Workflow section
- Structured output format
- `needs_user_input` schema for breakpoints
- What NOT to Do section

### Workflow Steps

The skill should implement these steps:

1. **Load configuration** — Read `.zoto/eval-system/config.yml` for `evalsDir`, `skillsRoots[]`, `discoveryTargets[]`. If missing, `needs_user_input` to run `/zoto-eval-configure`.

2. **Discover targets** — Walk `skillsRoots[]` for skills, scan plugin directories for commands/agents/hooks. Build a target inventory.

3. **Assess coverage per dimension** — For each target, check eval coverage across the five gap dimensions defined in the architecture design (subtask 01). Score each dimension.

4. **Produce gap report** — Structured YAML-like output with per-target, per-dimension findings:
   ```yaml
   adviser_report:
     analysed_at: <ISO 8601>
     scope: <full | plugin:name | skill:name>
     dimensions:
       trigger_phrases:
         covered: N
         gaps: N
         targets: [...]
       schema_validation:
         covered: N
         gaps: N
         targets: [...]
       # ... etc
     recommendations:
       - target: <id>
         dimension: <name>
         severity: critical | warning | info
         action: create | update | strengthen
         detail: <description>
   ```

5. **Return `needs_user_input`** — At two breakpoints:
   - After initial scan: present summary, ask which dimensions to drill into
   - After drill-down: present specific recommendations, ask which to action

### Key Constraints

- The skill does NOT modify any files — it only reads and analyses
- The skill does NOT re-run eval cases — it analyses coverage of the eval suite itself
- Pre-collected `scope` arrives from the command (full scan vs targeted)
- When the user selects actions, the skill produces concrete handoff instructions for the command to route to `/zoto-eval-create` or `/zoto-eval-update`

### Files to Study
- `plugins/zoto-eval-system/skills/zoto-judge-evals/SKILL.md` — structural model
- `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md` — interactive pattern model
- `plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md` — discovery and drift detection patterns
- Design document from subtask 01

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Validate SKILL.md frontmatter manually
- Verify skill name matches directory name (`zoto-advise-evals`)
- Check line count is under 500
- Defer full validation to subtask 06

## Execution Notes

### Agent Session Info
- Agent: crux-software-engineer
- Started: 2026-05-06T21:08Z
- Completed: 2026-05-06T21:10Z

### Work Log
1. Read subtask spec, architecture design document, and three structural model skills (judge, help, update).
2. Created directory structure: `plugins/zoto-eval-system/skills/zoto-advise-evals/` with `evals/` subdirectory.
3. Wrote `SKILL.md` (413 lines) aligned with the architecture design document — all five gap dimensions, two `needs_user_input` breakpoints, deterministic handoff protocol, structured `adviser_report` schema.
4. Verified: frontmatter valid, no `askQuestion` calls, all five dimensions present, line count under 500.

### Blockers Encountered
None.

### Files Modified
- `plugins/zoto-eval-system/skills/zoto-advise-evals/SKILL.md` (created, 413 lines)
- `plugins/zoto-eval-system/skills/zoto-advise-evals/evals/` (created, empty — evals.json deferred to subtask 05)
