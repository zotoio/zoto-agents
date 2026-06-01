#!/usr/bin/env tsx
/**
 * Cross-platform bridge from host-repo `package.json` eval aliases to plugin scripts.
 *
 * Stamped at `<repoRoot>/.zoto/eval-system/scripts/eval-bridge.ts` by `/z-eval-init`
 * and `/z-eval-create`. Resolves
 * the installed `zoto-eval-system` plugin at runtime (monorepo → env → Cursor install)
 * and execs the target script without shell interpolation.
 *
 * Loads `<repoRoot>/.env` before every child script so consumer-repo secrets
 * (e.g. `CURSOR_API_KEY`) are available to all `pnpm run eval:*` commands.
 *
 * Usage (from repo root):
 *   tsx .zoto/eval-system/scripts/eval-bridge.ts <script-base> [-- <args...>]
 *   tsx .zoto/eval-system/scripts/eval-bridge.ts engine/runner -- --list
 *   tsx .zoto/eval-system/scripts/eval-bridge.ts eval-discover
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { config as loadDotenv } from "dotenv";

/** Consumer repo root — `.env` lives here and must never be committed. */
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// Load repo-root `.env` before spawning plugin scripts (standard dotenv
// precedence: existing process.env wins over file values).
loadDotenv({ path: join(REPO_ROOT, ".env") });

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

function bootstrapCandidates(repoRoot: string): string[] {
  const found: string[] = [];
  const monorepo = join(repoRoot, "plugins", PLUGIN_DIR);
  if (hasPluginMarkers(monorepo)) found.push(resolve(monorepo));

  const envRoot = process.env.ZOTO_EVAL_PLUGIN_ROOT;
  if (envRoot) {
    const abs = resolve(envRoot);
    if (hasPluginMarkers(abs)) found.push(abs);
  }

  for (const base of cursorPluginsBases()) {
    const direct = join(base, PLUGIN_DIR);
    if (hasPluginMarkers(direct)) found.push(resolve(direct));
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const nested = join(base, entry.name, PLUGIN_DIR);
      if (hasPluginMarkers(nested)) found.push(resolve(nested));
    }
  }

  return [...new Set(found)];
}

async function importPathsModule(
  candidate: string,
): Promise<{ resolvePluginRoot: (repoRoot?: string) => string } | null> {
  for (const file of ["paths.js", "paths.ts"]) {
    const modulePath = join(candidate, "src", file);
    if (!existsSync(modulePath)) continue;
    try {
      return (await import(pathToFileURL(modulePath).href)) as {
        resolvePluginRoot: (repoRoot?: string) => string;
      };
    } catch {
      // try next file / candidate
    }
  }
  return null;
}

async function resolvePluginRoot(): Promise<string> {
  for (const candidate of bootstrapCandidates(REPO_ROOT)) {
    const mod = await importPathsModule(candidate);
    if (mod) {
      return mod.resolvePluginRoot(REPO_ROOT);
    }
  }
  console.error(
    "zoto-eval-system plugin not found. Install the plugin or set ZOTO_EVAL_PLUGIN_ROOT.",
  );
  process.exit(1);
}

function resolveScriptPath(pluginRoot: string, scriptBase: string): string {
  if (scriptBase.startsWith("engine/")) {
    return join(pluginRoot, `${scriptBase}.ts`);
  }
  const tsPath = join(pluginRoot, "scripts", `${scriptBase}.ts`);
  if (existsSync(tsPath)) return tsPath;
  const pyPath = join(pluginRoot, "scripts", `${scriptBase}.py`);
  if (existsSync(pyPath)) return pyPath;
  return tsPath;
}

function scriptArgsFromArgv(): string[] {
  const rest = process.argv.slice(3);
  const dash = rest.indexOf("--");
  return dash >= 0 ? rest.slice(dash + 1) : [];
}

async function main(): Promise<void> {
  const scriptBase = process.argv[2];
  if (!scriptBase) {
    console.error("usage: eval-bridge <script-base> [-- <args...>]");
    process.exit(1);
  }

  const pluginRoot = await resolvePluginRoot();
  const scriptPath = resolveScriptPath(pluginRoot, scriptBase);
  if (!existsSync(scriptPath)) {
    console.error(`script not found: ${scriptPath}`);
    process.exit(1);
  }

  const childEnv = {
    ...process.env,
    ZOTO_EVAL_HOST_REPO: REPO_ROOT,
  };

  const extraArgs = scriptArgsFromArgv();
  let exitCode: number;
  if (scriptPath.endsWith(".py")) {
    const result = spawnSync("python3", [scriptPath, ...extraArgs], {
      stdio: "inherit",
      shell: false,
      cwd: REPO_ROOT,
      env: childEnv,
    });
    exitCode = result.status ?? 1;
  } else {
    const spawnMod = (await import(
      pathToFileURL(join(pluginRoot, "src/spawn-tsx.js")).href
    )) as {
      spawnTsx: (opts: {
        scriptPath: string;
        args?: string[];
        cwd: string;
        env?: NodeJS.ProcessEnv;
        searchRoots?: string[];
      }) => { status: number | null };
    };
    const result = spawnMod.spawnTsx({
      scriptPath,
      args: extraArgs,
      cwd: pluginRoot,
      env: childEnv,
      searchRoots: [pluginRoot, REPO_ROOT],
    });
    exitCode = result.status ?? 1;
  }

  process.exit(exitCode);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
