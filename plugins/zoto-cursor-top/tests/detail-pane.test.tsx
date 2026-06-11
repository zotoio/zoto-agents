import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import React from "react";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { TRANSCRIPT_WINDOW_BYTES } from "../src/discovery/logs.js";
import type { AgentNode, FsLike } from "../src/types.js";
import { App } from "../src/ui/App.js";
import { DetailPane } from "../src/ui/DetailPane.js";
import {
  computeDetailPaneHeight,
  computeDetailWindowBytes,
  DETAIL_BYTES_PER_LINE,
  DETAIL_WINDOW_BYTES_CAP,
  loadDetailTail,
  type DetailTailCacheEntry,
} from "../src/ui/detail-tail.js";
import { demoSnapshot } from "../src/discovery/demo.js";
import { DEFAULT_THEME } from "../src/ui/theme.js";

function memFs(files: Record<string, { content: string; mtimeMs?: number; size?: number }>): FsLike {
  const store = new Map<string, { content: string; mtimeMs: number; size: number }>();
  for (const [path, entry] of Object.entries(files)) {
    const content = entry.content;
    store.set(path, {
      content,
      mtimeMs: entry.mtimeMs ?? 0,
      size: entry.size ?? Buffer.byteLength(content),
    });
  }
  return {
    async readdir() {
      return [];
    },
    async readFile(path: string) {
      const e = store.get(path);
      if (!e) throw new Error("ENOENT");
      return e.content;
    },
    async readWindow(path: string, offset: number, length: number) {
      const e = store.get(path);
      if (!e) throw new Error("ENOENT");
      return Buffer.from(e.content.slice(offset, offset + length));
    },
    async stat(path: string) {
      const e = store.get(path);
      if (!e) throw new Error("ENOENT");
      return {
        isDirectory: () => false,
        isFile: () => true,
        mtimeMs: e.mtimeMs,
        size: e.size,
      };
    },
    async exists(path: string) {
      return store.has(path);
    },
  };
}

function sampleNode(overrides: Partial<AgentNode> = {}): AgentNode {
  return {
    id: "chat-1",
    parentId: "ide-1",
    kind: "agent",
    pid: null,
    label: "chat",
    title: "Ship the detail pane with full metadata",
    model: "composer-2.5-fast",
    repo: "github.com/org/repo",
    startedAt: Date.UTC(2026, 5, 10, 12, 0, 0),
    status: "running",
    recentLogs: ["user: hello", "assistant: working on it"],
    logSource: null,
    tokenUsage: null,
    ...overrides,
  };
}

describe("computeDetailWindowBytes", () => {
  it("uses transcript default for small line counts", () => {
    expect(computeDetailWindowBytes(3)).toBe(TRANSCRIPT_WINDOW_BYTES);
    expect(computeDetailWindowBytes(8)).toBe(TRANSCRIPT_WINDOW_BYTES);
  });

  it("scales with line count and caps at 1 MB", () => {
    expect(computeDetailWindowBytes(25)).toBe(25 * DETAIL_BYTES_PER_LINE);
    expect(computeDetailWindowBytes(200)).toBe(DETAIL_WINDOW_BYTES_CAP);
  });
});

describe("computeDetailPaneHeight", () => {
  it("includes metadata block plus requested tail depth", () => {
    expect(computeDetailPaneHeight(25)).toBeGreaterThan(25);
  });
});

describe("loadDetailTail", () => {
  it("falls back to recentLogs when logSource is null", async () => {
    const cache = new Map<string, DetailTailCacheEntry>();
    const node = sampleNode({ logSource: null });
    const result = await loadDetailTail(node, 25, cache);
    expect(result.source).toBe("fallback");
    expect(result.lines).toEqual(node.recentLogs);
  });

  it("tails plain text files with enlarged window", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cursor-top-detail-"));
    const file = join(dir, "agent.log");
    const lines = Array.from({ length: 30 }, (_, i) => `line-${i + 1}`);
    writeFileSync(file, lines.join("\n") + "\n");
    const cache = new Map<string, DetailTailCacheEntry>();
    const node = sampleNode({ logSource: file });
    const result = await loadDetailTail(node, 10, cache);
    expect(result.source).toBe("file");
    expect(result.lines).toEqual(lines.slice(-10));
  });

  it("tails jsonl transcripts via message snippets", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cursor-top-detail-jsonl-"));
    const file = join(dir, "chat.jsonl");
    const events = [
      "{partial",
      JSON.stringify({
        role: "user",
        message: { content: [{ type: "text", text: "first" }] },
      }),
      JSON.stringify({
        role: "assistant",
        message: { content: [{ type: "text", text: "second" }] },
      }),
    ];
    writeFileSync(file, events.join("\n") + "\n");
    const cache = new Map<string, DetailTailCacheEntry>();
    const node = sampleNode({ logSource: file });
    const result = await loadDetailTail(node, 5, cache);
    expect(result.source).toBe("file");
    expect(result.lines).toEqual(["user: first", "assistant: second"]);
  });

  it("returns placeholder for missing files", async () => {
    const cache = new Map<string, DetailTailCacheEntry>();
    const node = sampleNode({ logSource: "/no/such/file.log" });
    const result = await loadDetailTail(node, 5, cache);
    expect(result.lines).toEqual([]);
    expect(result.placeholder).toContain("unreadable");
  });

  it("reuses cache when mtime and size are unchanged", async () => {
    const path = "/tmp/detail-cache.log";
    let readWindowCalls = 0;
    const base = memFs({
      [path]: { content: "alpha\nbeta\n", mtimeMs: 100, size: 11 },
    });
    const fs: FsLike = {
      ...base,
      async readWindow(p, offset, length) {
        readWindowCalls += 1;
        return base.readWindow(p, offset, length);
      },
    };
    const cache = new Map<string, DetailTailCacheEntry>();
    const node = sampleNode({ logSource: path });
    const first = await loadDetailTail(node, 2, cache, fs);
    expect(first.lines).toEqual(["alpha", "beta"]);
    expect(readWindowCalls).toBe(1);
    const second = await loadDetailTail(node, 2, cache, fs);
    expect(second.lines).toEqual(["alpha", "beta"]);
    expect(readWindowCalls).toBe(1);
  });
});

