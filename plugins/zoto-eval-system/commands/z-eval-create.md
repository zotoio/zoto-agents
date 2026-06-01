---
name: z-eval-create
description: Scaffold static (pytest) and LLM (@cursor/sdk) eval backends, generate eval cases with _meta.generated markers for approved skills/commands/agents/hooks, and write the persistent manifest. Command pre-collects target checklists via askQuestion before spawning zoto-eval-generator.
---

# z-eval-create

Scaffolds a dual-backend eval suite — static pytest + LLM (@cursor/sdk) — plus the diff manifest that keeps the suite honest. **Lean mode (default):** only repo-specific assets are materialised under `.zoto/eval-system/`; engine, scripts, and templates resolve from the installed plugin at runtime via `.zoto/eval-system/scripts/eval-bridge.ts`.

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
3. **Lean layout stamp** via `pnpm exec tsx plugins/zoto-eval-system/scripts/stamp-lean-layout.ts --repo-root <host>` — creates `.zoto/eval-system/` dirs (`cache/`, `.gitignore`, nested `package.json`, `scripts/eval-bridge.ts`), `evals/_runs/.gitkeep`, and optional root `package.json` delegates. **Does not** call `stamp-host-layout.ts` (eject only).
4. Stamp static + LLM backend fixtures under the configured `evalsDir` (baseline via `pnpm run eval:baseline-stamp`).
5. For skills: ensure `evals/evals.json` exists under each approved skill dir. For commands/agents/hooks: run `pnpm run eval:stamp -- <target-id>` per approved ID (calls `eval-analyse` internally). Outputs land under `plugins/<p>/evals/{commands,agents,hooks}/…` **or** `.cursor/evals/{commands,agents,hooks}/…` for workspace primitives.
6. Stamp `.env.example` at the repo root, ensure the host `.gitignore` covers `.env`, and upsert repo-root `README.md` / `AGENTS.md` when missing via `pnpm run eval:ensure-host` (also applied inline by lean layout through `ensure-host-env-and-gitignore.ts`). Idempotent — existing `.env.example` and root docs are never overwritten. `.env` itself is never written.
7. Operator must run `pnpm install` at the repo root once after create (or rely on `/z-eval-init` if already run) to pick up merged devDeps (`@cursor/sdk`, `tsx`, `yaml`, `dotenv`, `ajv`, `ajv-formats`, `typescript`, `minimatch`).
8. Optional `USER_EVAL_CHECKLISTS.md`.
9. Write `manifest.yml` + append `manifest.history.yml`.
10. Validate gates: `pnpm run eval:list`, `pnpm run eval -- --collect-only`, `pnpm run eval:update --check`.

### Lean vs ejected

| Mode | Trigger | Runtime location |
|------|---------|------------------|
| **Lean (default)** | `/z-eval-create` | Plugin via `.zoto/eval-system/scripts/eval-bridge.ts` |
| **Ejected** | `pnpm run eval:stamp-host-layout` (CLI only) | `.zoto/eval-system/` vendored copy + `.cursor/*/eval-sys/` primitives |

Eject patches only `hostLayout` in config — it does not replace manifest or eval cases. Un-eject via `pnpm run eval:un-eject` restores lean with no data loss.

## Related

- `zoto-eval-generator` agent — the generator specialist.
- `zoto-create-evals` skill — the documented workflow.
- `/z-eval-init` — writes config and runs root `pnpm install`.
- `/z-eval-configure` — required when config is missing.
- `/z-eval-update` — runs the diff engine after code changes.
- `/z-eval-execute` — runs the suite.
