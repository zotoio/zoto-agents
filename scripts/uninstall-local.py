#!/usr/bin/env python3
"""Remove the locally-installed Spec System plugin.

Removes files from ~/.cursor/plugins/zoto-spec-system/ and deregisters
the plugin from ~/.claude/ config files.

Usage:
    python3 scripts/uninstall-local.py          # uninstall
    python3 scripts/uninstall-local.py --dry-run # preview without writing
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

PLUGIN_NAME = "zoto-spec-system"
PLUGIN_ID = f"{PLUGIN_NAME}@local"

INSTALL_DIR = Path.home() / ".cursor" / "plugins" / PLUGIN_NAME

CLAUDE_PLUGINS_FILE = Path.home() / ".claude" / "plugins" / "installed_plugins.json"
CLAUDE_SETTINGS_FILE = Path.home() / ".claude" / "settings.json"


def _load_json(path: Path) -> dict:
    if path.is_file():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def _write_json(path: Path, data: dict, *, dry_run: bool = False) -> None:
    payload = json.dumps(data, indent=2) + "\n"
    if dry_run:
        print(f"  [dry-run] would write {path}")
        return
    path.write_text(payload, encoding="utf-8")


def remove_plugin_files(*, dry_run: bool = False) -> None:
    if INSTALL_DIR.exists():
        if dry_run:
            print(f"  [dry-run] would remove {INSTALL_DIR}")
        else:
            shutil.rmtree(INSTALL_DIR)
            print(f"  Removed {INSTALL_DIR}")
    else:
        print(f"  {INSTALL_DIR} does not exist — nothing to remove.")


def deregister_plugin(*, dry_run: bool = False) -> None:
    data = _load_json(CLAUDE_PLUGINS_FILE)
    plugins = data.get("plugins", {})
    if PLUGIN_ID in plugins:
        del plugins[PLUGIN_ID]
        if plugins:
            data["plugins"] = plugins
        else:
            data.pop("plugins", None)
        _write_json(CLAUDE_PLUGINS_FILE, data, dry_run=dry_run)
        print(f"  Removed {PLUGIN_ID} from {CLAUDE_PLUGINS_FILE}")
    else:
        print(f"  {PLUGIN_ID} not found in {CLAUDE_PLUGINS_FILE}")

    settings = _load_json(CLAUDE_SETTINGS_FILE)
    enabled = settings.get("enabledPlugins", {})
    if PLUGIN_ID in enabled:
        del enabled[PLUGIN_ID]
        if enabled:
            settings["enabledPlugins"] = enabled
        else:
            settings.pop("enabledPlugins", None)
        _write_json(CLAUDE_SETTINGS_FILE, settings, dry_run=dry_run)
        print(f"  Removed {PLUGIN_ID} from {CLAUDE_SETTINGS_FILE}")
    else:
        print(f"  {PLUGIN_ID} not found in {CLAUDE_SETTINGS_FILE}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would happen without making changes",
    )
    args = parser.parse_args()

    print(f"Uninstalling {PLUGIN_NAME}...")
    remove_plugin_files(dry_run=args.dry_run)
    deregister_plugin(dry_run=args.dry_run)

    print()
    if args.dry_run:
        print("Dry run complete — no changes were made.")
    else:
        print("Done. Restart Cursor to finalize removal.")


if __name__ == "__main__":
    main()
