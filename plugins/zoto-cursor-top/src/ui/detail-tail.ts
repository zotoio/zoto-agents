/**
 * On-demand deep log tail for the detail pane (subtask 06).
 *
 * Kept out of the per-tick collector pipeline: the main tree still uses the
 * collector's 3-line tails. This module loads `--detail-lines` depth for one
 * selected node only, with mtime/size-gated caching and cancellable async
 * fetches.
 */

import {
  tailFile,
  tailJsonlMessages,
  TRANSCRIPT_WINDOW_BYTES,
} from "../discovery/logs.js";
import type { AgentNode, FsLike } from "../types.js";

/** Bytes per requested line when sizing the trailing read window. */
export const DETAIL_BYTES_PER_LINE = 8 * 1024;

/** Hard cap on the detail-pane read window (~1 MB). */
export const DETAIL_WINDOW_BYTES_CAP = 1024 * 1024;

export interface DetailTailCacheEntry {
  mtimeMs: number;
  size: number;
  lines: string[];
}

/** Metadata + separator lines in the bottom detail split (for subtask 07). */
export const DETAIL_PANE_METADATA_LINES = 10;

/**
 * Rendered row count of the bottom detail split: fixed metadata block plus
 * the configured deep-tail depth and a separator line.
 */
export function computeDetailPaneHeight(detailLines: number): number {
  return DETAIL_PANE_METADATA_LINES + Math.max(1, detailLines) + 1;
}

/**
 * Size the trailing read window for deep tails.
 *
 * Heuristic: `max(TRANSCRIPT_WINDOW_BYTES, lines × 8 KB)` capped at ~1 MB.
 * The collector's 16/64 KB defaults are sized for 3 lines; 25–50 snippets
 * need a larger window. `extractMessageSnippets` still drops the first
 * (possibly truncated) line of the window.
 */
export function computeDetailWindowBytes(lineCount: number): number {
  const requested = Math.max(1, lineCount);
  const raw = Math.max(TRANSCRIPT_WINDOW_BYTES, requested * DETAIL_BYTES_PER_LINE);
  return Math.min(raw, DETAIL_WINDOW_BYTES_CAP);
}

function isJsonlPath(path: string): boolean {
  return path.endsWith(".jsonl");
}

export type DetailTailSource = "file" | "fallback" | "empty";

export interface DetailTailResult {
  lines: string[];
  source: DetailTailSource;
  placeholder: string;
}

const LOADING_PLACEHOLDER = "(loading log tail…)";
const EMPTY_PLACEHOLDER = "(no log output)";
const MISSING_FILE_PLACEHOLDER = "(log file unreadable or empty)";

/**
 * Load the deep tail for one node. When `logSource` is null, returns
 * `recentLogs` immediately (demo nodes and process-only rows).
 */
export async function loadDetailTail(
  node: AgentNode,
  lineCount: number,
  cache: Map<string, DetailTailCacheEntry>,
  fs?: FsLike,
): Promise<DetailTailResult> {
  const n = Math.max(1, lineCount);

  if (!node.logSource) {
    const lines = node.recentLogs.slice(-n);
    if (lines.length === 0) {
      return { lines: [], source: "empty", placeholder: EMPTY_PLACEHOLDER };
    }
    return { lines, source: "fallback", placeholder: "" };
  }

  const path = node.logSource;
  const windowBytes = computeDetailWindowBytes(n);

  try {
    if (fs) {
      const st = await fs.stat(path);
      if (!st.isFile()) {
        return {
          lines: [],
          source: "empty",
          placeholder: MISSING_FILE_PLACEHOLDER,
        };
      }
      const prev = cache.get(path);
      if (prev && prev.mtimeMs === st.mtimeMs && prev.size === st.size) {
        return {
          lines: prev.lines.slice(-n),
          source: "file",
          placeholder: prev.lines.length === 0 ? MISSING_FILE_PLACEHOLDER : "",
        };
      }
      const lines = isJsonlPath(path)
        ? await tailJsonlMessages(path, n, windowBytes, fs)
        : await tailFile(path, n, windowBytes, fs);
      cache.set(path, { mtimeMs: st.mtimeMs, size: st.size, lines });
      if (lines.length === 0) {
        return {
          lines: [],
          source: "empty",
          placeholder: MISSING_FILE_PLACEHOLDER,
        };
      }
      return { lines, source: "file", placeholder: "" };
    }

    const { stat } = await import("node:fs/promises");
    let st;
    try {
      st = await stat(path);
    } catch {
      return {
        lines: [],
        source: "empty",
        placeholder: MISSING_FILE_PLACEHOLDER,
      };
    }
    if (!st.isFile()) {
      return {
        lines: [],
        source: "empty",
        placeholder: MISSING_FILE_PLACEHOLDER,
      };
    }
    const prev = cache.get(path);
    if (prev && prev.mtimeMs === st.mtimeMs && prev.size === st.size) {
      return {
        lines: prev.lines.slice(-n),
        source: "file",
        placeholder: prev.lines.length === 0 ? MISSING_FILE_PLACEHOLDER : "",
      };
    }
    const lines = isJsonlPath(path)
      ? await tailJsonlMessages(path, n, windowBytes)
      : await tailFile(path, n, windowBytes);
    cache.set(path, { mtimeMs: st.mtimeMs, size: st.size, lines });
    if (lines.length === 0) {
      return {
        lines: [],
        source: "empty",
        placeholder: MISSING_FILE_PLACEHOLDER,
      };
    }
    return { lines, source: "file", placeholder: "" };
  } catch {
    return {
      lines: [],
      source: "empty",
      placeholder: MISSING_FILE_PLACEHOLDER,
    };
  }
}

export { LOADING_PLACEHOLDER };
