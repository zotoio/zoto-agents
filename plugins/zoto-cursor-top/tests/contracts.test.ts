/**
 * Behavioural contract tests for the cursor-top default output modes.
 *
 * These tests FREEZE today's default `--once` / `--json` / `--demo`
 * behaviour for the rest of the "cursor-top UX, Features & Performance
 * Optimisation" spec (subtask 01, Decision 1/6/10):
 *
 *   1. the JSON snapshot shape (`AgentSnapshot` / `AgentNode` required
 *      keys and types per `src/types.ts`) on both the demo fixture and
 *      a synthetic scale fixture run through the real collector;
 *   2. the `renderText` plain-text frame structure on a fixed-clock
 *      snapshot (header, row layout, title/log body lines,
 *      newest-log-first order, diagnostics block);
 *   3. the default `parseArgs` values.
 *
 * Shape checks are presence/type based (additive extension stays legal
 * per Decision 6 — "JSON snapshot shape changes additively at most"),
 * while literal pins (header row, duration formatting, truncation)
 * freeze the rendered layout itself. Every later subtask must keep
 * this file green WITHOUT editing it.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli.js";
import { createCollector } from "../src/discovery/collector.js";
import { demoSnapshot } from "../src/discovery/demo.js";
import type { AgentNode, AgentSnapshot } from "../src/types.js";
import {
  agentBodyIndent,
  computeRowColumnLayout,
  formatAgentRowLine,
  formatLogTailLine,
  formatDuration,
  formatStart,
  formatStartForNode,
  headerRow,
  rowColumnStarts,
} from "../src/ui/format.js";
import { renderText } from "../src/ui/render-text.js";
import { flattenVisible } from "../src/ui/Tree.js";
import { createScaleFixture, type ScaleFixture } from "../bench/fixtures.js";

const KINDS = ["ide", "cli", "cloud", "agent", "subagent", "unknown"];
const STATUSES = ["running", "waiting", "idle", "done", "error", "unknown"];

/** Required `AgentNode` keys (per `src/types.ts`; `children` is optional). */
const REQUIRED_NODE_KEYS = [
  "id",
  "parentId",
  "kind",
  "pid",
  "label",
  "title",
  "model",
  "repo",
  "startedAt",
  "status",
  "recentLogs",
  "logSource",
  "tokenUsage",
] as const;

function assertAgentNodeShape(node: AgentNode, id: string): void {
  for (const key of REQUIRED_NODE_KEYS) {
    expect(node, `node ${id} missing key ${key}`).toHaveProperty(key);
  }
  expect(node.id).toBe(id);
  expect(node.parentId === null || typeof node.parentId === "string").toBe(true);
  expect(KINDS).toContain(node.kind);
  expect(node.pid === null || typeof node.pid === "number").toBe(true);
  expect(typeof node.label).toBe("string");
  expect(typeof node.title).toBe("string");
  expect(node.model === null || typeof node.model === "string").toBe(true);
  expect(node.repo === null || typeof node.repo === "string").toBe(true);
  expect(typeof node.startedAt).toBe("number");
  expect(Number.isFinite(node.startedAt)).toBe(true);
  expect(STATUSES).toContain(node.status);
  expect(Array.isArray(node.recentLogs)).toBe(true);
  for (const line of node.recentLogs) expect(typeof line).toBe("string");
  expect(node.logSource === null || typeof node.logSource === "string").toBe(true);
  expect(node.tokenUsage === null || typeof node.tokenUsage === "number").toBe(
    true,
  );
  if (node.tokenUsage != null) expect(Number.isFinite(node.tokenUsage)).toBe(true);
  if (node.children !== undefined) {
    expect(Array.isArray(node.children)).toBe(true);
    for (const child of node.children) expect(typeof child).toBe("string");
  }
}

function assertSnapshotShape(snap: AgentSnapshot): void {
  for (const key of ["capturedAt", "nodes", "roots", "diagnostics"]) {
    expect(snap).toHaveProperty(key);
  }
  expect(typeof snap.capturedAt).toBe("number");
  expect(Array.isArray(snap.roots)).toBe(true);
  expect(Array.isArray(snap.diagnostics)).toBe(true);
  for (const d of snap.diagnostics) expect(typeof d).toBe("string");
  expect(snap.nodes).toBeTypeOf("object");

  for (const [id, node] of Object.entries(snap.nodes)) {
    assertAgentNodeShape(node, id);
  }
  // Referential integrity: roots and children resolve, children point back.
  for (const rootId of snap.roots) {
    expect(snap.nodes[rootId], `root ${rootId} missing from nodes`).toBeDefined();
  }
  for (const node of Object.values(snap.nodes)) {
    for (const childId of node.children ?? []) {
      const child = snap.nodes[childId];
      expect(child, `child ${childId} missing from nodes`).toBeDefined();
      expect(child!.parentId).toBe(node.id);
    }
  }
  // `--json` emits JSON.stringify(snapshot): must round-trip losslessly.
  expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
}

