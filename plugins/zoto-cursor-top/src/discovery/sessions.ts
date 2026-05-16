/**
 * Parse the on-disk session metadata Cursor writes for the IDE, the
 * `cursor-agent` CLI, and Cloud Agent VMs.
 *
 * The on-disk layout is not a stable public contract, so we tolerate every
 * file shape we have observed and fall back to "unknown" fields rather than
 * crashing.
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
 * Map a parsed JSON record (from any of the known session layouts) to a
 * {@link SessionRecord}. Returns null when the JSON is too malformed to use.
 */
export function recordFromJson(
  raw: unknown,
  sourcePath: string,
  kind: AgentKind,
): SessionRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

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
    if (!(await fs.exists(root))) continue;
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
