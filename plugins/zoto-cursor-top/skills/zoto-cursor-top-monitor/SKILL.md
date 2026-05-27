---
name: zoto-cursor-top-monitor
description: Guided workflow for launching and interpreting the cursor-top TUI. Covers process discovery, hierarchy expansion, log tail interpretation, and recommended flags for different scenarios. Use when the user wants to monitor every Cursor agent on their machine in real time, or to capture a snapshot for a report.
---

# Cursor Top Monitor

Guided workflow for using the `cursor-top` CLI to monitor every Cursor agent
on the current machine.

## When to Use

Use this skill when the user wants to:

- See, in one place, every Cursor IDE window, `cursor-agent` CLI session, and
  Cloud Agent VM currently running on this machine.
- Expand a parent agent (an IDE window or a CLI session) to see the
  subagents it has spawned, and the last few log lines of each.
- Capture a one-off snapshot of agent activity for a report or for piping
  into another tool.

Do **not** use this skill when the user only wants information about a single
agent or a single conversation - read the relevant session file directly
instead.

## Workflow

### Step 1: Pick a Mode

| Goal | Flag | Notes |
|------|------|-------|
| Live monitor in a terminal | (none) | Default 1-second refresh; press `q` to quit. |
| Preview the UI without any Cursor session running | `--demo` | Synthetic data, log lines scroll on every tick. |
| Capture a static snapshot in the terminal | `--once` | Renders one frame to stdout and exits. |
| Feed another tool | `--json` | Machine-readable snapshot, identical schema as the TUI. |
| Faster refresh (heavy use) | `--interval 500` | Minimum 200ms. |
| Tail more log context | `--lines 5` | Default 3. |

### Step 2: Launch

```bash
cursor-top                 # live TUI
cursor-top --demo          # demo mode
cursor-top --once          # snapshot, formatted
cursor-top --json --once   # snapshot, JSON
```

If `cursor-top` is not on `PATH`, run via npx:

```bash
npx -p @zoto-agents/zoto-cursor-top cursor-top --demo
```

### Step 3: Navigate the TUI

| Key | Action |
|-----|--------|
| `↑` / `↓` (or `j` / `k`) | Move the selection. |
| `→` / `Enter` (or `l`) | Expand the selected node to show subagents. |
| `←` (or `h`) | Collapse the selected node. |
| `e` | Expand all nodes. |
| `c` | Collapse all nodes. |
| `r` | Force a refresh now (works even while paused). |
| `p` (or space) | Pause / resume the auto-refresh loop. |
| `q` (or `Ctrl-C`) | Quit. |

### Step 4: Interpret Each Row

Each visible row carries:

- **TYPE badge** (`IDE`, `CLI`, `CLD`, `SUB`) - the surface this agent runs on.
- **PID** - the OS process id (blank for subagents that share their parent's
  process).
- **AGENT label** - `main` for a root, `Task(<subagentType>)` for subagents.
- **MODEL** - the LLM the agent is using right now (e.g. `claude-opus-4.7`).
- **REPO** - the working directory or workspace root.
- **START (elapsed)** - wall-clock start time and elapsed duration.
- **STATUS** - colour-coded current state (`running`, `waiting`, `idle`,
  `done`, `error`).

The block under each row shows the **last 3 log lines** (configurable with
`--lines`). These scroll as the agent writes new log entries.

### Step 5: Handle Empty Results

If the TUI shows zero rows or rows are missing data:

1. Read the diagnostics block at the bottom of the TUI.
2. Run `cursor-top --json --once` and inspect the `diagnostics` array.
3. Hand off to the `zoto-cursor-top-troubleshooter` agent with the JSON
   output attached.

## Conventions

- The TUI is read-only - it never edits Cursor's data files.
- Refresh interval is bounded to `>= 200ms` to avoid pegging the CPU.
- Hierarchy is built from explicit session metadata first and the OS process
  tree second; root-level subagents always indicate missing metadata.

## What NOT to Do

- Do not try to use `cursor-top` to *control* an agent - it only observes.
- Do not parse the TUI output programmatically - use `--json` for that.
- Do not assume the on-disk session schema is stable; rely on the CLI to
  normalise it.
- Do not run with `--interval` below 200ms - the CLI clamps to that minimum
  anyway and very low intervals just burn CPU without adding visible
  information.
