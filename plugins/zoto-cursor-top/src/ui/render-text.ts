/**
 * Plain-text renderer used by `--once` so the CLI can emit a single frame to
 * stdout and exit cleanly, with no terminal-control characters that would
 * pollute pipes, log captures, or paste buffers.
 */

import type { AgentSnapshot } from "../types.js";
import { flattenVisible } from "./Tree.js";
import {
  agentBodyIndent,
  formatAgentRowLine,
  headerRow,
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
    const hasChildren = (node.children?.length ?? 0) > 0;
    const bodyIndent = agentBodyIndent(depth);
    lines.push(
      formatAgentRowLine(node, depth, now, { expanded: hasChildren, hasChildren }),
    );
    if (node.title) {
      lines.push(`${bodyIndent}${truncate(node.title, 96)}`);
    }
    // Newest log first — recentLogs is captured oldest→newest so we
    // walk it backwards. Latest activity is the most useful and
    // belongs at the top of the per-row block.
    for (let i = node.recentLogs.length - 1; i >= 0; i--) {
      lines.push(`${bodyIndent}log: ${truncate(node.recentLogs[i]!, 100)}`);
    }
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
