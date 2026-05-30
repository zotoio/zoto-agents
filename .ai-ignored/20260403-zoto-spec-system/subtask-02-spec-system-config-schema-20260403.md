# Subtask: Config Schema

## Metadata
- **Subtask ID**: 02
- **Feature**: zoto-spec-system
- **Assigned Subagent**: generalPurpose
- **Dependencies**: —
- **Created**: 20260403

## Objective

Define the configuration schema that consuming repos use to configure the spec system. The config file lives at `.zoto-spec-system/config.json` in the consuming repo.

## Deliverables Checklist
- [ ] Config schema document at `plugins/zoto-spec-system/docs/config-schema.md`
- [ ] Example config at `plugins/zoto-spec-system/docs/example-config.json`
- [ ] Copyable template at `plugins/zoto-spec-system/templates/config.json` (minimal defaults for quick start)
- [ ] Default config values documented

## Definition of Done
- [ ] Schema covers all configurable aspects (unitOfWork, directories, hooks, extensibility)
- [ ] Example config is valid JSON
- [ ] Defaults are sensible for a generic repo

## Implementation Notes

The config schema should support:

```json
{
  "unitOfWork": "spec",
  "specsDir": "specs",
  "workDir": "specs/current",

  "hooks": {
    "sessionStartNudge": {
      "enabled": true,
      "threshold": 20,
      "message": "You have ${count} unprocessed ${unitOfWork}s. Consider running /zoto-spec-create to organize."
    }
  },

  "spec": {
    "maxSubtasks": 99,
    "parallelLimit": 4,
    "adversarialVerification": true
  },

  "extensions": {
    "memory": {
      "enabled": false,
      "plugin": null
    }
  }
}
```

Key design points:
- `unitOfWork` is interpolated into all user-facing messages
- `specsDir` controls where plan directories are created
- `workDir` is the directory the session hook monitors for unprocessed specs (used by `hooks.sessionStartNudge`)
- `extensions.memory` is a placeholder — when a memory plugin is installed, this section points to it
- All paths are relative to repo root
- All fields have sensible defaults so a minimal `{}` config works
- A copyable template config should be provided at `templates/config.json` in the plugin

## Testing Strategy
- Verify example config is valid JSON
- Document each field with type, default, and description

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
