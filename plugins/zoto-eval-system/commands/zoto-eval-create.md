---
name: zoto-eval-create
description: Scaffold static (pytest) and LLM (@cursor/sdk) eval backends into this repository, generate skill-level eval cases with _meta.generated markers, and write the persistent manifest.
---

# zoto-eval-create

Scaffolds a dual-backend eval suite — static pytest + LLM (@cursor/sdk) — plus the diff manifest that keeps the suite honest.

## Usage

```
/zoto-eval-create
```

## Instructions

Spawn a `zoto-eval-generator` subagent that uses the `zoto-create-evals` skill.

### What happens

1. Load `.zoto-eval-system/config.json`. Hand off to `/zoto-eval-configure` via `askQuestion` if missing.
2. Run `scripts/eval-discover.ts` (through an `explore` subagent) to inventory covered targets.
3. Ask, via `askQuestion`, which discovered targets to scaffold evals for (default: all).
4. Stamp BOTH backends:
   - Static pytest → `{evalsDir}/`.
   - LLM → `{evalsDir}/_llm/`.
5. Generate per-skill `evals.json` cases with `_meta.generated: true`.
6. Merge eval scripts into `package.json`.
7. If `manualChecklists.enabled`, stamp `USER_EVAL_CHECKLISTS.md`.
8. Write `.zoto-eval-system/manifest.yml` and append to `.zoto-eval-system/manifest.history.yml`.
9. Validate: `pnpm run eval:list`, `pnpm run eval -- --collect-only`, `pnpm run eval:update --check` (must exit 0 immediately).

## Related

- `zoto-eval-generator` agent — the generator specialist.
- `zoto-create-evals` skill — the documented workflow.
- `/zoto-eval-configure` — required first step.
- `/zoto-eval-update` — runs the diff engine after code changes.
- `/zoto-eval-execute` — runs the suite.
