---
name: zoto-create-plugin
description: Scaffold a new Cursor plugin in this monorepo with guided component selection, validation, and marketplace registration.
---

# zoto-create-plugin

Scaffold a new Cursor plugin in this monorepo with guided component selection, validation, and marketplace registration.

## Usage

```
/zoto-create-plugin                          - Start interactive plugin creation (guided questions)
/zoto-create-plugin "analytics dashboard"    - Create a plugin by description
/zoto-create-plugin @docs/design.md          - Create a plugin from a design document
```

## Instructions

When this command is invoked, spawn a `zoto-plugin-manager` subagent to create a new plugin. The agent uses the `zoto-create-plugin` skill to guide the workflow. Pass `$ARGUMENTS` through to the spawned agent.

### Argument handling

- **No arguments**: Start the guided plugin creation workflow — the agent asks clarifying questions to understand requirements before scaffolding
- **Text description**: The agent uses the description as the plugin scope. It may still ask clarifying questions about specific components
- **File reference(s)**: The agent reads the referenced file(s) as design docs and derives plugin structure from them

### What happens

1. Gather requirements (components needed, naming, integrations)
2. Explore existing plugins to understand conventions
3. Propose plugin structure for user confirmation
4. Create the full directory structure under `plugins/<plugin-name>/`
5. Generate all component files (manifest, agents, skills, commands, rules, hooks)
6. Add skill evaluations (`evals/evals.json` per skill)
7. Generate supporting files (package.json, README, LICENSE, CHANGELOG)
8. Register in `.cursor-plugin/marketplace.json`
9. Run validation pipeline and fix any errors
10. Present summary with next steps

### Plugin output structure

```
plugins/<plugin-name>/
├── .cursor-plugin/plugin.json
├── agents/*.md
├── skills/<name>/SKILL.md + evals/
├── commands/*.md
├── rules/*.mdc
├── hooks/hooks.json (if needed)
├── package.json
├── README.md
├── LICENSE
└── CHANGELOG.md
```

## Related

- `zoto-plugin-manager` agent — plugin creation and management specialist
- `zoto-create-plugin` skill — guided plugin scaffolding workflow
- `/sync-plugins` — sync plugin sources to local Cursor installation
