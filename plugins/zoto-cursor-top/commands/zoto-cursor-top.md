---
name: zoto-cursor-top
description: Open the live updating htop-style CLI that lists every Cursor agent on this machine, with expandable parent-to-subagent hierarchy and scrolling log tails.
---

# zoto-cursor-top

Open the `cursor-top` TUI - a live updating htop for every Cursor agent on
this machine (IDE windows, `cursor-agent` CLI sessions, and Cloud Agent VMs).
Each row shows start time, model, repo, and the last 3 log lines, and parent
agents are expandable to reveal their subagents.

## Usage

```
/zoto-cursor-top                  - Open the live TUI (active agents only, Cursor + agent-output filter)
/zoto-cursor-top --demo           - Open with synthetic data (no Cursor required)
/zoto-cursor-top --once           - Render one frame and exit
/zoto-cursor-top --json           - Emit current snapshot as JSON and exit
/zoto-cursor-top --interval 500   - Refresh every 500ms instead of 1s
/zoto-cursor-top --lines 5        - Tail 5 log lines per agent
/zoto-cursor-top --no-active-only - Include "done" agents (post-mortem view)
/zoto-cursor-top --no-with-logs   - Show every Cursor process, even silent ones
/zoto-cursor-top --no-cursor-only - Include unrelated bash / node / shell processes
/zoto-cursor-top --theme ocean       - Blue/cyan accent palette (TUI only)
/zoto-cursor-top --density compact   - Agent row lines only (omit title + log tail)
/zoto-cursor-top --filter "status:running"  - Narrow tree (TUI + --once/--json)
/zoto-cursor-top --bell                   - Ring terminal bell on finished / failed events (TUI only)
/zoto-cursor-top --detail-lines 40        - Deep log tail for the d-key detail pane (TUI only)
```

### Filter / search

- **`--filter "<query>"`** — Scoped tokens: `repo:<text>`, `model:<text>`,
  `status:<running|waiting|idle|done|error|unknown>`. Bare terms match label,
  title, repo, model, and log lines (AND-combined, case-insensitive). Pre-seeds
  the interactive filter bar; also applies before `--once` / `--json` output.
  Matching nodes keep their ancestor chain; non-matching siblings are hidden.
  A scoped match on a parent does **not** auto-include non-matching children.
- In the interactive TUI, press **`/`** to open the filter bar. Printable keys
  append, Backspace deletes, **Enter** commits, **Esc** clears and closes.

### Theme and density

- **`--theme <name>`** — Colour palette for the interactive TUI:
  `default` | `mono` | `high-contrast` | `ocean` | `forest` | `sunset` |
  `solarized` | `dracula` | `party` | `kawaii` | `cyber` | `retro` | `wizard`.
  The last five add emoji/unicode decor (TUI only). Unknown names warn on stderr
  and fall back to `default`. A non-empty `NO_COLOR` env var forces `mono`.
  Does not affect `--once` or `--json` output.
- **`--density <level>`** — Layout detail per agent row: `compact` (row only),
  `cozy` (row + title), `comfortable` (row + title + log tail; default).
  Applies to the TUI and `--once`; log-tail length stays `--lines`-driven.
- In the interactive TUI, press **`t`** to cycle themes and **`y`** to cycle
  density. These keys are reserved and do not clash with navigation (`↑↓jk l h
  e c r p q space enter`), the filter key (`/` — Enter apply, Esc clear), or the
  detail pane (`d`, `Esc` closes pane before clearing filter).

### Detail pane

- Press **`d`** on a selected row to toggle a bottom split with full metadata
  and a deep log tail (default 25 lines, **`--detail-lines <n>`**).
- Loaded lazily for the selected node only; the main tree still uses
  **`--lines`** (default 3). Demo nodes without `logSource` show `recentLogs`.
- **`Esc`** closes the pane before clearing an active filter. **`↑/↓`** moves
  selection while open and the pane follows.

### Event strip and bell

- The interactive TUI diffs each refresh against the prior snapshot and shows
  the most recent lifecycle transitions in a strip above the footer (`✓`
  finished, `✗` failed, `⏸` waiting / needs input). Rows whose status just
  changed stay accent-highlighted for ~5 seconds.
- **`--bell`** — ring the terminal bell on finished / failed events (at most
  one bell per tick). TUI-only; ignored for `--once`, `--json`, and non-TTY
  stdout. Event data is **not** included in `--json` output today.

## Prerequisites

