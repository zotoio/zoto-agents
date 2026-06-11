/**
 * Pure snapshot filtering for cursor-top — no UI imports.
 *
 * Supports scoped tokens (`repo:`, `model:`, `status:`) and bare free-text
 * terms AND-combined with case-insensitive substring matching. Status tokens
 * match exactly against {@link AgentStatus} values.
 */

import type { AgentNode, AgentSnapshot, AgentStatus } from "./types.js";

const STATUS_VALUES = new Set<AgentStatus>([
  "running",
  "waiting",
  "idle",
  "done",
  "error",
  "unknown",
]);

export type FilterTerm =
  | { kind: "repo"; value: string }
  | { kind: "model"; value: string }
  | { kind: "status"; value: AgentStatus }
  | { kind: "status-invalid"; value: string }
  | { kind: "text"; value: string };

export interface ParsedFilterQuery {
  terms: FilterTerm[];
  raw: string;
}

export interface FilterResult {
  snapshot: AgentSnapshot;
  /** Nodes whose fields satisfy every term (ancestors excluded). */
  matched: number;
  /** Total nodes in the input snapshot. */
  total: number;
}

/**
 * Tokenise a filter query, honouring single- or double-quoted phrases anywhere
 * in the stream (including scoped values like `repo:"my app"`).
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    while (i < input.length && /\s/.test(input[i]!)) i += 1;
    if (i >= input.length) break;

    let buf = "";
    while (i < input.length && !/\s/.test(input[i]!)) {
      const ch = input[i]!;
      if (ch === '"' || ch === "'") {
        const quote = ch;
        buf += ch;
        i += 1;
        while (i < input.length && input[i] !== quote) {
          buf += input[i]!;
          i += 1;
        }
        if (i < input.length && input[i] === quote) {
          buf += input[i]!;
          i += 1;
        }
        continue;
      }
      buf += ch;
      i += 1;
    }
    if (buf.length > 0) tokens.push(buf);
  }
  return tokens;
}

/** Parse a filter bar / `--filter` query string into AND-combined terms. */
export function parseFilterQuery(input: string): ParsedFilterQuery {
  const tokens = tokenize(input.trim());
  const terms: FilterTerm[] = [];

  for (const token of tokens) {
    const colonIdx = token.indexOf(":");
    if (colonIdx > 0) {
      const scope = token.slice(0, colonIdx).toLowerCase();
      let value = token.slice(colonIdx + 1);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (scope === "repo") {
        terms.push({ kind: "repo", value });
      } else if (scope === "model") {
        terms.push({ kind: "model", value });
      } else if (scope === "status") {
        const normalized = value.toLowerCase();
        if (STATUS_VALUES.has(normalized as AgentStatus)) {
          terms.push({ kind: "status", value: normalized as AgentStatus });
        } else {
          terms.push({ kind: "status-invalid", value });
        }
      } else {
        terms.push({ kind: "text", value: token });
      }
    } else {
      terms.push({ kind: "text", value: token });
    }
  }

  return { terms, raw: input };
}

function includesInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function matchFreeText(node: AgentNode, text: string): boolean {
  if (includesInsensitive(node.label, text)) return true;
  if (includesInsensitive(node.title, text)) return true;
  if (node.repo && includesInsensitive(node.repo, text)) return true;
  if (node.model && includesInsensitive(node.model, text)) return true;
  return node.recentLogs.some((line) => includesInsensitive(line, text));
}

function nodeMatches(node: AgentNode, terms: FilterTerm[]): boolean {
  if (terms.length === 0) return true;
  return terms.every((term) => {
    switch (term.kind) {
      case "repo":
        return node.repo != null && includesInsensitive(node.repo, term.value);
      case "model":
        return node.model != null && includesInsensitive(node.model, term.value);
      case "status":
        return node.status === term.value;
      case "status-invalid":
        return false;
      case "text":
        return matchFreeText(node, term.value);
      default:
        return false;
    }
  });
}

/**
 * Narrow a snapshot to matching nodes plus their ancestor chains so the tree
 * stays navigable. Non-matching children of a matched node are excluded.
 *
 * Empty or whitespace-only queries return the input snapshot unchanged.
 */
export function filterSnapshot(
  snapshot: AgentSnapshot,
  query: string,
): FilterResult {
  const total = Object.keys(snapshot.nodes).length;
  const trimmed = query.trim();
  if (!trimmed) {
    return { snapshot, matched: total, total };
  }

  const { terms } = parseFilterQuery(trimmed);
  if (terms.length === 0) {
    return { snapshot, matched: total, total };
  }

  const matching = new Set<string>();
  let matched = 0;

  for (const [id, node] of Object.entries(snapshot.nodes)) {
    if (nodeMatches(node, terms)) {
      matching.add(id);
      matched += 1;
    }
  }

  const survives = new Set<string>(matching);
  for (const id of matching) {
    let parentId = snapshot.nodes[id]?.parentId ?? null;
    while (parentId) {
      survives.add(parentId);
      parentId = snapshot.nodes[parentId]?.parentId ?? null;
    }
  }

  if (survives.size === 0) {
    return {
      snapshot: {
        capturedAt: snapshot.capturedAt,
        nodes: {},
        roots: [],
        diagnostics: snapshot.diagnostics,
      },
      matched: 0,
      total,
    };
  }

  const out: Record<string, AgentNode> = {};
  for (const id of survives) {
    const original = snapshot.nodes[id]!;
    out[id] = {
      ...original,
      children: (original.children ?? []).filter((childId) =>
        survives.has(childId),
      ),
    };
  }
  const keptRoots = snapshot.roots.filter((id) => survives.has(id));

  return {
    snapshot: {
      capturedAt: snapshot.capturedAt,
      nodes: out,
      roots: keptRoots,
      diagnostics: snapshot.diagnostics,
    },
    matched,
    total,
  };
}
