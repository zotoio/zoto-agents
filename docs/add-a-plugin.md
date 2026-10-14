# Add a plugin

Add a new plugin under `plugins/` and register it in `.cursor-plugin/marketplace.json`.

## Quick start with `/zoto-create-plugin`

The fastest way to add a plugin is the `/zoto-create-plugin` slash command. It walks you through requirements, scaffolds the full directory structure, generates all component files, registers the plugin in the marketplace manifest, and runs validation — all in one guided workflow.

```text
/zoto-create-plugin                          # Interactive — the agent asks clarifying questions
/zoto-create-plugin "analytics dashboard"    # From a short description
/zoto-create-plugin @docs/design.md          # From a design document
```

The command produces a ready-to-use plugin under `plugins/<plugin-name>/` with manifest, agents, skills (including evals), commands, rules, hooks, supporting files (README, LICENSE, CHANGELOG, package.json), and a marketplace registration entry. Any validation errors are fixed automatically before the workflow completes.

If you prefer to scaffold manually, follow the steps below.

---

## Manual setup

### 1. Create plugin directory

Create a new folder:

```text
plugins/my-new-plugin/
```

Add the required manifests, one per client, with the same `name` and `version`:

```text
plugins/my-new-plugin/.cursor-plugin/plugin.json   # Cursor (example below)
plugins/my-new-plugin/.claude-plugin/plugin.json   # Claude Code: name, version, description, author, homepage, repository, license, keywords
plugins/my-new-plugin/plugin.json                  # Agent Plugins 1.0, read by Codex; see below
```

The root `plugin.json` sets `"$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"`, the same identity fields, and OpenAI metadata under `extensions["com.openai"]`: an `interface` with `displayName` and `shortDescription` (30 characters each), `longDescription` (4,000), and `developerName` (80), plus `category`, `websiteURL`, and `logo` and `composerIcon` (`./`-prefixed paths to square PNG, JPEG, WebP, or SVG images, at least 48x48 and at most 5 MiB); and `"requires_local_executor": true` when the plugin runs local programs, which marks it desktop-only. `validate-template` enforces the required fields and limits.

Example manifest:

```json
{
  "name": "my-new-plugin",
  "displayName": "My New Plugin",
  "version": "0.1.0",
  "description": "Describe what this plugin does",
  "author": {
    "name": "zotoio"
  },
  "license": "MIT",
  "logo": "assets/logo.svg"
}
```

### 2. Add plugin components

Add only the components you need:

- `rules/` with `.mdc` files (YAML frontmatter with `description` required)
- `skills/<name>/SKILL.md` (YAML frontmatter with `name` and `description` required)
- `agents/*.md` (YAML frontmatter with `name` and `description` required)
- `commands/*.(md|mdc|markdown|txt)` (YAML frontmatter with `name` and `description` required)
- `hooks/hooks.json` and `scripts/*` for automation hooks
- `mcp.json` for MCP server definitions
- `assets/logo.svg` for marketplace display

Every skill also gets a light wrapper command, `commands/z-<skill>.md`, so users can run it as `/z-<skill>` (for example `/z-mcp-swarm` for the `mcp-swarm` skill). The wrapper sets `name: z-<skill>` and a `description` in its frontmatter, gives usage examples, and tells the agent to load and follow the named skill with the text after the command as the request, adding no behaviour of its own. Add evals for it at `commands/evals/z-<skill>.json` (`target_id: "command:z-<skill>"`, at least 2 cases), and set `"commands": "./commands/"` in `.cursor-plugin/plugin.json`. `validate-template` enforces this for every plugin except `zoto-spec-system`, `zoto-eval-system`, and `zoto-cursor-top`, which predate the convention.

### 3. Add skill evaluations

Each skill should have an `evals/evals.json` file with at least 2 test cases:

```json
{
  "skill_name": "my-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "A realistic user message",
      "expected_output": "Description of what success looks like",
      "assertions": ["Specific verifiable assertion"]
    }
  ]
}
```

See [agentskills.io/skill-creation/evaluating-skills](https://agentskills.io/skill-creation/evaluating-skills) for the full eval format.

### 4. Add TypeScript tooling

Create a `package.json` in the plugin directory with dev scripts:

```json
{
  "name": "@zoto-agents/my-new-plugin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "validate": "tsx scripts/validate-plugin.ts"
  },
  "devDependencies": {
    "tsup": "^8.4.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0"
  }
}
```

Then run `pnpm install` from the repo root to wire up the workspace.

### 5. Register in marketplace manifest

Edit `.cursor-plugin/marketplace.json` and append a new entry:

```json
{
  "name": "my-new-plugin",
  "source": "./plugins/my-new-plugin",
  "description": "Describe your plugin"
}
```

`source` is the relative path from the repository root to the plugin folder.

Add the plugin to the other two marketplaces as well:

- `.claude-plugin/marketplace.json`: `{ "name": "my-new-plugin", "source": "./plugins/my-new-plugin", "description": "…" }`
- `.agents/plugins/marketplace.json`: `{ "name": "my-new-plugin", "source": { "source": "local", "path": "./plugins/my-new-plugin" }, "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" }, "category": "Developer Tools" }`

`validate-template` fails when a plugin is missing from either file or its manifests disagree on `name` or `version`.

### 6. Validate

```bash
node scripts/validate-template.mjs
pnpm test
pnpm validate
```

Fix all reported errors before committing.

### 7. Common pitfalls

- Plugin `name` not kebab-case.
- `source` path in marketplace manifest does not match folder name.
- Missing `.cursor-plugin/plugin.json`, `.claude-plugin/plugin.json`, or `plugin.json` in plugin folder.
- Missing frontmatter keys (`name`, `description`) in skills, agents, or commands.
- Rule files missing frontmatter `description`.
- Broken relative paths for `logo`, `hooks`, or `mcpServers` in manifest files.
- Fewer than 2 eval test cases per skill.
- A skill without its `/z-<skill>` wrapper command and that command's evals.
