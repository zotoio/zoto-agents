/**
 * Ensure Ink/React runtime deps exist beside a synced or installed cursor-top tree.
 *
 * Uses npm (not pnpm) because install targets live outside the monorepo workspace.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * @param {string} installDir
 * @returns {boolean}
 */
export function needsRuntimeDeps(installDir) {
  const pkg = join(installDir, "package.json");
  if (!existsSync(pkg)) return false;
  return !existsSync(join(installDir, "node_modules", "react"));
}

/**
 * @param {string} installDir
 * @param {{ silent?: boolean }} [options]
 * @returns {{ installed: boolean, reason?: string, error?: string }}
 */
export function ensureRuntimeDeps(installDir, options = {}) {
  const silent = options.silent ?? true;
  if (!needsRuntimeDeps(installDir)) {
    return { installed: false, reason: "present" };
  }
  const pkg = join(installDir, "package.json");
  if (!existsSync(pkg)) {
    return { installed: false, reason: "no-package-json" };
  }
  try {
    const flags = "--omit=dev --no-audit --no-fund" + (silent ? " --silent" : "");
    execSync(`npm install ${flags}`, {
      cwd: installDir,
      stdio: silent ? "ignore" : "inherit",
    });
    return { installed: true };
  } catch (err) {
    return { installed: false, reason: "failed", error: err.message };
  }
}
