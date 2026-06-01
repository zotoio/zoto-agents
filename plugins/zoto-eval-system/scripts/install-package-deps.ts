#!/usr/bin/env tsx
/**
 * Install npm dependencies in a directory, preferring pnpm with npm fallback.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { ensureNativeDeps } from "./ensure-native-deps.js";

export interface InstallPackageDepsOptions {
  cwd: string;
  dryRun?: boolean;
  /** Passed to pnpm install (e.g. --ignore-workspace for plugin install). */
  pnpmArgs?: string[];
}

export interface InstallPackageDepsResult {
  cwd: string;
  manager: "pnpm" | "npm" | "skipped";
  exitCode: number;
  attempted: string[];
}

function maybeEnsureNativeDeps(cwd: string): void {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      name?: string;
    };
    if (pkg.name !== "@zoto-agents/zoto-eval-system") return;
  } catch {
    return;
  }
  const pluginRoot = resolve(cwd);
  const result = ensureNativeDeps({ pluginRoot });
  if (!result.sqlite3Built && result.sqlite3Dir) {
    console.warn(
      "[zoto-eval] Warning: sqlite3 native binding still missing after install — LLM evals may fail.",
    );
  }
}

function commandExists(cmd: string): boolean {
  const r = spawnSync("command", ["-v", cmd], { shell: true, encoding: "utf-8" });
  return r.status === 0;
}

export function installPackageDeps(
  opts: InstallPackageDepsOptions,
): InstallPackageDepsResult {
  const pkgPath = join(opts.cwd, "package.json");
  if (!existsSync(pkgPath)) {
    return {
      cwd: opts.cwd,
      manager: "skipped",
      exitCode: 1,
      attempted: ["missing package.json"],
    };
  }

  if (opts.dryRun) {
    return {
      cwd: opts.cwd,
      manager: "skipped",
      exitCode: 0,
      attempted: ["dry-run"],
    };
  }

  const attempted: string[] = [];

  if (commandExists("pnpm")) {
    attempted.push("pnpm");
    const pnpmArgs = ["install", ...(opts.pnpmArgs ?? [])];
    const r = spawnSync("pnpm", pnpmArgs, {
      cwd: opts.cwd,
      stdio: "inherit",
      shell: false,
    });
    if (r.status === 0) {
      maybeEnsureNativeDeps(opts.cwd);
      return { cwd: opts.cwd, manager: "pnpm", exitCode: 0, attempted };
    }
  }

  if (commandExists("npm")) {
    attempted.push("npm");
    const r = spawnSync("npm", ["install"], {
      cwd: opts.cwd,
      stdio: "inherit",
      shell: false,
    });
    const code = r.status ?? 1;
    if (code === 0) {
      maybeEnsureNativeDeps(opts.cwd);
    }
    return {
      cwd: opts.cwd,
      manager: "npm",
      exitCode: code,
      attempted,
    };
  }

  return {
    cwd: opts.cwd,
    manager: "skipped",
    exitCode: 1,
    attempted: [...attempted, "no package manager"],
  };
}

if (process.argv[1]?.endsWith("install-package-deps.ts")) {
  const cwdIdx = process.argv.indexOf("--cwd");
  const cwd = cwdIdx >= 0 ? process.argv[cwdIdx + 1]! : process.cwd();
  const dryRun = process.argv.includes("--dry-run");
  const ignoreWorkspace = process.argv.includes("--ignore-workspace");
  const result = installPackageDeps({
    cwd,
    dryRun,
    pnpmArgs: ignoreWorkspace ? ["--ignore-workspace"] : [],
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.exitCode);
}
