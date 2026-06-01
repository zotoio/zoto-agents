/**
 * Spawn TypeScript entrypoints via the local `tsx` CLI when available.
 * Avoids nested `pnpm exec tsx`, which surfaces child failures as ELIFECYCLE.
 */
import { spawnSync, type SpawnSyncOptions, type SpawnSyncReturns } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export function resolveTsxCli(...searchRoots: string[]): string | null {
  const seen = new Set<string>();
  for (const root of searchRoots) {
    const base = root.trim();
    if (!base || seen.has(base)) continue;
    seen.add(base);
    const tsxCli = join(base, "node_modules", "tsx", "dist", "cli.mjs");
    if (existsSync(tsxCli)) return tsxCli;
  }
  return null;
}

export interface SpawnTsxOptions {
  scriptPath: string;
  args?: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  stdio?: SpawnSyncOptions["stdio"];
  encoding?: BufferEncoding;
  /** Extra roots to search for tsx before falling back to pnpm exec. */
  searchRoots?: string[];
}

export function spawnTsx(opts: SpawnTsxOptions): SpawnSyncReturns<string | Buffer> {
  const args = opts.args ?? [];
  const searchRoots = [
    ...(opts.searchRoots ?? []),
    opts.cwd,
    process.cwd(),
  ];
  const tsxCli = resolveTsxCli(...searchRoots);
  const base: SpawnSyncOptions = {
    cwd: opts.cwd,
    env: opts.env ?? process.env,
    stdio: opts.stdio ?? "inherit",
    encoding: opts.encoding,
  };

  if (tsxCli) {
    return spawnSync(process.execPath, [tsxCli, opts.scriptPath, ...args], base);
  }

  return spawnSync("pnpm", ["exec", "tsx", opts.scriptPath, ...args], base);
}

export function resolveBinCli(
  binName: string,
  ...searchRoots: string[]
): string | null {
  const seen = new Set<string>();
  for (const root of searchRoots) {
    const base = root.trim();
    if (!base || seen.has(base)) continue;
    seen.add(base);
    const cli = join(base, "node_modules", ".bin", binName);
    if (existsSync(cli)) return cli;
  }
  return null;
}

export interface SpawnBinOptions {
  binName: string;
  args?: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  stdio?: SpawnSyncOptions["stdio"];
  encoding?: BufferEncoding;
  searchRoots?: string[];
}

/** Run a package binary from node_modules/.bin when present (else pnpm exec). */
export function spawnBin(opts: SpawnBinOptions): SpawnSyncReturns<string | Buffer> {
  const args = opts.args ?? [];
  const searchRoots = [
    ...(opts.searchRoots ?? []),
    opts.cwd,
    process.cwd(),
  ];
  const cli = resolveBinCli(opts.binName, ...searchRoots);
  const base: SpawnSyncOptions = {
    cwd: opts.cwd,
    env: opts.env ?? process.env,
    stdio: opts.stdio ?? "inherit",
    encoding: opts.encoding,
  };

  if (cli) {
    return spawnSync(cli, args, { ...base, shell: false });
  }

  return spawnSync("pnpm", ["exec", opts.binName, ...args], base);
}
