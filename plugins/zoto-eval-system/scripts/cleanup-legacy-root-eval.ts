#!/usr/bin/env tsx
/**
 * Remove legacy lean-mode artefacts stamped at the repo root before eval-home layout.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const EVAL_SCRIPT_PREFIX = "eval";

export interface CleanupLegacyRootEvalResult {
  removedBridge: boolean;
  removedScripts: string[];
  removedDevDeps: string[];
}

export function cleanupLegacyRootEvalScaffolding(
  repoRoot: string,
  dryRun = false,
): CleanupLegacyRootEvalResult {
  const root = resolve(repoRoot);
  const bridgePath = join(root, "scripts", "eval-bridge.ts");
  let removedBridge = false;
  const removedScripts: string[] = [];
  const removedDevDeps: string[] = [];

  if (existsSync(bridgePath)) {
    if (!dryRun) rmSync(bridgePath, { force: true });
    removedBridge = true;
  }

  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) {
    return { removedBridge, removedScripts, removedDevDeps };
  }

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  if (pkg.scripts) {
    for (const key of Object.keys(pkg.scripts)) {
      if (key === EVAL_SCRIPT_PREFIX || key.startsWith(`${EVAL_SCRIPT_PREFIX}:`)) {
        removedScripts.push(key);
        delete pkg.scripts[key];
      }
    }
  }

  if (pkg.devDependencies) {
    for (const dep of ["dotenv", "tsx"] as const) {
      if (dep in pkg.devDependencies) {
        removedDevDeps.push(dep);
        delete pkg.devDependencies[dep];
      }
    }
    if (Object.keys(pkg.devDependencies).length === 0) {
      delete pkg.devDependencies;
    }
  }

  if (!dryRun && (removedScripts.length > 0 || removedDevDeps.length > 0)) {
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
  }

  return { removedBridge, removedScripts, removedDevDeps };
}
