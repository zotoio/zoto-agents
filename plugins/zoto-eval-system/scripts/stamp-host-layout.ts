#!/usr/bin/env tsx
/**
 * Stamp the self-contained eval-system host layout under `.zoto/eval-system/`.
 *
 * Copies runtime assets (src, templates, engine, scripts, agents) and writes
 * `.zoto/eval-system/package.json`. Idempotent — existing operator files are
 * preserved unless `--force-scripts` is passed.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ZOTO_AGENTS_ROOT = resolve(PLUGIN_ROOT, "../..");

const HOST_SCRIPT_NAMES = [
  "eval-discover.ts",
  "eval-analyse.ts",
  "eval-stamp.ts",
  "eval-orchestrate.ts",
  "eval-gc.ts",
  "eval-cleanup-vendored.ts",
  "test.py",
] as const;

const COPY_DIRS = ["src", "templates", "engine"] as const;

const ANALYSER_AGENT = "agents/zoto-eval-analyser-subagent.md";

export interface StampHostLayoutOptions {
  repoRoot: string;
  dryRun?: boolean;
  forceScripts?: boolean;
  zotoAgentsRoot?: string;
}

export interface StampHostLayoutResult {
  evalHome: string;
  copied: string[];
  skipped: string[];
  packageJson: string;
}

function evalHomeFor(repoRoot: string): string {
  return join(repoRoot, ".zoto", "eval-system");
}

function rewriteScriptBody(content: string): string {
  return content
    .replaceAll("../plugins/zoto-eval-system/src/", "../src/")
    .replaceAll("../plugins/zoto-eval-system/engine/", "../engine/")
    .replace(
      /const REPO_ROOT = resolve\(process\.cwd\(\)\);/g,
      "const REPO_ROOT = resolveHostRepoRoot();",
    )
    .replace(
      'from "../src/config-loader.js"',
      'from "../src/config-loader.js"',
    );
}

function ensureHostRepoRootImport(content: string): string {
  if (!content.includes("resolveHostRepoRoot")) return content;
  if (content.includes("resolveHostRepoRoot")) {
    if (/resolveHostRepoRoot/.test(content) && !/import \{[^}]*resolveHostRepoRoot/.test(content)) {
      return content.replace(
        /import \{([^}]+)\} from "\.\.\/src\/config-loader\.js";/,
        (_, names: string) => {
          const parts = names.split(",").map((s) => s.trim()).filter(Boolean);
          if (!parts.includes("resolveHostRepoRoot")) parts.push("resolveHostRepoRoot");
          return `import { ${parts.join(", ")} } from "../src/config-loader.js";`;
        },
      );
    }
  }
  return content;
}

function copyDirRecursive(
  srcDir: string,
  destDir: string,
  dryRun: boolean,
  copied: string[],
  rewrite?: (body: string) => string,
): void {
  if (!existsSync(srcDir)) return;
  if (!dryRun) mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src = join(srcDir, entry.name);
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(src, dest, dryRun, copied, rewrite);
    } else if (entry.isFile()) {
      if (!dryRun) {
        const body = readFileSync(src, "utf-8");
        writeFileSync(dest, rewrite ? rewrite(body) : body, "utf-8");
      }
      copied.push(dest);
    }
  }
}

function copyTree(
  src: string,
  dest: string,
  dryRun: boolean,
  copied: string[],
): void {
  if (!existsSync(src)) return;
  if (!dryRun) {
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
  }
  copied.push(dest);
}

function rewriteEngineFile(body: string): string {
  return body.replaceAll("../../../scripts/", "../scripts/");
}

function stampScripts(
  evalHome: string,
  agentsRoot: string,
  opts: StampHostLayoutOptions,
  copied: string[],
  skipped: string[],
): void {
  const scriptsDir = join(evalHome, "scripts");
  if (!opts.dryRun) mkdirSync(scriptsDir, { recursive: true });

  for (const name of HOST_SCRIPT_NAMES) {
    const src = join(agentsRoot, "scripts", name);
    const dest = join(scriptsDir, name);
    if (!existsSync(src)) {
      skipped.push(`missing source script: ${src}`);
      continue;
    }
    if (existsSync(dest) && !opts.forceScripts) {
      skipped.push(dest);
      continue;
    }
    const raw = name.endsWith(".py")
      ? readFileSync(src, "utf-8")
      : readFileSync(src, "utf-8");
    const body = name.endsWith(".py")
      ? raw
      : ensureHostRepoRootImport(rewriteScriptBody(raw));
    if (!opts.dryRun) writeFileSync(dest, body, "utf-8");
    copied.push(dest);
  }

  // eval-ensure-host from template (self-contained paths)
  const ensureTmpl = join(PLUGIN_ROOT, "templates/runner/eval-ensure-host.ts.tmpl");
  const ensureDest = join(scriptsDir, "eval-ensure-host.ts");
  if (existsSync(ensureTmpl) && (opts.forceScripts || !existsSync(ensureDest))) {
    const body = readFileSync(ensureTmpl, "utf-8");
    if (!opts.dryRun) writeFileSync(ensureDest, body, "utf-8");
    copied.push(ensureDest);
  }
}

export function stampHostLayout(opts: StampHostLayoutOptions): StampHostLayoutResult {
  const repoRoot = resolve(opts.repoRoot);
  const evalHome = evalHomeFor(repoRoot);
  const agentsRoot = resolve(opts.zotoAgentsRoot ?? ZOTO_AGENTS_ROOT);
  const copied: string[] = [];
  const skipped: string[] = [];

  if (!opts.dryRun) mkdirSync(evalHome, { recursive: true });

  for (const dir of COPY_DIRS) {
    const src = join(PLUGIN_ROOT, dir);
    const dest = join(evalHome, dir);
    if (dir === "engine") {
      copyDirRecursive(src, dest, !!opts.dryRun, copied, rewriteEngineFile);
    } else {
      copyTree(src, dest, !!opts.dryRun, copied);
    }
  }

  const agentSrc = join(PLUGIN_ROOT, ANALYSER_AGENT);
  const agentDest = join(evalHome, "agents", "zoto-eval-analyser-subagent.md");
  if (existsSync(agentSrc)) {
    if (!opts.dryRun) {
      mkdirSync(dirname(agentDest), { recursive: true });
      cpSync(agentSrc, agentDest);
    }
    copied.push(agentDest);
  }

  stampScripts(evalHome, agentsRoot, opts, copied, skipped);

  const pkgTemplate = join(PLUGIN_ROOT, "templates/host-package/package.json");
  const pkgDest = join(evalHome, "package.json");
  if (existsSync(pkgTemplate)) {
    if (!opts.dryRun) {
      writeFileSync(pkgDest, readFileSync(pkgTemplate, "utf-8"), "utf-8");
    }
    copied.push(pkgDest);
  }

  const giTemplate = join(PLUGIN_ROOT, "templates/host-package/.gitignore");
  const giDest = join(evalHome, ".gitignore");
  if (existsSync(giTemplate)) {
    if (!opts.dryRun) {
      writeFileSync(giDest, readFileSync(giTemplate, "utf-8"), "utf-8");
    }
    copied.push(giDest);
  }

  const envExampleTemplate = join(PLUGIN_ROOT, "templates/host-package/.env.example");
  const envExampleDest = join(evalHome, ".env.example");
  if (existsSync(envExampleTemplate) && !existsSync(envExampleDest)) {
    if (!opts.dryRun) {
      writeFileSync(envExampleDest, readFileSync(envExampleTemplate, "utf-8"), "utf-8");
    }
    copied.push(envExampleDest);
  } else if (existsSync(envExampleDest)) {
    skipped.push(envExampleDest);
  }

  return { evalHome, copied, skipped, packageJson: pkgDest };
}

/** Optional root aliases — two-line convenience only. */
export function stampRootEvalAliases(
  repoRoot: string,
  dryRun = false,
): { action: string; path: string } {
  const pkgPath = join(repoRoot, "package.json");
  if (!existsSync(pkgPath)) {
    return { action: "skipped-no-root-package", path: pkgPath };
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    scripts?: Record<string, string>;
  };
  const scripts = { ...(pkg.scripts ?? {}) };
  scripts.eval = "pnpm -C .zoto/eval-system eval";
  scripts["eval:full"] = "pnpm -C .zoto/eval-system eval:full";
  pkg.scripts = scripts;
  if (!dryRun) {
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
  }
  return { action: dryRun ? "would-write" : "written", path: pkgPath };
}

