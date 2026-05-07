---
name: zoto-create-evals
description: Scaffolds static pytest and LLM (@cursor/sdk) eval backends into a host repository, generates eval cases with _meta.generated markers for approved skills/commands/agents/hooks, merges eval scripts into package.json, and writes the persistent manifest plus append-only history. Expects the invoking command to pre-collect approved targets — does not call askQuestion.
---

# Create Evals

Scaffolds a fresh dual-backend eval suite into any repository, discovers covered targets, generates eval cases with persistent `_meta` markers, and writes the manifest that future `/z-eval-update` invocations will diff against.

## Configuration

Reads `.zoto/eval-system/config.yml`. If missing, return `needs_user_input` so `/z-eval-create` can hand off to `/z-eval-configure` — **do not** call `askQuestion`.

### Configuration honoured (v2)

Stamping selects backends using **`static.framework`** (`pytest` | `vitest` | `jest`), **`llm.strategy`** (`code` | `declarative`), and **`llm.codeFramework`** (`vitest` | `jest` when strategy is `code`). Operators edit these in `.zoto/eval-system/config.yml` (via `/z-eval-configure`); flipping them is mutually exclusive cleanup work, not silent drift.

Writes:
- `{evalsDir}/` — pytest backend (from `templates/static/pytest/`).
- `{evalsDir}/_llm/` — LLM backend (from `templates/llm/agent-sdk/`).
- Per-target eval files (see Step 4).
- `.env.example` at the repo root (from `templates/env/.env.example.tmpl`) — placeholder for `CURSOR_API_KEY` and optional `ZOTO_EVAL_MODEL`. **Never overwritten** if it already exists.
- `.zoto/eval-system/manifest.yml` — current state.
- `.zoto/eval-system/manifest.history.yml` — append-only snapshot.
- Updates to the host repo's `package.json` via `scripts/package-json-merger.ts` (includes `dotenv` as a devDependency so the LLM runner can auto-load `.env`).

## When to Use

- `/z-eval-create` invoked.
- No `{evalsDir}/` exists yet.
- `manifest.yml` is missing.

## Workflow

### Step 1: Load config

Read `.zoto/eval-system/config.yml`. If missing, end with `needs_user_input` describing that configure must run first — do not prompt interactively.

### Step 2: Discover targets

Spawn an `explore` subagent and run ``pnpm run eval:discover``. This produces a manifest-shaped payload — the list of covered targets (skills, commands, agents, hooks, optionally cli/lib) with content hashes and public-surface metadata.

### Step 3: Approved targets + ignore filtering (command-pre-collected)

The **`/z-eval-create` command** presents checklists via `askQuestion` **before** spawning this workflow (default: all discovered per kind). The Task prompt MUST enumerate approved IDs — treat them as authoritative.

Immediately filter that list against `config.ignore`: map each retained ID to its canonical source (`SKILL.md`, `commands/<name>.md`, `agents/<name>.md`, `hooks.json`, …) and drop any path whose POSIX repo-relative form matches a minimatch entry (same rules as `eval-analyse.ts` / `eval-stamp.ts`). **Do not** run `pnpm run eval:analyse --` / `eval-stamp.ts` for excluded IDs; tooling will exit cleanly with `{ ignored: true }` if invoked accidentally.

Run `pnpm exec tsx scripts/eval-cleanup-vendored.ts` after host operators populate `ignore` so legacy generated-only eval JSON for upstream bundles (typically `crux-*`) disappears (see Ignored section).

### Step 4: Stamp backend templates (static + LLM)

Every invocation ALWAYS stamps both backends (no opt‑out):

- Static: copy `templates/static/pytest/*` to `{evalsDir}/`.
- LLM: copy `templates/llm/agent-sdk/*` to `{evalsDir}/_llm/`.
- Copy `templates/runner/test.py.tmpl` to `scripts/test.py`.
- Copy `templates/schema/result.schema.json` to `{evalsDir}/_llm/result.schema.json`.
- Copy `templates/env/.env.example.tmpl` to `.env.example` at the repo root **only if `.env.example` does not already exist**. If it does, do not overwrite — instead surface a one-line note in the final report so operators can confirm `CURSOR_API_KEY=` is present. Never write `.env` itself.

Skills still consume `skills/<name>/evals/evals.json` via **`templates/skill-evals/evals.json.tmpl`** inside each approved skill folder. **`eval-stamp.ts` refuses `skill:*`** — optional `pnpm run eval:analyse -- skill:<name>` supplies suggested `fixtures`, but integrations stay skill-local.

### Step 4a: Analyse each approved central target & stamp fixtures

Repeat only for **command/agent/hook** targets that survived the Step 3 ignore filter (still excluding `skill:*`, which relies on templated prompts + manual merges):

```bash
pnpm run eval:analyse -- <target-id> [--pretty]
pnpm run eval:stamp -- <target-id> [--dry-run]
```

`target-id`: `command:<name>`, `agent:<slug>`, `hook:<plugin>`, **`hook:cursor-workspace`** for `.cursor/hooks.json` / `.cursor/hooks/hooks.json` (canonical id). The legacy alias **`hook:cursor`** still resolves to the same bundle but prints a deprecation warning — prefer **`hook:cursor-workspace`** everywhere.

