---
id: "07bb2df"
title: "On spec resume, reconcile filesystem reality against status files before acting — status often lags the disk"
description: "When resuming an interrupted spec execution, status files can read pending/incomplete while artefacts already exist on disk (and vice versa). Reconcile on-disk reality with status files first, then proceed. Either lag direction is possible: status pending while work done, or status stale while work genuinely not done."
type: "redflag"
strength: 1
created: 2026-05-30
modified: 2026-05-30
source: "20260527-evals-json-first-migration"
tags: [spec-system, resume, status, reconciliation, execution]
---

# On spec resume, reconcile filesystem reality against status files first

When resuming an interrupted spec execution, **do not trust status files
blindly** — they frequently lag the actual disk state in either direction:

- Status reads `pending` while the artefacts already exist on disk (json-first
  migration resume: migration artifacts present, several statuses still `pending`).
- Status looks active/complete while the work genuinely was never done
  (sdlc-personas: all 13 statuses `pending` and disk confirms it truly is
  unexecuted — no persona agents, skills, or schema).

**Rule:** reconcile on-disk reality against status files *first*, then proceed.
Treat the filesystem as the source of truth and repair status to match before
making execution decisions.
