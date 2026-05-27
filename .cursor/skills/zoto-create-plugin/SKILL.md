---
name: zoto-create-plugin
description: Guided workflow for scaffolding a new Cursor plugin in this monorepo. Gathers requirements, creates the directory structure, generates all component files (manifest, agents, skills, commands, rules, hooks), adds skill evaluations, registers in the marketplace manifest, and runs validation. Use when creating a new plugin from scratch.
---

# Create Plugin

Guided workflow for creating a new Cursor plugin in the `zoto-agents` monorepo.

## When to Use

Use this skill when the user wants to create a new plugin from scratch. The output is a fully scaffolded plugin directory registered in the marketplace manifest and passing all validation checks.

## Workflow

### Step 1: Gather Requirements

Ask the user clarifying questions (one at a time, up to 8 questions) to understand:

- **Plugin purpose**: What problem does this plugin solve? What domain does it cover?
- **Components needed**: Which of these does the plugin need?
  - Agents (specialist agent definitions)
  - Skills (guided workflows with `SKILL.md`)
  - Commands (slash commands for user invocation)
  - Rules (always-on or conditional guidance)
  - Hooks (session start, file edit, stop automation)
  - MCP servers (Model Context Protocol integrations)
- **Naming**: Preferred plugin name (must be kebab-case, will be prefixed with `zoto-` if not already)
- **Existing patterns**: Should it follow or integrate with the Spec System or other plugins?

### Step 2: Explore Existing Plugins

Spawn an `explore` subagent to examine the existing plugin(s) in `plugins/` to understand:

- Directory layout conventions
- Frontmatter patterns
- How cross-references work between agents, skills, and commands
- Testing and validation infrastructure

### Step 3: Confirm Structure

Present the proposed plugin structure for user approval:

```
Plugin: <plugin-name>
Components:
  - Agents: [list with names]
  - Skills: [list with names]
  - Commands: [list with names]
  - Rules: [list]
  - Hooks: [yes/no]
  - MCP: [yes/no]
```

### Step 4: Create Plugin Directory

Create the full directory structure under `plugins/<plugin-name>/`:

```
plugins/<plugin-name>/
├── .cursor-plugin/
│   └── plugin.json
├── agents/
│   └── <agent-name>.md
├── skills/
│   └── <skill-name>/
│       ├── SKILL.md
│       └── evals/
│           └── evals.json
├── commands/
│   └── <command-name>.md
├── rules/
│   └── <plugin-name>.mdc
├── hooks/              (if needed)
│   └── hooks.json
├── assets/
│   └── logo.png        (copy from assets/logo.png at repo root)
├── docs/
├── scripts/
│   └── validate-plugin.ts
├── tests/
├── templates/          (if needed)
├── package.json
├── README.md
├── LICENSE
└── CHANGELOG.md
```

### Step 5: Generate Plugin Manifest

Create `.cursor-plugin/plugin.json` with all required fields:

```json
{
  "name": "<plugin-name>",
  "displayName": "<Display Name>",
  "version": "0.1.0",
  "description": "<description>",
  "author": {
    "name": "zotoio",
    "email": "plugins@zotoio.com"
  },
  "homepage": "https://github.com/zotoio/zoto-agents",
  "repository": "https://github.com/zotoio/zoto-agents",
  "license": "MIT",
  "keywords": [...],
  "category": "developer-tools",
  "logo": "assets/logo.png",
  "agents": "./agents/",
  "skills": "./skills/",
  "commands": "./commands/",
  "rules": "./rules/"
}
```

Only include path references for components that actually exist.

### Step 6: Generate Components

For each component the user requested:

**Agents**: Create `agents/<name>.md` with YAML frontmatter (`name`, `description`, optionally `model`) and comprehensive instructions covering expertise, skills used, operating modes, and critical rules.

**Skills**: Create `skills/<name>/SKILL.md` following the Agent Skills specification:
- Frontmatter: `name` (must match directory), `description`
- Body: When to Use, Workflow (numbered steps), Conventions, What NOT to Do
- Keep under 500 lines; use `references/` for detail
- Create `evals/evals.json` with >= 2 test cases and assertions

**Commands**: Create `commands/<name>.md` with frontmatter (`name`, `description`) and sections for Usage (with examples), Instructions (argument handling, what happens), and Related.

