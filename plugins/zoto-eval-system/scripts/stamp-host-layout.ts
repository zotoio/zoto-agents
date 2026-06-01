#!/usr/bin/env tsx
/**
 * Eject CLI — opt-in self-contained eval-system host layout under `.zoto/eval-system/`.
 *
 * Copies runtime assets (src, templates, engine, scripts) and writes nested
 * `package.json`. Sets `hostLayout: ejected` in config.yml. Does **not** copy
 * eval primitives (agents/skills/commands) — those are stamped separately (S05).
 *
 * Run: `pnpm run eval:stamp-host-layout` (or `--dry-run` to preview).
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseDocument } from "yaml";
import { resolvePluginRoot } from "../src/paths.js";
import {
  describeEjectedPrimitivesLayout,
  stampEjectedPrimitives,
  type EjectedPrimitivesLayout,
  type StampEjectedPrimitivesResult,
} from "./stamp-primitives.js";

const HOST_SCRIPT_NAMES = [
  "eval-discover.ts",
  "eval-analyse.ts",
  "eval-stamp.ts",
  "eval-orchestrate.ts",
  "eval-gc.ts",
  "eval-cleanup-vendored.ts",
  "eval-cleanup-stale.ts",
  "check-analyser-payload-parity.ts",
  "stamp-host-layout.ts",
  "test.py",
] as const;

const COPY_DIRS = ["src", "templates", "engine"] as const;

export interface StampHostLayoutOptions {
  repoRoot: string;
  dryRun?: boolean;
  forceScripts?: boolean;
  /** Override plugin package root (primarily unit tests). */
  pluginRoot?: string;
  /** How eval primitives are stamped under `.cursor/` (see stamp-primitives.ts). */
  primitivesLayout?: EjectedPrimitivesLayout;
  /** Skip stamping agents/skills/commands (runtime-only eject). */
  skipPrimitives?: boolean;
}

export interface StampHostLayoutResult {
  evalHome: string;
  pluginRoot: string;
  copied: string[];
  skipped: string[];
  packageJson: string;
  configPatched: boolean;
  rootAliases?: { updated: string[]; path: string };
  primitives?: StampEjectedPrimitivesResult;
}

function evalHomeFor(repoRoot: string): string {
  return join(repoRoot, ".zoto", "eval-system");
}

function resolveSourcePluginRoot(opts: StampHostLayoutOptions): string {
  if (opts.pluginRoot) return resolve(opts.pluginRoot);
  return resolvePluginRoot(opts.repoRoot);
}

function rewriteScriptBody(content: string): string {
  return content.replace(
    /const REPO_ROOT = resolve\(process\.cwd\(\)\);/g,
    "const REPO_ROOT = resolveHostRepoRoot();",
  );
}

