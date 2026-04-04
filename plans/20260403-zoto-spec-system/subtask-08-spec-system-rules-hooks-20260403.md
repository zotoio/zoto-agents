# Subtask: Rules and Hooks

## Metadata
- **Subtask ID**: 08
- **Feature**: zoto-spec-system
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 03
- **Created**: 20260403

## Objective

Create the integration rule and hooks that wire the spec system into the consuming repo's Cursor environment.

## Deliverables Checklist
- [ ] Rule file at `plugins/zoto-spec-system/rules/zoto-spec-system.mdc`
- [ ] Hooks manifest at `plugins/zoto-spec-system/hooks/hooks.json`
- [ ] Session start hook script at `plugins/zoto-spec-system/hooks/zoto-session-start.py` (Python, not bash)
- [ ] Rule teaches agents about spec system availability, commands, and config
- [ ] Hook reads `.spec-system/config.json` and nudges user when threshold exceeded
- [ ] Hook respects `enabled` flag — skips silently when disabled

## Definition of Done
- [ ] Rule file is valid `.mdc` format
- [ ] Hooks manifest follows Cursor hooks.json schema
- [ ] Hook script is Python 3 (no bash/sh/jq dependencies)
- [ ] No references to CRUX
- [ ] Hook uses `unitOfWork` from config in nudge message

## Implementation Notes

**Rule** (`zoto-spec-system.mdc`):
- Teach agents about the spec system: available commands (`/zoto-plan`, `/zoto-judge`, `/zoto-execute`)
- When to suggest running `/zoto-plan` (complex multi-step tasks)
- How to discover existing plans (`plansDir` from config)
- Note about optional memory extension

**Hooks** (`hooks.json`):
```json
{
  "hooks": {
    "sessionStart": [
      {
        "command": "python3 hooks/zoto-session-start.py",
        "description": "Spec System: Check for unprocessed specs and nudge user"
      }
    ]
  }
}
```

**Session start script** (`zoto-session-start.py`):
- Written in Python 3 — no bash, sh, or jq dependencies
- Read `.spec-system/config.json` using `json` stdlib (exit silently if not found)
- Count directories in `workDir`
- If count > threshold, print the nudge message with `unitOfWork` interpolated
- Use only Python 3 stdlib (`json`, `os`, `pathlib`, `sys`)
- Exit code 0 always (hooks must not block session start)

## Testing Strategy
- Verify rule file has valid frontmatter
- Verify hooks.json is valid JSON
- Verify hook script passes `python3 -m py_compile` syntax check
- Verify no CRUX references in any file

## Execution Notes
[To be filled by executing agent]

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed]
