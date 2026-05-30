---
id: "7d49062"
title: "Editing a covered `SKILL.md` requires a follow-up `eval:update --apply` or `eval:update --check` reports critical drift"
description: "Modifying any SKILL.md (or other covered primitive surface) changes its content hash, so eval:update --check exits 2 with critical drift until you run eval:update --apply (--no-analyser for cached). This is expected and is part of the editing subtask's Definition of Done — not an unrelated CI failure."
type: "redflag"
strength: 1
created: 2026-05-30
modified: 2026-05-30
source: "20260527-evals-json-first-migration"
tags: [eval-system, drift, manifest, skill, definition-of-done]
---

# Editing a covered `SKILL.md` requires a follow-up `eval:update --apply`

Modifying any `SKILL.md` (or other covered primitive surface) changes its content
hash recorded in the manifest. As a result, `eval:update --check` will **exit 2
with critical drift** until you re-stamp:

```bash
pnpm run eval:update --apply --no-analyser   # cached payload path
```

This is **expected behaviour**, not an unrelated CI failure. Re-stamping after
editing a covered primitive is part of the editing subtask's Definition of Done.

Repeatedly rediscovered across the json-first-migration (DOD06 drift),
single-backend-restructure (pre-existing SKILL.md drifts), and prompt-realism-audit
(drift remediation) specs — always re-run `eval:update --apply` after touching a
covered primitive's surface.
