# Changelog

All notable changes to this plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Five playful TUI themes with emoji badges, status glyphs, and funky titles:
  `party`, `kawaii`, `cyber`, `retro`, and `wizard`. Decor applies in the
  interactive TUI only; `--once` / `--json` stay plain ASCII.

- `/zoto-cursor-top-init` command for one-time CLI setup after marketplace
  install (builds `dist/`, runs `install-local`, symlinks `cursor-top` onto
  PATH). `/zoto-cursor-top` and the monitor skill gate on init when the binary
  is missing.

## [0.2.0] - 2026-06-11

### Added

- Colour theme engine with eight built-in palettes: `default`, `mono`,
  `high-contrast`, `ocean`, `forest`, `sunset`, `solarized`, and `dracula`.
  Switch via `--theme <name>` or the `t` key
  in the interactive TUI. A non-empty `NO_COLOR` environment variable forces
  `mono` per the [no-color.org](https://no-color.org/) convention.
- Layout density levels: `compact` (agent row only), `cozy` (row + title),
  and `comfortable` (row + title + log tail — unchanged default). Switch via
  `--density <level>` or the `y` key. Log-tail line count stays
  `--lines`-driven at every density.
- `--once` respects `--density` (omits title/log body lines at lower
  densities); default `--once` output is byte-identical to pre-0.2.0.
  `--json` is unaffected by theme or density.
- **Filter / search.** `--filter "<query>"` and the `/` key narrow the agent
  tree by repo, model, status, and free text. Scoped tokens AND-combine with
  bare terms; matching nodes keep ancestor chains. Applies to the interactive
  TUI (pre-seeds the filter bar), `--once`, and `--json`. Default output
  without `--filter` is unchanged.
- **Lifecycle event strip (TUI only).** Diffs consecutive snapshots and
  shows the most recent finished / failed / waiting / appeared transitions
  in a themed strip above the footer; rows whose status just changed stay
  accent-highlighted for ~5 s. **`--bell`** rings the terminal on finished /
  failed events. Event data is not emitted in `--json` today (future additive
  extension).
- **Collector caching (interactive mode).** One persistent collector per TUI
  session with mtime/size-gated caches for session JSON, log tails
  (`FsLike.readWindow` seam), composer-model lookups, and slug maps. Fast
  lane every tick (process scan, transcript stats, new-transcript scan,
  changed-log re-tails); slow lane every 5 ticks (session re-walk, sqlite
  retries). Bounded fs concurrency (24 parallel ops). `--once` /
  `--json` still use a single cold collect in a fresh process — default
  output unchanged.
- **Detail pane (interactive TUI).** Press **`d`** on a selected row to open
  a bottom split with full metadata and a deep log tail (default 25 lines,
  **`--detail-lines`**). Loaded lazily for one node at a time with its own
  mtime/size cache; main-view tick cost is unchanged while the pane is
  closed. Demo / process-only nodes without `logSource` show `recentLogs`.
  **`Esc`** closes the pane before clearing a filter; **`↑/↓`** moves
  selection and the pane follows.
- **Viewport windowing (interactive TUI).** Renders only the terminal-height
  slice of the agent tree with **`↑ N more`** / **`↓ N more`** overflow
  indicators and selection-follow scrolling. Row memoisation and quantised
  elapsed strings bound per-second clock updates to the visible window.
  **`--once`** / **`--json`** output unchanged (full tree, no indicators).

### Fixed

- New agent chats appear on the next refresh tick instead of waiting up to
  ~4 s for the collector slow lane. Fast-lane ticks now re-enumerate
  transcript roots and scan for new transcript files; `--with-logs` no
  longer hides brand-new chats before their first message is written.
- Table columns resize to the terminal width with a flexible AGENT column;
  START, STATUS, and TOKENS are padded so every row aligns vertically with
  the header (fixes the staggered REPO/STATUS layout on wide terminals).
- REPO column shows `owner/repo` (no `github.com/` prefix) and receives a
  larger share of horizontal flex space (min width 20 cols, up to 48).
- Interactive TUI preferences (theme, density, info strip) persist across
  sessions in `~/.zoto/cursor-top.json`. Explicit `--theme` / `--density`
  flags override saved values for that launch.

## [0.1.0] - 2026-05-16

### Added

- Initial release of `zoto-cursor-top`.
- `cursor-top` CLI binary - live updating htop-style TUI of every Cursor agent
  on the machine.
- Process discovery for Cursor IDE, the `cursor-agent` CLI, and Cursor Cloud
  Agent VMs (Linux / macOS / Windows).
- Session metadata reader: start time, model, repository, status.
- Parent-to-subagent hierarchy via session metadata, with `ppid` fallback.
- Per-row scrolling tail of the last 3 log lines for every agent.
- Expand / collapse, follow mode, refresh interval controls, and keyboard
  navigation.
- `--demo` mode for offline previews and screenshotting.
- `--json` and `--once` modes for scripting and CI integration.
- `/zoto-cursor-top` slash command, `zoto-cursor-top-monitor` skill, and
  `zoto-cursor-top-troubleshooter` agent for in-Cursor invocation and
  troubleshooting.
