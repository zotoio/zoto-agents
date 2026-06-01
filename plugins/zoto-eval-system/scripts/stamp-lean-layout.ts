#!/usr/bin/env tsx
/**
 * Stamp the lean (plugin-dependent) eval-system host layout.
 *
 * Materialises repo-specific assets under `.zoto/eval-system/` including
 * `package.json`, `scripts/eval-bridge.ts`, cache dirs, and `.gitignore`.
 * Does NOT copy src/, engine/, templates/, or vendored plugin scripts —
 * use `stamp-host-layout.ts` (eject) for a self-contained runtime.
 *
 * Merges `lean-root-vitest.json` into the consumer repo root `package.json`
 * so `evals/vitest.config.ts` can resolve `vitest/config` when Vite bundles it.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { cleanupLegacyRootEvalScaffolding } from "./cleanup-legacy-root-eval.js";
import { ensureHostFiles } from "./ensure-host-env-and-gitignore.js";
import { installPackageDeps } from "./install-package-deps.js";
import { mergePackageJson } from "./package-json-merger.js";
import { stampUnifiedLlmHarness } from "./stamp-unified-llm-harness.js";

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const EVAL_HOME_SEGMENTS = [".zoto", "eval-system"] as const;

const GITKEEP_DIRS = [
  "cache",
  "cache/analyser",
] as const;

export interface StampLeanLayoutOptions {
  repoRoot: string;
  dryRun?: boolean;
  forceBridge?: boolean;
  /** Skip LLM harness stamping (init-only shell). */
  skipLlmHarness?: boolean;
  /** Run pnpm install (npm fallback) in `.zoto/eval-system/`. */
  installDeps?: boolean;
  /** Run pnpm install for root vitest harness deps (default: same as installDeps). */
  installRootDeps?: boolean;
}

export interface StampLeanLayoutResult {
  evalHome: string;
  created: string[];
  skipped: string[];
  bridgePath: string;
  packageJson: string;
  hostEnv: ReturnType<typeof ensureHostFiles>;
  legacyCleanup: ReturnType<typeof cleanupLegacyRootEvalScaffolding>;
  install?: ReturnType<typeof installPackageDeps>;
  installRoot?: ReturnType<typeof installPackageDeps>;
  llmHarness: {
    written: string[];
    unchanged: string[];
  };
}

function evalHomeFor(repoRoot: string): string {
  return join(repoRoot, ...EVAL_HOME_SEGMENTS);
}

function stampGitkeep(evalHome: string, rel: string, dryRun: boolean, created: string[]): void {
  const dir = join(evalHome, rel);
  const gitkeep = join(dir, ".gitkeep");
  if (existsSync(gitkeep)) return;
  if (!dryRun) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(gitkeep, "", "utf-8");
  }
  created.push(gitkeep);
}

function stampEvalHomeGitignore(
  evalHome: string,
  dryRun: boolean,
  created: string[],
  skipped: string[],
): void {
  const template = join(PLUGIN_ROOT, "templates", "host-package", ".gitignore");
  const dest = join(evalHome, ".gitignore");
  if (existsSync(dest)) {
    skipped.push(dest);
    return;
  }
  const body = existsSync(template)
    ? readFileSync(template, "utf-8")
    : "# zoto-eval-system lean layout\nnode_modules/\ncache/\n";
  if (!dryRun) {
    mkdirSync(evalHome, { recursive: true });
    writeFileSync(dest, body, "utf-8");
  }
  created.push(dest);
}

function bridgeMissingDotenvLoader(dest: string): boolean {
  if (!existsSync(dest)) return false;
  return !readFileSync(dest, "utf-8").includes("loadDotenv");
}

function stampEvalBridge(
  evalHome: string,
  dryRun: boolean,
  forceBridge: boolean,
  created: string[],
  skipped: string[],
): string {
  const template = join(PLUGIN_ROOT, "templates", "runner", "eval-bridge.ts.tmpl");
  const dest = join(evalHome, "scripts", "eval-bridge.ts");
  const shouldStamp =
    !existsSync(dest) || forceBridge || bridgeMissingDotenvLoader(dest);
  if (existsSync(dest) && !shouldStamp) {
    skipped.push(dest);
    return dest;
  }
  if (!existsSync(template)) {
    throw new Error(`missing eval-bridge template: ${template}`);
  }
  const body = readFileSync(template, "utf-8");
  if (!dryRun) {
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, body, "utf-8");
  }
  created.push(dest);
  return dest;
}

