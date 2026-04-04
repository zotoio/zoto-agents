#!/usr/bin/env python3
"""Validate the Spec System plugin structure before submission.

Runs structural checks on the plugin manifest, directories, naming
conventions, cross-references, and content integrity. Exits with
code 0 on success, 1 on failure.

Usage:
    python3 scripts/validate-plugin.py           # validate
    python3 scripts/validate-plugin.py --verbose  # show passing checks too
"""

from __future__ import annotations

import argparse
import json
import py_compile
import re
import sys
from pathlib import Path
from typing import NamedTuple

REPO_ROOT = Path(__file__).resolve().parents[1]


class CheckResult(NamedTuple):
    name: str
    passed: bool
    detail: str


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _load_json(path: Path) -> dict:
    return json.loads(_read_text(path))


def check_manifest() -> list[CheckResult]:
    results: list[CheckResult] = []
    manifest_path = REPO_ROOT / ".cursor-plugin" / "plugin.json"

    if not manifest_path.is_file():
        results.append(CheckResult("manifest_exists", False, f"Not found: {manifest_path}"))
        return results
    results.append(CheckResult("manifest_exists", True, str(manifest_path)))

    try:
        p = _load_json(manifest_path)
    except json.JSONDecodeError as e:
        results.append(CheckResult("manifest_valid_json", False, str(e)))
        return results
    results.append(CheckResult("manifest_valid_json", True, ""))

    required = ["name", "displayName", "version", "description", "author", "license"]
    missing = [f for f in required if f not in p]
    results.append(CheckResult(
        "manifest_required_fields",
        not missing,
        f"Missing: {', '.join(missing)}" if missing else "All present",
    ))

    name = p.get("name", "")
    name_ok = bool(re.match(r"^[a-z][a-z0-9-]*$", name))
    results.append(CheckResult(
        "manifest_name_kebab_case",
        name_ok,
        f"name={name!r}" + ("" if name_ok else " — must be lowercase kebab-case"),
    ))

    version = p.get("version", "")
    ver_ok = bool(re.match(r"^\d+\.\d+\.\d+$", version))
    results.append(CheckResult(
        "manifest_version_semver",
        ver_ok,
        f"version={version!r}" + ("" if ver_ok else " — must be semver"),
    ))

    return results


def check_directories() -> list[CheckResult]:
    results: list[CheckResult] = []
    for dirname in ("agents", "skills", "commands", "rules", "hooks"):
        exists = (REPO_ROOT / dirname).is_dir()
        results.append(CheckResult(
            f"dir_{dirname}",
            exists,
            f"{dirname}/ {'exists' if exists else 'MISSING'}",
        ))
    return results


def check_naming_conventions() -> list[CheckResult]:
    results: list[CheckResult] = []

    cmd_dir = REPO_ROOT / "commands"
    if cmd_dir.is_dir():
        for f in cmd_dir.glob("*.md"):
            ok = f.name.startswith("zoto-")
            results.append(CheckResult(
                f"cmd_prefix_{f.name}",
                ok,
                f"{f.name} {'has' if ok else 'MISSING'} zoto- prefix",
            ))

    skills_dir = REPO_ROOT / "skills"
    if skills_dir.is_dir():
        for d in skills_dir.iterdir():
            if d.is_dir():
                ok = d.name.startswith("zoto-")
                results.append(CheckResult(
                    f"skill_prefix_{d.name}",
                    ok,
                    f"{d.name} {'has' if ok else 'MISSING'} zoto- prefix",
                ))
                skill_md = d / "SKILL.md"
                results.append(CheckResult(
                    f"skill_md_{d.name}",
                    skill_md.is_file(),
                    f"SKILL.md {'exists' if skill_md.is_file() else 'MISSING'} in {d.name}/",
                ))

    return results


def check_cross_references() -> list[CheckResult]:
    results: list[CheckResult] = []

    cmd_dir = REPO_ROOT / "commands"
    agents_dir = REPO_ROOT / "agents"

    if cmd_dir.is_dir() and agents_dir.is_dir():
        for f in cmd_dir.glob("zoto-*.md"):
            text = _read_text(f)
            refs_agent = "zoto-spec-planner" in text or "zoto-spec-judge" in text
            results.append(CheckResult(
                f"xref_cmd_{f.stem}",
                refs_agent,
                f"{f.name} {'references' if refs_agent else 'MISSING reference to'} an agent",
            ))

        for agent_file in agents_dir.glob("*.md"):
            text = _read_text(agent_file)
            refs_skill = any(
                s in text
                for s in ("zoto-create-plan", "zoto-judge-plan", "zoto-execute-plan")
            )
            results.append(CheckResult(
                f"xref_agent_{agent_file.stem}",
                refs_skill,
                f"{agent_file.name} {'references' if refs_skill else 'MISSING reference to'} a skill",
            ))

    hooks_json = REPO_ROOT / "hooks" / "hooks.json"
    if hooks_json.is_file():
        h = _load_json(hooks_json)
        for hook_list in h.get("hooks", {}).values():
            for entry in hook_list:
                cmd = entry.get("command", "")
                script = cmd.split()[-1] if cmd else ""
                if script:
                    script_path = REPO_ROOT / script
                    results.append(CheckResult(
                        f"hook_script_{Path(script).name}",
                        script_path.is_file(),
                        f"{script} {'exists' if script_path.is_file() else 'MISSING'}",
                    ))

    return results


