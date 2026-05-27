import { describe, expect, it } from "vitest";
import { renderText } from "../src/ui/render-text.js";
import type { AgentSnapshot } from "../src/types.js";

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
    expect(out).toMatch(/^ {21}log: impl: working$/m);
  });

  it("emits log lines newest-first", () => {
    const snapshot = snap();
    snapshot.nodes["chat-a"]!.recentLogs = [
      "assistant: first",
      "user: middle",
      "assistant: latest",
    ];
    const out = renderText(snapshot);
    const lines = out.split("\n");
    const logLines = lines.filter((l) => l.includes("log: "));
    // First three log lines belong to chat-a in reverse order.
    expect(logLines[0]).toMatch(/log: assistant: latest$/);
    expect(logLines[1]).toMatch(/log: user: middle$/);
    expect(logLines[2]).toMatch(/log: assistant: first$/);
  });
});
