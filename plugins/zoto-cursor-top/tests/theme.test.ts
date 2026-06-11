import { afterEach, describe, expect, it, vi, type MockInstance } from "vitest";
import {
  DEFAULT_DENSITY,
  DEFAULT_THEME,
  DENSITIES,
  THEME_NAMES,
  THEMES,
  densityShowsLogs,
  densityShowsTitle,
  isNoColor,
  nextDensity,
  nextThemeName,
  normalizeThemeName,
  resolveDensity,
  resolveTheme,
  themeAppTitle,
} from "../src/ui/theme.js";
import { displayWidth, padDisplay, statusColor } from "../src/ui/format.js";

/** Silence + capture stderr warnings emitted by the fallback paths. */
function spyStderr(): MockInstance {
  return vi.spyOn(process.stderr, "write").mockImplementation(() => true);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveTheme", () => {
  it("resolves built-in themes by name", () => {
    for (const name of THEME_NAMES) {
      expect(resolveTheme(name, {})).toBe(THEMES[name]);
    }
  });

  it("defaults to the default theme when no name is given", () => {
    expect(resolveTheme(undefined, {})).toBe(DEFAULT_THEME);
  });

  it("falls back to default with a stderr warning on unknown names", () => {
    const stderr = spyStderr();
    expect(resolveTheme("neon", {})).toBe(DEFAULT_THEME);
    expect(stderr).toHaveBeenCalledTimes(1);
    expect(String(stderr.mock.calls[0]![0])).toContain('unknown theme "neon"');
  });

  it("forces mono when NO_COLOR is set and non-empty (no-color.org)", () => {
    expect(resolveTheme("ocean", { NO_COLOR: "1" })).toBe(THEMES.mono);
    expect(resolveTheme("default", { NO_COLOR: "anything" })).toBe(THEMES.mono);
  });

  it("ignores an empty NO_COLOR per the no-color.org convention", () => {
    expect(resolveTheme("ocean", { NO_COLOR: "" })).toBe(THEMES.ocean);
  });

  it("still forces mono when the name is unknown and NO_COLOR is set", () => {
    const stderr = spyStderr();
    expect(resolveTheme("bogus", { NO_COLOR: "1" })).toBe(THEMES.mono);
    expect(stderr).toHaveBeenCalled();
  });
});

describe("isNoColor", () => {
  it("is true only for present, non-empty NO_COLOR", () => {
    expect(isNoColor({})).toBe(false);
    expect(isNoColor({ NO_COLOR: "" })).toBe(false);
    expect(isNoColor({ NO_COLOR: "0" })).toBe(true);
    expect(isNoColor({ NO_COLOR: "1" })).toBe(true);
  });
});

describe("normalizeThemeName", () => {
  it("passes known names through without warning", () => {
    const stderr = spyStderr();
    expect(normalizeThemeName("high-contrast")).toBe("high-contrast");
    expect(stderr).not.toHaveBeenCalled();
  });

  it("warns and returns default for unknown names", () => {
    const stderr = spyStderr();
    expect(normalizeThemeName("neon")).toBe("default");
    expect(stderr).toHaveBeenCalledTimes(1);
  });
});