/* ------------------------------------------------------------------ */
/* 1a. JSON snapshot shape — demo fixture                               */
/* ------------------------------------------------------------------ */

describe("contract: --demo snapshot shape", () => {
  it("demoSnapshot() matches the frozen AgentSnapshot/AgentNode shape", () => {
    const snap = demoSnapshot(3);
    assertSnapshotShape(snap);
  });

  it("demo composition is stable (roots, node ids, diagnostics)", () => {
    const snap = demoSnapshot(3);
    expect(snap.roots).toEqual(["ide-1", "ide-2", "cli-1", "cli-2", "cloud-1", "cloud-2"]);
    expect(Object.keys(snap.nodes).sort()).toEqual(
      [
        "ide-1",
        "ide-1-sub-explore",
        "ide-1-sub-impl",
        "ide-2",
        "cli-1",
        "cli-2",
        "cloud-1",
        "cloud-1-sub-explore",
        "cloud-1-sub-impl",
        "cloud-1-sub-debug",
        "cloud-2",
      ].sort(),
    );
    expect(snap.diagnostics).toEqual([
      "demo mode: synthetic data, no real Cursor processes are being read",
    ]);
    expect(snap.nodes["ide-1"]!.children).toEqual([
      "ide-1-sub-explore",
      "ide-1-sub-impl",
    ]);
  });
});

/* ------------------------------------------------------------------ */
/* 1b. JSON snapshot shape — synthetic fixture through the collector    */
/* ------------------------------------------------------------------ */

describe("contract: collector snapshot shape on the synthetic scale fixture", () => {
  let fixture: ScaleFixture;
  let snap: AgentSnapshot;

  beforeAll(async () => {
    fixture = await createScaleFixture("S");
    // CLI-default flags (cursorOnly/withLogs/activeOnly true, 3 tail
    // lines, 24 h transcript cap) — the default `--once`/`--json` path.
    const collector = createCollector(fixture.collectorOptions());
    snap = await collector.collect();
  });

  afterAll(async () => {
    await fixture.dispose();
  });

  it("matches the frozen AgentSnapshot/AgentNode shape", () => {
    assertSnapshotShape(snap);
  });

  it("surfaces ide, agent, subagent, and cli kinds with default flags", () => {
    const kinds = new Set(Object.values(snap.nodes).map((n) => n.kind));
    for (const expected of ["ide", "agent", "subagent", "cli"]) {
      expect(kinds, `kind ${expected} missing from snapshot`).toContain(expected);
    }
  });

  it("populates token usage for transcript agents/subagents via the composer lookup", () => {
    const agents = Object.values(snap.nodes).filter(
      (n) => n.kind === "agent" || n.kind === "subagent",
    );
    expect(agents.length).toBeGreaterThan(0);
    for (const node of agents) {
      expect(node.tokenUsage).not.toBeNull();
      expect(node.tokenUsage!).toBeGreaterThan(0);
    }
  });

  it("populates models for transcript agents/subagents via the composer lookup", () => {
    const agents = Object.values(snap.nodes).filter(
      (n) => n.kind === "agent" || n.kind === "subagent",
    );
    expect(agents.length).toBeGreaterThan(0);
    for (const node of agents) {
      expect(node.model).toBe(fixture.modelFor(node.id));
    }
  });

  it("tails at most logTailLines lines per agent and never zero for survivors", () => {
    const agents = Object.values(snap.nodes).filter(
      (n) => n.kind === "agent" || n.kind === "subagent",
    );
    for (const node of agents) {
      expect(node.recentLogs.length).toBeGreaterThan(0);
      expect(node.recentLogs.length).toBeLessThanOrEqual(3);
    }
  });

  it("resolves at least one repo to an owner/repo display slug", () => {
    const repos = Object.values(snap.nodes)
      .map((n) => n.repo)
      .filter((r): r is string => typeof r === "string");
    expect(repos.some((r) => /^[^/]+\/[^/]+$/.test(r))).toBe(true);
  });

  it("hides done agents and log-less helper processes under default flags", () => {
    for (const node of Object.values(snap.nodes)) {
      if (node.kind === "subagent") expect(node.status).not.toBe("done");
      expect(node.kind).not.toBe("unknown");
    }
  });
});

/* ------------------------------------------------------------------ */
/* 2. renderText structure on a fixed-clock snapshot                    */
/* ------------------------------------------------------------------ */

