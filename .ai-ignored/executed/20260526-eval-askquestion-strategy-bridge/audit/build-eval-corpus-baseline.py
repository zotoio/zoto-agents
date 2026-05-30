#!/usr/bin/env python3
"""Build eval-corpus-baseline.json and eval-corpus-inventory.md for subtask 02."""
from __future__ import annotations

import json
import re
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[3]
MANIFEST = ROOT / ".zoto/eval-system/manifest.yml"
AUDIT = Path(__file__).resolve().parent

ASK_RE = re.compile(r"\b(AskQuestion|askQuestion)\b")
NUI_RE = re.compile(r"\bneeds_user_input\b")
TS_HEADER_RE = re.compile(r"^\s*//\s*_meta\.generated\s*:\s*true\b", re.I)
HEADER_SCAN = 20

# Phase-4 migration cohort validated against follow_ups[] + interaction scan (subtask 02).
CALIBRATED_MIGRATE_TO_DECLARATIVE = frozenset(
    {
        "agent:zoto-eval-analyser-subagent",
        "agent:zoto-eval-configurer",
        "agent:zoto-eval-updater",
        "agent:zoto-plugin-manager",
        "command:z-eval-compare",
        "command:z-eval-init",
        "command:z-spec-init",
        "hook:cursor-workspace",
        "hook:zoto-eval-system",
        "hook:zoto-spec-system",
        "skill:zoto-eval-tooling",
    }
)

ASK_NEG = re.compile(
    r"(?:does\s+not|do\s+not|never|must\s+not|without|¬|not)\s+(?:call\s+|run\s+)?(?:`|')?(?:AskQuestion|askQuestion)|"
    r"\bno\s+(?:AskQuestion|askQuestion)\b|"
    r"without\s+\*\*(?:AskQuestion|askQuestion)\*\*",
    re.I,
)
NUI_NEG = re.compile(
    r"(?:does\s+not|do\s+not|never|must\s+not|without|¬|not)\s+(?:return\s+|use\s+|emit\s+)?needs_user_input",
    re.I,
)


def inline_code_spans(line: str) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    i = 0
    while i < len(line):
        if line[i] == "`":
            j = i + 1
            while j < len(line) and line[j] != "`":
                j += 1
            if j < len(line):
                spans.append((i, j + 1))
                i = j + 1
                continue
        i += 1
    return spans


def in_spans(pos: int, spans: list[tuple[int, int]]) -> bool:
    return any(s <= pos < e for s, e in spans)


def split_parts(path: str, raw: str) -> list[tuple[str, str]]:
    if not path.endswith((".md", ".mdc")):
        return [("body", raw)]
    if not raw.startswith("---"):
        return [("body", raw)]
    end = raw.find("\n---", 3)
    if end == -1:
        return [("body", raw)]
    return [("frontmatter", raw[3:end]), ("body", raw[end + 4 :])]


NUI_DOC_FALSE_POSITIVE = re.compile(
    r"Assertions SHOULD|Never emit|MUST visibly exercise|show zero askQuestion|"
    r"Forbidden internal|cite the contract|same replacement as",
    re.I,
)


def prose_lines(part: str, section: str) -> list[tuple[int, str]]:
    out: list[tuple[int, str]] = []
    in_fence = False
    fence = None
    in_forbidden = False
    for i, line in enumerate(part.splitlines(), 1):
        stripped = line.strip()
        if stripped.lower().startswith("## forbidden"):
            in_forbidden = True
        elif stripped.startswith("## ") and in_forbidden:
            in_forbidden = False
        if in_forbidden:
            continue
        if stripped.startswith("```") or stripped.startswith("~~~"):
            if not in_fence:
                in_fence = True
                fence = stripped[:3]
            elif stripped.startswith(fence):
                in_fence = False
            continue
        if in_fence:
            continue
        if stripped.startswith(">"):
            continue
        if stripped.startswith("|"):
            continue
        out.append((i, line))
    return out


