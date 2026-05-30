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
```

## Instructions

When this command is invoked:

1. Open a terminal in the user's workspace.
2. Run `cursor-top` (or `npx -p @zoto-agents/zoto-cursor-top cursor-top` if the
   binary is not on PATH) plus the arguments passed via `$ARGUMENTS`.
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
- **Other flags**: Pass `$ARGUMENTS` straight through to the CLI.

### What happens

1. The CLI enumerates Cursor processes (IDE, CLI, Cloud Agent VM) via `ps`.
2. It reads session metadata from the standard Cursor data directories.
3. It builds the parent-to-subagent hierarchy from session metadata, falling
   back to the process tree when metadata is missing.
4. It tails the last N log lines for each agent.
5. The Ink TUI refreshes the table on a fixed interval.

## Related

- `zoto-cursor-top-monitor` skill - guided usage and interpretation of the TUI
- `zoto-cursor-top-troubleshooter` agent - diagnose missing rows or empty logs