const NOW = Date.UTC(2026, 5, 10, 2, 0, 0);
const CONTRACT_TERMINAL_COLUMNS = 123;

function layoutRowsForSnapshot(
  snap: AgentSnapshot,
  now: number,
): Array<{ node: AgentNode; depth: number; startColumn: string; nodes: Record<string, AgentNode> }> {
  const expanded = new Set(Object.keys(snap.nodes));
  return flattenVisible(snap, expanded)
    .map(({ id, depth }) => {
      const node = snap.nodes[id];
      if (!node) return null;
      return {
        node,
        depth,
        startColumn: formatStartForNode(node, now),
        nodes: snap.nodes,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
}

function contractLayout(snap: AgentSnapshot, now: number) {
  return computeRowColumnLayout(
    CONTRACT_TERMINAL_COLUMNS,
    layoutRowsForSnapshot(snap, now),
  );
}

function fixedNode(partial: Partial<AgentNode> & { id: string }): AgentNode {
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
    children: [],
    ...partial,
  };
}

function fixedRenderSnapshot(): {
  snap: AgentSnapshot;
  ide: AgentNode;
  chat: AgentNode;
  sub: AgentNode;
  cli: AgentNode;
} {
  const ide = fixedNode({
    id: "pid:100",
    kind: "ide",
    pid: 100,
    label: "Cursor IDE",
    title: "Refactor collector pipeline",
    repo: "bench-org/repo-0",
    startedAt: NOW - 14 * 60_000,
    children: ["chat-1"],
  });
  const chat = fixedNode({
    id: "chat-1",
    parentId: "pid:100",
    label: "chat",
    title: "Ship the baseline benchmarks",
    model: "claude-fable-5-thinking-max",
    repo: "bench-org/repo-0",
    startedAt: NOW - 9 * 60_000,
    recentLogs: [
      "assistant: oldest line",
      "user: middle line",
      "assistant: newest line",
    ],
    logSource: "/tmp/chat-1.jsonl",
    children: ["sub-1"],
  });
  const sub = fixedNode({
    id: "sub-1",
    parentId: "chat-1",
    kind: "subagent",
    label: "Task(explore)",
    model: "gpt-5.3-codex",
    startedAt: NOW - 65_000,
    status: "waiting",
    recentLogs: ["assistant: sub log"],
    logSource: "/tmp/sub-1.jsonl",
  });
  const cli = fixedNode({
    id: "pid:300",
    kind: "cli",
    pid: 300,
    label: "cursor-agent CLI",
    model: "composer-2.5-fast",
    startedAt: NOW - 30 * 60_000,
    status: "idle",
    elapsedEndAt: NOW,
    recentLogs: ["[cli] one"],
    logSource: "/tmp/cli.log",
  });
  const snap: AgentSnapshot = {
    capturedAt: NOW,
    nodes: {
      [ide.id]: ide,
      [chat.id]: chat,
      [sub.id]: sub,
      [cli.id]: cli,
    },
    roots: ["pid:100", "pid:300"],
    diagnostics: ["demo diagnostic line"],
  };
  return { snap, ide, chat, sub, cli };
}

describe("contract: renderText structure (fixed clock)", () => {
  it("renders the exact frozen frame for a fixed snapshot (ungrouped)", () => {
    const { snap, ide, chat, sub, cli } = fixedRenderSnapshot();
    const layout = contractLayout(snap, NOW);
    const expected = [
      "cursor-top  ·  1 IDE · 1 CLI · 0 Cloud · 2 subagents",
      "",
      headerRow(layout),
      "-".repeat(CONTRACT_TERMINAL_COLUMNS),
      formatAgentRowLine(ide, 0, NOW, { expanded: true, hasChildren: true, layout, nodes: snap.nodes }),
      `${agentBodyIndent(0, layout)}Refactor collector pipeline`,
      formatAgentRowLine(chat, 1, NOW, { expanded: true, hasChildren: true, layout, nodes: snap.nodes }),
      `${agentBodyIndent(1, layout)}Ship the baseline benchmarks`,
      formatLogTailLine(1, "assistant: oldest line", 100, layout),
      formatLogTailLine(1, "user: middle line", 100, layout),
      formatLogTailLine(1, "assistant: newest line", 100, layout),
      formatAgentRowLine(sub, 2, NOW, { expanded: false, hasChildren: false, layout, nodes: snap.nodes }),
      formatLogTailLine(2, "assistant: sub log", 100, layout),
      formatAgentRowLine(cli, 0, NOW, { expanded: false, hasChildren: false, layout, nodes: snap.nodes }),
      formatLogTailLine(0, "[cli] one", 100, layout),
      "",
      "! demo diagnostic line",
    ].join("\n") + "\n";
    expect(renderText(snap, NOW, { terminalColumns: CONTRACT_TERMINAL_COLUMNS, grouped: false })).toBe(
      expected,
    );
  });

  it("pins the header row to the computed 120-column layout", () => {
    const { snap } = fixedRenderSnapshot();
    const layout = contractLayout(snap, NOW);
    expect(headerRow(layout)).toBe(headerRow(computeRowColumnLayout(CONTRACT_TERMINAL_COLUMNS, layoutRowsForSnapshot(snap, NOW))));
  });

  it("keeps STATUS and TOKENS vertically aligned across every data row", () => {
    const { snap } = fixedRenderSnapshot();
    const layout = contractLayout(snap, NOW);
    const starts = rowColumnStarts(layout);
    const statusStart = starts[6]!;
    const tokensStart = starts[7]!;
    const header = headerRow(layout);
    expect(header.indexOf("STATUS")).toBe(statusStart);
    expect(header.lastIndexOf("TOKENS")).toBe(tokensStart);

    const lines = renderText(snap, NOW, { terminalColumns: CONTRACT_TERMINAL_COLUMNS, grouped: false })
      .split("\n")
      .filter((line) => line.startsWith("["));
    for (const line of lines) {
      expect(line.slice(statusStart, statusStart + layout.status).trim()).not.toBe("");
      expect(line.slice(tokensStart).trim()).toMatch(/^(-|\d+\.\dk)$/);
    }
  });

  it("emits no ANSI terminal-control characters", () => {
    const { snap } = fixedRenderSnapshot();
    // eslint-disable-next-line no-control-regex
    expect(/\x1B/.test(renderText(snap, NOW, { grouped: false }))).toBe(false);
  });

  it("freezes row layout fragments (badges, chevrons, elapsed, truncation)", () => {
    const { snap } = fixedRenderSnapshot();
    const layout = contractLayout(snap, NOW);
    const lines = renderText(snap, NOW, { terminalColumns: CONTRACT_TERMINAL_COLUMNS, grouped: false }).split("\n");
    expect(lines[4]).toMatch(/^\[IDE\]\s+100 ▼ Cursor IDE\s+/);
    expect(lines[4]).toContain("(14m00s)");
    expect(lines[4]).toContain("running");
    // Model column truncates long slugs when space is tight.
    expect(lines[6]).toContain("claude-fable-5-thinking");
    expect(lines[6]).toContain("(9m00s)");
    expect(lines[11]).toMatch(/^\[SUB\]\s+Task\(explore\)/);
    expect(lines[11]).toContain("(1m05s)");
    expect(lines[11]).toContain("waiting");
    expect(lines[13]).toMatch(/^\[CLI\]\s+300\s+cursor-agent CLI/);
    expect(lines[13]).toContain("(30m00s)");
    expect(lines[13]).toContain("idle");
  });

  it("pins duration formatting literals", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(61_000)).toBe("1m01s");
    expect(formatDuration(3_661_000)).toBe("1h01m01s");
  });

  it("orders per-row log lines oldest-first by default", () => {
    const { snap } = fixedRenderSnapshot();
    const layout = contractLayout(snap, NOW);
    const lines = renderText(snap, NOW, { terminalColumns: CONTRACT_TERMINAL_COLUMNS, grouped: false }).split("\n");
    const logLines = lines.filter((l) => l.trimStart().startsWith("log: "));
    expect(logLines[0]).toBe(formatLogTailLine(1, "assistant: oldest line", 100, layout));
    expect(logLines[1]).toBe(formatLogTailLine(1, "user: middle line", 100, layout));
    expect(logLines[2]).toBe(formatLogTailLine(1, "assistant: newest line", 100, layout));
  });
});

/* ------------------------------------------------------------------ */
/* 3. parseArgs defaults                                                */
/* ------------------------------------------------------------------ */

describe("contract: parseArgs defaults", () => {
  it("freezes the flag-less defaults", () => {
    expect(parseArgs([])).toMatchObject({
      demo: false,
      once: false,
      json: false,
      intervalMs: 1000,
      logLines: 3,
      help: false,
      version: false,
      noAutoOnce: false,
      cursorOnly: true,
      withLogs: true,
      activeOnly: true,
      transcriptMaxAgeHours: 24,
    });
  });

  it("--json implies --once (JSON mode never enters the TUI)", () => {
    expect(parseArgs(["--json"])).toMatchObject({ json: true, once: true });
  });

  it("--demo only toggles demo mode", () => {
    expect(parseArgs(["--demo"])).toMatchObject({
      demo: true,
      once: false,
      json: false,
    });
  });
});
