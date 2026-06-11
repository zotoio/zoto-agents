/**
 * Resolve concrete model slugs from Cursor hook service logs.
 *
 * When the model picker is set to "default", `state.vscdb` often stores
 * `modelConfig.modelName = "default"` even though hook payloads record the
 * routed slug (`composer-2.5`, `claude-4-sonnet-thinking`, …) alongside
 * `conversation_id` / `session_id`.
 */

import { join } from "node:path";
import type { FsLike } from "../types.js";
import { isPlaceholderModelSlug } from "./model-slug.js";

/** Bytes read from the tail of the newest hook log (INPUT blocks are near the end). */
export const HOOK_LOG_WINDOW_BYTES = 512 * 1024;

const CONVERSATION_MODEL_RE =
  /"(?:conversation_id|session_id)":\s*"([A-Za-z0-9-]+)"[\s\S]*?"model":\s*"([^"]+)"/g;

export interface HookLogCacheEntry {
  path: string;
  mtimeMs: number;
  size: number;
  models: Map<string, string>;
}

/**
 * Parse hook-log text for `(conversation_id|session_id) → model` pairs.
 * Later matches win so the map reflects the most recent routing decision.
 */
export function parseHookLogModels(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const match of text.matchAll(CONVERSATION_MODEL_RE)) {
    const id = match[1]?.trim();
    const model = match[2]?.trim();
    if (!id || !model || isPlaceholderModelSlug(model)) continue;
    out.set(id, model);
  }
  return out;
}

async function findNewestHookLog(
  logRoots: readonly string[],
  fs: FsLike,
): Promise<{ path: string; mtimeMs: number; size: number } | null> {
  let best: { path: string; mtimeMs: number; size: number } | null = null;
  for (const root of logRoots) {
    if (!(await fs.exists(root))) continue;
    let sessions: string[];
    try {
      sessions = await fs.readdir(root);
    } catch {
      continue;
    }
    for (const session of sessions) {
      const windowRoot = join(root, session, "window1");
      let outputs: string[];
      try {
        outputs = await fs.readdir(windowRoot);
      } catch {
        continue;
      }
      for (const outputDir of outputs) {
        if (!outputDir.startsWith("output_")) continue;
        const outputPath = join(windowRoot, outputDir);
        let files: string[];
        try {
          files = await fs.readdir(outputPath);
        } catch {
          continue;
        }
        for (const name of files) {
          if (!name.startsWith("cursor.hooks")) continue;
          const hookPath = join(outputPath, name);
          let st;
          try {
            st = await fs.stat(hookPath);
          } catch {
            continue;
          }
          if (!st.isFile()) continue;
          if (!best || st.mtimeMs > best.mtimeMs) {
            best = { path: hookPath, mtimeMs: st.mtimeMs, size: st.size };
          }
        }
      }
    }
  }
  return best;
}

/**
 * Read resolved model slugs for the requested chat ids from the newest hook
 * log under `logRoots`. Returns only entries whose ids were requested.
 */
export async function readHookLogModels(
  logRoots: readonly string[],
  ids: readonly string[],
  fs: FsLike,
  cache?: HookLogCacheEntry | null,
): Promise<Map<string, string>> {
  const wanted = new Set(ids);
  if (wanted.size === 0 || logRoots.length === 0) return new Map();

  const file = await findNewestHookLog(logRoots, fs);
  if (!file) return new Map();

  if (
    cache &&
    cache.path === file.path &&
    cache.mtimeMs === file.mtimeMs &&
    cache.size === file.size
  ) {
    return filterHookMap(cache.models, wanted);
  }

  try {
    const readLen = Math.min(file.size, HOOK_LOG_WINDOW_BYTES);
    const buffer = await fs.readWindow(file.path, file.size - readLen, readLen);
    const parsed = parseHookLogModels(buffer.toString("utf8"));
    if (cache) {
      cache.path = file.path;
      cache.mtimeMs = file.mtimeMs;
      cache.size = file.size;
      cache.models = parsed;
    }
    return filterHookMap(parsed, wanted);
  } catch {
    return new Map();
  }
}

function filterHookMap(
  source: Map<string, string>,
  wanted: Set<string>,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const id of wanted) {
    const model = source.get(id);
    if (model) out.set(id, model);
  }
  return out;
}
