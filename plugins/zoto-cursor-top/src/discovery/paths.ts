/**
 * Platform-aware resolution of the directories where Cursor stores its
 * agent session data and logs.
 *
 * All paths are advisory; callers must tolerate missing directories because
 * the layout varies by Cursor version and which surfaces (IDE / CLI / Cloud)
 * the user has actually run.
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
  dataRoots.push(join(dotCursor, "agents"));
  dataRoots.push(join(dotCursor, "sessions"));
  cliSessionRoots.push(join(dotCursor, "cli", "chats"));
  cliSessionRoots.push(join(dotCursor, "cli", "sessions"));
  cliSessionRoots.push(join(dotCursor, "sessions"));
  cloudProjectRoots.push(join(dotCursor, "projects"));

  return { dataRoots, logRoots, cliSessionRoots, cloudProjectRoots };
}
