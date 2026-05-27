/**
 * Parse the on-disk session metadata Cursor writes for the IDE, the
 * `cursor-agent` CLI, Cloud Agent VMs, and the per-agent transcript
 * message-streams under `~/.cursor/projects/<ws>/agent-transcripts/`.
 *
 * The on-disk layout is not a stable public contract, so we tolerate every
 * file shape we have observed and fall back to "unknown" fields rather than
 * crashing — but we DO refuse to mint a session record from a random JSON
 * blob (see {@link recordFromJson} → `STRONG_KEYS`). Without that guard
 * the recursive walker happily parses VS Code local-history snapshots,
 * MCP tool descriptors, and `package.json` files as "sessions" — which
 * produced thousands of ghost rows on Linux Cursor 2026.05.
 */

import { basename, join } from "node:path";
import type { AgentKind, AgentStatus, FsLike } from "../types.js";

export interface SessionRecord {
  /** Stable identifier; usually the session UUID. */
  id: string;
  /** Parent agent identifier if this session is a subagent. */
  parentId: string | null;
  kind: AgentKind;
  /** PID hint if the metadata stores one; null otherwise. */
  pid: number | null;
  label: string;
  title: string;
  model: string | null;
  repo: string | null;
  startedAt: number;
  status: AgentStatus;
  /** Absolute path of the log file to tail, if known. */
  logPath: string | null;
  /** Source path for this record, kept for diagnostics. */
  sourcePath: string;
}

const STATUS_MAP: Record<string, AgentStatus> = {
  running: "running",
  active: "running",
  in_progress: "running",
  pending: "waiting",
  waiting: "waiting",
  paused: "waiting",
  idle: "idle",
  done: "done",
  completed: "done",
  finished: "done",
  failed: "error",
  errored: "error",
  error: "error",
};

