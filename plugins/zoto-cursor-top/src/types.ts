/**
 * Shared types for the cursor-top discovery layer and TUI.
 */

export type AgentKind =
  | "ide"
  | "cli"
  | "cloud"
  /**
   * A chat / agent session hosted inside a Cursor IDE window. Distinct
   * from `"ide"` (the OS process tree) so the TUI can render a separate
   * `[AGENT]` badge and nest these rows under their owning IDE PID.
   */
  | "agent"
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
  /**
   * End instant for the START column. While {@link status} is `running` this
   * is null and elapsed ticks live. For `idle`, `done`, and other non-running
   * rows the UI freezes against this timestamp (transcript mtime, transition
   * time, or last activity).
   */
  elapsedEndAt?: number | null;
  /** Current status. */
  status: AgentStatus;
  /** Last N log lines, newest last. */
  recentLogs: string[];
  /** Path to the source file the logs were tailed from, if any. */
  logSource: string | null;
  /**
   * Context tokens in use for this composer session (`promptTokenBreakdown
   * .totalUsedTokens` from `composerData:<id>` in `state.vscdb`), or null
   * when unknown (process-only rows, missing DB row, lookup failure).
   */
  tokenUsage: number | null;
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
  /**
   * When true, prune any subtree whose root is `kind: "unknown"`. Only
   * processes recognised as Cursor (IDE / CLI / Cloud Agent VM) — and
   * their PID descendants regardless of kind — survive. Equivalent to
   * passing `--cursor-only` on the CLI.
   */
  cursorOnly?: boolean;
  /**
   * When true, keep only nodes that produced readable agent output
   * (`recentLogs.length > 0`) — plus the ancestor chain of any such
   * node so the hierarchy stays navigable. Equivalent to passing
   * `--with-logs` on the CLI.
   *
   * Useful for hiding the dozens of IDE renderer / GPU helper processes
   * that don't drive an agent loop and never write to a session log.
   */
  withLogs?: boolean;
  /**
   * Drop transcript records whose source file was last modified more
   * than `transcriptMaxAgeMs` ago. Defaults to 24 hours so the live
   * view only surfaces recently-active chats; pass `Infinity` (or 0)
   * to disable the cap.
   */
  transcriptMaxAgeMs?: number;
  /**
   * When true (the default), drop any node whose status is `"done"`
   * unless it has a non-done descendant — and recursively drop
   * parents whose surviving subtree contains no active agent. The
   * result is an "active agents only" view.
   *
   * Set to `false` (CLI: `--no-active-only`) to surface completed
   * agents alongside running / waiting / idle ones — useful for
   * post-mortem inspection of a recently-finished chat.
   */
  activeOnly?: boolean;
  /**
   * Inject a custom runner for the composer-model lookup against
   * Cursor's `state.vscdb` (used by tests so we don't spawn a real
   * `sqlite3` child process). Defaults to `defaultComposerModelRunner`.
   */
  composerModelRunner?: import("./discovery/composer-models.js").ComposerModelRunner;
  /**
   * Slow-lane interval for the two-lane refresh cadence: every Nth
   * tick (and tick 1) re-walks session JSON, re-enumerates transcript
   * roots, retries unresolved composer-model ids, and refreshes the
   * slug→path map. Fast ticks stat transcripts and re-tail only changed
   * logs. Default 5.
   */
  slowLaneEvery?: number;
  /** Override `Date.now()` for deterministic tests. */
  now?: () => number;
  /** Max concurrent fs operations during collect fan-out (default 24). */
  fsConcurrency?: number;
  /**
   * Cloud Agents API options. When a `CURSOR_API_KEY` env var is present
   * (or `cloudApi.apiKey` is set), the collector queries the Cursor Cloud
   * Agents REST API on slow-lane ticks to discover remote cloud agents.
   * Set to `false` to disable entirely.
   */
  cloudApi?: import("./discovery/cloud-api.js").CloudApiOptions | false;
}

/**
 * Narrow subset of `node:fs/promises` we actually need. Tests pass an in-memory
 * stub; production passes the real module.
 */
export interface FsLike {
  readdir(path: string): Promise<string[]>;
  readFile(path: string, enc: "utf8"): Promise<string>;
  /**
   * Read `length` bytes starting at `offset`. Used by the log tailer so
   * windowed reads are observable through the injected fs seam.
   */
  readWindow(path: string, offset: number, length: number): Promise<Buffer>;
  stat(path: string): Promise<{
    isDirectory(): boolean;
    isFile(): boolean;
    mtimeMs: number;
    /** File creation time when the host provides it; used as transcript start. */
    birthtimeMs?: number;
    size: number;
  }>;
  exists(path: string): Promise<boolean>;
}
