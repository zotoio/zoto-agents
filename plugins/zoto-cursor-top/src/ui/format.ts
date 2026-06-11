/**
 * Formatting helpers shared by the TUI rows. Pure functions only so they can
 * be unit-tested without spinning up Ink.
 */

import type { AgentKind, AgentNode, AgentStatus } from "../types.js";
import { formatRepoDisplay } from "../discovery/repo-url.js";
import {
  displayModelSlug,
  displayTokenUsage,
} from "./display-metrics.js";
import { DEFAULT_THEME, type Theme } from "./theme.js";

/** Fallback width when `stdout.columns` is unavailable (`--once`, tests). */
export const DEFAULT_TERMINAL_COLUMNS = 120;

/**
 * Approximate terminal display width. Emoji and fullwidth chars count as two
 * cells so padded columns stay aligned in decorated themes.
 */
export function singleCharDisplayWidth(char: string): number {
  const cp = char.codePointAt(0)!;
  if (cp >= 0xFE00 && cp <= 0xFE0F) return 0;
  if (cp >= 0x1F300 && cp <= 0x1FAFF) return 2;
  if (cp >= 0x2600 && cp <= 0x27BF) return 2;
  if (cp >= 0xFF01 && cp <= 0xFF60) return 2;
  return 1;
}

export function displayWidth(text: string): number {
  let w = 0;
  for (const char of text) {
    w += singleCharDisplayWidth(char);
  }
  return w;
}

/** Pad to a display width (not JS string length). */
export function padDisplay(
  value: string,
  width: number,
  align: "left" | "right" = "left",
): string {
  const dw = displayWidth(value);
  const pad = Math.max(0, width - dw);
  return align === "right" ? " ".repeat(pad) + value : value + " ".repeat(pad);
}

/** Minimum column widths — {@link computeRowColumnLayout} never goes below these. */
export const COL_MIN = {
  kind: 7,
  pid: 6,
  agent: 12,
  model: 10,
  repo: 20,
  start: 18,
  status: 7,
  tokens: 6,
} as const;

/** Upper bounds for non-flex columns when the terminal is very wide. */
const COL_MAX = {
  model: 24,
  repo: 48,
} as const;

export interface RowColumnLayoutOptions {
  /** Size every column to its content — used for non-TTY / `--once` snapshots. */
  fitContent?: boolean;
}

export type RowColumnLayoutInput = {
  node: AgentNode;
  depth: number;
  startColumn: string;
  /** When set, MODEL column width uses display rollups. */
  nodes?: Record<string, AgentNode>;
};

/** Share of flex space (after mins) allocated to REPO; remainder goes to AGENT. */
const REPO_FLEX_SHARE = 0.4;

/** Base single-space gap between every column. */
const BASE_COLUMN_GAP = 1;

/** Extra trailing space after MODEL, REPO, START, and STATUS before the next column. */
const COLUMN_EXTRA_PAD = 1;

/** Total inter-column gap width for layout budgeting (7 base + 4 extra pads). */
const COLUMN_GAPS = 7 * BASE_COLUMN_GAP + 4 * COLUMN_EXTRA_PAD;

const ROW_COLUMN_FIELDS = [
  "kind",
  "pid",
  "agent",
  "model",
  "repo",
  "start",
  "status",
  "tokens",
] as const;

function columnGapAfter(field: (typeof ROW_COLUMN_FIELDS)[number]): number {
  if (field === "model" || field === "repo" || field === "start" || field === "status") {
    return BASE_COLUMN_GAP + COLUMN_EXTRA_PAD;
  }
  return BASE_COLUMN_GAP;
}

function joinRowColumns(cells: readonly string[]): string {
  let out = cells[0] ?? "";
  for (let i = 1; i < cells.length; i++) {
    out += " ".repeat(columnGapAfter(ROW_COLUMN_FIELDS[i - 1]!)) + cells[i];
  }
  return out;
}

/** Resolved column widths for one table render pass. */
export interface RowColumnLayout {
  kind: number;
  pid: number;
  agent: number;
  model: number;
  repo: number;
  start: number;
  status: number;
  tokens: number;
}

