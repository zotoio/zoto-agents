/**
 * Terminal-line viewport windowing for the interactive tree.
 *
 * Pure functions only — no React — so chrome accounting, row heights,
 * selection-follow scrolling, and overflow indicators stay unit-testable.
 */

import type { AgentNode, AgentSnapshot } from "../types.js";
import { computeDetailPaneHeight } from "./detail-tail.js";
import {
  densityShowsLogs,
  densityShowsTitle,
  type Density,
} from "./theme.js";

/** Default terminal height when `stdout.rows` is missing (non-TTY / tests). */
export const DEFAULT_TERMINAL_ROWS = 24;

export interface FlatRow {
  id: string;
  depth: number;
}

export interface ChromeOptions {
  eventStripLines?: number;
  diagnosticsLines?: number;
  detailOpen?: boolean;
  detailLines?: number;
  filterEditing?: boolean;
}

/** Terminal lines consumed by fixed chrome above and below the tree body. */
export function computeChromeLines(opts: ChromeOptions = {}): number {
  const events = opts.eventStripLines ?? 0;
  const diags = opts.diagnosticsLines ?? 0;
  const detailOpen = opts.detailOpen ?? false;
  const detailLines = opts.detailLines ?? 25;

  let lines = 0;
  lines += 1; // header
  lines += 1; // column header
  if (events > 0) lines += 1 + events; // marginTop + strip
  if (diags > 0) lines += 1 + diags; // marginTop + diagnostics
  if (detailOpen) lines += 1 + computeDetailPaneHeight(detailLines);
  lines += 2; // marginTop + footer or filter bar
  return lines;
}

/** Terminal lines one agent row occupies at the given density. */
export function computeNodeRowHeight(node: AgentNode, density: Density): number {
  let h = 1;
  if (densityShowsTitle(density) && Boolean(node.title)) h += 1;
  if (densityShowsLogs(density)) h += node.recentLogs.length;
  return h;
}

/** Sum of {@link computeNodeRowHeight} for each flat row (missing nodes → 1 line). */
export function computeRowHeights(
  flat: FlatRow[],
  snapshot: AgentSnapshot,
  density: Density,
): number[] {
  return flat.map(({ id }) => {
    const node = snapshot.nodes[id];
    return node ? computeNodeRowHeight(node, density) : 1;
  });
}

/** Total terminal lines if every visible row rendered (no windowing). */
export function totalVisibleLines(heights: number[]): number {
  return heights.reduce((sum, h) => sum + h, 0);
}

/** Lines hidden above `rowOffset`. */
export function rowOffsetToLineOffset(heights: number[], rowOffset: number): number {
  let sum = 0;
  for (let i = 0; i < rowOffset && i < heights.length; i++) sum += heights[i]!;
  return sum;
}

export interface TreeWindow {
  startIdx: number;
  endIdx: number;
  hiddenRowsAbove: number;
  hiddenRowsBelow: number;
  hiddenLinesAbove: number;
  hiddenLinesBelow: number;
  contentLines: number;
  indicatorAbove: boolean;
  indicatorBelow: boolean;
}

/**
 * Available terminal lines for tree body content after chrome and optional
 * overflow indicators (reserve up to two lines when `reserveIndicators`).
 */
export function computeViewportBodyRows(
  terminalRows: number,
  chromeLines: number,
  reserveIndicators = true,
): number {
  const indicatorReserve = reserveIndicators ? 2 : 0;
  return Math.max(1, terminalRows - chromeLines - indicatorReserve);
}

/**
 * Adjust the first visible row index so `selectedIdx` stays inside the
 * viewport measured in terminal lines (row-aligned — no partial rows).
 */
export function followSelectionRowOffset(
  heights: number[],
  selectedIdx: number,
  scrollRowOffset: number,
  maxContentLines: number,
): number {
  if (heights.length === 0 || selectedIdx < 0) return 0;
  const idx = Math.min(selectedIdx, heights.length - 1);
  const rowH = heights[idx]!;
  const lineStart = rowOffsetToLineOffset(heights, scrollRowOffset);
  const selectedStart = rowOffsetToLineOffset(heights, idx);
  const selectedEnd = selectedStart + rowH;

  if (selectedStart < lineStart) {
    return idx;
  }

  let visibleEnd = lineStart;
  for (let i = scrollRowOffset; i < heights.length; i++) {
    if (visibleEnd - lineStart + heights[i]! > maxContentLines) break;
    visibleEnd += heights[i]!;
  }
  const viewportEnd = lineStart + maxContentLines;

  if (selectedEnd > viewportEnd) {
    if (rowH >= maxContentLines) return idx;
    let offset = idx;
    let used = rowH;
    while (offset > 0 && used <= maxContentLines) {
      const prev = heights[offset - 1]!;
      if (used + prev > maxContentLines) break;
      used += prev;
      offset -= 1;
    }
    return offset;
  }

  return scrollRowOffset;
}

