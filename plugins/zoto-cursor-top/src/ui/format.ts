/**
 * Formatting helpers shared by the TUI rows. Pure functions only so they can
 * be unit-tested without spinning up Ink.
 */

import type { AgentKind, AgentStatus } from "../types.js";

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

export function kindBadge(kind: AgentKind): string {
  switch (kind) {
    case "ide":
      return "IDE";
    case "cli":
      return "CLI";
    case "cloud":
      return "CLD";
    case "subagent":
      return "SUB";
    default:
      return "???";
  }
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, Math.max(1, max - 1)) + "…";
}
