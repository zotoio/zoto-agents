---
id: "36e1e9c"
title: "Eval cases must assert user-visible outcomes with realistic, transcript-seeded prompts — never internal mechanics"
description: "Generated eval prompts should read like real Cursor user messages (seeded from redacted agent transcripts, falling back to README/SKILL ## Usage), using realistic invocation shapes per kind. Assertions must check user-visible outcomes (artefacts, exit codes, on-screen guidance, manifest rows) — NOT internal mechanics. Internal-mechanic assertions are allowed ONLY when they encode a hard contract, cited in an exception register."
type: "core"
strength: 1
created: 2026-05-30
modified: 2026-05-30
source: "20260525-eval-prompt-realism-audit"
tags: [eval-system, prompt-quality, realism, assertions, testing]
---

# Eval cases assert user-visible outcomes with realistic prompts

Generated eval prompts should read like **real Cursor user messages**, seeded
from redacted agent transcripts (falling back to README / `SKILL.md` `## Usage`
synthesis), using realistic invocation shapes per kind:

- **commands:** `/cmd <realistic args>`
- **agents:** natural-English delegation
- **hooks:** concrete lifecycle-event descriptions
- **skills:** upstream-agent-style messages

Assertions must check **user-visible outcomes** — artefacts produced, exit codes,
on-screen guidance text, manifest rows — and NOT internal mechanics such as "the
spawned Task referenced skill X" or "the assistant invoked `pnpm run eval:discover`".

Internal-mechanic assertions are permitted **only** when they encode a hard
contract (e.g. `_meta.generated`, exact precondition refuse strings, analyser
schema invariants, `manifest.history.yml` append-only), and each such case must
be listed in a contract-assertion exception register with the contract cited.
Bare command prompts are likewise allowed only for documented precondition-abort
or no-args paths, recorded in a bare-command exception register.
