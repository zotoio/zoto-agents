# zoto-cursor-top

A live updating htop-style CLI that lists **every Cursor agent on the current
machine** - IDE windows, `cursor-agent` CLI sessions, and Cloud Agent VMs -
in one expandable tree. Parent agents are expandable to reveal their
subagents, and every row shows the start time, model, repo (working
directory), and the last 3 log lines scrolling live.

```
cursor-top  ·  5 processes · 3 roots · 5 subagents · refresh 1000ms

TYPE     PID  AGENT                                MODEL              REPO                     START (elapsed)  STATUS
[CLD]   6712  ▼ Cloud Agent VM                     claude-sonnet-4.5  /workspace               11:30:14 (32m04s) running
              Design plugin live-updating htop CLI
              log: tool: write plugins/zoto-cursor-top/src/cli.ts
              log: spawning subagent: generalPurpose
              log: tool: glob 'plugins/**/.cursor-plugin/plugin.json'
   [SUB]   --  ▶ Task(explore)                     claude-sonnet-4.5  /workspace               11:32:01 (30m17s) done
   [SUB]   --  ▼ Task(generalPurpose)              claude-sonnet-4.5  /workspace               11:40:01 (22m17s) running
              Scaffold htop-style TUI and wire discovery layer
              log: vitest 18/18 passed
              log: tsup build dist/cli.js ... 142kb
              log: writing tests/discovery/processes.test.ts
   [SUB]   --  ▶ Task(debug)                       claude-sonnet-4.5  /workspace               11:58:01 (4m17s)  waiting
[IDE]   4231  ▶ Cursor IDE                         claude-opus-4.7    /Users/dev/work/app      12:01:11 (14m07s) running
[CLI]   5612  ▶ cursor-agent CLI                   gpt-5              /Users/dev/work/util     12:08:11 (7m07s)  waiting

[↑/↓] move  [→/enter] expand  [←] collapse  [e]xpand all  [c]ollapse all  [r]efresh  [q]uit
```

## Features

- **Cross-process visibility.** Discovers Cursor IDE windows, every
  `cursor-agent` CLI session, and Cloud Agent VM exec daemons in one view.
- **Parent / subagent hierarchy.** Subagents spawned via the `Task` tool are
  nested under their parent and the tree is collapsible.
- **Per-row context.** Start time, elapsed duration, model, repo, status,
  and the **last 3 log lines** for every agent (configurable).
- **Live updates.** Refresh interval is configurable (default 1 second,
  minimum 200ms). Log lines re-tail every tick.
- **Three output modes.** Interactive TUI, `--once` for one-shot formatted
  output, and `--json` for machine-readable snapshots.
- **Demo mode.** `--demo` renders a populated synthetic fixture for
  screenshots and onboarding without needing any Cursor session running.
- **No native deps.** Works on macOS, Linux, and Windows using only `ps` /
  PowerShell and the standard library.

## Installation

This plugin is part of the `zoto-agents` monorepo. From the repo root:

```bash
pnpm install
pnpm --filter @zoto-agents/zoto-cursor-top build
```

To use the CLI standalone, install the package globally (once published):

```bash
yarn global add @zoto-agents/zoto-cursor-top
# or
npm install -g @zoto-agents/zoto-cursor-top
```

The CLI is exposed as `cursor-top`.

## Usage

```bash
cursor-top                # interactive live TUI (default 1s refresh)
cursor-top --demo         # synthetic fixture, no Cursor required
cursor-top --once         # render one frame to stdout and exit
cursor-top --json         # emit one snapshot as JSON and exit
cursor-top --interval 500 # refresh every 500ms (minimum 200ms)
cursor-top --lines 5      # tail 5 log lines per agent (default 3)
cursor-top --help         # show all flags
```

### Keyboard

| Key | Action |
|-----|--------|
| `↑` / `↓` or `j` / `k` | move selection |
| `→` / `Enter` or `l` | expand selected node |
| `←` or `h` | collapse selected node |
| `e` | expand all |
| `c` | collapse all |
| `r` | force refresh |
| `q` or `Ctrl-C` | quit |

### Inside Cursor

This plugin also registers:

- The slash command `/zoto-cursor-top` - launches the TUI in the active
  terminal with `$ARGUMENTS` passed through.
- The skill `zoto-cursor-top-monitor` - guided workflow for launching and
  interpreting the TUI.
- The agent `zoto-cursor-top-troubleshooter` - diagnoses missing rows or
  empty log tails when discovery comes up short.
- The rule `zoto-cursor-top.mdc` - documents conventions and data sources
  for any agent that wants to invoke or describe the CLI.

## Data sources

| Source | Used for |
|--------|----------|
| `ps -axww` (macOS / Linux) or `Get-CimInstance Win32_Process` (Windows) | Cursor IDE, `cursor-agent`, Cloud Agent VM processes |
| `~/Library/Application Support/Cursor/` (macOS), `~/.config/Cursor/` (Linux), `%APPDATA%/Cursor/` (Windows) | IDE session metadata |
| `~/.cursor/cli/` | `cursor-agent` CLI session metadata |
| `~/.cursor/projects/<workspace>/` | Cloud Agent VM in-flight agents |
| Log files referenced from each session record | Last 3 lines per agent |

Every data source is optional: the CLI tolerates missing directories and
emits diagnostics rather than crashing.

## How the hierarchy is built

1. **Explicit `parentId`** from session metadata wins when present.
2. **PID -> PPID** from the OS process table is used when metadata is
   missing.
3. **Root fallback** - any node with no resolvable parent is rendered at the
   top level.

This means subagents appearing at root level always indicate that the
session metadata was missing a `parentId` for them - the troubleshooter
agent walks the user through filing a Cursor-side report when this happens.

## Development

```bash
cd plugins/zoto-cursor-top
pnpm install
pnpm test           # vitest
pnpm validate       # structural validation
pnpm build          # tsup -> dist/cli.js
pnpm start          # run via tsx
pnpm demo           # run --demo via tsx
```

Project layout:

```
plugins/zoto-cursor-top/
├── .cursor-plugin/plugin.json
├── agents/zoto-cursor-top-troubleshooter.md
├── bin/cursor-top.mjs                # global-install entry point
├── commands/zoto-cursor-top.md
├── docs/
├── rules/zoto-cursor-top.mdc
├── scripts/
│   ├── install-local.ts
│   ├── uninstall-local.ts
│   └── validate-plugin.ts
├── skills/zoto-cursor-top-monitor/
│   ├── SKILL.md
│   └── evals/evals.json
├── src/
│   ├── cli.ts                        # entry point
│   ├── types.ts                      # shared types
│   ├── discovery/                    # process / session / log / hierarchy
│   └── ui/                           # Ink components
└── tests/                            # vitest
```

## License

[MIT](./LICENSE).
