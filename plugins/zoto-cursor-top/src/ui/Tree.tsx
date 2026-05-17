import React from "react";
import { Box } from "ink";
import type { AgentSnapshot } from "../types.js";
import { Row } from "./Row.js";

export interface TreeProps {
  snapshot: AgentSnapshot;
  expanded: Set<string>;
  selectedId: string | null;
  now: number;
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
}: TreeProps): React.JSX.Element {
  const rows = flattenVisible(snapshot, expanded);
  return (
    <Box flexDirection="column">
      {rows.map(({ id, depth }) => {
        const node = snapshot.nodes[id];
        if (!node) return null;
        const hasChildren = (node.children?.length ?? 0) > 0;
        return (
          <Row
            key={id}
            node={node}
            depth={depth}
            expanded={expanded.has(id)}
            hasChildren={hasChildren}
            selected={selectedId === id}
            now={now}
          />
        );
      })}
    </Box>
  );
}
