import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import type { EvalSystemConfig, HostLayout } from "./config-loader.js";

const PLUGIN_DIR_NAME = "zoto-eval-system";

/**
 * Host eval install layout.
 *
 * - `plugin` — lean mode; engine/scripts/templates resolve from the installed plugin.
 * - `ejected` — self-contained runtime under `.zoto/eval-system/`.
 */
export type EvalLayoutMode = HostLayout;

export interface EvalPaths {
  /** Git / workspace root (primitive discovery, `.cursor/`, `.env`). */
  repoRoot: string;
  /** Directory containing `config.yml` (typically `<repo>/.zoto/eval-system`). */
  evalHome: string;
  /** Detected install layout. */
  layout: EvalLayoutMode;
  /** Configured evalsDir segment (relative to eval home in ejected mode, often `"evals"`). */
  evalsDirConfig: string;
  /** Absolute path to the eval suite directory (pytest, `_runs`, …). */
  evalsDirAbs: string;
  /** Repo-relative POSIX path to {@link evalsDirAbs}. */
  evalsDirRel: string;
  /** Absolute path to CLI scripts (`eval-discover.ts`, …). */
  scriptsDirAbs: string;
  /** Absolute path to stamp templates and JSON schemas. */
  templatesDirAbs: string;
  /** Absolute path to engine modules (`runner.ts`, `update.ts`, …). */
  engineDirAbs: string;
  /** Absolute path to analyser disk cache. */
  cacheDirAbs: string;
  /** Absolute path to `manifest.yml`. */
  manifestPathAbs: string;
  /** Absolute path to `manifest.history.yml`. */
  historyPathAbs: string;
  /** Resolved zoto-eval-system plugin root (monorepo, env, or Cursor install). */
  pluginRootAbs: string;
  /** Monorepo plugin source tree when present (`plugins/zoto-eval-system`). */
  pluginSourceRootAbs: string;
}

/** Optional overrides for {@link resolvePluginRoot} (primarily unit tests). */
export interface ResolvePluginRootOptions {
  /** Environment map (defaults to `process.env`). */
  env?: NodeJS.ProcessEnv;
  /**
   * Cursor plugin search roots. When set, only these bases are scanned for step (3)
   * instead of the platform default under the user home directory.
   */
  cursorPluginsRoots?: string[];
}

export interface ResolveEvalPathsOptions {
  /** When true, {@link EvalSystemConfig.hostLayout} drives layout detection. */
  hostLayoutExplicit?: boolean;
}

function toPosixRel(repoRoot: string, absPath: string): string {
  return relative(repoRoot, absPath).split("\\").join("/");
}

function hasPluginMarkers(root: string): boolean {
  return (
    existsSync(join(root, "templates")) || existsSync(join(root, "engine"))
  );
}

function tryPluginCandidate(candidate: string): string | undefined {
  const abs = resolve(candidate);
  if (existsSync(abs) && hasPluginMarkers(abs)) {
    return abs;
  }
  return undefined;
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
        if (a.semver[i] !== b.semver[i]) {
          return b.semver[i]! - a.semver[i]!;
        }
      }
    } else if (a.semver) {
      return -1;
    } else if (b.semver) {
      return 1;
    }
    return b.mtime - a.mtime;
  });

  return pool[0]!.path;
}

/**
 * Platform-specific Cursor marketplace plugin directories.
 *
 * - Unix/macOS: `$HOME/.cursor/plugins` (and `cache/*` marketplace installs)
 * - Windows: `%APPDATA%/Cursor/plugins` (same cache layout)
 */
export function cursorPluginsBases(
  home: string = homedir(),
  platform: NodeJS.Platform = process.platform,
): string[] {
  if (platform === "win32") {
    const appData = process.env.APPDATA;
    return appData ? [join(appData, "Cursor", "plugins")] : [];
  }
  return [join(home, ".cursor", "plugins")];
}

