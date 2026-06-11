import { describe, expect, it } from "vitest";
import { demoSnapshot } from "../src/discovery/demo.js";
import { filterSnapshot, parseFilterQuery } from "../src/filter.js";
import type { AgentNode, AgentSnapshot } from "../src/types.js";

function miniSnapshot(
  nodes: Record<string, AgentNode>,
  roots: string[],
): AgentSnapshot {
  return { capturedAt: 1, nodes, roots, diagnostics: [] };
}

describe("parseFilterQuery", () => {
  it("parses scoped tokens and bare terms", () => {
    const parsed = parseFilterQuery("repo:app model:gpt status:running explore");
    expect(parsed.terms).toEqual([
      { kind: "repo", value: "app" },
      { kind: "model", value: "gpt" },
      { kind: "status", value: "running" },
      { kind: "text", value: "explore" },
    ]);
  });

  it("honours quoted phrases with whitespace", () => {
    const parsed = parseFilterQuery('repo:"my app" foo');
    expect(parsed.terms).toEqual([
      { kind: "repo", value: "my app" },
      { kind: "text", value: "foo" },
    ]);
  });

  it("marks invalid status tokens as non-matching", () => {
    const parsed = parseFilterQuery("status:paused");
    expect(parsed.terms).toEqual([{ kind: "status-invalid", value: "paused" }]);
  });

  it("treats unknown scopes as free text", () => {
    const parsed = parseFilterQuery("kind:subagent");
    expect(parsed.terms).toEqual([{ kind: "text", value: "kind:subagent" }]);
  });
});

describe("filterSnapshot matcher semantics", () => {
  const snap = miniSnapshot(
    {
      root: {
        id: "root",
        parentId: null,
        kind: "ide",
        pid: 1,
        label: "Cursor IDE",
        title: "Auth refactor",
        model: "claude-opus-4.7",
        repo: "/Users/dev/work/app",
        startedAt: 0,
        status: "running",
        recentLogs: ["[ide] indexing files"],
        logSource: null,
        tokenUsage: null,
        children: ["child"],
      },
      child: {
        id: "child",
        parentId: "root",
        kind: "subagent",
        pid: null,
        label: "Task(explore)",
        title: "Find callsites",
        model: "gpt-5",
        repo: "/Users/dev/work/app",
        startedAt: 0,
        status: "waiting",
        recentLogs: ["grep legacyLogin"],
        logSource: null,
        tokenUsage: null,
      },
    },
    ["root"],
  );

  it("returns the snapshot untouched for blank queries", () => {
    const result = filterSnapshot(snap, "   ");
    expect(result.snapshot).toBe(snap);
    expect(result.matched).toBe(2);
    expect(result.total).toBe(2);
  });

  it("AND-combines terms case-insensitively", () => {
    const result = filterSnapshot(snap, "repo:APP status:running");
    expect(Object.keys(result.snapshot.nodes)).toEqual(["root"]);
    expect(result.matched).toBe(1);
  });

  it("matches free text across label, title, repo, model, and logs", () => {
    expect(filterSnapshot(snap, "legacyLogin").matched).toBe(1);
    expect(filterSnapshot(snap, "Auth").matched).toBe(1);
    expect(filterSnapshot(snap, "gpt-5").matched).toBe(1);
    expect(filterSnapshot(snap, "explore").matched).toBe(1);
  });

  it("scoped repo matches the node field only (null repo never matches)", () => {
    const withNullRepo = miniSnapshot(
      {
        a: {
          id: "a",
          parentId: null,
          kind: "subagent",
          pid: null,
          label: "orphan",
          title: "",
          model: null,
          repo: null,
          startedAt: 0,
          status: "unknown",
          recentLogs: [],
          logSource: null,
        tokenUsage: null,
        },
      },
      ["a"],
    );
    expect(filterSnapshot(withNullRepo, "repo:anything").matched).toBe(0);
  });

  it("invalid status yields zero matches", () => {
    expect(filterSnapshot(snap, "status:paused").matched).toBe(0);
  });
});

describe("filterSnapshot tree rewriting", () => {
  it("keeps ancestor chains but drops non-matching siblings", () => {
    const snap = miniSnapshot(
      {
        parent: {
          id: "parent",
          parentId: null,
          kind: "cloud",
          pid: 10,
          label: "Cloud Agent VM",
          title: "Plugin work",
          model: "claude-sonnet-4.5",
          repo: "/workspace",
          startedAt: 0,
          status: "running",
          recentLogs: [],
          logSource: null,
        tokenUsage: null,
          children: ["match", "miss"],
        },
        match: {
          id: "match",
          parentId: "parent",
          kind: "subagent",
          pid: null,
          label: "Task(debug)",
          title: "Flaky test",
          model: "claude-sonnet-4.5",
          repo: "/workspace",
          startedAt: 0,
          status: "waiting",
          recentLogs: [],
          logSource: null,
        tokenUsage: null,
        },
        miss: {
          id: "miss",
          parentId: "parent",
          kind: "subagent",
          pid: null,
          label: "Task(explore)",
          title: "Survey docs",
          model: "claude-sonnet-4.5",
          repo: "/workspace",
          startedAt: 0,
          status: "done",
          recentLogs: [],
          logSource: null,
        tokenUsage: null,
        },
      },
      ["parent"],
    );

    const result = filterSnapshot(snap, "status:waiting");
    expect(Object.keys(result.snapshot.nodes).sort()).toEqual(["match", "parent"]);
    expect(result.snapshot.nodes.parent!.children).toEqual(["match"]);
    expect(result.matched).toBe(1);
    expect(result.total).toBe(3);
  });

  it("parent match does not auto-include non-matching children", () => {
    const snap = miniSnapshot(
      {
        parent: {
          id: "parent",
          parentId: null,
          kind: "ide",
          pid: 1,
          label: "Cursor IDE",
          title: "Main",
          model: null,
          repo: "/workspace",
          startedAt: 0,
          status: "running",
          recentLogs: [],
          logSource: null,
        tokenUsage: null,
          children: ["child"],
        },
        child: {
          id: "child",
          parentId: "parent",
          kind: "subagent",
          pid: null,
          label: "Task(impl)",
          title: "Other repo work",
          model: null,
          repo: "/elsewhere",
          startedAt: 0,
          status: "idle",
          recentLogs: [],
          logSource: null,
        tokenUsage: null,
        },
      },
      ["parent"],
    );

    const result = filterSnapshot(snap, "repo:/workspace");
    expect(Object.keys(result.snapshot.nodes)).toEqual(["parent"]);
    expect(result.snapshot.nodes.parent!.children).toEqual([]);
  });
});

describe("filterSnapshot demo fixture", () => {
  it("filters demo data deterministically without changing default output", () => {
    const full = demoSnapshot(3);
    expect(Object.keys(full.nodes).length).toBeGreaterThan(0);

    const untouched = filterSnapshot(full, "");
    expect(untouched.snapshot).toBe(full);

    const running = filterSnapshot(full, "status:running");
    expect(running.matched).toBeGreaterThan(0);
    expect(running.matched).toBeLessThan(running.total);
    for (const node of Object.values(running.snapshot.nodes)) {
      if (node.parentId == null || running.snapshot.nodes[node.parentId]) {
        /* ancestor chain intact */
      } else {
        throw new Error("orphaned node in filtered demo snapshot");
      }
    }
  });
});
