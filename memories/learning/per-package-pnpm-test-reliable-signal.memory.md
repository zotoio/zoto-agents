---
id: "99b5807"
title: "Use per-package `pnpm -r test` as the reliable signal; a single parallel Vitest invocation can flake on CLI integration timeouts"
description: "The canonical green-test signal is per-package pnpm -r test. A single combined parallel Vitest invocation can flake specifically on spec-system CLI integration timeouts — don't treat that flake as a regression; fall back to the per-package path. Also: a static evals/vitest.config.ts must exclude llm/** to avoid #eval-engine import failures during --collect-only."
type: "learning"
strength: 1
created: 2026-05-30
modified: 2026-05-30
source: "20260527-evals-json-first-migration"
tags: [testing, vitest, pnpm, flake, ci, monorepo]
---

# Per-package `pnpm -r test` is the reliable signal

The canonical green-test signal in this monorepo is **per-package**:

```bash
pnpm -r test   # e.g. cursor-top 86/86, eval-system 128/128, spec-system 132/132
```

A single **combined parallel Vitest invocation** can flake specifically on
spec-system CLI integration timeouts. Don't treat that flake as a regression —
fall back to the per-package `pnpm -r test` path for the authoritative result.

Related gotcha: a static `evals/vitest.config.ts` must **exclude `llm/**`** to
avoid `#eval-engine` import failures during `--collect-only`.
