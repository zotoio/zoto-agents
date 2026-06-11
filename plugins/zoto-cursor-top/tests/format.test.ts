import { describe, expect, it } from "vitest";
import {
  computeFitContentTerminalWidth,
  computeRowColumnLayout,
  formatAgentRowLine,
  formatDuration,
  formatLogTailLine,
  formatStart,
  formatStartForNode,
  formatTokenUsageK,
  headerRow,
  kindBadge,
  logsNewestFirst,
  orderLogsForDisplay,
  rowColumnStarts,
  statusColor,
  truncate,
} from "../src/ui/format.js";
import type { AgentNode } from "../src/types.js";
import { formatRepoDisplay } from "../src/discovery/repo-url.js";

describe("formatDuration", () => {
  it("formats seconds", () => {
    expect(formatDuration(5_000)).toBe("5s");
  });
  it("formats minutes + seconds", () => {
    expect(formatDuration(125_000)).toBe("2m05s");
  });
  it("formats hours + minutes + seconds", () => {
    expect(formatDuration(3_900_000)).toBe("1h05m00s");
    expect(formatDuration(3_930_000)).toBe("1h05m30s");
  });
});

describe("formatStart", () => {
  it("includes both wall time and elapsed", () => {
    const start = new Date("2026-05-16T03:45:30Z").getTime();
    const now = start + 5_000;
    const out = formatStart(start, now);
    expect(out).toMatch(/\(5s\)$/);
    expect(out).toMatch(/^\d{2}:\d{2}:\d{2}/);
  });
});

describe("formatStartForNode", () => {
  it("freezes idle elapsed at conversation length (start → last activity)", () => {
    const startedAt = 1_000;
    const lastActiveAt = startedAt + 33 * 60_000;
    const node = {
      startedAt,
      status: "idle" as const,
      elapsedEndAt: lastActiveAt,
    };
    expect(formatStartForNode(node, lastActiveAt + 600_000)).toContain("(33m00s)");
    expect(formatStartForNode(node, lastActiveAt + 3_600_000)).toContain("(33m00s)");
  });

  it("keeps elapsed ticking only for running", () => {
    const startedAt = 1_000;
    const running = { startedAt, status: "running" as const, elapsedEndAt: null };
    expect(formatStartForNode(running, startedAt + 5_000)).toContain("(5s)");
    expect(formatStartForNode(running, startedAt + 10_000)).toContain("(10s)");
    const waiting = {
      startedAt,
      status: "waiting" as const,
      elapsedEndAt: startedAt + 65_000,
    };
    expect(formatStartForNode(waiting, startedAt + 65_000)).toContain("(1m05s)");
    expect(formatStartForNode(waiting, startedAt + 120_000)).toContain("(1m05s)");
  });

  it("shows calendar date for done agents instead of a live counter", () => {
    const finishedAt = Date.parse("2026-06-11T14:30:00");
    const node = {
      startedAt: finishedAt - 600_000,
      status: "done" as const,
      elapsedEndAt: finishedAt,
    };
    const out = formatStartForNode(node, finishedAt + 3_600_000);
    expect(out).toContain("2026-06-11 14:30");
    expect(out).not.toContain("(");
  });
});

describe("statusColor", () => {
  it("colours running green and error red", () => {
    expect(statusColor("running")).toBe("green");
    expect(statusColor("error")).toBe("red");
  });
});

describe("formatTokenUsageK", () => {
  it("formats thousands with one decimal", () => {
    expect(formatTokenUsageK(1200).trim()).toBe("1.2k");
    expect(formatTokenUsageK(300).trim()).toBe("0.3k");
    expect(formatTokenUsageK(94613).trim()).toBe("94.6k");
  });

  it("shows a dash when usage is unknown", () => {
    expect(formatTokenUsageK(null).trim()).toBe("-");
    expect(formatTokenUsageK(undefined).trim()).toBe("-");
  });
});

describe("kindBadge", () => {
  it("collapses known kinds to 3-letter badges", () => {
    expect(kindBadge("ide")).toBe("IDE");
    expect(kindBadge("cli")).toBe("CLI");
    expect(kindBadge("cloud")).toBe("CLD");
    expect(kindBadge("subagent")).toBe("SUB");
  });
});

