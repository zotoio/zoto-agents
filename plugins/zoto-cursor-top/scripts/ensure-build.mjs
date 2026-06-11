/**
 * Run `pnpm run build` for a plugin package before sync/install copies dist/.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * @param {string} pluginRoot
 * @returns {boolean}
 */
export function pluginHasBuildScript(pluginRoot) {
  const pkgPath = join(pluginRoot, "package.json");
  if (!existsSync(pkgPath)) return false;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return typeof pkg.scripts?.build === "string";
  } catch {
    return false;
  }
}

/**
 * @param {string} pluginRoot
 * @param {{ dryRun?: boolean, silent?: boolean, skip?: boolean }} [options]
 * @returns {{ built: boolean, dryRun?: boolean, reason?: string, error?: string }}
 */
export function ensurePluginBuilt(pluginRoot, options = {}) {
  const { dryRun = false, silent = true, skip = false } = options;
  if (skip) return { built: false, reason: "skipped" };
  if (!pluginHasBuildScript(pluginRoot)) {
    return { built: false, reason: "no-build-script" };
  }
  if (dryRun) return { built: false, dryRun: true };
  try {
    execSync("pnpm run build", {
      cwd: pluginRoot,
      stdio: silent ? "ignore" : "inherit",
    });
    return { built: true };
  } catch (err) {
    return {
      built: false,
      reason: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * True when an edited file should trigger a cursor-top rebuild during
 * incremental sync (source or bundler config touched).
 *
 * @param {string} absPath
 * @param {string} pluginRoot
 * @returns {boolean}
 */
export function pathTriggersPluginBuild(absPath, pluginRoot) {
  const rel = relative(pluginRoot, absPath);
  if (!rel || rel.startsWith("..")) return false;
  if (rel === "src" || rel.startsWith(`src${sep}`)) return true;
  return rel === "tsup.config.ts" || rel === "package.json" || rel === "tsconfig.json";
}
