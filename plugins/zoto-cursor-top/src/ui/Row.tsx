import React from "react";
import { Box, Text } from "ink";
import type { AgentNode } from "../types.js";
import {
  agentBodyIndent,
  DEFAULT_TERMINAL_COLUMNS,
  formatAgentRowLine,
  formatLogBodyForRow,
  formatLogTailPrefix,
  orderLogsForDisplay,
  splitLogSnippet,
  statusColor,
  truncate,
  type LogScrollOrder,
  type RowColumnLayout,
} from "./format.js";
import {
  DEFAULT_DENSITY,
  DEFAULT_THEME,
  densityShowsLogs,
  densityShowsTitle,
  type Density,
  type Theme,
} from "./theme.js";

export interface RowProps {
  node: AgentNode;
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  selected: boolean;
  /** Pre-computed START (elapsed) column — quantised upstream for memo stability. */
  startColumn: string;
  /** Terminal column layout — shared across header + every row. */
  layout: RowColumnLayout;
  /** Full snapshot for MODEL / TOKENS display rollups on parent rows. */
  nodes: Record<string, AgentNode>;
  /** Colour theme tokens (defaults to the built-in `default` palette). */
  theme?: Theme;
  /** Layout density governing which body lines render (default `comfortable`). */
  density?: Density;
  /** Log tail order (default {@link DEFAULT_LOG_SCROLL_ORDER}). */
  logOrder?: LogScrollOrder;
  /** Terminal width for log body sizing. */
  terminalColumns?: number;
  /** When set, row renders accent-highlighted while within the highlight window. */
  statusHighlighted?: boolean;
}

/**
 * Render one agent in the tree, followed by its tailed log lines.
 *
 * Pure function of its props so we can render it deterministically in tests.
 *
 * The data row is a single fixed-width string so Ink does not misalign
 * columns when applying per-field colours. Hierarchy is conveyed inside
 * the AGENT column via indent + chevron.
 *
 * Density gates the body blocks: `compact` renders the row line only,
 * `cozy` adds the title line, `comfortable` adds the log tail (whose line
 * count stays `--lines`-driven upstream).
 */
export function Row({
  node,
  depth,
  expanded,
  hasChildren,
  selected,
  startColumn,
  layout,
  nodes,
  theme = DEFAULT_THEME,
  density = DEFAULT_DENSITY,
  logOrder,
  terminalColumns,
  statusHighlighted = false,
}: RowProps): React.JSX.Element {
  const bodyIndent = agentBodyIndent(depth, layout);
  const showTitle = densityShowsTitle(density) && Boolean(node.title);
  const showLogs = densityShowsLogs(density);
  const displayLogs = showLogs ? orderLogsForDisplay(node.recentLogs, logOrder) : [];
  const cols = terminalColumns ?? DEFAULT_TERMINAL_COLUMNS;
  const rowLine = formatAgentRowLine(node, depth, 0, {
    expanded,
    hasChildren,
    startColumn,
    layout,
    nodes,
  });

  return (
    <Box flexDirection="column">
      <Text
        inverse={selected && theme.selection.inverse}
        bold={(selected && theme.selection.bold) || statusHighlighted}
        color={statusHighlighted ? theme.accent : statusColor(node.status, theme)}
      >
        {rowLine}
      </Text>
      {showTitle ? (
        <Box>
          <Text>{bodyIndent}</Text>
          <Text dimColor={theme.dim}>{truncate(node.title, 96)}</Text>
        </Box>
      ) : null}
      {displayLogs.length > 0 ? (
        <Box flexDirection="column">
          {displayLogs.map((line, i) => {
            const { body } = splitLogSnippet(line);
            return (
              <Text key={`${node.id}-log-${i}`}>
                <Text dimColor={theme.dim}>
                  {formatLogTailPrefix(depth, line, layout)}
                </Text>
                <Text>
                  {formatLogBodyForRow(body, {
                    terminalColumns: cols,
                    depth,
                    layout,
                  })}
                </Text>
              </Text>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
}

function rowPropsEqual(prev: RowProps, next: RowProps): boolean {
  return (
    prev.node === next.node &&
    prev.depth === next.depth &&
    prev.expanded === next.expanded &&
    prev.hasChildren === next.hasChildren &&
    prev.selected === next.selected &&
    prev.startColumn === next.startColumn &&
    prev.layout === next.layout &&
    prev.nodes === next.nodes &&
    prev.theme === next.theme &&
    prev.density === next.density &&
    prev.logOrder === next.logOrder &&
    prev.terminalColumns === next.terminalColumns &&
    prev.statusHighlighted === next.statusHighlighted
  );
}

/** Memoised row — skips reconcile when quantised elapsed string is unchanged. */
export const MemoRow = React.memo(Row, rowPropsEqual);