The compiled CLI must be on PATH before this command can launch the TUI.
Marketplace installs do **not** run the build step automatically.

**Initialisation gate:** before opening a terminal, check whether `cursor-top`
resolves on PATH (`command -v cursor-top` or platform equivalent) **or**
`~/.cursor/plugins/zoto-cursor-top/dist/cli.js` exists. If **neither** is true,
**stop** and tell the user exactly:

> Cursor Top CLI is not installed. Run `/zoto-cursor-top-init` first to build
> the CLI, install runtime dependencies, and put `cursor-top` on PATH.

Do not fall through to `npx` until init has been offered; `npx` is only for
users who explicitly cannot run init and need the published npm package.

## Instructions

When this command is invoked:

1. Open a terminal in the user's workspace.
2. Run `cursor-top` plus the arguments passed via `$ARGUMENTS`. Use
   `npx -p @zoto-agents/zoto-cursor-top cursor-top` only when the user has
   confirmed they are using the published npm package instead of
   `/zoto-cursor-top-init`.
   The CLI defaults to `--cursor-only --with-logs --active-only`:
     * `--cursor-only` keeps the view focused on Cursor processes (IDE, CLI,
       Cloud Agent VM) and their PID descendants.
     * `--with-logs` further restricts the view to nodes that produced
       readable agent output (the ancestor chain of any log-emitting node
       stays so the tree remains navigable). This is what hides bare IDE
       renderer / GPU helper rows that don't host any chat.
     * `--active-only` hides nodes whose status is `"done"`, plus any parent
       whose subtree contains only done agents. A done parent with at least
       one active child is kept so the tree stays navigable.
   Pass `--no-cursor-only` in `$ARGUMENTS` to include unrelated bash / node
   shells, `--no-with-logs` to see every Cursor process even if it has
   never written to a session log, or `--no-active-only` to surface
   completed agents alongside live ones.
3. If discovery reports no Cursor processes, spawn the
   `zoto-cursor-top-troubleshooter` agent to diagnose data-source issues.
4. If the user asks for a static snapshot (for a report, screenshot, or paste),
   prefer `--once` (formatted) or `--json` (machine-readable) so the command
   exits cleanly without holding the terminal.

### Argument handling

- **No arguments**: Launch the interactive TUI with default 1-second refresh,
  `--cursor-only` (strict Cursor filter), `--with-logs` (only show nodes
  with readable agent output), and `--active-only` (hide finished agents).
- **`--demo`**: Launch in demo mode. Useful for documentation screenshots and
  for users who have not yet started any Cursor session.
- **`--once` or `--json`**: One-shot output, suitable for piping or capturing.
- **`--no-cursor-only`**: Disable the strict Cursor filter — show every
  process the discovery layer can see, including unrelated shells.
- **`--no-with-logs`**: Disable the log-output filter — show every Cursor
  process whether or not it has produced any agent output.
- **`--no-active-only`**: Disable the active-only filter — include agents
  whose status is `"done"` for post-mortem inspection.
- **`--theme <name>`**: Colour palette for the interactive TUI (`default`,
  `mono`, `high-contrast`, `ocean`, `forest`, `sunset`, `solarized`,
  `dracula`). Unknown names warn and fall back to
  `default`. A non-empty `NO_COLOR` env var forces `mono`. Does not affect
  `--once` or `--json` output.
- **`--density <level>`**: Layout density (`compact`, `cozy`, `comfortable`;
  default `comfortable`). Governs which body lines render under each agent
  row in the TUI and in `--once` output. Log-tail length stays
  `--lines`-driven.
- **`--filter "<query>"`**: Narrow the agent tree by repo, model, status, or
  free text. Useful with `--once` / `--json` in agent shells for scripted
  snapshots. Pre-seeds the interactive filter when opening the live TUI.
- **Other flags**: Pass `$ARGUMENTS` straight through to the CLI.

### What happens

1. The CLI enumerates Cursor processes (IDE, CLI, Cloud Agent VM) via `ps`.
2. It reads session metadata from the standard Cursor data directories.
3. It builds the parent-to-subagent hierarchy from session metadata, falling
   back to the process tree when metadata is missing.
4. It tails the last N log lines for each agent.
5. The Ink TUI refreshes the table on a fixed interval.

## Related

- `/zoto-cursor-top-init` - one-time CLI build + PATH setup after marketplace install
- `zoto-cursor-top-monitor` skill - guided usage and interpretation of the TUI
- `zoto-cursor-top-troubleshooter` agent - diagnose missing rows or empty logs
