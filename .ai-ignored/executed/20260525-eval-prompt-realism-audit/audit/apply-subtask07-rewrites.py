#!/usr/bin/env python3
"""Apply eval-rewrites.json to subtask-07 targets with byte-preservation for user rows."""

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
    "plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json",
    "plugins/zoto-eval-system/skills/zoto-advise-evals/evals/evals.json",
    "plugins/zoto-eval-system/skills/zoto-compare-evals/evals/evals.json",
    "plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json",
    "plugins/zoto-eval-system/skills/zoto-create-evals/evals/evals.json",
    "plugins/zoto-eval-system/skills/zoto-eval-tooling/evals/evals.json",
    "plugins/zoto-eval-system/skills/zoto-execute-evals/evals/evals.json",
    "plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json",
    "plugins/zoto-eval-system/skills/zoto-judge-evals/evals/evals.json",
    "plugins/zoto-eval-system/skills/zoto-update-evals/evals/evals.json",
]

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
    """Return (start, end) spans for each top-level object in cases[] or evals[]."""
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
    """Serialize one case/eval object with 4-space indent (nested under array)."""
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

    array_pattern = re.compile(rf'("{re.escape(array_key)}"\s*:\s*\[)')
    array_match = array_pattern.search(original_text)
    if not array_match:
        raise ValueError(f'array key "{array_key}" not found in {rel}')

    body_parts: list[str] = []
    for idx, (case, (start, end)) in enumerate(zip(entries, spans)):
        key = case_key(case.get("id"), idx, container_shape, mixed)
        rewrite = payload["cases"].get(key)
        if rewrite is None:
            rewrite = payload["cases"].get(str(case.get("id")))

        if not is_generated(case):
            body_parts.append(original_text[start:end])
            preserved_user += 1
        elif rewrite and rewrite.get("preserve") is False:
            apply_rewrite(case, rewrite)
            body_parts.append(dump_case(case))
            rewritten += 1
        else:
            body_parts.append(original_text[start:end])

        if idx < len(entries) - 1:
            body_parts.append(original_text[end : spans[idx + 1][0]])

    if rewritten == 0:
        # All rows preserved — keep file byte-identical to HEAD.
        return {
            "path": rel,
            "rewritten": 0,
            "preserved_user": preserved_user,
            "user_violations": [],
            "skipped_write": True,
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
        "user_violations": user_violations,
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

    # JSON parse sweep
    for rel in TARGETS:
        json.loads((REPO / rel).read_text(encoding="utf-8"))

    print(json.dumps({"results": results, "errors": errors}, indent=2))
    if errors:
        return 1
    if any(r["user_violations"] for r in results):
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
