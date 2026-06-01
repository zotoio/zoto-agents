#!/usr/bin/env tsx
/**
 * Install the Eval System plugin locally for development and testing.
 *
 * Copies plugin files to every Cursor local install location:
 *   - ~/.cursor/plugins/zoto-eval-system/
 *   - ~/.cursor/plugins/local/zoto-eval-system/
 *
 * Registers the plugin in ~/.claude/ config files so Cursor discovers it.
 *
 * Usage:
 *   pnpm install-local
 *   pnpm install-local --dry-run
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { ensureNativeDeps } from "./ensure-native-deps.js";
import { installPackageDeps } from "./install-package-deps.js";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

const PLUGIN_NAME = "zoto-eval-system";
const PLUGIN_ID = `${PLUGIN_NAME}@local`;

const REPO_ROOT = resolve(import.meta.dirname, "..");

const CURSOR_PLUGINS_DIR = join(homedir(), ".cursor", "plugins");
/** Primary install dir (install-local / dev dogfood). */
const INSTALL_DIR = join(CURSOR_PLUGINS_DIR, PLUGIN_NAME);
/** Nested local bundle dir — also scanned by resolvePluginRoot(); keep in sync. */
const LOCAL_BUNDLE_DIR = join(CURSOR_PLUGINS_DIR, "local", PLUGIN_NAME);

const INSTALL_TARGETS = [INSTALL_DIR, LOCAL_BUNDLE_DIR] as const;

const CLAUDE_DIR = join(homedir(), ".claude");
const CLAUDE_PLUGINS_FILE = join(CLAUDE_DIR, "plugins", "installed_plugins.json");
const CLAUDE_SETTINGS_FILE = join(CLAUDE_DIR, "settings.json");

const PLUGIN_DIRS = [
  ".cursor-plugin",
  "agents",
  "commands",
  "docs",
  "engine",
  "hooks",
  "rules",
  "skills",
  "src",
  "templates",
  "scripts",
];
const PLUGIN_FILES = ["CHANGELOG.md", "LICENSE", "README.md", "package.json"];

const dryRun = process.argv.includes("--dry-run");

function loadJson(path: string): Record<string, unknown> {
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      /* fallthrough */
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

function copyPluginFiles(installDir: string): void {
  if (dryRun) {
    console.log(`  [dry-run] would remove and recreate ${installDir}`);
  } else {
    if (existsSync(installDir)) rmSync(installDir, { recursive: true });
    mkdirSync(installDir, { recursive: true });
  }

  for (const dirName of PLUGIN_DIRS) {
    const src = join(REPO_ROOT, dirName);
    if (existsSync(src)) {
      const dest = join(installDir, dirName);
      if (dryRun) console.log(`  [dry-run] would copy ${src} -> ${dest}`);
      else cpSync(src, dest, { recursive: true });
    }
  }

  for (const fileName of PLUGIN_FILES) {
    const src = join(REPO_ROOT, fileName);
    if (existsSync(src)) {
      const dest = join(installDir, fileName);
      if (dryRun) console.log(`  [dry-run] would copy ${src} -> ${dest}`);
      else copyFileSync(src, dest);
    }
  }

  const lockSrc = join(REPO_ROOT, "pnpm-lock.yaml");
  if (existsSync(lockSrc)) {
    const lockDest = join(installDir, "pnpm-lock.yaml");
    if (dryRun) console.log(`  [dry-run] would copy ${lockSrc} -> ${lockDest}`);
    else copyFileSync(lockSrc, lockDest);
  }
}

function installPluginDependencies(installDir: string): void {
  if (dryRun) {
    console.log(`  [dry-run] would run pnpm/npm install in ${installDir}`);
    return;
  }
  const result = installPackageDeps({
    cwd: installDir,
    pnpmArgs: ["--ignore-workspace"],
  });
  if (result.exitCode !== 0) {
    console.warn(
      `  Warning: dependency install in ${installDir} exited ${result.exitCode} (${result.attempted.join(" → ")}) — run manually if eval commands fail.`,
    );
  } else {
    console.log(`  Dependencies installed (${result.manager}) in ${installDir}`);
    const native = ensureNativeDeps({ pluginRoot: installDir });
    if (native.sqlite3Built) {
      console.log("  sqlite3 native binding present.");
    } else if (native.sqlite3Dir) {
      console.warn(
        "  Warning: sqlite3 binding still missing — run `npm run install` in the plugin's sqlite3 package.",
      );
    }
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

for (const target of INSTALL_TARGETS) {
  console.log(`  Target: ${target}`);
  copyPluginFiles(target);
  console.log("  Plugin files copied.");
  installPluginDependencies(target);
}

registerPlugin();
console.log("  Plugin registered in ~/.claude/ config.");

console.log();
if (dryRun) {
  console.log("Dry run complete — no changes were made.");
} else {
  console.log("Done. Restart Cursor to load the plugin.");
}
