# zoto-agents

Monorepo for Cursor plugins by [zotoio](https://github.com/zotoio).

**Plan and verify your specs. Generate and update your evals. Watch every agent.** Agent plugins for Cursor, Claude Code, and Codex, shipped together as peers — independent, composable, free. Install one, install all; they cooperate but none depends on another.

## Plugins

| Plugin | Description |
|--------|-------------|
| [zoto-spec-system](plugins/zoto-spec-system/) | Decompose complex initiatives into reviewable specs, judge them independently, then execute with adversarial verification at every subtask. |
| [zoto-eval-system](plugins/zoto-eval-system/) | Stamp static (pytest) and LLM (`@cursor/sdk`) eval suites side-by-side, detect drift when AI primitives change and update evals with user confirmation, and compare runs across models on a single `/canvas`. |
| [zoto-cursor-top](plugins/zoto-cursor-top/) | Live, `htop`-style CLI that lists every Cursor agent on the current machine — IDE windows, `cursor-agent` CLI sessions, and Cloud Agent VMs — in one expandable parent-to-subagent tree with scrolling log tails. |
| [botz-mcp-swarm](plugins/botz-mcp-swarm/) | Skills for the botz MCP Swarm CLI: introspect MCP servers, generate and run test suites (contract checks, evals, load), diagnose and optimise, installing the CLI on first use. |
| [crux-compress](plugins/crux-compress/) | CRUX-Compress as a plugin: compress rules, code, images, and web pages into CRUX notation, with CRUX memories and meditation. |
| [zoto-botz-skills](plugins/zoto-botz-skills/) | Consume governed skills and subagents from the hosted botz.ai MCP server (`https://mcp.botz.ai/mcp`, OAuth) with zero-drift guid+version pinning and CRUX-compressed downloads. |

## Install

| Client | Marketplace file | Add the marketplace |
| --- | --- | --- |
| Cursor | `.cursor-plugin/marketplace.json` | Add `zotoio/zoto-agents` as a plugin marketplace |
| Claude Code | `.claude-plugin/marketplace.json` | `/plugin marketplace add zotoio/zoto-agents`, then `/plugin install <plugin>@zoto-agents` |
| Codex | `.agents/plugins/marketplace.json` | `codex plugin marketplace add zotoio/zoto-agents`, then install from `/plugins` |

Each plugin carries a manifest per client: `.cursor-plugin/plugin.json`, `.claude-plugin/plugin.json`, and an [Agent Plugins](https://agent-plugins.org/) `plugin.json` with OpenAI metadata under `extensions["com.openai"]`. Skills work in every client. Cursor-format hooks and `.mdc` rules apply only in Cursor.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 10

### Setup

```bash
pnpm install
```

### Build

Build all plugins (compiles hook scripts to JS for distribution):

```bash
pnpm build
```

### Test

Run tests across all plugins:

```bash
pnpm test
```

### Validate

Run the official Cursor template validation (marketplace manifest, frontmatter, path references):

```bash
pnpm validate-template
```

Run per-plugin structural validation:

```bash
pnpm validate
```

## Development

### Local Testing

Install a plugin locally so Cursor discovers it on next restart:

```bash
cd plugins/zoto-spec-system
pnpm install-local
```

Remove a locally-installed plugin:

```bash
cd plugins/zoto-spec-system
pnpm uninstall-local
```

Both scripts support `--dry-run` to preview changes without writing.

### Adding a New Plugin

1. Create a new directory under `plugins/` with a `.cursor-plugin/plugin.json` manifest.
2. Add the plugin's content (agents, commands, skills, rules, hooks, etc.).
3. Add a `package.json` with scripts for build, test, and validate.
4. Add skill evaluations under `skills/*/evals/evals.json`.

## Project Structure

Based on the [cursor/plugin-template](https://github.com/cursor/plugin-template) conventions.

```
zoto-agents/
├── .cursor-plugin/
│   └── marketplace.json      # Cursor marketplace (registers all plugins)
├── .claude-plugin/
│   └── marketplace.json      # Claude Code marketplace (same plugins)
├── .agents/plugins/
│   └── marketplace.json      # Codex marketplace (same plugins)
├── .cursor/
│   └── .gitignore
├── scripts/
│   └── validate-template.mjs # Official Cursor template validation
├── docs/
│   └── add-a-plugin.md       # Guide for adding new plugins
├── package.json              # Workspace root
├── pnpm-workspace.yaml       # pnpm workspace definition
├── tsconfig.base.json        # Shared TypeScript config
├── plugins/
│   └── zoto-spec-system/
│       ├── .cursor-plugin/   # Cursor manifest (plugin.json)
│       ├── .claude-plugin/   # Claude Code manifest (plugin.json)
│       ├── plugin.json       # Agent Plugins manifest with OpenAI metadata
│       ├── agents/           # Agent definitions (markdown + frontmatter)
│       ├── assets/           # Logo and static assets
│       ├── commands/         # Command definitions (markdown + frontmatter)
│       ├── docs/             # Plugin documentation
│       ├── hooks/            # Hook scripts (TypeScript → compiled JS)
│       ├── rules/            # Rule files (.mdc + frontmatter)
│       ├── skills/           # Skill definitions + evals
│       ├── templates/        # Config templates
│       ├── scripts/          # Dev scripts (TypeScript)
│       └── tests/            # Test suite (vitest)
```

## Submission Checklist

- Each plugin has a valid `.cursor-plugin/plugin.json`, `.claude-plugin/plugin.json`, and `plugin.json`, with matching names and versions.
- Plugin names are unique, lowercase, and kebab-case.
- `.cursor-plugin/marketplace.json`, `.claude-plugin/marketplace.json`, and `.agents/plugins/marketplace.json` list the same plugins and map to real plugin folders.
- All frontmatter metadata is present in rule, skill, agent, and command files.
- Logos are committed and referenced with relative paths.
- `node scripts/validate-template.mjs` passes.
- `pnpm test` passes.

## License

Each plugin is individually licensed. See the `LICENSE` file in each plugin directory.

## Security

CI actions are SHA-pinned, workflows default to a read-only token, and Dependabot proposes grouped updates weekly: [docs/security/ci-supply-chain.md](docs/security/ci-supply-chain.md).
