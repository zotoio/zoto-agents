#!/usr/bin/env tsx
/**
 * Ensure native addons required by the eval-system plugin are built.
 *
 * pnpm v10 may skip lifecycle scripts unless the package is listed in
 * `pnpm.onlyBuiltDependencies`. When sqlite3's binding is missing, LLM
 * evals fail at import time with "Could not locate the bindings file".
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SQLITE_BINDING_CANDIDATES = [
  "build/Release/node_sqlite3.node",
  "build/node_sqlite3.node",
  "lib/binding/node-v127-linux-x64/node_sqlite3.node",
] as const;

export function findSqlite3PackageDir(pluginRoot: string): string | null {
  const direct = join(pluginRoot, "node_modules", "sqlite3");
  if (existsSync(join(direct, "package.json"))) return direct;

  const pnpmDir = join(pluginRoot, "node_modules", ".pnpm");
  if (!existsSync(pnpmDir)) return null;

  for (const entry of readdirSync(pnpmDir)) {
    if (!entry.startsWith("sqlite3@")) continue;
    const candidate = join(pnpmDir, entry, "node_modules", "sqlite3");
    if (existsSync(join(candidate, "package.json"))) return candidate;
  }
  return null;
}

export function sqlite3BindingPresent(sqlite3Dir: string): boolean {
  return SQLITE_BINDING_CANDIDATES.some((rel) =>
    existsSync(join(sqlite3Dir, rel)),
  );
}

export interface EnsureNativeDepsOptions {
  pluginRoot: string;
  dryRun?: boolean;
}

export interface EnsureNativeDepsResult {
  sqlite3Dir: string | null;
  sqlite3Built: boolean;
  attempted: boolean;
  exitCode: number;
}

export function ensureNativeDeps(
  opts: EnsureNativeDepsOptions,
): EnsureNativeDepsResult {
  const sqlite3Dir = findSqlite3PackageDir(opts.pluginRoot);
  if (!sqlite3Dir) {
    return {
      sqlite3Dir: null,
      sqlite3Built: false,
      attempted: false,
      exitCode: 0,
    };
  }

  if (sqlite3BindingPresent(sqlite3Dir)) {
    return {
      sqlite3Dir,
      sqlite3Built: true,
      attempted: false,
      exitCode: 0,
    };
  }

  if (opts.dryRun) {
    return {
      sqlite3Dir,
      sqlite3Built: false,
      attempted: true,
      exitCode: 0,
    };
  }

  const r = spawnSync("npm", ["run", "install", "--ignore-scripts=false"], {
    cwd: sqlite3Dir,
    stdio: "inherit",
    shell: false,
  });
  const built = sqlite3BindingPresent(sqlite3Dir);
  return {
    sqlite3Dir,
    sqlite3Built: built,
    attempted: true,
    exitCode: r.status ?? 1,
  };
}

if (process.argv[1]?.endsWith("ensure-native-deps.ts")) {
  const pluginRootIdx = process.argv.indexOf("--plugin-root");
  const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const pluginRoot =
    pluginRootIdx >= 0 ? process.argv[pluginRootIdx + 1]! : defaultRoot;
  const dryRun = process.argv.includes("--dry-run");
  const result = ensureNativeDeps({ pluginRoot, dryRun });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.sqlite3Built && result.attempted && result.exitCode !== 0) {
    process.exit(result.exitCode);
  }
  if (!result.sqlite3Built && result.sqlite3Dir) {
    console.error(
      "[zoto-eval] sqlite3 native binding still missing after npm run install",
    );
    process.exit(1);
  }
}
