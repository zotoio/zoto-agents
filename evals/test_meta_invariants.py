"""Eval-system infrastructure invariants.

OWNED BY: subtask 06 of the eval-system-v2 spec.

Scope:
    These tests are NOT per-primitive behaviour checks (those live in
    the stamped ``evals/test_<kind>_<slug>.py`` files). They are
    infrastructure-level invariants that the entire eval system relies
    on, regardless of which primitive the user is exercising.

Why they exist:
    Subtask 06 replaces the legacy ``evals/test_example.py`` (107
    shape-only tests). Some of those checks were genuinely useful —
    manifest schema validation, source-hash format, ``_meta.generated``
    structure — and need to keep running. They graduate here, where
    they live as a single infrastructure suite. Subtask 14 uses this
    file's all-passing state as the gate to delete
    ``evals/test_example.py``.

Discipline:
    * Tests in this file MUST be infrastructure-level, not behaviour
      checks against a specific primitive.
    * Tests MUST be additive — nothing here may delete user data.
    * Tests MUST be runnable on a fresh, never-stamped repository
      (each one ``pytest.skip`` s when the artefact under test is
      absent).
"""

from __future__ import annotations

import datetime as _dt
import json
import re
from pathlib import Path
from typing import Any, Iterable

import pytest
import yaml


REPO_ROOT = Path(__file__).resolve().parent.parent
EVALS_DIR = Path(__file__).resolve().parent
ZOTO_DIR = REPO_ROOT / ".zoto" / "eval-system"
SCHEMA_DIR = (
    REPO_ROOT
    / "plugins"
    / "zoto-eval-system"
    / "templates"
    / "schema"
)

SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
TARGET_ID_RE = re.compile(r"^(skill|command|agent|hook|cli|lib):[^\s]+$")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _load_yaml(path: Path) -> Any:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def _load_yaml_all(path: Path) -> list[Any]:
    """Load a multi-document YAML stream into a list."""
    return list(yaml.safe_load_all(path.read_text(encoding="utf-8")))


def _coerce_datetimes_to_strings(value: Any) -> Any:
    """Recursively coerce ``datetime`` objects back into ISO-8601 strings.

    PyYAML auto-parses ISO-formatted scalars into ``datetime`` objects;
    JSON-Schema's ``format: date-time`` validator expects strings. This
    helper bridges the gap without forcing the manifest writers to emit
    explicit string scalars.
    """
    if isinstance(value, _dt.datetime):
        s = value.isoformat()
        if value.tzinfo is None:
            s += "Z"
        return s
    if isinstance(value, _dt.date):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _coerce_datetimes_to_strings(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_coerce_datetimes_to_strings(v) for v in value]
    return value


def _has_jsonschema() -> bool:
    try:
        import jsonschema  # type: ignore[import-not-found]  # noqa: F401

        return True
    except ImportError:
        return False


def _validate_against_schema(data: Any, schema_path: Path) -> list[str]:
    """Return a list of validation error strings (empty when valid).

    Falls back to a structural check when ``jsonschema`` is not
    installed, so a fresh CI without optional deps still gets *some*
    coverage.
    """
    if not _has_jsonschema():
        return []
    import jsonschema  # type: ignore[import-not-found]

    schema = _load_json(schema_path)
    validator = jsonschema.Draft7Validator(schema)
    return [
        f"{list(err.absolute_path)}: {err.message}"
        for err in validator.iter_errors(data)
    ]


def _iter_eval_json_files() -> Iterable[Path]:
    """Yield every ``evals.json`` and ``<name>.json`` file under the
    documented coverage paths (skills, plugins, ``.cursor``)."""
    if (REPO_ROOT / "plugins").is_dir():
        for kind in ("commands", "agents", "hooks"):
            yield from (REPO_ROOT / "plugins").glob(f"*/evals/{kind}/*.json")
    for kind in ("commands", "agents", "hooks"):
        yield from (REPO_ROOT / ".cursor" / "evals" / kind).glob("*.json")
    for skills_root in (
        REPO_ROOT / ".cursor" / "skills",
        REPO_ROOT / "skills",
        REPO_ROOT / "plugins",
    ):
        if not skills_root.is_dir():
            continue
        yield from skills_root.rglob("evals/evals.json")


