import React from "react";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/ui/App.js";
import { demoSnapshot } from "../src/discovery/demo.js";

describe("App help overlay", () => {
  it("opens on ? and documents prune diagnostics", async () => {
    const initial = demoSnapshot(3);
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        terminalRows={60}
      />,
    );
    stdin.write("?");
    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("── help ──");
      expect(frame).toContain("--cursor-only:");
      expect(frame).toContain("--with-logs:");
      expect(frame).toContain("--active-only:");
      expect(frame).toContain("Diagnostic lines");
    });
    unmount();
  });

  it("closes on Esc", async () => {
    const initial = demoSnapshot(3);
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        terminalRows={60}
      />,
    );
    stdin.write("?");
    await vi.waitFor(() => expect(lastFrame()).toContain("── help ──"));
    stdin.write("\u001B"); // Esc
    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).not.toContain("── help ──");
      expect(frame).toContain("[?] help");
    });
    unmount();
  });
});
