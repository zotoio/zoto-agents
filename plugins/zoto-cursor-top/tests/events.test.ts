import { describe, expect, it, vi } from "vitest";
import {
  appendEvents,
  diffSnapshots,
  emitBell,
  EVENT_RING_CAP,
  formatEventLine,
  isHighlighted,
  mergeChangedAt,
  pruneChangedAt,
  shouldRingBell,
} from "../src/events.js";
import type { AgentNode, AgentSnapshot } from "../src/types.js";

const NOW = 1_700_000_000_000;

function node(
  partial: Partial<AgentNode> & Pick<AgentNode, "id">,
): AgentNode {
  return {
    parentId: null,
    kind: "agent",
    pid: null,
    label: "chat",
    title: "",
    model: null,
    repo: null,
    startedAt: NOW - 60_000,
    status: "running",
    recentLogs: [],
    logSource: null,
    tokenUsage: null,
    ...partial,
  };
}

function snap(
  nodes: Record<string, AgentNode>,
  roots: string[] = Object.keys(nodes),
): AgentSnapshot {
  return { capturedAt: NOW, nodes, roots, diagnostics: [] };
}

describe("diffSnapshots", () => {
  it("returns no events when prev is null (initial frame)", () => {
    const next = snap({ a: node({ id: "a" }) });
    expect(diffSnapshots(null, next, NOW)).toEqual([]);
  });

  it("returns no events on identical snapshots", () => {
    const n = node({ id: "a", status: "running" });
    const s = snap({ a: n });
    expect(diffSnapshots(s, s, NOW)).toEqual([]);
  });

  it("detects transition to done as finished", () => {
    const prev = snap({ a: node({ id: "a", label: "main", status: "running" }) });
    const next = snap({
      a: node({ id: "a", label: "main", status: "done" }),
    });
    const events = diffSnapshots(prev, next, NOW);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "a",
      label: "main",
      kind: "finished",
      from: "running",
      to: "done",
      at: NOW,
    });
  });

  it("detects transition to error as failed", () => {
    const prev = snap({ a: node({ id: "a", label: "chat", status: "running" }) });
    const next = snap({
      a: node({ id: "a", label: "chat", status: "error" }),
    });
    const events = diffSnapshots(prev, next, NOW);
    expect(events[0]).toMatchObject({ kind: "failed", from: "running", to: "error" });
  });

  it("detects transition to waiting as waiting", () => {
    const prev = snap({ a: node({ id: "a", label: "main", status: "running" }) });
    const next = snap({
      a: node({ id: "a", label: "main", status: "waiting" }),
    });
    const events = diffSnapshots(prev, next, NOW);
    expect(events[0]).toMatchObject({ kind: "waiting", from: "running", to: "waiting" });
  });

  it("ignores running→idle transitions", () => {
    const prev = snap({ a: node({ id: "a", status: "running" }) });
    const next = snap({ a: node({ id: "a", status: "idle" }) });
    expect(diffSnapshots(prev, next, NOW)).toEqual([]);
  });

  it("ignores unknown status transitions", () => {
    const prev = snap({ a: node({ id: "a", status: "unknown" }) });
    const next = snap({ a: node({ id: "a", status: "running" }) });
    expect(diffSnapshots(prev, next, NOW)).toEqual([]);
  });

  it("detects newly appeared nodes", () => {
    const prev = snap({ a: node({ id: "a" }) });
    const next = snap({
      a: node({ id: "a" }),
      b: node({ id: "b", label: "Task(explore)", status: "running" }),
    });
    const events = diffSnapshots(prev, next, NOW);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "b",
      label: "Task(explore)",
      kind: "appeared",
      from: null,
      to: "running",
    });
  });

  it("reports vanished active-only nodes as finished (not silently dropped)", () => {
    const prev = snap({
      a: node({ id: "a", label: "Task(explore)", status: "running" }),
    });
    const next = snap({});
    const events = diffSnapshots(prev, next, NOW);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: "a",
      label: "Task(explore)",
      kind: "finished",
      from: "running",
      to: null,
    });
  });

  it("treats vanished waiting and idle nodes as finished", () => {
    for (const status of ["waiting", "idle"] as const) {
      const prev = snap({ a: node({ id: "a", status }) });
      const next = snap({});
      expect(diffSnapshots(prev, next, NOW)[0]!.kind).toBe("finished");
    }
  });

  it("does not emit events when done nodes vanish", () => {
    const prev = snap({ a: node({ id: "a", status: "done" }) });
    const next = snap({});
    expect(diffSnapshots(prev, next, NOW)).toEqual([]);
  });

  it("keeps stable node ids across active-only prunes", () => {
    const prev = snap({
      sub: node({ id: "sub-1", label: "Task(explore)", status: "running" }),
    });
    const next = snap({});
    const [ev] = diffSnapshots(prev, next, NOW);
    expect(ev!.id).toBe("sub-1");
  });
});

describe("appendEvents ring buffer", () => {
  it("prepends incoming events and caps at EVENT_RING_CAP", () => {
    const existing = Array.from({ length: 49 }, (_, i) => ({
      id: `old-${i}`,
      label: "x",
      title: "",
      kind: "appeared" as const,
      from: null,
      to: "running" as const,
      at: NOW,
    }));
    const incoming = [
      {
        id: "new",
        label: "y",
        title: "",
        kind: "finished" as const,
        from: "running" as const,
        to: "done" as const,
        at: NOW + 1,
      },
    ];
    const merged = appendEvents(existing, incoming);
    expect(merged).toHaveLength(EVENT_RING_CAP);
    expect(merged[0]!.id).toBe("new");
    expect(merged[1]!.id).toBe("old-0");
  });
});

describe("highlight helpers", () => {
  it("mergeChangedAt records status transitions", () => {
    const events = diffSnapshots(
      snap({ a: node({ id: "a", status: "running" }) }),
      snap({ a: node({ id: "a", status: "waiting" }) }),
      NOW,
    );
    const map = mergeChangedAt({}, events, NOW);
    expect(map.a).toBe(NOW);
    expect(isHighlighted(map, "a", NOW)).toBe(true);
    expect(isHighlighted(map, "a", NOW + 6_000)).toBe(false);
  });

  it("pruneChangedAt drops expired entries", () => {
    const pruned = pruneChangedAt({ a: NOW - 6_000 }, NOW);
    expect(pruned).toEqual({});
  });
});

describe("formatEventLine", () => {
  it("formats finished events with relative time", () => {
    const line = formatEventLine(
      {
        id: "a",
        label: "Task(explore)",
        title: "",
        kind: "finished",
        from: "running",
        to: "done",
        at: NOW - 12_000,
      },
      NOW,
    );
    expect(line).toBe("✓ Task(explore) finished · 12s ago");
  });
});

describe("bell gating", () => {
  it("shouldRingBell is true only for finished and failed", () => {
    expect(
      shouldRingBell([
        {
          id: "a",
          label: "x",
          title: "",
          kind: "waiting",
          from: "running",
          to: "waiting",
          at: NOW,
        },
      ]),
    ).toBe(false);
    expect(
      shouldRingBell([
        {
          id: "a",
          label: "x",
          title: "",
          kind: "finished",
          from: "running",
          to: "done",
          at: NOW,
        },
      ]),
    ).toBe(true);
    expect(
      shouldRingBell([
        {
          id: "a",
          label: "x",
          title: "",
          kind: "failed",
          from: "running",
          to: "error",
          at: NOW,
        },
      ]),
    ).toBe(true);
  });

  it("emitBell writes a single BEL via injectable writer", () => {
    const write = vi.fn();
    emitBell(write);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith("\u0007");
  });
});
