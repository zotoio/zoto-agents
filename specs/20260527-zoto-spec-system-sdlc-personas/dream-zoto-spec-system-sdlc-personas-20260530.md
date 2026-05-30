# Dream Summary — Multi-Spec Dream (5 specs)

**Date:** 2026-05-30
**Mode:** Dream extraction (NOT REM sleep)
**Owner:** `crux-cursor-memory-manager`
**Proposal artefact:** `memory-proposals/dream-analysis-20260530.md` (retained alongside this summary)
**Config:** `.crux/crux-memories.json` — `enableMemories: true`, `enableMemoryCompression: true`

## Scope

Multi-spec dream across 5 specs (recency precedence applied), plus subsequent-change analysis:

1. `20260527-zoto-spec-system-sdlc-personas` (highest precedence) — **NOT EXECUTED (Draft)**
2. `20260527-evals-json-first-migration` — completed
3. `20260526-eval-single-backend-colocated-restructure` — completed
4. `20260526-eval-askquestion-strategy-bridge` — completed (with exceptions)
5. `20260525-eval-prompt-realism-audit` (lowest precedence) — completed (1 partial-accepted)

"Subsequent changes after that" resolved to the json-first migration execution (HEAD `5132944`), already in scope; no post-HEAD working-tree code changes exist.

## Corpus state at dream time

- `memories/` was **empty**; `.crux/memory-index.yml` did not exist.
- Therefore: every candidate was **novel**, **0 conflicts**, **0 resolved-bug detections** possible.

## Candidates

- **Extracted / ranked:** 12 (3 core, 5 redflag, 3 learning, 1 idea).
- **Accepted:** 11 (Candidates 1–11).
- **Skipped:** 1 — Candidate 12 (`idea`: thin-persona/thick-skill SDLC architecture) skipped by user decision; sourced from the unexecuted sdlc-personas spec (design-intent only).
- **Conflicts resolved:** 0 (none possible — empty corpus).
- **Resolved bugs forgotten:** 0 (no pre-existing redflag memories).

## Memories created (11, all base scope)

| id | type | file |
|----|------|------|
| `724d6f7` | core | `memories/core/eval-migration-meta-generated-gate.memory.md` |
| `a763c27` | core | `memories/core/declarative-format-typed-runner-escape-hatch.memory.md` |
| `36e1e9c` | core | `memories/core/eval-cases-user-visible-outcomes-realistic-prompts.memory.md` |
| `a1967cc` | redflag | `memories/redflag/explore-subagents-cannot-write-files.memory.md` |
| `3a301ce` | redflag | `memories/redflag/eval-update-with-analyser-network-hang.memory.md` |
| `7d49062` | redflag | `memories/redflag/editing-covered-skill-md-requires-eval-update.memory.md` |
| `cc219fb` | redflag | `memories/redflag/avoid-analyser-version-bump-prompt-only.memory.md` |
| `07bb2df` | redflag | `memories/redflag/spec-resume-reconcile-filesystem-vs-status.memory.md` |
| `c9ee051` | learning | `memories/learning/three-gate-eval-validation.memory.md` |
| `802be55` | learning | `memories/learning/fail-safe-destructive-migrations.memory.md` |
| `99b5807` | learning | `memories/learning/per-package-pnpm-test-reliable-signal.memory.md` |

All created with `strength: 1`, `created: 2026-05-30`, `modified: 2026-05-30`.

## Index

`.crux/memory-index.yml` rebuilt via `crux-skill-memory-index` — **11 memories** indexed.

## Archival

The 4 completed specs were moved to `.ai-ignored/executed/`:

- `20260527-evals-json-first-migration`
- `20260526-eval-single-backend-colocated-restructure`
- `20260526-eval-askquestion-strategy-bridge`
- `20260525-eval-prompt-realism-audit`

**Kept in `specs/`:** `20260527-zoto-spec-system-sdlc-personas` (still pending execution; holds this summary + the proposal artefact).
