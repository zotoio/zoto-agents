/**
 * Colour theme + layout density models for the cursor-top TUI.
 *
 * Themes are plain data (named Ink/chalk colour tokens) and the helpers are
 * pure functions — no React imports — so they stay unit-testable and usable
 * from both the Ink components and the colour-free `--once` text renderer.
 *
 * Later UI subtasks (filter bar, event strip, highlights, detail pane) must
 * consume these tokens instead of hard-coding colours.
 */

import type { AgentKind, AgentStatus } from "../types.js";

/** An Ink/chalk colour name, or `undefined` for the terminal default (no colour). */
export type ThemeColor = string | undefined;

/** Optional emoji / unicode flair for playful themes (TUI only; `--once` stays plain). */
export interface ThemeDecor {
  /** Header title (default `cursor-top`). */
  title?: string;
  /** Emoji or unicode glyph per agent kind (replaces `[IDE]` badges). */
  kindGlyphs?: Partial<Record<AgentKind, string>>;
  /** Emoji prefix for the STATUS column. */
  statusGlyphs?: Partial<Record<AgentStatus, string>>;
  /** Funky column-header overrides (partial). */
  columnHeaders?: Partial<{
    type: string;
    pid: string;
    agent: string;
    model: string;
    repo: string;
    start: string;
    status: string;
    tokens: string;
  }>;
}

export interface Theme {
  /** Built-in theme name this object was registered under. */
  name: string;
  /** Per-status row colours (replaces the old hard-coded `statusColor` switch). */
  status: Record<AgentStatus, ThemeColor>;
  /** App title accent in the header line. */
  header: ThemeColor;
  /** Accent for transient callouts (e.g. the PAUSED badge). */
  accent: ThemeColor;
  /** Whether secondary text (totals, titles, log prefixes, footer) renders dim. */
  dim: boolean;
  /** Selected-row styling. */
  selection: { inverse: boolean; bold: boolean };
  /** Column-header row (TYPE / PID / ...) styling. */
  badge: { color: ThemeColor; bold: boolean };
  /** Diagnostics block styling. */
  diagnostics: { color: ThemeColor; dim: boolean };
  /** Emoji / unicode chrome — omitted on utilitarian palettes (`default`, `mono`, …). */
  decor?: ThemeDecor;
}

export const THEME_NAMES = [
  "default",
  "mono",
  "high-contrast",
  "ocean",
  "forest",
  "sunset",
  "solarized",
  "dracula",
  "party",
  "kawaii",
  "cyber",
  "retro",
  "wizard",
] as const;
export type ThemeName = (typeof THEME_NAMES)[number];

/**
 * The colours cursor-top has always used. MUST stay byte-for-byte identical
 * to the pre-theme-engine rendering (Decision 6: stable default outputs).
 */
export const DEFAULT_THEME: Theme = {
  name: "default",
  status: {
    running: "green",
    waiting: "yellow",
    idle: "blue",
    done: "gray",
    error: "red",
    unknown: "white",
  },
  header: "cyan",
  accent: "yellow",
  dim: true,
  selection: { inverse: true, bold: true },
  badge: { color: "white", bold: true },
  diagnostics: { color: undefined, dim: true },
};

/**
 * No colour at all — every colour token is the terminal default. Monochrome
 * attributes (bold / dim / inverse) are kept: they are intensity, not colour,
 * and preserve usability per the no-color.org convention.
 */
const MONO_THEME: Theme = {
  name: "mono",
  status: {
    running: undefined,
    waiting: undefined,
    idle: undefined,
    done: undefined,
    error: undefined,
    unknown: undefined,
  },
  header: undefined,
  accent: undefined,
  dim: true,
  selection: { inverse: true, bold: true },
  badge: { color: undefined, bold: true },
  diagnostics: { color: undefined, dim: true },
};

