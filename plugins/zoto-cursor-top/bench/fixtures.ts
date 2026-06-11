/**
 * Deterministic synthetic-scale fixtures for the cursor-top benchmarks and
 * contract tests.
 *
 * Each fixture models one machine's worth of Cursor state at a given tier:
 *
 *   * an in-memory `FsLike` (see `src/types.ts`) holding session JSON,
 *     the `~/.cursor/projects/<ws>/agent-transcripts/` tree metadata,
 *     `workspaceStorage` entries, `state.vscdb` existence, and fake
 *     workspace `.git/config` files;
 *   * REAL JSONL transcript / plain-text log files written under a
 *     per-run temp directory (`fs.mkdtemp` under `os.tmpdir()`).
 *
 * Tail-seam note: log tails route through `FsLike.readWindow` (subtask 03).
 * Transcript JSONL and plain CLI logs are written as real temp files AND
 * mirrored in the in-memory `MemFs` (metadata-only entries) so stat/exists
 * and windowed reads agree. `readWindow` falls back to `readFileSync` for
 * metadata-only mirrors. This is the one sanctioned real-filesystem surface;
 * the developer's actual Cursor state directories are never read and no real
 * processes are spawned.
 *
 * Consumed by `bench/collector.bench.ts`, `bench/render.bench.ts`, and
 * `tests/contracts.test.ts`; later subtasks (03 collector caching, 07
 * render windowing, 08 integration) reuse the same API for before/after
 * comparisons against `bench/BASELINE.md`.
 */

import { readFileSync, rmSync } from "node:fs";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ComposerModelRunner } from "../src/discovery/composer-models.js";
import type { CollectorOptions, FsLike } from "../src/types.js";

export type Tier = "S" | "M" | "L";
export const TIERS: readonly Tier[] = ["S", "M", "L"];

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60_000;

/* ------------------------------------------------------------------ */
/* Deterministic PRNG + text generation                                 */
/* ------------------------------------------------------------------ */

/** Small, dependency-free seeded PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = [
  "refactor", "collector", "snapshot", "hierarchy", "transcript", "render",
  "viewport", "latency", "baseline", "pipeline", "session", "subagent",
  "discover", "windowed", "tail", "cursor", "monitor", "process", "cache",
  "tick", "prune", "format", "theme", "filter",
];

function sentence(rng: () => number, minWords: number, maxWords: number): string {
  const n = minWords + Math.floor(rng() * (maxWords - minWords + 1));
  const parts: string[] = [];
  for (let i = 0; i < n; i += 1) {
    parts.push(WORDS[Math.floor(rng() * WORDS.length)]!);
  }
  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/* In-memory FsLike                                                     */
/* ------------------------------------------------------------------ */

interface MemEntry {
  kind: "file" | "dir";
  /** null for metadata-only mirrors of real temp files. */
  content: string | null;
  size: number;
  mtimeMs: number;
}

/** Normalise separators so win32 `join()` output and `/`-templated paths agree. */
function norm(p: string): string {
  return p.split("\\").join("/");
}

/**
 * Minimal in-memory `FsLike`. Files added with content are readable;
 * files added metadata-only (mirrors of real temp files) stat/exists
 * correctly but throw on `readFile` — nothing in the discovery pipeline
 * reads transcript bodies through `readFile`; tail windows use
 * `readWindow` (metadata-only mirrors delegate to the real temp file).
 */
export class MemFs implements FsLike {
  private entries = new Map<string, MemEntry>();
  private children = new Map<string, Set<string>>();

  addDir(path: string, mtimeMs = 0): void {
    const p = norm(path);
    if (this.entries.get(p)?.kind === "dir") return;
    this.entries.set(p, { kind: "dir", content: null, size: 0, mtimeMs });
    if (!this.children.has(p)) this.children.set(p, new Set());
    this.registerChild(p);
  }

  /** Remove a file or directory entry (used by cache invalidation tests). */
  remove(path: string): void {
    const p = norm(path);
    const entry = this.entries.get(p);
    if (!entry) return;
    this.entries.delete(p);
    const parent = norm(dirname(p));
    const base = p.slice(parent.length + 1);
    this.children.get(parent)?.delete(base);
    if (entry.kind === "dir") this.children.delete(p);
  }

  addFile(
    path: string,
    content: string | null,
    opts: { size?: number; mtimeMs?: number } = {},
  ): void {
    const p = norm(path);
    const size = opts.size ?? (content ? Buffer.byteLength(content, "utf8") : 0);
    this.entries.set(p, {
      kind: "file",
      content,
      size,
      mtimeMs: opts.mtimeMs ?? 0,
    });
    this.registerChild(p);
  }

