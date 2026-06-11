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
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";

import {
  ensurePluginBuilt,
  pathTriggersPluginBuild,
} from "../../plugins/zoto-cursor-top/scripts/ensure-build.mjs";
import { ensureRuntimeDeps } from "../../plugins/zoto-cursor-top/scripts/install-runtime-deps.mjs";
import { symlinkCursorTop } from "../../plugins/zoto-cursor-top/scripts/symlink-binary.mjs";

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

/** Extra payload for plugins that ship a CLI binary (cursor-top). */
const PLUGIN_EXTRA_SYNC = {
  "zoto-cursor-top": {
    dirs: ["bin", "dist", "scripts", "assets"],
    files: ["package.json"],
  },
};

const CURSOR_TOP_PLUGIN = "zoto-cursor-top";
const CURSOR_TOP_BINARY = "bin/cursor-top.mjs";

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

function pluginExtraSync(pluginName) {
  return PLUGIN_EXTRA_SYNC[pluginName] ?? null;
}

function isSyncable(relPath, pluginName) {
  const top = relPath.split(sep)[0];
  if (SYNCABLE_DIRS.has(top) || SYNCABLE_FILES.has(relPath)) return true;
  const extra = pluginExtraSync(pluginName);
  if (!extra) return false;
  return extra.dirs.includes(top) || extra.files.includes(relPath);
}

function fullSyncPlugin(pluginName) {
  const pluginSrc = join(PLUGINS_SRC, pluginName);
  const installDir = join(CURSOR_LOCAL, pluginName);
  const extra = pluginExtraSync(pluginName);
  const preservedNodeModules = join(installDir, "node_modules");

  clearSymlinkIfPresent(installDir);

  let nodeModulesBackup = null;
  if (extra && existsSync(preservedNodeModules)) {
    nodeModulesBackup = mkdtempSync(join(tmpdir(), "zoto-sync-nm-"));
    cpSync(preservedNodeModules, join(nodeModulesBackup, "node_modules"), {
      recursive: true,
    });
  }

  if (existsSync(installDir)) {
    rmSync(installDir, { recursive: true });
  }
  mkdirSync(installDir, { recursive: true });

  if (nodeModulesBackup) {
    cpSync(join(nodeModulesBackup, "node_modules"), preservedNodeModules, {
      recursive: true,
    });
    rmSync(nodeModulesBackup, { recursive: true, force: true });
  }

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

  if (extra) {
    for (const dirName of extra.dirs) {
      const src = join(pluginSrc, dirName);
      if (existsSync(src)) {
        cpSync(src, join(installDir, dirName), { recursive: true });
      }
    }
    for (const fileName of extra.files) {
      const src = join(pluginSrc, fileName);
      if (existsSync(src)) {
        copyFileSync(src, join(installDir, fileName));
      }
    }
  }
}

function buildCursorTopPlugin() {
  const pluginSrc = join(PLUGINS_SRC, CURSOR_TOP_PLUGIN);
  return ensurePluginBuilt(pluginSrc, { silent: true });
}

function copyCursorTopBuildArtifacts(pluginSrc, installDir) {
  for (const dirName of ["dist", "bin"]) {
    const src = join(pluginSrc, dirName);
    if (!existsSync(src)) continue;
    const dest = join(installDir, dirName);
    if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
    cpSync(src, dest, { recursive: true });
  }
}

function finalizeCursorTopAfterSync(pluginName, installDir) {
  if (pluginName !== CURSOR_TOP_PLUGIN) return;
  ensureRuntimeDeps(installDir);
  const binaryPath = join(installDir, CURSOR_TOP_BINARY);
  symlinkCursorTop(binaryPath);
}

/**
 * Rebuild and push dist/bin when a source file under zoto-cursor-top changes.
 * Returns true when handled (incremental hook should still run syncFile for
 * other syncable paths).
 */
function maybeRebuildCursorTopFromEdit(absPath) {
  const pluginSrc = join(PLUGINS_SRC, CURSOR_TOP_PLUGIN);
  if (!pathTriggersPluginBuild(absPath, pluginSrc)) return false;
  buildCursorTopPlugin();
  const installDir = join(CURSOR_LOCAL, CURSOR_TOP_PLUGIN);
  mkdirSync(installDir, { recursive: true });
  copyCursorTopBuildArtifacts(pluginSrc, installDir);
  finalizeCursorTopAfterSync(CURSOR_TOP_PLUGIN, installDir);
  return true;
}

function syncFile(absPath) {
  const relToPlugins = relative(PLUGINS_SRC, absPath);
  if (!relToPlugins || relToPlugins.startsWith("..")) return false;

  const parts = relToPlugins.split(sep);
  if (parts.length < 2) return false;

  const pluginName = parts[0];
  const relInPlugin = parts.slice(1).join(sep);

  if (!isSyncable(relInPlugin, pluginName)) return false;
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
  if (plugins.includes(CURSOR_TOP_PLUGIN)) {
    buildCursorTopPlugin();
  }
  for (const name of plugins) {
    fullSyncPlugin(name);
    finalizeCursorTopAfterSync(name, join(CURSOR_LOCAL, name));
  }
  respond();
} else if (mode === "--incremental") {
  const input = await readStdin();
  const filePath = input?.file_path;
  if (filePath) {
    const absPath = resolve(filePath);
    maybeRebuildCursorTopFromEdit(absPath);
    if (syncFile(absPath)) {
      const relToPlugins = relative(PLUGINS_SRC, absPath);
      if (relToPlugins && !relToPlugins.startsWith("..")) {
        const pluginName = relToPlugins.split(sep)[0];
        finalizeCursorTopAfterSync(pluginName, join(CURSOR_LOCAL, pluginName));
      }
    }
  }
  respond();
} else {
  await readStdin();
  respond();
}
