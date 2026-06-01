#!/usr/bin/env tsx
/**
 * Merge lean or ejected eval package.json fragments into a host repo.
 *
 * Lean (`templates/package-scripts/lean.json`): bridge-routed `eval:*`
 * aliases + minimal devDeps (`tsx`, `dotenv`) only. Full runtime deps live
 * in the installed plugin's `package.json`.
 *
 * Ejected hosts carry the full contract under `.zoto/eval-system/package.json`
 * (from `templates/host-package/package.json`); the consumer root keeps thin
 * `pnpm -C .zoto/eval-system …` delegators after eject.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

interface MergeOptions {
  /** Directory containing the target `package.json` (e.g. `.zoto/eval-system/`). */
  packageJsonDir: string;
  basePath: string;
  force?: boolean;
  /** Drop eval runtime devDeps not listed in the merge fragment (lean migration). */
  pruneStaleEvalDevDeps?: boolean;
  /** Drop eval:* scripts not listed in the merge fragment (lean migration). */
  pruneStaleEvalScripts?: boolean;
}

interface PackageJson {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [k: string]: unknown;
}

export function mergePackageJson(opts: MergeOptions): PackageJson {
  const pkgPath = join(opts.packageJsonDir, "package.json");
  const basePath = opts.basePath;
  if (!existsSync(basePath)) {
    throw new Error(`missing base scripts file: ${basePath}`);
  }
  const base = JSON.parse(readFileSync(basePath, "utf-8")) as PackageJson;

  let pkg: PackageJson = {};
  if (existsSync(pkgPath)) {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJson;
  }

  for (const key of ["name", "private", "type", "description"] as const) {
    if (base[key] !== undefined && (opts.force || pkg[key] === undefined)) {
      pkg[key] = base[key];
    }
  }

  if (!existsSync(pkgPath) && pkg.name === undefined) {
    pkg = {
      name: "host-repo",
      version: "0.0.0",
      private: true,
      ...pkg,
    };
  }

  const scripts = { ...(pkg.scripts ?? {}) };
  for (const [k, v] of Object.entries(base.scripts ?? {})) {
    scripts[k] = v;
  }

  if (opts.pruneStaleEvalScripts) {
    const allowedScripts = new Set(Object.keys(base.scripts ?? {}));
    for (const key of Object.keys(scripts)) {
      if (
        (key === "eval" || key.startsWith("eval:")) &&
        !allowedScripts.has(key)
      ) {
        delete scripts[key];
      }
    }
  }

  pkg.scripts = scripts;

  const devDeps = { ...(pkg.devDependencies ?? {}) };
  for (const [k, v] of Object.entries(base.devDependencies ?? {})) {
    if (opts.force || !(k in devDeps)) {
      devDeps[k] = v;
    }
  }

  if (opts.pruneStaleEvalDevDeps) {
    const allowed = new Set(Object.keys(base.devDependencies ?? {}));
    for (const key of Object.keys(devDeps)) {
      if (!allowed.has(key) && isEvalRuntimeDevDep(key)) {
        delete devDeps[key];
      }
    }
  }

  pkg.devDependencies = devDeps;

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  return pkg;
}

/** Runtime deps that belong in the plugin (lean) or `.zoto/eval-system/` (ejected). */
const EVAL_RUNTIME_DEV_DEPS = new Set([
  "@cursor/sdk",
  "@types/js-yaml",
  "ajv",
  "ajv-formats",
  "js-yaml",
  "json-source-map",
  "jest",
  "minimatch",
  "typescript",
  "vitest",
  "yaml",
]);

function isEvalRuntimeDevDep(name: string): boolean {
  return EVAL_RUNTIME_DEV_DEPS.has(name);
}

if (process.argv[1] && process.argv[1].endsWith("package-json-merger.ts")) {
  const force = process.argv.includes("--force");
  const prune = process.argv.includes("--prune-stale");
  const repoRoot = process.cwd();
  const leanPath = resolve(
    import.meta.dirname,
    "..",
    "templates",
    "host-package",
    "lean-package.json",
  );
  const dirIdx = process.argv.indexOf("--dir");
  const packageJsonDir = dirIdx >= 0 ? resolve(process.argv[dirIdx + 1]!) : repoRoot;
  const basePath = process.argv.includes("--base")
    ? resolve(process.argv[process.argv.indexOf("--base") + 1]!)
    : leanPath;
  const out = mergePackageJson({
    packageJsonDir,
    basePath,
    force,
    pruneStaleEvalDevDeps: prune,
    pruneStaleEvalScripts: prune,
  });
  console.log(
    `merged ${Object.keys(out.scripts ?? {}).length} scripts into ${join(packageJsonDir, "package.json")}`,
  );
}
