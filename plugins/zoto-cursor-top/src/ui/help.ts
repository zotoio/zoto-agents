/**
 * Interactive TUI help copy (`?` key). Kept separate from `cli.ts` `--help`
 * so the in-app pane can explain live `!` diagnostic lines.
 */

export interface KeybindHelp {
  keys: string;
  description: string;
}

export const INTERACTIVE_KEYBINDS: KeybindHelp[] = [
  { keys: "↑/↓ or j/k", description: "move selection" },
  { keys: "→/Enter/l", description: "expand selected node" },
  { keys: "←/h", description: "collapse selected node" },
  { keys: "e / c", description: "expand / collapse all" },
  { keys: "r", description: "force refresh (works while paused)" },
  { keys: "p / space", description: "pause / resume auto-refresh" },
  { keys: "t", description: "cycle colour theme" },
  { keys: "y", description: "cycle layout density" },
  { keys: "/", description: "open filter bar (Esc clears)" },
  { keys: "d", description: "toggle detail pane (Esc closes first)" },
  { keys: "i", description: "toggle lifecycle events + ! diagnostics strip" },
  { keys: "a", description: "toggle active-only filter (hide finished agents)" },
  { keys: "o", description: "toggle log tail order (oldest ↔ newest)" },
  { keys: "?", description: "toggle this help" },
  { keys: "q", description: "quit" },
];

export interface DiagnosticHelp {
  /** Substring matched against live `diagnostics[]` entries. */
  match: string;
  title: string;
  body: string;
}

export const DIAGNOSTIC_HELP: DiagnosticHelp[] = [
  {
    match: "--cursor-only:",
    title: "! --cursor-only: pruned N non-Cursor root subtree(s)",
    body:
      "The default --cursor-only filter hid root-level processes that are not " +
      "recognised as Cursor IDE, cursor-agent CLI, or Cloud Agent VM (and their " +
      "descendants). Pass --no-cursor-only to include unrelated shell/node rows.",
  },
  {
    match: "--with-logs:",
    title: "! --with-logs: pruned N nodes with no readable agent output",
    body:
      "The default --with-logs filter removed agents whose log tail was empty. " +
      "Ancestors of surviving rows are kept so the tree stays navigable. Pass " +
      "--no-with-logs to show every Cursor process even without log output.",
  },
  {
    match: "--with-logs: no nodes",
    title: "! --with-logs: no nodes produced readable log output",
    body:
      "Every row was filtered out because none produced a readable log tail. " +
      "Rerun with --no-with-logs to see processes anyway.",
  },
  {
    match: "--active-only:",
    title: "! --active-only: pruned N done agent(s)",
    body:
      "The default --active-only filter hid finished agents (status done). " +
      "Parents with only done children are hidden too; a done parent with an " +
      "active child is kept. Pass --no-active-only for post-mortem inspection.",
  },
  {
    match: "No Cursor processes",
    title: "! No Cursor processes detected via `ps`",
    body: "Nothing matched the process scan. Try --demo for a synthetic preview.",
  },
  {
    match: "unreadable:",
    title: "! unreadable: <path>",
    body:
      "A session or log file could not be read (permissions or sandboxed " +
      "install). cursor-top is read-only — fix permissions or relocate data.",
  },
];

export function diagnosticExplanation(line: string): DiagnosticHelp | undefined {
  return DIAGNOSTIC_HELP.find((entry) => line.includes(entry.match));
}
