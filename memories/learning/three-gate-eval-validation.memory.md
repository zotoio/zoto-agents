---
id: "c9ee051"
title: "Three-gate eval validation: `eval:list` + `eval -- --collect-only` + `eval:update --check` must all exit 0"
description: "The canonical post-change eval validation is three gates that must each exit 0: (1) pnpm run eval:list proves the manifest still enumerates every target; (2) pnpm run eval -- --collect-only proves every backend can collect the cases; (3) pnpm run eval:update --check proves no source-hash/content drift. Capture exit logs in the execution report."
type: "learning"
strength: 1
created: 2026-05-30
modified: 2026-05-30
source: "20260525-eval-prompt-realism-audit"
tags: [eval-system, validation, gates, ci, manifest]
---

# Three-gate eval validation

The canonical post-change validation for eval work is **three gates that must
each exit 0**:

1. `pnpm run eval:list` — proves the manifest still enumerates every target.
2. `pnpm run eval -- --collect-only` — proves every backend can collect the
   (rewritten) cases.
3. `pnpm run eval:update --check` — proves no source-hash / content drift.

Capture the exit logs in the execution report. This trio is the shared,
repeatable acceptance procedure across the prompt-realism-audit and
askquestion-strategy-bridge specs — run all three after any eval change before
declaring done.