  private registerChild(path: string): void {
    const parent = norm(dirname(path));
    if (parent === path) return;
    if (this.entries.get(parent)?.kind !== "dir") this.addDir(parent);
    this.children.get(parent)!.add(path.slice(parent.length + 1));
  }

  async readdir(path: string): Promise<string[]> {
    const p = norm(path);
    const entry = this.entries.get(p);
    if (!entry || entry.kind !== "dir") throw new Error(`ENOTDIR: ${path}`);
    return [...(this.children.get(p) ?? [])].sort();
  }

  async readFile(path: string, _enc: "utf8"): Promise<string> {
    const entry = this.entries.get(norm(path));
    if (!entry || entry.kind !== "file" || entry.content == null) {
      throw new Error(`ENOENT: ${path}`);
    }
    return entry.content;
  }

  async readWindow(path: string, offset: number, length: number): Promise<Buffer> {
    const entry = this.entries.get(norm(path));
    if (entry?.kind === "file" && entry.content != null) {
      const buf = Buffer.from(entry.content, "utf8");
      return buf.subarray(offset, Math.min(offset + length, buf.length));
    }
    // Metadata-only mirror of a real temp file written by the fixture.
    const raw = readFileSync(path);
    return raw.subarray(offset, Math.min(offset + length, raw.length));
  }

  async stat(path: string): Promise<{
    isDirectory(): boolean;
    isFile(): boolean;
    mtimeMs: number;
    size: number;
  }> {
    const entry = this.entries.get(norm(path));
    if (!entry) throw new Error(`ENOENT: ${path}`);
    return {
      isDirectory: () => entry.kind === "dir",
      isFile: () => entry.kind === "file",
      mtimeMs: entry.mtimeMs,
      size: entry.size,
    };
  }

  async exists(path: string): Promise<boolean> {
    return this.entries.has(norm(path));
  }
}

/* ------------------------------------------------------------------ */
/* Counting FsLike wrapper (fs-op instrumentation)                      */
/* ------------------------------------------------------------------ */

export interface FsOpCounts {
  readdir: number;
  readFile: number;
  readWindow: number;
  stat: number;
  exists: number;
}

/**
 * Counting wrapper so benches can report fs operations per collect()
 * tick alongside latency.
 *
 * Known limitation (resolved in subtask 03): tail reads now route through
 * `FsLike.readWindow` when the collector injects its fs seam — counted in
 * `readWindow` below.
 */
export class CountingFs implements FsLike {
  counts: FsOpCounts = { readdir: 0, readFile: 0, readWindow: 0, stat: 0, exists: 0 };

  constructor(private readonly inner: FsLike) {}

  reset(): void {
    this.counts = { readdir: 0, readFile: 0, readWindow: 0, stat: 0, exists: 0 };
  }

  total(): number {
    const c = this.counts;
    return c.readdir + c.readFile + c.readWindow + c.stat + c.exists;
  }

  readdir(path: string): Promise<string[]> {
    this.counts.readdir += 1;
    return this.inner.readdir(path);
  }

  readFile(path: string, enc: "utf8"): Promise<string> {
    this.counts.readFile += 1;
    return this.inner.readFile(path, enc);
  }

  readWindow(path: string, offset: number, length: number): Promise<Buffer> {
    this.counts.readWindow += 1;
    return this.inner.readWindow(path, offset, length);
  }

  stat(path: string): ReturnType<FsLike["stat"]> {
    this.counts.stat += 1;
    return this.inner.stat(path);
  }

  exists(path: string): Promise<boolean> {
    this.counts.exists += 1;
    return this.inner.exists(path);
  }
}

/* ------------------------------------------------------------------ */
/* Tier configuration                                                   */
/* ------------------------------------------------------------------ */

export interface TierConfig {
  workspaces: number;
  chatsPerWorkspace: number;
  /** Subagent count for the global chat index. */
  subsForChat(globalChatIdx: number): number;
  cliSessions: number;
  /** Every Nth global chat gets a multi-MB parent transcript (null = none). */
  bigFileEvery: number | null;
  bigFileBytes: number;
  chatLines: number;
  subLines: number;
}

/**
 * Agent counts (chats + subagents + CLI sessions):
 *   S: 6 + 3 + 1    = 10
 *   M: 30 + 66 + 4  = 100
 *   L: 248 + 744 + 8 = 1000
 */