describe("log tail formatting", () => {
  it("orders stored logs newest first when requested", () => {
    expect(logsNewestFirst(["a", "b", "c"])).toEqual(["c", "b", "a"]);
    expect(logsNewestFirst([])).toEqual([]);
  });

  it("defaults to oldest-first display order", () => {
    expect(orderLogsForDisplay(["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(orderLogsForDisplay(["a", "b", "c"], "newest-first")).toEqual([
      "c",
      "b",
      "a",
    ]);
  });

  it("aligns role columns for sibling log lines at the same depth", () => {
    const assistant = formatLogTailLine(1, "assistant: first");
    const user = formatLogTailLine(1, "user: second");
    const aBody = assistant.indexOf("first");
    const uBody = user.indexOf("second");
    expect(aBody).toBeGreaterThan(0);
    expect(aBody).toBe(uBody);
  });
});

describe("truncate", () => {
  it("leaves short strings alone", () => {
    expect(truncate("abc", 10)).toBe("abc");
  });
  it("adds an ellipsis when over the limit", () => {
    expect(truncate("abcdefghij", 5)).toBe("abcd…");
  });
});

describe("computeRowColumnLayout", () => {
  const node = (over: Partial<AgentNode>): AgentNode => ({
    id: "n",
    parentId: null,
    kind: "agent",
    pid: null,
    label: "chat",
    title: "",
    model: "claude-opus-4.8",
    repo: "github.com/org/repo",
    startedAt: Date.UTC(2026, 5, 10, 19, 20, 43),
    status: "running",
    recentLogs: [],
    logSource: null,
    tokenUsage: 143_100,
    ...over,
  });

  it("expands the AGENT column when the terminal is wider", () => {
    const rows = [
      {
        node: node({}),
        depth: 0,
        startColumn: "19:20:43 (6m07s)",
      },
    ];
    const narrow = computeRowColumnLayout(100, rows);
    const wide = computeRowColumnLayout(160, rows);
    expect(wide.agent).toBeGreaterThan(narrow.agent);
  });

  it("aligns STATUS and TOKENS vertically aligned across header and data rows", () => {
    const rows = [
      {
        node: node({ status: "running", tokenUsage: 78_000 }),
        depth: 1,
        startColumn: "19:25:19 (1m31s)",
      },
      {
        node: node({
          kind: "ide",
          pid: 100,
          status: "running",
          tokenUsage: null,
          label: "Cursor IDE",
        }),
        depth: 0,
        startColumn: "08:00:54 (11h25m)",
      },
    ];
    const layout = computeRowColumnLayout(120, rows);
    const header = headerRow(layout);
    const starts = rowColumnStarts(layout);
    const ideLine = formatAgentRowLine(rows[1]!.node, 0, Date.now(), {
      startColumn: rows[1]!.startColumn,
      layout,
      expanded: true,
      hasChildren: true,
    });
    const chatLine = formatAgentRowLine(rows[0]!.node, 1, Date.now(), {
      startColumn: rows[0]!.startColumn,
      layout,
      expanded: false,
      hasChildren: false,
    });
    expect(ideLine.slice(starts[6], starts[6]! + layout.status).trim()).toBe("running");
    expect(chatLine.slice(starts[6], starts[6]! + layout.status).trim()).toBe("running");
    expect(ideLine.slice(starts[7]).trim()).toBe("-");
    expect(chatLine.slice(starts[7]).trim()).toBe("78.0k");
    expect(header.slice(starts[6], starts[6]! + layout.status).trim()).toBe("STATUS");
  });

  it("rolls parent TOKENS and infers MODEL from children when nodes are passed", () => {
    const nodes: Record<string, AgentNode> = {
      ide: node({
        id: "ide",
        kind: "ide",
        pid: 100,
        model: null,
        tokenUsage: null,
        children: ["chat"],
      }),
      chat: node({
        id: "chat",
        parentId: "ide",
        model: "gpt-5.2",
        tokenUsage: 1500,
      }),
    };
    const rows = [
      {
        node: nodes.ide!,
        depth: 0,
        startColumn: "08:00:00 (1m00s)",
        nodes,
      },
    ];
    const layout = computeRowColumnLayout(120, rows);
    const line = formatAgentRowLine(nodes.ide!, 0, Date.now(), {
      layout,
      expanded: true,
      hasChildren: true,
      startColumn: rows[0]!.startColumn,
      nodes,
    });
    expect(line).toContain("gpt-5.2");
    expect(line.trimEnd().endsWith("1.5k")).toBe(true);
  });

  it("fitContent expands MODEL and REPO without COL_MAX caps", () => {
    const longModel = "claude-fable-5-thinking-max-extra";
    const longRepo = "zotoio/zoto-agents-with-a-very-long-slug-name";
    const rows = [
      {
        node: node({ model: longModel, repo: longRepo }),
        depth: 0,
        startColumn: "19:20:43 (6m07s)",
      },
    ];
    const capped = computeRowColumnLayout(120, rows);
    const fit = computeRowColumnLayout(120, rows, undefined, { fitContent: true });
    expect(capped.model).toBeLessThan(longModel.length);
    expect(fit.model).toBeGreaterThanOrEqual(longModel.length);
    expect(capped.repo).toBeLessThan(longRepo.length);
    expect(fit.repo).toBeGreaterThanOrEqual(longRepo.length);
  });

  it("computeFitContentTerminalWidth includes TOKENS and full repo text", () => {
    const longRepo = "zotoio/zoto-agents-with-a-very-long-slug-name";
    const rows = [
      {
        node: node({ repo: longRepo, tokenUsage: 94613 }),
        depth: 0,
        startColumn: "21:38:53 (38s)",
      },
    ];
    const width = computeFitContentTerminalWidth(rows);
    const layout = computeRowColumnLayout(width, rows, undefined, { fitContent: true });
    const line = formatAgentRowLine(rows[0]!.node, 0, Date.now(), {
      layout,
      startColumn: rows[0]!.startColumn,
    });
    expect(width).toBeGreaterThan(120);
    expect(line).toContain(longRepo);
    expect(line.trimEnd().endsWith("94.6k")).toBe(true);
    expect(headerRow(layout)).toContain("TOKENS");
    expect(formatRepoDisplay(longRepo)).toBe(longRepo);
  });
});
