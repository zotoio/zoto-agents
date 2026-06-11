import React from "react";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/ui/App.js";
import { demoSnapshot } from "../src/discovery/demo.js";

describe("App info strip", () => {
  it("hides lifecycle events and diagnostics by default", () => {
    const initial = demoSnapshot(3);
    const { lastFrame, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        terminalRows={40}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).not.toContain("! demo mode");
    expect(frame).toContain("[i] info");
    unmount();
  });

  it("shows diagnostics when i is pressed", async () => {
    const initial = demoSnapshot(3);
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        terminalRows={40}
      />,
    );
    stdin.write("i");
    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("! demo mode");
      expect(frame).toContain("info on");
    });
    unmount();
  });
});
