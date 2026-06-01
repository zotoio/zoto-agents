---
name: zoto-create-evals
description: Scaffolds static pytest and LLM (@cursor/sdk) eval backends into a host repository, generates eval cases with _meta.generated markers for approved skills/commands/agents/hooks, merges eval scripts into package.json, and writes the persistent manifest plus append-only history. Expects the invoking command to pre-collect approved targets — does not call askQuestion.
---

# Create Evals

Scaffolds a fresh dual-backend eval suite into any repository, discovers covered targets, generates eval cases with persistent `_meta` markers, and writes the manifest that future `/z-eval-update` invocations will diff against.

## Configuration

Reads `.zoto/eval-system/config.yml`. If missing, return `needs_user_input` so `/z-eval-create` can hand off to `/z-eval-configure` — **do not** call `askQuestion`.

### Configuration honoured (v2)

Stamping selects the static backend using **`static.framework`** (`pytest` | `vitest` | `jest`). The LLM backend is JSON-first: every approved non-skill primitive is stamped as a co-located `<kind>/evals/<name>.json` file discovered by the Vitest JSON loader plugin in `evals/vitest.config.ts`. Skills retain `skills/<name>/evals/evals.json` per the Cursor Agent Skills spec. Operators edit `static.framework` in `.zoto/eval-system/config.yml` (via `/z-eval-configure`); flipping it is cleanup work, not silent drift.

Writes:
- `.zoto/eval-system/` — **lean (default)**: repo-specific assets (`manifest.yml`, `manifest.history.yml`, `cache/`, `.gitignore`, nested `package.json`, `scripts/eval-bridge.ts`). Engine, scripts, and templates resolve from the installed plugin at runtime via the bridge. **Ejected** hosts (opt-in via `pnpm run eval:stamp-host-layout`) additionally carry vendored `src/`, `templates/`, `engine/`, `scripts/`, and the full nested script contract from `templates/host-package/package.json`.
- `.zoto/eval-system/scripts/eval-bridge.ts` (stamped from `templates/runner/eval-bridge.ts.tmpl` when missing) — cross-platform wrapper that loads `<repoRoot>/.env` then calls `resolvePluginRoot()` and execs plugin scripts via `tsx` (no shell interpolation).
- Nested `.zoto/eval-system/package.json` with `eval` / `eval:full` bridge aliases; root `package.json` may gain `pnpm -C .zoto/eval-system run eval` delegates plus Vitest harness devDeps via `lean-root-vitest.json`.

`.env.example` and `.gitignore` are handled by `pnpm run eval:ensure-host` (plugin `ensure-host-env-and-gitignore.ts` via the bridge). It returns a JSON report describing the actions taken (`created` / `skipped-existing` / `appended` / `no-change`) so the agent can surface them in the final report.

## When to Use

- `/z-eval-create` invoked.
- No `.zoto/eval-system/evals/` exists yet (legacy hosts may still have root `{evalsDir}/` — run `migrate-host-layout-v3.ts --apply` first).
- `manifest.yml` is missing under `.zoto/eval-system/`.

## Workflow

### Step 1: Load config

Read `.zoto/eval-system/config.yml`. If missing, end with `needs_user_input` describing that configure must run first — do not prompt interactively.

### Step 2: Discover targets

Spawn an `explore` subagent and run ``pnpm run eval:discover``. This produces a manifest-shaped payload — the list of covered targets (skills, commands, agents, hooks, optionally cli/lib) with content hashes and public-surface metadata.

### Step 3: Approved targets + ignore filtering (command-pre-collected)

The **`/z-eval-create` command** presents checklists via `askQuestion` **before** spawning this workflow (default: all discovered per kind). The Task prompt MUST enumerate approved IDs — treat them as authoritative.

Immediately filter that list against `config.ignore`: map each retained ID to its canonical source (`SKILL.md`, `commands/<name>.md`, `agents/<name>.md`, `hooks.json`, …) and drop any path whose POSIX repo-relative form matches a minimatch entry (same rules as `eval-analyse.ts` / `eval-stamp.ts`). **Do not** run `pnpm run eval:analyse --` / `eval-stamp.ts` for excluded IDs; tooling will exit cleanly with `{ ignored: true }` if invoked accidentally.

Run `pnpm exec tsx plugins/zoto-eval-system/scripts/eval-cleanup-vendored.ts` after host operators populate `ignore` so legacy generated-only eval JSON for upstream bundles (typically `crux-*`) disappears (see Ignored section).

### Step 4: Stamp lean host layout + backend templates

Run once per host (idempotent):

```bash
pnpm exec tsx plugins/zoto-eval-system/scripts/stamp-lean-layout.ts --repo-root <host>
```

This is the **default** create path. It materialises repo-specific assets under `.zoto/eval-system/` (`cache/`, `.gitignore`, nested `package.json`, `scripts/eval-bridge.ts`), `evals/_runs/.gitkeep`, and optional root `package.json` delegates. It **does not** call `stamp-host-layout.ts` — that CLI is eject-only.

For a **self-contained ejected runtime** (opt-in), operators run `pnpm run eval:stamp-host-layout` separately (see `/z-eval-create` lean vs ejected table).

Every invocation ALWAYS stamps both backends (no opt‑out):

