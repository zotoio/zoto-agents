import React from "react";
import { Box, Text } from "ink";
import type { AgentNode } from "../types.js";
import { formatRepoDisplay } from "../discovery/repo-url.js";
import {
  formatAlignedLogRole,
  formatStartForNode,
  formatTokenUsageK,
  orderLogsForDisplay,
  DEFAULT_LOG_SCROLL_ORDER,
  paddedKindBadge,
  splitLogSnippet,
  statusColor,
  truncate,
  type LogScrollOrder,
} from "./format.js";
import { LOADING_PLACEHOLDER } from "./detail-tail.js";
import type { Theme } from "./theme.js";

export interface DetailPaneProps {
  node: AgentNode;
  now: number;
  theme: Theme;
  /** Deep tail lines, oldest last (same order as `recentLogs`). */
  tailLines: string[];
  tailLoading: boolean;
  /** Shown when tail is empty and not loading. */
  tailPlaceholder?: string;
  /** Cap log lines on short terminals (defaults to all tail lines). */
  maxLogLines?: number;
  /** Active deep-tail depth (number keys); shown in the header when set. */
  activeDetailLines?: number;
  /** Log tail order (default oldest-first). */
  logOrder?: LogScrollOrder;
}

/**
 * Bottom split detail view for the selected agent.
 *
 * Layout: fixed metadata block followed by a deep log tail (newest first,
 * consistent with {@link Row}). Renders below the event strip and above the
 * footer / filter bar so it coexists with subtasks 04 and 05.
 */
export function DetailPane({
  node,
  now,
  theme,
  tailLines,
  tailLoading,
  tailPlaceholder = "(no log output)",
  maxLogLines,
  activeDetailLines,
  logOrder = DEFAULT_LOG_SCROLL_ORDER,
}: DetailPaneProps): React.JSX.Element {
  const cap = maxLogLines ?? tailLines.length;
  const visibleLogs = orderLogsForDisplay(tailLines.slice(-cap), logOrder);
  const pidText = node.pid != null ? String(node.pid) : "—";

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor={theme.dim} color={theme.header}>
        ── detail ──  [d] toggle  [Esc] close  [1-9]×10 lines
        {activeDetailLines != null ? `  · showing ${activeDetailLines}` : ""}
      </Text>
      <Text dimColor={theme.dim}>
        id: {node.id}
      </Text>
      <Box>
        <Text bold={theme.badge.bold} color={theme.badge.color}>
          {paddedKindBadge(node.kind)}{" "}
        </Text>
        <Text>
          pid {pidText} · {node.label}
        </Text>
      </Box>
      {node.title ? (
        <Text>{node.title}</Text>
      ) : (
        <Text dimColor={theme.dim}>(no title)</Text>
      )}
      <Text dimColor={theme.dim}>
        model: {node.model ?? "—"} · repo: {formatRepoDisplay(node.repo)} · tokens:{" "}
        {node.tokenUsage != null
          ? formatTokenUsageK(node.tokenUsage).trim()
          : "—"}
      </Text>
      <Text dimColor={theme.dim}>
        started: {formatStartForNode(node, now)}
      </Text>
      <Text color={statusColor(node.status, theme)} bold>
        status: {node.status}
      </Text>
      <Text dimColor={theme.dim}>
        log: {node.logSource ?? "(none — using row tail)"}
      </Text>
      <Text bold color={theme.header}>
        log tail ({logOrder === "newest-first" ? "newest first" : "oldest first"}):
      </Text>
      {tailLoading ? (
        <Text dimColor={theme.dim}>{LOADING_PLACEHOLDER}</Text>
      ) : visibleLogs.length > 0 ? (
        <Box flexDirection="column">
          {visibleLogs.map((line, i) => {
            const { role, body } = splitLogSnippet(line);
            return (
              <Text key={`detail-log-${i}`} wrap="truncate">
                <Text dimColor={theme.dim}>{formatAlignedLogRole(role)}</Text>
                <Text>{truncate(body, 200)}</Text>
              </Text>
            );
          })}
        </Box>
      ) : (
        <Text dimColor={theme.dim}>{tailPlaceholder}</Text>
      )}
    </Box>
  );
}

/** One-line tombstone when the selected node vanished between ticks. */
export function DetailPaneGone({ theme }: { theme: Theme }): React.JSX.Element {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor={theme.dim} color={theme.header}>
        ── detail ──
      </Text>
      <Text dimColor={theme.dim}>
        (selected agent no longer visible — closing detail)
      </Text>
    </Box>
  );
}

/** Kind badge text for tests and docs. */
export { kindBadge } from "./format.js";
