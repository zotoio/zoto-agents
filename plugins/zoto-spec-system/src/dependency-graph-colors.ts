/**
 * Auto-color the mermaid dependency graph in a spec index based on subtask
 * states. Called by the aggregator on every tick — turns a node green as soon
 * as the matching `<specDir>/status/<subtask>.status.yml` reports
 * `state: completed`, surfaces in-progress / blocked / failed states with
 * distinct fills, and remains a no-op when the spec index has no mermaid
 * block under `## Subtask Dependency Graph`.
 *
 * Conventions supported (extracted automatically — generators do not need to
 * use any particular id scheme):
 *   - `S01[01: Token-Budget Audit]`  → node S01 → subtask 01
 *   - `A[subtask-01]`                → node A   → subtask 01
 *   - `S03[03 Implement loader]`     → node S03 → subtask 03
 *
 * Idempotent: re-running with the same state set produces byte-identical
 * output. Existing `classDef` / `class` directives that this helper itself
 * authored are stripped and re-emitted on every call.
 */

export type SubtaskState =
  | "pending"
  | "in_progress"
  | "blocked"
  | "completed"
  | "failed";

export interface StateClass {
  className: string;
  fill: string;
  stroke: string;
  color: string;
}

/**
 * Tailwind-inspired palette. The "completed → green" mapping is the explicit
 * user-facing requirement; the rest follow conventional severity colours.
 */
export const STATE_CLASSES: Record<SubtaskState, StateClass> = {
  completed: {
    className: "specDone",
    fill: "#86efac",
    stroke: "#15803d",
    color: "#052e16",
  },
  in_progress: {
    className: "specInProgress",
    fill: "#fde68a",
    stroke: "#a16207",
    color: "#3f1d05",
  },
  blocked: {
    className: "specBlocked",
    fill: "#fca5a5",
    stroke: "#991b1b",
    color: "#3f0a0a",
  },
  failed: {
    className: "specFailed",
    fill: "#fca5a5",
    stroke: "#991b1b",
    color: "#3f0a0a",
  },
  pending: {
    className: "specPending",
    fill: "#e5e7eb",
    stroke: "#6b7280",
    color: "#1f2937",
  },
};

/** Marker the helper writes after its `classDef` / `class` block. */
const MANAGED_BLOCK_BEGIN = "%% spec-system:classes:begin";
const MANAGED_BLOCK_END = "%% spec-system:classes:end";

const MERMAID_FENCE_RE =
  /(```mermaid\s*\n)([\s\S]*?)(\n```)/g;

const NODE_DECL_RE = /\b([A-Za-z][A-Za-z0-9_]*)\[([^\]]+)\]/g;

/** Extract the first `\d{1,2}` digit run we can find in a label, padded to 2. */
export function subtaskIdFromLabel(label: string): string | null {
  const m = label.match(/(?:subtask[-_])?(\d{1,2})\b/);
  if (!m) return null;
  const digits = m[1]!;
  return digits.length === 1 ? `0${digits}` : digits;
}

export interface NodeMapping {
  nodeId: string;
  subtaskId: string;
}

/**
 * Parse mermaid graph body for `<nodeId>[<label>]` declarations. Returns
 * unique node-id ↔ subtask-id mappings (later occurrences are deduped).
 */
export function extractGraphNodeIds(mermaidBody: string): NodeMapping[] {
  const seen = new Set<string>();
  const out: NodeMapping[] = [];
  for (const m of mermaidBody.matchAll(NODE_DECL_RE)) {
    const nodeId = m[1]!;
    const label = m[2]!;
    if (seen.has(nodeId)) continue;
    const subtaskId = subtaskIdFromLabel(label);
    if (!subtaskId) continue;
    seen.add(nodeId);
    out.push({ nodeId, subtaskId });
  }
  return out;
}

/**
 * Strip any previously-managed `classDef` / `class` block emitted by this
 * helper — identified by the fence comments above. Returns the cleaned body.
 */
