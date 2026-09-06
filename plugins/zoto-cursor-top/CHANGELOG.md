# Changelog

All notable changes to this plugin are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`cursor-top tail`** live-tails billed Cursor usage events from
  `POST /teams/filtered-usage-events` (`-n`, `-f`, `-p`, `--json`, `--hours`,
  `--email`). Requires `CURSOR_ANALYTICS_API_KEY` (Admin `read:e`) or
  `CURSOR_API_KEY` plus a resolvable email.
- **Billed COST column** in the TUI / `--once` table when an analytics key
  is available. In-flight conversations show the running total across unique
  requests (a rewritten in-flight request replaces its previous totals
  instead of stacking). The header prints the lookback-window spend.
  `--no-usage-api` disables the client. Default output is unchanged when no
  key is configured.

- Five playful TUI themes with emoji badges, status glyphs, and funky titles:
  `party`, `kawaii`, `cyber`, `retro`, and `wizard`. Decor applies in the
  interactive TUI only; `--once` / `--json` stay plain ASCII.

- `/zoto-cursor-top-init` command for one-time CLI setup after marketplace
  install (builds `dist/`, runs `install-local`, symlinks `cursor-top` onto
  PATH). `/zoto-cursor-top` and the monitor skill gate on init when the binary
  is missing.

- New `sdk` agent kind (badge `SDK`, category "SDK Agents"). Transcripts under
  ephemeral `tmp-*` workspace slugs are headless `@cursor/sdk` agents (eval
  runners, scripted agents) running locally; they were previously mislabelled
  as Cloud Agents. `CLD` is now reserved for the Cloud Agents API and
  `exec-daemon` VMs.

- Instant TUI startup: the app renders an empty skeleton and fires the first
  collector tick immediately instead of blocking for the initial filesystem
  walk. `--once` / `--json` still await the full snapshot.

### Fixed

- **Unit tests hit the live Cloud Agents API.** `createCollector` defaulted `cloudApi` to `{}`, so with `CURSOR_API_KEY` exported every slow-lane tick in `tests/collector*.test.ts` made a real 10 s-timeout HTTPS call (2–4 s per case, three timeouts). The cloud client is now off under Vitest unless a test passes `cloudApi` explicitly, mirroring the existing usage-API guard.
- **`tsc --noEmit` is clean again** (19 errors): `allowJs` for the JSDoc-typed `scripts/*.mjs` helpers, widened literal-typed accumulators in `format.ts`, a complete `AgentNode` fixture, an `initialPaused` prop for `App` (the events test passed a non-existent `paused` prop), and `as unknown as WriteStream` casts in the terminal test.
- **Process classification regressions.** Electron sub-processes are now
  classified by their `--type=` flag *before* the binary path is inspected, so
  Linux children (`/usr/share/cursor/cursor --type=renderer|gpu-process|
  utility|zygote|broker`) no longer all appear as "Cursor IDE". Utility
  sub-types map to "extension host", "node service", "network service",
  "audio service".
- macOS helper binaries whose path contains spaces
  (`Cursor Helper (GPU).app/…/Cursor Helper (GPU)`) and Windows
  `C:\Program Files\cursor\Cursor.exe` are recognised again: `extractBinaryPath`
  keeps `.app/` bundle paths and `.exe` paths intact instead of splitting on
  the first space, and the binary matchers accept backslash separators.
- `install-local` / `uninstall-local` now target the shared zoto location
  `~/.cursor/plugins/local/zoto-cursor-top/` (previously
  `~/.cursor/plugins/zoto-cursor-top/`), removing any legacy copy so the
  plugin is not loaded twice. The `cursor-top` PATH symlink follows.

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
