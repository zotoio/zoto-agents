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

### Step 0: Ensure the CLI is installed

Marketplace installs do not build `dist/cli.js` or put `cursor-top` on PATH.
Before launching, check `command -v cursor-top` or
`~/.cursor/plugins/zoto-cursor-top/dist/cli.js`. When neither exists, tell the
user to run `/zoto-cursor-top-init` once, then retry.

Monorepo developers can instead run
`pnpm --filter @zoto-agents/zoto-cursor-top install-local` from the repo root.

### Step 1: Pick a Mode

| Goal | Flag | Notes |
|------|------|-------|
| Live monitor in a terminal | (none) | Default 1-second refresh; press `q` to quit. |
| Preview the UI without any Cursor session running | `--demo` | Synthetic data, log lines scroll on every tick. |
| Capture a static snapshot in the terminal | `--once` | Renders one frame to stdout and exits. |
| Feed another tool | `--json` | Machine-readable snapshot, identical schema as the TUI. |
| Faster refresh (heavy use) | `--interval 500` | Minimum 200ms. |
| Tail more log context | `--lines 5` | Default 3. |
| Low-vision / washed-out terminal | `--theme high-contrast` | Bright variants, no dimming. |
| No colour (CI, logs, accessibility) | `--theme mono` or set `NO_COLOR` | Monochrome; `NO_COLOR` forces mono regardless of `--theme`. |
| Dense overview (many agents) | `--density compact` | Agent row only; hides title and log tail. |
| Title without log noise | `--density cozy` | Row + title; omits log tail. |
| Narrow to running agents | `--filter "status:running"` | Works with `--once` / `--json` in agent shells. |
| Find by repo or model | `--filter "repo:my-app model:claude"` | Scoped tokens AND-combine with free text. |
| Audible completion signal | `--bell` | Terminal bell on finished / failed events (TUI only). |
| Deep log context in detail pane | `--detail-lines 40` | Default 25; press **`d`** on a row (TUI only). |

### Step 2: Launch

```bash
cursor-top                 # live TUI
cursor-top --demo          # demo mode
cursor-top --once          # snapshot, formatted
cursor-top --json --once   # snapshot, JSON
cursor-top --theme ocean --density compact  # accent palette + compact rows
cursor-top --demo --json --filter "status:running"  # filtered JSON snapshot
```

If `cursor-top` is not on `PATH` after init, prefer re-running
`/zoto-cursor-top-init` (or checking `~/.local/bin` is on PATH). Use npx only
when the published npm package is intentional:

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
| `t` | Cycle colour theme (13 palettes; `party` … `wizard` add emoji/unicode decor). |
| `y` | Cycle layout density (`comfortable` → `compact` → `cozy`). |
| `/` | Open the filter bar. Type scoped tokens (`repo:`, `model:`, `status:`) and/or free text; **Enter** commits, **Esc** clears. |
| `d` | Toggle the detail pane for the selected row (full metadata + deep log tail). **Esc** closes the pane before clearing a filter. |
| `q` (or `Ctrl-C`) | Quit. |

### Step 4: Filter (optional)

Use **`--filter "<query>"`** for one-shot snapshots in agent shells, or press
**`/`** in the live TUI:

- **`repo:<text>`** — match the node's repo / workspace field (substring,
  case-insensitive). Nodes with `repo: null` never match a scoped repo token.
- **`model:<text>`** — match the model field (substring). `model: null` never
  matches.
- **`status:<name>`** — exact match on `running`, `waiting`, `idle`, `done`,
  `error`, or `unknown`.
- **Bare terms** — match label, title, repo, model, or any recent log line.

Multiple terms AND-combine. Matching nodes keep their ancestor chain so the
tree stays navigable; non-matching siblings under a matched parent are hidden.

### Step 5: Interpret Each Row

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
`--lines`) when density is `comfortable` (the default). Use `--density cozy`
for title-only rows or `--density compact` for the status row alone.

Press **`d`** on a selected row to open the **detail pane**: a bottom split
with untruncated metadata and a deep log tail (**`--detail-lines`**, default
25). Demo nodes without a real `logSource` show the row's `recentLogs`
instead. While the pane is open, **`↑/↓`** moves selection and the pane
follows.

### Step 5b: Event strip (interactive TUI)

On each refresh the TUI diffs the previous snapshot against the new one and
shows the most recent lifecycle transitions above the footer:

- **`✓ … finished`** — agent reached `done`, or vanished under `--active-only`
  while still running / waiting / idle.
- **`✗ … failed`** — status transitioned to `error`.
- **`⏸ … waiting`** — agent needs user input (`waiting`).
- **`+ … appeared`** — a new node showed up in the tree.

Rows whose status just changed stay accent-highlighted for ~5 seconds. Pass
**`--bell`** for a terminal bell on finished / failed events (TUI only; at
most one bell per tick). Event data is **not** in `--json` output today.

### Step 6: Handle Empty Results

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
