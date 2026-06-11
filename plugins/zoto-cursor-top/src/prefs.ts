/**
 * Interactive TUI preferences persisted under `~/.zoto/cursor-top.json`.
 *
 * Only values the user last selected in the live UI (or via explicit CLI
 * flags on startup) are stored — discovery / filter flags stay on the
 * command line.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
  DENSITIES,
  THEME_NAMES,
  type Density,
  type ThemeName,
} from "./ui/theme.js";
import {
  DEFAULT_LOG_SCROLL_ORDER,
  type LogScrollOrder,
} from "./ui/format.js";

export interface CursorTopPrefs {
  /** Last colour theme selected with `t` or `--theme`. */
  theme?: ThemeName;
  /** Last layout density selected with `y` or `--density`. */
  density?: Density;
  /** Whether the lifecycle / diagnostics strip (`i`) was left open. */
  infoStripOpen?: boolean;
  /** Last log tail order (`o`); omitted when oldest-first (default). */
  logOrder?: LogScrollOrder;
  /**
   * When `false`, the TUI left active-only off (`a` / `--no-active-only`).
   * Omitted when the default active-only filter is enabled.
   */
  activeOnly?: boolean;
}

export interface ResolvedStartupPrefs {
  theme: string;
  density: Density;
  infoStripOpen: boolean;
  logOrder: LogScrollOrder;
  activeOnly: boolean;
}

/** Absolute path to the workspace-local prefs file (outside the repo). */
export function cursorTopPrefsPath(homeDir: string = homedir()): string {
  return join(homeDir, ".zoto", "cursor-top.json");
}

function parseStoredTheme(value: unknown): ThemeName | undefined {
  if (typeof value !== "string") return undefined;
  return (THEME_NAMES as readonly string[]).includes(value)
    ? (value as ThemeName)
    : undefined;
}

function parseStoredDensity(value: unknown): Density | undefined {
  if (typeof value !== "string") return undefined;
  return (DENSITIES as readonly string[]).includes(value)
    ? (value as Density)
    : undefined;
}

function parseStoredLogOrder(value: unknown): LogScrollOrder | undefined {
  if (value === "oldest-first" || value === "newest-first") return value;
  return undefined;
}

/** Read persisted prefs; missing or invalid files yield `{}`. */
export function loadCursorTopPrefs(homeDir?: string): CursorTopPrefs {
  const path = cursorTopPrefsPath(homeDir);
  if (!existsSync(path)) return {};
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    const prefs: CursorTopPrefs = {};
    const theme = parseStoredTheme(raw.theme);
    if (theme) prefs.theme = theme;
    const density = parseStoredDensity(raw.density);
    if (density) prefs.density = density;
    if (typeof raw.infoStripOpen === "boolean") {
      prefs.infoStripOpen = raw.infoStripOpen;
    }
    const logOrder = parseStoredLogOrder(raw.logOrder);
    if (logOrder) prefs.logOrder = logOrder;
    if (raw.activeOnly === false) prefs.activeOnly = false;
    return prefs;
  } catch {
    return {};
  }
}

/** Write prefs atomically enough for a tiny JSON blob (mkdir + overwrite). */
export function saveCursorTopPrefs(
  prefs: CursorTopPrefs,
  homeDir?: string,
): void {
  const path = cursorTopPrefsPath(homeDir);
  mkdirSync(dirname(path), { recursive: true });
  const payload: CursorTopPrefs = {};
  if (prefs.theme) payload.theme = prefs.theme;
  if (prefs.density) payload.density = prefs.density;
  if (prefs.infoStripOpen === true) payload.infoStripOpen = true;
  if (prefs.logOrder && prefs.logOrder !== DEFAULT_LOG_SCROLL_ORDER) {
    payload.logOrder = prefs.logOrder;
  }
  if (prefs.activeOnly === false) payload.activeOnly = false;
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

/**
 * Merge CLI defaults with saved prefs. Explicit `--theme` / `--density`
 * flags win; otherwise the last interactive selection is restored.
 */
export function resolveStartupPrefs(
  cli: { theme: string; density: Density; activeOnly: boolean },
  saved: CursorTopPrefs,
  explicit: { theme: boolean; density: boolean; activeOnly: boolean },
): ResolvedStartupPrefs {
  return {
    theme: explicit.theme ? cli.theme : (saved.theme ?? cli.theme),
    density: explicit.density ? cli.density : (saved.density ?? cli.density),
    infoStripOpen: saved.infoStripOpen ?? false,
    logOrder: saved.logOrder ?? DEFAULT_LOG_SCROLL_ORDER,
    activeOnly: explicit.activeOnly
      ? cli.activeOnly
      : (saved.activeOnly === false ? false : cli.activeOnly),
  };
}

/** True when `argv` contains a flag token (`--theme` or `--theme=value`). */
export function argvNamesFlag(argv: readonly string[], flag: string): boolean {
  return argv.some((arg) => arg === flag || arg.startsWith(`${flag}=`));
}
