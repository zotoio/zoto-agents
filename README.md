# zoto-agents

Monorepo for Cursor plugins by [zotoio](https://github.com/zotoio).

## Plugins

| Plugin | Description |
|--------|-------------|
| [zoto-spec-system](plugins/zoto-spec-system/) | Structured spec workflow: create, judge, and execute engineering initiatives with adversarial verification. |
| [zoto-eval-system](plugins/zoto-eval-system/) | Generate, run, and keep static (pytest) + LLM (@cursor/sdk) evals in sync with code changes. askQuestion-driven config, YAML+JSONSchema results, surgical update on git diff, /canvas-rendered cross-run compare. |

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
│   └── marketplace.json      # Marketplace manifest (registers all plugins)
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
