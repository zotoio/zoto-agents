import React from "react";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { demoSnapshot } from "../src/discovery/demo.js";
import { filterSnapshot } from "../src/filter.js";
import { parseArgs } from "../src/cli.js";
import { App } from "../src/ui/App.js";

describe("App interactive filter", () => {
  it("opens the filter bar on '/', commits on Enter, and shows matched count", async () => {
    const initial = demoSnapshot(3);
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        terminalColumns={160}
      />,
    );

    expect(lastFrame()).toMatch(/\[\/\]\s*filter/);
    expect(lastFrame()).not.toContain("/filter:");

    stdin.write("/");
    await vi.waitFor(() => expect(lastFrame()).toContain("/filter:"));

    stdin.write("status:running");
    await vi.waitFor(() =>
      expect(lastFrame()).toMatch(/\/filter:.*status:running/),
    );

    stdin.write("\r"); // Enter
    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("filter: status:running");
      expect(frame).not.toContain("/filter:");
    });

    unmount();
  });

  it("does not quit when typing 'q' inside the filter bar", async () => {
    const initial = demoSnapshot(3);
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        terminalColumns={160}
      />,
    );

    stdin.write("/");
    await vi.waitFor(() => expect(lastFrame()).toContain("/filter:"));

    stdin.write("q");
    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).toMatch(/\/filter:.*q/);
      expect(frame).toContain("cursor-top");
    });

    unmount();
  });

  it("clears the filter and closes the bar on Esc", async () => {
    const initial = demoSnapshot(3);
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        initialFilter="status:running"
        terminalColumns={160}
      />,
    );

    expect(lastFrame()).toContain("filter: status:running");

    stdin.write("/");
    await vi.waitFor(() => expect(lastFrame()).toContain("/filter:"));

    stdin.write("\u001B"); // Esc
    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).not.toContain("filter:");
      expect(frame).not.toContain("/filter:");
      // After clearing, the unfiltered tree is restored (windowing may clip
      // nodes below the fold — assert a visible root row, not a specific agent).
      expect(frame).toContain("Cursor IDE");
    });

    unmount();
  });
});

describe("--json --filter end-to-end", () => {
  it("parseArgs accepts --filter and filterSnapshot narrows demo output", () => {
    const opts = parseArgs(["--demo", "--json", "--filter", "status:running"]);
    expect(opts.filter).toBe("status:running");
    expect(opts.demo).toBe(true);
    expect(opts.json).toBe(true);

    const full = demoSnapshot(3);
    const filtered = filterSnapshot(full, opts.filter);
    expect(filtered.matched).toBeGreaterThan(0);
    expect(Object.keys(filtered.snapshot.nodes).length).toBeLessThan(
      Object.keys(full.nodes).length,
    );

    const json = JSON.stringify(filtered.snapshot, null, 2);
    const parsed = JSON.parse(json) as typeof filtered.snapshot;
    expect(parsed.roots).toEqual(filtered.snapshot.roots);
    expect(parsed.nodes).toEqual(filtered.snapshot.nodes);
  });
});
