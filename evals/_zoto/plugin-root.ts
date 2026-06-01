// _meta.generated: true
/**
 * Resolves the installed zoto-eval-system plugin root for lean host repos.
 *
 * Stamped at `<host-repo>/evals/_zoto/plugin-root.ts` by
 * `plugins/zoto-eval-system/scripts/stamp-unified-llm-harness.ts`.
 *
 * Precedence mirrors `src/paths.ts#resolvePluginRoot`:
 *   1. `<repo>/plugins/zoto-eval-system`
 *   2. `ZOTO_EVAL_PLUGIN_ROOT`
 *   3. Cursor install dir (`~/.cursor/plugins/...`)
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const PLUGIN_DIR = "zoto-eval-system";

function hasPluginMarkers(root: string): boolean {
  return (
    existsSync(join(root, "templates")) || existsSync(join(root, "engine"))
  );
}

function cursorPluginsBases(): string[] {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    return appData ? [join(appData, "Cursor", "plugins")] : [];
  }
  return [join(homedir(), ".cursor", "plugins")];
}

function parseSemver(version: string): [number, number, number] | null {
  const m = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function readPackageVersion(pluginRoot: string): string | null {
  const pkgPath = join(pluginRoot, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: unknown };
    return typeof pkg.version === "string" ? pkg.version : null;
  } catch {
    return null;
  }
}

function pickBestCursorCandidate(candidates: string[]): string {
  type Scored = {
    path: string;
    semver: [number, number, number] | null;
    mtime: number;
  };

  const scored: Scored[] = candidates.map((path) => ({
    path,
    semver: (() => {
      const ver = readPackageVersion(path);
      return ver ? parseSemver(ver) : null;
    })(),
    mtime: statSync(path).mtimeMs,
  }));

  const withSemver = scored.filter((s) => s.semver !== null);
  const pool = withSemver.length > 0 ? withSemver : scored;
  pool.sort((a, b) => {
    if (a.semver && b.semver) {
      for (let i = 0; i < 3; i++) {
        if (a.semver[i] !== b.semver[i]) return b.semver[i]! - a.semver[i]!;
      }
    }
    return b.mtime - a.mtime;
  });
  return pool[0]!.path;
}

function collectCursorPluginCandidates(base: string): string[] {
  const found: string[] = [];
  const direct = join(base, PLUGIN_DIR);
  if (hasPluginMarkers(direct)) found.push(resolve(direct));
  if (!existsSync(base)) return found;
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const nested = join(base, entry.name, PLUGIN_DIR);
    if (hasPluginMarkers(nested)) found.push(resolve(nested));
  }
  return found;
}

export function resolveHostRepoRoot(startDir: string = process.cwd()): string {
  let dir = resolve(startDir);
  for (;;) {
    if (existsSync(join(dir, ".zoto", "eval-system", "config.yml"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return resolve(startDir);
    }
    dir = parent;
  }
}

export function resolvePluginRootSync(): string {
  const root = resolveHostRepoRoot();

  const monorepo = join(root, "plugins", PLUGIN_DIR);
  if (hasPluginMarkers(monorepo)) return resolve(monorepo);

  const envRoot = process.env.ZOTO_EVAL_PLUGIN_ROOT?.trim();
  if (envRoot && hasPluginMarkers(envRoot)) return resolve(envRoot);

  const candidates: string[] = [];
  for (const base of cursorPluginsBases()) {
    candidates.push(...collectCursorPluginCandidates(base));
  }
  if (candidates.length > 0) {
    return pickBestCursorCandidate(candidates);
  }

  throw new Error(
    "Cannot resolve zoto-eval-system plugin. Set ZOTO_EVAL_PLUGIN_ROOT or install the plugin.",
  );
}

export const repoRoot = resolveHostRepoRoot();
export const pluginRoot = resolvePluginRootSync();
export const evalEngineRoot = join(pluginRoot, "engine");