/** Bright variants and no dimming — for low-vision setups and washed-out terminals. */
const HIGH_CONTRAST_THEME: Theme = {
  name: "high-contrast",
  status: {
    running: "greenBright",
    waiting: "yellowBright",
    idle: "cyanBright",
    done: "white",
    error: "redBright",
    unknown: "whiteBright",
  },
  header: "cyanBright",
  accent: "yellowBright",
  dim: false,
  selection: { inverse: true, bold: true },
  badge: { color: "whiteBright", bold: true },
  diagnostics: { color: "yellowBright", dim: false },
};

/** Blue/cyan accent palette. */
const OCEAN_THEME: Theme = {
  name: "ocean",
  status: {
    running: "cyan",
    waiting: "magenta",
    idle: "blue",
    done: "gray",
    error: "red",
    unknown: "white",
  },
  header: "blueBright",
  accent: "cyanBright",
  dim: true,
  selection: { inverse: true, bold: true },
  badge: { color: "cyanBright", bold: true },
  diagnostics: { color: undefined, dim: true },
};

/** Green-forward palette for dark terminals. */
const FOREST_THEME: Theme = {
  name: "forest",
  status: {
    running: "greenBright",
    waiting: "yellow",
    idle: "green",
    done: "gray",
    error: "redBright",
    unknown: "white",
  },
  header: "greenBright",
  accent: "yellowBright",
  dim: true,
  selection: { inverse: true, bold: true },
  badge: { color: "green", bold: true },
  diagnostics: { color: undefined, dim: true },
};

/** Warm amber / red accents. */
const SUNSET_THEME: Theme = {
  name: "sunset",
  status: {
    running: "yellowBright",
    waiting: "magentaBright",
    idle: "red",
    done: "gray",
    error: "redBright",
    unknown: "white",
  },
  header: "redBright",
  accent: "yellowBright",
  dim: true,
  selection: { inverse: true, bold: true },
  badge: { color: "yellow", bold: true },
  diagnostics: { color: undefined, dim: true },
};

/** Solarized Dark–inspired base16 tones. */
const SOLARIZED_THEME: Theme = {
  name: "solarized",
  status: {
    running: "green",
    waiting: "yellow",
    idle: "blue",
    done: "cyan",
    error: "red",
    unknown: "white",
  },
  header: "cyan",
  accent: "yellow",
  dim: true,
  selection: { inverse: true, bold: true },
  badge: { color: "blue", bold: true },
  diagnostics: { color: "yellow", dim: true },
};

/** Dracula-inspired purple / pink accents. */
const DRACULA_THEME: Theme = {
  name: "dracula",
  status: {
    running: "greenBright",
    waiting: "yellowBright",
    idle: "magenta",
    done: "gray",
    error: "redBright",
    unknown: "white",
  },
  header: "magentaBright",
  accent: "cyanBright",
  dim: true,
  selection: { inverse: true, bold: true },
  badge: { color: "magentaBright", bold: true },
  diagnostics: { color: "cyan", dim: true },
};

/** Confetti brights — emoji badges and party-ball status dots. */
const PARTY_THEME: Theme = {
  name: "party",
  status: {
    running: "greenBright",
    waiting: "yellowBright",
    idle: "magentaBright",
    done: "gray",
    error: "redBright",
    unknown: "white",
  },
  header: "magentaBright",
  accent: "yellowBright",
  dim: true,
  selection: { inverse: true, bold: true },
  badge: { color: "yellowBright", bold: true },
  diagnostics: { color: "magentaBright", dim: true },
  decor: {
    title: "🎉 cursor-top 🎉",
    kindGlyphs: {
      ide: "💻",
      cli: "⌨️",
      cloud: "☁️",
      agent: "🤖",
      subagent: "🧩",
    },
    statusGlyphs: {
      running: "🟢",
      waiting: "🟡",
      idle: "🔵",
      done: "⚪",
      error: "🔴",
      unknown: "⚫",
    },
    columnHeaders: {
      type: "🎭",
      agent: "🕺 AGENT",
      tokens: "🪙",
    },
  },
};