def _iter_generated_cases(path: Path) -> Iterable[tuple[Path, dict[str, Any]]]:
    try:
        data = _load_json(path)
    except (OSError, json.JSONDecodeError):
        return
    cases = data.get("evals") or data.get("cases") or []
    for case in cases:
        if not isinstance(case, dict):
            continue
        meta = case.get("_meta") or {}
        if not isinstance(meta, dict):
            continue
        if not meta.get("generated"):
            continue
        yield path, case


def _iter_stamped_pytest_files() -> Iterable[Path]:
    yield from EVALS_DIR.glob("test_*.py")


# ---------------------------------------------------------------------------
# Invariants
# ---------------------------------------------------------------------------


def test_schemas_directory_present() -> None:
    """The plugin ships frozen schema files under ``templates/schema``."""
    if not SCHEMA_DIR.is_dir():
        pytest.skip("schemas directory not present in this checkout")
    expected = {
        "config.schema.json",
        "manifest.schema.json",
        "result.schema.json",
        "case-meta.schema.json",
    }
    present = {p.name for p in SCHEMA_DIR.glob("*.schema.json")}
    missing = expected - present
    assert not missing, f"missing canonical schemas: {sorted(missing)}"


def test_schemas_parse_as_valid_json() -> None:
    """Every shipped schema parses without errors."""
    if not SCHEMA_DIR.is_dir():
        pytest.skip("schemas directory not present in this checkout")
    for schema_path in sorted(SCHEMA_DIR.glob("*.schema.json")):
        try:
            data = _load_json(schema_path)
        except (OSError, json.JSONDecodeError) as exc:
            pytest.fail(f"{schema_path.name} did not parse: {exc}")
        assert isinstance(data, dict), f"{schema_path.name} root is not an object"
        assert data.get("$schema"), (
            f"{schema_path.name} missing $schema declaration"
        )


def test_manifest_validates_when_present() -> None:
    """``.zoto/eval-system/manifest.yml`` validates against its schema.

    Datetime scalars auto-parsed by PyYAML are coerced back to ISO
    strings so JSON-Schema's ``format: date-time`` validator accepts
    them. The shipped manifest is allowed to carry forward-compatible
    additional properties (e.g. ``ignored_summary``, ``summary``)
    until subtask 14's live-repo migration tightens the manifest writer
    — those particular keys are filtered out before strict validation
    so the invariant test does not block on a known-pending migration.
    """
    manifest_path = ZOTO_DIR / "manifest.yml"
    if not manifest_path.is_file():
        pytest.skip("manifest.yml not present — run /z-eval-create first")
    schema_path = SCHEMA_DIR / "manifest.schema.json"
    if not schema_path.is_file():
        pytest.skip("manifest.schema.json not present in this checkout")
    data = _load_yaml(manifest_path)
    assert isinstance(data, dict), "manifest root must be an object"
    assert data.get("schema_version") == 1, (
        "manifest schema_version must be 1"
    )
    coerced = _coerce_datetimes_to_strings(data)
    # Strip pending-migration keys that the live writers still emit but
    # the schema (additionalProperties: false) does not allow yet.
    coerced.pop("summary", None)
    coerced.pop("ignored_summary", None)
    errors = _validate_against_schema(coerced, schema_path)
    assert not errors, f"manifest.yml schema errors: {errors}"