/** @deprecated Use {@link COL_MIN} / {@link computeRowColumnLayout}. */
export const ROW_COL = {
  kind: COL_MIN.kind,
  pid: COL_MIN.pid,
  agent: 32,
  model: 18,
  repo: 24,
  tokens: COL_MIN.tokens,
} as const;

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const secStr = sec.toString().padStart(2, "0");
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}m${secStr}s`;
  if (m > 0) return `${m}m${secStr}s`;
  return `${sec}s`;
}

/** Fixed START column width — stops elapsed ticks from reflowing log prefixes. */
export const START_COLUMN_DISPLAY_WIDTH = 21;

export function formatStart(startedAt: number, now = Date.now()): string {
  const d = new Date(startedAt);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss} (${formatDuration(now - startedAt)})`;
}

/** Calendar stamp for finished agents (`YYYY-MM-DD HH:MM`). */
export function formatDoneInstant(at: number): string {
  const d = new Date(at);
  const y = d.getFullYear();
  const mo = (d.getMonth() + 1).toString().padStart(2, "0");
  const da = d.getDate().toString().padStart(2, "0");
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${y}-${mo}-${da} ${hh}:${mm}`;
}

/** Elapsed end instant for START column — only `running` uses the live clock. */
export function elapsedEndForNode(
  node: Pick<AgentNode, "startedAt" | "status" | "elapsedEndAt">,
  now: number,
): number {
  if (node.status === "running") return now;
  if (node.elapsedEndAt != null) return node.elapsedEndAt;
  return now;
}

export function formatStartForNode(
  node: Pick<AgentNode, "startedAt" | "status" | "elapsedEndAt">,
  now = Date.now(),
): string {
  if (node.status === "done") {
    const finishedAt = node.elapsedEndAt ?? node.startedAt;
    return padDisplay(formatDoneInstant(finishedAt), START_COLUMN_DISPLAY_WIDTH);
  }
  return padDisplay(
    formatStart(node.startedAt, elapsedEndForNode(node, now)),
    START_COLUMN_DISPLAY_WIDTH,
  );
}

/**
 * Status → colour token lookup. Colours live in the theme (the old
 * hard-coded switch moved to `DEFAULT_THEME.status` in `theme.ts`); the
 * single-argument overload keeps existing call sites and tests working
 * against the default palette.
 */
export function statusColor(status: AgentStatus): string;
export function statusColor(status: AgentStatus, theme: Theme): string | undefined;
export function statusColor(
  status: AgentStatus,
  theme: Theme = DEFAULT_THEME,
): string | undefined {
  return theme.status[status] ?? theme.status.unknown;
}

/**
 * Total rendered width of `[BADGE]` once trailing pad is applied. AGENT
 * is the widest badge (`[AGENT]` = 7 chars); narrower badges get
 * trailing spaces tacked on *after* the closing bracket so subsequent
 * columns stay aligned across rows.
 */
export const KIND_BADGE_DISPLAY_WIDTH = 7;

export function kindBadge(kind: AgentKind): string {
  switch (kind) {
    case "ide":
      return "IDE";
    case "cli":
      return "CLI";
    case "cloud":
      return "CLD";
    case "agent":
      return "AGENT";
    case "subagent":
      return "SUB";
    default:
      return "???";
  }
}

/** `[BADGE]` padded to {@link KIND_BADGE_DISPLAY_WIDTH} characters. */
export function paddedKindBadge(kind: AgentKind, theme?: Theme): string {
  const glyph = theme?.decor?.kindGlyphs?.[kind];
  if (glyph) return padDisplay(glyph, KIND_BADGE_DISPLAY_WIDTH);
  return `[${kindBadge(kind)}]`.padEnd(KIND_BADGE_DISPLAY_WIDTH);
}

/** STATUS column text, optionally prefixed with a theme emoji glyph. */
export function formatStatusColumn(
  status: AgentStatus,
  width: number,
  theme?: Theme,
): string {
  const glyph = theme?.decor?.statusGlyphs?.[status];
  const text = glyph ? `${glyph} ${status}` : status;
  return padDisplay(text, width);
}

function minKindColumnWidth(theme?: Theme): number {
  if (!theme?.decor?.kindGlyphs) return COL_MIN.kind;
  let max = COL_MIN.kind;
  for (const glyph of Object.values(theme.decor.kindGlyphs)) {
    if (glyph) max = Math.max(max, displayWidth(glyph));
  }
  const header = theme.decor.columnHeaders?.type;
  if (header) max = Math.max(max, displayWidth(header));
  return max;
}

function minStatusColumnWidth(
  rows: ReadonlyArray<{ node: AgentNode }>,
  theme?: Theme,
): number {
  let max = COL_MIN.status;
  max = Math.max(max, "STATUS".length);
  for (const row of rows) {
    max = Math.max(max, row.node.status.length);
    const glyph = theme?.decor?.statusGlyphs?.[row.node.status];
    if (glyph) max = Math.max(max, displayWidth(`${glyph} ${row.node.status}`));
  }
  const header = theme?.decor?.columnHeaders?.status;
  if (header) max = Math.max(max, displayWidth(header));
  return max;
}

export function truncate(value: string, max: number): string {
  if (max <= 0) return "";
  if (value.length <= max) return value;
  return value.slice(0, Math.max(1, max - 1)) + "…";
}

function padColumn(value: string, width: number, align: "left" | "right" = "left"): string {
  const clipped = value.length > width ? truncate(value, width) : value;
  return align === "right" ? clipped.padStart(width) : clipped.padEnd(width);
}

/** Character offset where the AGENT column begins (after TYPE, gap, PID, gap). */
export function rowPrefixWidth(layout: RowColumnLayout): number {
  return layout.kind + 1 + layout.pid + 1;
}

/** Start column index for each field — useful for alignment tests. */
export function rowColumnStarts(layout: RowColumnLayout): number[] {
  const widths = [
    layout.kind,
    layout.pid,
    layout.agent,
    layout.model,
    layout.repo,
    layout.start,
    layout.status,
    layout.tokens,
  ];
  const starts: number[] = [];
  let at = 0;
  for (let i = 0; i < widths.length; i++) {
    starts.push(at);
    if (i < widths.length - 1) {
      at += widths[i]! + columnGapAfter(ROW_COLUMN_FIELDS[i]!);
    }
  }
  return starts;
}

function modelContentWidth(
  rows: ReadonlyArray<RowColumnLayoutInput>,
): number {
  return Math.max(
    COL_MIN.model,
    "MODEL".length,
    ...rows.map((r) => {
      const slug = r.nodes
        ? displayModelSlug(r.node, r.nodes)
        : r.node.model;
      return (slug ?? "-").length;
    }),
  );
}

function repoContentWidth(rows: ReadonlyArray<RowColumnLayoutInput>): number {
  return Math.max(
    COL_MIN.repo,
    "REPO".length,
    ...rows.map((r) => formatRepoDisplay(r.node.repo).length),
  );
}

function agentContentWidth(rows: ReadonlyArray<RowColumnLayoutInput>): number {
  let agent = COL_MIN.agent;
  for (const row of rows) {
    const labelIndent = "  ".repeat(row.depth);
    const hasChildren = (row.node.children?.length ?? 0) > 0;
    const chevronSlot = 2; // chevron + space before label
    const needed = labelIndent.length + chevronSlot + row.node.label.length;
    agent = Math.max(agent, needed);
  }
  return agent;
}

function startColumnWidth(rows: ReadonlyArray<RowColumnLayoutInput>, theme?: Theme): number {
  return Math.max(
    COL_MIN.start,
    START_COLUMN_DISPLAY_WIDTH,
    "START (elapsed)".length,
    ...rows.map((r) => r.startColumn.length),
    theme?.decor?.columnHeaders?.start
      ? displayWidth(theme.decor.columnHeaders.start)
      : 0,
  );
}

/** Total rendered width of a table row line for the given layout. */
export function rowLineDisplayWidth(layout: RowColumnLayout): number {
  const starts = rowColumnStarts(layout);
  return starts[7]! + layout.tokens;
}

/**
 * Minimum terminal width that shows every column without truncating cell
 * values — for non-TTY snapshots and piped `--once` output.
 */
export function computeFitContentTerminalWidth(
  rows: ReadonlyArray<RowColumnLayoutInput>,
  theme?: Theme,
): number {
  const layout = computeRowColumnLayout(0, rows, theme, { fitContent: true });
  let width = rowLineDisplayWidth(layout);
  const header = headerRow(layout, theme);
  width = Math.max(width, header.length);
  return Math.max(72, width);
}

/**
 * Derive fixed + flexible column widths for the current terminal. Extra
 * horizontal space goes to the AGENT column; REPO keeps a modest minimum.
 */
export function computeRowColumnLayout(
  terminalWidth: number,
  rows: ReadonlyArray<RowColumnLayoutInput> = [],
  theme?: Theme,
  options?: RowColumnLayoutOptions,
): RowColumnLayout {
  const kind = minKindColumnWidth(theme);
  const pid = COL_MIN.pid;
  const tokens = COL_MIN.tokens;
  const status = minStatusColumnWidth(rows, theme);
  const start = startColumnWidth(rows, theme);

  if (options?.fitContent) {
    return {
      kind,
      pid,
      agent: agentContentWidth(rows),
      model: modelContentWidth(rows),
      repo: repoContentWidth(rows),
      start,
      status,
      tokens,
    };
  }

  const width = Math.max(72, terminalWidth);

  const model = Math.min(COL_MAX.model, modelContentWidth(rows));
  const repoContent = repoContentWidth(rows);

  const fixed = kind + pid + model + start + status + tokens + COLUMN_GAPS;
  const flexBudget = width - fixed;

  const agentMin = COL_MIN.agent;
  const repoMin = COL_MIN.repo;

  let agent = agentMin;
  let repo = repoMin;

  if (flexBudget >= agentMin + repoMin) {
    const extra = flexBudget - agentMin - repoMin;
    const repoExtra = Math.min(
      Math.floor(extra * REPO_FLEX_SHARE),
      Math.max(0, COL_MAX.repo - repoMin),
      Math.max(0, repoContent - repoMin),
    );
    repo = repoMin + repoExtra;
    agent = flexBudget - repo;
  } else {
    repo = Math.max(4, Math.min(repoMin, Math.floor(flexBudget * 0.3)));
    agent = Math.max(8, flexBudget - repo);
  }

  return { kind, pid, agent, model, repo, start, status, tokens };
}

/** Format context token count as thousands with one decimal (`1.2k`, `0.3k`). */
export function formatTokenUsageK(
  tokens: number | null | undefined,
  width: number = COL_MIN.tokens,
): string {
  if (tokens == null || !Number.isFinite(tokens) || tokens < 0) {
    return "-".padStart(width);
  }
  return `${(tokens / 1000).toFixed(1)}k`.padStart(width);
}

/** Column header line shared by the Ink TUI and `--once` text renderer. */
export function headerRow(
  layout: RowColumnLayout = computeRowColumnLayout(DEFAULT_TERMINAL_COLUMNS),
  theme?: Theme,
): string {
  const h = theme?.decor?.columnHeaders;
  return joinRowColumns([
    padDisplay(h?.type ?? "TYPE", layout.kind),
    padDisplay(h?.pid ?? "PID", layout.pid, "right"),
    padDisplay(h?.agent ?? "AGENT", layout.agent),
    padDisplay(h?.model ?? "MODEL", layout.model),
    padDisplay(h?.repo ?? "REPO", layout.repo),
    padDisplay(h?.start ?? "START (elapsed)", layout.start),
    padDisplay(h?.status ?? "STATUS", layout.status),
    padDisplay(h?.tokens ?? "TOKENS", layout.tokens, "right"),
  ]);
}

/**
 * Fixed-width data columns for one agent row. Hierarchy indent lives inside
 * the AGENT field so TYPE / PID / MODEL / REPO stay aligned with the header.
 */
export function formatAgentRowLine(
  node: AgentNode,
  depth: number,
  now: number,
  opts: {
    expanded?: boolean;
    hasChildren?: boolean;
    /** Pre-computed START column (lets memoised rows skip `now` churn). */
    startColumn?: string;
    layout?: RowColumnLayout;
    /** Full snapshot for MODEL / TOKENS display rollups on parent rows. */
    nodes?: Record<string, AgentNode>;
    /** When set, emoji / unicode decor applies (TUI only). */
    theme?: Theme;
  } = {},
): string {
  const layout = opts.layout ?? computeRowColumnLayout(DEFAULT_TERMINAL_COLUMNS);
  const theme = opts.theme;
  const labelIndent = "  ".repeat(depth);
  const hasChildren = opts.hasChildren ?? (node.children?.length ?? 0) > 0;
  const expanded = opts.expanded ?? false;
  const chevron = hasChildren ? (expanded ? "▼" : "▶") : " ";
  const labelBudget = Math.max(4, layout.agent - labelIndent.length - 2);
  const label = `${labelIndent}${chevron} ${truncate(node.label, labelBudget)}`;
  const pid =
    node.pid != null ? String(node.pid) : "";
  const startCol = opts.startColumn ?? formatStartForNode(node, now);
  const modelSlug = opts.nodes
    ? displayModelSlug(node, opts.nodes)
    : node.model;
  const tokens = opts.nodes
    ? displayTokenUsage(node, opts.nodes)
    : node.tokenUsage;
  return joinRowColumns([
    paddedKindBadge(node.kind, theme),
    padColumn(pid, layout.pid, "right"),
    padColumn(label, layout.agent),
    padColumn(truncate(modelSlug ?? "-", layout.model), layout.model),
    padColumn(truncate(formatRepoDisplay(node.repo), layout.repo), layout.repo),
    padColumn(startCol, layout.start),
    formatStatusColumn(node.status, layout.status, theme),
    formatTokenUsageK(tokens, layout.tokens),
  ]);
}

/** Indent for title / log body lines under the AGENT column at a given depth. */
export function agentBodyIndent(
  depth: number,
  layout: RowColumnLayout = computeRowColumnLayout(DEFAULT_TERMINAL_COLUMNS),
): string {
  return `${" ".repeat(rowPrefixWidth(layout))}${"  ".repeat(depth)}  `;
}

/** Width of the `role:` prefix column in log tails (`assistant:` is widest). */
export const LOG_ROLE_COL_WIDTH = 11;

export interface LogSnippetParts {
  role: string;
  body: string;
}

/** Split a `"role: body"` tail line for column-aligned rendering. */
export function splitLogSnippet(line: string): LogSnippetParts {
  const idx = line.indexOf(": ");
  if (idx < 0) return { role: "", body: line };
  return {
    role: `${line.slice(0, idx)}:`,
    body: line.slice(idx + 2),
  };
}

/** Pad `user:` / `assistant:` so log bodies start on the same column. */
export function formatAlignedLogRole(role: string): string {
  if (!role) return " ".repeat(LOG_ROLE_COL_WIDTH);
  return role.padEnd(LOG_ROLE_COL_WIDTH);
}

/** `recentLogs` are stored oldest→newest; render newest first. */
export function logsNewestFirst(logs: readonly string[]): string[] {
  return orderLogsForDisplay(logs, "newest-first");
}

export type LogScrollOrder = "oldest-first" | "newest-first";

/** Default TUI / `--once` log tail order (opposite of the original newest-first layout). */
export const DEFAULT_LOG_SCROLL_ORDER: LogScrollOrder = "oldest-first";

/** Order log tail lines for display. Storage is always oldest→newest. */
export function orderLogsForDisplay(
  logs: readonly string[],
  order: LogScrollOrder = DEFAULT_LOG_SCROLL_ORDER,
): string[] {
  if (logs.length === 0) return [];
  return order === "newest-first" ? [...logs].reverse() : [...logs];
}

/** Visible width for a log body after the aligned `log: role:` prefix. */
export function logBodyMaxWidth(
  terminalColumns: number,
  depth: number,
  layout: RowColumnLayout = computeRowColumnLayout(DEFAULT_TERMINAL_COLUMNS),
): number {
  const prefixLen =
    displayWidth(agentBodyIndent(depth, layout)) +
    displayWidth("log: ") +
    LOG_ROLE_COL_WIDTH;
  return Math.max(1, terminalColumns - prefixLen);
}

export function formatLogBodyForRow(
  body: string,
  opts: {
    terminalColumns: number;
    depth: number;
    layout: RowColumnLayout;
    bodyMax?: number;
  },
): string {
  const width = opts.bodyMax ?? logBodyMaxWidth(opts.terminalColumns, opts.depth, opts.layout);
  return truncate(body, width);
}

/** Fixed-width plain-text log line (TUI + `--once`). */
export function formatLogTailLine(
  depth: number,
  line: string,
  bodyMax = 100,
  layout: RowColumnLayout = computeRowColumnLayout(DEFAULT_TERMINAL_COLUMNS),
): string {
  const { role, body } = splitLogSnippet(line);
  return `${agentBodyIndent(depth, layout)}log: ${formatAlignedLogRole(role)}${truncate(body, bodyMax)}`;
}

/** Dim prefix through the aligned role column; body follows on the same row. */
export function formatLogTailPrefix(
  depth: number,
  line: string,
  layout: RowColumnLayout = computeRowColumnLayout(DEFAULT_TERMINAL_COLUMNS),
): string {
  const { role } = splitLogSnippet(line);
  return `${agentBodyIndent(depth, layout)}log: ${formatAlignedLogRole(role)}`;
}
