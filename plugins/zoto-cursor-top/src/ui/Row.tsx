import React from "react";
import { Box, Text } from "ink";
import type { AgentNode } from "../types.js";
import {
  agentBodyIndent,
  formatAgentRowLine,
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
 *
 * The data row is a single fixed-width string so Ink does not misalign
 * columns when applying per-field colours. Hierarchy is conveyed inside
 * the AGENT column via indent + chevron.
 */
export function Row({
  node,
  depth,
  expanded,
  hasChildren,
  selected,
  now,
}: RowProps): React.JSX.Element {
  const bodyIndent = agentBodyIndent(depth);
  const reversedLogs = node.recentLogs.slice().reverse();
  const rowLine = formatAgentRowLine(node, depth, now, { expanded, hasChildren });

  return (
    <Box flexDirection="column">
      <Text inverse={selected} bold={selected} color={statusColor(node.status)}>
        {rowLine}
      </Text>
      {node.title ? (
        <Box>
          <Text>{bodyIndent}</Text>
          <Text dimColor>{truncate(node.title, 96)}</Text>
        </Box>
      ) : null}
      {reversedLogs.length > 0 ? (
        <Box flexDirection="column">
          {reversedLogs.map((line, i) => (
            <Box key={`${node.id}-log-${i}`}>
              <Text>{bodyIndent}</Text>
              <Text dimColor>log: </Text>
              <Text>{truncate(line, 100)}</Text>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
