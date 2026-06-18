import React from "react";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/ui/App.js";
import { demoSnapshot } from "../src/discovery/demo.js";

describe("App", () => {
  it("renders the header and category groups", () => {
    const initial = demoSnapshot(3);
    const { lastFrame, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        terminalRows={60}
        terminalColumns={160}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("cursor-top");
    expect(frame).toContain("TYPE");
    expect(frame).toContain("IDE Sessions");
    expect(frame).toContain("CLI Sessions");
    expect(frame).toContain("Cloud Agents");
    expect(frame).toContain("Cursor IDE");
    unmount();
  });

  it("expands a collapsed category to show its children", async () => {
    const initial = demoSnapshot(1);
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        density="compact"
        terminalRows={80}
        terminalColumns={160}
      />,
    );
    stdin.write("e"); // expand all to see everything
    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("cursor-agent CLI");
    });
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Cloud Agent VM");
    expect(frame).toContain("Task(explore)");
    expect(frame).toContain("Task(generalPurpose)");
    unmount();
  });
});
