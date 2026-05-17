import React from "react";
import { Box, Text } from "ink";
import type { AgentNode } from "../types.js";
import {
  formatStart,
  kindBadge,
  statusColor,
  truncate,
} from "./format.js";

export interface RowProps {
  node: AgentNode;
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  selected: boolean;
  now: number;
}

/**
 * Render one agent in the tree, followed by its tailed log lines.
 *
 * Pure function of its props so we can render it deterministically in tests.
 */
export function Row({
  node,
  depth,
  expanded,
  hasChildren,
  selected,
  now,
}: RowProps): React.JSX.Element {
  const indent = "  ".repeat(depth);
  const chevron = hasChildren ? (expanded ? "▼" : "▶") : " ";
  const label = `${indent}${chevron} ${truncate(node.label, 28)}`;
  const pid = node.pid != null ? String(node.pid).padStart(6) : "  --  ";

  return (
    <Box flexDirection="column">
      <Box>
        <Text inverse={selected} bold={selected}>
          <Text color={statusColor(node.status)}>{`[${kindBadge(node.kind)}]`}</Text>
          {" "}
          <Text>{pid}</Text>
          {" "}
          <Text>{label.padEnd(40)}</Text>
          {" "}
          <Text color="cyan">{truncate(node.model ?? "-", 18).padEnd(18)}</Text>
          {" "}
          <Text color="magenta">{truncate(node.repo ?? "-", 24).padEnd(24)}</Text>
          {" "}
          <Text dimColor>{formatStart(node.startedAt, now)}</Text>
          {" "}
          <Text color={statusColor(node.status)}>{node.status}</Text>
        </Text>
      </Box>
      {node.title ? (
        <Box>
          <Text>{indent}    </Text>
          <Text dimColor>{truncate(node.title, 96)}</Text>
        </Box>
      ) : null}
      {node.recentLogs.length > 0 ? (
        <Box flexDirection="column">
          {node.recentLogs.map((line, i) => (
            <Box key={`${node.id}-log-${i}`}>
              <Text>{indent}    </Text>
              <Text dimColor>log: </Text>
              <Text>{truncate(line, 100)}</Text>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
