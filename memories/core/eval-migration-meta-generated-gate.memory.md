---
id: "724d6f7"
title: "Destructive eval migrations are gated by the `_meta.generated === true` marker; cases/files without it are byte-preserved"
description: "Any automated regeneration, migration, or rewrite of eval files MUST treat _meta.generated === true (case marker) and // _meta.generated: true / # _meta.generated: True (file marker, line 1, with a 20-line backward-compat scan) as the hard gate. Cases lacking _meta or with generated !== true are user-authored and must be byte-preserved; rewrite subtasks should diff preserved rows post-write to prove zero byte changes."
type: "core"
strength: 1
created: 2026-05-30
modified: 2026-05-30
source: "20260527-evals-json-first-migration"
tags: [eval-system, migration, user-content, _meta, safety]
---

# Destructive eval migrations are gated by `_meta.generated === true`

Any automated regeneration, migration, or rewrite of eval files MUST treat the
generated marker as the hard gate before touching content:

- **Case marker:** `_meta.generated === true`
- **File marker:** `// _meta.generated: true` (TS) / `# _meta.generated: True` (pytest)
  on line 1, with a backward-compat scan over the first 20 lines.

Cases lacking `_meta`, or with `generated !== true`, are **user-authored** and
must be **byte-preserved**. Rewrite/migration subtasks should diff the preserved
rows after writing to prove zero bytes changed.

This gate protected 100% of user-authored content across three destructive eval
migrations (`evals-json-first-migration`, `eval-single-backend-colocated-restructure`,
`eval-prompt-realism-audit`). Treat it as a non-negotiable invariant for any
tooling that rewrites eval files in place.
