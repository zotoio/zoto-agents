/**
 * Entrypoint for the `cursor-top` CLI.
 *
 * Parses a tiny set of flags by hand (no argument-parser dependency to keep
 * the install footprint low), wires the collector to the Ink UI, and
 * supports three modes:
 *
 *   * interactive (default) - live updating TUI
 *   * `--once`              - render one frame and exit (useful for
 *                             screenshots and CI smoke tests)
 *   * `--json`              - emit the current snapshot as JSON and exit
 *   * `--demo`              - use the synthetic fixture instead of real
 *                             process / session data
 *
 * When stdout is not a TTY (e.g. Cursor agent shells, CI logs, piped
 * output), the default mode is auto-promoted to `--once` so the snapshot
 * actually reaches the caller instead of Ink rendering into the void.
 * Use `--no-auto-once` to opt out of that promotion.
 */

import React from "react";
import { render } from "ink";
import { createCollector } from "./discovery/collector.js";
import { demoSnapshot } from "./discovery/demo.js";
import { filterSnapshot } from "./filter.js";
import {
  argvNamesFlag,
  loadCursorTopPrefs,
  resolveStartupPrefs,
} from "./prefs.js";
import { App } from "./ui/App.js";
import { renderText } from "./ui/render-text.js";
import {
  normalizeThemeName,
  resolveDensity,
  type Density,
} from "./ui/theme.js";
import type { AgentSnapshot } from "./types.js";

/** Semver string printed by `--version` (keep in sync with package.json). */
export const CLI_VERSION = "0.2.0";

export interface CliOptions {
  demo: boolean;
  once: boolean;
  json: boolean;
  intervalMs: number;
  logLines: number;
  help: boolean;
  version: boolean;
  noAutoOnce: boolean;
  cursorOnly: boolean;
  withLogs: boolean;
  activeOnly: boolean;
  transcriptMaxAgeHours: number;
  /** Colour theme name (TUI only; `--once`/`--json` output stays colour-free). */
  theme: string;
  /** Layout density: which body lines render under each agent row. */
  density: Density;
  /** Filter query (scoped tokens + free text); empty means no filter. */
  filter: string;
  /** Ring terminal bell on finished / failed lifecycle events (TUI only). */
  bell: boolean;
  /** Deep log tail line count for the detail pane (TUI only; default 25). */
  detailLines: number;
}

const HELP = `cursor-top - live updating htop for every Cursor agent on this machine

Usage:
  cursor-top [options]

Options:
  --demo                Render a synthetic fixture (no Cursor required)
  --once                Render one frame to stdout and exit
  --json                Print the current snapshot as JSON and exit
  --interval <ms>       Refresh interval in ms (default 1000)
  --lines <n>           Tail this many log lines per agent (default 3)
  --cursor-only         Show only processes recognised as Cursor (IDE, CLI,
                        Cloud Agent VM) plus their PID descendants (default).
                        Drops unrelated bash / node / shell processes that
                        snuck into the view via session metadata.
  --no-cursor-only      Include unrelated bash / node / shell processes.
  --with-logs           Hide nodes that did not produce readable agent
                        output (default). Ancestor chains are preserved
                        so the surviving rows still sit under their
                        parent agent. Filters out the dozens of
                        renderer / GPU helper processes per IDE window.
  --no-with-logs        Disable the --with-logs filter; show every
                        Cursor process even when it never wrote a log.
  --active-only         Hide nodes whose status is "done" (default).
                        A parent whose subtree contains only done
                        agents is also hidden, but a done parent that
                        still has at least one active child is kept so
                        the tree stays navigable.
  --no-active-only      Include "done" agents alongside running /
                        waiting / idle ones. Useful for post-mortem
                        inspection of a recently-finished chat.
  --transcript-max-age <h>
                        Drop agent-transcript records whose source file
                        has not been touched in the last <h> hours
                        (default 24). Use 0 to disable the cap and
                        surface every historical chat.
  --theme <name>        Colour theme for the TUI: default | mono |
                        high-contrast | ocean | forest | sunset |
                        solarized | dracula | party | kawaii | cyber |
                        retro | wizard (default "default").
                        Unknown names warn and fall back to default.
                        A non-empty NO_COLOR env var forces mono.
                        --once / --json output is always colour-free.
  --density <level>     Layout density: compact (agent row only) |
                        cozy (row + title) | comfortable (row + title +
                        log tail; default). Log-tail length stays
                        --lines-driven. Applies to the TUI and --once.
  --filter "<query>"    Narrow the agent tree by repo, model, status, or
                        free text. Scoped tokens: repo:<text>, model:<text>,
                        status:<running|waiting|idle|done|error|unknown>.
                        Bare terms match label, title, repo, model, and log
                        lines (AND-combined, case-insensitive). Pre-seeds the
                        interactive filter bar; also applies to --once and
                        --json before output. Matching nodes keep their
                        ancestor chain; non-matching siblings are hidden.
  --bell                Ring the terminal bell on finished / failed agent
                        lifecycle events (interactive TUI only; default off).
                        At most one bell per refresh tick. Ignored for
                        --once, --json, and non-TTY stdout.
  --detail-lines <n>    Lines to tail in the detail pane when you press d
                        (default 25, minimum 1). Interactive TUI only; does
                        not change the per-row --lines tail in the tree.
  --no-auto-once        Force interactive TUI even when stdout is not a TTY
                        (default: non-TTY contexts auto-promote to --once)
  -h, --help            Show this help and exit
  -v, --version         Show CLI version and exit

Keyboard (interactive mode):
  ↑/↓ or j/k    move selection
  →/Enter/l     expand selected node
  ←/h           collapse selected node
  e / c         expand / collapse all
  r             force refresh (works even while paused)
  p / space     pause / resume auto-refresh
  t             cycle colour theme (default → mono → … → wizard → default)
  y             cycle layout density (comfortable → compact → cozy)
  /             open filter bar (repo:/model:/status: tokens + free text)
  d             toggle detail pane for selected row (Esc closes pane first)
  i             toggle lifecycle events + ! diagnostics strip (default off)
  o             toggle log tail order (default oldest-first)
  ?             toggle in-app help (keyboard + ! diagnostic glossary)
  q             quit
`;

