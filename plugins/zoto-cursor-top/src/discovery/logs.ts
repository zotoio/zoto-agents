/**
 * Lightweight log tailer.
 *
 * We never load a full log file into memory: we read the trailing window only
 * (default ~16 KB) and return the last N non-empty lines. This keeps the
 * refresh loop snappy even when the user has multi-MB log files.
 */

import { open } from "node:fs/promises";

const DEFAULT_WINDOW_BYTES = 16 * 1024;

/**
 * Tail the last `n` lines of a file. Returns an empty array on any error so
 * the TUI can render a placeholder instead of crashing.
 */
export async function tailFile(
  path: string,
  n: number,
  windowBytes: number = DEFAULT_WINDOW_BYTES,
): Promise<string[]> {
  let handle;
  try {
    handle = await open(path, "r");
  } catch {
    return [];
  }
  try {
    const stat = await handle.stat();
    const size = stat.size;
    if (size === 0) return [];
    const readLen = Math.min(size, windowBytes);
    const buffer = Buffer.alloc(readLen);
    await handle.read(buffer, 0, readLen, size - readLen);
    const text = buffer.toString("utf8");
    return splitLines(text, n);
  } catch {
    return [];
  } finally {
    await handle.close().catch(() => undefined);
  }
}

/**
 * Take a chunk of text and return the last `n` non-empty trimmed lines.
 *
 * Exposed for unit tests.
 */
export function splitLines(text: string, n: number): string[] {
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = stripAnsi(raw).trim();
    if (trimmed.length > 0) lines.push(trimmed);
  }
  if (lines.length === 0) return [];
  return lines.slice(-n);
}

const ANSI_PATTERN = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

function stripAnsi(input: string): string {
  return input.replace(ANSI_PATTERN, "");
}