function normaliseStatus(raw: unknown): AgentStatus {
  if (typeof raw !== "string") return "unknown";
  return STATUS_MAP[raw.toLowerCase()] ?? "unknown";
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function parseTimestamp(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 1e12 ? raw : raw * 1000;
  }
  if (typeof raw === "string") {
    const n = Date.parse(raw);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

/**
 * Keys that positively identify a JSON blob as an agent-session record.
 *
 * The walker reaches a lot of non-session JSON on Linux Cursor (local
 * history snapshots, MCP tool descriptors, npm `package.json` files,
 * editor settings, etc.). Without this allow-list `recordFromJson`
 * happily turned each of those into a phantom row with `model=null` and
 * `logPath=null`, producing the empty `MODEL` / `REPO` / log-tail columns
 * that motivated this fix. A record must declare at least one of these
 * keys to be considered a session.
 */
const STRONG_SESSION_KEYS = [
  "sessionId",
  "agentId",
  "uuid",
  "model",
  "modelId",
  "modelSlug",
  "prompt",
  "logPath",
  "logFile",
  "parentAgentId",
  "parentId",
  "subagentType",
  "subagent_type",
] as const;

/**
 * Map a parsed JSON record (from any of the known session layouts) to a
 * {@link SessionRecord}. Returns null when the JSON is too malformed to use
 * or fails the {@link STRONG_SESSION_KEYS} positive-identification check.
 */
export function recordFromJson(
  raw: unknown,
  sourcePath: string,
  kind: AgentKind,
): SessionRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  if (!STRONG_SESSION_KEYS.some((k) => k in obj)) return null;

  const id = pickString(obj, ["id", "sessionId", "uuid", "agentId"]) ??
    basename(sourcePath).replace(/\.[^.]+$/, "");
  const parentId = pickString(obj, ["parentId", "parent", "parentAgentId"]);
  const pid = pickNumber(obj, ["pid", "processId"]);
  const model = pickString(obj, ["model", "modelId", "modelSlug"]);
  const repo =
    pickString(obj, ["repo", "repository", "cwd", "workspace", "workspaceRoot", "workingDirectory"]);
  const title =
    pickString(obj, ["title", "prompt", "summary", "name", "description"]) ?? "";
  const startedAt =
    parseTimestamp(obj.startedAt ?? obj.createdAt ?? obj.startTime ?? obj.start) ??
    Date.now();
  const status = normaliseStatus(obj.status ?? obj.state ?? obj.phase);

  const subagentType = pickString(obj, ["subagentType", "subagent_type"]);
  const label = subagentType
    ? `Task(${subagentType})`
    : pickString(obj, ["label", "name"]) ?? (kind === "subagent" ? "Task" : "main");

  const logPath = pickString(obj, ["logPath", "logFile", "log"]);

  return {
    id,
    parentId,
    kind: parentId ? "subagent" : kind,
    pid,
    label,
    title,
    model,
    repo,
    startedAt,
    status,
    logPath,
    sourcePath,
  };
}

/**
 * Directories the recursive walker must not descend into.
 *
 * Two groups:
 *
 *   1. The generic "this is binary / cache" set we always skipped.
 *   2. The new "this is editor state, not agent state" set added after
 *      the Linux 2026.05 audit revealed `User/History/<hash>/*.json`,
 *      `globalStorage/storage.json`, MCP tool descriptors, and per-agent
 *      tool-output mirrors were each minting thousands of ghost rows.
 *      `agent-transcripts/` is handled by a dedicated transcript reader
 *      so we skip it during the JSON walk too — see
 *      {@link readTranscriptRecords}.
 */
const SKIP_DIR_NAMES = new Set([
  "node_modules",
  "cache",
  "plugins",
  ".git",
  "bin",
  "logs",
  "Cache",
  "Cache_Data",
  "GPUCache",
  "Code Cache",
  "DawnGraphiteCache",
  "DawnWebGPUCache",
  "Crashpad",
  "Local Storage",
  "Session Storage",
  "IndexedDB",
  "Service Worker",
  "blob_storage",
  // Editor / VS Code state that is not agent state.
  "User",
  "History",
  "workspaceStorage",
  "globalStorage",
  "snapshots",
  "CachedData",
  "CachedExtensionVSIXs",
  "CachedConfigurations",
  "process-monitor",
  // Per-agent tool-output / terminal mirrors and MCP descriptors. None
  // of these contain session records; the JSON walker used to scoop
  // them all up before the strong-key guard landed.
  "mcps",
  "agent-tools",
  "terminals",
  "sdk-agent-store",
  "agent-transcripts",
]);

const SKIP_FILE_NAMES = new Set([
  "plugin.json",
  "marketplace.json",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.base.json",
  ".eslintrc.json",
  "settings.json",
]);

/**
 * Walk a directory tree (bounded depth) and yield every JSON file path. Used
 * to find session metadata regardless of the exact layout Cursor chose. Common
 * non-session directories and configuration files are skipped so we do not
 * accidentally treat an editor settings file or a plugin manifest as an agent
 * session.
 */
async function walkJson(
  fs: FsLike,
  root: string,
  depth: number,
  results: string[],
): Promise<void> {
  if (depth < 0) return;
  let entries: string[];
  try {
    entries = await fs.readdir(root);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIR_NAMES.has(entry)) continue;
    const full = join(root, entry);
    let stat;
    try {
      stat = await fs.stat(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      await walkJson(fs, full, depth - 1, results);
    } else if (
      stat.isFile() &&
      (entry.endsWith(".json") || entry.endsWith(".jsonl")) &&
      !SKIP_FILE_NAMES.has(entry)
    ) {
      results.push(full);
    }
  }
}

/**
 * Read every JSON or JSONL session file under the given roots. JSONL files
 * are treated as a series of records and merged - last write wins per id.
 *
 * Files that fail to parse are skipped silently.
 */
export async function readSessionRecords(
  fs: FsLike,
  roots: string[],
  kind: AgentKind,
  diagnostics: string[],
  maxDepth = 4,
): Promise<SessionRecord[]> {
  const files: string[] = [];
  for (const root of roots) {
    if (!(await fs.exists(root))) {
      diagnostics.push(`missing: ${root} (kind=${kind})`);
      continue;
    }
    await walkJson(fs, root, maxDepth, files);
  }

  const byId = new Map<string, SessionRecord>();
  for (const file of files) {
    let text: string;
    try {
      text = await fs.readFile(file, "utf8");
    } catch (err) {
      diagnostics.push(`unreadable: ${file} (${(err as Error).message})`);
      continue;
    }

    if (file.endsWith(".jsonl")) {
      for (const line of text.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        try {
          const rec = recordFromJson(JSON.parse(t), file, kind);
          if (rec) byId.set(rec.id, rec);
        } catch {
          /* skip malformed line */
        }
      }
    } else {
      try {
        const parsed = JSON.parse(text) as unknown;
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            const rec = recordFromJson(item, file, kind);
            if (rec) byId.set(rec.id, rec);
          }
        } else {
          const rec = recordFromJson(parsed, file, kind);
          if (rec) byId.set(rec.id, rec);
        }
      } catch {
        /* skip malformed file */
      }
    }
  }

  return Array.from(byId.values());
}

export interface ReadTranscriptOptions {
  /**
   * Drop transcript files whose last-modified timestamp is older than
   * `now() - maxAgeMs`. The default is `Infinity` (keep everything),
   * but cli.ts passes a 24-hour cap so the live view does not drown
   * the user in historical chats.
   */
  maxAgeMs?: number;
  /**
   * Override `Date.now()` for tests so status derivation is
   * deterministic.
   */
  now?: () => number;
}

/**
 * Walk every `~/.cursor/projects/<workspace>/agent-transcripts/` root
 * and emit one {@link SessionRecord} per transcript file:
 *
 *   * `<uuid>/<uuid>.jsonl` → parent agent record (kind="ide")
 *   * `<uuid>/subagents/<sub-uuid>.jsonl` → subagent (kind="subagent",
 *     parentId set to the enclosing parent UUID)
 *
 * Unlike {@link readSessionRecords}, this function treats the FILE as
 * the unit of identity — each transcript represents exactly one agent
 * session even though it holds many message events. The transcript
 * filename (a UUID) is the agent id; the directory name is the
 * workspace slug.
 *
 * Status is derived from the file's mtime:
 *   * mtime within 60 s   → "running" (transcript is actively appended)
 *   * mtime within 5 min  → "idle"
 *   * older               → "done"
 *
 * Files older than `opts.maxAgeMs` are dropped entirely so the live
 * view only surfaces recently-active chats.
 *
 * We do not parse the message bodies here — see `tailJsonlMessages` in
 * `logs.ts` for that. The transcript is wired in as the agent's
 * `logPath`, so the renderer tails the last N messages on demand.
 */