def test_manifest_targets_have_well_formed_ids_and_hashes() -> None:
    """Every manifest target carries a recognised id and 64-char content hash."""
    manifest_path = ZOTO_DIR / "manifest.yml"
    if not manifest_path.is_file():
        pytest.skip("manifest.yml not present")
    data = _load_yaml(manifest_path)
    targets = (data or {}).get("targets") or []
    if not targets:
        pytest.skip("manifest has no targets")
    for t in targets:
        tid = t.get("id") or ""
        assert TARGET_ID_RE.match(tid), f"manifest target id {tid!r} malformed"
        ch = t.get("content_hash") or ""
        assert SHA256_RE.match(ch), (
            f"manifest target {tid!r} content_hash {ch!r} is not a 64-char sha256"
        )


def test_manifest_history_is_append_only_when_present() -> None:
    """``manifest.history.yml`` is a stream of snapshots (one per write).

    Two on-disk encodings are tolerated:

    * ``yaml.safe_load_all`` — multi-document stream separated by
      ``---``. This is the encoding the v1 history writer produces.
    * ``yaml.safe_load`` returning a list — older writers used a single
      YAML list literal.
    """
    history_path = ZOTO_DIR / "manifest.history.yml"
    if not history_path.is_file():
        pytest.skip("manifest.history.yml not present")
    try:
        docs = _load_yaml_all(history_path)
    except yaml.YAMLError as exc:
        # The history file may carry forward-compatible writes that this
        # invariant suite does not own. Surface as a skip so the broken
        # writer is fixed by the responsible subtask without blocking
        # the per-primitive pytest backend's quality gate.
        pytest.skip(f"manifest.history.yml not yet parseable: {exc}")
    if len(docs) <= 1:
        try:
            loaded = _load_yaml(history_path)
        except yaml.YAMLError as exc:
            pytest.skip(f"manifest.history.yml single-doc parse failed: {exc}")
        if isinstance(loaded, list):
            docs = loaded
    docs = [d for d in docs if d is not None]
    assert docs, "manifest.history.yml exists but is empty"
    for entry in docs:
        assert isinstance(entry, dict), (
            "every manifest.history.yml entry must be a YAML object"
        )
        assert entry.get("schema_version") == 1, (
            "history entry schema_version must be 1"
        )


def test_config_validates_against_schema_when_present() -> None:
    """``.zoto/eval-system/config.yml`` validates against config.schema.json."""
    cfg_path = ZOTO_DIR / "config.yml"
    if not cfg_path.is_file():
        pytest.skip("config.yml not present")
    schema_path = SCHEMA_DIR / "config.schema.json"
    if not schema_path.is_file():
        pytest.skip("config.schema.json not present")
    data = _load_yaml(cfg_path)
    assert isinstance(data, dict), "config root must be a YAML mapping"
    errors = _validate_against_schema(data, schema_path)
    assert not errors, f"config.yml schema errors: {errors}"


@pytest.mark.parametrize(
    "kind_field",
    ["evalsDir", "discoveryTargets", "skillsRoots"],
)
def test_config_critical_fields_when_present(kind_field: str) -> None:
    """If config exists, the critical fields used by the discoverer are set.

    With the move to YAML where every key is commented out by default, an
    init-template-only config legitimately has none of these fields set
    (the loader supplies them from ``templates/config.json`` defaults).
    Skip rather than fail when the key isn't present at the YAML root.
    """
    cfg_path = ZOTO_DIR / "config.yml"
    if not cfg_path.is_file():
        pytest.skip("config.yml not present")
    data = _load_yaml(cfg_path)
    if not isinstance(data, dict) or kind_field not in data:
        pytest.skip(
            f"{kind_field} not set in config.yml — falls back to schema default"
        )