/** Pastel pinks — kawaii faces and sparkles. */
const KAWAII_THEME: Theme = {
  name: "kawaii",
  status: {
    running: "magentaBright",
    waiting: "yellow",
    idle: "cyan",
    done: "gray",
    error: "red",
    unknown: "white",
  },
  header: "magentaBright",
  accent: "cyanBright",
  dim: true,
  selection: { inverse: true, bold: true },
  badge: { color: "magenta", bold: true },
  diagnostics: { color: "magentaBright", dim: true },
  decor: {
    title: "🌸 ᴄᴜʀꜱᴏʀ‑ᴛᴏᴘ 🌸",
    kindGlyphs: {
      ide: "🌸",
      cli: "🐱",
      cloud: "🍡",
      agent: "🎀",
      subagent: "✨",
    },
    statusGlyphs: {
      running: "💖",
      waiting: "💤",
      idle: "🫧",
      done: "🌙",
      error: "💢",
      unknown: "❔",
    },
    columnHeaders: {
      type: "✧",
      agent: "🎀 AGENT",
      status: "💫",
    },
  },
};

/** Fullwidth title + lightning glyphs — synthwave brights. */
const CYBER_THEME: Theme = {
  name: "cyber",
  status: {
    running: "cyanBright",
    waiting: "magentaBright",
    idle: "blueBright",
    done: "gray",
    error: "redBright",
    unknown: "whiteBright",
  },
  header: "cyanBright",
  accent: "magentaBright",
  dim: true,
  selection: { inverse: true, bold: true },
  badge: { color: "cyanBright", bold: true },
  diagnostics: { color: "magentaBright", dim: false },
  decor: {
    title: "⚡ ｃｕｒｓｏｒ－ｔｏｐ ⚡",
    kindGlyphs: {
      ide: "🖥",
      cli: "⌨",
      cloud: "🛰",
      agent: "🤖",
      subagent: "🔌",
    },
    statusGlyphs: {
      running: "▶",
      waiting: "⏸",
      idle: "◌",
      done: "✓",
      error: "✖",
      unknown: "?",
    },
    columnHeaders: {
      type: "◈",
      agent: "▸ AGENT",
      model: "◎ MODEL",
      tokens: "⚡",
    },
  },
};

/** Green-phosphor CRT — block-drawing title and tape-reel glyphs. */
const RETRO_THEME: Theme = {
  name: "retro",
  status: {
    running: "greenBright",
    waiting: "yellow",
    idle: "green",
    done: "gray",
    error: "redBright",
    unknown: "green",
  },
  header: "greenBright",
  accent: "yellowBright",
  dim: true,
  selection: { inverse: true, bold: true },
  badge: { color: "green", bold: true },
  diagnostics: { color: "yellow", dim: true },
  decor: {
    title: "▐▄ cursor-top ▀▌",
    kindGlyphs: {
      ide: "▣",
      cli: "▸",
      cloud: "◉",
      agent: "◆",
      subagent: "◇",
    },
    statusGlyphs: {
      running: "●",
      waiting: "◐",
      idle: "○",
      done: "·",
      error: "✗",
      unknown: "?",
    },
    columnHeaders: {
      type: "▌T",
      agent: "▶ AGENT",
      start: "⏱ START",
    },
  },
};

/** Arcane purple/gold — runes and wizard hats. */
const WIZARD_THEME: Theme = {
  name: "wizard",
  status: {
    running: "yellowBright",
    waiting: "magentaBright",
    idle: "blueBright",
    done: "gray",
    error: "redBright",
    unknown: "white",
  },
  header: "yellowBright",
  accent: "magentaBright",
  dim: true,
  selection: { inverse: true, bold: true },
  badge: { color: "magentaBright", bold: true },
  diagnostics: { color: "yellowBright", dim: true },
  decor: {
    title: "🧙 ᴄᴜʀꜱᴏʀ‑ᴛᴏᴘ 🔮",
    kindGlyphs: {
      ide: "🧙",
      cli: "📜",
      cloud: "🌌",
      agent: "⚗️",
      subagent: "🪄",
    },
    statusGlyphs: {
      running: "✨",
      waiting: "🕯",
      idle: "💫",
      done: "📖",
      error: "💀",
      unknown: "❓",
    },
    columnHeaders: {
      type: "ᚦ",
      agent: "⚡ AGENT",
      model: "🔮",
      tokens: "✦",
    },
  },
};