export function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    demo: false,
    once: false,
    json: false,
    intervalMs: 1000,
    logLines: 3,
    help: false,
    version: false,
    noAutoOnce: false,
    // Opinionated UX defaults — match the `/zoto-cursor-top` slash
    // command so bare `cursor-top` invocations don't drown the user in
    // renderer/GPU helper noise. Override with `--no-cursor-only`,
    // `--no-with-logs`, `--no-active-only`.
    cursorOnly: true,
    withLogs: true,
    activeOnly: true,
    transcriptMaxAgeHours: 24,
    theme: "default",
    density: "comfortable",
    filter: "",
    bell: false,
    detailLines: 25,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    switch (arg) {
      case "--demo":
        opts.demo = true;
        break;
      case "--once":
        opts.once = true;
        break;
      case "--json":
        opts.json = true;
        opts.once = true;
        break;
      case "--interval": {
        const v = argv[++i];
        if (v) opts.intervalMs = Math.max(200, Number.parseInt(v, 10) || 1000);
        break;
      }
      case "--lines": {
        const v = argv[++i];
        if (v) opts.logLines = Math.max(0, Number.parseInt(v, 10) || 3);
        break;
      }
      case "--no-auto-once":
        opts.noAutoOnce = true;
        break;
      case "--cursor-only":
        opts.cursorOnly = true;
        break;
      case "--no-cursor-only":
        opts.cursorOnly = false;
        break;
      case "--with-logs":
        opts.withLogs = true;
        break;
      case "--no-with-logs":
        opts.withLogs = false;
        break;
      case "--active-only":
        opts.activeOnly = true;
        break;
      case "--no-active-only":
        opts.activeOnly = false;
        break;
      case "--transcript-max-age": {
        const v = argv[++i];
        if (v) opts.transcriptMaxAgeHours = Math.max(0, Number.parseFloat(v) || 0);
        break;
      }
      case "--theme": {
        const v = argv[++i];
        // Unknown names warn on stderr and fall back to "default",
        // consistent with the warn-and-keep-going arg handling above.
        if (v) opts.theme = normalizeThemeName(v);
        break;
      }
      case "--density": {
        const v = argv[++i];
        if (v) opts.density = resolveDensity(v);
        break;
      }
      case "--filter": {
        const v = argv[++i];
        if (v !== undefined) opts.filter = v;
        break;
      }
      case "--bell":
        opts.bell = true;
        break;
      case "--detail-lines": {
        const v = argv[++i];
        if (v) opts.detailLines = Math.max(1, Number.parseInt(v, 10) || 25);
        break;
      }
      case "-h":
      case "--help":
        opts.help = true;
        break;
      case "-v":
      case "--version":
        opts.version = true;
        break;
      default:
        process.stderr.write(`cursor-top: unknown argument ${arg}\n`);
        opts.help = true;
        break;
    }
  }
  return opts;
}

/**
 * The Ink TUI requires a real TTY to render. In non-TTY contexts (Cursor
 * agent shells, CI logs, command piping) silently auto-promote to `--once`
 * so callers see the snapshot instead of an empty buffer.
 *
 * Opt out with `--no-auto-once` (or pass `--once` / `--json` explicitly).
 */
