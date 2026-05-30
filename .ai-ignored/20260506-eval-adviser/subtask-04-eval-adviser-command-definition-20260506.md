# Subtask: Implement `/zoto-eval-advise` Command Definition

## Metadata
- **Subtask ID**: 04
- **Feature**: Eval Adviser
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 02, 03
- **Created**: 20260506

## Objective

Create the `/zoto-eval-advise` command at `plugins/zoto-eval-system/commands/zoto-eval-advise.md`. This command owns all `askQuestion` calls and drives the multi-turn interactive conversation by spawning the `zoto-eval-adviser` agent, collecting user input at breakpoints, and resuming the agent with answers.

## Deliverables Checklist
- [x] Command file: `plugins/zoto-eval-system/commands/zoto-eval-advise.md`
- [x] Command follows frontmatter conventions (`name`, `description`)
- [x] Command defines pre-collect phase (initial scope via `askQuestion`)
- [x] Command defines spawn phase (Task with `zoto-eval-adviser` subagent)
- [x] Command defines resume loop for multi-turn interaction
- [x] Command defines handoff routing to `/zoto-eval-create` or `/zoto-eval-update`

## Definition of Done
- [x] Command markdown exists at the correct path with valid frontmatter
- [x] Pre-collect phase uses `askQuestion` to gather initial scope
- [x] Resume loop correctly handles `needs_user_input` responses from the adviser
- [x] Handoff to action commands is clearly documented
- [x] Pattern matches existing commands (e.g., `zoto-eval-judge.md`, `zoto-eval-help.md`)

## Implementation Notes

### Command Structure

Follow the pattern established by `plugins/zoto-eval-system/commands/zoto-eval-judge.md` and `commands/zoto-eval-help.md`:

```markdown
---
name: zoto-eval-advise
description: <concise description>
---

# zoto-eval-advise

[Overview paragraph]

## Usage
/zoto-eval-advise
/zoto-eval-advise <plugin-name>    # scope to a specific plugin
/zoto-eval-advise <skill-name>     # scope to a specific skill

## Instructions

### Pre-collect
1. If argument provided, resolve scope (plugin name, skill name, etc.)
2. If no argument: `askQuestion` with scope options (full scan, by plugin, by skill)
3. Build `advise_context: { scope, ... }` for the skill

### Spawn subagent
Spawn a `zoto-eval-adviser` subagent that uses the `zoto-advise-evals` skill.

### Resume loop
[Multi-turn: when adviser returns needs_user_input, run askQuestion, resume]

### Handoff routing
[When recommendations are accepted, route to /zoto-eval-create or /zoto-eval-update]

## Related
[Cross-references]
```

### Multi-Turn Resume Loop

The key difference from simpler commands is the multi-turn nature:

1. **Initial scope** — Command pre-collects via `askQuestion`
2. **First analysis** — Adviser returns gap summary + `needs_user_input` (drill-down options)
3. **Drill-down** — Command runs `askQuestion`, resumes adviser
4. **Recommendations** — Adviser returns specific recommendations + `needs_user_input` (action options)
5. **Action** — Command runs `askQuestion`, then either:
   - Resumes adviser for more analysis
   - Hands off to `/zoto-eval-create` or `/zoto-eval-update`
   - Exits

Model this on `commands/zoto-eval-help.md` which also has navigation loops.

### Files to Study
- `plugins/zoto-eval-system/commands/zoto-eval-judge.md` — resume loop pattern
- `plugins/zoto-eval-system/commands/zoto-eval-help.md` — multi-turn navigation pattern
- `plugins/zoto-eval-system/commands/zoto-eval-create.md` — pre-collect + spawn pattern
- Skill from subtask 02 (for `needs_user_input` shapes)
- Agent from subtask 03 (for subagent name)

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Validate frontmatter fields manually
- Check pattern consistency with existing commands
- Defer full validation to subtask 06

## Execution Notes

### Agent Session Info
- Agent: crux-software-engineer
- Started: 2026-05-06T21:11Z
- Completed: 2026-05-06T21:12Z

### Work Log
- Read subtask spec, architecture design, and agent definition to gather full requirements.
- Read existing commands (judge, help, create) as structural models for pattern matching.
- Created `plugins/zoto-eval-system/commands/zoto-eval-advise.md` with:
  - Valid frontmatter (`name: zoto-eval-advise`, concise `description`).
  - Precondition check for `.zoto/eval-system/config.yml`.
  - Pre-collect phase with `askQuestion` for scope selection (full/plugin/skill).
  - Spawn phase targeting `zoto-eval-adviser` subagent with `zoto-advise-evals` skill.
  - Multi-turn resume loop handling both breakpoints (drill-down and action recommendations).
  - Handoff routing with deterministic grouping (create first, then update) and structured `adviser_handoff` data shape.
- Pattern-matched against judge (resume loop), help (multi-turn navigation), and create (pre-collect + spawn).

### Blockers Encountered
None.

### Files Modified
- `plugins/zoto-eval-system/commands/zoto-eval-advise.md` (created)
