/**
 * `cursor-top tail` — live-tail billed Cursor usage for the signed-in user.
 *
 * Port of the standalone `scripts/cursor/tail-usage` CLI, wired as a
 * cursor-top subcommand so the same analytics key also feeds TUI costs.
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_USAGE_HOURS,
  DEFAULT_USAGE_INTERVAL_MS,
  DEFAULT_USAGE_PAGE_SIZE,
  MIN_USAGE_INTERVAL_MS,
  fetchUsageEvents,
  formatUsd,
  formatUsageTime,
  formatUsageTokens,
  resolveUsageIdentity,
  type NormalizedUsageEvent,
  type UsageApiOptions,
  type UsageIdentity,
} from "./discovery/usage-events.js";

export const DEFAULT_TAIL_LINES = 10;
export const DEFAULT_PROMPT_CHARS = 100;

export type TailPromptInfo = {
  title: string;
  text: string;
};

export type TailCliOptions = {
  intervalMs: number;
  hours: number;
  lines: number;
  follow: boolean;
  promptChars: number;
  json: boolean;
  email: string;
  noColor: boolean;
  help: boolean;
};

export type PromptMapLoader = (
  ids: string[],
  promptChars: number,
) => Promise<Map<string, TailPromptInfo>>;

function colorEnabled(opts: TailCliOptions, stdoutTty = process.stdout.isTTY): boolean {
  if (opts.noColor || process.env.NO_COLOR) return false;
  return Boolean(stdoutTty);
}

function paint(enabled: boolean, code: string, text: string): string {
  if (!enabled) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

function isNumericToken(value: string | undefined): boolean {
  return Boolean(value && /^-?\d+$/.test(value));
}

export function printTailHelp(write: (s: string) => void = (s) => {
  process.stdout.write(s);
}): void {
  write(`cursor-top tail - last billed Cursor requests for the current user

Usage:
  cursor-top tail [options]
  cursor-top tail -n 20
  cursor-top tail -f
  cursor-top tail -fn 20 -p

Options:
  -n NUM, --lines NUM    Output the last NUM requests (default ${DEFAULT_TAIL_LINES})
  -NUM                   Same as --lines NUM
  -f, --follow           Do not stop when the end of the current set is reached
  --once                 Poll once and exit (default)
  -p [NUM], --prompt[=NUM]
                         Include the first NUM chars of the user prompt
                         (default NUM=${DEFAULT_PROMPT_CHARS} when -p is passed)
  --interval SEC         Follow poll interval (default ${DEFAULT_USAGE_INTERVAL_MS / 1000}s)
  --hours N              Lookback window (default ${DEFAULT_USAGE_HOURS} hours)
  --email ADDR           Override /me / CURSOR_USAGE_EMAIL
  --json                 One JSON object per request
  --no-color             Disable ANSI colour
  -h, --help             Show this help

Auth:
  CURSOR_API_KEY         User key for identity lookup
  CURSOR_ANALYTICS_API_KEY
                         Team Admin key with read:e (preferred for usage)
  CURSOR_USAGE_EMAIL     Fallback when /me has no email
                         (then git config user.email)

Follow mode: quit with Ctrl-C.
`);
}

function applyShortCluster(
  cluster: string,
  opts: TailCliOptions,
  next: string | undefined,
): number {
  let consumedNext = 0;
  for (let i = 0; i < cluster.length; i += 1) {
    const flag = cluster[i];
    const rest = cluster.slice(i + 1);
    if (flag === "f") opts.follow = true;
    else if (flag === "h") {
      opts.help = true;
      return 0;
    }
    else if (flag === "n") {
      const attached = rest && isNumericToken(rest) ? rest : undefined;
      const value = attached ?? (isNumericToken(next) ? next : undefined);
      if (!value) throw new Error("-n requires a count");
      opts.lines = Math.max(1, Number(value));
      if (attached) break;
      consumedNext = 1;
    }
    else if (flag === "p") {
      const attached = rest && isNumericToken(rest) ? rest : undefined;
      const value = attached ?? (isNumericToken(next) ? next : undefined);
      opts.promptChars = value ? Math.max(0, Number(value)) : DEFAULT_PROMPT_CHARS;
      if (attached) break;
      if (value) consumedNext = 1;
    }
    else {
      throw new Error(`Unknown argument: -${flag}`);
    }
  }
  return consumedNext;
}

export function parseTailArgs(argv: string[]): TailCliOptions {
  const opts: TailCliOptions = {
    intervalMs: DEFAULT_USAGE_INTERVAL_MS,
    hours: DEFAULT_USAGE_HOURS,
    lines: DEFAULT_TAIL_LINES,
    follow: false,
    promptChars: 0,
    json: false,
    email: "",
    noColor: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    const next = argv[i + 1];
    if (arg === "--json") opts.json = true;
    else if (arg === "--no-color") opts.noColor = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--follow" || arg === "-f") opts.follow = true;
    else if (arg === "--once") opts.follow = false;
    else if (arg === "--interval" && next) {
      opts.intervalMs = Math.max(MIN_USAGE_INTERVAL_MS, Number(next) * 1000);
      i += 1;
    }
    else if (arg === "--hours" && next) {
      opts.hours = Math.max(1, Number(next));
      i += 1;
    }
    else if (arg === "--email" && next) {
      opts.email = next;
      i += 1;
    }
    else if (arg.startsWith("--prompt=")) {
      opts.promptChars = Math.max(0, Number(arg.slice("--prompt=".length)));
    } else if (arg === "--prompt" || arg === "-p") {
      if (isNumericToken(next)) {
        opts.promptChars = Math.max(0, Number(next));
        i += 1;
      } else {
        opts.promptChars = DEFAULT_PROMPT_CHARS;
      }
    }
    else if (/^-\d+$/.test(arg)) {
      opts.lines = Math.max(1, Number(arg.slice(1)));
    }
    else if (arg.startsWith("-n") && arg.length > 2 && isNumericToken(arg.slice(2))) {
      opts.lines = Math.max(1, Number(arg.slice(2)));
    } else if (arg === "-n" || arg === "--lines") {
      if (!isNumericToken(next)) throw new Error(`${arg} requires a count`);
      opts.lines = Math.max(1, Number(next));
      i += 1;
    }
    else if (arg.startsWith("-p") && arg.length > 2 && isNumericToken(arg.slice(2))) {
      opts.promptChars = Math.max(0, Number(arg.slice(2)));
    }
    else if (arg.startsWith("-") && !arg.startsWith("--")) {
      i += applyShortCluster(arg.slice(1), opts, next);
    }
    else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return opts;
}

function cursorDbPath(home = homedir()): string | undefined {
  const candidates = [
    join(home, "Library/Application Support/Cursor/User/globalStorage/state.vscdb"),
    join(home, ".config/Cursor/User/globalStorage/state.vscdb"),
    join(home, "AppData/Roaming/Cursor/User/globalStorage/state.vscdb"),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

function decodeSqliteText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return Buffer.from(value).toString("utf8");
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return "";
}

export function clipPrompt(text: string, limit: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean || limit <= 0) return "";
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit)}...`;
}

function bubbleText(bubble: Record<string, unknown>): string {
  for (const field of ["text", "fullText"] as const) {
    const value = bubble[field];
    if (typeof value === "string" && value.trim()) return value;
  }
  const rich = bubble.richText;
  if (typeof rich === "string" && rich.trim()) {
    try {
      return extractRichText(JSON.parse(rich));
    } catch {
      return rich;
    }
  }
  if (rich && typeof rich === "object") return extractRichText(rich);
  return "";
}

function extractRichText(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) {
    return node.map(extractRichText).filter(Boolean).join(" ");
  }
  if (!node || typeof node !== "object") return "";
  const record = node as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof record.text === "string") parts.push(record.text);
  if (Array.isArray(record.children)) parts.push(extractRichText(record.children));
  if (Array.isArray(record.content)) parts.push(extractRichText(record.content));
  return parts.filter(Boolean).join(" ").trim();
}

function isUserBubble(bubble: Record<string, unknown>): boolean {
  return (
    bubble.type === "user" ||
    bubble.bubbleType === "user" ||
    bubble.bubble_type === "user"
  );
}

function bubbleTime(bubble: Record<string, unknown>): number {
  const parsed = Number(bubble.createdAt ?? bubble.timestamp ?? bubble.createdAtMs ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function loadPromptMap(
  ids: string[],
  promptChars: number,
  dbPath = cursorDbPath(),
): Promise<Map<string, TailPromptInfo>> {
  const out = new Map<string, TailPromptInfo>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0 || !dbPath) return out;

  try {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try {
      const titleStmt = db.prepare(
        "SELECT json_extract(value, '$.name') AS name FROM cursorDiskKV WHERE key = ?",
      );
      const bubbleStmt = db.prepare(
        "SELECT value FROM cursorDiskKV WHERE key GLOB ?",
      );

      for (const id of unique) {
        const titleRow = titleStmt.get(`composerData:${id}`) as { name?: string } | undefined;
        const title =
          typeof titleRow?.name === "string"
            ? titleRow.name.replace(/\s+/g, " ").trim()
            : "";

        let text = "";
        if (promptChars > 0) {
          const rows = bubbleStmt.all(`bubble:${id}:*`) as Array<{ value?: unknown }>;
          const users: Array<{ t: number; text: string }> = [];
          for (const row of rows) {
            const raw = decodeSqliteText(row.value);
            if (!raw) continue;
            try {
              const bubble = JSON.parse(raw) as Record<string, unknown>;
              if (!isUserBubble(bubble)) continue;
              const extracted = bubbleText(bubble);
              const cleaned = extracted.replace(/\s+/g, " ").trim();
              if (cleaned) users.push({ t: bubbleTime(bubble), text: extracted });
            } catch {
              continue;
            }
          }
          users.sort((a, b) => a.t - b.t);
          text = users[0]?.text ?? "";
        }

        if (title || text) {
          out.set(id, { title, text: clipPrompt(text, promptChars) });
        }
      }
    } finally {
      db.close();
    }
  } catch {
    return out;
  }
  return out;
}

export function renderTailEvent(
  row: NormalizedUsageEvent,
  info: TailPromptInfo | undefined,
  opts: TailCliOptions,
  colours: boolean,
): string {
  const time = paint(colours, "90", formatUsageTime(row.tMs));
  const model = paint(colours, "36", row.model);
  const cost = paint(colours, "33", formatUsd(row.costUsd).padStart(8));
  const head = row.headless ? paint(colours, "90", " headless") : "";
  const conv = row.conversationId
    ? paint(colours, "90", row.conversationId.slice(0, 8))
    : paint(colours, "90", "no-conv");

  const tok = (label: string, value: number, code: string) =>
    value > 0 ? `${label}:${paint(colours, code, formatUsageTokens(value))}` : "";
  const tokens = [
    tok("in", row.inTokens, "32"),
    tok("write", row.write, "34"),
    tok("read", row.read, "34"),
    tok("out", row.out, "35"),
  ].filter(Boolean).join(" ");

  const lines = [
    [time, model.padEnd(25), cost, tokens, conv, head].filter(Boolean).join("  "),
  ];

  if (info?.title) {
    lines.push(paint(colours, "90", "    title  ") + info.title);
  }
  if (opts.promptChars > 0) {
    lines.push(
      paint(colours, "90", "    prompt ") + (info?.text || "(no local prompt)"),
    );
  }
  return lines.join("\n");
}

export function renderTailHeader(
  identity: UsageIdentity,
  opts: TailCliOptions,
  colours: boolean,
): string {
  const title = paint(colours, "1", "Cursor API Usage");
  const who = identity.label ? `${identity.label} (${identity.email})` : identity.email;
  const mode = opts.follow
    ? `follow (poll @ ${opts.intervalMs / 1000}s)`
    : "snapshot";
  const prompt = opts.promptChars > 0 ? ` prompt:${opts.promptChars}` : "";
  return [
    `${title}  ${paint(colours, "90", "user=")}${who}`,
    `${paint(colours, "90", "window=")}${opts.hours}h  ${paint(colours, "90", "mode=")}${mode}${prompt}`,
    paint(colours, "90", "-".repeat(72)),
  ].join("\n");
}

export function serializeTailEvent(
  row: NormalizedUsageEvent,
  info: TailPromptInfo | undefined,
): string {
  return JSON.stringify({
    timestamp: row.tMs,
    time: new Date(row.tMs).toISOString(),
    model: row.model,
    costUsd: row.costUsd,
    tokens: {
      in: row.inTokens,
      write: row.write,
      read: row.read,
      out: row.out,
    },
    conversationId: row.conversationId,
    title: info?.title ?? "",
    prompt: info?.text ?? "",
    headless: row.headless,
  });
}

export interface RunUsageTailDeps {
  usageApi?: UsageApiOptions;
  loadPrompts?: PromptMapLoader;
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  stdoutTty?: boolean;
  now?: () => number;
  waitForSignal?: () => Promise<void>;
}

export async function runUsageTail(
  argv: string[],
  deps: RunUsageTailDeps = {},
): Promise<number> {
  let opts: TailCliOptions;
  try {
    opts = parseTailArgs(argv);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    (deps.stderr ?? ((s) => process.stderr.write(s)))(`error: ${message}\n`);
    return 1;
  }

  if (opts.help) {
    printTailHelp(deps.stdout ?? ((s) => process.stdout.write(s)));
    return 0;
  }

  const writeOut = deps.stdout ?? ((s) => process.stdout.write(s));
  const writeErr = deps.stderr ?? ((s) => process.stderr.write(s));
  const colours = colorEnabled(opts, deps.stdoutTty ?? process.stdout.isTTY);
  const loadPrompts = deps.loadPrompts ?? loadPromptMap;

  let identity: UsageIdentity;
  try {
    identity = await resolveUsageIdentity({
      ...deps.usageApi,
      email: opts.email || deps.usageApi?.email,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    writeErr(`error: ${message}\n`);
    return 1;
  }

  if (!opts.json) {
    writeOut(renderTailHeader(identity, opts, colours) + "\n");
  }

  const seen = new Set<string>();
  let seeded = false;

  const tick = async (): Promise<void> => {
    const rows = await fetchUsageEvents({
      ...deps.usageApi,
      usageKey: identity.usageKey,
      email: identity.email,
      hours: opts.hours,
      limit: Math.max(opts.lines, DEFAULT_USAGE_PAGE_SIZE),
      now: deps.now?.(),
    });
    const prompts = await loadPrompts(
      rows.map((row) => row.conversationId),
      opts.promptChars,
    );

    let fresh = rows.filter((row) => !seen.has(row.id));
    if (!seeded) {
      fresh = fresh.slice(-opts.lines);
      seeded = true;
    }
    for (const row of fresh) seen.add(row.id);
    if (fresh.length === 0) return;

    if (opts.json) {
      for (const row of fresh) {
        writeOut(serializeTailEvent(row, prompts.get(row.conversationId)) + "\n");
      }
      return;
    }
    for (const row of fresh) {
      writeOut(renderTailEvent(row, prompts.get(row.conversationId), opts, colours) + "\n");
    }
  };

  try {
    await tick();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    writeErr(`error: ${message}\n`);
    return 1;
  }

  if (!opts.follow) return 0;

  const wait =
    deps.waitForSignal ??
    ((): Promise<void> =>
      new Promise((resolve) => {
        const stop = (): void => resolve();
        process.on("SIGINT", stop);
        process.on("SIGTERM", stop);
      }));

  const timer = setInterval(() => {
    void tick().catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      writeErr(`poll error: ${message}\n`);
    });
  }, opts.intervalMs);

  await wait();
  clearInterval(timer);
  return 0;
}