const EVAL_DEV_DEPS = [
  "@cursor/sdk",
  "ajv",
  "ajv-formats",
  "dotenv",
  "json-source-map",
  "minimatch",
  "tsx",
  "typescript",
  "yaml",
] as const;

const EVAL_SCRIPT_PREFIX = "eval";

/** Remove eval scripts and devDeps from root package.json after migration. */
export function stripRootEvalPackage(
  repoRoot: string,
  dryRun = false,
): { removedScripts: string[]; removedDevDeps: string[] } {
  const pkgPath = join(repoRoot, "package.json");
  const removedScripts: string[] = [];
  const removedDevDeps: string[] = [];
  if (!existsSync(pkgPath)) {
    return { removedScripts, removedDevDeps };
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  if (pkg.scripts) {
    for (const key of Object.keys(pkg.scripts)) {
      if (key === EVAL_SCRIPT_PREFIX || key.startsWith(`${EVAL_SCRIPT_PREFIX}:`)) {
        if (key !== EVAL_SCRIPT_PREFIX && key !== "eval:full") {
          removedScripts.push(key);
          delete pkg.scripts[key];
        }
      }
    }
    // Keep only eval + eval:full aliases
    pkg.scripts.eval = "pnpm -C .zoto/eval-system eval";
    pkg.scripts["eval:full"] = "pnpm -C .zoto/eval-system eval:full";
  }
  if (pkg.devDependencies) {
    for (const dep of EVAL_DEV_DEPS) {
      if (dep in pkg.devDependencies) {
        removedDevDeps.push(dep);
        delete pkg.devDependencies[dep];
      }
    }
  }
  if (!dryRun) {
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
  }
  return { removedScripts, removedDevDeps };
}

function parseCli(argv: string[]): StampHostLayoutOptions & { stripRoot?: boolean } {
  const opts: StampHostLayoutOptions & { stripRoot?: boolean } = {
    repoRoot: process.cwd(),
    dryRun: false,
    forceScripts: false,
  };
  for (const a of argv) {
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--force-scripts") opts.forceScripts = true;
    else if (a === "--strip-root") opts.stripRoot = true;
    else if (a.startsWith("--repo-root=")) opts.repoRoot = resolve(a.slice("--repo-root=".length));
  }
  return opts;
}

if (process.argv[1]?.endsWith("stamp-host-layout.ts")) {
  const opts = parseCli(process.argv.slice(2));
  const result = stampHostLayout(opts);
  let rootStrip = null;
  if (opts.stripRoot) {
    rootStrip = stripRootEvalPackage(opts.repoRoot, opts.dryRun);
    stampRootEvalAliases(opts.repoRoot, opts.dryRun);
  }
  console.log(JSON.stringify({ ...result, rootStrip }, null, 2));
}
