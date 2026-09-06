# zoto-agents

Monorepo for Cursor plugins by [zotoio](https://github.com/zotoio).

**Plan and verify your specs. Generate and update your evals. Watch every agent.** Three Cursor plugins shipped together as peers — independent, composable, free. Install one, install all; they cooperate but none depends on another.

## Plugins

| Plugin | Description |
|--------|-------------|
| [zoto-spec-system](plugins/zoto-spec-system/) | Decompose complex initiatives into reviewable specs, judge them independently, then execute with adversarial verification at every subtask. |
| [zoto-eval-system](plugins/zoto-eval-system/) | Stamp static (pytest) and LLM (`@cursor/sdk`) eval suites side-by-side, detect drift when AI primitives change and update evals with user confirmation, and compare runs across models on a single `/canvas`. |
| [zoto-cursor-top](plugins/zoto-cursor-top/) | Live, `htop`-style CLI that lists every Cursor agent on the current machine — IDE windows, `cursor-agent` CLI sessions, and Cloud Agent VMs — in one expandable parent-to-subagent tree with scrolling log tails. |

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

From a Cursor chat in this repo, `/install-local-plugins` and
`/uninstall-local-plugins` present a multiselect over the monorepo plugins and
run each plugin's own install/uninstall script. Per plugin from a terminal:

```bash
cd plugins/zoto-spec-system
pnpm install-local
```

Remove a locally-installed plugin:

```bash
cd plugins/zoto-spec-system
pnpm uninstall-local
```

Every plugin installs to `~/.cursor/plugins/local/<name>/` and registers
`<name>@local` in `~/.claude/plugins/installed_plugins.json`; the installer also
removes any legacy `~/.cursor/plugins/<name>/` copy so rules are not loaded
twice. Both scripts support `--dry-run` to preview changes without writing.
Reload the Cursor window after installing or removing.

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
│   └── marketplace.json      # Marketplace manifest (registers all plugins)
├── .cursor/
│   ├── agents/               # Monorepo dev agents (zoto-plugin-manager, crux-*)
│   ├── commands/             # /zoto-create-plugin, /install-local-plugins, /uninstall-local-plugins, /crux-*
│   ├── skills/               # zoto-create-plugin + crux-* skills
│   ├── rules/                # Always-on workspace rules (CRUX, plugin conventions)
│   ├── hooks/                # CRUX compression / memory hooks (see hooks.json)
│   └── hooks.json
├── .zoto/
│   └── eval-system/          # Eval-system config, manifest, analyser cache (workspace-local)
├── scripts/
│   ├── validate-template.mjs # Official Cursor template validation
│   └── validate-skills.mjs   # Agent Skills spec validation
├── evals/                    # Unified eval harness (vitest.config.ts, scenarios, static tests)
├── docs/
│   └── add-a-plugin.md       # Guide for adding new plugins
├── package.json              # Workspace root
├── pnpm-workspace.yaml       # pnpm workspace definition
├── tsconfig.base.json        # Shared TypeScript config
├── plugins/
│   ├── zoto-cursor-top/      # htop-style monitor for every Cursor agent on the machine
│   ├── zoto-eval-system/     # Eval generation / execution / drift detection
│   └── zoto-spec-system/     # Structured engineering specs (shown expanded)
│       ├── .cursor-plugin/   # Plugin manifest (plugin.json)
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

- Each plugin has a valid `.cursor-plugin/plugin.json`.
- Plugin names are unique, lowercase, and kebab-case.
- `.cursor-plugin/marketplace.json` entries map to real plugin folders.
- All frontmatter metadata is present in rule, skill, agent, and command files.
- Logos are committed and referenced with relative paths.
- `node scripts/validate-template.mjs` passes.
- `pnpm test` passes.

## License

Each plugin is individually licensed. See the `LICENSE` file in each plugin directory.
