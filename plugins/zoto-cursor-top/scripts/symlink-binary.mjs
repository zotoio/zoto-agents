/**
 * Create or refresh ~/.local/bin/cursor-top → installed binary wrapper.
 *
 * Shared by install-local.ts (marketplace/init install) and sync-plugins.mjs
 * (monorepo dev sync to ~/.cursor/plugins/local/).
 */

import { existsSync, lstatSync, mkdirSync, symlinkSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

export const BINARY_NAME = "cursor-top";

/** Default PATH drop directory: ~/.local/bin (XDG). */
export function defaultBinDir() {
  return join(homedir(), ".local", "bin");
}

/**
 * @param {string} installedBinaryPath absolute path to bin/cursor-top.mjs
 * @param {{ binDir?: string, dryRun?: boolean }} [options]
 * @returns {{ ok: boolean, linkPath: string, target: string, dryRun?: boolean, reason?: string }}
 */
export function symlinkCursorTop(installedBinaryPath, options = {}) {
  const binDir = options.binDir ?? defaultBinDir();
  const dryRun = options.dryRun ?? false;
  const target = resolve(installedBinaryPath);
  const linkPath = join(binDir, BINARY_NAME);

  if (!existsSync(target)) {
    return { ok: false, reason: "binary-missing", linkPath, target };
  }

  if (dryRun) {
    return { ok: true, dryRun: true, linkPath, target };
  }

  mkdirSync(binDir, { recursive: true });

  let existing = null;
  try {
    existing = lstatSync(linkPath);
  } catch {
    /* not present */
  }

  if (existing) {
    if (existing.isSymbolicLink() || existing.isFile()) {
      unlinkSync(linkPath);
    } else {
      return { ok: false, reason: "link-path-blocked", linkPath, target };
    }
  }

  symlinkSync(target, linkPath);
  return { ok: true, linkPath, target };
}
