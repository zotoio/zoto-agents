/**
 * Extract chat-model selections from Cursor's `globalStorage/state.vscdb`.
 *
 * Cursor's IDE persists per-chat state in
 * `<app-data>/User/globalStorage/state.vscdb`, table `cursorDiskKV`,
 * keyed `composerData:<chat-uuid>`. The value is a JSON blob whose
 * `.modelConfig.modelName` field stores the model picker selection
 * (`claude-opus-4-7`, `composer-2.5-fast`, etc.). Subagent UUIDs that
 * appear under `~/.cursor/projects/<ws>/agent-transcripts/<uuid>/subagents/`
 * ALSO get their own `composerData:` row, so the same lookup populates
 * the MODEL column for `[AGENT]` chats and their `[SUB]` children
 * without further wiring.
 *
 * We can't open the DB with `node:fs` because Cursor keeps it open in
 * WAL mode. The small `sqlite3` CLI ships on macOS and most Linux
 * distros by default and is the lowest-friction way to get a
 * consistent read. Errors (missing binary, missing DB, locked
 * database, JSON parse failures) are swallowed — the renderer falls
 * back to the existing `-` placeholder so the UI never crashes
 * because the model lookup hiccuped.
 *
 * The query is bounded by a caller-supplied list of chat UUIDs and
 * inlined into a `key IN (...)` clause. We MUST scope the SELECT this
 * way because `cursorDiskKV` is the primary store for every Cursor
 * IDE setting and can grow to multiple GB with thousands of
 * historical chats; a full `LIKE 'composerData:%'` scan against the
 * 4 GB-class real-world DB took ~14 s, which would blow the refresh
 * tick. With an `IN` clause the PRIMARY KEY index drops the query
 * to ~10 ms regardless of database size.
 *
 * IDs are validated against a conservative `[A-Za-z0-9._-]` charset
 * before they enter the SQL string so the inlined IN clause is safe
 * even though we don't use bound parameters.
 */

import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * UUIDs (and the rare custom chat id) Cursor emits use this charset.
 * Anything outside it is dropped before we splice into SQL so the
 * inlined IN clause cannot become an injection vector.
 */
const SAFE_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export interface ComposerModelRunnerArgs {
  dbPath: string;
  sql: string;
}

/**
 * Function that runs the SQL query against the state DB and returns
 * the raw stdout. Stubbed in tests so we can assert end-to-end without
 * spawning a real `sqlite3` process.
 */
export type ComposerModelRunner = (
  args: ComposerModelRunnerArgs,
) => Promise<string>;

export const defaultComposerModelRunner: ComposerModelRunner = async ({
  dbPath,
  sql,
}) => {
  const { stdout } = await execFileAsync(
    "sqlite3",
    ["-readonly", dbPath, sql],
    { maxBuffer: 8 * 1024 * 1024, timeout: 10_000 },
  );
  return stdout;
};

/**
 * Parse the pipe-separated output of {@link buildComposerModelSql} into
 * a map from chat UUID to model slug. Blank lines and lines without a
 * `|` separator are skipped; model names that happen to contain `|`
 * are not possible today (Cursor model slugs are kebab-case strings).
 */
export function parseComposerModelOutput(stdout: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const raw of stdout.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const sep = line.indexOf("|");
    if (sep < 0) continue;
    const id = line.slice(0, sep).trim();
    const model = line.slice(sep + 1).trim();
    if (id && model) out.set(id, model);
  }
  return out;
}

/** Path to `User/globalStorage/state.vscdb` relative to a Cursor data root. */
export function resolveStateDbPath(dataRoot: string): string {
  return join(dataRoot, "User", "globalStorage", "state.vscdb");
}

/**
 * Build the SQL that pulls `(id, model)` pairs for the requested chat
 * UUIDs. Exposed so tests can pin the exact statement we generate.
 *
 * IDs that fail {@link SAFE_ID_PATTERN} are dropped. Returns `null`
 * when no safe ids remain so the caller can short-circuit without
 * spawning sqlite3 at all.
 */
export function buildComposerModelSql(ids: readonly string[]): string | null {
  const safe = ids.filter((id) => SAFE_ID_PATTERN.test(id));
  if (safe.length === 0) return null;
  const keys = safe.map((id) => `'composerData:${id}'`).join(", ");
  return `SELECT
  substr(key, length('composerData:')+1) AS id,
  json_extract(value, '$.modelConfig.modelName') AS model
FROM cursorDiskKV
WHERE key IN (${keys})
  AND json_valid(value)
  AND json_extract(value, '$.modelConfig.modelName') IS NOT NULL;`;
}

export interface ReadComposerModelsOptions {
  /** Override the `sqlite3` invocation; used by tests. */
  runner?: ComposerModelRunner;
  /**
   * Async existence check for the DB file. The collector passes its
   * injected {@link FsLike} so test fixtures with no real filesystem
   * skip the sqlite3 spawn entirely.
   */
  exists?: (path: string) => Promise<boolean>;
}

/**
 * Read the chat-uuid → model map for the requested ids. Returns an
 * empty map when:
 *
 *   * `ids` is empty or none pass the safe-character check,
 *   * the resolved `state.vscdb` does not exist,
 *   * the `sqlite3` binary is not on `$PATH`,
 *   * the query fails for any reason (locked database, JSON parse
 *     error, unexpected schema).
 *
 * Callers should treat the empty map as "no models known" and leave
 * the existing `model: null` defaults on each node.
 */
export async function readComposerModels(
  dataRoot: string,
  ids: readonly string[],
  opts: ReadComposerModelsOptions = {},
): Promise<Map<string, string>> {
  const sql = buildComposerModelSql(ids);
  if (!sql) return new Map();
  const runner = opts.runner ?? defaultComposerModelRunner;
  const dbPath = resolveStateDbPath(dataRoot);
  if (opts.exists && !(await opts.exists(dbPath))) return new Map();
  try {
    const stdout = await runner({ dbPath, sql });
    return parseComposerModelOutput(stdout);
  } catch {
    return new Map();
  }
}
