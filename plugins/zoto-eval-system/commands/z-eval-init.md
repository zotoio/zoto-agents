---
name: z-eval-init
description: Initialise the Eval System config at .zoto/eval-system/config.yml with a commented template of all defaults.
---

# z-eval-init

Scaffold a fresh `.zoto/eval-system/config.yml` for this repository. The generated file contains every supported key — **commented out** — alongside the value the plugin would otherwise apply internally. Uncomment any line(s) to override a default. This is the **first** command you run for the Eval System; everything else (workflow router, configure, create, execute, judge, update, compare, advise, help) requires this file to exist.

## Usage

```
/z-eval-init                  - Create .zoto/eval-system/config.yml from the init template (no-op if it already exists)
/z-eval-init --force          - Overwrite an existing config.yml with a fresh init template (DESTRUCTIVE)
```

## Instructions

1. Resolve the repository root from `$CURSOR_WORKING_DIRECTORY` (fall back to the current working directory if unset).
2. Invoke the plugin's `scripts/eval-init.ts` with `--repo-root <repoRoot>` and forward `--force` when the user passed it. This script:
   - reads `templates/init-config.yml` from the installed plugin and writes it verbatim to `<repoRoot>/.zoto/eval-system/config.yml` (idempotent: aborts unless `--force` when the file already exists);
   - calls `ensure-host-env-and-gitignore.ts` to stamp `.env.example`, repo-root `.gitignore`, and missing `README.md` / `AGENTS.md` (never writes `.env`; never overwrites existing root docs);
   - stamps lean eval-home runtime under `<repoRoot>/.zoto/eval-system/` (`package.json`, `scripts/eval-bridge.ts`, cache dirs, `.gitignore`) via `stamp-lean-layout.ts --skip-llm-harness`;
   - removes legacy root `scripts/eval-bridge.ts` and root `package.json` eval aliases if present;
   - runs **`pnpm install`** in `.zoto/eval-system/`, falling back to **`npm install`** when pnpm is unavailable or fails.
3. **Do not** write config or touch the filesystem yourself when `eval-init.ts` is available — delegate to it so init behaviour stays in one place.
4. Print a one-line confirmation that includes:
   - the absolute path of the new config file,
   - a reminder that all defaults are commented (so the file behaves identically to no-config until the user uncomments lines),
   - a pointer to `plugins/zoto-eval-system/templates/schema/config.schema.json` for the full reference,
   - a hint that `/z-eval-configure` is the next interactive step for users who prefer guided question-by-question setup,
   - a note that lean mode runs from `.zoto/eval-system/` (`pnpm -C .zoto/eval-system run eval` / `eval:full`) and resolves full runtime from the installed plugin (see README "Plugin vs host runtime layout"),
   - a reminder to copy `.env.example` → `.env` and set `CURSOR_API_KEY` before running LLM evals.
5. Do **not** spawn the configurer subagent and do **not** run any other Eval System command from this command — `init` is purely a scaffolding step (aside from the eval-home dependency install above).

## Failure modes

- **Plugin template missing** — surface a precise error (`templates/init-config.yml not found at <path>`); do not synthesize a fallback.
- **Destination exists without --force** — exit non-zero with the message `.zoto/eval-system/config.yml already exists; pass --force to overwrite`.
- **Filesystem permission denied** — surface the underlying OS error verbatim.

## Related

- `plugins/zoto-eval-system/templates/init-config.yml` — the canonical template
- `plugins/zoto-eval-system/templates/schema/config.schema.json` — JSON Schema used by the loader
- `/z-eval-configure` — guided interactive configuration that overwrites the same file via the `zoto-configure-evals` skill
- `/z-eval-start`, `/z-eval-jump`, `/z-eval-operator`, `/z-eval-workflow`, `/z-eval-create`, `/z-eval-execute`, `/z-eval-judge`, `/z-eval-update`, `/z-eval-compare`, `/z-eval-advise`, `/z-eval-help` — these all require `.zoto/eval-system/config.yml` to exist
