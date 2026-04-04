"""Spec System plugin validation tests."""

from __future__ import annotations

import json
import os
import py_compile
import re
from pathlib import Path

import pytest

PLUGIN_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = PLUGIN_DIR.parents[1]


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _load_json(path: Path) -> dict:
    return json.loads(_read_text(path))


# ---------------------------------------------------------------------------
# 1. Plugin Structure Validation
# ---------------------------------------------------------------------------


class TestPluginStructure:
    def test_plugin_json_valid(self):
        _load_json(PLUGIN_DIR / ".cursor-plugin" / "plugin.json")

    def test_plugin_json_required_fields(self):
        p = _load_json(PLUGIN_DIR / ".cursor-plugin" / "plugin.json")
        required = [
            "name", "displayName", "version", "description",
            "author", "license", "agents", "skills", "commands",
            "rules", "hooks",
        ]
        missing = [f for f in required if f not in p]
        assert not missing, f"Missing fields: {', '.join(missing)}"

    def test_directories_referenced_in_plugin_json_exist(self):
        for d in ("agents", "skills", "commands", "rules"):
            assert (PLUGIN_DIR / d).is_dir(), f"{d}/ missing"

    def test_hooks_json_exists(self):
        assert (PLUGIN_DIR / "hooks" / "hooks.json").is_file()

    def test_license_exists(self):
        assert (PLUGIN_DIR / "LICENSE").is_file()

    def test_readme_not_stub(self):
        readme = PLUGIN_DIR / "README.md"
        assert readme.is_file()
        lines = _read_text(readme).splitlines()
        assert len(lines) > 50, f"README only {len(lines)} lines — looks like a stub"


# ---------------------------------------------------------------------------
# 2. Config Schema Validation
# ---------------------------------------------------------------------------


class TestConfigSchema:
    def test_example_config_valid_json(self):
        _load_json(PLUGIN_DIR / "docs" / "example-config.json")

    def test_template_config_valid_json(self):
        _load_json(PLUGIN_DIR / "templates" / "config.json")

    def test_example_config_required_fields(self):
        c = _load_json(PLUGIN_DIR / "docs" / "example-config.json")
        required = ["unitOfWork", "plansDir", "workDir", "hooks", "plan", "extensions"]
        missing = [f for f in required if f not in c]
        assert not missing, f"Missing fields: {', '.join(missing)}"


# ---------------------------------------------------------------------------
# 3. Content Integrity — No CRUX References
# ---------------------------------------------------------------------------


class TestContentIntegrity:
    _EXCLUDED = {"memory-extension-guide.md", "test_plugin.py", "validate-plugin.py"}

    def test_no_crux_references(self):
        pattern = re.compile(r"crux", re.IGNORECASE)
        hits: list[str] = []
        for path in PLUGIN_DIR.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix not in (".md", ".mdc", ".py", ".json"):
                continue
            if path.name in self._EXCLUDED:
                continue
            if "__pycache__" in str(path):
                continue
            try:
                text = _read_text(path)
            except UnicodeDecodeError:
                continue
            if pattern.search(text):
                hits.append(str(path.relative_to(PLUGIN_DIR)))
        assert not hits, f"CRUX references found in: {', '.join(hits)}"


# ---------------------------------------------------------------------------
# 4. Naming Convention — zoto- Prefix
# ---------------------------------------------------------------------------


class TestNamingConvention:
    def test_command_files_use_zoto_prefix(self):
        cmd_dir = PLUGIN_DIR / "commands"
        for f in cmd_dir.glob("*.md"):
            assert f.name.startswith("zoto-"), f"{f.name} missing zoto- prefix"

    def test_skill_dirs_use_zoto_prefix(self):
        skills_dir = PLUGIN_DIR / "skills"
        for d in skills_dir.iterdir():
            if d.is_dir():
                assert d.name.startswith("zoto-"), f"{d.name} missing zoto- prefix"

    def test_planner_agent_exists(self):
        assert (PLUGIN_DIR / "agents" / "zoto-spec-planner.md").is_file()

    def test_judge_agent_exists(self):
        assert (PLUGIN_DIR / "agents" / "zoto-spec-judge.md").is_file()

    def test_rule_file_exists(self):
        assert (PLUGIN_DIR / "rules" / "zoto-spec-system.mdc").is_file()


# ---------------------------------------------------------------------------
# 5. Cross-Reference Validation
# ---------------------------------------------------------------------------


class TestCrossReferences:
    def test_commands_reference_planner_or_judge(self):
        cmd_dir = PLUGIN_DIR / "commands"
        for f in cmd_dir.glob("zoto-*.md"):
            text = _read_text(f)
            assert "zoto-spec-planner" in text or "zoto-spec-judge" in text, (
                f"{f.name} references neither agent"
            )

    def test_judge_command_references_judge_agent(self):
        text = _read_text(PLUGIN_DIR / "commands" / "zoto-judge.md")
        assert "zoto-spec-judge" in text

    def test_execute_command_references_judge_agent(self):
        text = _read_text(PLUGIN_DIR / "commands" / "zoto-execute.md")
        assert "zoto-spec-judge" in text

    def test_judge_agent_references_judge_skill(self):
        text = _read_text(PLUGIN_DIR / "agents" / "zoto-spec-judge.md")
        assert "zoto-judge-plan" in text

    def test_planner_agent_references_judge(self):
        text = _read_text(PLUGIN_DIR / "agents" / "zoto-spec-planner.md")
        assert "zoto-spec-judge" in text

    def test_plan_command_references_create_skill(self):
        text = _read_text(PLUGIN_DIR / "commands" / "zoto-plan.md")
        assert "zoto-create-plan" in text

    def test_judge_command_references_judge_skill(self):
        text = _read_text(PLUGIN_DIR / "commands" / "zoto-judge.md")
        assert "zoto-judge-plan" in text

    def test_execute_command_references_execute_skill(self):
        text = _read_text(PLUGIN_DIR / "commands" / "zoto-execute.md")
        assert "zoto-execute-plan" in text

    def test_planner_agent_references_all_skills(self):
        text = _read_text(PLUGIN_DIR / "agents" / "zoto-spec-planner.md")
        for skill in ("zoto-create-plan", "zoto-judge-plan", "zoto-execute-plan"):
            assert skill in text, f"planner agent missing reference to {skill}"

    def test_hooks_json_references_existing_script(self):
        h = _load_json(PLUGIN_DIR / "hooks" / "hooks.json")
        for hook_list in h.get("hooks", {}).values():
            for entry in hook_list:
                cmd = entry.get("command", "")
                script = cmd.split()[-1] if cmd else ""
                path = PLUGIN_DIR / script
                assert path.is_file(), f"hooks.json references missing script: {script}"

    def test_hook_script_valid_python(self):
        script = PLUGIN_DIR / "hooks" / "zoto-session-start.py"
        py_compile.compile(str(script), doraise=True)