/**
 * Pick a consecutive slice of rows whose combined height fits in
 * `maxContentLines`, with optional one-line overflow indicators.
 */
export function computeTreeWindow(
  heights: number[],
  selectedIdx: number,
  scrollRowOffset: number,
  maxContentLines: number,
): TreeWindow {
  if (heights.length === 0 || maxContentLines < 1) {
    return {
      startIdx: 0,
      endIdx: 0,
      hiddenRowsAbove: 0,
      hiddenRowsBelow: 0,
      hiddenLinesAbove: 0,
      hiddenLinesBelow: 0,
      contentLines: 0,
      indicatorAbove: false,
      indicatorBelow: false,
    };
  }

  const clampedScroll = clampRowOffset(scrollRowOffset, heights.length);
  const followed = followSelectionRowOffset(
    heights,
    selectedIdx,
    clampedScroll,
    maxContentLines,
  );

  let indicatorAbove = followed > 0;
  let indicatorBelow = false;
  let budget = maxContentLines;
  if (indicatorAbove) budget -= 1;

  let endIdx = followed;
  let used = 0;
  while (endIdx < heights.length && used + heights[endIdx]! <= budget) {
    used += heights[endIdx]!;
    endIdx += 1;
  }

  if (endIdx === followed && followed < heights.length) {
    used = heights[followed]!;
    endIdx = followed + 1;
  }

  indicatorBelow = endIdx < heights.length;
  if (indicatorBelow && indicatorAbove) {
    // Both indicators shown — re-pack with one line each reserved.
    return computeTreeWindowFixedIndicators(heights, selectedIdx, maxContentLines);
  }

  const total = totalVisibleLines(heights);
  const hiddenLinesAbove = rowOffsetToLineOffset(heights, followed);
  const hiddenLinesBelow = total - hiddenLinesAbove - used;

  return {
    startIdx: followed,
    endIdx,
    hiddenRowsAbove: followed,
    hiddenRowsBelow: heights.length - endIdx,
    hiddenLinesAbove,
    hiddenLinesBelow,
    contentLines: used,
    indicatorAbove,
    indicatorBelow,
  };
}

/** Recompute when both overflow indicators are visible (reserve one line each). */
function computeTreeWindowFixedIndicators(
  heights: number[],
  selectedIdx: number,
  maxContentLines: number,
): TreeWindow {
  const innerBudget = Math.max(1, maxContentLines - 2);
  let scroll = 0;
  if (selectedIdx >= 0) {
    scroll = followSelectionRowOffset(heights, selectedIdx, 0, innerBudget);
  }

  let endIdx = scroll;
  let used = 0;
  while (endIdx < heights.length && used + heights[endIdx]! <= innerBudget) {
    used += heights[endIdx]!;
    endIdx += 1;
  }
  if (endIdx === scroll && scroll < heights.length) {
    used = heights[scroll]!;
    endIdx = scroll + 1;
  }

  const total = totalVisibleLines(heights);
  const hiddenLinesAbove = rowOffsetToLineOffset(heights, scroll);
  const hiddenLinesBelow = total - hiddenLinesAbove - used;

  return {
    startIdx: scroll,
    endIdx,
    hiddenRowsAbove: scroll,
    hiddenRowsBelow: heights.length - endIdx,
    hiddenLinesAbove,
    hiddenLinesBelow,
    contentLines: used,
    indicatorAbove: scroll > 0,
    indicatorBelow: endIdx < heights.length,
  };
}

export function clampRowOffset(offset: number, rowCount: number): number {
  if (rowCount <= 0) return 0;
  return Math.max(0, Math.min(offset, rowCount - 1));
}

export interface ResolveTreeWindowInput {
  flat: FlatRow[];
  snapshot: AgentSnapshot;
  density: Density;
  selectedIdx: number;
  scrollRowOffset: number;
  terminalRows?: number;
  chrome: ChromeOptions;
}

/** End-to-end helper used by {@link App} and benches. */
export function resolveTreeWindow(input: ResolveTreeWindowInput): TreeWindow {
  const heights = computeRowHeights(input.flat, input.snapshot, input.density);
  const terminalRows = input.terminalRows ?? DEFAULT_TERMINAL_ROWS;
  const chromeLines = computeChromeLines(input.chrome);
  const bodyRows = computeViewportBodyRows(terminalRows, chromeLines, true);
  return computeTreeWindow(
    heights,
    input.selectedIdx,
    input.scrollRowOffset,
    bodyRows,
  );
}

/** Format overflow indicator text (hidden row count above/below). */
export function formatOverflowIndicator(direction: "above" | "below", count: number): string {
  const arrow = direction === "above" ? "↑" : "↓";
  return `${arrow} ${count} more`;
}