export async function readTranscriptRecords(
  fs: FsLike,
  roots: string[],
  diagnostics: string[],
  opts: ReadTranscriptOptions = {},
): Promise<SessionRecord[]> {
  const now = opts.now ? opts.now() : Date.now();
  const maxAgeMs = opts.maxAgeMs ?? Number.POSITIVE_INFINITY;
  const records: SessionRecord[] = [];
  for (const root of roots) {
    if (!(await fs.exists(root))) {
      diagnostics.push(`missing: ${root} (kind=transcript)`);
      continue;
    }
    let entries: string[];
    try {
      entries = await fs.readdir(root);
    } catch {
      continue;
    }
    for (const dirName of entries) {
      const agentDir = join(root, dirName);
      let dirStat;
      try {
        dirStat = await fs.stat(agentDir);
      } catch {
        continue;
      }
      if (!dirStat.isDirectory()) continue;
      const parentFile = join(agentDir, `${dirName}.jsonl`);
      let parentStat;
      try {
        parentStat = await fs.stat(parentFile);
      } catch {
        parentStat = null;
      }
      if (parentStat && parentStat.isFile()) {
        const ageMs = now - parentStat.mtimeMs;
        if (ageMs <= maxAgeMs) {
          // Transcripts are minted as kind="agent" (the chat session
          // running inside an IDE window). The collector's
          // reparentTranscriptChats step then hangs each `agent` row
          // under its owning Cursor IDE PID so the UI shows the
          // process → agent → subagent ladder.
          records.push(buildTranscriptRecord({
            id: dirName,
            parentId: null,
            kind: "agent",
            file: parentFile,
            mtimeMs: parentStat.mtimeMs,
            now,
          }));
        }
      }
      const subagentsDir = join(agentDir, "subagents");
      let subEntries: string[] = [];
      try {
        subEntries = await fs.readdir(subagentsDir);
      } catch {
        subEntries = [];
      }
      for (const subFile of subEntries) {
        if (!subFile.endsWith(".jsonl")) continue;
        const subFull = join(subagentsDir, subFile);
        let subStat;
        try {
          subStat = await fs.stat(subFull);
        } catch {
          continue;
        }
        if (!subStat.isFile()) continue;
        const ageMs = now - subStat.mtimeMs;
        if (ageMs > maxAgeMs) continue;
        const subId = subFile.replace(/\.jsonl$/, "");
        records.push(buildTranscriptRecord({
          id: subId,
          parentId: dirName,
          kind: "subagent",
          file: subFull,
          mtimeMs: subStat.mtimeMs,
          now,
        }));
      }
    }
  }
  return records;
}

interface TranscriptRecordInput {
  id: string;
  parentId: string | null;
  kind: AgentKind;
  file: string;
  mtimeMs: number;
  now: number;
}

// Cursor flushes per-agent transcripts periodically (~5–30 min for an
// actively-running chat, much less often once the user moves on). The
// thresholds below are tuned to that cadence so the "running" badge
// only shows up for genuinely-live agents.
const STATUS_RUNNING_MS = 5 * 60_000;
const STATUS_IDLE_MS = 30 * 60_000;

function buildTranscriptRecord(input: TranscriptRecordInput): SessionRecord {
  // The transcript directory chain encodes the workspace: the file path
  // looks like `<…>/projects/<workspace-slug>/agent-transcripts/<uuid>/<…>`.
  // Surface the workspace slug as `repo` so the user can tell which
  // workspace an agent belongs to without opening the file.
  const workspaceSlug = extractWorkspaceSlug(input.file);
  const ageMs = Math.max(0, input.now - input.mtimeMs);
  let status: AgentStatus = "done";
  if (ageMs <= STATUS_RUNNING_MS) status = "running";
  else if (ageMs <= STATUS_IDLE_MS) status = "idle";
  // Subs are always called "Task"; parent transcripts are "chat" to
  // hint that the row represents a user-driven IDE chat session
  // (rendered with the `[AGENT]` badge).
  const defaultLabel = input.kind === "subagent" ? "Task" : "chat";
  return {
    id: input.id,
    parentId: input.parentId,
    kind: input.kind,
    pid: null,
    label: defaultLabel,
    title: "",
    model: null,
    repo: workspaceSlug,
    startedAt: input.mtimeMs,
    status,
    logPath: input.file,
    sourcePath: input.file,
  };
}

function extractWorkspaceSlug(file: string): string | null {
  // .../<workspace-slug>/agent-transcripts/<uuid>/<…>
  const parts = file.split("/");
  const idx = parts.lastIndexOf("agent-transcripts");
  if (idx <= 0) return null;
  return parts[idx - 1] ?? null;
}

