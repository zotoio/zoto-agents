/**
 * Build a parent/child hierarchy from a flat list of agent nodes.
 *
 * Three strategies are applied in priority order:
 *   1. Explicit `parentId` from session metadata.
 *   2. PID -> PPID mapping from the OS process table.
 *   3. Fallback to root if neither yields a known parent.
 */

import type { AgentNode } from "../types.js";

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
    sortByStartTime(roots, nodesOut);
    for (const node of Object.values(nodesOut)) {
      if (node.children && node.children.length > 1) {
        sortByStartTime(node.children, nodesOut);
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

function sortByStartTime(ids: string[], nodes: Record<string, AgentNode>): void {
  ids.sort((a, b) => {
    const na = nodes[a]?.startedAt ?? 0;
    const nb = nodes[b]?.startedAt ?? 0;
    return na - nb;
  });
}