**Rules**: Create `rules/<name>.mdc` with frontmatter (`description`, `alwaysApply: true`) and content describing what agents should know.

**Hooks**: Create `hooks/hooks.json` pointing at compiled scripts. Write TypeScript source under `hooks/` that reads JSON stdin and writes JSON stdout.

**6e — Classify and stamp evals** (run after each eval-eligible component above — agents, skills, commands, hooks; skip rules):

For every component file you just wrote:

1. **Analyse** — `pnpm run eval:analyse --target <component-source-path>` (repo-relative path, e.g. `plugins/<plugin>/commands/<name>.md`). Parse stdout as JSON (`AnalyserPayload`). Read `requiresInteraction` (default `false` when missing).
2. **Stamp** — dispatch to the same per-target stamper as `/z-eval-update` (`stampTargetWithBackendRouting` in `scripts/eval-stamp.ts`):
   - `requiresInteraction: true` → code-strategy `evals/llm/test_<kind>_<name>.test.ts` (imports `askquestion-bridge` when interactive).
   - `requiresInteraction: false` (or omitted) → declarative JSON:
     - commands/agents/hooks → `plugins/<plugin>/evals/<kind>s/<name>.json`
     - skills → `plugins/<plugin>/skills/<name>/evals/evals.json` (Agent Skills shape: `{ skill_name, evals[] }`).
3. **Canonical migration pattern** — when re-classifying later, follow the migration matrix from Subtask 09 (`specs/20260526-eval-askquestion-strategy-bridge/audit/migration-matrix.md`): one backend per target, opposite-backend artefact removed only when generated.

**Fallback when analyser unavailable** — plugin creation MUST NOT block when `CURSOR_API_KEY` is missing or `pnpm run eval:analyse` fails:

- Stamp declarative JSON using a minimal heuristic payload (omit `requiresInteraction`).
- Every generated case row receives `_meta.classification_source: "fallback-default"`.
- Tell the operator: run `pnpm run eval:update --with-analyser` later to re-classify and migrate to the correct backend. Reference the Subtask 09 migration matrix as the canonical re-classification pattern.

Implementation helper (for tests and automation): `evals/llm/_shared/zoto-create-plugin-strategy.ts` exports `classifyAndStampPluginComponent`.

When the user requested **no** eval components (no agents/skills/commands/hooks), skip 6e entirely — no regression to the existing flow.

### Step 7: Generate Supporting Files

1. **package.json** — with scripts for `build`, `test`, `validate`, `install-local`, `uninstall-local`
2. **README.md** — substantive (>50 lines) covering purpose, components, usage, configuration, development
3. **LICENSE** — MIT license
4. **CHANGELOG.md** — initial entry
5. **assets/logo.png** — copy from `assets/logo.png` at the repo root (do NOT create a placeholder)

### Step 8: Register in Marketplace

Append the plugin to `.cursor-plugin/marketplace.json`:

```json
{
  "name": "<plugin-name>",
  "source": "plugins/<plugin-name>",
  "description": "<description>"
}
```

### Step 9: Validate

Run all three validation layers:

1. `node scripts/validate-template.mjs` — marketplace + manifest
2. `node scripts/validate-skills.mjs` — Agent Skills spec (if skills-ref available)
3. `cd plugins/<plugin-name> && pnpm validate` — structural checks

Fix any errors before declaring the plugin ready.

### Step 10: Present Summary

Report to the user:

- Plugin name and path
- Components created (agents, skills, commands, rules, hooks)
- Validation results
- Next steps (customize agent instructions, add more components, local testing)

## Conventions

- Plugin name: kebab-case, typically `zoto-<domain>`
- All `name` frontmatter fields: kebab-case, matching their filename or directory
- Skill names: match their parent directory name exactly
- Commands: typically `zoto-<verb>` or `zoto-<verb>-<noun>`
- Config: `.zoto-<plugin-name>/config.json` at repo root (in target repos)
- Evals: minimum 2 test cases per skill, each with assertions

## What NOT to Do

- Do not create plugins outside the `plugins/` directory
- Do not skip marketplace registration
- Do not skip skill evaluations
- Do not use absolute paths in manifests
- Do not create skills with `name` that doesn't match the directory name
- Do not skip validation before declaring the plugin ready
- Do not create README stubs (<50 lines)
