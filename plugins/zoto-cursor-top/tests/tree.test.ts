import { describe, expect, it } from "vitest";
import { flattenVisible } from "../src/ui/Tree.js";
import type { AgentNode, AgentSnapshot } from "../src/types.js";

function node(over: Partial<AgentNode>): AgentNode {
  return {
    id: "x",
    parentId: null,
    kind: "ide",
    pid: null,
    label: "x",
    title: "",
    model: null,
    repo: null,
    startedAt: 0,
    status: "running",
    recentLogs: [],
    logSource: null,
    children: [],
    ...over,
  };
}

function snapshot(nodes: AgentNode[], roots: string[]): AgentSnapshot {
  const map: Record<string, AgentNode> = {};
  for (const n of nodes) map[n.id] = n;
  return { capturedAt: 0, nodes: map, roots, diagnostics: [] };
}

describe("flattenVisible", () => {
  it("returns only roots when nothing is expanded", () => {
    const snap = snapshot(
      [
        node({ id: "r1", children: ["s1"] }),
        node({ id: "s1", parentId: "r1" }),
      ],
      ["r1"],
    );
    const rows = flattenVisible(snap, new Set());
    expect(rows.map((r) => r.id)).toEqual(["r1"]);
  });

  it("includes children depth-first when expanded", () => {
    const snap = snapshot(
      [
        node({ id: "r1", children: ["s1", "s2"] }),
        node({ id: "s1", parentId: "r1", children: ["g1"] }),
        node({ id: "g1", parentId: "s1" }),
        node({ id: "s2", parentId: "r1" }),
      ],
      ["r1"],
    );
    const rows = flattenVisible(snap, new Set(["r1", "s1"]));
    expect(rows.map((r) => `${r.id}:${r.depth}`)).toEqual([
      "r1:0",
      "s1:1",
      "g1:2",
      "s2:1",
    ]);
  });
});
