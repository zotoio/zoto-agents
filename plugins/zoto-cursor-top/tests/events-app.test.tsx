import React from "react";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/ui/App.js";
import type { AgentNode, AgentSnapshot } from "../src/types.js";

const NOW = 1_700_000_000_000;

function node(
  partial: Partial<AgentNode> & Pick<AgentNode, "id">,
): AgentNode {
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

function snap(
  nodes: Record<string, AgentNode>,
  roots: string[] = Object.keys(nodes),
): AgentSnapshot {
  return { capturedAt: NOW, nodes, roots, diagnostics: [] };
}

describe("App event strip and highlights", () => {
  it("shows the event strip and highlights a row after a status transition", async () => {
    const initial = snap({
      a: node({ id: "a", label: "main", status: "running" }),
    });
    const updated = snap({
      a: node({ id: "a", label: "main", status: "waiting" }),
    });
    let call = 0;
    const load = async (): Promise<AgentSnapshot> => {
      call += 1;
      return call === 1 ? initial : updated;
    };

    const { lastFrame, stdin, unmount } = render(
      <App load={load} initial={initial} intervalMs={50} />,
    );

    await vi.waitFor(() => {
      expect(lastFrame()).toContain("main");
    });
    stdin.write("i");
    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("⏸ main waiting");
    });

    unmount();
  });

  it("rings the bell once on finished events when bell is enabled", async () => {
    const initial = snap({
      a: node({ id: "a", label: "chat", status: "running" }),
    });
    const updated = snap({
      a: node({ id: "a", label: "chat", status: "done" }),
    });
    let call = 0;
    const load = async (): Promise<AgentSnapshot> => {
      call += 1;
      return call === 1 ? initial : updated;
    };
    const bellWriter = vi.fn();

    const { unmount } = render(
      <App
        load={load}
        initial={initial}
        intervalMs={50}
        bell
        bellWriter={bellWriter}
      />,
    );

    await vi.waitFor(() => expect(bellWriter).toHaveBeenCalledTimes(1));
    expect(bellWriter).toHaveBeenCalledWith("\u0007");
    unmount();
  });

  it("does not ring the bell for waiting transitions", async () => {
    const initial = snap({
      a: node({ id: "a", label: "main", status: "running" }),
    });
    const updated = snap({
      a: node({ id: "a", label: "main", status: "waiting" }),
    });
    let call = 0;
    const load = async (): Promise<AgentSnapshot> => {
      call += 1;
      return call === 1 ? initial : updated;
    };
    const bellWriter = vi.fn();

    const { unmount } = render(
      <App
        load={load}
        initial={initial}
        intervalMs={50}
        bell
        bellWriter={bellWriter}
      />,
    );

    await vi.waitFor(() => {
      expect(bellWriter).not.toHaveBeenCalled();
    });
    unmount();
  });

  it("manual refresh (r) also diffs snapshots", async () => {
    const initial = snap({
      a: node({ id: "a", label: "chat", status: "running" }),
    });
    const updated = snap({
      a: node({ id: "a", label: "chat", status: "error" }),
    });
    const load = vi.fn().mockResolvedValue(updated);

    const { lastFrame, stdin, unmount } = render(
      <App load={load} initial={initial} intervalMs={60_000} paused />,
    );

    stdin.write("r");
    await vi.waitFor(() => expect(load).toHaveBeenCalled());
    stdin.write("i");
    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("✗ chat failed");
    });
    expect(load).toHaveBeenCalled();
    unmount();
  });
});