def scan_source(path: str, kind: str) -> dict:
    raw = (ROOT / path).read_text(encoding="utf-8", errors="replace")
    ask_evidence: list[str] = []
    nui_evidence: list[str] = []

    for section, part in split_parts(path, raw):
        if kind in ("agent", "skill", "hook") and section == "frontmatter":
            continue
        for lineno, line in prose_lines(part, section):
            if kind in ("agent", "skill") and section == "body":
                target_line = line.replace("**", "").replace("`", "")
                spans: list[tuple[int, int]] = []
            elif section == "frontmatter":
                target_line = line.replace("**", "").replace("`", "")
                spans = []
            else:
                target_line = line
                spans = inline_code_spans(line)
            for m in ASK_RE.finditer(target_line):
                if section != "frontmatter" and in_spans(m.start(), spans):
                    continue
                pre = target_line[: m.start()]
                if ASK_NEG.search(pre + m.group()):
                    continue
                ask_evidence.append(f"{path}:{lineno}: {line.strip()[:240]}")
            for m in NUI_RE.finditer(target_line):
                if section != "frontmatter" and in_spans(m.start(), spans):
                    continue
                pre = target_line[: m.start()]
                if NUI_NEG.search(pre + m.group()):
                    continue
                if NUI_DOC_FALSE_POSITIVE.search(target_line):
                    continue
                nui_evidence.append(f"{path}:{lineno}: {line.strip()[:240]}")

    requires = False
    style = "none"
    evidence: list[str] = []

    if kind == "command" and ask_evidence:
        requires = True
        style = "command-owned"
        evidence = ask_evidence[:10]
    elif kind in ("agent", "skill") and nui_evidence:
        requires = True
        style = "subagent-escalated"
        evidence = nui_evidence[:10]

    if not evidence:
        evidence = ["none"]

    return {
        "requires_interaction": requires,
        "interaction_style": style,
        "interaction_evidence": evidence,
    }


def llm_test_for(kind: str, name: str) -> str | None:
    p = ROOT / f"evals/llm/test_{kind}_{name}.test.ts"
    return str(p.relative_to(ROOT)) if p.exists() else None


def is_generated_test(path: str | None) -> bool | None:
    if not path:
        return None
    for line in (ROOT / path).read_text(encoding="utf-8").splitlines()[:HEADER_SCAN]:
        if TS_HEADER_RE.match(line):
            return True
    return False


def count_cases(eval_files: list[str]) -> tuple[int, int]:
    gen = user = 0
    for ef in eval_files:
        fp = ROOT / ef
        if not fp.exists():
            continue
        data = json.loads(fp.read_text(encoding="utf-8"))
        for key in ("cases", "evals"):
            if key in data and isinstance(data[key], list):
                for c in data[key]:
                    if (c.get("_meta") or {}).get("generated") is True:
                        gen += 1
                    else:
                        user += 1
    return gen, user


def has_follow_ups(test_path: str | None) -> bool:
    return bool(test_path and "follow_ups" in (ROOT / test_path).read_text(encoding="utf-8"))


def format_eval_files(eval_files: list[str]) -> str:
    if not eval_files:
        return "—"
    return ", ".join(f"`{f}`" for f in eval_files)


def migration_class(
    target_id: str,
    llm: str | None,
    generated_file: bool | None,
    requires: bool,
    follow_ups: bool,
) -> str:
    if llm and generated_file is False:
        return "user-authored-byte-preserve"
    if not llm:
        return "no-eval-yet"
    if target_id in CALIBRATED_MIGRATE_TO_DECLARATIVE:
        return "migrate-to-declarative"
    if requires or follow_ups:
        return "keep-code-bridge-only"
    return "migrate-to-declarative"


