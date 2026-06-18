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
  formatCategoryRowLine,
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
import {
  groupByCategory,
  categoryCounts,
  isCategoryId,
} from "./categories.js";

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
  /** Apply category grouping (default true). Set false to preserve legacy flat output. */
  grouped?: boolean;
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
  const grouped = opts.grouped !== false ? groupByCategory(snapshot) : snapshot;
  const expanded = new Set(Object.keys(grouped.nodes));
  const visible = flattenVisible(grouped, expanded);
  const nonCatRows = visible.filter(({ id }) => !isCategoryId(id));
  const layoutRows = nonCatRows
    .map(({ id, depth }) => {
      const node = grouped.nodes[id];
      if (!node) return null;
      return {
        node,
        depth,
        startColumn: formatStartForNode(node, now),
        nodes: grouped.nodes,
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

  const catCounts = categoryCounts(snapshot);
  const totals = summarise(snapshot);
  lines.push(
    `cursor-top  ·  ${catCounts["cat:ide"]} IDE · ${catCounts["cat:cli"]} CLI · ${catCounts["cat:cloud"]} Cloud · ${totals.subs} subagents`,
  );
  lines.push("");
  lines.push(headerRow(layout));
  lines.push("-".repeat(terminalColumns));

  for (const { id, depth } of visible) {
    const node = grouped.nodes[id];
    if (!node) continue;
    const hasChildren = (node.children?.length ?? 0) > 0;

    if (isCategoryId(id)) {
      const childCount = node.children?.length ?? 0;
      lines.push(formatCategoryRowLine(node, true, childCount, layout));
      continue;
    }

    const bodyIndent = agentBodyIndent(depth, layout);
    lines.push(
      formatAgentRowLine(node, depth, now, {
        expanded: hasChildren,
        hasChildren,
        layout,
        nodes: grouped.nodes,
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

  if (visible.length === 0) {
    lines.push("");
    lines.push("  No active agents");
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
