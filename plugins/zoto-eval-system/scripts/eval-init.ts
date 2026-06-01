#!/usr/bin/env tsx
/**
 * Initialise eval-system host scaffolding: config.yml, eval-home runtime shell,
 * repo-root .env.example / .gitignore, and eval-home dependency install.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { resolvePluginRoot } from "../src/paths.js";
import { ensureHostFiles } from "./ensure-host-env-and-gitignore.js";
import { stampLeanLayout } from "./stamp-lean-layout.js";

export interface EvalInitOptions {
  repoRoot: string;
  force?: boolean;
  dryRun?: boolean;
}

export interface EvalInitResult {
  configPath: string;
  evalHome: string;
  lean: ReturnType<typeof stampLeanLayout>;
}

export function evalInit(opts: EvalInitOptions): EvalInitResult {
  const repoRoot = resolve(opts.repoRoot);
  const evalHome = join(repoRoot, ".zoto", "eval-system");
  const configPath = join(evalHome, "config.yml");
  const dryRun = !!opts.dryRun;

  const pluginRoot = resolvePluginRoot(repoRoot);
  const initTemplate = join(pluginRoot, "templates", "init-config.yml");
  if (!existsSync(initTemplate)) {
    throw new Error(`templates/init-config.yml not found at ${initTemplate}`);
  }

  if (existsSync(configPath) && !opts.force) {
    throw new Error(
      ".zoto/eval-system/config.yml already exists; pass --force to overwrite",
    );
  }

  if (!dryRun) {
    mkdirSync(evalHome, { recursive: true });
    writeFileSync(configPath, readFileSync(initTemplate, "utf-8"), "utf-8");
  }

  ensureHostFiles({
    repoRoot,
    templatePath: join(pluginRoot, "templates", "env", ".env.example.tmpl"),
    dryRun,
  });

  const lean = stampLeanLayout({
    repoRoot,
    dryRun,
    skipLlmHarness: true,
    installDeps: !dryRun,
  });

  return { configPath, evalHome, lean };
}

function parseCli(argv: string[]): EvalInitOptions {
  const opts: EvalInitOptions = {
    repoRoot: process.cwd(),
    force: false,
    dryRun: false,
  };
  for (const a of argv) {
    if (a === "--force") opts.force = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a.startsWith("--repo-root=")) {
      opts.repoRoot = resolve(a.slice("--repo-root=".length));
    } else if (a === "--repo-root") {
      const idx = argv.indexOf(a);
      const v = argv[idx + 1];
      if (v) opts.repoRoot = resolve(v);
    }
  }
  return opts;
}

if (process.argv[1]?.endsWith("eval-init.ts")) {
  try {
    const result = evalInit(parseCli(process.argv.slice(2)));
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(msg);
    process.exit(1);
  }
}
