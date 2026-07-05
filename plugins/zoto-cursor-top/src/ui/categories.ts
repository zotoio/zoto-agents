/**
 * Category grouping for the TUI tree view.
 *
 * CLI sessions and Cloud agents are grouped under virtual category rows
 * that are collapsed by default. IDE instances stay at root level since
 * they typically have the most interesting nested agent/subagent trees.
 */

import type { AgentKind, AgentNode, AgentSnapshot } from "../types.js";

export type CategoryId = "cat:ide" | "cat:cli" | "cat:cloud";

export interface CategoryInfo {
  id: CategoryId;
  label: string;
  badge: string;
  kinds: AgentKind[];
  collapsedByDefault: boolean;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "cat:ide",
    label: "IDE Sessions",
    badge: "IDE",
    kinds: ["ide"],
    collapsedByDefault: false,
  },
  {
    id: "cat:cli",
    label: "CLI Sessions",
    badge: "CLI",
    kinds: ["cli"],
    collapsedByDefault: true,
  },
  {
    id: "cat:cloud",
    label: "Cloud Agents",
    badge: "CLD",
    kinds: ["cloud"],
    collapsedByDefault: true,
  },
];

export function isCategoryId(id: string): id is CategoryId {
  return id.startsWith("cat:");
}

export function categoryForKind(kind: AgentKind): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.kinds.includes(kind));
}

/**
 * Build a category-grouped snapshot from a flat snapshot. Root nodes are
 * reorganised under virtual category parent rows. Agent and subagent kinds
 * remain nested under their original parent (which is typically an IDE or
 * cloud root already).
 *
 * Categories with no members are omitted from the output.
 */
export function groupByCategory(snapshot: AgentSnapshot): AgentSnapshot {
  const catChildren: Record<CategoryId, string[]> = {
    "cat:ide": [],
    "cat:cli": [],
    "cat:cloud": [],
  };

  const newRoots: string[] = [];
  const newNodes: Record<string, AgentNode> = {};
  const uncategorisedRoots: string[] = [];

  for (const [id, node] of Object.entries(snapshot.nodes)) {
    newNodes[id] = { ...node, children: node.children ? [...node.children] : undefined };
  }

  for (const rootId of snapshot.roots) {
    const node = newNodes[rootId];
    if (!node) continue;
    const cat = categoryForKind(node.kind);
    if (cat) {
      catChildren[cat.id].push(rootId);
      newNodes[rootId] = { ...newNodes[rootId]!, parentId: cat.id };
    } else {
      uncategorisedRoots.push(rootId);
    }
  }

  const seenCats = new Set<CategoryId>();
  for (const cat of CATEGORIES) {
    if (catChildren[cat.id].length > 0 && !seenCats.has(cat.id)) {
      seenCats.add(cat.id);
      const catNode = makeCategoryNode(cat, catChildren[cat.id]);
      newNodes[cat.id] = catNode;
      newRoots.push(cat.id);
    }
  }

  for (const rootId of uncategorisedRoots) {
    newRoots.push(rootId);
  }

  return {
    ...snapshot,
    nodes: newNodes,
    roots: newRoots,
  };
}

/**
 * Count members per category for the totals header.
 */
export function categoryCounts(snapshot: AgentSnapshot): Record<CategoryId, number> {
  const counts: Record<CategoryId, number> = {
    "cat:ide": 0,
    "cat:cli": 0,
    "cat:cloud": 0,
  };
  for (const node of Object.values(snapshot.nodes)) {
    if (isCategoryId(node.id)) continue;
    const cat = categoryForKind(node.kind);
    if (cat) counts[cat.id] += 1;
  }
  return counts;
}

function makeCategoryNode(cat: CategoryInfo, children: string[]): AgentNode {
  return {
    id: cat.id,
    parentId: null,
    kind: cat.kinds[0]!,
    pid: null,
    label: cat.label,
    title: "",
    model: null,
    repo: null,
    startedAt: 0,
    status: "running",
    recentLogs: [],
    logSource: null,
    tokenUsage: null,
    children,
  };
}

/**
 * Return the set of category IDs that should be expanded at startup.
 * Categories with `collapsedByDefault: true` are NOT included.
 */
export function defaultCategoryExpansion(): Set<string> {
  const expanded = new Set<string>();
  for (const cat of CATEGORIES) {
    if (!cat.collapsedByDefault) {
      expanded.add(cat.id);
    }
  }
  return expanded;
}
