#!/usr/bin/env tsx
/**
 * Remove the locally-installed Eval System plugin.
 *
 * Removes files from ~/.cursor/plugins/zoto-eval-system/ and deregisters
 * the plugin from ~/.claude/ config files.
 *
 * Usage:
 *   pnpm uninstall-local          # uninstall
 *   pnpm uninstall-local --dry-run # preview without writing
 */

import {
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";

const PLUGIN_NAME = "zoto-eval-system";
const PLUGIN_ID = `${PLUGIN_NAME}@local`;

const INSTALL_DIR = join(homedir(), ".cursor", "plugins", PLUGIN_NAME);
const CLAUDE_PLUGINS_FILE = join(
  homedir(),
  ".claude",
  "plugins",
  "installed_plugins.json",
);
const CLAUDE_SETTINGS_FILE = join(homedir(), ".claude", "settings.json");

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

function removePluginFiles(): void {
  if (existsSync(INSTALL_DIR)) {
    if (dryRun) {
      console.log(`  [dry-run] would remove ${INSTALL_DIR}`);
    } else {
      rmSync(INSTALL_DIR, { recursive: true });
      console.log(`  Removed ${INSTALL_DIR}`);
    }
  } else {
    console.log(`  ${INSTALL_DIR} does not exist — nothing to remove.`);
  }
}

function deregisterPlugin(): void {
  const data = loadJson(CLAUDE_PLUGINS_FILE);
  const plugins = (data.plugins ?? {}) as Record<string, unknown>;
  if (PLUGIN_ID in plugins) {
    delete plugins[PLUGIN_ID];
    if (Object.keys(plugins).length > 0) {
      data.plugins = plugins;
    } else {
      delete data.plugins;
    }
    writeJson(CLAUDE_PLUGINS_FILE, data);
    console.log(`  Removed ${PLUGIN_ID} from ${CLAUDE_PLUGINS_FILE}`);
  } else {
    console.log(`  ${PLUGIN_ID} not found in ${CLAUDE_PLUGINS_FILE}`);
  }

  const settings = loadJson(CLAUDE_SETTINGS_FILE);
  const enabled = (settings.enabledPlugins ?? {}) as Record<string, unknown>;
  if (PLUGIN_ID in enabled) {
    delete enabled[PLUGIN_ID];
    if (Object.keys(enabled).length > 0) {
      settings.enabledPlugins = enabled;
    } else {
      delete settings.enabledPlugins;
    }
    writeJson(CLAUDE_SETTINGS_FILE, settings);
    console.log(`  Removed ${PLUGIN_ID} from ${CLAUDE_SETTINGS_FILE}`);
  } else {
    console.log(`  ${PLUGIN_ID} not found in ${CLAUDE_SETTINGS_FILE}`);
  }
}

console.log(`Uninstalling ${PLUGIN_NAME}...`);
removePluginFiles();
deregisterPlugin();

console.log();
if (dryRun) {
  console.log("Dry run complete — no changes were made.");
} else {
  console.log("Done. Restart Cursor to finalize removal.");
}
