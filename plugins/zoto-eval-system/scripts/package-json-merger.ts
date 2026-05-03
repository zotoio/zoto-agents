#!/usr/bin/env tsx
/**
 * Merge templates/package-scripts/base.json into a host repo's package.json.
 *
 * Idempotent: existing fields are preserved. Eval scripts are overwritten
 * to match the canonical versions (they are the contract between skills
 * and commands). Dev-dependencies are merged by key — existing versions
 * win unless --force is passed.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

interface MergeOptions {
  repoRoot: string;
  basePath: string;
  force?: boolean;
}

interface PackageJson {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [k: string]: unknown;
}

export function mergePackageJson(opts: MergeOptions): PackageJson {
  const pkgPath = join(opts.repoRoot, "package.json");
  const basePath = opts.basePath;
  if (!existsSync(basePath)) {
    throw new Error(`missing base scripts file: ${basePath}`);
  }
  const base = JSON.parse(readFileSync(basePath, "utf-8")) as PackageJson;

  let pkg: PackageJson = {};
  if (existsSync(pkgPath)) {
    pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as PackageJson;
  } else {
    pkg = {
      name: "host-repo",
      version: "0.0.0",
      private: true,
    };
  }

  const scripts = { ...(pkg.scripts ?? {}) };
  for (const [k, v] of Object.entries(base.scripts ?? {})) {
    scripts[k] = v;
  }
  pkg.scripts = scripts;

  const devDeps = { ...(pkg.devDependencies ?? {}) };
  for (const [k, v] of Object.entries(base.devDependencies ?? {})) {
    if (opts.force || !(k in devDeps)) {
      devDeps[k] = v;
    }
  }
  pkg.devDependencies = devDeps;

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  return pkg;
}

if (process.argv[1] && process.argv[1].endsWith("package-json-merger.ts")) {
  const force = process.argv.includes("--force");
  const repoRoot = process.cwd();
  const basePath = resolve(
    import.meta.dirname,
    "..",
    "templates",
    "package-scripts",
    "base.json",
  );
  const out = mergePackageJson({ repoRoot, basePath, force });
  console.log(`merged ${Object.keys(out.scripts ?? {}).length} scripts into ${join(repoRoot, "package.json")}`);
}