**Central roots**

| Kind | Plugin assets | Workspace `.cursor` assets |
|------|----------------|---------------------------|
| command | `plugins/<plugin>/evals/commands/<name>.json` | `.cursor/evals/commands/<name>.json` |
| agent | `plugins/<plugin>/evals/agents/<name>.json` | `.cursor/evals/agents/<name>.json` |
| hook | `plugins/<plugin>/evals/hooks/<plugin>.json` | `.cursor/evals/hooks/hooks.json` (**`hook:cursor-workspace`**) |

Committed JSON MUST include **`fixtures`** + **`expected_filesystem`** blocks for realism; **`eval-stamp`** materialises `from:` paths and preserves user-authored `_meta.generated: false` cases.

`templates/{command,agent,hook}-evals/*.tmpl` files are annotated reference (**`_template_doc`**) describing field shape — production JSON is produced by **`eval-stamp.ts`**, not handwritten placeholders.

`_meta` for generated rows:

```yaml
_meta:
  generated: true
  source_hash: <sha256 of normalised source>
  primitive_analysis_hash: <sha256 of canonical analyser payload omitting source_hash>
  last_updated: <ISO 8601 UTC — Date.prototype.toISOString()>
  generated_by: "zoto-create-evals"
  partial: <optional true when only shape-sanity signal existed>
```

### Step 5: Merge package.json

Run `scripts/package-json-merger.ts` on the host repo's `package.json`. It imports the scripts block from `templates/package-scripts/base.json` idempotently and merges dev-dependencies (existing versions win unless `--force`). The merged devDeps include `dotenv` — the LLM runner imports `dotenv/config` at startup, so values in `.env` (including `CURSOR_API_KEY` and `ZOTO_EVAL_MODEL`) flow into `process.env` automatically. Anything already exported in the shell still wins over `.env` (standard dotenv precedence).

After the merge, the operator must run their package manager (`pnpm install` / `yarn install` / `npm install`) once to fetch new devDeps. Document this in the final report.

### Step 6: Manual checklists

If `config.manualChecklists.enabled` is true, copy `templates/user-checklists/USER_EVAL_CHECKLISTS.md.tmpl` to `{evalsDir}/USER_EVAL_CHECKLISTS.md`.

### Step 7: Write manifests

Write `.zoto/eval-system/manifest.yml`:

```yaml
schema_version: 1
created_at: <ISO 8601>
updated_at: <same>
git_ref: <HEAD sha>
generated_by: zoto-create-evals
discovery_config:
  discoveryTargets: [...]
  skillsRoots: [...]
  evalsDir: <evalsDir>
  additionalAutomation: [...]
targets: [ ...full list with content_hash, public_surface, eval_files... ]
```

Append the exact same document to `.zoto/eval-system/manifest.history.yml` (append-only; never rewrite).

### Step 8: Validate

Run:
- `pnpm run eval:list` — must succeed.
- `pnpm run eval -- --collect-only` — must succeed.
- `pnpm run eval:update --check` — must exit 0.
- Optional hygiene: `pnpm run eval:cleanup-vendored` (non–dry-run) once `ignore[]` ships in the host config removes orphan generated fixtures for upstream-only assets.

If any gate fails, report errors in your final output; if user decision is needed to retry, use `needs_user_input` — **never** `askQuestion`.

## Ignored / vendored targets

- `ignore` (`string[]`) lives in `.zoto/eval-system/config.yml` (template default `[]`). Entries are minimatch globs validated against POSIX repo-relative source paths (`eval-analyse.ts`/`eval-stamp.ts` honor them first).
- **Generation/skipping**: Any approved target whose canonical source hits a glob exits `eval-analyse` / `eval-stamp` cleanly with `{ ignored: true, matched_glob }` (`eval-stamp` never writes files for those primitives).
- **Cleanup**: Operators run `pnpm exec tsx scripts/eval-cleanup-vendored.ts` (supports `--dry-run`) to unlink generated-only (`_meta.generated === true` everywhere) skill/central JSON whose mapped source sits under ignored globs, then prune empty `evals/` directories. Mixed user/generated files raise `needs_user_input` rather than silently deleting anything.
- **Recommendation**: Repo-local upstream mirrors — e.g., everything under `crux-*` prefixes — should be enumerated in `ignore` so eval efforts focus on proprietary zoto assets.

## Conventions

- Never write outside `{evalsDir}/`, skill/plugin eval paths documented above, `.zoto/eval-system/`, `scripts/test.py`, `package.json`, and the repo-root `.env.example` (placeholder only — never `.env`).
- Every generated case gets a `_meta` marker with `generated: true`.
- `manifest.history.yml` is append-only.
- `.env.example` is **never** overwritten if it already exists — operators may have other env vars in there.
- `.env` itself is never written by this skill (and is gitignored at the repo root template); operators copy `.env.example` to `.env` themselves.

## What NOT to Do

- Do not modify code files in the host repo beyond scaffolding outputs.
- Do not overwrite user-authored eval cases — the template ships fresh files; the updater handles churn.
- Do not overwrite an existing `.env.example` — operators may have other env vars there. Surface a one-line note instead.
- Do not write `.env` itself, ever — that file is operator-managed and contains secrets.
- Do **not** call `askQuestion`.