function applyNonTtyDefaults(opts: CliOptions): CliOptions {
  if (opts.once || opts.json || opts.help || opts.version || opts.noAutoOnce) {
    return opts;
  }
  if (process.stdout.isTTY) {
    return opts;
  }
  process.stderr.write(
    "cursor-top: stdout is not a TTY; rendering a one-shot snapshot " +
      "(use --no-auto-once to force the interactive TUI).\n",
  );
  return { ...opts, once: true };
}

async function loadSnapshot(opts: CliOptions): Promise<AgentSnapshot> {
  const raw = opts.demo
    ? demoSnapshot(opts.logLines)
    : await createCollector(buildCollectorOptions(opts)).collect();
  if (!opts.filter.trim()) return raw;
  return filterSnapshot(raw, opts.filter).snapshot;
}

function buildCollectorOptions(opts: CliOptions) {
  return {
    logTailLines: opts.logLines,
    cursorOnly: opts.cursorOnly,
    withLogs: opts.withLogs,
    activeOnly: opts.activeOnly,
    transcriptMaxAgeMs:
      opts.transcriptMaxAgeHours > 0
        ? opts.transcriptMaxAgeHours * 60 * 60 * 1000
        : Number.POSITIVE_INFINITY,
  };
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const opts = applyNonTtyDefaults(parseArgs(argv));
  const themeFromCli = argvNamesFlag(argv, "--theme");
  const densityFromCli = argvNamesFlag(argv, "--density");
  const activeOnlyFromCli =
    argvNamesFlag(argv, "--active-only") || argvNamesFlag(argv, "--no-active-only");
  const savedPrefs = loadCursorTopPrefs();
  const startupPrefs = resolveStartupPrefs(
    { theme: opts.theme, density: opts.density, activeOnly: opts.activeOnly },
    savedPrefs,
    { theme: themeFromCli, density: densityFromCli, activeOnly: activeOnlyFromCli },
  );

  if (opts.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (opts.version) {
    process.stdout.write(`zoto-cursor-top ${CLI_VERSION}\n`);
    return 0;
  }

  const initial = await loadSnapshot({
    ...opts,
    activeOnly: startupPrefs.activeOnly,
  });

  if (opts.json) {
    process.stdout.write(JSON.stringify(initial, null, 2) + "\n");
    return 0;
  }

  if (opts.once) {
    process.stdout.write(
      renderText(initial, Date.now(), {
        density: startupPrefs.density,
        logOrder: startupPrefs.logOrder,
      }),
    );
    return 0;
  }

  // One persistent collector for the interactive session — warm ticks reuse
  // mtime-gated caches instead of rebuilding the world every second.
  const collectorOpts = buildCollectorOptions({
    ...opts,
    activeOnly: startupPrefs.activeOnly,
  });
  const collector = opts.demo ? null : createCollector(collectorOpts);
  const load = opts.demo
    ? (): Promise<AgentSnapshot> => Promise.resolve(demoSnapshot(opts.logLines))
    : (): Promise<AgentSnapshot> => collector!.collect();

  // Alternate screen (like top/htop): fresh viewport on start, primary
  // scrollback restored on quit — no history wipe.
  const { waitUntilExit } = render(
    React.createElement(App, {
      load,
      initial,
      intervalMs: opts.intervalMs,
      themeName: startupPrefs.theme,
      density: startupPrefs.density,
      initialInfoStripOpen: startupPrefs.infoStripOpen,
      initialLogOrder: startupPrefs.logOrder,
      initialActiveOnly: startupPrefs.activeOnly,
      onActiveOnlyChange: (value) => {
        collectorOpts.activeOnly = value;
      },
      initialFilter: opts.filter,
      bell: opts.bell && process.stdout.isTTY === true,
      detailLines: opts.detailLines,
      persistPrefs: true,
      demo: opts.demo,
    }),
    { alternateScreen: true },
  );
  await waitUntilExit();
  return 0;
}

/**
 * `main()` is invoked whenever this module is executed as the entrypoint.
 *
 * The CLI ships three callable entry shapes:
 *   * `dist/cli.js` directly (tsup output, has its own shebang)
 *   * `bin/cursor-top.mjs` (re-exports `dist/cli.js`)
 *   * `cursor-top` (symlink installed onto PATH by `install-local.ts`)
 *
 * We can't rely on suffix sniffing alone — the PATH symlink drops the
 * `.mjs` extension. Compare the resolved path of this module against
 * `process.argv[1]`, normalising for the file:// URL that ESM uses.
 */
function isEntrypoint(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const selfUrl = import.meta.url;
  const entryUrl = entry.startsWith("file:")
    ? entry
    : `file://${entry}`;
  if (selfUrl === entryUrl) return true;
  return (
    entry.endsWith("cli.ts") ||
    entry.endsWith("cli.js") ||
    entry.endsWith("cli.mjs") ||
    entry.endsWith("cursor-top.mjs") ||
    entry.endsWith("cursor-top")
  );
}

if (isEntrypoint()) {
  void main().then((code) => process.exit(code));
}
