---
id: "3a301ce"
title: "`eval:update --apply --with-analyser` is network-dependent and can hang (~41 min); use `--no-analyser` cached path for CI/offline"
description: "The analyser apply path requires reachability to the @cursor/sdk API-key exchange endpoint and has hung at ~41 minutes in practice. For offline/CI/deterministic runs use pnpm run eval:update --apply --no-analyser which regenerates from cached analyser payloads. Reserve --with-analyser for online runs when primitives genuinely changed."
type: "redflag"
strength: 1
created: 2026-05-30
modified: 2026-05-30
source: "20260526-eval-askquestion-strategy-bridge"
tags: [eval-system, analyser, ci, network, fallback]
---

# `eval:update --with-analyser` is network-dependent and can hang

The analyser apply path requires reachability to the `@cursor/sdk` API-key
exchange endpoint and has **hung at ~41 minutes** in practice (observed across
the askquestion-strategy-bridge, json-first-migration, and prompt-realism-audit
specs).

**For offline / CI / deterministic runs:**

```bash
pnpm run eval:update --apply --no-analyser
```

This regenerates from **cached analyser payloads** and is the reliable fallback.
Reserve `--with-analyser` for online runs when primitives genuinely changed and a
cache refresh is required — and budget for the network round-trip / potential
hang.
