---
id: "802be55"
title: "Make destructive migrations fail-safe: dry-run, single-commit checkpoint, and log AST-extraction failures to an audit instead of writing corrupt output"
description: "For one-shot destructive migrations: provide a --keep-ts-style dry-run that writes new artefacts without deleting originals; land the whole migration in a single commit so git revert cleanly restores prior state; make the migration idempotent (re-run = no-op); when parsing/AST extraction fails, leave the file un-migrated with a warning and record it in a migration audit — NEVER silently emit corrupt output. Partial migration can corrupt declarative JSON; validate with eval:list after each batch."
type: "learning"
strength: 1
created: 2026-05-30
modified: 2026-05-30
source: "20260527-evals-json-first-migration"
tags: [migration, safety, idempotency, git, audit, ast]
---

# Make destructive migrations fail-safe

For a one-shot destructive migration (e.g. rewriting and deleting many files):

1. **Dry-run first.** Provide a `--keep-ts`-style flag that writes the new
   artefacts *without* deleting the originals, so you can validate output before
   committing to `--apply`.
2. **Single-commit checkpoint.** Land the whole migration in one commit so
   `git revert <commit>` cleanly restores the prior state.
3. **Idempotency.** Make re-running the migration a no-op; this validates the
   atomic write logic and protects against partial-rerun corruption.
4. **Fail loud, not corrupt.** When parsing / AST extraction fails on a file,
   leave it un-migrated with a deprecation warning and record it in a migration
   audit. NEVER silently emit corrupt output.

Partial migration is known to corrupt declarative JSON (e.g. `},]`) — validate
with `eval:list` (or the equivalent enumerator) after **each batch**, not just at
the end.
