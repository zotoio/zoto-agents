---
id: "a1967cc"
title: "`explore` subagents cannot write files — use `generalPurpose` for investigation deliverables that need file output"
description: "Read-only explore subagents silently fail to persist audit/investigation artefacts. Any subtask whose deliverable is a written file (audit reports, classification matrices, ADRs) MUST be assigned to generalPurpose (or another write-capable agent), not explore. Observed when explore subtasks reported complete but produced no files."
type: "redflag"
strength: 1
created: 2026-05-30
modified: 2026-05-30
source: "20260526-eval-askquestion-strategy-bridge"
tags: [orchestration, subagents, explore, generalpurpose, spec-system]
---

# `explore` subagents cannot write files

Read-only `explore` subagents **silently fail** to persist audit / investigation
artefacts — they report completion but produce no files on disk.

**Rule:** Any subtask whose deliverable is a *written file* (audit reports,
classification matrices, ADRs, inventories) MUST be assigned to `generalPurpose`
(or another write-capable agent), never `explore`.

Observed in the askquestion-strategy-bridge spec: explore subtasks "completed"
their investigation but left zero artefacts, forcing a re-run with
`generalPurpose`. Reserve `explore` for pure read-only reconnaissance whose
output is returned in the response, not written to disk.