/** App title for the TUI header line. */
export function themeAppTitle(theme: Theme): string {
  return theme.decor?.title ?? "cursor-top";
}

export const THEMES: Record<ThemeName, Theme> = {
  default: DEFAULT_THEME,
  mono: MONO_THEME,
  "high-contrast": HIGH_CONTRAST_THEME,
  ocean: OCEAN_THEME,
  forest: FOREST_THEME,
  sunset: SUNSET_THEME,
  solarized: SOLARIZED_THEME,
  dracula: DRACULA_THEME,
  party: PARTY_THEME,
  kawaii: KAWAII_THEME,
  cyber: CYBER_THEME,
  retro: RETRO_THEME,
  wizard: WIZARD_THEME,
};

/** `NO_COLOR` is honoured when present and non-empty (per no-color.org). */
export function isNoColor(env: NodeJS.ProcessEnv): boolean {
  return env.NO_COLOR !== undefined && env.NO_COLOR !== "";
}

/**
 * Validate a theme name, warning on stderr and falling back to `default`
 * when unknown. Used by `parseArgs` so flag validation matches the existing
 * "warn + keep going" arg-handling style.
 */
export function normalizeThemeName(name: string): ThemeName {
  if ((THEME_NAMES as readonly string[]).includes(name)) return name as ThemeName;
  process.stderr.write(
    `cursor-top: unknown theme "${name}" (expected ${THEME_NAMES.join(" | ")}); using default\n`,
  );
  return "default";
}

/**
 * Resolve a theme by name. Unknown names warn on stderr and fall back to
 * `default`; a non-empty `NO_COLOR` in the environment forces `mono`
 * regardless of the requested name.
 */
export function resolveTheme(
  name: string = "default",
  env: NodeJS.ProcessEnv = process.env,
): Theme {
  const valid = normalizeThemeName(name);
  if (isNoColor(env)) return THEMES.mono;
  return THEMES[valid];
}

/** Next theme in the cycle order used by the interactive `t` key. */
export function nextThemeName(current: string): ThemeName {
  const idx = (THEME_NAMES as readonly string[]).indexOf(current);
  return THEME_NAMES[(idx + 1) % THEME_NAMES.length]!;
}

/* ------------------------------------------------------------------ */
/* Layout density                                                      */
/* ------------------------------------------------------------------ */

/**
 * Cycle order for the interactive `y` key — each step reveals one more body
 * line block: row only → row + title → row + title + log tail.
 */
export const DENSITIES = ["compact", "cozy", "comfortable"] as const;
export type Density = (typeof DENSITIES)[number];

/** `comfortable` is today's full layout: row + title + log tail. */
export const DEFAULT_DENSITY: Density = "comfortable";

/**
 * Validate a density level, warning on stderr and falling back to the
 * default when unknown.
 */
export function resolveDensity(name?: string): Density {
  if (!name) return DEFAULT_DENSITY;
  if ((DENSITIES as readonly string[]).includes(name)) return name as Density;
  process.stderr.write(
    `cursor-top: unknown density "${name}" (expected ${DENSITIES.join(" | ")}); using ${DEFAULT_DENSITY}\n`,
  );
  return DEFAULT_DENSITY;
}

/** Title body line renders at `cozy` and `comfortable`. */
export function densityShowsTitle(density: Density): boolean {
  return density !== "compact";
}

/** Log-tail body lines render only at `comfortable` (count stays `--lines`-driven). */
export function densityShowsLogs(density: Density): boolean {
  return density === "comfortable";
}

/** Next density in the cycle order used by the interactive `y` key. */
export function nextDensity(current: Density): Density {
  const idx = DENSITIES.indexOf(current);
  return DENSITIES[(idx + 1) % DENSITIES.length]!;
}
