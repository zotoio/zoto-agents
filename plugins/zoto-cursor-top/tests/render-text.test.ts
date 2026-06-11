import { describe, expect, it } from "vitest";
import { renderText } from "../src/ui/render-text.js";
import type { AgentSnapshot } from "../src/types.js";

const FIXED_NOW = Date.UTC(2026, 5, 10, 3, 0, 0);

function snap(): AgentSnapshot {
  return {
    capturedAt: Date.now(),
    nodes: {
      "pid:1": {
        id: "pid:1",
        parentId: null,
        kind: "ide",
        pid: 1,
        label: "Cursor IDE",
        title: "",
        model: null,
        repo: null,
        startedAt: Date.now(),
        status: "running",
        recentLogs: [],
        logSource: null,
        tokenUsage: null,
        children: ["chat-a"],
      },
      "chat-a": {
        id: "chat-a",
        parentId: "pid:1",
        kind: "agent",
        pid: null,
        label: "chat",
        title: "",
        model: null,
        repo: "ws",
        startedAt: Date.now(),
        status: "running",
        recentLogs: ["assistant: hello"],
        logSource: null,
        tokenUsage: null,
        children: ["sub-1"],
      },
      "sub-1": {
        id: "sub-1",
        parentId: "chat-a",
        kind: "subagent",
        pid: null,
        label: "Task",
        title: "",
        model: null,
        repo: "ws",
        startedAt: Date.now(),
        status: "running",
        recentLogs: ["impl: working"],
        logSource: null,
        tokenUsage: null,
        children: [],
      },
    },
    roots: ["pid:1"],
    diagnostics: [],
  };
}

describe("renderText layout + badges", () => {
  it("uses a 5-char inner badge ([AGENT] / [IDE  ]) padded outside the brackets", () => {
    const out = renderText(snap());
    // Every row starts at column 0 — no per-depth row indent.
    expect(out).toMatch(/^\[IDE\] {3}/m);
    expect(out).toMatch(/^\[AGENT\] /m);
    expect(out).toMatch(/^\[SUB\] {3}/m);
  });

  it("keeps every row's columns aligned with the header and blanks the PID for child rows", () => {
    const out = renderText(snap());
    // Depth 0 IDE row: `[IDE]` + 2-pad + " " sep + 6-wide PID + " " sep + label.
    expect(out).toMatch(/^\[IDE\] {3} {5}1 ▼ Cursor IDE/m);
    // Depth 1 AGENT row: badge is exactly 7 chars, PID slot blanked
    // (6 spaces), then 2-space label indent before the chevron.
    expect(out).toMatch(/^\[AGENT\] {10}▼ chat/m);
    // Depth 2 SUB row: 2-pad after `[SUB]`, blank PID, 4-space label
    // indent, leaf so chevron is a space.
    expect(out).toMatch(/^\[SUB\] {16}Task/m);
  });

  it("aligns log lines under the AGENT column and shifts them per depth", () => {
    const out = renderText(snap());
    // Depth 1 → AGENT column (15) + 2-space label indent + 2 (chevron slot).
    expect(out).toMatch(/^ {19}log: assistant: hello$/m);
    // Depth 2 → AGENT column + 4-space label indent + 2.
    expect(out).toMatch(/^ {21}log: impl: {6}working$/m);
  });

  it("emits log lines oldest-first by default", () => {
    const snapshot = snap();
    snapshot.nodes["chat-a"]!.recentLogs = [
      "assistant: first",
      "user: middle",
      "assistant: latest",
    ];
    const out = renderText(snapshot);
    const lines = out.split("\n");
    const logLines = lines.filter((l) => l.includes("log: "));
    expect(logLines[0]).toMatch(/log: assistant: first$/);
    expect(logLines[1]).toMatch(/log: user: {6}middle$/);
    expect(logLines[2]).toMatch(/log: assistant: latest$/);
  });

  it("can emit log lines newest-first when requested", () => {
    const snapshot = snap();
    snapshot.nodes["chat-a"]!.recentLogs = [
      "assistant: first",
      "user: middle",
      "assistant: latest",
    ];
    const out = renderText(snapshot, undefined, { logOrder: "newest-first" });
    const logLines = out.split("\n").filter((l) => l.includes("log: "));
    expect(logLines[0]).toMatch(/log: assistant: latest$/);
    expect(logLines[2]).toMatch(/log: assistant: first$/);
  });
});