describe("built-in palettes", () => {
  it("default theme preserves the legacy hard-coded colours exactly", () => {
    expect(DEFAULT_THEME.status).toEqual({
      running: "green",
      waiting: "yellow",
      idle: "blue",
      done: "gray",
      error: "red",
      unknown: "white",
    });
    expect(DEFAULT_THEME.header).toBe("cyan");
    expect(DEFAULT_THEME.accent).toBe("yellow");
    expect(DEFAULT_THEME.badge).toEqual({ color: "white", bold: true });
    expect(DEFAULT_THEME.dim).toBe(true);
    expect(DEFAULT_THEME.selection).toEqual({ inverse: true, bold: true });
  });

  it("mono theme defines no colours at all", () => {
    const mono = THEMES.mono;
    for (const token of Object.values(mono.status)) expect(token).toBeUndefined();
    expect(mono.header).toBeUndefined();
    expect(mono.accent).toBeUndefined();
    expect(mono.badge.color).toBeUndefined();
    expect(mono.diagnostics.color).toBeUndefined();
  });

  it("every theme covers every status token", () => {
    const statuses = ["running", "waiting", "idle", "done", "error", "unknown"];
    for (const name of THEME_NAMES) {
      for (const status of statuses) {
        expect(Object.keys(THEMES[name].status)).toContain(status);
      }
    }
  });

  it("decor themes expose emoji kind glyphs and a funky title", () => {
    for (const name of ["party", "kawaii", "cyber", "retro", "wizard"] as const) {
      const t = THEMES[name];
      expect(t.decor?.title).toBeTruthy();
      expect(t.decor?.kindGlyphs?.agent).toBeTruthy();
      expect(themeAppTitle(t)).toBe(t.decor!.title);
    }
    expect(themeAppTitle(DEFAULT_THEME)).toBe("cursor-top");
  });
});

describe("displayWidth / padDisplay", () => {
  it("counts emoji as two cells", () => {
    expect(displayWidth("🎉")).toBe(2);
    expect(displayWidth("ab")).toBe(2);
    expect(padDisplay("🎉", 4)).toBe("🎉  ");
  });
});

describe("statusColor (theme-aware)", () => {
  it("keeps the legacy single-argument behaviour", () => {
    expect(statusColor("running")).toBe("green");
    expect(statusColor("waiting")).toBe("yellow");
    expect(statusColor("idle")).toBe("blue");
    expect(statusColor("done")).toBe("gray");
    expect(statusColor("error")).toBe("red");
    expect(statusColor("unknown")).toBe("white");
  });

  it("routes through the provided theme's tokens", () => {
    expect(statusColor("running", THEMES.ocean)).toBe("cyan");
    expect(statusColor("error", THEMES["high-contrast"])).toBe("redBright");
    expect(statusColor("running", THEMES.mono)).toBeUndefined();
    expect(statusColor("idle", THEMES.dracula)).toBe("magenta");
    expect(statusColor("running", THEMES.forest)).toBe("greenBright");
  });
});

describe("nextThemeName", () => {
  it("cycles through every built-in and wraps around", () => {
    let current: string = THEME_NAMES[0]!;
    for (let step = 0; step < THEME_NAMES.length; step++) {
      const next = nextThemeName(current);
      expect(next).toBe(THEME_NAMES[(step + 1) % THEME_NAMES.length]);
      current = next;
    }
  });

  it("restarts from the head for unknown current names", () => {
    expect(nextThemeName("bogus")).toBe("default");
  });
});

describe("density model", () => {
  it("defaults to comfortable", () => {
    expect(DEFAULT_DENSITY).toBe("comfortable");
    expect(resolveDensity(undefined)).toBe("comfortable");
  });

  it("resolves the three known levels", () => {
    for (const level of DENSITIES) {
      expect(resolveDensity(level)).toBe(level);
    }
  });

  it("warns and falls back to comfortable on unknown levels", () => {
    const stderr = spyStderr();
    expect(resolveDensity("dense")).toBe("comfortable");
    expect(stderr).toHaveBeenCalledTimes(1);
    expect(String(stderr.mock.calls[0]![0])).toContain('unknown density "dense"');
  });

  it("gates title and log body lines per level", () => {
    expect(densityShowsTitle("compact")).toBe(false);
    expect(densityShowsLogs("compact")).toBe(false);
    expect(densityShowsTitle("cozy")).toBe(true);
    expect(densityShowsLogs("cozy")).toBe(false);
    expect(densityShowsTitle("comfortable")).toBe(true);
    expect(densityShowsLogs("comfortable")).toBe(true);
  });

  it("cycles densities and wraps around", () => {
    expect(nextDensity("comfortable")).toBe("compact");
    expect(nextDensity("compact")).toBe("cozy");
    expect(nextDensity("cozy")).toBe("comfortable");
  });
});
