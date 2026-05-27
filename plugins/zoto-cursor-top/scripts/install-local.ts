#!/usr/bin/env tsx
/**
 * Install the cursor-top plugin locally for development and testing.
 *
 * Copies plugin files to ~/.cursor/plugins/zoto-cursor-top/, registers the
 * plugin in ~/.claude/ config files so Cursor discovers it on next restart,
 * and symlinks the `cursor-top` binary into a directory on PATH (defaults
 * to ~/.local/bin) so the command works in any terminal and inside Cursor
 * agent shells.
 *
 * Usage:
 *   pnpm install-local                    # install (auto-builds dist/ first)
 *   pnpm install-local --dry-run          # preview without writing
 *   pnpm install-local --bin-dir <path>   # symlink into a custom PATH dir
 *   pnpm install-local --no-symlink       # skip the PATH symlink
 *   pnpm install-local --no-build         # assume dist/ is already built
 */

import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { delimiter } from "node:path";
import { homedir } from "node:os";

const PLUGIN_NAME = "zoto-cursor-top";
const PLUGIN_ID = `${PLUGIN_NAME}@local`;
const BINARY_NAME = "cursor-top";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const DIST_ENTRY = join(REPO_ROOT, "dist", "cli.js");
const BIN_ENTRY = join(REPO_ROOT, "bin", "cursor-top.mjs");
const CURSOR_PLUGINS_DIR = join(homedir(), ".cursor", "plugins");
const INSTALL_DIR = join(CURSOR_PLUGINS_DIR, PLUGIN_NAME);
const INSTALLED_BIN_ENTRY = join(INSTALL_DIR, "bin", "cursor-top.mjs");

const CLAUDE_DIR = join(homedir(), ".claude");
const CLAUDE_PLUGINS_FILE = join(CLAUDE_DIR, "plugins", "installed_plugins.json");
const CLAUDE_SETTINGS_FILE = join(CLAUDE_DIR, "settings.json");

const PLUGIN_DIRS = [
  ".cursor-plugin",
  "agents",
  "assets",
  "bin",
  "commands",
  "dist",
  "docs",
  "rules",
  "skills",
];
const PLUGIN_FILES = ["CHANGELOG.md", "LICENSE", "README.md", "package.json"];

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const noSymlink = argv.includes("--no-symlink");
const noBuild = argv.includes("--no-build");
const binDirIdx = argv.indexOf("--bin-dir");
const binDirOverride =
  binDirIdx !== -1 && argv[binDirIdx + 1] ? resolve(argv[binDirIdx + 1]!) : undefined;

function loadJson(path: string): Record<string, unknown> {
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      /* fall through */
    }
  }
  return {};
}

