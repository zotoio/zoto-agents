#!/usr/bin/env python3
"""Session start hook: nudge when workDir contains more items than threshold."""
import json
import sys
from pathlib import Path

DEFAULT_UNIT = "spec"
DEFAULT_WORK_DIR = "specs/current"
DEFAULT_THRESHOLD = 20
DEFAULT_MESSAGE = (
    "You have ${count} unprocessed ${unitOfWork}s. Consider running /zoto-plan to organize."
)


def _emit_empty() -> None:
    print("{}")


def main() -> int:
    sys.stdin.read()

    root = Path.cwd()
    config_path = root / ".spec-system" / "config.json"
    if not config_path.is_file():
        _emit_empty()
        return 0

    try:
        with config_path.open(encoding="utf-8") as f:
            cfg = json.load(f)
    except (OSError, json.JSONDecodeError):
        _emit_empty()
        return 0

    if not isinstance(cfg, dict):
        _emit_empty()
        return 0

    hooks = cfg.get("hooks")
    nudge_cfg = {}
    if isinstance(hooks, dict):
        raw = hooks.get("sessionStartNudge")
        if isinstance(raw, dict):
            nudge_cfg = raw

    if nudge_cfg.get("enabled", True) is False:
        _emit_empty()
        return 0

    unit_of_work = cfg.get("unitOfWork") or DEFAULT_UNIT
    if not isinstance(unit_of_work, str):
        unit_of_work = DEFAULT_UNIT

    work_rel = cfg.get("workDir") or DEFAULT_WORK_DIR
    if not isinstance(work_rel, str):
        work_rel = DEFAULT_WORK_DIR
    work_dir = Path(work_rel)
    if not work_dir.is_absolute():
        work_dir = root / work_dir

    threshold = nudge_cfg.get("threshold", DEFAULT_THRESHOLD)
    if not isinstance(threshold, int):
        try:
            threshold = int(threshold)
        except (TypeError, ValueError):
            threshold = DEFAULT_THRESHOLD

    message_template = nudge_cfg.get("message") or DEFAULT_MESSAGE
    if not isinstance(message_template, str):
        message_template = DEFAULT_MESSAGE

    count = 0
    if work_dir.is_dir():
        count = sum(1 for p in work_dir.iterdir() if p.is_dir())

    if count > threshold:
        msg = message_template.replace("${count}", str(count)).replace(
            "${unitOfWork}", str(unit_of_work)
        )
        print(json.dumps({"additional_context": msg}, ensure_ascii=False))
    else:
        _emit_empty()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
