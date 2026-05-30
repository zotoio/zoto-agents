import { describe, expect, it } from "vitest";
import { buildHierarchy } from "../src/discovery/hierarchy.js";
import type { AgentNode } from "../src/types.js";

function node(over: Partial<AgentNode>): AgentNode {
  return {
    id: "x",
    parentId: null,
    kind: "subagent",
    pid: null,
    label: "x",
    title: "",
    model: null,
    repo: null,
    startedAt: 0,
    status: "running",
    recentLogs: [],
    logSource: null,
    ...over,
  };
}

describe("buildHierarchy", () => {
  it("nests subagents under their explicit parent", () => {
    const result = buildHierarchy({
      nodes: [
        node({ id: "root", pid: 1, kind: "ide", startedAt: 1 }),
        node({ id: "sub1", parentId: "root", startedAt: 2 }),
        node({ id: "sub2", parentId: "root", startedAt: 3 }),
      ],
      pidParents: new Map(),
    });
    expect(result.roots).toEqual(["root"]);
    expect(result.nodes.root!.children).toEqual(["sub1", "sub2"]);
  });

  it("falls back to PPID linkage when parentId is missing", () => {
    const result = buildHierarchy({
      nodes: [
        node({ id: "pid:100", pid: 100, kind: "ide", startedAt: 1 }),
        node({ id: "pid:101", pid: 101, kind: "ide", startedAt: 2 }),
      ],
      pidParents: new Map([[101, 100]]),
    });
    expect(result.roots).toEqual(["pid:100"]);
    expect(result.nodes["pid:100"]!.children).toEqual(["pid:101"]);
    expect(result.nodes["pid:101"]!.parentId).toBe("pid:100");
  });

  it("treats nodes with unknown parents as roots", () => {
    const result = buildHierarchy({
      nodes: [node({ id: "ghost", parentId: "nope", startedAt: 1 })],
      pidParents: new Map(),
    });
    expect(result.roots).toEqual(["ghost"]);
    expect(result.nodes.ghost!.parentId).toBeNull();
  });

  it("sorts roots and children by start time", () => {
    const result = buildHierarchy({
      nodes: [
        node({ id: "a", startedAt: 30 }),
        node({ id: "b", startedAt: 10 }),
        node({ id: "c", startedAt: 20 }),
      ],
      pidParents: new Map(),
    });
    expect(result.roots).toEqual(["b", "c", "a"]);
  });

  it("does not link a node to itself when PID and PPID match", () => {
    const result = buildHierarchy({
      nodes: [node({ id: "pid:5", pid: 5, startedAt: 1 })],
      pidParents: new Map([[5, 5]]),
    });
    expect(result.roots).toEqual(["pid:5"]);
    expect(result.nodes["pid:5"]!.children).toEqual([]);
  });
});
