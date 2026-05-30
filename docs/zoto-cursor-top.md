# zoto-cursor-top

Thin index for the [zoto-cursor-top](../plugins/zoto-cursor-top/) plugin.

## What it does

A live, `htop`-style CLI that lists **every Cursor agent on the current machine** — IDE windows, `cursor-agent` CLI sessions, and Cloud Agent VMs — in one expandable tree. Parent agents expand to reveal their subagents, and every row shows the start time, elapsed duration, model, repo (working directory), status, and the last few log lines scrolling live.

- **Cross-process visibility** — Cursor IDE, `cursor-agent` CLI, and Cloud Agent VM exec daemons in one view.
- **Parent / subagent hierarchy** — subagents spawned via the `Task` tool nest under their parent in a collapsible tree.
- **Three output modes** — interactive TUI, `--once` for a one-shot frame, and `--json` for machine-readable snapshots.
- **No native deps** — works on macOS, Linux, and Windows using only `ps` / PowerShell and the standard library.

## Usage

```bash
cursor-top                # interactive live TUI (default 1s refresh)
cursor-top --demo         # synthetic fixture, no Cursor required
cursor-top --once         # render one frame to stdout and exit
cursor-top --json         # emit one snapshot as JSON and exit
cursor-top --interval 500 # refresh every 500ms (minimum 200ms)
cursor-top --lines 5      # tail 5 log lines per agent (default 3)
```

## Read more

- Plugin README: [plugins/zoto-cursor-top/README.md](../plugins/zoto-cursor-top/README.md)
- Command: `/zoto-cursor-top` (launches the TUI in the active terminal).
- Skill: `plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/SKILL.md`.
- Agent: `zoto-cursor-top-troubleshooter` — diagnoses missing rows or empty log tails.
- Rule: `plugins/zoto-cursor-top/rules/zoto-cursor-top.mdc`.