describe("renderText density gating", () => {
  function titledSnap(): AgentSnapshot {
    const snapshot = snap();
    snapshot.nodes["chat-a"]!.title = "Ship the theme engine";
    return snapshot;
  }

  it("default options are byte-identical to an explicit comfortable density", () => {
    const a = renderText(titledSnap(), FIXED_NOW);
    const b = renderText(titledSnap(), FIXED_NOW, { density: "comfortable" });
    expect(a).toBe(b);
  });

  it("comfortable renders both title and log body lines", () => {
    const out = renderText(titledSnap(), FIXED_NOW, { density: "comfortable" });
    expect(out).toContain("Ship the theme engine");
    expect(out).toContain("log: assistant: hello");
    expect(out).toContain("log: impl:      working");
  });

  it("cozy keeps title lines but omits log lines", () => {
    const out = renderText(titledSnap(), FIXED_NOW, { density: "cozy" });
    expect(out).toContain("Ship the theme engine");
    expect(out).not.toContain("log:");
  });

  it("compact omits both title and log lines, keeping only header + rows", () => {
    const out = renderText(titledSnap(), FIXED_NOW, { density: "compact" });
    expect(out).not.toContain("Ship the theme engine");
    expect(out).not.toContain("log:");
    // Row lines and the column header survive.
    expect(out).toContain("TYPE");
    expect(out).toMatch(/^\[IDE\] {3}/m);
    expect(out).toMatch(/^\[AGENT\] /m);
    expect(out).toMatch(/^\[SUB\] {3}/m);
  });

  it("never injects ANSI escapes regardless of density", () => {
    for (const density of ["compact", "cozy", "comfortable"] as const) {
      // eslint-disable-next-line no-control-regex
      expect(/\x1B/.test(renderText(titledSnap(), FIXED_NOW, { density }))).toBe(false);
    }
  });
});

describe("renderText non-TTY fit-content columns", () => {
  function withNonTtyStdout(run: () => void): void {
    const stdout = process.stdout as NodeJS.WriteStream & {
      isTTY?: boolean;
      columns?: number;
    };
    const prev = { isTTY: stdout.isTTY, columns: stdout.columns };
    Object.defineProperty(stdout, "isTTY", { configurable: true, value: false });
    Object.defineProperty(stdout, "columns", { configurable: true, value: undefined });
    try {
      run();
    } finally {
      Object.defineProperty(stdout, "isTTY", {
        configurable: true,
        value: prev.isTTY,
      });
      Object.defineProperty(stdout, "columns", {
        configurable: true,
        value: prev.columns,
      });
    }
  }

  it("shows full MODEL, REPO, and TOKENS when stdout is not a TTY", () => {
    const snapshot = snap();
    snapshot.nodes["chat-a"]!.model = "claude-fable-5-thinking-max";
    snapshot.nodes["chat-a"]!.repo = "zotoio/zoto-agents";
    snapshot.nodes["chat-a"]!.tokenUsage = 12_400;

    withNonTtyStdout(() => {
      const out = renderText(snapshot, FIXED_NOW);
      const dataRow = out.split("\n").find((line) => line.startsWith("[AGENT]"))!;
      expect(dataRow).toContain("claude-fable-5-thinking-max");
      expect(dataRow).toContain("zotoio/zoto-agents");
      expect(dataRow.trimEnd().endsWith("12.4k")).toBe(true);
      expect(out).toContain("TOKENS");
    });
  });

  it("respects an explicit terminalColumns override in non-TTY contexts", () => {
    const snapshot = snap();
    snapshot.nodes["chat-a"]!.model = "claude-fable-5-thinking-max-extra-long";
    snapshot.nodes["chat-a"]!.repo = "zotoio/zoto-agents-with-extra";

    withNonTtyStdout(() => {
      const out = renderText(snapshot, FIXED_NOW, { terminalColumns: 100 });
      const dataRow = out.split("\n").find((line) => line.startsWith("[AGENT]"))!;
      expect(dataRow).toContain("claude-fable-5-thinking");
      expect(dataRow).toContain("…");
    });
  });
});
