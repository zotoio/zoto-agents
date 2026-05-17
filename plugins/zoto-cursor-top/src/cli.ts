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
 */

import React from "react";
import { render } from "ink";
import { createCollector } from "./discovery/collector.js";
import { demoSnapshot } from "./discovery/demo.js";
import { App } from "./ui/App.js";
import { renderText } from "./ui/render-text.js";
import type { AgentSnapshot } from "./types.js";

interface CliOptions {
  demo: boolean;
  once: boolean;
  json: boolean;
  intervalMs: number;
  logLines: number;
  help: boolean;
  version: boolean;
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
  -h, --help            Show this help and exit
  -v, --version         Show CLI version and exit

Keyboard (interactive mode):
  ↑/↓ or j/k    move selection
  →/Enter/l     expand selected node
  ←/h           collapse selected node
  e / c         expand / collapse all
  r             force refresh
  q             quit
`;

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    demo: false,
    once: false,
    json: false,
    intervalMs: 1000,
    logLines: 3,
    help: false,
    version: false,
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

async function loadSnapshot(opts: CliOptions): Promise<AgentSnapshot> {
  if (opts.demo) return demoSnapshot(opts.logLines);
  const collector = createCollector({ logTailLines: opts.logLines });
  return collector.collect();
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const opts = parseArgs(argv);

  if (opts.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (opts.version) {
    process.stdout.write("zoto-cursor-top 0.1.0\n");
    return 0;
  }

  const initial = await loadSnapshot(opts);

  if (opts.json) {
    process.stdout.write(JSON.stringify(initial, null, 2) + "\n");
    return 0;
  }

  if (opts.once) {
    process.stdout.write(renderText(initial));
    return 0;
  }

  const { waitUntilExit } = render(
    React.createElement(App, {
      load: () => loadSnapshot(opts),
      initial,
      intervalMs: opts.intervalMs,
    }),
  );
  await waitUntilExit();
  return 0;
}

const invokedDirectly =
  process.argv[1] && process.argv[1].endsWith("cli.ts") ||
  process.argv[1]?.endsWith("cli.js") ||
  process.argv[1]?.endsWith("cli.mjs") ||
  process.argv[1]?.endsWith("cursor-top.mjs");

if (invokedDirectly) {
  void main().then((code) => process.exit(code));
}
