import React from "react";
import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { App } from "../src/ui/App.js";
import { demoSnapshot } from "../src/discovery/demo.js";

describe("App", () => {
  it("renders the header and at least one root row", () => {
    const initial = demoSnapshot(3);
    const { lastFrame, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
      />,
    );
    const frame = lastFrame() ?? "";
    expect(frame).toContain("cursor-top");
    expect(frame).toContain("TYPE");
    expect(frame).toContain("Cursor IDE");
    expect(frame).toContain("Cloud Agent VM");
    expect(frame).toContain("cursor-agent CLI");
    unmount();
  });

  it("expands a root to show its subagents", () => {
    const initial = demoSnapshot(3);
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
      />,
    );
    stdin.write("\u001B[B"); // down to second root
    stdin.write("\u001B[B"); // down to third root (Cloud)
    stdin.write("\u001B[C"); // right to expand
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Task(explore)");
    expect(frame).toContain("Task(generalPurpose)");
    unmount();
  });
});
