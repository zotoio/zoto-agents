import React from "react";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import type { AgentNode, AgentSnapshot } from "../src/types.js";
import { App } from "../src/ui/App.js";

function agent(id: string, label: string): AgentNode {
  return {
    id,
    parentId: null,
    kind: "agent",
    pid: null,
    label,
    title: "",
    model: "m",
    repo: "/r",
    startedAt: Date.now() - 60_000,
    status: "running",
    recentLogs: [],
    logSource: null,
    tokenUsage: null,
    children: [],
  };
}

function linearSnapshot(count: number): AgentSnapshot {
  const nodes: Record<string, AgentNode> = {};
  const roots: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `row-${i}`;
    nodes[id] = agent(id, `LABEL-${i.toString().padStart(4, "0")}`);
    roots.push(id);
  }
  return { capturedAt: 0, nodes, roots, diagnostics: [] };
}

function hasOverflowAbove(frame: string): boolean {
  return /↑ \d+ more/.test(frame);
}

function hasOverflowBelow(frame: string): boolean {
  return /↓ \d+ more/.test(frame);
}

function countLabels(frame: string): number {
  return (frame.match(/LABEL-/g) ?? []).length;
}

describe("App viewport windowing", () => {
  it("renders only a slice of 500 rows in a 30-line terminal with overflow indicators", () => {
    const initial = linearSnapshot(500);
    const { lastFrame, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={60_000}
        density="compact"
        terminalRows={30}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(hasOverflowAbove(frame)).toBe(false);
    expect(hasOverflowBelow(frame)).toBe(true);
    expect(countLabels(frame)).toBeLessThan(50);
    expect(countLabels(frame)).toBeGreaterThan(0);
    unmount();
  });

  it(
    "scrolls the window when selection moves to the bottom edge",
    async () => {
    const initial = linearSnapshot(80);
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={60_000}
        density="compact"
        terminalRows={30}
      />,
    );

    expect(lastFrame()).toContain("LABEL-0000");

    for (let i = 0; i < 79; i++) {
      stdin.write("j");
      const target = `LABEL-${String(i + 1).padStart(4, "0")}`;
      await vi.waitFor(() => expect(lastFrame()).toContain(target));
    }

    const frame = lastFrame() ?? "";
    expect(hasOverflowAbove(frame)).toBe(true);
    expect(frame).toContain("LABEL-0079");
    expect(frame).not.toContain("LABEL-0000");
    unmount();
  },
  30_000,
  );

  it("shows the full small demo tree without overflow indicators", () => {
    const initial = linearSnapshot(8);
    const { lastFrame, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={60_000}
        density="compact"
        terminalRows={40}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(hasOverflowAbove(frame)).toBe(false);
    expect(hasOverflowBelow(frame)).toBe(false);
    expect(countLabels(frame)).toBe(8);
    unmount();
  });
});
