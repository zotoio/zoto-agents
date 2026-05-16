/**
 * Shared types for the cursor-top discovery layer and TUI.
 */

export type AgentKind =
  | "ide"
  | "cli"
  | "cloud"
  | "subagent"
  | "unknown";

export type AgentStatus =
  | "running"
  | "waiting"
  | "idle"
  | "done"
  | "error"
  | "unknown";

/**
 * Normalised view of one Cursor process or agent (root or sub).
 *
 * The discovery layer produces a flat list of these; the tree builder turns
 * the flat list into a parent/child hierarchy by populating `children`.
 */
export interface AgentNode {
  /** Stable identifier; for OS processes this is the PID as a string. */
  id: string;
  /** Parent identifier or null if this is a root. */
  parentId: string | null;
  /** Where the agent originated. */
  kind: AgentKind;
  /** Numeric PID if known (root agents always have one; subagents may not). */
  pid: number | null;
  /** Short human label used in the first column ("main", "Task(explore)", etc.). */
  label: string;
  /** Long-form title / prompt summary if available. */
  title: string;
  /** Model identifier, e.g. "claude-opus-4.7", or null when unknown. */
  model: string | null;
  /** Repository or working directory the agent runs against. */
  repo: string | null;
  /** Absolute start time as a unix epoch in milliseconds. */
  startedAt: number;
  /** Current status. */
  status: AgentStatus;
  /** Last N log lines, newest last. */
  recentLogs: string[];
  /** Path to the source file the logs were tailed from, if any. */
  logSource: string | null;
  /** Optional list of child IDs populated by the tree builder. */
  children?: string[];
}

/** Snapshot delivered to the UI on each refresh tick. */
export interface AgentSnapshot {
  capturedAt: number;
  /** All nodes keyed by id for O(1) child lookup. */
  nodes: Record<string, AgentNode>;
  /** Top-level (parentless) node ids in display order. */
  roots: string[];
  /** Diagnostic messages, e.g. unreadable paths or permission errors. */
  diagnostics: string[];
}

export interface CollectorOptions {
  /** Lines of log tail kept per agent (default 3). */
  logTailLines?: number;
  /** Override platform detection (used for tests). */
  platform?: NodeJS.Platform;
  /** Override the user's home directory (used for tests). */
  homeDir?: string;
  /** Inject a custom `ps` runner (used for tests). */
  psRunner?: () => Promise<string>;
  /** Inject a filesystem facade (used for tests). */
  fs?: FsLike;
}

/**
 * Narrow subset of `node:fs/promises` we actually need. Tests pass an in-memory
 * stub; production passes the real module.
 */
export interface FsLike {
  readdir(path: string): Promise<string[]>;
  readFile(path: string, enc: "utf8"): Promise<string>;
  stat(path: string): Promise<{
    isDirectory(): boolean;
    isFile(): boolean;
    mtimeMs: number;
    size: number;
  }>;
  exists(path: string): Promise<boolean>;
}
