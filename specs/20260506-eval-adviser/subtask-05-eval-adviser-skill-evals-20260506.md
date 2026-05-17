# Subtask: Write Skill Evals for `zoto-advise-evals`

## Metadata
- **Subtask ID**: 05
- **Feature**: Eval Adviser
- **Assigned Subagent**: crux-software-engineer
- **Dependencies**: 02
- **Created**: 20260506

## Objective

Create eval test cases for the `zoto-advise-evals` skill at `plugins/zoto-eval-system/skills/zoto-advise-evals/evals/evals.json`. These evals verify that the skill correctly identifies coverage gaps, produces structured reports, and follows the `needs_user_input` contract.

## Deliverables Checklist
- [x] Eval file: `plugins/zoto-eval-system/skills/zoto-advise-evals/evals/evals.json`
- [x] Minimum 3 test cases covering distinct scenarios
- [x] Each test case has meaningful assertions (>= 3 assertions per case)
- [x] Test cases cover: gap detection, interactive flow, recommendation quality
- [x] Assertions verify the skill does NOT call `askQuestion`

## Definition of Done
- [x] `evals.json` exists at the correct path with valid JSON structure
- [x] At least 3 test cases present
- [x] Each test case has `id`, `prompt`, `expected_output`, `files`, `assertions`
- [x] Assertions are specific and testable (not vague)
- [x] Structure matches existing eval files (e.g., `zoto-judge-evals/evals/evals.json`)

## Implementation Notes

### Eval Structure

Follow the pattern from `plugins/zoto-eval-system/skills/zoto-judge-evals/evals/evals.json`:

```json
{
  "skill_name": "zoto-advise-evals",
  "evals": [
    {
      "id": 1,
      "prompt": "...",
      "expected_output": "...",
      "files": [],
      "assertions": ["...", "...", "..."]
    }
  ]
}
```

### Recommended Test Cases

1. **Full scan with gaps** — Run `/zoto-eval-advise` on a codebase where some skills lack trigger-phrase tests. Verify the skill identifies the gaps, produces a structured report, and returns `needs_user_input` with drill-down options.

2. **Targeted scan (specific skill)** — Run `/zoto-eval-advise` scoped to a single skill. Verify the skill analyses all five dimensions for that target and produces per-dimension findings.

3. **No config present** — Run `/zoto-eval-advise` when `.zoto/eval-system/config.yml` is missing. Verify the skill returns `needs_user_input` pointing to `/zoto-eval-configure` and does not crash.

4. **Recommendation handoff** — After the adviser identifies gaps, verify recommendations include concrete action references (specific `/zoto-eval-create` or `/zoto-eval-update` commands with target IDs).

### Assertion Guidelines

Each assertion should verify one specific behavior:
- "The skill identified at least one skill without trigger-phrase coverage"
- "The gap report includes a `dimensions` section with all five dimensions"
- "The skill returned `needs_user_input` with drill-down options"
- "The skill did not call `askQuestion`"
- "Recommendations reference specific target IDs"
- "The skill did not modify any files"

### Files to Study
- `plugins/zoto-eval-system/skills/zoto-judge-evals/evals/evals.json` — structural model
- `plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json` — assertion style model
- Skill from subtask 02 (for understanding what to test)

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:
- Validate JSON structure manually
- Check assertion count (>= 3 per case)
- Defer full validation to subtask 06

## Execution Notes

### Agent Session Info
- Agent: crux-software-engineer
- Started: 2026-05-06T21:12Z
- Completed: 2026-05-06T21:12Z

### Work Log
- Read subtask spec, SKILL.md, and existing eval files (judge, help) for structural model
- Created `evals/evals.json` with 4 test cases (6-7 assertions each, 25 total)
- Cases cover: full scan with gap detection, targeted scan, missing config graceful abort, recommendation handoff structure
- Every case asserts the skill does NOT call askQuestion and does NOT modify files
- Validated JSON parses correctly and meets minimum assertion thresholds

### Blockers Encountered
None

### Files Modified
- `plugins/zoto-eval-system/skills/zoto-advise-evals/evals/evals.json` (created)
- `specs/20260506-eval-adviser/subtask-05-eval-adviser-skill-evals-20260506.md` (updated)
