#!/usr/bin/env python3
"""Apply eval-rewrites.json to subtask-09 targets with byte-preservation for user rows."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
AUDIT = Path(__file__).resolve().parent
REWRITES_PATH = AUDIT / "eval-rewrites.json"

TARGETS = [
    ".cursor/evals/commands/sync-plugins.json",
    ".cursor/evals/commands/zoto-create-plugin.json",
    ".cursor/evals/agents/zoto-plugin-manager.json",
    ".cursor/evals/hooks/hooks.json",
    ".cursor/skills/zoto-create-plugin/evals/evals.json",
]

CURSOR_TOP = "plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json"

NOW_ISO = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def git_head_bytes(rel: str) -> bytes:
    return subprocess.check_output(["git", "show", f"HEAD:{rel}"], cwd=REPO)


def is_generated(case: dict) -> bool:
    meta = case.get("_meta")
    return isinstance(meta, dict) and meta.get("generated") is True


def case_key(case_id, index: int, container_shape: str, mixed: bool) -> str:
    if mixed or "@" in str(case_id):
        return f"{case_id}@{index}"
    return str(case_id)


def extract_array_element_spans(source: str, array_key: str) -> list[tuple[int, int]]:
    pattern = re.compile(rf'"{re.escape(array_key)}"\s*:\s*\[')
    match = pattern.search(source)
    if not match:
        raise ValueError(f'array key "{array_key}" not found')
    i = match.end()
    decoder = json.JSONDecoder()
    elements: list[tuple[int, int]] = []
    while i < len(source):
        while i < len(source) and source[i] in " \t\n\r,":
            i += 1
        if i >= len(source) or source[i] == "]":
            break
        start = i
        _, end = decoder.raw_decode(source, i)
        elements.append((start, end))
        i = end
    return elements


def dump_case(case: dict, indent: int = 4) -> str:
    return json.dumps(case, indent=2, ensure_ascii=False).replace("\n", "\n" + " " * indent)


def apply_rewrite(case: dict, rewrite: dict) -> None:
    if rewrite.get("rewrite_prompt") is not None:
        case["prompt"] = rewrite["rewrite_prompt"]
    if rewrite.get("rewrite_assertions") is not None:
        case["assertions"] = rewrite["rewrite_assertions"]
    if rewrite.get("rewrite_expected_output") is not None:
        case["expected_output"] = rewrite["rewrite_expected_output"]
    follow = rewrite.get("rewrite_follow_ups")
    if follow is not None:
        case["follow_ups"] = follow
    meta = case.setdefault("_meta", {})
    meta["last_updated"] = NOW_ISO
    if "generated_by" not in meta or not meta["generated_by"]:
        meta["generated_by"] = "zoto-update-evals"


def process_file(rel: str, payload: dict) -> dict:
    original_bytes = git_head_bytes(rel)
    original_text = original_bytes.decode("utf-8")
    data = json.loads(original_text)

    container_shape = payload.get("container_shape", "evals[]")
    if container_shape == "cases[]":
        array_key = "cases"
    else:
        array_key = "evals"

    entries = data[array_key]
    mixed = container_shape == "mixed"
    spans = extract_array_element_spans(original_text, array_key)
    if len(spans) != len(entries):
        raise ValueError(f"{rel}: span count {len(spans)} != entry count {len(entries)}")

    rewritten = 0
    preserved_user = 0
    skipped_preserve = 0

    body_parts: list[str] = []
    for idx, (case, (start, end)) in enumerate(zip(entries, spans)):
        key = case_key(case.get("id"), idx, container_shape, mixed)
        rewrite = payload["cases"].get(key)
        if rewrite is None:
            rewrite = payload["cases"].get(str(case.get("id")))

        if not is_generated(case):
            body_parts.append(original_text[start:end])
            preserved_user += 1
            if rewrite and not rewrite.get("preserve", False):
                raise ValueError(f"{rel} case {key}: user-authored but rewrite wants change")
        elif rewrite and rewrite.get("preserve") is True:
            body_parts.append(original_text[start:end])
            skipped_preserve += 1
        elif rewrite and rewrite.get("preserve") is False:
            apply_rewrite(case, rewrite)
            body_parts.append(dump_case(case))
            rewritten += 1
        else:
            raise ValueError(f"{rel} case {key}: generated case missing rewrite or preserve flag")

        if idx < len(entries) - 1:
            body_parts.append(original_text[end : spans[idx + 1][0]])

    if rewritten == 0:
        return {
            "path": rel,
            "rewritten": 0,
            "preserved_user": preserved_user,
            "skipped_preserve_flag": skipped_preserve,
            "user_violations": [],
            "changed": False,
        }

    new_text = (
        original_text[: spans[0][0]]
        + "".join(body_parts)
        + original_text[spans[-1][1] :]
    )
    out_path = REPO / rel
    out_path.write_text(new_text, encoding="utf-8")

    head_spans = spans
    new_spans = extract_array_element_spans(new_text, array_key)
    user_violations = []
    for idx, case in enumerate(entries):
        if is_generated(case):
            continue
        head_chunk = original_text[head_spans[idx][0] : head_spans[idx][1]]
        new_chunk = new_text[new_spans[idx][0] : new_spans[idx][1]]
        if head_chunk != new_chunk:
            user_violations.append((idx, case.get("id")))

    return {
        "path": rel,
        "rewritten": rewritten,
        "preserved_user": preserved_user,
        "skipped_preserve_flag": skipped_preserve,
        "user_violations": user_violations,
        "changed": True,
    }


def verify_cursor_top() -> dict:
    head = git_head_bytes(CURSOR_TOP)
    current = (REPO / CURSOR_TOP).read_bytes()
    diff = subprocess.run(
        ["git", "diff", "--shortstat", CURSOR_TOP],
        cwd=REPO,
        capture_output=True,
        text=True,
    )
    return {
        "path": CURSOR_TOP,
        "bytes_preserved": head == current,
        "generated_cases": 0,
        "git_diff_shortstat": diff.stdout.strip() or "(empty)",
    }


def main() -> int:
    rewrites = json.loads(REWRITES_PATH.read_text(encoding="utf-8"))
    results = []
    errors = []

    for rel in TARGETS:
        payload = rewrites.get(rel)
        if not payload:
            errors.append(f"missing payload for {rel}")
            continue
        try:
            results.append(process_file(rel, payload))
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{rel}: {exc}")

    cursor_top = verify_cursor_top()
    if not cursor_top["bytes_preserved"]:
        errors.append(f"{CURSOR_TOP}: not byte-identical to HEAD")

    parse_paths = TARGETS + [CURSOR_TOP]
    for rel in parse_paths:
        json.loads((REPO / rel).read_text(encoding="utf-8"))

    report = {"timestamp": NOW_ISO, "files": results, "cursor_top": cursor_top, "errors": errors}
    print(json.dumps(report, indent=2))
    if errors:
        return 1
    if any(r.get("user_violations") for r in results):
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
