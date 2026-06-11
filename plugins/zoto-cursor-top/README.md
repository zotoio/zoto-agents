# zoto-cursor-top

A live updating htop-style CLI that lists **every Cursor agent on the current
machine** - IDE windows, `cursor-agent` CLI sessions, and Cloud Agent VMs -
in one expandable tree. Parent agents are expandable to reveal their
subagents, and every row shows the start time, model, repo (working
directory), and the last 3 log lines scrolling live.

```
cursor-top  ·  5 processes · 3 roots · 5 subagents · refresh 1000ms

TYPE     PID  AGENT                                MODEL              REPO                     START (elapsed)  STATUS TOKENS
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

[↑/↓] move  [→/enter] expand  [←] collapse  [e]xpand all  [c]ollapse all  [r]efresh  [p]ause  [t]heme  [y] density  [q]uit
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
- **Colour themes.** Thirteen built-in palettes — utilitarian (`default`, `mono`,
  `high-contrast`, `ocean`, `forest`, `sunset`, `solarized`, `dracula`) plus
  emoji/unicode decor themes (`party`, `kawaii`, `cyber`, `retro`, `wizard`).
  Switch via `--theme`
  or the `t` key. A non-empty `NO_COLOR`
  env var forces `mono` per [no-color.org](https://no-color.org). Themes affect
  the TUI only — `--once` and `--json` output stay colour-free.
- **Layout density.** Three levels (`compact`, `cozy`, `comfortable`) control
  how much detail each agent row shows: row only, row + title, or row + title +
  log tail (today's default). Switch via `--density` or the `y` key; applies to
  the TUI and `--once`.
- **Token usage column.** Chat and subagent rows show current context usage
  from Cursor's `composerData` store (`promptTokenBreakdown.totalUsedTokens`),
  formatted in thousands with one decimal (`1.2k`, `94.6k`). Process-only rows
  show `-` when no composer session exists.
- **Log tail display (TUI + `--once`).** Log lines default to **oldest-first**
  (chronological). Press **`o`** to toggle newest-first. Both toggles persist in
  `~/.zoto/cursor-top.json`.
- **Filter / search.** Narrow the tree by repo, model, status, or free text
  via `--filter "<query>"` or the `/` key in the interactive TUI. Scoped
  tokens (`repo:`, `model:`, `status:`) AND-combine with bare terms matched
  across label, title, repo, model, and log lines. Matching nodes keep their
  ancestor chain; non-matching siblings are hidden. A `repo:` match on a
  parent does **not** auto-include non-matching children.
- **Lifecycle event strip (TUI only).** On every refresh the CLI diffs the
  previous unfiltered snapshot against the new one and surfaces the most
  recent transitions in a one-line event strip above the footer: finished
  (`✓`), failed (`✗`), blocked / needs input (`⏸`), and newly appeared agents.
  The strip and collector `!` diagnostic lines are **hidden by default** —
  press **`i`** to toggle them on. The keybind row stays pinned to the bottom
  of the terminal.
  Rows whose status just changed stay accent-highlighted for ~5 seconds. With
  the default `--active-only` prune, agents that finish vanish from the tree
  rather than transitioning to `done` — those disappearances are reported as
  **finished** events. Pass **`--bell`** to ring the terminal bell on finished
  / failed events (at most one bell per tick). Event data is **not** included
  in `--json` snapshots today — that remains a deliberate non-goal for a
  future additive extension.
- **Demo mode.** `--demo` renders a populated synthetic fixture for
  screenshots and onboarding without needing any Cursor session running.
- **Detail pane (TUI only).** Press **`d`** on a selected row to open a
  bottom split showing full metadata and a deep log tail (default 25 lines
  via **`--detail-lines`**). Loaded lazily for the selected node only — the
  main tree still uses **`--lines`** (default 3). **`Esc`** closes the pane
  before clearing an active filter. **`↑/↓`** moves selection while the pane
  is open and the pane follows.
- **Viewport windowing (interactive TUI only).** Large agent trees scroll
  inside a terminal-height viewport: only rows that fit the visible window are
  rendered, with **`↑ N more`** / **`↓ N more`** overflow indicators when rows
  are clipped above or below. Selection-follow scrolling keeps the highlighted
  row visible as you move with **`↑/↓`**. Windowing accounts for header,
  filter bar, event strip, detail pane, and multi-line rows at the current
  density. **`--once`** and **`--json`** still emit the full untruncated tree.
- **No native deps.** Works on macOS, Linux, and Windows using only `ps` /
  PowerShell and the standard library.

## Installation

### After installing from the Cursor marketplace

The marketplace ships agents, skills, commands, and rules — **not** a built
`cursor-top` binary. Run **one-time setup** before `/zoto-cursor-top`:

```
/zoto-cursor-top-init
```

That builds `dist/cli.js`, copies the plugin to `~/.cursor/plugins/zoto-cursor-top/`,
installs Ink/React runtime deps, and symlinks `cursor-top` onto PATH (usually
`~/.local/bin`). Restart Cursor after init, then verify with
`cursor-top --help` or `cursor-top --demo`.

### From the `zoto-agents` monorepo

From the repo root:

```bash
pnpm install
pnpm --filter @zoto-agents/zoto-cursor-top install-local
```

`install-local` auto-builds `dist/` when missing. Use `/zoto-cursor-top-init`
inside Cursor for the same flow, or `pnpm install-local` from
`plugins/zoto-cursor-top/`.

### Published npm package (optional)

To use the CLI without init, install the package globally (once published):

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
cursor-top --theme ocean  # blue/cyan accent palette (TUI only)
cursor-top --density compact  # agent row lines only (no title/log tail)
cursor-top --filter "status:running repo:app"  # narrow tree (TUI + --once/--json)
cursor-top --bell         # ring terminal bell on finished / failed events (TUI only)
cursor-top --detail-lines 40  # deep tail depth for the d-key detail pane (TUI only)
cursor-top --help         # show all flags
```

