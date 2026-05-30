import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import type { EvalSystemConfig } from "./config-loader.js";

/**
 * Host eval install layout.
 *
 * - `legacy-root` — eval suite and scripts live at repo root (`evals/`, `scripts/`).
 * - `self-contained` — runtime lives under `.zoto/eval-system/` (eval-system v3).
 */
export type EvalLayoutMode = "legacy-root" | "self-contained";

export interface EvalPaths {
  /** Git / workspace root (primitive discovery, `.cursor/`, `.env`). */
  repoRoot: string;
  /** Directory containing `config.yml` (typically `<repo>/.zoto/eval-system`). */
  evalHome: string;
  /** Detected install layout. */
  layout: EvalLayoutMode;
  /** Configured evalsDir segment (relative to eval home in v3, often `"evals"`). */
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
  /** Monorepo plugin source tree when present (`plugins/zoto-eval-system`). */
  pluginSourceRootAbs: string;
}

function toPosixRel(repoRoot: string, absPath: string): string {
  return relative(repoRoot, absPath).split("\\").join("/");
}

/**
 * Resolve the git/workspace root when commands run from `.zoto/eval-system/`
 * (nested package.json) or from the repo root (legacy / aliases).
 */
export function resolveHostRepoRoot(startDir: string = process.cwd()): string {
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

function isSelfContainedMarker(evalHome: string): boolean {
  return (
    existsSync(join(evalHome, "scripts", "eval-discover.ts")) ||
    existsSync(join(evalHome, "scripts", "eval-orchestrate.ts")) ||
    existsSync(join(evalHome, "engine", "runner.ts")) ||
    existsSync(join(evalHome, "package.json"))
  );
}

function detectLayout(
  repoRoot: string,
  evalHome: string,
  evalsDirConfig: string,
): EvalLayoutMode {
  if (isSelfContainedMarker(evalHome)) {
    return "self-contained";
  }

  const evalHomeEvals = join(evalHome, evalsDirConfig);
  if (existsSync(join(evalHomeEvals, "conftest.py")) || existsSync(join(evalHomeEvals, "_runs"))) {
    return "self-contained";
  }

  const repoEvals = join(repoRoot, evalsDirConfig);
  if (existsSync(join(repoEvals, "conftest.py")) || existsSync(join(repoEvals, "_runs"))) {
    return "legacy-root";
  }

  // Greenfield: prefer self-contained under eval home.
  return "self-contained";
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
  if (layout === "self-contained") {
    return evalHome;
  }

  const monorepoPlugin = join(repoRoot, "plugins", "zoto-eval-system");
  if (existsSync(join(monorepoPlugin, "templates"))) {
    return monorepoPlugin;
  }

  const hostVendored = join(repoRoot, "plugins", "zoto-eval-system");
  if (existsSync(join(hostVendored, "templates"))) {
    return hostVendored;
  }

  return evalHome;
}

function resolveScriptsDir(
  repoRoot: string,
  evalHome: string,
  layout: EvalLayoutMode,
): string {
  const repoScripts = join(repoRoot, "scripts");
  if (layout === "legacy-root") {
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
): EvalPaths {
  const repoRootAbs = resolve(repoRoot);
  const evalHome = resolve(dirname(configPath));
  const evalsDirConfig = config.evalsDir;
  const layout = detectLayout(repoRootAbs, evalHome, evalsDirConfig);

  const evalsDirAbs =
    layout === "self-contained"
      ? resolve(evalHome, evalsDirConfig)
      : resolve(repoRootAbs, evalsDirConfig);

  const pluginRuntime = resolvePluginRuntimeRoot(repoRootAbs, evalHome, layout);
  const pluginSourceRootAbs = join(repoRootAbs, "plugins", "zoto-eval-system");

  return {
    repoRoot: repoRootAbs,
    evalHome,
    layout,
    evalsDirConfig,
    evalsDirAbs,
    evalsDirRel: toPosixRel(repoRootAbs, evalsDirAbs),
    scriptsDirAbs: resolveScriptsDir(repoRootAbs, evalHome, layout),
    templatesDirAbs: join(pluginRuntime, "templates"),
    engineDirAbs: join(pluginRuntime, "engine"),
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

/** Convenience: analyser subagent prompt path (monorepo or self-contained). */
export function analyserAgentPath(paths: EvalPaths): string {
  const selfContained = join(paths.evalHome, "agents", "zoto-eval-analyser-subagent.md");
  if (existsSync(selfContained)) return selfContained;

  const monorepo = join(paths.pluginSourceRootAbs, "agents", "zoto-eval-analyser-subagent.md");
  if (existsSync(monorepo)) return monorepo;

  return selfContained;
}
