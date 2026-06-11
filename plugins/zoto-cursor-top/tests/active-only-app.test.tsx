import React from "react";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/ui/App.js";
import { loadCursorTopPrefs } from "../src/prefs.js";
import type { AgentSnapshot } from "../src/types.js";

function snapshotWithDoneAgent(): AgentSnapshot {
  return {
    capturedAt: 1,
    roots: ["done-root"],
    diagnostics: [],
    nodes: {
      "done-root": {
        id: "done-root",
        kind: "ide",
        label: "finished chat",
        status: "done",
        recentLogs: ["done line"],
        children: [],
      },
    },
  };
}

describe("App active-only toggle", () => {
  it("toggles active-only with a and shows all agents in the status line", async () => {
    const empty = { capturedAt: 1, roots: [] as string[], diagnostics: [], nodes: {} };
    let activeOnly = true;
    const load = vi.fn(async () => (activeOnly ? empty : snapshotWithDoneAgent()));
    const { lastFrame, stdin, unmount } = render(
      <App
        load={load}
        initial={empty}
        intervalMs={5000}
        terminalRows={40}
        initialActiveOnly
        onActiveOnlyChange={(value) => {
          activeOnly = value;
        }}
      />,
    );

    expect(lastFrame()).not.toContain("all agents");
    stdin.write("a");
    await vi.waitFor(() => expect(lastFrame()).toContain("all agents"));
    expect(activeOnly).toBe(false);

    stdin.write("a");
    await vi.waitFor(() => expect(lastFrame() ?? "").not.toContain("all agents"));
    expect(activeOnly).toBe(true);

    unmount();
  });

  it("persists activeOnly=false to prefs", async () => {
    const home = mkdtempSync(join(tmpdir(), "cursor-top-active-prefs-"));
    const snap = snapshotWithDoneAgent();
    const { stdin, unmount } = render(
      <App
        load={async () => snap}
        initial={snap}
        intervalMs={5000}
        terminalRows={40}
        persistPrefs
        prefsHomeDir={home}
        initialActiveOnly
        onActiveOnlyChange={() => {}}
      />,
    );

    stdin.write("a");
    await vi.waitFor(() =>
      expect(loadCursorTopPrefs(home).activeOnly).toBe(false),
    );
    unmount();
  });

  it("re-filters the tree when active-only is turned off", async () => {
    const doneSnap = snapshotWithDoneAgent();
    let activeOnly = true;
    const load = vi.fn(async () =>
      activeOnly ? { ...doneSnap, roots: [] as string[], nodes: {} } : doneSnap,
    );
    const { lastFrame, stdin, unmount } = render(
      <App
        load={load}
        initial={{ ...doneSnap, roots: [], nodes: {} }}
        intervalMs={5000}
        terminalRows={40}
        initialActiveOnly
        onActiveOnlyChange={(value) => {
          activeOnly = value;
        }}
      />,
    );

    expect(lastFrame() ?? "").not.toContain("finished");
    stdin.write("a");
    await vi.waitFor(() => {
      expect(load).toHaveBeenCalled();
      expect(lastFrame()).toContain("finished");
    });
    unmount();
  });
});