function writeJson(path: string, data: Record<string, unknown>): void {
  if (dryRun) {
    console.log(`  [dry-run] would write ${path}`);
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function copyPluginFiles(): void {
  if (dryRun) {
    console.log(`  [dry-run] would remove and recreate ${INSTALL_DIR}`);
  } else {
    if (existsSync(INSTALL_DIR)) rmSync(INSTALL_DIR, { recursive: true });
    mkdirSync(INSTALL_DIR, { recursive: true });
  }

  for (const dirName of PLUGIN_DIRS) {
    const src = join(REPO_ROOT, dirName);
    if (existsSync(src)) {
      const dest = join(INSTALL_DIR, dirName);
      if (dryRun) {
        console.log(`  [dry-run] would copy ${src} -> ${dest}`);
      } else {
        cpSync(src, dest, { recursive: true });
      }
    }
  }

  for (const fileName of PLUGIN_FILES) {
    const src = join(REPO_ROOT, fileName);
    if (existsSync(src)) {
      const dest = join(INSTALL_DIR, fileName);
      if (dryRun) {
        console.log(`  [dry-run] would copy ${src} -> ${dest}`);
      } else {
        copyFileSync(src, dest);
      }
    }
  }
}

function ensureDistBuilt(): void {
  if (existsSync(DIST_ENTRY)) return;
  if (noBuild) {
    console.warn(
      `  [warn] ${DIST_ENTRY} missing and --no-build was passed; the installed binary will fail until you run pnpm run build.`,
    );
    return;
  }
  if (dryRun) {
    console.log(`  [dry-run] would run pnpm run build (dist/ missing).`);
    return;
  }
  console.log("  Building dist/ (pnpm run build)...");
  execSync("pnpm run build", { cwd: REPO_ROOT, stdio: "inherit" });
}

/**
 * Install the plugin's runtime deps (Ink, React) into the install directory
 * so the binary works when invoked from PATH.
 *
 * We deliberately use `npm` over `pnpm` here: pnpm's workspace-aware
 * resolution refuses to operate outside the monorepo, but the install
 * target lives under `~/.cursor/plugins/`. A plain `npm install --omit=dev`
 * gives us a self-contained `node_modules/` next to the bundled CLI.
 */
function installRuntimeDeps(): void {
  if (dryRun) {
    console.log(`  [dry-run] would run npm install --omit=dev in ${INSTALL_DIR}`);
    return;
  }
  const targetPkg = join(INSTALL_DIR, "package.json");
  if (!existsSync(targetPkg)) {
    console.warn(`  [warn] ${targetPkg} missing; cannot install runtime deps.`);
    return;
  }
  console.log("  Installing runtime deps (npm install --omit=dev)...");
  try {
    execSync("npm install --omit=dev --no-audit --no-fund --silent", {
      cwd: INSTALL_DIR,
      stdio: "inherit",
    });
  } catch (err) {
    console.warn(
      `  [warn] npm install failed in ${INSTALL_DIR}: ${(err as Error).message}`,
    );
    console.warn(
      "         The binary will throw ERR_MODULE_NOT_FOUND until deps are present.",
    );
  }
}

/**
 * Pick a directory on PATH where we should drop the `cursor-top` symlink.
 *
 * Preference order:
 *   1. Explicit --bin-dir override.
 *   2. ~/.local/bin (XDG default, on PATH for most Linux/macOS users).
 *   3. First writable directory on PATH owned by the current user.
 *
 * Returns null when no suitable directory can be found. Callers should
 * skip the symlink and print install instructions in that case.
 */
function pickBinDir(): string | null {
  if (binDirOverride) return binDirOverride;

  const home = homedir();
  const xdgLocal = join(home, ".local", "bin");
  const pathEntries = (process.env.PATH ?? "").split(delimiter).filter(Boolean);

  if (pathEntries.includes(xdgLocal)) return xdgLocal;

  for (const entry of pathEntries) {
    if (entry.startsWith(home)) return entry;
  }
  return xdgLocal;
}

function symlinkBinary(): void {
  if (noSymlink) {
    console.log("  Skipping PATH symlink (--no-symlink).");
    return;
  }
  const binDir = pickBinDir();
  if (!binDir) {
    console.warn(
      `  [warn] could not find a writable PATH directory; add ${INSTALLED_BIN_ENTRY} to PATH manually.`,
    );
    return;
  }
  const linkTarget = INSTALLED_BIN_ENTRY;
  const linkPath = join(binDir, BINARY_NAME);

  if (dryRun) {
    console.log(`  [dry-run] would symlink ${linkPath} -> ${linkTarget}`);
    return;
  }

  mkdirSync(binDir, { recursive: true });

  let existing: ReturnType<typeof lstatSync> | null = null;
  try {
    existing = lstatSync(linkPath);
  } catch {
    /* not present */
  }
  if (existing) {
    if (existing.isSymbolicLink() || existing.isFile()) {
      unlinkSync(linkPath);
    } else {
      console.warn(
        `  [warn] ${linkPath} exists and is not a regular file/symlink; leaving alone.`,
      );
      return;
    }
  }

  symlinkSync(linkTarget, linkPath);
  console.log(`  Symlinked ${linkPath} -> ${linkTarget}`);

  const pathEntries = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  if (!pathEntries.includes(binDir)) {
    console.warn(
      `  [warn] ${binDir} is not on PATH in the current shell. Add it (e.g. export PATH="${binDir}:$PATH") or rerun with --bin-dir <on-PATH-dir>.`,
    );
  }
}

function registerPlugin(): void {
  const data = loadJson(CLAUDE_PLUGINS_FILE);
  const plugins = (data.plugins ?? {}) as Record<string, unknown[]>;
  const existing = Array.isArray(plugins[PLUGIN_ID]) ? plugins[PLUGIN_ID] : [];
  const filtered = existing.filter(
    (e) =>
      !(
        e &&
        typeof e === "object" &&
        (e as Record<string, unknown>).scope === "user"
      ),
  );
  filtered.unshift({ scope: "user", installPath: INSTALL_DIR });
  plugins[PLUGIN_ID] = filtered;
  data.plugins = plugins;
  writeJson(CLAUDE_PLUGINS_FILE, data);

  const settings = loadJson(CLAUDE_SETTINGS_FILE);
  const enabled = (settings.enabledPlugins ?? {}) as Record<string, boolean>;
  enabled[PLUGIN_ID] = true;
  settings.enabledPlugins = enabled;
  writeJson(CLAUDE_SETTINGS_FILE, settings);
}

console.log(`Installing ${PLUGIN_NAME} locally...`);
console.log(`  Source: ${REPO_ROOT}`);
console.log(`  Target: ${INSTALL_DIR}`);

ensureDistBuilt();
copyPluginFiles();
console.log("  Plugin files copied.");

installRuntimeDeps();

registerPlugin();
console.log("  Plugin registered in ~/.claude/ config.");

symlinkBinary();

if (!existsSync(BIN_ENTRY) && !dryRun) {
  console.warn(`  [warn] ${BIN_ENTRY} missing in source — symlink will not work.`);
}

console.log();
if (dryRun) {
  console.log("Dry run complete - no changes were made.");
} else {
  console.log("Done. Restart Cursor to load the plugin.");
  console.log("Run `cursor-top --help` to verify the binary is on PATH.");
}