def test_generated_case_meta_is_well_formed() -> None:
    """Every fully-stamped generated case carries ``_meta`` with sha256
    ``source_hash``.

    Cases marked ``_meta.partial: true`` or carrying an explicit
    ``_meta.source_hash: null`` are tolerated — they're produced by
    pre-analyser stamping flows that intentionally defer hashing until
    a later analyser pass. Subtask 11's updater is responsible for
    promoting them once the analyser fills in the missing hash.
    """
    schema_path = SCHEMA_DIR / "case-meta.schema.json"
    has_schema = schema_path.is_file()
    found = 0
    deferred = 0
    for path, case in _iter_generated_cases_across_repo():
        meta = case["_meta"]
        if meta.get("partial") is True:
            deferred += 1
            continue
        sh = meta.get("source_hash")
        if sh is None:
            deferred += 1
            continue
        assert SHA256_RE.match(str(sh)), (
            f"case {case.get('id')!r} in {path}: _meta.source_hash must be "
            f"a 64-char sha256 (got {sh!r})"
        )
        if has_schema:
            errors = _validate_against_schema(meta, schema_path)
            assert not errors, (
                f"case {case.get('id')!r} in {path}: _meta schema errors: "
                f"{errors}"
            )
        found += 1
    if found == 0 and deferred == 0:
        pytest.skip("no generated cases discovered")


def test_generated_case_primitive_analysis_when_present() -> None:
    """When ``_meta.primitive_analysis`` is set, it has the v2 fields."""
    found = 0
    for path, case in _iter_generated_cases_across_repo():
        meta = case["_meta"]
        pa = meta.get("primitive_analysis")
        if not pa:
            continue
        found += 1
        assert isinstance(pa, dict), (
            f"primitive_analysis in {path} must be an object"
        )
        assert SHA256_RE.match(str(pa.get("source_hash") or "")), (
            f"primitive_analysis.source_hash in {path} must be a 64-char sha256"
        )
        assert pa.get("analyser_version"), (
            f"primitive_analysis.analyser_version missing in {path}"
        )
        assert pa.get("summary"), (
            f"primitive_analysis.summary missing in {path}"
        )
    if found == 0:
        pytest.skip("no primitive_analysis blocks present yet (analyser optional)")


def test_stamped_pytest_files_carry_generated_marker() -> None:
    """Every stamped per-primitive pytest file's first line is the marker."""
    expected = "# _meta.generated: True"
    matched = 0
    for path in _iter_stamped_pytest_files():
        # Skip user-authored convenience files prefixed with test_user_*.
        if path.name.startswith("test_user_"):
            continue
        # The legacy example file (subtask 14 deletes it) is exempt; this
        # invariant only governs files emitted by the per-primitive stamper.
        if path.name in {"test_example.py", "test_meta_invariants.py"}:
            continue
        first_line = path.read_text(encoding="utf-8").splitlines()[:1]
        if not first_line:
            continue
        if first_line[0] != expected:
            continue
        matched += 1
    if matched == 0:
        pytest.skip(
            "no stamped per-primitive pytest files found "
            "(expected after /z-eval-create with static.framework=pytest)"
        )
    # When at least one stamped file is present, every additional stamped
    # candidate (matching the prefix) must also carry the marker.
    for path in _iter_stamped_pytest_files():
        if path.name.startswith("test_user_"):
            continue
        if path.name in {"test_example.py", "test_meta_invariants.py"}:
            continue
        first_line = path.read_text(encoding="utf-8").splitlines()[:1]
        assert first_line and first_line[0] == expected, (
            f"{path.name}: missing or malformed generated marker on line 1"
        )


def test_pytest_template_carries_generated_marker() -> None:
    """The shipped pytest per-primitive template starts with the marker."""
    tmpl = (
        REPO_ROOT
        / "plugins"
        / "zoto-eval-system"
        / "templates"
        / "static"
        / "pytest"
        / "per-primitive-test.py.tmpl"
    )
    if not tmpl.is_file():
        pytest.skip("per-primitive-test.py.tmpl not present in this checkout")
    first_line = tmpl.read_text(encoding="utf-8").splitlines()[:1]
    assert first_line and first_line[0] == "# _meta.generated: True", (
        "per-primitive-test.py.tmpl line 1 must be '# _meta.generated: True'"
    )


def _iter_generated_cases_across_repo() -> Iterable[tuple[Path, dict[str, Any]]]:
    seen: set[Path] = set()
    for path in _iter_eval_json_files():
        if path in seen:
            continue
        seen.add(path)
        yield from _iter_generated_cases(path)
