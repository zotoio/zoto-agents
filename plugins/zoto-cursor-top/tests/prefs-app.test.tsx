import React from "react";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render } from "ink-testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/ui/App.js";
import { demoSnapshot } from "../src/discovery/demo.js";
import { loadCursorTopPrefs } from "../src/prefs.js";

let savedNoColor: string | undefined;

beforeEach(() => {
  savedNoColor = process.env.NO_COLOR;
  delete process.env.NO_COLOR;
});

afterEach(() => {
  if (savedNoColor === undefined) delete process.env.NO_COLOR;
  else process.env.NO_COLOR = savedNoColor;
});

describe("App prefs persistence", () => {
  it("writes theme and density changes to the prefs file", async () => {
    const home = mkdtempSync(join(tmpdir(), "cursor-top-app-prefs-"));
    const initial = demoSnapshot(3);
    const { lastFrame, stdin, unmount } = render(
      <App
        load={async () => initial}
        initial={initial}
        intervalMs={5000}
        terminalRows={60}
        terminalColumns={160}
        persistPrefs
        prefsHomeDir={home}
      />,
    );

    stdin.write("t"); // default → mono
    await vi.waitFor(() => expect(lastFrame()).toContain("theme mono"));
    expect(loadCursorTopPrefs(home).theme).toBe("mono");

    stdin.write("y"); // comfortable → compact
    await vi.waitFor(() => expect(lastFrame()).toContain("density compact"));
    expect(loadCursorTopPrefs(home).density).toBe("compact");

    unmount();
  });
});
