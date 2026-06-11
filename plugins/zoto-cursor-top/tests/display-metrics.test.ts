import { describe, expect, it } from "vitest";
import {
  displayModelSlug,
  displayTokenUsage,
  sumSubtreeTokenUsage,
} from "../src/ui/display-metrics.js";
import type { AgentNode } from "../src/types.js";

function node(over: Partial<AgentNode> & Pick<AgentNode, "id">): AgentNode {
  return {
    parentId: null,
    kind: "agent",
    pid: null,
    label: over.id,
    title: "",
    model: null,
    repo: null,
    startedAt: 0,
    status: "running",
    recentLogs: [],
    logSource: null,
    tokenUsage: null,
    children: [],
    ...over,
  };
}

describe("display-metrics rollups", () => {
  it("sums token usage across descendants", () => {
    const nodes: Record<string, AgentNode> = {
      ide: node({
        id: "ide",
        kind: "ide",
        pid: 1,
        children: ["chat"],
        tokenUsage: null,
      }),
      chat: node({
        id: "chat",
        parentId: "ide",
        tokenUsage: 1200,
        children: ["sub"],
      }),
      sub: node({
        id: "sub",
        kind: "subagent",
        parentId: "chat",
        tokenUsage: 800,
      }),
    };
    expect(sumSubtreeTokenUsage("ide", nodes)).toBe(2000);
    expect(displayTokenUsage(nodes.ide!, nodes)).toBe(2000);
    expect(displayTokenUsage(nodes.chat!, nodes)).toBe(2000);
    expect(displayTokenUsage(nodes.sub!, nodes)).toBe(800);
  });

  it("infers model from a single child slug", () => {
    const nodes: Record<string, AgentNode> = {
      ide: node({
        id: "ide",
        kind: "ide",
        pid: 1,
        model: null,
        children: ["chat"],
      }),
      chat: node({
        id: "chat",
        parentId: "ide",
        model: "claude-opus-4.8",
      }),
    };
    expect(displayModelSlug(nodes.ide!, nodes)).toBe("claude-opus-4.8");
  });

  it("shows mixed when descendants use different models", () => {
    const nodes: Record<string, AgentNode> = {
      root: node({
        id: "root",
        kind: "ide",
        pid: 1,
        children: ["a", "b"],
      }),
      a: node({ id: "a", parentId: "root", model: "gpt-5.2" }),
      b: node({ id: "b", parentId: "root", model: "claude-opus-4.8" }),
    };
    expect(displayModelSlug(nodes.root!, nodes)).toBe("mixed");
  });

  it("keeps leaf model and ignores placeholder slugs", () => {
    const nodes: Record<string, AgentNode> = {
      chat: node({ id: "chat", model: "default" }),
    };
    expect(displayModelSlug(nodes.chat!, nodes)).toBe(null);
  });
});
