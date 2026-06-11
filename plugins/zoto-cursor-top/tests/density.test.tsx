import React from "react";
import { render } from "ink-testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/ui/App.js";
import { demoSnapshot } from "../src/discovery/demo.js";
import { THEME_NAMES } from "../src/ui/theme.js";

/**
 * Density / theme behaviour of the live TUI, driven through the demo
 * fixture. The demo snapshot starts with all roots expanded, and `ide-1`
 * carries the title "Refactor authentication flow" plus log lines, so the
 * title and `log:` body blocks are observable from the rendered frame.
 */

const IDE_TITLE = "Refactor authentication flow";

let savedNoColor: string | undefined;

beforeEach(() => {
  // Make theme resolution deterministic regardless of the runner's env.
  savedNoColor = process.env.NO_COLOR;
  delete process.env.NO_COLOR;
});

afterEach(() => {
  if (savedNoColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = savedNoColor;
});

function renderApp(props: Partial<React.ComponentProps<typeof App>> = {}) {
  const initial = demoSnapshot(3);
  return render(
    <App
      load={async () => initial}
      initial={initial}
      intervalMs={5000}
      terminalRows={60}
      {...props}
    />,
  );
}

describe("density rendering", () => {
  it("comfortable (default) renders row + title + log tail with no status-line suffix", () => {
    const { lastFrame, unmount } = renderApp();
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Cursor IDE");
    expect(frame).toContain(IDE_TITLE);
    expect(frame).toContain("log:");
    expect(frame).not.toContain("· theme");
    expect(frame).not.toContain("· density");
    unmount();
  });

  it("compact hides both title and log lines", () => {
    const { lastFrame, unmount } = renderApp({ density: "compact" });
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Cursor IDE");
    expect(frame).not.toContain(IDE_TITLE);
    expect(frame).not.toContain("log:");
    expect(frame).toContain("density compact");
    unmount();
  });

  it("cozy keeps the title but hides log lines", () => {
    const { lastFrame, unmount } = renderApp({ density: "cozy" });
    const frame = lastFrame() ?? "";
    expect(frame).toContain("Cursor IDE");
    expect(frame).toContain(IDE_TITLE);
    expect(frame).not.toContain("log:");
    expect(frame).toContain("density cozy");
    unmount();
  });
});

describe("interactive cycling keys", () => {
  it("'y' cycles density comfortable → compact → cozy → comfortable", async () => {
    const { lastFrame, stdin, unmount } = renderApp();
    expect(lastFrame()).toContain("log:");

    stdin.write("y"); // → compact
    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("density compact");
      expect(frame).not.toContain("log:");
      expect(frame).not.toContain(IDE_TITLE);
    });

    stdin.write("y"); // → cozy
    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("density cozy");
      expect(frame).toContain(IDE_TITLE);
      expect(frame).not.toContain("log:");
    });

    stdin.write("y"); // → comfortable (back to default; suffix disappears)
    await vi.waitFor(() => {
      const frame = lastFrame() ?? "";
      expect(frame).not.toContain("· density");
      expect(frame).toContain("log:");
    });
    unmount();
  });

  it("'t' cycles the theme and surfaces non-default names in the status line", async () => {
    const { lastFrame, stdin, unmount } = renderApp();
    expect(lastFrame()).not.toContain("· theme");

    for (const name of THEME_NAMES.slice(1)) {
      stdin.write("t");
      await vi.waitFor(() => expect(lastFrame()).toContain(`theme ${name}`));
    }

    stdin.write("t"); // last theme → default (suffix disappears)
    await vi.waitFor(() => expect(lastFrame()).not.toContain("· theme"));
    unmount();
  });

  it("announces the new keys in the footer", () => {
    const { lastFrame, unmount } = renderApp();
    const frame = lastFrame() ?? "";
    expect(frame).toContain("[t]heme");
    expect(frame).toContain("[y] density");
    expect(frame).toContain("[i] info");
    unmount();
  });
});

describe("NO_COLOR end-to-end", () => {
  it("forces mono even when another theme is requested", () => {
    process.env.NO_COLOR = "1";
    const { lastFrame, unmount } = renderApp({ themeName: "ocean" });
    expect(lastFrame()).toContain("theme mono");
    unmount();
  });

  it("keeps forcing mono while cycling with 't'", async () => {
    process.env.NO_COLOR = "1";
    const { lastFrame, stdin, unmount } = renderApp();
    stdin.write("t");
    await vi.waitFor(() => expect(lastFrame()).toContain("theme mono"));
    stdin.write("t");
    await vi.waitFor(() => expect(lastFrame()).toContain("theme mono"));
    unmount();
  });
});