def check_python_syntax() -> list[CheckResult]:
    results: list[CheckResult] = []
    for py_file in REPO_ROOT.rglob("*.py"):
        if "__pycache__" in str(py_file):
            continue
        try:
            py_compile.compile(str(py_file), doraise=True)
            results.append(CheckResult(f"syntax_{py_file.name}", True, str(py_file.relative_to(REPO_ROOT))))
        except py_compile.PyCompileError as e:
            results.append(CheckResult(f"syntax_{py_file.name}", False, str(e)))
    return results


def check_content_integrity() -> list[CheckResult]:
    results: list[CheckResult] = []
    excluded = {"memory-extension-guide.md", "test_plugin.py", "validate-plugin.py"}
    pattern = re.compile(r"crux", re.IGNORECASE)
    hits: list[str] = []

    for path in REPO_ROOT.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix not in (".md", ".mdc", ".py", ".json"):
            continue
        if path.name in excluded:
            continue
        if "__pycache__" in str(path):
            continue
        try:
            text = _read_text(path)
        except UnicodeDecodeError:
            continue
        if pattern.search(text):
            hits.append(str(path.relative_to(REPO_ROOT)))

    results.append(CheckResult(
        "no_crux_references",
        not hits,
        f"Found in: {', '.join(hits)}" if hits else "Clean",
    ))
    return results


def check_required_files() -> list[CheckResult]:
    results: list[CheckResult] = []
    for filename in ("LICENSE", "README.md", "CHANGELOG.md"):
        exists = (REPO_ROOT / filename).is_file()
        results.append(CheckResult(
            f"file_{filename}",
            exists,
            f"{filename} {'exists' if exists else 'MISSING'}",
        ))

    readme = REPO_ROOT / "README.md"
    if readme.is_file():
        lines = _read_text(readme).splitlines()
        ok = len(lines) > 50
        results.append(CheckResult(
            "readme_not_stub",
            ok,
            f"README has {len(lines)} lines" + ("" if ok else " — looks like a stub"),
        ))
    return results


def check_eval_files() -> list[CheckResult]:
    results: list[CheckResult] = []
    skills_dir = REPO_ROOT / "skills"
    if not skills_dir.is_dir():
        return results

    for skill_dir in skills_dir.iterdir():
        if not skill_dir.is_dir():
            continue
        evals_file = skill_dir / "evals" / "evals.json"
        if not evals_file.is_file():
            results.append(CheckResult(
                f"evals_{skill_dir.name}",
                False,
                f"evals/evals.json MISSING in {skill_dir.name}/",
            ))
            continue

        try:
            data = _load_json(evals_file)
        except json.JSONDecodeError as e:
            results.append(CheckResult(f"evals_{skill_dir.name}", False, f"Invalid JSON: {e}"))
            continue

        evals = data.get("evals", [])
        has_evals = len(evals) >= 2
        results.append(CheckResult(
            f"evals_{skill_dir.name}",
            has_evals,
            f"{len(evals)} eval(s) in {skill_dir.name}" + ("" if has_evals else " — need at least 2"),
        ))

        for ev in evals:
            has_assertions = bool(ev.get("assertions"))
            results.append(CheckResult(
                f"evals_{skill_dir.name}_id{ev.get('id', '?')}_assertions",
                has_assertions,
                f"eval id={ev.get('id')}: {'has' if has_assertions else 'MISSING'} assertions",
            ))

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verbose", action="store_true", help="Show passing checks")
    args = parser.parse_args()

    all_checks: list[CheckResult] = []
    sections = [
        ("Plugin manifest", check_manifest),
        ("Directory structure", check_directories),
        ("Required files", check_required_files),
        ("Naming conventions", check_naming_conventions),
        ("Cross-references", check_cross_references),
        ("Python syntax", check_python_syntax),
        ("Content integrity", check_content_integrity),
        ("Skill evaluations", check_eval_files),
    ]

    for section_name, check_fn in sections:
        results = check_fn()
        all_checks.extend(results)

        failures = [r for r in results if not r.passed]
        if failures or args.verbose:
            print(f"\n{'='*60}")
            print(f"  {section_name}")
            print(f"{'='*60}")
            for r in results:
                if r.passed and not args.verbose:
                    continue
                icon = "PASS" if r.passed else "FAIL"
                print(f"  [{icon}] {r.name}: {r.detail}")

    passed = sum(1 for r in all_checks if r.passed)
    failed = sum(1 for r in all_checks if not r.passed)
    total = len(all_checks)

    print(f"\n{'='*60}")
    print(f"  Results: {passed}/{total} passed, {failed} failed")
    print(f"{'='*60}")

    if failed:
        print("\nValidation FAILED. Fix the issues above before submitting.")
        sys.exit(1)
    else:
        print("\nAll checks passed. Plugin is ready for submission.")
        sys.exit(0)


if __name__ == "__main__":
    main()
