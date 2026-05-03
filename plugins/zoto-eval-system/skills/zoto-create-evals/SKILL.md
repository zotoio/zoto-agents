---
name: zoto-create-evals
description: Scaffolds static pytest and LLM (@cursor/sdk) eval backends into a host repository, generates skill-level eval cases with _meta.generated markers, merges eval scripts into package.json, and writes the persistent manifest plus append-only history. Use when the user runs /zoto-eval-create or when an eval-system backend is missing.
---

# Create Evals

Scaffolds a fresh dual-backend eval suite into any repository, discovers covered targets, generates eval cases with persistent `_meta` markers, and writes the manifest that future `/zoto-eval-update` invocations will diff against.

## Configuration

Reads `.zoto-eval-system/config.json`. If missing, hand off to `zoto-configure-evals` via `askQuestion`.

Writes:
- `{evalsDir}/` — pytest backend (from `templates/static/pytest/`).
- `{evalsDir}/_llm/` — LLM backend (from `templates/llm/agent-sdk/`).
- `skills/<x>/evals/evals.json` for every discovered skill (from `templates/skill-evals/evals.json.tmpl`).
- `.zoto-eval-system/manifest.yml` — current state.
- `.zoto-eval-system/manifest.history.yml` — append-only snapshot.
- Updates to the host repo's `package.json` via `scripts/package-json-merger.ts`.

## When to Use

- `/zoto-eval-create` invoked.
- No `{evalsDir}/` exists yet.
- `manifest.yml` is missing.

## Workflow

### Step 1: Load config

Read `.zoto-eval-system/config.json`. If missing, use `askQuestion` to ask whether to hand off to `/zoto-eval-configure` now. If the user declines, abort with a short note.

### Step 2: Discover targets

Spawn an `explore` subagent and run `scripts/eval-discover.ts`. This produces a manifest-shaped payload — the list of covered targets (skills, commands, agents, hooks, optionally cli/lib) with content hashes and public-surface metadata.

### Step 3: Review with the user

Via `askQuestion`, present the discovered targets as a checklist. Default: all checked. The user can uncheck targets to exclude them from scaffolding. Do not proceed until the user confirms.

### Step 4: Stamp both backends

For every invocation, ALWAYS stamp both backends (no opt-out):

- Static: copy `templates/static/pytest/*` to `{evalsDir}/`.
- LLM: copy `templates/llm/agent-sdk/*` to `{evalsDir}/_llm/`.
- Copy `templates/runner/test.py.tmpl` to `scripts/test.py`.
- Copy `templates/schema/result.schema.json` to `{evalsDir}/_llm/result.schema.json`.

For each approved skill, stamp `templates/skill-evals/evals.json.tmpl` into `skills/<x>/evals/evals.json`, substituting:

- `{{SKILL_NAME}}` — skill name.
- `{{PROMPT_A}}`, `{{PROMPT_B}}` — generated prompts based on SKILL.md frontmatter.
- `{{SOURCE_HASH}}` — sha256 of the normalised skill content at generation time.
- `{{LAST_UPDATED}}` — ISO-8601 timestamp.

Every generated case carries:

```yaml
_meta:
  generated: true
  source_hash: <sha256>
  last_updated: <ISO 8601>
  generated_by: "zoto-create-evals"
```

### Step 5: Merge package.json

Run `scripts/package-json-merger.ts` on the host repo's `package.json`. It imports the scripts block from `templates/package-scripts/base.json` idempotently and merges dev-dependencies (existing versions win unless `--force`).

### Step 6: Manual checklists

If `config.manualChecklists.enabled` is true, copy `templates/user-checklists/USER_EVAL_CHECKLISTS.md.tmpl` to `{evalsDir}/USER_EVAL_CHECKLISTS.md`.

### Step 7: Write manifests

Write `.zoto-eval-system/manifest.yml`:

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

Append the exact same document to `.zoto-eval-system/manifest.history.yml` (append-only; never rewrite).

### Step 8: Validate

Run:
- `pnpm run eval:list` — must succeed.
- `pnpm run eval -- --collect-only` — must succeed.
- `pnpm run eval:update --check` — must exit 0.

If any gate fails, surface the error via `askQuestion` and offer to re-scaffold.

## Conventions

- Never write outside `{evalsDir}/`, `skills/<x>/evals/`, `.zoto-eval-system/`, `scripts/test.py`, and `package.json`.
- Every case gets a `_meta` marker with `generated: true`.
- `manifest.history.yml` is append-only.

## What NOT to Do

- Do not modify code files in the host repo.
- Do not overwrite user-authored eval cases — the template ships fresh files; the updater handles churn.
- Do not skip askQuestion.
