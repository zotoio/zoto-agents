/**
 * Plain-text renderer used by `--once` so the CLI can emit a single frame to
 * stdout and exit cleanly, with no terminal-control characters that would
 * pollute pipes, log captures, or paste buffers.
 */

import type { AgentSnapshot } from "../types.js";
import { flattenVisible } from "./Tree.js";
import {
  agentBodyIndent,
  computeFitContentTerminalWidth,
  computeRowColumnLayout,
  DEFAULT_TERMINAL_COLUMNS,
  formatAgentRowLine,
  formatLogTailLine,
  formatStartForNode,
  headerRow,
  logBodyMaxWidth,
  orderLogsForDisplay,
  DEFAULT_LOG_SCROLL_ORDER,
  type LogScrollOrder,
  truncate,
} from "./format.js";
import {
  DEFAULT_DENSITY,
  densityShowsLogs,
  densityShowsTitle,
  type Density,
} from "./theme.js";

export interface RenderTextOptions {
  /**
   * Layout density (default `comfortable` — today's full layout). Reuses
   * the same gating as the TUI rows, so `--once --density compact` simply
   * omits the body lines. Themes never apply here: this output is
   * intentionally colour-free.
   */
  density?: Density;
  /** Terminal width for column layout (default `stdout.columns`, or content-fit when non-TTY). */
  terminalColumns?: number;
  /** Log tail order (default oldest-first). */
  logOrder?: LogScrollOrder;
}

export function renderText(
  snapshot: AgentSnapshot,
  now = Date.now(),
  opts: RenderTextOptions = {},
): string {
  const density = opts.density ?? DEFAULT_DENSITY;
  const logOrder = opts.logOrder ?? DEFAULT_LOG_SCROLL_ORDER;
  const showTitle = densityShowsTitle(density);
  const showLogs = densityShowsLogs(density);
  const expanded = new Set(Object.keys(snapshot.nodes));
  const visible = flattenVisible(snapshot, expanded);
  const layoutRows = visible
    .map(({ id, depth }) => {
      const node = snapshot.nodes[id];
      if (!node) return null;
      return {
        node,
        depth,
        startColumn: formatStartForNode(node, now),
        nodes: snapshot.nodes,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);

  const fitContent =
    opts.terminalColumns == null &&
    (typeof process.stdout.columns !== "number" ||
      process.stdout.isTTY !== true);
  const terminalColumns = fitContent
    ? computeFitContentTerminalWidth(layoutRows)
    : (opts.terminalColumns ??
      (typeof process.stdout.columns === "number"
        ? process.stdout.columns
        : DEFAULT_TERMINAL_COLUMNS));
  const layout = computeRowColumnLayout(terminalColumns, layoutRows, undefined, {
    fitContent,
  });
  const lines: string[] = [];

  const totals = summarise(snapshot);
  lines.push(
    `cursor-top  ·  ${totals.processes} processes · ${totals.roots} roots · ${totals.subs} subagents`,
  );
  lines.push("");
  lines.push(headerRow(layout));
  lines.push("-".repeat(terminalColumns));

  for (const { id, depth } of visible) {
    const node = snapshot.nodes[id];
    if (!node) continue;
    const hasChildren = (node.children?.length ?? 0) > 0;
    const bodyIndent = agentBodyIndent(depth, layout);
    lines.push(
      formatAgentRowLine(node, depth, now, {
        expanded: hasChildren,
        hasChildren,
        layout,
        nodes: snapshot.nodes,
      }),
    );
    if (showTitle && node.title) {
      lines.push(`${bodyIndent}${truncate(node.title, 96)}`);
    }
    if (showLogs) {
      const logBodyMax = logBodyMaxWidth(terminalColumns, depth, layout);
      for (const line of orderLogsForDisplay(node.recentLogs, logOrder)) {
        lines.push(formatLogTailLine(depth, line, logBodyMax, layout));
      }
    }
  }

  if (snapshot.diagnostics.length > 0) {
    lines.push("");
    for (const d of snapshot.diagnostics) lines.push(`! ${d}`);
  }
  return lines.join("\n") + "\n";
}

interface Totals {
  processes: number;
  roots: number;
  subs: number;
}

function summarise(snapshot: AgentSnapshot): Totals {
  const ids = Object.keys(snapshot.nodes);
  const processes = ids.filter((id) => snapshot.nodes[id]!.pid != null).length;
  const subs = ids.length - snapshot.roots.length;
  return { processes, roots: snapshot.roots.length, subs };
}
