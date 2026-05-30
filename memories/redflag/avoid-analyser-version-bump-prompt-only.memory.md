---
id: "cc219fb"
title: "Don't bump `analyser_version` for prompt-only strengthening — it invalidates all cached payloads and can overwrite curated rewrites"
description: "Strengthening the analyser system prompt (adding forbidden-vocabulary lists, worked examples) MUST NOT bump analyser_version. Bumping invalidates every cached analyser payload and forces the next eval:update --apply to re-analyse, which can overwrite hand-curated case rewrites with fresh model output. The strengthened prompt guards future analyses of new/changed primitives while curated current-state rewrites stay canonical."
type: "redflag"
strength: 1
created: 2026-05-30
modified: 2026-05-30
source: "20260525-eval-prompt-realism-audit"
tags: [eval-system, analyser, versioning, cache, prompt-engineering]
---

# Don't bump `analyser_version` for prompt-only strengthening

Strengthening the analyser system prompt — adding a "Forbidden internal-mechanic
vocabulary" list, worked before/after examples, exception-register rules — MUST
NOT bump `analyser_version`.

**Why:** bumping invalidates **every cached analyser payload** and forces the next
`eval:update --apply` to re-analyse, which can **overwrite hand-curated case
rewrites** with fresh model output, silently undoing curation work.

The strengthened prompt still guards future analyses of *new or changed*
primitives; meanwhile the curated current-state rewrites remain canonical because
their cached payloads are untouched. Only bump `analyser_version` when the
analyser's *output contract* genuinely changes and you intend to re-analyse
everything.