- Static: `pnpm run eval:baseline-stamp` (or `eval-stamp.ts --baseline-only`) copies baseline fixtures into the configured `evalsDir`.
- LLM harness: baseline stamp also lays down `evals/_llm/` harness files from plugin templates when present.
- Copy `templates/schema/result.schema.json` to `evals/_llm/result.schema.json` when needed.
- Run `pnpm run eval:ensure-host` from the repo root. It:
  - Copies `templates/env/.env.example.tmpl` to the **repo root** `.env.example` only if missing.
  - Ensures the host `.gitignore` covers `.env`.
  - Stamps repo-root `README.md` and `AGENTS.md` from `templates/host-package/*.tmpl` when missing.
  - Copies the multi-primitive scenario example to `{evalsDir}/scenarios/_example-multi-primitive.test.ts` when missing.

Skills still consume `skills/<name>/evals/evals.json` via **`templates/skill-evals/evals.json.tmpl`** inside each approved skill folder. **`eval-stamp.ts` refuses most `skill:*` ids** (exit code 2) — optional `pnpm run eval:analyse -- skill:<name>` supplies hints, then operators merge manually or copy the template. **Exception:** `skill:zoto-eval-tooling` is allowlisted (`CENTRAL_STAMP_SKILL_ALLOWLIST` in `eval-stamp.ts`, resolved from the plugin in lean mode or from `.zoto/eval-system/scripts/eval-stamp.ts` when ejected); refresh it with analyse then **`pnpm run eval:stamp -- skill:zoto-eval-tooling`** so rows come straight from the cached analyser payload.

### Step 4a: Analyse each approved central target & stamp fixtures

Repeat for **command/agent/hook** targets that survived the Step 3 ignore filter. For **`skill:zoto-eval-tooling` only**, also run analyse + stamp against that skill id using the same two commands below (other skills skip stamp and rely on the template workflow from Step 4).

```bash
pnpm run eval:analyse -- <target-id> [--pretty]
pnpm run eval:stamp -- <target-id> [--dry-run]
```

`target-id`: `command:<name>`, `agent:<slug>`, `hook:<plugin>`, **`hook:cursor-workspace`** for `.cursor/hooks.json` / `.cursor/hooks/hooks.json` (canonical id), or **`skill:zoto-eval-tooling`** when refreshing that allowlisted skill’s `evals/evals.json`. The legacy alias **`hook:cursor`** still resolves to the same bundle but prints a deprecation warning — prefer **`hook:cursor-workspace`** everywhere.

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

### Step 5: Root package.json aliases

Lean create merges `templates/host-package/lean-package.json` into `.zoto/eval-system/package.json` and `lean-root-vitest.json` into the repo root — nested `eval` / `eval:full` plus optional root `pnpm -C .zoto/eval-system` delegates. Full eval runtime dependencies and all other CLI entry points live in the **installed plugin**; ejected hosts get the full contract under `.zoto/eval-system/package.json`. For any other command in lean mode, invoke `tsx .zoto/eval-system/scripts/eval-bridge.ts <script-base> [-- args]` (e.g. `eval-discover`, `engine/update -- --check`). Run `pnpm install` in `.zoto/eval-system/` (and at repo root when root Vitest deps were merged). Document this in the final report.

### Step 6: Manual checklists

If `config.manualChecklists.enabled` is true, copy `templates/user-checklists/USER_EVAL_CHECKLISTS.md.tmpl` to `{evalsDir}/USER_EVAL_CHECKLISTS.md`.

### Step 7: Write manifests

Write `.zoto/eval-system/manifest.yml` (config key `update.manifestPath: manifest.yml` resolves relative to eval home):

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

Run from the repo root (lean mode resolves through `.zoto/eval-system/scripts/eval-bridge.ts`):
- `pnpm run eval -- --collect-only` — must succeed.
- `tsx .zoto/eval-system/scripts/eval-bridge.ts engine/runner -- --list` — must succeed.
- `tsx .zoto/eval-system/scripts/eval-bridge.ts engine/update -- --check` — must exit 0.
- Optional hygiene: `pnpm run eval:cleanup-vendored` (non–dry-run) once `ignore[]` ships in the host config removes orphan generated fixtures for upstream-only assets.

If any gate fails, report errors in your final output; if user decision is needed to retry, use `needs_user_input` — **never** `askQuestion`.

## Ignored / vendored targets

- `ignore` (`string[]`) lives in `.zoto/eval-system/config.yml` (template default `[]`). Entries are minimatch globs validated against POSIX repo-relative source paths (`eval-analyse.ts`/`eval-stamp.ts` honor them first).
- **Generation/skipping**: Any approved target whose canonical source hits a glob exits `eval-analyse` / `eval-stamp` cleanly with `{ ignored: true, matched_glob }` (`eval-stamp` never writes files for those primitives).
- **Cleanup**: Operators run `pnpm run eval:cleanup-vendored` (supports `--dry-run`) to unlink generated-only (`_meta.generated === true` everywhere) skill/central JSON whose mapped source sits under ignored globs, then prune empty `evals/` directories. Mixed user/generated files raise `needs_user_input` rather than silently deleting anything.
- **Recommendation**: Repo-local upstream mirrors — e.g., everything under `crux-*` prefixes — should be enumerated in `ignore` so eval efforts focus on proprietary zoto assets.

## Eject / un-eject (operator CLI)

This skill stamps **lean** layout only. Operators who need a self-contained runtime run **`pnpm run eval:stamp-host-layout`** after create (see README and `zoto-eval-tooling` skill). To reverse ejection without losing config, manifest, or eval cases, run **`pnpm run eval:un-eject`**. Both CLIs patch `hostLayout` in `config.yml` automatically.

## Conventions

- Never write outside `.zoto/eval-system/` except: co-located primitive eval JSON, root `package.json` eval delegates/devDeps (when merged), repo-root `.env.example`, and append-only `.gitignore` lines.
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
