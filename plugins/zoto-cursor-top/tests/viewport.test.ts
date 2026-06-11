import { describe, expect, it } from "vitest";
import type { AgentNode, AgentSnapshot } from "../src/types.js";
import {
  computeChromeLines,
  computeNodeRowHeight,
  computeRowHeights,
  computeTreeWindow,
  computeViewportBodyRows,
  DEFAULT_TERMINAL_ROWS,
  followSelectionRowOffset,
  formatOverflowIndicator,
  resolveTreeWindow,
  rowOffsetToLineOffset,
} from "../src/ui/viewport.js";

function node(over: Partial<AgentNode>): AgentNode {
  return {
    id: "x",
    parentId: null,
    kind: "agent",
    pid: null,
    label: "x",
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

function snapshot(nodes: AgentNode[], roots: string[]): AgentSnapshot {
  const map: Record<string, AgentNode> = {};
  for (const n of nodes) map[n.id] = n;
  return { capturedAt: 0, nodes: map, roots, diagnostics: [] };
}

describe("computeNodeRowHeight", () => {
  it("counts compact as one line", () => {
    const n = node({ title: "t", recentLogs: ["a", "b"] });
    expect(computeNodeRowHeight(n, "compact")).toBe(1);
  });

  it("adds title line at cozy", () => {
    const n = node({ title: "t", recentLogs: ["a"] });
    expect(computeNodeRowHeight(n, "cozy")).toBe(2);
    expect(computeNodeRowHeight(node({ title: "" }), "cozy")).toBe(1);
  });

  it("adds log lines at comfortable", () => {
    const n = node({ title: "t", recentLogs: ["a", "b", "c"] });
    expect(computeNodeRowHeight(n, "comfortable")).toBe(5);
  });
});

describe("computeChromeLines", () => {
  it("accounts for header, column, footer baseline", () => {
    expect(computeChromeLines()).toBe(4);
  });

  it("adds event strip, diagnostics, detail pane, and filter bar", () => {
    const lines = computeChromeLines({
      eventStripLines: 2,
      diagnosticsLines: 3,
      detailOpen: true,
      detailLines: 25,
    });
    // 2 header + (1+2) events + (1+3) diags + (1+36) detail + 2 footer = 48
    expect(lines).toBe(48);
  });
});

describe("computeViewportBodyRows", () => {
  it("subtracts chrome and indicator reserve from terminal rows", () => {
    expect(computeViewportBodyRows(30, 10, true)).toBe(18);
    expect(computeViewportBodyRows(30, 10, false)).toBe(20);
  });

  it("never returns less than one", () => {
    expect(computeViewportBodyRows(5, 20, true)).toBe(1);
  });
});

describe("followSelectionRowOffset", () => {
  const heights = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

  it("scrolls down when selection moves past the window bottom", () => {
    const next = followSelectionRowOffset(heights, 8, 0, 3);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThanOrEqual(8);
  });

  it("scrolls up when selection moves above the window", () => {
    const next = followSelectionRowOffset(heights, 1, 5, 3);
    expect(next).toBe(1);
  });

  it("keeps offset when selection stays inside the window", () => {
    expect(followSelectionRowOffset(heights, 2, 1, 5)).toBe(1);
  });
});

describe("computeTreeWindow", () => {
  it("shows overflow indicators when rows exceed the viewport", () => {
    const heights = Array.from({ length: 100 }, () => 1);
    const win = computeTreeWindow(heights, 50, 0, 10);
    expect(win.indicatorAbove).toBe(true);
    expect(win.indicatorBelow).toBe(true);
    expect(win.hiddenRowsAbove).toBeGreaterThan(0);
    expect(win.hiddenRowsBelow).toBeGreaterThan(0);
    expect(win.endIdx - win.startIdx).toBeLessThanOrEqual(8);
  });

  it("fits all rows when the tree is smaller than the viewport", () => {
    const heights = [2, 3, 1];
    const win = computeTreeWindow(heights, 1, 0, 20);
    expect(win.startIdx).toBe(0);
    expect(win.endIdx).toBe(3);
    expect(win.indicatorAbove).toBe(false);
    expect(win.indicatorBelow).toBe(false);
  });

  it("follows selection near the bottom edge", () => {
    const heights = Array.from({ length: 50 }, () => 1);
    const win = computeTreeWindow(heights, 49, 0, 8);
    expect(win.startIdx).toBeLessThan(49);
    expect(win.endIdx).toBe(50);
    expect(win.indicatorAbove).toBe(true);
    expect(win.indicatorBelow).toBe(false);
  });
});

describe("resolveTreeWindow", () => {
  it("windows a large flat list for a 30-row terminal", () => {
    const nodes: AgentNode[] = [];
    const roots: string[] = [];
    for (let i = 0; i < 500; i++) {
      const id = `a-${i}`;
      nodes.push(node({ id, label: `L-${i}` }));
      roots.push(id);
    }
    const snap = snapshot(nodes, roots);
    const flat = roots.map((id) => ({ id, depth: 0 }));
    const win = resolveTreeWindow({
      flat,
      snapshot: snap,
      density: "compact",
      selectedIdx: 0,
      scrollRowOffset: 0,
      terminalRows: 30,
      chrome: {},
    });
    expect(win.endIdx - win.startIdx).toBeLessThan(500);
    expect(win.indicatorBelow).toBe(true);
  });
});

describe("rowOffsetToLineOffset", () => {
  it("sums heights before the row index", () => {
    expect(rowOffsetToLineOffset([2, 3, 1], 2)).toBe(5);
    expect(rowOffsetToLineOffset([2, 3, 1], 0)).toBe(0);
  });
});

describe("formatOverflowIndicator", () => {
  it("uses arrow prefix and hidden count", () => {
    expect(formatOverflowIndicator("above", 12)).toBe("↑ 12 more");
    expect(formatOverflowIndicator("below", 3)).toBe("↓ 3 more");
  });
});

describe("DEFAULT_TERMINAL_ROWS", () => {
  it("is a sensible non-TTY fallback", () => {
    expect(DEFAULT_TERMINAL_ROWS).toBeGreaterThanOrEqual(24);
  });
});

describe("computeRowHeights", () => {
  it("maps flat rows through snapshot nodes", () => {
    const snap = snapshot(
      [node({ id: "a", title: "t", recentLogs: ["x"] }), node({ id: "b" })],
      ["a", "b"],
    );
    const heights = computeRowHeights(
      [
        { id: "a", depth: 0 },
        { id: "b", depth: 0 },
      ],
      snap,
      "comfortable",
    );
    expect(heights).toEqual([3, 1]);
  });
});