function ensureHostRepoRootImport(content: string): string {
  if (!content.includes("resolveHostRepoRoot")) return content;
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

/** Legacy monorepo engine imports; plugin source already uses `../scripts/`. */
function rewriteEngineFile(body: string): string {
  return body.replaceAll("../../../scripts/", "../scripts/");
}

function stampScripts(
  evalHome: string,
  pluginRoot: string,
  opts: StampHostLayoutOptions,
  copied: string[],
  skipped: string[],
): void {
  const scriptsDir = join(evalHome, "scripts");
  if (!opts.dryRun) mkdirSync(scriptsDir, { recursive: true });

  for (const name of HOST_SCRIPT_NAMES) {
    const src = join(pluginRoot, "scripts", name);
    const dest = join(scriptsDir, name);
    if (!existsSync(src)) {
      skipped.push(`missing source script: ${src}`);
      continue;
    }
    if (existsSync(dest) && !opts.forceScripts) {
      skipped.push(dest);
      continue;
    }
    const raw = readFileSync(src, "utf-8");
    const body = name.endsWith(".py")
      ? raw
      : ensureHostRepoRootImport(rewriteScriptBody(raw));
    if (!opts.dryRun) writeFileSync(dest, body, "utf-8");
    copied.push(dest);
  }

  const ensureTmpl = join(pluginRoot, "templates/runner/eval-ensure-host.ts.tmpl");
  const ensureDest = join(scriptsDir, "eval-ensure-host.ts");
  if (existsSync(ensureTmpl) && (opts.forceScripts || !existsSync(ensureDest))) {
    const body = readFileSync(ensureTmpl, "utf-8");
    if (!opts.dryRun) writeFileSync(ensureDest, body, "utf-8");
    copied.push(ensureDest);
  }
}

/** Read eval script keys from the host-package template (canonical ejected contract). */
export function hostEvalScriptKeys(pluginRoot: string): string[] {
  const tplPath = join(pluginRoot, "templates", "host-package", "package.json");
  if (!existsSync(tplPath)) return ["eval", "eval:full"];
  const tpl = JSON.parse(readFileSync(tplPath, "utf-8")) as {
    scripts?: Record<string, string>;
  };
  return Object.keys(tpl.scripts ?? {}).filter(
    (k) => k === "eval" || k.startsWith("eval:"),
  );
}

/** Patch config.yml to record ejected layout (preserves comments via yaml parseDocument). */
export function patchConfigHostLayout(
  evalHome: string,
  layout: "ejected" | "plugin",
  dryRun = false,
): boolean {
  const configPath = join(evalHome, "config.yml");
  if (!existsSync(configPath)) return false;
  const doc = parseDocument(readFileSync(configPath, "utf-8"));
  doc.set("hostLayout", layout);
  if (!dryRun) writeFileSync(configPath, doc.toString(), "utf-8");
  return true;
}

export function stampHostLayout(opts: StampHostLayoutOptions): StampHostLayoutResult {
  const repoRoot = resolve(opts.repoRoot);
  const evalHome = evalHomeFor(repoRoot);
  const pluginRoot = resolveSourcePluginRoot(opts);
  const copied: string[] = [];
  const skipped: string[] = [];

  if (!opts.dryRun) mkdirSync(evalHome, { recursive: true });

  for (const dir of COPY_DIRS) {
    const src = join(pluginRoot, dir);
    const dest = join(evalHome, dir);
    if (dir === "engine") {
      copyDirRecursive(src, dest, !!opts.dryRun, copied, rewriteEngineFile);
    } else {
      copyTree(src, dest, !!opts.dryRun, copied);
    }
  }

  stampScripts(evalHome, pluginRoot, opts, copied, skipped);

  const pkgTemplate = join(pluginRoot, "templates/host-package/package.json");
  const pkgDest = join(evalHome, "package.json");
  if (existsSync(pkgTemplate)) {
    if (!opts.dryRun) {
      writeFileSync(pkgDest, readFileSync(pkgTemplate, "utf-8"), "utf-8");
    }
    copied.push(pkgDest);
  }

  const giTemplate = join(pluginRoot, "templates/host-package/.gitignore");
  const giDest = join(evalHome, ".gitignore");
  if (existsSync(giTemplate)) {
    if (!opts.dryRun) {
      writeFileSync(giDest, readFileSync(giTemplate, "utf-8"), "utf-8");
    }
    copied.push(giDest);
  }

  const envExampleTemplate = join(pluginRoot, "templates/host-package/.env.example");
  const envExampleDest = join(evalHome, ".env.example");
  if (existsSync(envExampleTemplate) && !existsSync(envExampleDest)) {
    if (!opts.dryRun) {
      writeFileSync(envExampleDest, readFileSync(envExampleTemplate, "utf-8"), "utf-8");
    }
    copied.push(envExampleDest);
  } else if (existsSync(envExampleDest)) {
    skipped.push(envExampleDest);
  }

  const configPatched = patchConfigHostLayout(evalHome, "ejected", !!opts.dryRun);

  const primitives = opts.skipPrimitives
    ? undefined
    : stampEjectedPrimitives({
        repoRoot,
        pluginRoot,
        dryRun: !!opts.dryRun,
        layout: opts.primitivesLayout,
      });

  return {
    evalHome,
    pluginRoot,
    copied,
    skipped,
    packageJson: pkgDest,
    configPatched,
    primitives,
  };
}

/** Redirect root eval aliases to the self-contained nested package after eject. */
export function stampRootEvalAliases(
  repoRoot: string,
  pluginRoot: string,
  dryRun = false,
): { updated: string[]; path: string; action: string } {
  const pkgPath = join(repoRoot, "package.json");
  if (!existsSync(pkgPath)) {
    return { updated: [], path: pkgPath, action: "skipped-no-root-package" };
  }
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    scripts?: Record<string, string>;
  };
  const scripts = { ...(pkg.scripts ?? {}) };
  const updated: string[] = [];
  const hostKeys = new Set(hostEvalScriptKeys(pluginRoot));
  hostKeys.add("eval:stamp-host-layout");

  for (const key of hostKeys) {
    const delegated = `pnpm -C .zoto/eval-system ${key}`;
    if (scripts[key] !== delegated) {
      scripts[key] = delegated;
      updated.push(key);
    }
  }

  for (const key of Object.keys(scripts)) {
    if ((key === "eval" || key.startsWith("eval:")) && !hostKeys.has(key)) {
      const delegated = `pnpm -C .zoto/eval-system ${key}`;
      if (scripts[key] !== delegated) {
        scripts[key] = delegated;
        updated.push(key);
      }
    }
  }

  pkg.scripts = scripts;
  if (!dryRun) {
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf-8");
  }
  return {
    updated,
    path: pkgPath,
    action: dryRun ? "would-write" : "written",
  };
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

function parseCli(argv: string[]): StampHostLayoutOptions & { stripRoot?: boolean; json?: boolean } {
  const opts: StampHostLayoutOptions & { stripRoot?: boolean; json?: boolean } = {
    repoRoot: process.cwd(),
    dryRun: false,
    forceScripts: false,
    json: false,
  };
  for (const a of argv) {
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--force-scripts") opts.forceScripts = true;
    else if (a === "--strip-root") opts.stripRoot = true;
    else if (a === "--json") opts.json = true;
    else if (a.startsWith("--repo-root=")) opts.repoRoot = resolve(a.slice("--repo-root=".length));
  }
  return opts;
}

function printEjectSummary(result: StampHostLayoutResult, dryRun: boolean): void {
  const mode = dryRun ? "Dry-run — would eject" : "Ejected";
  const lines = [
    `${mode} eval-system runtime to ${result.evalHome}`,
    `  Plugin source: ${result.pluginRoot}`,
    `  Copied: ${result.copied.length} path(s)`,
    `  Skipped: ${result.skipped.length} path(s)`,
    `  config.yml hostLayout: ${result.configPatched ? "ejected" : "(no config.yml — run /z-eval-init first)"}`,
  ];
  if (result.primitives) {
    const p = result.primitives;
    lines.push(
      `  Primitives (${p.layout}): ${p.agents.length} agent(s), ${p.skills.length} skill(s), ${p.commands.length} command(s) → ${describeEjectedPrimitivesLayout(p.layout)}`,
    );
    if (p.skipped.length > 0) {
      lines.push(`  Primitives skipped: ${p.skipped.length}`);
    }
  }
  if (!dryRun) {
    lines.push("");
    lines.push("Next steps:");
    lines.push("  1. cd .zoto/eval-system && pnpm install  # npm fallback if pnpm unavailable");
    lines.push("  2. Run eval commands from .zoto/eval-system (pnpm run eval, etc.)");
    if (result.primitives?.layout === "flat-prefix") {
      lines.push(
        "  3. Eval slash commands/agents use eval-sys--* prefix under .cursor/ (IDE discovery)",
      );
    } else if (result.primitives) {
      lines.push("  3. Eval primitives live under .cursor/*/eval-sys/");
    }
  } else {
    lines.push("");
    lines.push("Re-run without --dry-run to apply.");
  }
  console.log(lines.join("\n"));
}

if (process.argv[1]?.endsWith("stamp-host-layout.ts")) {
  const opts = parseCli(process.argv.slice(2));
  const result = stampHostLayout(opts);
  let rootStrip = null;
  if (opts.stripRoot) {
    rootStrip = stripRootEvalPackage(opts.repoRoot, opts.dryRun);
  }
  printEjectSummary(result, !!opts.dryRun);
  if (opts.json) {
    console.log(JSON.stringify({ ...result, rootStrip }, null, 2));
  }
}
