/**
 * Formatting helpers shared by the TUI rows. Pure functions only so they can
 * be unit-tested without spinning up Ink.
 */

import type { AgentKind, AgentNode, AgentStatus } from "../types.js";

/** Fixed column widths — keep {@link headerRow} and {@link formatAgentRowLine} in sync. */
export const ROW_COL = {
  kind: 7,
  pid: 6,
  agent: 32,
  model: 18,
  repo: 24,
} as const;

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m${sec.toString().padStart(2, "0")}s`;
  return `${sec}s`;
}

export function formatStart(startedAt: number, now = Date.now()): string {
  const d = new Date(startedAt);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss} (${formatDuration(now - startedAt)})`;
}

export function statusColor(status: AgentStatus): string {
  switch (status) {
    case "running":
      return "green";
    case "waiting":
      return "yellow";
    case "idle":
      return "blue";
    case "done":
      return "gray";
    case "error":
      return "red";
    default:
      return "white";
  }
}

/**
 * Total rendered width of `[BADGE]` once trailing pad is applied. AGENT
 * is the widest badge (`[AGENT]` = 7 chars); narrower badges get
 * trailing spaces tacked on *after* the closing bracket so subsequent
 * columns stay aligned across rows.
 */
export const KIND_BADGE_DISPLAY_WIDTH = 7;

export function kindBadge(kind: AgentKind): string {
  switch (kind) {
    case "ide":
      return "IDE";
    case "cli":
      return "CLI";
    case "cloud":
      return "CLD";
    case "agent":
      return "AGENT";
    case "subagent":
      return "SUB";
    default:
      return "???";
  }
}

/** `[BADGE]` padded to {@link KIND_BADGE_DISPLAY_WIDTH} characters. */
export function paddedKindBadge(kind: AgentKind): string {
  return `[${kindBadge(kind)}]`.padEnd(KIND_BADGE_DISPLAY_WIDTH);
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, Math.max(1, max - 1)) + "…";
}

/** Column header line shared by the Ink TUI and `--once` text renderer. */
export function headerRow(): string {
  return [
    "TYPE".padEnd(ROW_COL.kind),
    "   PID",
    " AGENT".padEnd(ROW_COL.agent),
    " MODEL".padEnd(ROW_COL.model),
    " REPO".padEnd(ROW_COL.repo),
    " START (elapsed)",
    " STATUS",
  ].join(" ");
}

/**
 * Fixed-width data columns for one agent row. Hierarchy indent lives inside
 * the AGENT field so TYPE / PID / MODEL / REPO stay aligned with the header.
 */
export function formatAgentRowLine(
  node: AgentNode,
  depth: number,
  now: number,
  opts: { expanded?: boolean; hasChildren?: boolean } = {},
): string {
  const labelIndent = "  ".repeat(depth);
  const hasChildren = opts.hasChildren ?? (node.children?.length ?? 0) > 0;
  const expanded = opts.expanded ?? false;
  const chevron = hasChildren ? (expanded ? "▼" : "▶") : " ";
  const labelMax = Math.max(8, 28 - labelIndent.length);
  const label = `${labelIndent}${chevron} ${truncate(node.label, labelMax)}`;
  const pid = node.pid != null ? String(node.pid).padStart(ROW_COL.pid) : "      ";
  return [
    paddedKindBadge(node.kind),
    pid,
    label.padEnd(ROW_COL.agent),
    truncate(node.model ?? "-", ROW_COL.model).padEnd(ROW_COL.model),
    truncate(node.repo ?? "-", ROW_COL.repo).padEnd(ROW_COL.repo),
    formatStart(node.startedAt, now),
    node.status,
  ].join(" ");
}

/** Indent for title / log body lines under the AGENT column at a given depth. */
export function agentBodyIndent(depth: number): string {
  return `${" ".repeat(15)}${"  ".repeat(depth)}  `;
}
