/**
 * Plain-text renderer used by `--once` so the CLI can emit a single frame to
 * stdout and exit cleanly, with no terminal-control characters that would
 * pollute pipes, log captures, or paste buffers.
 */

import type { AgentSnapshot } from "../types.js";
import { flattenVisible } from "./Tree.js";
import {
  formatStart,
  kindBadge,
  truncate,
} from "./format.js";

export function renderText(snapshot: AgentSnapshot, now = Date.now()): string {
  const expanded = new Set(Object.keys(snapshot.nodes));
  const visible = flattenVisible(snapshot, expanded);
  const lines: string[] = [];

  const totals = summarise(snapshot);
  lines.push(
    `cursor-top  ·  ${totals.processes} processes · ${totals.roots} roots · ${totals.subs} subagents`,
  );
  lines.push("");
  lines.push(headerRow());
  lines.push("-".repeat(120));

  for (const { id, depth } of visible) {
    const node = snapshot.nodes[id];
    if (!node) continue;
    const indent = "  ".repeat(depth);
    const chevron = (node.children?.length ?? 0) > 0 ? "▼" : " ";
    const label = `${indent}${chevron} ${truncate(node.label, 28)}`;
    const pid = node.pid != null ? String(node.pid).padStart(6) : "  --  ";
    lines.push(
      [
        `[${kindBadge(node.kind)}]`,
        pid,
        label.padEnd(40),
        truncate(node.model ?? "-", 18).padEnd(18),
        truncate(node.repo ?? "-", 24).padEnd(24),
        formatStart(node.startedAt, now),
        node.status,
      ].join(" "),
    );
    if (node.title) {
      lines.push(`${indent}      ${truncate(node.title, 96)}`);
    }
    for (const log of node.recentLogs) {
      lines.push(`${indent}      log: ${truncate(log, 100)}`);
    }
  }

  if (snapshot.diagnostics.length > 0) {
    lines.push("");
    for (const d of snapshot.diagnostics) lines.push(`! ${d}`);
  }
  return lines.join("\n") + "\n";
}

function headerRow(): string {
  return [
    "TYPE".padEnd(5),
    "   PID",
    " AGENT".padEnd(40),
    " MODEL".padEnd(18),
    " REPO".padEnd(24),
    " START (elapsed)",
    " STATUS",
  ].join(" ");
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