export const TIER_CONFIG: Record<Tier, TierConfig> = {
  S: {
    workspaces: 1,
    chatsPerWorkspace: 6,
    subsForChat: (i) => [1, 1, 1, 0, 0, 0][i % 6]!,
    cliSessions: 1,
    bigFileEvery: null,
    bigFileBytes: 0,
    chatLines: 40,
    subLines: 20,
  },
  M: {
    workspaces: 3,
    chatsPerWorkspace: 10,
    subsForChat: (i) => [2, 2, 2, 2, 3][i % 5]!,
    cliSessions: 4,
    bigFileEvery: 15,
    bigFileBytes: 2 * 1024 * 1024,
    chatLines: 40,
    subLines: 20,
  },
  L: {
    workspaces: 8,
    chatsPerWorkspace: 31,
    subsForChat: () => 3,
    cliSessions: 8,
    bigFileEvery: 20,
    bigFileBytes: 3 * 1024 * 1024,
    chatLines: 40,
    subLines: 20,
  },
};

/* ------------------------------------------------------------------ */
/* Fixture                                                              */
/* ------------------------------------------------------------------ */

export interface ScaleFixtureCounts {
  workspaces: number;
  chats: number;
  subagents: number;
  cliSessions: number;
  /** chats + subagents + cliSessions — the "~10 / ~100 / ~1000" number. */
  agents: number;
  /** Rows in the fake `ps` table. */
  processes: number;
  /** Real JSONL transcript files written to the temp dir. */
  transcriptFiles: number;
  multiMbFiles: number;
  bytesOnDisk: number;
}

export interface ScaleFixture {
  tier: Tier;
  /** Per-run temp directory the collector treats as `homeDir`. */
  homeDir: string;
  /** Real `Date.now()` captured at build; mtimes are set relative to it. */
  now: number;
  /** Counting wrapper around the in-memory fs — inject as `CollectorOptions.fs`. */
  fs: CountingFs;
  memFs: MemFs;
  psRunner: () => Promise<string>;
  composerModelRunner: ComposerModelRunner;
  /** pid → ppid for every row in the fake process table. */
  pidParents: Map<number, number>;
  /** `<projects>/<slug>/agent-transcripts` directories (one per workspace). */
  transcriptRoots: string[];
  /** Absolute real-file paths of every transcript JSONL (chats + subs). */
  transcriptFiles: string[];
  /** Absolute real-file paths of the plain-text CLI logs. */
  plainLogFiles: string[];
  counts: ScaleFixtureCounts;
  calls: { ps: number; composer: number };
  modelFor(id: string): string;
  /** CLI-default collector options wired to this fixture's seams. */
  collectorOptions(overrides?: Partial<CollectorOptions>): CollectorOptions;
  dispose(): Promise<void>;
}

