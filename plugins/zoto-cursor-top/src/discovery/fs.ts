/**
 * Real-filesystem adapter that satisfies {@link FsLike}. Kept in its own
 * module so tests can swap it for an in-memory stub without pulling in
 * `node:fs`.
 */

import { promises as nodeFs } from "node:fs";
import type { FsLike } from "../types.js";

export const realFs: FsLike = {
  readdir: (path) => nodeFs.readdir(path),
  readFile: (path, enc) => nodeFs.readFile(path, enc),
  stat: async (path) => {
    const s = await nodeFs.stat(path);
    return {
      isDirectory: () => s.isDirectory(),
      isFile: () => s.isFile(),
      mtimeMs: s.mtimeMs,
      size: s.size,
    };
  },
  exists: async (path) => {
    try {
      await nodeFs.access(path);
      return true;
    } catch {
      return false;
    }
  },
};