| Flag | Default | Description |
|------|---------|-------------|
| `--theme <name>` | `default` | TUI colour palette: `default`, `mono`, `high-contrast`, `ocean`, `forest`, `sunset`, `solarized`, `dracula`, `party`, `kawaii`, `cyber`, `retro`, `wizard`. The last five add emoji/unicode decor (TUI only). Unknown names warn and fall back to `default`. `NO_COLOR` forces `mono`. Does not affect `--once` / `--json`. |
| `--density <level>` | `comfortable` | Layout density: `compact` (row only), `cozy` (row + title), `comfortable` (row + title + log tail). Applies to the TUI and `--once`. |
| `--filter "<query>"` | _(none)_ | Filter by scoped tokens (`repo:`, `model:`, `status:`) and/or free text (AND-combined, case-insensitive). Pre-seeds the interactive filter; applies to `--once` and `--json` before output. |
| `--bell` | off | Ring the terminal bell on finished / failed lifecycle events in the interactive TUI only (at most one bell per refresh tick). Ignored for `--once`, `--json`, and non-TTY stdout. |
| `--detail-lines <n>` | `25` | Deep log tail depth for the **`d`** detail pane (minimum 1). Interactive TUI only; does not change per-row **`--lines`** tails. |

### Keyboard

| Key | Action |
|-----|--------|
| `↑` / `↓` or `j` / `k` | move selection |
| `→` / `Enter` or `l` | expand selected node |
| `←` or `h` | collapse selected node |
| `e` | expand all |
| `c` | collapse all |
| `r` | force refresh |
| `p` or space | pause / resume auto-refresh |
| `t` | cycle colour theme (13 palettes; `party` … `wizard` add emoji decor) |
| `y` | cycle layout density (`comfortable` → `compact` → `cozy`) |
| `/` | open filter bar (`repo:` / `model:` / `status:` tokens + free text; Enter apply, Esc clear) |
| `d` | toggle detail pane for selected row (shows full metadata + deep log tail; Esc closes pane first) |
| `i` | toggle lifecycle event strip and `!` diagnostic lines (default off) |
| `o` | toggle log tail order (default oldest-first; status shows `· logs newest` when reversed) |
| `?` | toggle in-app help (keyboard shortcuts + `!` diagnostic glossary) |
| `q` or `Ctrl-C` | quit |

### Inside Cursor

This plugin also registers:

- The slash command `/zoto-cursor-top-init` - one-time CLI build and PATH
  setup after marketplace install (run once before the TUI).
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

### Caching and refresh cadence (interactive TUI)

The live TUI creates **one** collector before `render()` and reuses it on
every refresh tick (including manual `r`). Each tick:

- **Fast lane** — `ps` scan for liveness; `stat` every transcript for
  mtime-derived status; re-tail only log files whose `(mtimeMs, size)`
  changed.
- **Slow lane** (tick 1 and every 5th tick) — re-walk session JSON, refresh
  workspace/`agent-transcripts` enumeration, retry unresolved composer-model
  ids, refresh slug maps.

Session files, log tails, and composer lookups are cached between ticks;
unchanged sources cost `stat` only (no `readFile` / `readWindow`). Fs work
is capped at 24 concurrent operations. `--once` and `--json` still run a
single cold collect in a fresh process — their default output is unchanged.

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
pnpm bench          # vitest bench (collector + render; see bench/BASELINE.md)
pnpm validate       # structural validation
pnpm build          # tsup -> dist/cli.js
pnpm start          # run via tsx
pnpm demo           # run --demo via tsx
```

**Benchmarks:** `pnpm bench` runs scale fixtures at tiers S/M/L and prints
per-tier `[fs-ops]` tables during setup. Canonical before/after numbers live
in [`bench/BASELINE.md`](./bench/BASELINE.md). For a fast warm-tick sample
without the full bench loop, use `pnpm exec tsx bench/quick-warm-metrics.mjs`.
For windowed render timings, use `pnpm exec tsx bench/quick-render-window.mjs`.

Project layout:

```
plugins/zoto-cursor-top/
├── .cursor-plugin/plugin.json
├── agents/zoto-cursor-top-troubleshooter.md
├── bin/cursor-top.mjs                # global-install entry point
├── commands/zoto-cursor-top.md
├── commands/zoto-cursor-top-init.md
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
