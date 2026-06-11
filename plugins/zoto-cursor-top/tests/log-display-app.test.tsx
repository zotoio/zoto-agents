import React from "react";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/ui/App.js";
import { demoSnapshot } from "../src/discovery/demo.js";

describe("App log display toggles", () => {
  it("defaults to oldest-first log order and toggles with o", async () => {
    const initial = demoSnapshot(3);
    initial.nodes["ide-1"]!.recentLogs = [
      "assistant: oldest",
      "assistant: newest",
    ];
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        terminalRows={60}
        terminalColumns={160}
        density="comfortable"
      />,
    );

    const frame = lastFrame() ?? "";
    const oldestIdx = frame.indexOf("oldest");
    const newestIdx = frame.indexOf("newest");
    expect(oldestIdx).toBeGreaterThan(-1);
    expect(newestIdx).toBeGreaterThan(oldestIdx);

    stdin.write("o");
    await vi.waitFor(() => expect(lastFrame()).toContain("· logs newest"));
    const reversed = lastFrame() ?? "";
    expect(reversed.indexOf("newest")).toBeLessThan(reversed.indexOf("oldest"));

    unmount();
  });
});