describe("DetailPane rendering", () => {
  it("shows full metadata and oldest-first log tail by default", () => {
    const node = sampleNode({
      logSource: "/tmp/chat.jsonl",
      recentLogs: ["one", "two", "three"],
    });
    const { lastFrame, unmount } = render(
      <DetailPane
        node={node}
        now={node.startedAt + 120_000}
        theme={DEFAULT_THEME}
        tailLines={["one", "two", "three"]}
        tailLoading={false}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("id: chat-1");
    expect(frame).toContain("[AGENT]");
    expect(frame).toContain("Ship the detail pane with full metadata");
    expect(frame).toContain("composer-2.5-fast");
    expect(frame).toContain("org/repo");
    expect(frame).toContain("status: running");
    expect(frame).toContain("/tmp/chat.jsonl");
    expect(frame.indexOf("one")).toBeLessThan(frame.indexOf("three"));
    unmount();
  });

  it("shows fallback placeholder while loading", () => {
    const node = sampleNode();
    const { lastFrame, unmount } = render(
      <DetailPane
        node={node}
        now={Date.now()}
        theme={DEFAULT_THEME}
        tailLines={[]}
        tailLoading={true}
      />,
    );
    expect(lastFrame()).toContain("(loading log tail");
    unmount();
  });

  it("uses recentLogs fallback copy when logSource is null", () => {
    const node = sampleNode({ logSource: null });
    const { lastFrame, unmount } = render(
      <DetailPane
        node={node}
        now={Date.now()}
        theme={DEFAULT_THEME}
        tailLines={node.recentLogs}
        tailLoading={false}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("(none — using row tail)");
    expect(frame).toContain("assistant: working on it");
    unmount();
  });
});

describe("App detail pane keys", () => {
  it("opens on d, closes on Esc without clearing an active filter", async () => {
    const initial = demoSnapshot(3);
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        terminalRows={60}
        initialFilter="status:running"
      />,
    );

    expect(lastFrame()).toContain("filter: status:running");
    expect(lastFrame()).not.toContain("── detail ──");

    stdin.write("d");
    await vi.waitFor(() => expect(lastFrame()).toContain("── detail ──"));
    expect(lastFrame()).toContain("Refactor authentication flow");
    expect(lastFrame()).toContain("filter: status:running");

    stdin.write("\u001B");
    await vi.waitFor(() => {
      expect(lastFrame()).not.toContain("── detail ──");
      expect(lastFrame()).toContain("filter: status:running");
    });

    unmount();
  });

  it("increases detail tail depth with number keys while open", async () => {
    const initial = demoSnapshot(3);
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        terminalRows={60}
        detailLines={25}
      />,
    );

    stdin.write("d");
    await vi.waitFor(() => expect(lastFrame()).toContain("── detail ──"));

    stdin.write("5");
    await vi.waitFor(() => expect(lastFrame()).toContain("showing 50"));

    unmount();
  });

  it("refreshes detail content when selection moves while open", async () => {
    const initial = demoSnapshot(3);
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        terminalRows={60}
      />,
    );

    stdin.write("d");
    await vi.waitFor(() =>
      expect(lastFrame()).toContain("Refactor authentication flow"),
    );

    stdin.write("\u001B[B");
    await vi.waitFor(() =>
      expect(lastFrame()).toContain(
        "Locate every callsite of legacy auth helpers",
      ),
    );

    unmount();
  });

  it("does not read logs while the detail pane is closed", async () => {
    const path = "/tmp/closed-pane.log";
    let readWindowCalls = 0;
    const base = memFs({ [path]: { content: "alpha\nbeta\n" } });
    const fs: FsLike = {
      ...base,
      async readWindow(p, offset, length) {
        readWindowCalls += 1;
        return base.readWindow(p, offset, length);
      },
    };
    const initial = demoSnapshot(3);
    initial.nodes["ide-1"] = {
      ...initial.nodes["ide-1"]!,
      logSource: path,
    };

    const { stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        terminalRows={60}
        detailFs={fs}
      />,
    );

    await new Promise((r) => setTimeout(r, 80));
    expect(readWindowCalls).toBe(0);

    stdin.write("d");
    await vi.waitFor(() => expect(readWindowCalls).toBeGreaterThan(0));

    unmount();
  });
});
