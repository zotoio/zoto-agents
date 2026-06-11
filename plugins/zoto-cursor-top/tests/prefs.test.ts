import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  argvNamesFlag,
  cursorTopPrefsPath,
  loadCursorTopPrefs,
  resolveStartupPrefs,
  saveCursorTopPrefs,
} from "../src/prefs.js";

describe("cursorTopPrefsPath", () => {
  it("lives under ~/.zoto/cursor-top.json", () => {
    expect(cursorTopPrefsPath("/home/test")).toBe("/home/test/.zoto/cursor-top.json");
  });
});

describe("loadCursorTopPrefs / saveCursorTopPrefs", () => {
  it("round-trips theme, density, infoStripOpen, and activeOnly=false", () => {
    const home = mkdtempSync(join(tmpdir(), "cursor-top-prefs-"));
    saveCursorTopPrefs(
      {
        theme: "ocean",
        density: "compact",
        infoStripOpen: true,
        activeOnly: false,
      },
      home,
    );
    expect(loadCursorTopPrefs(home)).toEqual({
      theme: "ocean",
      density: "compact",
      infoStripOpen: true,
      activeOnly: false,
    });
  });

  it("ignores unknown theme and density values", () => {
    const home = mkdtempSync(join(tmpdir(), "cursor-top-prefs-"));
    const path = cursorTopPrefsPath(home);
    mkdirSync(join(home, ".zoto"), { recursive: true });
    writeFileSync(
      path,
      JSON.stringify({ theme: "neon", density: "dense", infoStripOpen: "yes" }),
    );
    expect(loadCursorTopPrefs(home)).toEqual({});
  });

  it("returns {} for corrupt JSON", () => {
    const home = mkdtempSync(join(tmpdir(), "cursor-top-prefs-"));
    const path = cursorTopPrefsPath(home);
    mkdirSync(join(home, ".zoto"), { recursive: true });
    writeFileSync(path, "{not json");
    expect(loadCursorTopPrefs(home)).toEqual({});
  });
});

describe("resolveStartupPrefs", () => {
  it("restores saved theme and density when CLI flags are omitted", () => {
    const resolved = resolveStartupPrefs(
      { theme: "default", density: "comfortable", activeOnly: true },
      { theme: "dracula", density: "compact", infoStripOpen: true },
      { theme: false, density: false, activeOnly: false },
    );
    expect(resolved).toEqual({
      theme: "dracula",
      density: "compact",
      infoStripOpen: true,
      logOrder: "oldest-first",
      activeOnly: true,
    });
  });

  it("lets explicit --theme / --density override saved prefs", () => {
    const resolved = resolveStartupPrefs(
      { theme: "forest", density: "cozy", activeOnly: true },
      { theme: "dracula", density: "compact" },
      { theme: true, density: true, activeOnly: false },
    );
    expect(resolved.theme).toBe("forest");
    expect(resolved.density).toBe("cozy");
  });

  it("restores saved activeOnly=false unless CLI passes an active-only flag", () => {
    const resolved = resolveStartupPrefs(
      { theme: "default", density: "comfortable", activeOnly: true },
      { activeOnly: false },
      { theme: false, density: false, activeOnly: false },
    );
    expect(resolved.activeOnly).toBe(false);
  });

  it("lets explicit --no-active-only override saved activeOnly=false", () => {
    const resolved = resolveStartupPrefs(
      { theme: "default", density: "comfortable", activeOnly: false },
      { activeOnly: false },
      { theme: false, density: false, activeOnly: true },
    );
    expect(resolved.activeOnly).toBe(false);
  });
});

describe("argvNamesFlag", () => {
  it("detects bare and equals-form flags", () => {
    expect(argvNamesFlag(["--theme", "ocean"], "--theme")).toBe(true);
    expect(argvNamesFlag(["--theme=ocean"], "--theme")).toBe(true);
    expect(argvNamesFlag(["--once"], "--theme")).toBe(false);
  });
});
