---
name: z-eval-create
description: Scaffold static (pytest) and LLM (@cursor/sdk) eval backends, generate eval cases with _meta.generated markers for approved skills/commands/agents/hooks, and write the persistent manifest. Command pre-collects target checklists via askQuestion before spawning zoto-eval-generator.
---

# z-eval-create

Scaffolds a dual-backend eval suite — static pytest + LLM (@cursor/sdk) — plus the diff manifest that keeps the suite honest.

## Usage

```
/z-eval-create
```

## Instructions

### Precondition

Before doing anything else, verify that **`.zoto/eval-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

Do not synthesize a default config and do not proceed.

### Pre-collect (before Task)

Run `askQuestion` for:

1. **Missing config** — If `.zoto/eval-system/config.yml` is absent: hand off to `/z-eval-configure` now vs abort.
2. After running discovery (via explore subagent or instructing generator to run it first), present **four checklists** (default: all selected):
   - Which **skills** to scaffold evals for.
   - Which **commands** (plugin `plugins/*/commands/*.md` **and** `.cursor/commands/*.md`) to scaffold.
   - Which **agents** (plugin `plugins/*/agents/*.md` **and** `.cursor/agents/*.md`) to scaffold.
   - Which **hooks** (plugin `hooks/hooks.json`, plus workspace `.cursor/hooks.json` or `.cursor/hooks/hooks.json` → stable eval id `hook:cursor`) to scaffold.

Persist the approved IDs in the Task prompt to `zoto-eval-generator`.

### Spawn subagent

Spawn a `zoto-eval-generator` subagent that uses the `zoto-create-evals` skill, passing:

- Approved skill / command / agent / hook IDs.
- Any paths or flags already resolved.

### Resume loop

If the report contains `needs_user_input`, run `askQuestion`, then **resume** the Task with answers.

### What happens (inside generator)

1. Config present (else `needs_user_input`).
2. Discovery via ``pnpm run eval:discover``.
3. Stamp static + LLM backends.
4. For skills: ensure `evals/evals.json` exists under each approved skill dir. For commands/agents/hooks: run `pnpm run eval:stamp -- <target-id>` per approved ID (calls `eval-analyse` internally). Outputs land under `plugins/<p>/evals/{commands,agents,hooks}/…` **or** `.cursor/evals/{commands,agents,hooks}/…` for workspace primitives.
5. Stamp `.env.example` at the repo root from `templates/env/.env.example.tmpl` — only when it does not already exist; existing files are surfaced as a note, never overwritten. `.env` itself is never written.
6. Merge `package.json` scripts and devDeps (includes `dotenv`, which the LLM runner imports at startup so values in `.env` flow into `process.env`). Operator must run `pnpm install` (or `yarn install` / `npm install`) once afterwards.
7. Optional `USER_EVAL_CHECKLISTS.md`.
8. Write `manifest.yml` + append `manifest.history.yml`.
9. Validate gates: `pnpm run eval:list`, `pnpm run eval -- --collect-only`, `pnpm run eval:update --check`.

## Related

- `zoto-eval-generator` agent — the generator specialist.
- `zoto-create-evals` skill — the documented workflow.
- `/z-eval-configure` — required when config is missing.
- `/z-eval-update` — runs the diff engine after code changes.
- `/z-eval-execute` — runs the suite.
