---
id: "a763c27"
title: "Unify on one declarative format with a typed `runner` escape hatch instead of maintaining parallel imperative/declarative tracks"
description: "When a system has drifted into dual code+declarative tracks, collapse to a single canonical declarative (JSON) format and add a typed discriminator field (runner) that delegates rare imperative cases to a TS file via a typed contract (RunnerParams). A custom Vite plugin (resolveId + load) loads the JSON suites in-memory as Vitest tests — no .tmp.ts shim files on disk — preserving test-explorer/reporters/parallelism."
type: "core"
strength: 1
created: 2026-05-30
modified: 2026-05-30
source: "20260527-evals-json-first-migration"
tags: [eval-system, architecture, vitest, json, escape-hatch, runner]
---

# Single declarative format + typed `runner` escape hatch

When a system has drifted into dual **code + declarative** tracks, collapse to a
single canonical declarative (JSON) format and add a typed discriminator field
to cover the rare imperative cases:

- The presence of a `runner` field on a JSON case marks it imperative: the
  declarative grader is skipped and execution is delegated to a `.test.ts` file.
- The contract is typed (`RunnerParams` interface + matching JSON Schema), so the
  escape hatch stays type-safe and self-documenting.
- A custom **Vite plugin** (`resolveId` + `load`) loads the co-located `*.json`
  eval files **in-memory** as Vitest suites — no `.tmp.ts` shim files written to
  disk — preserving test-explorer integration, reporters, and parallel execution.

This pattern removed an entire parallel track while keeping an imperative escape
hatch, and supersedes the earlier co-located `.test.ts`-per-primitive approach.
Reusable design principle: **one canonical format + a typed discriminator for
exceptions** beats maintaining two parallel pipelines.
