# Subtask: Implement `zoto-eval-adviser` Agent Definition

## Metadata
- **Subtask ID**: 03
- **Feature**: Eval Adviser
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 01
- **Created**: 20260506

## Objective

Create the `zoto-eval-adviser` agent definition at `plugins/zoto-eval-system/agents/zoto-eval-adviser.md`. This agent is spawned by the `/zoto-eval-advise` command and uses the `zoto-advise-evals` skill to interactively assess eval coverage gaps.

## Deliverables Checklist
- [x] Agent file: `plugins/zoto-eval-system/agents/zoto-eval-adviser.md`
- [x] Agent follows frontmatter conventions (`name`, `description`)
- [x] Agent specifies skills it uses (`zoto-advise-evals`)
- [x] Agent specifies operating mode (Advise Mode)
- [x] Agent includes critical rules (no askQuestion, needs_user_input pattern)
- [x] Agent references the correct command (`/zoto-eval-advise`)

## Definition of Done
- [x] Agent markdown exists at the correct path with valid frontmatter
- [x] Agent description accurately reflects its purpose
- [x] Agent explicitly states it does NOT call `askQuestion`
- [x] Agent explicitly states it uses `needs_user_input` for interactive breakpoints
- [x] Agent references `zoto-advise-evals` as its primary skill
- [x] Pattern matches existing agents (e.g., `zoto-eval-judge.md`)

## Implementation Notes

### Agent Structure

Follow the pattern established by `plugins/zoto-eval-system/agents/zoto-eval-judge.md`:

```markdown
---
name: zoto-eval-adviser
description: <concise description>
---

You are the eval-system adviser. [Role description]

## Skills You Use
- `zoto-advise-evals` — the primary skill.
- Cross-references to handoff targets (`zoto-create-evals`, `zoto-update-evals`)

## Operating Mode

### Advise Mode — `/zoto-eval-advise`
[Step-by-step description of what happens when invoked]

## Critical Rules
- Never call `askQuestion`.
- Use `needs_user_input` when interactive input is required.
- Never modify eval files directly — recommend actions via handoff.
- Read-only analysis of the codebase and eval suite.
```

### Key Distinctions from Judge

| Aspect | Judge | Adviser |
|--------|-------|---------|
| Analyses | Completed eval run results | Eval suite coverage of codebase |
| Input | `llm.yml`, `static.yml`, `report.yml` | Skill/command/agent sources + their `evals.json` files |
| Output | `judge:` block in `llm.yml` | Structured gap report + recommendations |
| Handoff | `/zoto-eval-update` | `/zoto-eval-create` or `/zoto-eval-update` |
| Interactive? | Single handoff question | Multi-turn conversation |

### Files to Study
- `plugins/zoto-eval-system/agents/zoto-eval-judge.md` — closest structural model
- `plugins/zoto-eval-system/agents/zoto-eval-generator.md` — another agent pattern
- Design document from subtask 01

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Validate frontmatter fields manually
- Check pattern consistency with existing agents
- Defer full validation to subtask 06

## Execution Notes
[To be filled by executing agent]

### Agent Session Info
- Agent: crux-software-engineer
- Started: 2026-05-06T21:08+10:00
- Completed: 2026-05-06T21:09+10:00

### Work Log
- Studied structural model: `zoto-eval-judge.md` and `zoto-eval-generator.md` for pattern consistency.
- Read architecture design document (subtask 01) — aligned with Section 3 (Interaction Model), Section 9 (Constraints).
- Created agent file following the judge pattern: frontmatter with name/model/description, role intro, file layout reads, skills section, operating mode with step-by-step flow, critical rules.
- Key differentiators from judge: reads source definitions (not run artefacts), two breakpoints (not one), handoffs to both create and update commands, pre-hoc coverage analysis (not post-hoc quality critique).

### Blockers Encountered
None.

### Files Modified
- `plugins/zoto-eval-system/agents/zoto-eval-adviser.md` (created)