function stampEvalsRunsGitkeep(
  repoRoot: string,
  dryRun: boolean,
  created: string[],
): void {
  const runsDir = join(repoRoot, "evals", "_runs");
  const gitkeep = join(runsDir, ".gitkeep");
  if (existsSync(gitkeep)) return;
  if (!dryRun) {
    mkdirSync(runsDir, { recursive: true });
    writeFileSync(gitkeep, "", "utf-8");
  }
  created.push(gitkeep);
}

export function stampLeanLayout(opts: StampLeanLayoutOptions): StampLeanLayoutResult {
  const repoRoot = resolve(opts.repoRoot);
  const evalHome = evalHomeFor(repoRoot);
  const dryRun = !!opts.dryRun;
  const created: string[] = [];
  const skipped: string[] = [];

  if (!dryRun) mkdirSync(evalHome, { recursive: true });

  for (const rel of GITKEEP_DIRS) {
    stampGitkeep(evalHome, rel, dryRun, created);
  }

  stampEvalHomeGitignore(evalHome, dryRun, created, skipped);
  stampEvalsRunsGitkeep(repoRoot, dryRun, created);

  const bridgePath = stampEvalBridge(
    evalHome,
    dryRun,
    !!opts.forceBridge,
    created,
    skipped,
  );

  const basePath = join(PLUGIN_ROOT, "templates", "host-package", "lean-package.json");
  const rootVitestBase = join(
    PLUGIN_ROOT,
    "templates",
    "host-package",
    "lean-root-vitest.json",
  );
  const packageJson = join(evalHome, "package.json");
  const legacyCleanup = cleanupLegacyRootEvalScaffolding(repoRoot, dryRun);

  if (!dryRun) {
    mergePackageJson({
      packageJsonDir: evalHome,
      basePath,
      force: false,
      pruneStaleEvalDevDeps: true,
      pruneStaleEvalScripts: true,
    });
    if (existsSync(rootVitestBase)) {
      mergePackageJson({
        packageJsonDir: repoRoot,
        basePath: rootVitestBase,
        force: false,
        pruneStaleEvalDevDeps: false,
        pruneStaleEvalScripts: false,
      });
    }
  }

  const llmHarness = opts.skipLlmHarness
    ? { written: [] as string[], unchanged: [] as string[] }
    : stampUnifiedLlmHarness({ repoRoot, dryRun });

  const hostEnv = ensureHostFiles({
    repoRoot,
    templatePath: join(PLUGIN_ROOT, "templates", "env", ".env.example.tmpl"),
    dryRun,
  });

  let install: ReturnType<typeof installPackageDeps> | undefined;
  let installRoot: ReturnType<typeof installPackageDeps> | undefined;
  const installRootDeps = opts.installRootDeps ?? opts.installDeps;
  if (opts.installDeps && !dryRun) {
    install = installPackageDeps({
      cwd: evalHome,
      pnpmArgs: ["--ignore-workspace"],
    });
  }
  if (installRootDeps && !dryRun) {
    installRoot = installPackageDeps({ cwd: repoRoot });
  }

  return {
    evalHome,
    created,
    skipped,
    bridgePath,
    packageJson,
    hostEnv,
    legacyCleanup,
    install,
    installRoot,
    llmHarness: {
      written: llmHarness.written,
      unchanged: llmHarness.unchanged,
    },
  };
}

function parseCliArgs(argv: string[]): StampLeanLayoutOptions {
  const opts: StampLeanLayoutOptions = {
    repoRoot: process.cwd(),
    dryRun: false,
    forceBridge: false,
    skipLlmHarness: false,
    installDeps: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]!;
    if (a === "--repo-root") {
      const v = argv[++i];
      if (v) opts.repoRoot = resolve(v);
    } else if (a === "--dry-run") {
      opts.dryRun = true;
    } else if (a === "--force-bridge") {
      opts.forceBridge = true;
    } else if (a === "--skip-llm-harness") {
      opts.skipLlmHarness = true;
    } else if (a === "--install-deps") {
      opts.installDeps = true;
    }
  }
  return opts;
}

if (process.argv[1]?.endsWith("stamp-lean-layout.ts")) {
  const opts = parseCliArgs(process.argv.slice(2));
  const result = stampLeanLayout(opts);
  console.log(JSON.stringify(result, null, 2));
}
