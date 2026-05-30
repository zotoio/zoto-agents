#!/usr/bin/env python3
"""Emit audit/migration-matrix.md from baseline + post-migration tree."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
AUDIT = Path(__file__).resolve().parent
BASELINE = json.loads((AUDIT / "eval-corpus-baseline.json").read_text())
MIGRATE = {
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
DEFERRED = {
    "skill:zoto-configure-evals": "analyser response_not_json (code file retained with bridge)",
    "skill:zoto-create-evals": "regeneration SyntaxError in declarative merge path",
    "skill:zoto-execute-evals": "regeneration SyntaxError in declarative merge path",
    "skill:zoto-help-evals": "regeneration SyntaxError in declarative merge path",
    "skill:zoto-judge-evals": "regeneration SyntaxError in declarative merge path",
    "skill:zoto-update-evals": "regeneration SyntaxError in declarative merge path",
    "skill:zoto-execute-spec": "placeholder marker guard on declarative stamp",
    "command:z-spec-judge": "analyser response_not_json",
    "agent:zoto-eval-adviser": "regeneration SyntaxError in declarative merge path",
    "agent:zoto-spec-executor": "placeholder marker guard on declarative stamp",
    "agent:zoto-spec-generator": "analyser response_not_json",
}


def llm_test(kind: str, name: str) -> Path:
    slug = f"{kind}_{name}".lower()
    return ROOT / "evals" / "llm" / f"test_{slug}.test.ts"


def has_bridge(p: Path) -> bool:
    return p.exists() and "askquestion-bridge" in p.read_text(encoding="utf-8")


def git_diff_stat(path: str) -> str:
    r = subprocess.run(
        ["git", "diff", "--stat", "--", path],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    out = (r.stdout or "").strip()
    return out if out else "(no diff)"


rows: list[str] = []
rows.append("# Migration matrix — Subtask 09\n")
rows.append("| target | pre backend | post backend | migration_class | path before | path after | notes |")
rows.append("|--------|-------------|--------------|-----------------|-------------|------------|-------|")

for tid, meta in sorted(BASELINE["targets"].items()):
    kind, name = tid.split(":", 1)
    mc = meta["migration_class"]
    pre = "code" if meta.get("llm_test_path") else ("declarative" if meta.get("eval_files") else "none")
    before = meta.get("llm_test_path") or (meta["eval_files"][0] if meta.get("eval_files") else "—")
    test_p = llm_test(kind, name)
    post = "declarative"
    after = before
    notes = ""

    if mc == "no-eval-yet":
        post = "none"
        after = before
        diff = git_diff_stat(before) if before != "—" else "—"
        notes = f"user diff: {diff}"
    elif mc == "migrate-to-declarative":
        post = "declarative"
        after = meta["eval_files"][0] if meta.get("eval_files") else before
        notes = "TS removed" if not test_p.exists() else "TS still present (incomplete)"
    elif mc == "keep-code-bridge-only":
        post = "code+bridge"
        after = str(test_p.relative_to(ROOT))
        notes = "bridge ok" if has_bridge(test_p) else "bridge missing"
        if tid in DEFERRED:
            notes += f"; deferred: {DEFERRED[tid]}"
    else:
        notes = mc

    if meta.get("user_authored_case_count", 0) > 0 and meta.get("eval_files"):
        ef = meta["eval_files"][0]
        rows.append(
            f"| {tid} | {pre} | {post} | user-authored-byte-preserve | {before} | {after} | git diff: {git_diff_stat(ef)} |"
        )
        continue

    rows.append(f"| {tid} | {pre} | {post} | {mc} | {before} | {after} | {notes} |")

rows.append("\n## Counts\n")
rows.append(f"- migrate-to-declarative removed TS: {sum(1 for t in MIGRATE if not llm_test(*t.split(':', 1)).exists())} / {len(MIGRATE)}")
rows.append(f"- keep-code-bridge-only with bridge import: {sum(1 for tid, m in BASELINE['targets'].items() if m['migration_class']=='keep-code-bridge-only' and has_bridge(llm_test(*tid.split(':', 1))))} / 32")
rows.append(f"- deferred/partial analyser or regen errors: {len(DEFERRED)}")

(AUDIT / "migration-matrix.md").write_text("\n".join(rows) + "\n", encoding="utf-8")
print(f"Wrote {AUDIT / 'migration-matrix.md'}")
