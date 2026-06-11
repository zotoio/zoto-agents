import React from "react";
import { Box, Text } from "ink";
import { isHighlighted } from "../events.js";
import type { AgentSnapshot } from "../types.js";
import {
  formatStartForNode,
  type LogScrollOrder,
  type RowColumnLayout,
} from "./format.js";
import { MemoRow } from "./Row.js";
import type { Density, Theme } from "./theme.js";
import {
  formatOverflowIndicator,
  type FlatRow,
  type TreeWindow,
} from "./viewport.js";

export interface TreeProps {
  snapshot: AgentSnapshot;
  expanded: Set<string>;
  selectedId: string | null;
  now: number;
  /** Pre-flattened visible rows (from {@link flattenVisible}). */
  flat: FlatRow[];
  /** Viewport window over `flat` — only `flat[startIdx..endIdx)` is rendered. */
  window: TreeWindow;
  /** Colour theme tokens, forwarded to each row. */
  theme?: Theme;
  /** Layout density, forwarded to each row. */
  density?: Density;
  /** Status-change highlight timestamps keyed by node id. */
  changedAt?: Record<string, number>;
  /** Shared column layout for header + rows. */
  layout: RowColumnLayout;
  /** Log tail scroll order. */
  logOrder?: LogScrollOrder;
  terminalColumns?: number;
}

/** Flatten the hierarchy into the visible row sequence, respecting expansion. */
export function flattenVisible(
  snapshot: AgentSnapshot,
  expanded: Set<string>,
): Array<{ id: string; depth: number }> {
  const out: Array<{ id: string; depth: number }> = [];
  const visit = (id: string, depth: number): void => {
    const node = snapshot.nodes[id];
    if (!node) return;
    out.push({ id, depth });
    if (expanded.has(id) && node.children && node.children.length > 0) {
      for (const child of node.children) visit(child, depth + 1);
    }
  };
  for (const root of snapshot.roots) visit(root, 0);
  return out;
}

export function Tree({
  snapshot,
  expanded,
  selectedId,
  now,
  flat,
  window,
  theme,
  density,
  changedAt = {},
  layout,
  logOrder,
  terminalColumns,
}: TreeProps): React.JSX.Element {
  const quantisedNow = Math.floor(now / 1000) * 1000;
  const slice = flat.slice(window.startIdx, window.endIdx);

  return (
    <Box flexDirection="column">
      {window.indicatorAbove ? (
        <Box>
          <Text dimColor={theme?.dim}>
            {formatOverflowIndicator("above", window.hiddenRowsAbove)}
          </Text>
        </Box>
      ) : null}
      {slice.map(({ id, depth }) => {
        const node = snapshot.nodes[id];
        if (!node) return null;
        const hasChildren = (node.children?.length ?? 0) > 0;
        const startColumn = formatStartForNode(node, quantisedNow);
        return (
          <MemoRow
            key={id}
            node={node}
            depth={depth}
            expanded={expanded.has(id)}
            hasChildren={hasChildren}
            selected={selectedId === id}
            startColumn={startColumn}
            layout={layout}
            nodes={snapshot.nodes}
            theme={theme}
            density={density}
            logOrder={logOrder}
            terminalColumns={terminalColumns}
            statusHighlighted={isHighlighted(changedAt, id, now)}
          />
        );
      })}
      {window.indicatorBelow ? (
        <Box>
          <Text dimColor={theme?.dim}>
            {formatOverflowIndicator("below", window.hiddenRowsBelow)}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}
