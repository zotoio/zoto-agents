"""Python mirror of the canonical TypeScript ``AnalyserPayload`` type from
``scripts/eval-analyse.ts``.

This file is the Python source-of-truth for the LLM-driven analyser payload
contract (subtask 04 of the eval-system-v2 spec). Static and LLM backend
templates that target Python (subtask 06's pytest backend, future sandbox
helpers under ``evals/_llm/``) import these dataclasses to consume analyser
output without re-deriving the shape from JSON.

A drift gate at ``scripts/check-analyser-payload-parity.ts`` parses both this
file and the TypeScript ``AnalyserPayload`` declaration and exits non-zero if
the two shapes disagree at the field level. Keep them in lock-step:

* When you add or rename a field on the TS side, mirror it here.
* When you change optionality (`?` in TS, ``Optional[...]`` here) on one side,
  mirror it on the other.
* The parity script tolerates docstrings — keep them rich.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Literal, Optional


PrimitiveKind = Literal["skill", "command", "agent", "hook", "rule"]


@dataclass(frozen=True)
class AnalyserFixtureFile:
    """Single overlay file inside ``AnalyserCase.fixtures.files[]``.

    ``content`` and ``from_`` are mutually exclusive — exactly one MUST be
    populated. ``from_`` is suffixed with an underscore because ``from`` is a
    Python keyword; the parity check tolerates this rename.
    """

    path: str
    content: Optional[str] = None
    from_: Optional[str] = None


@dataclass(frozen=True)
class AnalyserFixtures:
    """Per-case fixture overlay applied on top of the repo-wide baseline.

    Empty ``files`` is allowed and means "no per-case overlay required" — the
    stamper writes ``fixtures.files: []`` and refuses to invent files
    elsewhere.
    """

    files: List[AnalyserFixtureFile] = field(default_factory=list)


@dataclass(frozen=True)
class AnalyserExpectedFilesystem:
    """Optional declarative filesystem expectation evaluated by the runner."""

    created: Optional[List[str]] = None
    modified: Optional[List[str]] = None
    removed: Optional[List[str]] = None
    unchanged: Optional[List[str]] = None


@dataclass(frozen=True)
class AnalyserCase:
    """One realistic case mapped 1:1 onto a stamped eval row."""

    scenario: str
    prompt: str
    assertions: List[str]
    follow_ups: Optional[List[str]] = None
    fixtures: Optional[AnalyserFixtures] = None
    fixture_justifications: Optional[List[str]] = None
    expected_filesystem: Optional[AnalyserExpectedFilesystem] = None
    expected_output: Optional[str] = None


@dataclass(frozen=True)
class AnalyserPayload:
    """Canonical analyser output for a single primitive."""

    schema_version: int
    analyser_version: str
    model_id: str
    target_id: str
    kind: PrimitiveKind
    source_path: str
    source_hash: str
    summary: str
    cases: List[AnalyserCase]
