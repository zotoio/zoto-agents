#!/usr/bin/env tsx
/**
 * Remove the locally-installed cursor-top plugin.
 *
 * Removes files from ~/.cursor/plugins/zoto-cursor-top/ and deregisters the
 * plugin from ~/.claude/ config files.
 *
 * Usage:
 *   pnpm uninstall-local            # uninstall
 *   pnpm uninstall-local --dry-run  # preview without writing
 */

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

const PLUGIN_NAME = "zoto-cursor-top";
const PLUGIN_ID = `${PLUGIN_NAME}@local`;
const BINARY_NAME = "cursor-top";

const INSTALL_DIR = join(homedir(), ".cursor", "plugins", PLUGIN_NAME);
const INSTALLED_BIN_ENTRY = join(INSTALL_DIR, "bin", "cursor-top.mjs");
const CLAUDE_PLUGINS_FILE = join(
  homedir(),
  ".claude",
  "plugins",
  "installed_plugins.json",
);
const CLAUDE_SETTINGS_FILE = join(homedir(), ".claude", "settings.json");

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
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

/**
 * Candidate directories to look in when removing the `cursor-top` symlink.
 *
 * Mirrors `install-local.ts#pickBinDir`: explicit override, ~/.local/bin,
 * then any other PATH entry under $HOME. We always probe all candidates
 * (rather than picking one) so a symlink that was installed before the
 * user reshuffled PATH still gets cleaned up.
 */
function symlinkCandidates(): string[] {
  if (binDirOverride) return [binDirOverride];
  const home = homedir();
  const xdgLocal = join(home, ".local", "bin");
  const pathEntries = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  const homeEntries = pathEntries.filter((p) => p.startsWith(home));
  const seen = new Set<string>([xdgLocal, ...homeEntries]);
  return [...seen];
}

function removeBinarySymlink(): void {
  let removedAny = false;
  for (const dir of symlinkCandidates()) {
    const linkPath = join(dir, BINARY_NAME);
    if (!existsSync(linkPath)) {
      let stat: ReturnType<typeof lstatSync> | null = null;
      try {
        stat = lstatSync(linkPath);
      } catch {
        /* not present */
      }
      if (!stat) continue;
    }
    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(linkPath);
    } catch {
      continue;
    }
    if (stat.isSymbolicLink()) {
      let target = "";
      try {
        target = readlinkSync(linkPath);
      } catch {
        /* ignore */
      }
      if (target && target !== INSTALLED_BIN_ENTRY) {
        console.log(
          `  Skipping ${linkPath} (points to ${target}, not our installed binary).`,
        );
        continue;
      }
      if (dryRun) {
        console.log(`  [dry-run] would remove symlink ${linkPath}`);
      } else {
        unlinkSync(linkPath);
        console.log(`  Removed symlink ${linkPath}`);
      }
      removedAny = true;
    } else {
      console.log(
        `  Skipping ${linkPath} (not a symlink — leaving alone in case it is operator-managed).`,
      );
    }
  }
  if (!removedAny) {
    console.log("  No cursor-top symlink found in PATH candidates.");
  }
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
    console.log(`  ${INSTALL_DIR} does not exist - nothing to remove.`);
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
removeBinarySymlink();
removePluginFiles();
deregisterPlugin();

console.log();
if (dryRun) {
  console.log("Dry run complete - no changes were made.");
} else {
  console.log("Done. Restart Cursor to finalize removal.");
}
