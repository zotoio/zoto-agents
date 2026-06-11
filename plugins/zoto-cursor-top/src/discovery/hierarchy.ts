/**
 * Build a parent/child hierarchy from a flat list of agent nodes.
 *
 * Three strategies are applied in priority order:
 *   1. Explicit `parentId` from session metadata.
 *   2. PID -> PPID mapping from the OS process table.
 *   3. Fallback to root if neither yields a known parent.
 */

import type { AgentNode, AgentStatus } from "../types.js";

export interface HierarchyInput {
  nodes: AgentNode[];
  /** Map of pid -> parent pid, supplied by the process discovery layer. */
  pidParents: Map<number, number>;
}

export interface HierarchyResult {
  nodes: Record<string, AgentNode>;
  roots: string[];
}

export function buildHierarchy(input: HierarchyInput): HierarchyResult {
  const { nodes, pidParents } = input;
  const byId = new Map<string, AgentNode>();
  const byPid = new Map<number, AgentNode>();

  for (const node of nodes) {
    byId.set(node.id, { ...node, children: [] });
  }
  for (const node of byId.values()) {
    if (node.pid != null) byPid.set(node.pid, node);
  }

  const finalize = (): HierarchyResult => {
    const nodesOut: Record<string, AgentNode> = {};
    const roots: string[] = [];
    for (const node of byId.values()) {
      nodesOut[node.id] = node;
      if (!node.parentId) roots.push(node.id);
    }
    sortSiblings(roots, nodesOut);
    for (const node of Object.values(nodesOut)) {
      if (node.children && node.children.length > 1) {
        sortSiblings(node.children, nodesOut);
      }
    }
    return { nodes: nodesOut, roots };
  };

  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      const parent = byId.get(node.parentId)!;
      parent.children!.push(node.id);
      continue;
    }
    if (node.pid != null) {
      const ppid = pidParents.get(node.pid);
      if (ppid != null && byPid.has(ppid)) {
        const parent = byPid.get(ppid)!;
        if (parent.id !== node.id) {
          parent.children!.push(node.id);
          node.parentId = parent.id;
          continue;
        }
      }
    }
    node.parentId = null;
  }

  return finalize();
}

/** Live agents first; finished rows newest-first by end instant. */
const STATUS_SORT_RANK: Record<AgentStatus, number> = {
  running: 0,
  waiting: 1,
  idle: 2,
  error: 3,
  unknown: 4,
  done: 5,
};

function finishedInstant(node: AgentNode): number {
  return node.elapsedEndAt ?? node.startedAt;
}

function sortSiblings(ids: string[], nodes: Record<string, AgentNode>): void {
  ids.sort((a, b) => {
    const na = nodes[a];
    const nb = nodes[b];
    if (!na || !nb) return 0;
    const ra = STATUS_SORT_RANK[na.status] ?? 99;
    const rb = STATUS_SORT_RANK[nb.status] ?? 99;
    if (ra !== rb) return ra - rb;
    if (na.status === "done" && nb.status === "done") {
      return finishedInstant(nb) - finishedInstant(na);
    }
    return na.startedAt - nb.startedAt;
  });
}
