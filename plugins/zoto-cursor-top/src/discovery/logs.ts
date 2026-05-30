/**
 * Lightweight log tailer.
 *
 * We never load a full log file into memory: we read the trailing window only
 * (default ~16 KB) and return the last N non-empty lines. This keeps the
 * refresh loop snappy even when the user has multi-MB log files.
 *
 * Two tail strategies live here:
 *   * {@link tailFile} — plain text tail; one line per log entry.
 *   * {@link tailJsonlMessages} — JSONL-aware tail for the agent-transcript
 *     streams under `~/.cursor/projects/<ws>/agent-transcripts/`. Each line
 *     is a `{role, message: {content: [{type, text}]}}` event; we extract
 *     the most recent text snippets and prefix each with the role so the
 *     renderer can show the actual conversation tail instead of raw JSON.
 */

import { open } from "node:fs/promises";

const DEFAULT_WINDOW_BYTES = 16 * 1024;
// Transcripts can be megabytes long with very long lines (full file
// contents pasted into the conversation). 64 KB picks up several rounds
// of dialogue without making the refresh loop heavy.
const TRANSCRIPT_WINDOW_BYTES = 64 * 1024;

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

/**
 * Tail the last `n` human-readable message snippets from a Cursor agent
 * transcript (`<uuid>.jsonl`). Each surviving line is parsed as JSON; we
 * extract the first text-typed content block per message, strip newlines,
 * and prefix it with the role so the renderer can show e.g.
 * `assistant: Implementing the foo helper now…`.
 *
 * Returns an empty array if the file is missing, unreadable, or contains
 * no recognisable message events in the trailing window.
 */
export async function tailJsonlMessages(
  path: string,
  n: number,
  windowBytes: number = TRANSCRIPT_WINDOW_BYTES,
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
    return extractMessageSnippets(text, n);
  } catch {
    return [];
  } finally {
    await handle.close().catch(() => undefined);
  }
}

/**
 * Parse a chunk of JSONL transcript text and return the last `n`
 * "<role>: <text>" snippets. The first line in the buffer is dropped on
 * principle — when we read a trailing window mid-file it is almost
 * always a truncated record that would otherwise fail to parse and
 * emit a confusing diagnostic.
 *
 * Exposed for unit tests.
 */
export function extractMessageSnippets(text: string, n: number): string[] {
  const rawLines = text.split("\n");
  if (rawLines.length === 0) return [];
  // Drop the (possibly truncated) leading line when we know we read
  // a trailing window — i.e. there is at least one full line after it.
  const lines = rawLines.length > 1 ? rawLines.slice(1) : rawLines;
  const snippets: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const snippet = snippetFromMessage(parsed);
    if (snippet) snippets.push(snippet);
  }
  return snippets.slice(-n);
}

/**
 * Pull a short "role: text" string out of one transcript event. Returns
 * null when the event has no inspectable payload.
 *
 * Cursor redacts thinking/tool sections in the stored `text` blocks as
 * `[REDACTED]` but leaves `tool_use` records intact — we strip the
 * placeholder and surface tool names + condensed inputs instead.
 */
function snippetFromMessage(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const event = parsed as Record<string, unknown>;
  const role = typeof event.role === "string" ? event.role : "?";
  const message = event.message;
  if (!message || typeof message !== "object") return null;
  const content = (message as Record<string, unknown>).content;

  const textParts: string[] = [];
  const toolParts: string[] = [];

  if (Array.isArray(content)) {
    for (const item of content) {
      if (!item || typeof item !== "object") continue;
      const block = item as Record<string, unknown>;
      if (block.type === "text") {
        const t = block.text;
        if (typeof t === "string") {
          const cleaned = stripRedactionMarkers(t);
          if (cleaned) textParts.push(cleaned);
        }
      } else if (block.type === "tool_use") {
        const summary = formatToolUse(block);
        if (summary) toolParts.push(summary);
      }
    }
  } else if (typeof content === "string") {
    const cleaned = stripRedactionMarkers(content);
    if (cleaned) textParts.push(cleaned);
  }

  const body = composeSnippetBody(textParts, toolParts);
  if (!body) return null;
  return `${role}: ${truncate(body.replace(/\s+/g, " ").trim(), MAX_SNIPPET_LEN)}`;
}

/** Remove Cursor's transcript redaction placeholders from visible text. */
export function stripRedactionMarkers(text: string): string {
  return text
    .replace(/\[REDACTED\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function composeSnippetBody(textParts: string[], toolParts: string[]): string {
  const text = textParts.join(" ").trim();
  const tools = toolParts.join(", ");
  if (text && tools) return `${text} → ${tools}`;
  if (text) return text;
  if (tools) return tools;
  return "";
}

function formatToolUse(block: Record<string, unknown>): string | null {
  const name = typeof block.name === "string" ? block.name : null;
  if (!name) return null;
  const input =
    block.input && typeof block.input === "object"
      ? (block.input as Record<string, unknown>)
      : null;
  if (!input) return name;

  const path = pickString(input, ["path", "target_notebook", "url"]);
  if (path && (name === "Read" || name === "Write" || name === "Delete")) {
    return `${name} ${shortPath(path)}`;
  }
  if (name === "Grep") {
    const pattern = pickString(input, ["pattern"]);
    return pattern ? `Grep ${truncate(pattern, 40)}` : "Grep";
  }
  if (name === "Shell") {
    const cmd = pickString(input, ["command"]);
    return cmd ? `Shell ${truncate(cmd.replace(/\s+/g, " "), 50)}` : "Shell";
  }
  if (name === "StrReplace") {
    const p = pickString(input, ["path"]);
    return p ? `StrReplace ${shortPath(p)}` : "StrReplace";
  }
  if (name === "Task") {
    const desc = pickString(input, ["description"]);
    return desc ? `Task ${truncate(desc, 40)}` : "Task";
  }
  return name;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

function shortPath(p: string): string {
  const parts = p.split("/");
  if (parts.length <= 3) return p;
  return `…/${parts.slice(-2).join("/")}`;
}

const MAX_SNIPPET_LEN = 240;

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, Math.max(0, n - 1)) + "…";
}