/** Collect `zoto-eval-system` installs under a Cursor plugins base directory. */
export function collectCursorPluginCandidates(pluginsBase: string): string[] {
  if (!existsSync(pluginsBase)) {
    return [];
  }

  const found = new Set<string>();

  const direct = join(pluginsBase, PLUGIN_DIR_NAME);
  if (hasPluginMarkers(direct)) {
    found.add(resolve(direct));
  }

  let entries: { name: string; isDirectory: () => boolean }[];
  try {
    entries = readdirSync(pluginsBase, { withFileTypes: true });
  } catch {
    return [...found];
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;

    if (name === "cache") {
      const cacheBase = join(pluginsBase, "cache");
      if (!existsSync(cacheBase)) continue;
      let cacheEntries: { name: string; isDirectory: () => boolean }[];
      try {
        cacheEntries = readdirSync(cacheBase, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const cacheEntry of cacheEntries) {
        if (!cacheEntry.isDirectory()) continue;
        const cand = join(cacheBase, cacheEntry.name, PLUGIN_DIR_NAME);
        if (hasPluginMarkers(cand)) {
          found.add(resolve(cand));
        }
      }
      continue;
    }

    if (name === PLUGIN_DIR_NAME) {
      continue;
    }

    const nested = join(pluginsBase, name, PLUGIN_DIR_NAME);
    if (hasPluginMarkers(nested)) {
      found.add(resolve(nested));
    }
  }

  return [...found];
}

/**
 * Resolve the `zoto-eval-system` plugin root at execution time.
 *
 * **Precedence** (first match wins):
 *
 * 1. **Monorepo** — `{repoRoot}/plugins/zoto-eval-system` when `templates/` or
 *    `engine/` exists under that path.
 * 2. **Environment** — `ZOTO_EVAL_PLUGIN_ROOT` (absolute or relative path; same marker check).
 * 3. **Cursor install** — platform-aware plugin directories:
 *    - Unix/macOS: `$HOME/.cursor/plugins/.../zoto-eval-system` and cache variants
 *    - Windows: `%APPDATA%/Cursor/plugins/.../zoto-eval-system` (and cache analogue)
 *
 * When multiple Cursor candidates exist, the highest `package.json` semver is chosen;
 * if semver is unavailable, the most recently modified directory wins.
 *
 * @param repoRoot - Git/workspace root (defaults to {@link resolveHostRepoRoot}).
 * @throws Error when no candidate resolves — set `ZOTO_EVAL_PLUGIN_ROOT` or install the plugin.
 */
export function resolvePluginRoot(
  repoRoot?: string,
  options?: ResolvePluginRootOptions,
): string {
  const env = options?.env ?? process.env;
  const root = resolve(repoRoot ?? resolveHostRepoRoot());

  const fromMonorepo = tryPluginCandidate(join(root, "plugins", PLUGIN_DIR_NAME));
  if (fromMonorepo) {
    return fromMonorepo;
  }

  const envRoot = env.ZOTO_EVAL_PLUGIN_ROOT?.trim();
  if (envRoot) {
    const fromEnv = tryPluginCandidate(envRoot);
    if (fromEnv) {
      return fromEnv;
    }
  }

  const bases =
    options?.cursorPluginsRoots && options.cursorPluginsRoots.length > 0
      ? options.cursorPluginsRoots
      : cursorPluginsBases();

  const candidates: string[] = [];
  for (const base of bases) {
    candidates.push(...collectCursorPluginCandidates(base));
  }

  if (candidates.length > 0) {
    return pickBestCursorCandidate(candidates);
  }

  throw new Error(
    "Cannot resolve zoto-eval-system plugin. Set ZOTO_EVAL_PLUGIN_ROOT or install the plugin.",
  );
}

/**
 * Resolve the git/workspace root when commands run from `.zoto/eval-system/`
 * (nested package.json) or from the repo root (legacy / aliases).
 */
export function resolveHostRepoRoot(startDir: string = process.cwd()): string {
  const fromEnv = process.env.ZOTO_EVAL_HOST_REPO?.trim();
  if (fromEnv) {
    return resolve(fromEnv);
  }
  let dir = resolve(startDir);
  for (;;) {
    if (existsSync(join(dir, ".zoto", "eval-system", "config.yml"))) {
      return dir;
    }
    if (
      existsSync(join(dir, "config.yml")) &&
      existsSync(join(dir, "engine", "runner.ts")) &&
      existsSync(join(dir, "package.json"))
    ) {
      return resolve(dir, "..", "..");
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return resolve(startDir);
    }
    dir = parent;
  }
}

function isEjectedMarker(evalHome: string): boolean {
  return (
    existsSync(join(evalHome, "scripts", "eval-discover.ts")) ||
    existsSync(join(evalHome, "scripts", "eval-orchestrate.ts")) ||
    existsSync(join(evalHome, "engine", "runner.ts"))
  );
}

function detectLayoutFromFilesystem(
  repoRoot: string,
  evalHome: string,
  evalsDirConfig: string,
): EvalLayoutMode {
  if (isEjectedMarker(evalHome)) {
    return "ejected";
  }

  const evalHomeEvals = join(evalHome, evalsDirConfig);
  if (existsSync(join(evalHomeEvals, "conftest.py")) || existsSync(join(evalHomeEvals, "_runs"))) {
    return "ejected";
  }

  const repoEvals = join(repoRoot, evalsDirConfig);
  if (existsSync(join(repoEvals, "conftest.py")) || existsSync(join(repoEvals, "_runs"))) {
    return "plugin";
  }

  // Greenfield without explicit hostLayout: prefer ejected under eval home (legacy heuristic).
  return "ejected";
}

function detectLayout(
  repoRoot: string,
  evalHome: string,
  evalsDirConfig: string,
  hostLayout: HostLayout,
  hostLayoutExplicit: boolean,
): EvalLayoutMode {
  if (hostLayoutExplicit) {
    return hostLayout;
  }
  return detectLayoutFromFilesystem(repoRoot, evalHome, evalsDirConfig);
}

/**
 * Resolve a config path that may be repo-relative (legacy) or eval-home-relative (v3).
 */
export function resolveConfiguredPath(
  repoRoot: string,
  evalHome: string,
  configured: string,
): string {
  if (configured.startsWith("/")) {
    return resolve(configured);
  }

  const normalised = configured.replace(/\\/g, "/");
  const fromEvalHome = resolve(evalHome, configured);
  const fromRepo = resolve(repoRoot, configured);

  if (existsSync(fromEvalHome)) return fromEvalHome;
  if (existsSync(fromRepo)) return fromRepo;

  // v3 manifest paths (`manifest.yml`) vs legacy (`.zoto/eval-system/manifest.yml`).
  if (!normalised.includes(".zoto/")) {
    return fromEvalHome;
  }
  return fromRepo;
}

function resolvePluginRuntimeRoot(
  repoRoot: string,
  evalHome: string,
  layout: EvalLayoutMode,
): string {
  if (layout === "ejected") {
    return evalHome;
  }
  return resolvePluginRoot(repoRoot);
}

function resolveScriptsDir(
  repoRoot: string,
  evalHome: string,
  layout: EvalLayoutMode,
): string {
  const repoScripts = join(repoRoot, "scripts");
  if (layout === "plugin") {
    return repoScripts;
  }

  const evalScripts = join(evalHome, "scripts");
  if (existsSync(join(evalScripts, "eval-discover.ts"))) {
    return evalScripts;
  }
  if (existsSync(join(repoScripts, "eval-discover.ts"))) {
    return repoScripts;
  }

  return evalScripts;
}

/**
 * Resolve all eval-system paths for a host repository.
 *
 * {@link configPath} must be the absolute path to `config.yml`. The parent
 * directory is treated as {@link EvalPaths.evalHome}.
 */
export function resolveEvalPaths(
  repoRoot: string,
  config: EvalSystemConfig,
  configPath: string,
  options: ResolveEvalPathsOptions = {},
): EvalPaths {
  const repoRootAbs = resolve(repoRoot);
  const evalHome = resolve(dirname(configPath));
  const evalsDirConfig = config.evalsDir;
  const hostLayoutExplicit = options.hostLayoutExplicit ?? false;
  const layout = detectLayout(
    repoRootAbs,
    evalHome,
    evalsDirConfig,
    config.hostLayout,
    hostLayoutExplicit,
  );

  const evalsDirAbs =
    layout === "ejected"
      ? resolve(evalHome, evalsDirConfig)
      : resolve(repoRootAbs, evalsDirConfig);

  const pluginRootAbs = resolvePluginRuntimeRoot(repoRootAbs, evalHome, layout);
  const pluginSourceRootAbs = join(repoRootAbs, "plugins", "zoto-eval-system");

  return {
    repoRoot: repoRootAbs,
    evalHome,
    layout,
    evalsDirConfig,
    evalsDirAbs,
    evalsDirRel: toPosixRel(repoRootAbs, evalsDirAbs),
    scriptsDirAbs: resolveScriptsDir(repoRootAbs, evalHome, layout),
    templatesDirAbs: join(pluginRootAbs, "templates"),
    engineDirAbs: join(pluginRootAbs, "engine"),
    cacheDirAbs: join(evalHome, "cache", "analyser"),
    manifestPathAbs: resolveConfiguredPath(
      repoRootAbs,
      evalHome,
      config.update.manifestPath,
    ),
    historyPathAbs: resolveConfiguredPath(
      repoRootAbs,
      evalHome,
      config.update.historyPath,
    ),
    pluginRootAbs,
    pluginSourceRootAbs,
  };
}

/** Convenience: schema path for `result.schema.json`. */
export function resultSchemaPath(paths: EvalPaths): string {
  return join(paths.templatesDirAbs, "schema", "result.schema.json");
}

/** Convenience: analyser JSON schema path. */
export function analyserSchemaPath(paths: EvalPaths): string {
  return join(paths.templatesDirAbs, "schema", "analyser-payload.schema.json");
}

const ANALYSER_AGENT_FILE = "zoto-eval-analyser-subagent.md";

/** Convenience: analyser subagent prompt path (ejected flat/nested, plugin, or fallback). */
export function analyserAgentPath(paths: EvalPaths): string {
  const flatEjected = join(
    paths.repoRoot,
    ".cursor",
    "agents",
    `eval-sys--${ANALYSER_AGENT_FILE}`,
  );
  if (existsSync(flatEjected)) return flatEjected;

  const nestedEjected = join(
    paths.repoRoot,
    ".cursor",
    "agents",
    "eval-sys",
    ANALYSER_AGENT_FILE,
  );
  if (existsSync(nestedEjected)) return nestedEjected;

  const plugin = join(paths.pluginSourceRootAbs, "agents", ANALYSER_AGENT_FILE);
  if (existsSync(plugin)) return plugin;

  return nestedEjected;
}
