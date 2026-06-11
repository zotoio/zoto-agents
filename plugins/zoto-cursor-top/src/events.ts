/**
 * Pure snapshot-diff event detection for the cursor-top TUI.
 *
 * Events are derived from consecutive unfiltered {@link AgentSnapshot}s and
 * never touch the JSON / `--once` output path.
 */

import type { AgentNode, AgentSnapshot, AgentStatus } from "./types.js";
import { formatDuration } from "./ui/format.js";

export type AgentEventKind =
  | "finished"
  | "failed"
  | "waiting"
  | "appeared"
  | "vanished";

export interface AgentEvent {
  /** Stable node id this event refers to. */
  id: string;
  /** Short human label from the node (`Task(explore)`, `chat`, …). */
  label: string;
  /** Long-form title when available (may be empty). */
  title: string;
  kind: AgentEventKind;
  /** Prior status, or null for newly appeared nodes. */
  from: AgentStatus | null;
  /** New status, or null when the node vanished. */
  to: AgentStatus | null;
  /** Wall-clock ms when the transition was observed. */
  at: number;
}

/** Ring-buffer capacity for recent events in the TUI. */
export const EVENT_RING_CAP = 50;

/** How long (ms) a row stays highlighted after its status changes. */
export const HIGHLIGHT_MS = 5_000;

/** Statuses that imply "active" when a node vanishes under `--active-only`. */
const VANISH_AS_FINISHED: ReadonlySet<AgentStatus> = new Set([
  "running",
  "waiting",
  "idle",
]);

/**
 * Compare two consecutive snapshots and return lifecycle events.
 *
 * Pass `prev = null` on the first frame — no events are emitted.
 * `unknown` transitions are ignored to avoid transcript-status noise.
 * `running → idle` is likewise not an event.
 */
export function diffSnapshots(
  prev: AgentSnapshot | null,
  next: AgentSnapshot,
  now: number,
): AgentEvent[] {
  if (!prev) return [];

  const events: AgentEvent[] = [];
  const prevIds = new Set(Object.keys(prev.nodes));
  const nextIds = new Set(Object.keys(next.nodes));

  for (const id of nextIds) {
    const nextNode = next.nodes[id]!;
    const prevNode = prev.nodes[id];
    if (!prevNode) {
      events.push(toEvent(nextNode, "appeared", null, nextNode.status, now));
      continue;
    }
    if (prevNode.status === nextNode.status) continue;
    const kind = transitionKind(prevNode.status, nextNode.status);
    if (kind) {
      events.push(toEvent(nextNode, kind, prevNode.status, nextNode.status, now));
    }
  }

  for (const id of prevIds) {
    if (nextIds.has(id)) continue;
    const prevNode = prev.nodes[id]!;
    if (VANISH_AS_FINISHED.has(prevNode.status)) {
      events.push(toEvent(prevNode, "finished", prevNode.status, null, now));
    }
  }

  return events;
}

function transitionKind(
  from: AgentStatus,
  to: AgentStatus,
): AgentEventKind | null {
  if (from === "unknown" || to === "unknown") return null;
  if (from === "running" && to === "idle") return null;
  if (to === "done") return "finished";
  if (to === "error") return "failed";
  if (to === "waiting") return "waiting";
  return null;
}

function toEvent(
  node: AgentNode,
  kind: AgentEventKind,
  from: AgentStatus | null,
  to: AgentStatus | null,
  at: number,
): AgentEvent {
  return {
    id: node.id,
    label: node.label,
    title: node.title,
    kind,
    from,
    to,
    at,
  };
}

/** Prepend fresh events and cap the ring buffer. */
export function appendEvents(
  buffer: AgentEvent[],
  incoming: AgentEvent[],
  cap = EVENT_RING_CAP,
): AgentEvent[] {
  if (incoming.length === 0) return buffer;
  return [...incoming, ...buffer].slice(0, cap);
}

/** Merge incoming status-change timestamps into a highlight map. */
export function mergeChangedAt(
  prev: Record<string, number>,
  events: AgentEvent[],
  now: number,
): Record<string, number> {
  const next = { ...prev };
  for (const e of events) {
    if (e.kind === "appeared") {
      next[e.id] = now;
    } else if (e.from !== null && e.to !== null && e.from !== e.to) {
      next[e.id] = now;
    } else if (e.kind === "finished" || e.kind === "failed" || e.kind === "waiting") {
      next[e.id] = now;
    }
  }
  return next;
}

/** Drop highlight entries older than {@link HIGHLIGHT_MS}. */
export function pruneChangedAt(
  changedAt: Record<string, number>,
  now: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, at] of Object.entries(changedAt)) {
    if (now - at <= HIGHLIGHT_MS) out[id] = at;
  }
  return out;
}

export function isHighlighted(
  changedAt: Record<string, number>,
  id: string,
  now: number,
): boolean {
  const at = changedAt[id];
  return at != null && now - at <= HIGHLIGHT_MS;
}

/** Whether any event in the batch warrants a terminal bell. */
export function shouldRingBell(events: AgentEvent[]): boolean {
  return events.some((e) => e.kind === "finished" || e.kind === "failed");
}

/** Write a single BEL character (injectable for tests). */
export function emitBell(
  write: (data: string) => void = (data) => process.stderr.write(data),
): void {
  write("\u0007");
}

const EVENT_ICONS: Record<AgentEventKind, string> = {
  finished: "✓",
  failed: "✗",
  waiting: "⏸",
  appeared: "+",
  vanished: "−",
};

/** Human-readable one-liner for the event strip. */
export function formatEventLine(event: AgentEvent, now: number): string {
  const icon = EVENT_ICONS[event.kind];
  const ago = formatDuration(now - event.at);
  switch (event.kind) {
    case "finished":
      return `${icon} ${event.label} finished · ${ago} ago`;
    case "failed":
      return `${icon} ${event.label} failed`;
    case "waiting":
      return `${icon} ${event.label} waiting`;
    case "appeared":
      return `${icon} ${event.label} appeared`;
    case "vanished":
      return `${icon} ${event.label} vanished`;
    default:
      return `${icon} ${event.label}`;
  }
}

/** Most recent N events for the strip (newest first). */
export function recentEventsForStrip(
  buffer: AgentEvent[],
  count = 4,
): AgentEvent[] {
  return buffer.slice(0, Math.min(count, buffer.length));
}