function stripManagedBlock(body: string): string {
  const startIdx = body.indexOf(MANAGED_BLOCK_BEGIN);
  if (startIdx === -1) return body;
  const endIdx = body.indexOf(MANAGED_BLOCK_END, startIdx);
  if (endIdx === -1) return body;
  // Trim a leading newline if present so we don't accumulate blank lines.
  const before = body.slice(0, startIdx).replace(/[ \t]*\n?$/, "");
  const after = body.slice(endIdx + MANAGED_BLOCK_END.length).replace(/^[ \t]*\n?/, "");
  return `${before}\n${after}`.trimEnd() + "\n";
}

function indentForBody(body: string): string {
  // Use the indentation of the first non-empty line as the canonical indent
  // for our injected lines. Falls back to 4 spaces (matches the generator
  // template).
  for (const line of body.split("\n")) {
    if (line.trim().length === 0) continue;
    const m = line.match(/^(\s+)/);
    if (m) return m[1]!;
    return "";
  }
  return "    ";
}

function buildManagedBlock(
  mappings: NodeMapping[],
  states: Map<string, SubtaskState>,
  indent: string,
): string {
  // Group node ids by state.
  const grouped = new Map<SubtaskState, string[]>();
  for (const { nodeId, subtaskId } of mappings) {
    const state = states.get(subtaskId);
    if (!state) continue;
    let arr = grouped.get(state);
    if (!arr) {
      arr = [];
      grouped.set(state, arr);
    }
    arr.push(nodeId);
  }

  if (grouped.size === 0) {
    return "";
  }

  // Emit classDefs in a stable order matching STATE_CLASSES enumeration.
  const stateOrder: SubtaskState[] = [
    "completed",
    "in_progress",
    "blocked",
    "failed",
    "pending",
  ];
  const lines: string[] = [];
  lines.push(`${indent}${MANAGED_BLOCK_BEGIN}`);
  for (const state of stateOrder) {
    if (!grouped.has(state)) continue;
    const c = STATE_CLASSES[state];
    lines.push(
      `${indent}classDef ${c.className} fill:${c.fill},stroke:${c.stroke},color:${c.color}`,
    );
  }
  for (const state of stateOrder) {
    const ids = grouped.get(state);
    if (!ids || ids.length === 0) continue;
    const c = STATE_CLASSES[state];
    lines.push(`${indent}class ${ids.join(",")} ${c.className}`);
  }
  lines.push(`${indent}${MANAGED_BLOCK_END}`);
  return lines.join("\n");
}

/**
 * Apply state-based colors to every mermaid block in a spec index markdown.
 * Returns the (possibly unchanged) markdown — caller compares before writing.
 */
export function applyDependencyGraphColors(
  indexMarkdown: string,
  states: Map<string, SubtaskState>,
): string {
  if (states.size === 0) return indexMarkdown;

  return indexMarkdown.replace(
    MERMAID_FENCE_RE,
    (_full, openFence: string, body: string, closeFence: string): string => {
      const cleaned = stripManagedBlock(body);
      const mappings = extractGraphNodeIds(cleaned);
      if (mappings.length === 0) {
        return `${openFence}${cleaned.trimEnd()}\n${closeFence.trim()}`;
      }
      const indent = indentForBody(cleaned);
      const managed = buildManagedBlock(mappings, states, indent);
      const trimmedBody = cleaned.replace(/\s+$/, "");
      const withManaged =
        managed.length > 0 ? `${trimmedBody}\n\n${managed}` : trimmedBody;
      return `${openFence}${withManaged}\n${closeFence.trim()}`;
    },
  );
}

/**
 * Convenience: build a state map from the aggregator's `subtasks` array.
 */
export function statesFromSubtaskRows(
  rows: Array<{ subtask_id: string; state: SubtaskState }>,
): Map<string, SubtaskState> {
  const out = new Map<string, SubtaskState>();
  for (const r of rows) out.set(r.subtask_id, r.state);
  return out;
}
