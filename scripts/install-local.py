#!/usr/bin/env python3
"""Install the Spec System plugin locally for development and testing.

Copies plugin files to ~/.cursor/plugins/zoto-spec-system/ and registers
the plugin in ~/.claude/ config files so Cursor discovers it on next restart.

Usage:
    python3 scripts/install-local.py          # install
    python3 scripts/install-local.py --dry-run # preview without writing
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from pathlib import Path

PLUGIN_NAME = "zoto-spec-system"
PLUGIN_ID = f"{PLUGIN_NAME}@local"

REPO_ROOT = Path(__file__).resolve().parents[1]

CURSOR_PLUGINS_DIR = Path.home() / ".cursor" / "plugins"
INSTALL_DIR = CURSOR_PLUGINS_DIR / PLUGIN_NAME

CLAUDE_DIR = Path.home() / ".claude"
CLAUDE_PLUGINS_FILE = CLAUDE_DIR / "plugins" / "installed_plugins.json"
CLAUDE_SETTINGS_FILE = CLAUDE_DIR / "settings.json"

PLUGIN_DIRS = [
    ".cursor-plugin",
    "agents",
    "commands",
    "docs",
    "hooks",
    "rules",
    "skills",
    "templates",
]
PLUGIN_FILES = [
    "CHANGELOG.md",
    "LICENSE",
    "README.md",
]


def _load_json(path: Path) -> dict:
    if path.is_file():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def _write_json(path: Path, data: dict, *, dry_run: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(data, indent=2) + "\n"
    if dry_run:
        print(f"  [dry-run] would write {path}")
        return
    path.write_text(payload, encoding="utf-8")


def copy_plugin_files(*, dry_run: bool = False) -> None:
    """Copy plugin directories and top-level files to the install location."""
    if not dry_run:
        if INSTALL_DIR.exists():
            shutil.rmtree(INSTALL_DIR)
        INSTALL_DIR.mkdir(parents=True, exist_ok=True)
    else:
        print(f"  [dry-run] would remove and recreate {INSTALL_DIR}")

    for dirname in PLUGIN_DIRS:
        src = REPO_ROOT / dirname
        if src.is_dir():
            dest = INSTALL_DIR / dirname
            if dry_run:
                print(f"  [dry-run] would copy {src} -> {dest}")
            else:
                shutil.copytree(src, dest)

    for filename in PLUGIN_FILES:
        src = REPO_ROOT / filename
        if src.is_file():
            dest = INSTALL_DIR / filename
            if dry_run:
                print(f"  [dry-run] would copy {src} -> {dest}")
            else:
                shutil.copy2(src, dest)


def register_plugin(*, dry_run: bool = False) -> None:
    """Register the plugin in ~/.claude/ config files."""
    data = _load_json(CLAUDE_PLUGINS_FILE)
    plugins = data.setdefault("plugins", {})
    entries = [
        e
        for e in plugins.get(PLUGIN_ID, [])
        if not (isinstance(e, dict) and e.get("scope") == "user")
    ]
    entries.insert(0, {"scope": "user", "installPath": str(INSTALL_DIR)})
    plugins[PLUGIN_ID] = entries
    _write_json(CLAUDE_PLUGINS_FILE, data, dry_run=dry_run)

    settings = _load_json(CLAUDE_SETTINGS_FILE)
    settings.setdefault("enabledPlugins", {})[PLUGIN_ID] = True
    _write_json(CLAUDE_SETTINGS_FILE, settings, dry_run=dry_run)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would happen without making changes",
    )
    args = parser.parse_args()

    manifest = REPO_ROOT / ".cursor-plugin" / "plugin.json"
    if not manifest.is_file():
        print(f"ERROR: plugin manifest not found at {manifest}", file=sys.stderr)
        sys.exit(1)

    print(f"Installing {PLUGIN_NAME} locally...")
    print(f"  Source: {REPO_ROOT}")
    print(f"  Target: {INSTALL_DIR}")

    copy_plugin_files(dry_run=args.dry_run)
    print("  Plugin files copied.")

    register_plugin(dry_run=args.dry_run)
    print("  Plugin registered in ~/.claude/ config.")

    print()
    if args.dry_run:
        print("Dry run complete — no changes were made.")
    else:
        print("Done. Restart Cursor to load the plugin.")


if __name__ == "__main__":
    main()
