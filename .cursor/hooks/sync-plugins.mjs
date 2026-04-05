#!/usr/bin/env node
/**
 * Cursor hook: sync all plugin source dirs to ~/.cursor/plugins/local/.
 *
 * Discovers plugins dynamically by scanning the plugins/ directory for
 * subdirectories containing .cursor-plugin/plugin.json.
 *
 * Modes (set via CLI argument):
 *   --full          Full sync of every discovered plugin (used by sessionStart)
 *   --incremental   Read stdin for { file_path }, sync that single file (used by afterFileEdit)
 */

import {
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { homedir } from "node:os";

const REPO_ROOT = resolve(import.meta.dirname, "..", "..");
const PLUGINS_SRC = join(REPO_ROOT, "plugins");
const CURSOR_LOCAL = join(homedir(), ".cursor", "plugins", "local");

const SYNCABLE_DIRS = new Set([
  ".cursor-plugin",
  "agents",
  "commands",
  "docs",
  "hooks",
  "rules",
  "skills",
  "templates",
]);
const SYNCABLE_FILES = new Set(["CHANGELOG.md", "LICENSE", "README.md"]);

function respond(obj = {}) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    setTimeout(() => resolve({}), 2000);
  });
}

function discoverPlugins() {
  if (!existsSync(PLUGINS_SRC)) return [];
  return readdirSync(PLUGINS_SRC).filter((name) => {
    const manifest = join(PLUGINS_SRC, name, ".cursor-plugin", "plugin.json");
    return existsSync(manifest);
  });
}

function clearSymlinkIfPresent(installDir) {
  if (!existsSync(installDir)) return;
  try {
    if (lstatSync(installDir).isSymbolicLink()) {
      rmSync(installDir);
    }
  } catch {
    // not a symlink or doesn't exist
  }
}

function isSyncable(relPath) {
  const top = relPath.split(sep)[0];
  return SYNCABLE_DIRS.has(top) || SYNCABLE_FILES.has(relPath);
}

function fullSyncPlugin(pluginName) {
  const pluginSrc = join(PLUGINS_SRC, pluginName);
  const installDir = join(CURSOR_LOCAL, pluginName);

  clearSymlinkIfPresent(installDir);

  if (existsSync(installDir)) {
    rmSync(installDir, { recursive: true });
  }
  mkdirSync(installDir, { recursive: true });

  for (const dir of SYNCABLE_DIRS) {
    const src = join(pluginSrc, dir);
    if (existsSync(src)) {
      cpSync(src, join(installDir, dir), { recursive: true });
    }
  }
  for (const file of SYNCABLE_FILES) {
    const src = join(pluginSrc, file);
    if (existsSync(src)) {
      copyFileSync(src, join(installDir, file));
    }
  }
}

function syncFile(absPath) {
  const relToPlugins = relative(PLUGINS_SRC, absPath);
  if (!relToPlugins || relToPlugins.startsWith("..")) return false;

  const parts = relToPlugins.split(sep);
  if (parts.length < 2) return false;

  const pluginName = parts[0];
  const relInPlugin = parts.slice(1).join(sep);

  if (!isSyncable(relInPlugin)) return false;
  if (!existsSync(join(PLUGINS_SRC, pluginName, ".cursor-plugin", "plugin.json"))) return false;

  const src = join(PLUGINS_SRC, pluginName, relInPlugin);
  const dest = join(CURSOR_LOCAL, pluginName, relInPlugin);

  if (existsSync(src)) {
    const stat = statSync(src);
    if (stat.isDirectory()) {
      mkdirSync(dest, { recursive: true });
    } else {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
    }
  } else if (existsSync(dest)) {
    rmSync(dest, { recursive: lstatSync(dest).isDirectory() });
  }
  return true;
}

// --- main ---

const mode = process.argv[2];

if (mode === "--full") {
  await readStdin();
  const plugins = discoverPlugins();
  for (const name of plugins) {
    fullSyncPlugin(name);
  }
  respond();
} else if (mode === "--incremental") {
  const input = await readStdin();
  const filePath = input?.file_path;
  if (filePath) {
    syncFile(resolve(filePath));
  }
  respond();
} else {
  await readStdin();
  respond();
}
