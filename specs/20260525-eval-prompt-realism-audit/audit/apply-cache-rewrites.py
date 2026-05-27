#!/usr/bin/env python3
"""Subtask 12 — mirror Phase 3+10 rewrites into cached analyser payloads."""

from __future__ import annotations

import copy
import json
import os
import re
import sys
from typing import Any

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
AUDIT = os.path.join(REPO, "specs/20260525-eval-prompt-realism-audit/audit")
CACHE_DIR = os.path.join(REPO, ".zoto/eval-system/cache/analyser")

CENTRAL_PREFIXES = (
    ".cursor/evals/",
    "plugins/zoto-eval-system/evals/",
    "plugins/zoto-spec-system/evals/",
    "plugins/zoto-cursor-top/evals/",
)

ENVELOPE_KEYS = frozenset(
    {
        "schema_version",
        "analyser_version",
        "model_id",
        "target_id",
        "kind",
        "source_path",
        "source_hash",
        "summary",
        "fixtures",
        "fixture_justifications",
    }
)


def load_json(path: str) -> Any:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def write_json(path: str, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def resolve_eval_path(rel: str) -> tuple[str | None, str]:
    candidates = [rel]
    if rel.startswith(".cursor/evals/"):
        candidates.append(
            rel.replace(".cursor/evals/", "plugins/zoto-eval-system/evals/")
        )
    for candidate in candidates:
        abs_path = os.path.join(REPO, candidate)
        if os.path.exists(abs_path):
            return abs_path, candidate
    return None, rel


def load_eval_cases(abs_path: str) -> list[dict[str, Any]]:
    data = load_json(abs_path)
    if "evals" in data:
        return data["evals"]
    if "cases" in data:
        return data["cases"]
    return []


def source_hash_from_eval(abs_path: str) -> str | None:
    for case in load_eval_cases(abs_path):
        meta = case.get("_meta") or {}
        digest = meta.get("source_hash") or (meta.get("primitive_analysis") or {}).get(
            "source_hash"
        )
        if isinstance(digest, str) and re.fullmatch(r"[0-9a-f]{64}", digest):
            return digest
    return None


def slugify_scenario(text: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:80] if slug else text


def normalize_follow_ups(value: Any) -> tuple[str, ...] | None:
    if value is None:
        return None
    if isinstance(value, list):
        if not value:
            return None
        return tuple(str(v) for v in value)
    return (str(value),)


def case_signature(prompt: str | None, follow_ups: Any) -> tuple[str | None, tuple[str, ...] | None]:
    return prompt, normalize_follow_ups(follow_ups)


def build_central_case_by_id(abs_path: str) -> dict[int, dict[str, Any]]:
    by_id: dict[int, dict[str, Any]] = {}
    for case in load_eval_cases(abs_path):
        case_id = case.get("id")
        if isinstance(case_id, int):
            by_id[case_id] = case
    return by_id


def build_new_case(
    rewrite: dict[str, Any],
    case_id: int,
) -> dict[str, Any]:
    prompt = rewrite["rewrite_prompt"]
    scenario = rewrite.get("scenario") or rewrite.get("rewrite_scenario")
    if scenario is None:
        scenario = f"case-{case_id}"

    case: dict[str, Any] = {
        "scenario": scenario,
        "prompt": prompt,
        "assertions": rewrite["rewrite_assertions"] or [],
    }
    if rewrite.get("rewrite_expected_output") is not None:
        case["expected_output"] = rewrite["rewrite_expected_output"]
    if rewrite.get("rewrite_follow_ups") is not None:
        case["follow_ups"] = rewrite["rewrite_follow_ups"]
    return case


def apply_case_rewrite(
    case: dict[str, Any],
    rewrite: dict[str, Any],
) -> list[str]:
    changed: list[str] = []
    rp = rewrite.get("rewrite_prompt")
    if rp is not None and case.get("prompt") != rp:
        case["prompt"] = rp
        changed.append("prompt")

    ra = rewrite.get("rewrite_assertions")
    if ra is not None and case.get("assertions") != ra:
        case["assertions"] = ra
        changed.append("assertions")

    reo = rewrite.get("rewrite_expected_output")
    if reo is not None and case.get("expected_output") != reo:
        case["expected_output"] = reo
        changed.append("expected_output")

    rf = rewrite.get("rewrite_follow_ups")
    if rf is not None:
        if case.get("follow_ups") != rf:
            case["follow_ups"] = rf
            changed.append("follow_ups")
    elif "follow_ups" in case:
        del case["follow_ups"]
        changed.append("follow_ups_removed")

    scenario = rewrite.get("scenario") or rewrite.get("rewrite_scenario")
    if scenario is not None and case.get("scenario") != scenario:
        case["scenario"] = scenario
        changed.append("scenario")

    return changed


def resolve_cache_case_index(
    cache_cases: list[dict[str, Any]],
    case_id: int,
    rewrite: dict[str, Any],
    central_case: dict[str, Any] | None,
) -> int | None:
    """Map central eval case id → cache index without prompt-only collision."""

    scenario = rewrite.get("scenario") or rewrite.get("rewrite_scenario")
    if scenario is not None:
        scenario_slug = slugify_scenario(scenario)
        for i, case in enumerate(cache_cases):
            if case.get("scenario") == scenario:
                return i
            if slugify_scenario(str(case.get("scenario", ""))) == scenario_slug:
                return i

    rewrite_sig = case_signature(
        rewrite.get("rewrite_prompt"),
        rewrite.get("rewrite_follow_ups"),
    )
    if rewrite_sig[0] is not None:
        matches = [
            i
            for i, case in enumerate(cache_cases)
            if case_signature(case.get("prompt"), case.get("follow_ups")) == rewrite_sig
        ]
        if len(matches) == 1:
            return matches[0]

    if central_case is not None:
        central_sig = case_signature(
            central_case.get("prompt"),
            central_case.get("follow_ups"),
        )
        if central_sig[0] is not None:
            matches = [
                i
                for i, case in enumerate(cache_cases)
                if case_signature(case.get("prompt"), case.get("follow_ups")) == central_sig
            ]
            if len(matches) == 1:
                return matches[0]

    if 1 <= case_id <= len(cache_cases):
        return case_id - 1

    return None


def main() -> int:
    rewrites = load_json(os.path.join(AUDIT, "eval-rewrites.json"))

    reports: list[dict[str, Any]] = []
    missing_cache: list[dict[str, str]] = []
    unmatched: list[dict[str, Any]] = []
    scenario_renames: list[str] = []
    appended: list[str] = []

    for rel_path, entry in rewrites.items():
        if not rel_path.startswith(CENTRAL_PREFIXES):
            continue

        target_id = entry["target_id"]
        eval_abs, _ = resolve_eval_path(rel_path)
        if eval_abs is None:
            missing_cache.append({"path": rel_path, "target_id": target_id, "reason": "eval-missing"})
            continue

        source_hash = source_hash_from_eval(eval_abs)
        if source_hash is None:
            missing_cache.append({"path": rel_path, "target_id": target_id, "reason": "no-source-hash"})
            continue

        cache_path = os.path.join(CACHE_DIR, f"{source_hash}.json")
        if not os.path.exists(cache_path):
            missing_cache.append(
                {
                    "path": rel_path,
                    "target_id": target_id,
                    "source_hash": source_hash,
                    "reason": "cache-missing",
                }
            )
            continue

        before = load_json(cache_path)
        envelope_before = {k: before[k] for k in ENVELOPE_KEYS if k in before}
        payload = copy.deepcopy(before)

        central_by_id = build_central_case_by_id(eval_abs)

        file_report = {
            "path": rel_path,
            "cache_path": os.path.relpath(cache_path, REPO),
            "target_id": target_id,
            "source_hash": source_hash,
            "cases_updated": 0,
            "cases_appended": 0,
            "fields": [],
        }

        for case_key, rewrite in entry["cases"].items():
            if rewrite.get("preserve", True):
                continue

            case_id = int(case_key)
            central_case = central_by_id.get(case_id)
            idx = resolve_cache_case_index(
                payload["cases"], case_id, rewrite, central_case
            )
            if idx is None:
                payload["cases"].append(build_new_case(rewrite, case_id))
                file_report["cases_appended"] += 1
                appended.append(f"{target_id} case {case_id}")
                continue

            old_scenario = payload["cases"][idx].get("scenario")
            fields = apply_case_rewrite(payload["cases"][idx], rewrite)
            if fields:
                file_report["cases_updated"] += 1
                file_report["fields"].extend(fields)
                if "scenario" in fields:
                    scenario_renames.append(
                        f"{target_id} case {case_id}: {old_scenario!r} -> {payload['cases'][idx]['scenario']!r}"
                    )

        envelope_after = {k: payload[k] for k in ENVELOPE_KEYS if k in payload}
        if envelope_before != envelope_after:
            raise RuntimeError(f"Envelope mutated for {target_id} ({source_hash})")

        if payload != before:
            write_json(cache_path, payload)
            file_report["changed"] = True
        else:
            file_report["changed"] = False

        if file_report["cases_updated"] or file_report["cases_appended"] or file_report["changed"]:
            reports.append(file_report)

    summary = {
        "files_touched": sum(1 for r in reports if r.get("changed")),
        "cases_updated_total": sum(r["cases_updated"] for r in reports),
        "cases_appended_total": sum(r["cases_appended"] for r in reports),
        "missing_cache": missing_cache,
        "unmatched": unmatched,
        "appended": appended,
        "scenario_renames": scenario_renames,
        "reports": reports,
    }
    print(json.dumps(summary, indent=2))

    if unmatched:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