const MODEL_POOL = [
  "claude-fable-5-thinking-max",
  "gpt-5.3-codex",
  "claude-4.6-opus-high-thinking",
  "composer-2.5-fast",
  "gemini-3.1-pro",
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const hex = (n: number, width: number): string =>
  n.toString(16).padStart(width, "0");

export function chatUuid(ws: number, chat: number): string {
  return `${hex(ws, 8)}-${hex(chat, 4)}-4bab-8000-${hex(chat, 12)}`;
}

export function subUuid(ws: number, chat: number, sub: number): string {
  return `${hex(ws, 8)}-${hex(chat, 4)}-4bab-9${hex(sub, 3)}-${hex(chat, 12)}`;
}

/** Status mtime offsets: running ≤5 min, idle ≤30 min, done beyond. */
function chatMtimeOffsetMs(chatIdx: number): number {
  const m = chatIdx % 3;
  if (m === 0) return 30_000; // running
  if (m === 1) return 6 * MINUTE_MS; // idle
  return 45 * MINUTE_MS; // done
}

function subMtimeOffsetMs(chatIdx: number, subIdx: number): number {
  const m = (chatIdx * 7 + subIdx) % 4;
  if (m === 0) return 45 * MINUTE_MS; // done
  if (m === 2) return 6 * MINUTE_MS; // idle
  return m === 1 ? 30_000 : 90_000; // running
}

function transcriptLine(rng: () => number, idx: number, label: string): string {
  if (idx % 7 === 3) {
    return JSON.stringify({
      role: "assistant",
      message: {
        content: [
          { type: "text", text: `${label} weighing options before edit ${idx}` },
          {
            type: "tool_use",
            name: "Read",
            input: { path: `/home/bench/src/mod-${idx % 41}.ts` },
          },
        ],
      },
    });
  }
  const role = idx % 2 === 0 ? "user" : "assistant";
  return JSON.stringify({
    role,
    message: {
      content: [
        { type: "text", text: `${label} step ${idx}: ${sentence(rng, 8, 24)}` },
      ],
    },
  });
}

function transcriptContent(
  rng: () => number,
  label: string,
  lineCount: number,
  minBytes: number,
): string {
  const lines: string[] = [];
  let bytes = 0;
  let i = 0;
  while (i < lineCount || bytes < minBytes) {
    const line = transcriptLine(rng, i, label);
    lines.push(line);
    bytes += line.length + 1;
    i += 1;
  }
  return lines.join("\n") + "\n";
}

function formatEtime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function cimDate(ms: number): string {
  const d = new Date(ms);
  const p = (n: number, w = 2): string => n.toString().padStart(w, "0");
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}.000000+000`
  );
}

interface ProcRow {
  pid: number;
  ppid: number;
  etimeSec: number;
  command: string;
}

/**
 * Render the fake process table in the format `discoverCursorProcesses`
 * parses on the CURRENT host platform (it checks the real
 * `process.platform`, which is not injectable).
 */
function renderPsStdout(rows: ProcRow[], now: number): string {
  if (process.platform === "win32") {
    return JSON.stringify(
      rows.map((r) => ({
        ProcessId: r.pid,
        ParentProcessId: r.ppid,
        CreationDate: cimDate(now - r.etimeSec * 1000),
        CommandLine: r.command,
      })),
    );
  }
  return (
    rows
      .map(
        (r) =>
          `${r.pid.toString().padStart(7)} ${r.ppid
            .toString()
            .padStart(7)} ${formatEtime(r.etimeSec)} ${r.command}`,
      )
      .join("\n") + "\n"
  );
}

export async function createScaleFixture(tier: Tier): Promise<ScaleFixture> {
  const cfg = TIER_CONFIG[tier];
  const rng = mulberry32(0xc0ffee + tier.charCodeAt(0));
  const now = Date.now();
  const homeDir = await mkdtemp(join(tmpdir(), `cursor-top-bench-${tier}-`));
  const memFs = new MemFs();

  /* ---- static home layout (in-memory only) ---- */
  const configCursor = join(homeDir, ".config", "Cursor");
  const dotCursor = join(homeDir, ".cursor");
  memFs.addDir(configCursor);
  memFs.addDir(join(configCursor, "logs"));
  memFs.addDir(join(dotCursor, "agents"));
  memFs.addDir(join(dotCursor, "sessions"));
  memFs.addDir(join(dotCursor, "cli", "chats"));
  memFs.addDir(join(dotCursor, "cli", "sessions"));
  const projectsRoot = join(dotCursor, "projects");
  memFs.addDir(projectsRoot);
  // state.vscdb only needs to exist so the composer-model lookup runs.
  memFs.addFile(
    join(configCursor, "User", "globalStorage", "state.vscdb"),
    null,
    { size: 4096, mtimeMs: now - 5_000 },
  );

  /* ---- processes ---- */
  const procRows: ProcRow[] = [];
  const pidParents = new Map<number, number>();
  const pushProc = (row: ProcRow): void => {
    procRows.push(row);
    pidParents.set(row.pid, row.ppid);
  };

  const workspacePath = (w: number): string => `/home/bench/work/repo-${w}`;
  const workspaceSlug = (w: number): string => `home-bench-work-repo-${w}`;

  for (let w = 0; w < cfg.workspaces; w += 1) {
    const idePid = 1000 + w * 10;
    pushProc({
      pid: idePid,
      ppid: 1,
      etimeSec: 7200 + w * 61,
      command: `/usr/share/cursor/Cursor --no-sandbox ${workspacePath(w)}`,
    });
    pushProc({
      pid: idePid + 1,
      ppid: idePid,
      etimeSec: 7100 + w * 61,
      command: `/usr/share/cursor/Cursor Helper (Renderer) --type=renderer --pid=${idePid}`,
    });
    pushProc({
      pid: idePid + 2,
      ppid: idePid,
      etimeSec: 7100 + w * 61,
      command: `/usr/share/cursor/Cursor Helper (GPU) --type=gpu-process --pid=${idePid}`,
    });

    // In-memory workspace dir + .git/config so repo-url resolution works.
    memFs.addDir(workspacePath(w));
    memFs.addFile(
      join(workspacePath(w), ".git", "config"),
      `[core]\n\trepositoryformatversion = 0\n[remote "origin"]\n\turl = git@github.com:bench-org/repo-${w}.git\n`,
    );
    // workspaceStorage mapping (second slug→path source).
    memFs.addFile(
      join(configCursor, "User", "workspaceStorage", `hash-${hex(w, 8)}`, "workspace.json"),
      JSON.stringify({ folder: `file://${workspacePath(w)}` }),
    );
  }

  // Cursor-flavoured noise that classifies as kind:"unknown" — exercises
  // the --cursor-only prune pass.
  for (let i = 0; i < 2; i += 1) {
    const noisePid = 9000 + i * 100;
    pushProc({
      pid: noisePid,
      ppid: 1,
      etimeSec: 600 + i,
      command: `/usr/bin/python3 /opt/tools/cursor-wrap.py --cursor-electron-mode --slot=${i}`,
    });
    pushProc({
      pid: noisePid + 1,
      ppid: noisePid,
      etimeSec: 590 + i,
      command: `/usr/bin/python3 /opt/tools/cursor-wrap.py --cursor-electron-child --slot=${i}`,
    });
  }

  /* ---- real temp files: transcripts + CLI logs ---- */
  interface PendingFile {
    path: string;
    content: string;
    mtimeMs: number;
  }
  const pending: PendingFile[] = [];
  const transcriptRoots: string[] = [];
  const transcriptFiles: string[] = [];
  const plainLogFiles: string[] = [];
  let chats = 0;
  let subagents = 0;
  let multiMbFiles = 0;
  let globalChat = 0;

  for (let w = 0; w < cfg.workspaces; w += 1) {
    const slug = workspaceSlug(w);
    const transcriptsDir = join(projectsRoot, slug, "agent-transcripts");
    memFs.addDir(join(projectsRoot, slug));
    memFs.addDir(transcriptsDir);
    transcriptRoots.push(transcriptsDir);

    for (let c = 0; c < cfg.chatsPerWorkspace; c += 1) {
      const id = chatUuid(w, globalChat);
      const chatDir = join(transcriptsDir, id);
      const chatFile = join(chatDir, `${id}.jsonl`);
      const big =
        cfg.bigFileEvery != null && globalChat % cfg.bigFileEvery === 0;
      if (big) multiMbFiles += 1;
      const content = transcriptContent(
        rng,
        `chat-${globalChat}`,
        cfg.chatLines,
        big ? cfg.bigFileBytes : 0,
      );
      const mtimeMs = now - chatMtimeOffsetMs(globalChat);
      pending.push({ path: chatFile, content, mtimeMs });
      memFs.addDir(chatDir, mtimeMs);
      memFs.addFile(chatFile, null, {
        size: Buffer.byteLength(content, "utf8"),
        mtimeMs,
      });
      transcriptFiles.push(chatFile);
      chats += 1;

      const subCount = cfg.subsForChat(globalChat);
      if (subCount > 0) {
        const subsDir = join(chatDir, "subagents");
        memFs.addDir(subsDir, mtimeMs);
        for (let s = 0; s < subCount; s += 1) {
          const sid = subUuid(w, globalChat, s);
          const subFile = join(subsDir, `${sid}.jsonl`);
          const subContent = transcriptContent(
            rng,
            `sub-${globalChat}-${s}`,
            cfg.subLines,
            0,
          );
          const subMtime = now - subMtimeOffsetMs(globalChat, s);
          pending.push({ path: subFile, content: subContent, mtimeMs: subMtime });
          memFs.addFile(subFile, null, {
            size: Buffer.byteLength(subContent, "utf8"),
            mtimeMs: subMtime,
          });
          transcriptFiles.push(subFile);
          subagents += 1;
        }
      }
      globalChat += 1;
    }
  }

  // CLI sessions: JSON metadata in-memory, plain-text logs as real files.
  for (let c = 0; c < cfg.cliSessions; c += 1) {
    const pid = 5000 + c;
    pushProc({
      pid,
      ppid: 1,
      etimeSec: 300 + c * 17,
      command: `/home/bench/.local/bin/cursor-agent --resume cli-session-${c}`,
    });
    const logPath = join(dotCursor, "cli", "logs", `cli-session-${c}.log`);
    const logLines: string[] = [];
    for (let i = 0; i < 40; i += 1) {
      logLines.push(`[cli-${c}] ${sentence(rng, 4, 10)} (${i})`);
    }
    const logContent = logLines.join("\n") + "\n";
    const logMtime = now - 20_000;
    pending.push({
      path: logPath,
      content: logContent,
      mtimeMs: logMtime,
    });
    plainLogFiles.push(logPath);
    memFs.addDir(join(dotCursor, "cli", "logs"), logMtime);
    memFs.addFile(logPath, null, {
      size: Buffer.byteLength(logContent, "utf8"),
      mtimeMs: logMtime,
    });
    memFs.addFile(
      join(dotCursor, "cli", "chats", `cli-session-${c}.json`),
      JSON.stringify({
        sessionId: `cli-session-${c}`,
        model: MODEL_POOL[c % MODEL_POOL.length],
        cwd: workspacePath(c % cfg.workspaces),
        prompt: `CLI run ${c}: ${sentence(rng, 5, 9)}`,
        status: "running",
        createdAt: now - (7 + c) * MINUTE_MS,
        pid,
        logPath,
      }),
      { mtimeMs: now - 30_000 },
    );
  }

  // Write real files with bounded concurrency, then stamp mtimes.
  let bytesOnDisk = 0;
  const CHUNK = 64;
  for (let i = 0; i < pending.length; i += CHUNK) {
    await Promise.all(
      pending.slice(i, i + CHUNK).map(async (f) => {
        await mkdir(dirname(f.path), { recursive: true });
        await writeFile(f.path, f.content, "utf8");
        const t = new Date(f.mtimeMs);
        await utimes(f.path, t, t);
        bytesOnDisk += Buffer.byteLength(f.content, "utf8");
      }),
    );
  }

  /* ---- injected runners ---- */
  const calls = { ps: 0, composer: 0 };
  const psStdout = renderPsStdout(procRows, now);
  const psRunner = async (): Promise<string> => {
    calls.ps += 1;
    return psStdout;
  };

  const modelFor = (id: string): string =>
    MODEL_POOL[hashString(id) % MODEL_POOL.length]!;

  const tokenFor = (id: string): number =>
    300 + (hashString(`${id}:tokens`) % 120_000);

  const composerModelRunner: ComposerModelRunner = async ({ sql }) => {
    calls.composer += 1;
    const out: string[] = [];
    for (const m of sql.matchAll(/composerData:([A-Za-z0-9._-]+)/g)) {
      out.push(`${m[1]}|${modelFor(m[1]!)}|${tokenFor(m[1]!)}`);
    }
    return out.join("\n") + "\n";
  };

  const fs = new CountingFs(memFs);

  const counts: ScaleFixtureCounts = {
    workspaces: cfg.workspaces,
    chats,
    subagents,
    cliSessions: cfg.cliSessions,
    agents: chats + subagents + cfg.cliSessions,
    processes: procRows.length,
    transcriptFiles: transcriptFiles.length,
    multiMbFiles,
    bytesOnDisk,
  };

  return {
    tier,
    homeDir,
    now,
    fs,
    memFs,
    psRunner,
    composerModelRunner,
    pidParents,
    transcriptRoots,
    transcriptFiles,
    plainLogFiles,
    counts,
    calls,
    modelFor,
    collectorOptions(overrides: Partial<CollectorOptions> = {}): CollectorOptions {
      // Mirrors the CLI defaults from `parseArgs` / `loadSnapshot`.
      return {
        fs,
        psRunner,
        composerModelRunner,
        platform: "linux",
        homeDir,
        logTailLines: 3,
        cursorOnly: true,
        withLogs: true,
        activeOnly: true,
        transcriptMaxAgeMs: DAY_MS,
        ...overrides,
      };
    },
    async dispose(): Promise<void> {
      await rm(homeDir, { recursive: true, force: true });
    },
  };
}

/* ------------------------------------------------------------------ */
/* Cleanup helper for bench files (no afterAll in benchmark mode)       */
/* ------------------------------------------------------------------ */

const cleanupDirs = new Set<string>();
let exitHookInstalled = false;

/**
 * Remove the fixture's temp directory when the (worker) process exits.
 * Bench files use this instead of `afterAll`; tests prefer
 * `fixture.dispose()` in `afterAll`.
 */
export function registerExitCleanup(fixture: ScaleFixture): void {
  cleanupDirs.add(fixture.homeDir);
  if (exitHookInstalled) return;
  exitHookInstalled = true;
  process.on("exit", () => {
    for (const dir of cleanupDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* best effort */
      }
    }
  });
}
