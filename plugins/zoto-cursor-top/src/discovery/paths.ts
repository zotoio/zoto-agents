/**
 * Platform-aware resolution of the directories where Cursor stores its
 * agent session data and logs.
 *
 * All paths are advisory; callers must tolerate missing directories because
 * the layout varies by Cursor version and which surfaces (IDE / CLI / Cloud)
 * the user has actually run. Unexpected missing roots are surfaced via the
 * collector's `diagnostics` array (see `readSessionRecords`). Known-absent
 * legacy JSON roots are still walked but omit `missing:` noise — see
 * {@link isSilentOptionalSessionRoot}.
 *
 * Linux note: Cursor 2026.05 moved per-agent state into SQLite databases
 * (`~/.cursor/chats/<hash>/<chat-uuid>/store.db`,
 * `~/.cursor/projects/<ws>/sdk-agent-store/<hash>/index.db`,
 * `~/.config/Cursor/User/workspaceStorage/<hash>/state.vscdb`). The JSON
 * walker can't reach those today — see the upstream issue list in
 * `README.md`. As a stop-gap, the per-agent JSONL message-streams under
 * `~/.cursor/projects/<ws>/agent-transcripts/` are surfaced through
 * {@link CursorPaths.agentTranscriptRoots} and parsed by
 * `readTranscriptRecords()` — one row per agent, with the transcript
 * itself wired in as the log source.
 */

import { homedir, platform } from "node:os";
import { join } from "node:path";

export interface CursorPaths {
  /** Per-user roots where session metadata can live. */
  dataRoots: string[];
  /** Per-user roots where log files can live. */
  logRoots: string[];
  /**
   * Root of CLI session storage; usually a single directory but we model it
   * as an array to keep parity with the others.
   */
  cliSessionRoots: string[];
  /**
   * Root of the cloud-agent / VM workspace mirror, used inside Cloud Agent
   * VMs to surface in-flight agents.
   */
  cloudProjectRoots: string[];
  /**
   * Roots of `~/.cursor/projects/<ws>/agent-transcripts/` for every
   * workspace this user has touched. Each entry is the `agent-transcripts`
   * directory for one workspace — populated dynamically because workspaces
   * come and go.
   */
  agentTranscriptRoots: string[];
}

export function resolveCursorPaths(
  home: string = homedir(),
  os: NodeJS.Platform = platform(),
): CursorPaths {
  const dataRoots: string[] = [];
  const logRoots: string[] = [];
  const cliSessionRoots: string[] = [];
  const cloudProjectRoots: string[] = [];

  if (os === "darwin") {
    const appSupport = join(home, "Library", "Application Support", "Cursor");
    dataRoots.push(appSupport);
    logRoots.push(join(appSupport, "logs"));
    logRoots.push(join(home, "Library", "Logs", "Cursor"));
  } else if (os === "win32") {
    const appData = process.env.APPDATA ?? join(home, "AppData", "Roaming");
    const cursor = join(appData, "Cursor");
    dataRoots.push(cursor);
    logRoots.push(join(cursor, "logs"));
  } else {
    dataRoots.push(join(home, ".config", "Cursor"));
    logRoots.push(join(home, ".config", "Cursor", "logs"));
  }

  const dotCursor = join(home, ".cursor");
  // Legacy: pre-2026 Cursor builds wrote flat JSON session records here.
  // Kept for cross-version compatibility even though Linux 2026.05
  // creates none of them on most installs.
  dataRoots.push(join(dotCursor, "agents"));
  dataRoots.push(join(dotCursor, "sessions"));
  cliSessionRoots.push(join(dotCursor, "cli", "chats"));
  cliSessionRoots.push(join(dotCursor, "cli", "sessions"));
  cliSessionRoots.push(join(dotCursor, "sessions"));
  cloudProjectRoots.push(join(dotCursor, "projects"));

  // agentTranscriptRoots is left empty here; the collector populates it
  // at scan time by listing `~/.cursor/projects/<ws>/agent-transcripts/`
  // for every workspace it finds. We can't enumerate eagerly without an
  // FS handle, and resolveCursorPaths is intentionally synchronous.
  const agentTranscriptRoots: string[] = [];

  return {
    dataRoots,
    logRoots,
    cliSessionRoots,
    cloudProjectRoots,
    agentTranscriptRoots,
  };
}

const SILENT_OPTIONAL_CURSOR_SUFFIXES = [
  "agents",
  "sessions",
  "cli/chats",
  "cli/sessions",
] as const;

/**
 * Legacy flat-JSON session roots that modern Cursor often omits. We still
 * walk them when present but skip `missing:` diagnostics when absent.
 */
export function isSilentOptionalSessionRoot(root: string): boolean {
  const normalized = root.replace(/\\/g, "/");
  const marker = "/.cursor/";
  const idx = normalized.indexOf(marker);
  if (idx === -1) return false;
  const suffix = normalized.slice(idx + marker.length);
  return (SILENT_OPTIONAL_CURSOR_SUFFIXES as readonly string[]).includes(
    suffix,
  );
}

export function pushMissingSessionRootDiagnostic(
  diagnostics: string[],
  root: string,
  kind: string,
): void {
  if (isSilentOptionalSessionRoot(root)) return;
  diagnostics.push(`missing: ${root} (kind=${kind})`);
}
