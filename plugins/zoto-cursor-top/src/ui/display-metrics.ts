/**
 * Display-time rollups for MODEL and TOKENS columns. Keeps raw {@link AgentNode}
 * fields intact for filtering, detail pane, and JSON export.
 */

import type { AgentNode } from "../types.js";
import { isPlaceholderModelSlug } from "../discovery/model-slug.js";

/** Sum of this node's tokenUsage plus every descendant (depth-first). */
export function sumSubtreeTokenUsage(
  id: string,
  nodes: Record<string, AgentNode>,
): number {
  const node = nodes[id];
  if (!node) return 0;
  let total = node.tokenUsage ?? 0;
  for (const childId of node.children ?? []) {
    total += sumSubtreeTokenUsage(childId, nodes);
  }
  return total;
}

/**
 * Token count shown in the tree row. Parents with children show the rolled-up
 * subtree total; leaves show their own composer session usage.
 */
export function displayTokenUsage(
  node: AgentNode,
  nodes: Record<string, AgentNode>,
): number | null {
  const hasChildren = (node.children?.length ?? 0) > 0;
  if (!hasChildren) return node.tokenUsage;
  const rolled = sumSubtreeTokenUsage(node.id, nodes);
  if (rolled > 0) return rolled;
  return node.tokenUsage;
}

function nodeCostUsd(node: AgentNode | undefined): number | null {
  if (!node) return null;
  if (node.costUsd != null && Number.isFinite(node.costUsd)) return node.costUsd;
  if (node.usage?.costUsd != null && Number.isFinite(node.usage.costUsd)) {
    return node.usage.costUsd;
  }
  return null;
}

/** Sum of this node's billed USD plus every descendant (depth-first). */
export function sumSubtreeCostUsd(
  id: string,
  nodes: Record<string, AgentNode>,
): number {
  const node = nodes[id];
  if (!node) return 0;
  let total = nodeCostUsd(node) ?? 0;
  for (const childId of node.children ?? []) {
    total += sumSubtreeCostUsd(childId, nodes);
  }
  return total;
}

/**
 * Billed USD shown in the tree row. Parents with children show the rolled-up
 * subtree total; leaves show their own conversation total. `null` means no
 * analytics data is attached (hide / show `-` depending on the column).
 */
export function displayCostUsd(
  node: AgentNode,
  nodes: Record<string, AgentNode>,
): number | null {
  const own = nodeCostUsd(node);
  const hasChildren = (node.children?.length ?? 0) > 0;
  if (!hasChildren) return own;
  const rolled = sumSubtreeCostUsd(node.id, nodes);
  if (rolled > 0) return rolled;
  return own;
}

/** True when any node has billed-usage data (unlocks the COST column). */
export function snapshotHasCost(nodes: Record<string, AgentNode>): boolean {
  return Object.values(nodes).some((node) => nodeCostUsd(node) != null);
}

function collectSubtreeModels(
  id: string,
  nodes: Record<string, AgentNode>,
  out: Set<string>,
): void {
  const node = nodes[id];
  if (!node) return;
  if (!isPlaceholderModelSlug(node.model) && node.model) out.add(node.model);
  for (const childId of node.children ?? []) {
    collectSubtreeModels(childId, nodes, out);
  }
}

/**
 * Model slug shown in the tree row. Uses the node's own slug when known;
 * otherwise infers from descendants (single model → that slug, many → `mixed`).
 */
export function displayModelSlug(
  node: AgentNode,
  nodes: Record<string, AgentNode>,
): string | null {
  if (!isPlaceholderModelSlug(node.model) && node.model) return node.model;
  const models = new Set<string>();
  for (const childId of node.children ?? []) {
    collectSubtreeModels(childId, nodes, models);
  }
  if (models.size === 1) return [...models][0]!;
  if (models.size > 1) return "mixed";
  return null;
}