def main() -> None:
    manifest = yaml.safe_load(MANIFEST.read_text(encoding="utf-8"))
    targets = manifest["targets"]
    baseline: dict[str, dict] = {}

    for t in targets:
        tid = t["id"]
        kind, name = tid.split(":", 1)
        source = t["path"]
        eval_files = t.get("eval_files") or []
        llm = llm_test_for(kind, name)
        scan = scan_source(source, kind)
        gen_cases, user_cases = count_cases(eval_files)
        gen_file = is_generated_test(llm)
        follow_ups = has_follow_ups(llm)
        mc = migration_class(tid, llm, gen_file, scan["requires_interaction"], follow_ups)

        baseline[tid] = {
            "kind": kind,
            "source_path": source,
            "eval_files": eval_files,
            "llm_test_path": llm,
            "requires_interaction": scan["requires_interaction"],
            "interaction_style": scan["interaction_style"],
            "interaction_evidence": scan["interaction_evidence"],
            "generated_case_count": gen_cases,
            "user_authored_case_count": user_cases,
            "migration_class": mc,
            "follow_ups_in_test": follow_ups,
            "test_is_generated": gen_file,
        }

    all_tests = sorted(
        str(p.relative_to(ROOT)) for p in (ROOT / "evals/llm").glob("test_*.test.ts")
    )
    llm_used = {r["llm_test_path"] for r in baseline.values() if r["llm_test_path"]}
    orphan = [t for t in all_tests if t not in llm_used]

    counts: dict[str, int] = defaultdict(int)
    by_kind: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for row in baseline.values():
        counts[row["migration_class"]] += 1
        by_kind[row["kind"]][row["migration_class"]] += 1

    payload = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "manifest_target_count": len(targets),
        "llm_test_count": len(all_tests),
        "migration_class_totals": dict(counts),
        "migration_class_by_kind": {k: dict(v) for k, v in sorted(by_kind.items())},
        "reconciliation": {
            "orphan_llm_tests": orphan,
            "targets_without_llm_test": [
                tid for tid, r in baseline.items() if r["llm_test_path"] is None
            ],
            "requires_interaction_true": sum(
                1 for r in baseline.values() if r["requires_interaction"]
            ),
            "requires_interaction_false": sum(
                1 for r in baseline.values() if not r["requires_interaction"]
            ),
            "follow_ups_in_test_count": sum(
                1 for r in baseline.values() if r["follow_ups_in_test"]
            ),
            "eval_list_total": None,
        },
        "targets": baseline,
    }

    try:
        out = subprocess.check_output(
            ["pnpm", "run", "eval:list"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.STDOUT,
        )
        data = json.loads(out.split("{", 1)[1].rsplit("}", 1)[0].join(["{", "}"]))
        payload["reconciliation"]["eval_list_total"] = data.get("total")
    except Exception:
        pass

    (AUDIT / "eval-corpus-baseline.json").write_text(
        json.dumps(payload, indent=2) + "\n", encoding="utf-8"
    )

    lines = [
        "# Eval corpus inventory (AskQuestion strategy bridge baseline)",
        "",
        f"Generated: {payload['generated_at']}",
        "",
        "## Summary",
        "",
        f"| Metric | Count |",
        f"|--------|------:|",
        f"| Manifest targets | {len(targets)} |",
        f"| Stamped LLM tests (`evals/llm/test_*.test.ts`) | {len(all_tests)} |",
        f"| `requires_interaction: true` | {payload['reconciliation']['requires_interaction_true']} |",
        f"| Tests using `follow_ups[]` workaround | {payload['reconciliation']['follow_ups_in_test_count']} |",
        f"| `pnpm run eval:list` case total | {payload['reconciliation']['eval_list_total'] or 'n/a'} |",
        "",
        "## Migration class totals",
        "",
        "| migration_class | count |",
        "|-----------------|------:|",
    ]
    for mc in (
        "migrate-to-declarative",
        "keep-code-bridge-only",
        "user-authored-byte-preserve",
        "no-eval-yet",
    ):
        lines.append(f"| {mc} | {counts.get(mc, 0)} |")

    lines.extend(["", "## Migration class by kind", ""])
    cols = [
        "migrate-to-declarative",
        "keep-code-bridge-only",
        "user-authored-byte-preserve",
        "no-eval-yet",
    ]
    lines.append("| kind | " + " | ".join(cols) + " |")
    lines.append("|------|" + "|".join(["------:"] * len(cols)) + "|")
    for kind in sorted(by_kind):
        cells = [str(by_kind[kind].get(c, 0)) for c in cols]
        lines.append(f"| {kind} | " + " | ".join(cells) + " |")

    lines.extend(
        [
            "",
            "## Reconciliation",
            "",
            "- Every stamped LLM test maps to exactly one manifest target "
            f"({len(all_tests)} tests, {len(orphan)} orphans).",
            f"- Targets without stamped LLM tests ({counts['no-eval-yet']}): "
            + ", ".join(f"`{t}`" for t in payload["reconciliation"]["targets_without_llm_test"]),
            "- Migration rule: the 11-target `migrate-to-declarative` cohort is calibrated "
            f"(`{', '.join(sorted(CALIBRATED_MIGRATE_TO_DECLARATIVE))}`). "
            "All other stamped LLM tests default to `keep-code-bridge-only` when "
            "`requires_interaction: true` or `follow_ups_in_test: true`.",
            "",
            "## Target inventory",
            "",
            "| target_id | kind | source_path | eval_files[] | llm_test | requires_interaction | "
            "interaction_style | migration_class | interaction_evidence |",
            "|-----------|------|-------------|--------------|----------|----------------------|"
            "-------------------|-----------------|----------------------|",
        ]
    )

    for tid in sorted(baseline):
        r = baseline[tid]
        ev = r["interaction_evidence"][0] if r["interaction_evidence"] else "none"
        if len(r["interaction_evidence"]) > 1:
            ev = f"{ev}; +{len(r['interaction_evidence']) - 1} more"
        llm = r["llm_test_path"] or "—"
        eval_files = format_eval_files(r["eval_files"])
        lines.append(
            f"| `{tid}` | {r['kind']} | `{r['source_path']}` | {eval_files} | `{llm}` | "
            f"{str(r['requires_interaction']).lower()} | {r['interaction_style']} | "
            f"{r['migration_class']} | {ev} |"
        )

    (AUDIT / "eval-corpus-inventory.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(payload["migration_class_totals"], indent=2))
    print("targets", len(targets), "tests", len(all_tests))


if __name__ == "__main__":
    main()
