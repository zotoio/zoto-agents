#!/usr/bin/env tsx
/**
 * Install the Spec System plugin locally for development and testing.
 *
 * Copies plugin files to ~/.cursor/plugins/zoto-spec-system/ and registers
 * the plugin in ~/.claude/ config files so Cursor discovers it on next restart.
 *
 * Usage:
 *   pnpm install-local          # install
 *   pnpm install-local --dry-run # preview without writing
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
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

const PLUGIN_NAME = "zoto-spec-system";
const PLUGIN_ID = `${PLUGIN_NAME}@local`;

const REPO_ROOT = resolve(import.meta.dirname, "..");

const CURSOR_PLUGINS_DIR = join(homedir(), ".cursor", "plugins");
const INSTALL_DIR = join(CURSOR_PLUGINS_DIR, PLUGIN_NAME);

const CLAUDE_DIR = join(homedir(), ".claude");
const CLAUDE_PLUGINS_FILE = join(CLAUDE_DIR, "plugins", "installed_plugins.json");
const CLAUDE_SETTINGS_FILE = join(CLAUDE_DIR, "settings.json");

const PLUGIN_DIRS = [
  ".cursor-plugin",
  "agents",
  "commands",
  "docs",
  "hooks",
  "rules",
  "skills",
  "templates",
];
const PLUGIN_FILES = ["CHANGELOG.md", "LICENSE", "README.md"];

const dryRun = process.argv.includes("--dry-run");

function loadJson(path: string): Record<string, unknown> {
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, "utf-8"));
    } catch {
      // fall through
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

copyPluginFiles();
console.log("  Plugin files copied.");

registerPlugin();
console.log("  Plugin registered in ~/.claude/ config.");

console.log();
if (dryRun) {
  console.log("Dry run complete — no changes were made.");
} else {
  console.log("Done. Restart Cursor to load the plugin.");
}
