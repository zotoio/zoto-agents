# Eval System

**Generate, run, and consciously update evals when AI primitives change — for any repository.**

The Eval System scaffolds two eval backends side by side: a **static** backend (pytest, vitest, or jest per `static.framework`) for fast, deterministic checks, and an **LLM backend** powered by `@cursor/sdk` for agent-based evaluations with soft metrics — tokens, duration, verbosity, accuracy, confidence. A diff-aware updater detects when covered targets have changed and presents each proposed eval update for user confirmation before writing — behavioural drift in AI primitives is managed consciously, never silently. User-authored cases stay sovereign — both runtime and compile-time guards refuse to touch them.

> **Note**: An earlier name for the continuous evaluation surface was `eval:live` / `_live`. The plugin now ships `eval:update` / `_update` throughout. The rename is complete everywhere except this single footnote.

## Overview

Use this plugin when you want to:

- Stand up an eval suite for a brand-new repo or an existing one, with no bespoke plumbing.
- Ensure eval cases for skills, agents, commands, and libraries stay aligned with the code they describe as it evolves.
- Gate CI on drift between code and evals (`pnpm run eval:update --check`).
- Compare runs across models, dates, or PRs using merged **`report.yml`** data and Cursor's built-in `/canvas` tool.

**Unified LLM backend**: A single LLM harness — `defineLlmEval` from [`evals/llm/_shared/run-llm-suite.ts`](../../evals/llm/_shared/run-llm-suite.ts) — drives every non-skill eval. Each command, agent, and hook stamps a co-located `<kind>/evals/<name>.json` file adjacent to its source; Vitest discovers it via the JSON loader plugin in [`evals/vitest.config.ts`](../../evals/vitest.config.ts). Skills are exempt and keep `skills/<name>/evals/evals.json` per the Cursor Agent Skills spec. See [Co-located eval layout](#co-located-eval-layout), [Eval formats](#eval-formats), and [Adding an eval as a plugin author](#adding-an-eval-as-a-plugin-author).

**User confirmation at every step**: When the updater detects drift or the configurer proposes a change, the user sees and approves each modification before it is written. Under the hood, slash commands own the interactive prompts and pass answers to subagents via a structured `needs_user_input` / resume contract (see `rules/zoto-eval-system.mdc` for the schema). This is an implementation detail of how Cursor subagents handle user input, not a standalone feature — the important thing is that **no generated eval is rewritten without explicit user consent**.

## Plugin vs host runtime layout

The eval-system runtime can live in **four** layers. Knowing which mode your repo uses removes nearly all path confusion.

| Layer | Location | Role | Who runs it |
|-------|----------|------|-------------|
| **Plugin package** (authoring / source of truth) | `plugins/zoto-eval-system/` — `scripts/`, `engine/`, `src/`, `templates/` | Canonical runtime shipped to the marketplace. `scripts/` is the **single source of truth** for every host eval CLI (`eval-analyse.ts`, `eval-stamp.ts`, `eval-orchestrate.ts`, `eval-discover.ts`, `eval-gc.ts`, …); scripts import only plugin-relative modules (`../src/…`, `../engine/…`). | Plugin authors / marketplace install |
| **Lean host** (**default**) | `.zoto/eval-system/` — repo-specific assets (`config.yml`, `manifest.yml`, `cache/`, `.gitignore`, nested `package.json`, `scripts/eval-bridge.ts`) plus `{evalsDir}/` and `{evalsDir}/_runs/` | What `/z-eval-create` materialises by default. Engine, scripts, and templates resolve from the **installed plugin** at runtime via `.zoto/eval-system/scripts/eval-bridge.ts` and `resolvePluginRoot()`. Nested `package.json` carries `eval` + `eval:full`; root `package.json` may delegate with `pnpm -C .zoto/eval-system run eval` (merged from `lean-root-vitest.json`). Other commands: `tsx .zoto/eval-system/scripts/eval-bridge.ts <script-base> [-- args]` from the repo root. | Host operators (recommended) |
| **Ejected host** (opt-in) | `.zoto/eval-system/` — vendored `scripts/`, `engine/`, `src/`, `templates/`, **full** nested `package.json`, plus the same repo-specific assets as lean | Self-contained copy created by `pnpm run eval:stamp-host-layout` (CLI only — not `/z-eval-create`). Root aliases delegate via `pnpm -C .zoto/eval-system …`; the nested package carries the full eval script + devDependency contract from `templates/host-package/package.json`. Eval primitives (agents, skills, commands) are copied to `.cursor/*/eval-sys/` (see [Ejected primitives layout](#ejected-primitives-layout)). | Host operators needing offline/air-gapped use, heavy engine customisation, or CI without plugin access |
| **Monorepo dogfood** | this repo's root `package.json` `eval:*` aliases | Contributor shortcut: root aliases invoke `plugins/zoto-eval-system/scripts/` and `engine/` directly (same canonical sources consumers reach through the bridge). Repo-root `scripts/` holds **only** monorepo CI/migration tooling — never the canonical host CLI. `hostLayout: plugin` in `.zoto/eval-system/config.yml`. | This repo's contributors / CI |

> **Canonical rule:** Prefer `pnpm run eval:*` aliases over hard-coded script paths (see [`skills/zoto-eval-tooling/SKILL.md`](skills/zoto-eval-tooling/SKILL.md)). In **lean** mode, `pnpm -C .zoto/eval-system run eval` (or root delegates) route through `.zoto/eval-system/scripts/eval-bridge.ts` → `resolvePluginRoot()` → plugin `scripts/<name>.ts`. In **ejected** mode, nested `eval:*` aliases run vendored `tsx scripts/<name>.ts` inside `.zoto/eval-system/`.

### Plugin resolution precedence

Lean mode (and the eject/un-eject CLIs) locate the plugin via `resolvePluginRoot()` in `src/paths.ts`. Precedence is fixed and tested:

1. **Monorepo** — `<repoRoot>/plugins/zoto-eval-system/` when that directory contains the plugin marker (`package.json` + `scripts/eval-discover.ts`).
2. **Environment** — `ZOTO_EVAL_PLUGIN_ROOT` (absolute or repo-relative path; same marker check).
3. **Cursor install** — platform-aware plugin directories (`~/.cursor/plugins/…/zoto-eval-system` on Unix/macOS; `%APPDATA%/Cursor/plugins/…` on Windows). When multiple candidates exist, the highest `package.json` semver wins; if semver is unavailable, the most recently modified directory wins.

If no candidate resolves, scripts fail with a clear error — set `ZOTO_EVAL_PLUGIN_ROOT` or install the plugin.

### Eject and un-eject (CLI only)

| Command | When to use | What it does |
|---------|-------------|--------------|
| `pnpm run eval:stamp-host-layout` | Opt into self-contained layout after lean create | Copies runtime (`src/`, `templates/`, `engine/`, `scripts/`) into `.zoto/eval-system/`, writes nested `package.json`, stamps eval primitives under `.cursor/*/eval-sys/`, sets `hostLayout: ejected` in `config.yml`. Does **not** replace config, manifest, or eval cases. Pass `--dry-run` to preview. |
| `pnpm run eval:un-eject` | Return to lean after a prior eject | Removes vendored runtime dirs and nested `package.json`, strips ejected primitives from `.cursor/`, sets `hostLayout: plugin`, re-merges root eval aliases from `templates/package-scripts/lean.json`. **Preserves** `config.yml`, `manifest.yml`, eval cases, and run history. Pass `--dry-run` to preview; `--force` skips confirmation. |

**When to eject:** offline or air-gapped environments, heavy customisation of engine/scripts, CI runners without Cursor plugin access.

**When to un-eject:** you no longer need a vendored copy and want plugin updates to flow automatically again.

There is no slash command for either operation — both are operator CLIs only.

### Ejected primitives layout

On eject, eval-system agents, skills, and commands are copied from the plugin into Cursor-native paths — **not** under `.zoto/eval-system/agents/`.

Default layout (Cursor IDE discovery):

```text
.cursor/
├── agents/eval-sys--<name>.md      # flat-prefix (default)
├── commands/eval-sys--<name>.md
└── skills/eval-sys--<name>/SKILL.md
```

Alternative nested layout (when flat-prefix is disabled):

```text
.cursor/
├── agents/eval-sys/<name>.md
├── commands/eval-sys/<name>.md
└── skills/eval-sys/<name>/SKILL.md
```

Un-eject removes these stamped primitives; the plugin originals remain the source of truth.

### Migration from ejected to lean

**External host repos** that previously ran full-stamp `/z-eval-create` (self-contained `.zoto/eval-system/` with vendored runtime) can return to lean mode without losing eval data:

```bash
pnpm run eval:un-eject          # preview with --dry-run first
pnpm install                    # refresh root devDeps merged by un-eject
```

This strips vendored runtime and `.cursor/*/eval-sys/` (or flat-prefix) primitives, sets `hostLayout: plugin`, and keeps `config.yml`, `manifest.yml`, eval cases, and `{evalsDir}/_runs/` intact. Ensure the **zoto-eval-system** plugin is installed (or set `ZOTO_EVAL_PLUGIN_ROOT`) before running eval commands again.

Fresh repos created after this change already use lean mode — no migration step required.

## Migration from current state

If your repository already used earlier Eval System scaffolding, adopt **eval-system v3** deliberately.

Breaking changes operators should expect:

1. **Dual-mode host layout (BREAKING).** `/z-eval-create` now materialises **lean** layout by default — only repo-specific assets under `.zoto/eval-system/`. Full self-contained runtime is opt-in via `pnpm run eval:stamp-host-layout`. Existing ejected hosts can return to lean with `pnpm run eval:un-eject` (see [Migration from ejected to lean](#migration-from-ejected-to-lean)).
2. Config fields added (with safe defaults), including `hostLayout: plugin | ejected`.
3. Output filename rename (`results.yml` → `llm.yml`, plus new `static.yml` and `report.yml`).
4. The earlier per-target backend selector under `llm.*` (and the matching framework knob) has been removed from `config.yml`. A single unified LLM backend stamps every non-skill primitive as a co-located `<kind>/evals/<name>.json` file; skills retain `skills/<name>/evals/evals.json` (Cursor Agent Skills spec). Repos created against the older `.test.ts` layout migrate via the monorepo-only one-shot `scripts/eval-migrate-ts-to-json.ts` at the repo root (not part of the host eval CLI). See [`CHANGELOG.md`](CHANGELOG.md) for the BREAKING entry and [Migration notes](#migration-notes) below.
5. Generated cases now embed `_meta.primitive_analysis`.
6. User-case preservation is hard-coded — no opt-out.

## Quick start

```bash
/z-eval-init        # one-time scaffold of .zoto/eval-system/config.yml (every key commented)
/z-eval-start       # optional: jump into evaluator lifecycle — delegates to the same router as /z-eval-workflow
/z-eval-jump        # optional: same delegation as /z-eval-start — explicit “jump” verb for runbooks
/z-eval-operator    # optional: operator/runbook entry — same delegation as /z-eval-start
/z-eval-workflow    # optional: canonical lifecycle router — picks the next slash command via askQuestion
/z-eval-configure   # optional: command-owned askQuestion — overwrites .zoto/eval-system/config.yml interactively
/z-eval-create      # scaffolds static + LLM backends, writes manifest.yml
/z-eval-update      # dry-run; confirms nothing drifted after create
/z-eval-execute     # host scripts; orchestrator writes static.yml, llm.yml, report.yml per run
/z-eval-judge       # adversarial coverage + soft-metric analysis
/z-eval-compare r1 r2  # cross-run analysis via /canvas (flows on report.yml)
/z-eval-advise      # pre-hoc coverage gap analysis and recommendations
/z-eval-help        # section-based help, loads this README
```

> All commands except `/z-eval-init` **fail loudly** when `.zoto/eval-system/config.yml` is missing — run `/z-eval-init` first.

## Configuration

Configuration lives at **`.zoto/eval-system/config.yml`** (the only supported path; earlier versions used `.zoto-eval-system/config.json` — that path is no longer supported). The file is validated against `templates/schema/config.schema.json`.

Every key in the shipped init template (`templates/init-config.yml`) is **commented out** alongside the value the plugin would otherwise apply internally — uncomment any line to override. Run `/z-eval-init` once per repository to drop the template into place; then either edit the YAML by hand or run `/z-eval-configure` for an interactive `askQuestion` flow that rewrites the file.

Key fields:

| Field | Purpose |
|-------|---------|
| `hostLayout` | Active layout mode: **`plugin`** (lean — default) resolves engine/scripts/templates from the installed plugin; **`ejected`** runs a self-contained copy under `.zoto/eval-system/`. Set automatically by `eval:stamp-host-layout` / `eval:un-eject`; override only when you know what you are doing. |
| `static.framework` | Static test harness the stamper targets: **`pytest`** (default shape from `templates/static/pytest/` or vitest/jest variants when configured). |
| `evalsDir` | Where static tests and the LLM harness scaffold are stamped. Default: `evals`. |
| `skillsRoots[]` | Glob roots the discoverer walks to find `SKILL.md` files. Default: `[".cursor/skills", "skills", "plugins/*/skills"]`. |
| `discoveryTargets[]` | Which kinds of artefacts to scaffold evals for: `skill`, `command`, `agent`, `hook`, `cli`, `lib`. |
| `llm.runtime` | `"tsx"` (default) or `"node"`. |
| `llm.model.id` | Default LLM model. One of `composer-2.5`, `claude-opus-4-8[]`, `sonnet`. |
| `judgeModel` | Model the judge skill uses for soft-metric scoring. |
| `manualChecklists.enabled` | Stamp `USER_EVAL_CHECKLISTS.md` on create. |
| `additionalAutomation[]` | Optional extras such as **`vitest`** / **`jest`** automation hooks stamped alongside the baseline static backend — **not** legacy `bats` (removed in eval-system v2; see `CHANGELOG.md`). Orphaned on-disk artefacts from predeployment templates may still be enumerated for manual cleanup — see [`subtask-03-eval-system-v2-cleanup-engine-20260503.md`](../../specs/20260503-eval-system-v2/subtask-03-eval-system-v2-cleanup-engine-20260503.md). |
| `update.criticalChangeRules.*` | Which kinds of drift are critical (fail `--check`). |
| `update.preserveUserAuthoredCases` | **Hard-coded `true`** — rejecting this is a validation error. |
| `update.writeMetaMarker` | **Hard-coded `true`** — rejecting this is a validation error. |

## File layout and run outputs

Each orchestrated run writes a timestamped folder `{evalsDir}/_runs/<ts>/` containing:

| File | Role |
|------|------|
| `static.yml` | Static-backend totals, per-case pass/fail, and backend-specific aggregates. |
| `llm.yml` | LLM-backend totals, soft metrics, per-case rows, and append-only overlays such as `drift:` or `judge:`. |
| `report.yml` | Merged rollup across both backends — primary input for `/z-eval-compare` and high-level CI summaries. Per-backend totals nest under `report.static` and `report.llm`. |

Per-case verbose logs remain at `{evalsDir}/_runs/<ts>/logs/<case>.log`.

## Run retention and cleanup

Run directories accumulate under `{evalsDir}/_runs/` and are **gitignored** — only the `.gitkeep` placeholder is tracked. The analyser cache at `.zoto/eval-system/cache/` is likewise gitignored.

| Setting | Default | Where |
|---------|---------|-------|
| `runs.retention` | **30** (most recent directories) | `.zoto/eval-system/config.yml` → `runs.retention` |

Override the default by uncommenting and editing the key in `.zoto/eval-system/config.yml`:

```yaml
runs:
  retention: 50   # keep the 50 most recent run directories
```

The schema lives at `templates/schema/config.schema.json` → `runs.retention`.

### Cleanup commands

| Script | Effect |
|--------|--------|
| `pnpm run eval:gc` | **Dry-run** — lists run directories that would be pruned. |
| `pnpm run eval:gc -- --apply` | **Apply** — deletes directories beyond the retention limit. |
| `pnpm run eval:cleanup-stale` | **Dry-run** — reports stale eval artefacts from `static.framework` switches (the only switch the cleanup engine now handles: vitest ↔ jest for the static side). |
| `pnpm run eval:cleanup-stale -- --apply` | **Apply** — removes stale framework-switch artefacts. |

> **Tip:** Never manually delete run directories. Always use `pnpm run eval:gc -- --apply`, which respects the configured retention limit.

## Lifecycle walk-through

### Install

Add the **zoto-eval-system** plugin to Cursor (marketplace or local dev install from this monorepo). No host-repo files change until you run `/z-eval-init`. Lean mode requires the plugin (or `ZOTO_EVAL_PLUGIN_ROOT`) at runtime.

### Configure

Run `/z-eval-configure` so the command can `askQuestion` through every field, emit a validated `cleanup_plan` when `static.framework` switches (vitest ↔ jest for the static side), and write `.zoto/eval-system/config.yml`. Authoritative workflow: [`skills/zoto-configure-evals/SKILL.md`](skills/zoto-configure-evals/SKILL.md).

### Create

Run `/z-eval-create` after configuration. It discovers targets, runs the LLM analyser per approved central primitive, and stamps the unified backends: the **static** suite (pytest/vitest/jest per `static.framework`) plus a co-located `<kind>/evals/<name>.json` per non-skill primitive (skills retain their `evals/evals.json`). **Lean layout only** — repo-specific assets under `.zoto/eval-system/` (including `scripts/eval-bridge.ts` and nested `package.json`), plus optional root `package.json` delegates. For self-contained runtime, run `pnpm run eval:stamp-host-layout` separately. The manifest is recorded at `.zoto/eval-system/manifest.yml`. Authoritative workflow: [`skills/zoto-create-evals/SKILL.md`](skills/zoto-create-evals/SKILL.md).

### Update

Run `/z-eval-update` (dry-run or `--apply`) to diff live targets against generated eval cases, re-invoke the analyser on drift, and stamp regenerated cases into the co-located `<kind>/evals/<name>.json` file while preserving user-authored cases (`_meta.generated !== true`). Authoritative workflow: [`skills/zoto-update-evals/SKILL.md`](skills/zoto-update-evals/SKILL.md).

### Execute

Run `/z-eval-execute` (optionally `--full` for LLM cases). The host `package.json` scripts invoke the orchestrator: the static backend runs first, then the unified LLM backend (Vitest discovers every `<kind>/evals/*.json` via the JSON loader plugin and any `evals/scenarios/*.test.ts` scenarios), producing **`static.yml`**, **`llm.yml`**, and **`report.yml`**, after which `eval:update --check` appends a warn-only drift line. Authoritative workflow: [`skills/zoto-execute-evals/SKILL.md`](skills/zoto-execute-evals/SKILL.md).

### Judge

Run `/z-eval-judge` on the latest run directory. The judge reads **`static.yml`**, **`llm.yml`**, and merged **`report.yml`** plus logs, then appends `judge:` into `llm.yml`. Authoritative workflow: [`skills/zoto-judge-evals/SKILL.md`](skills/zoto-judge-evals/SKILL.md).

### Compare

Run `/z-eval-compare` with two or more run ids. Comparison is driven by each run’s **`report.yml`** (per-backend rollups appear under `report.static` / `report.llm`). Authoritative workflow: [`skills/zoto-compare-evals/SKILL.md`](skills/zoto-compare-evals/SKILL.md).

## Plugin scaffolding

When `/zoto-create-plugin` scaffolds a new marketplace plugin, Step **6e — Classify and stamp evals** in [`.cursor/skills/zoto-create-plugin/SKILL.md`](../../.cursor/skills/zoto-create-plugin/SKILL.md) runs per eval-eligible component (agents, skills, commands, hooks):

1. **Analyse** — `pnpm run eval:analyse --target <component-source-path>`; the analyser emits `requiresInteraction` into `_meta.primitive_analysis`.
2. **Stamp** — every non-skill primitive gets a co-located `<kind>/evals/<name>.json` file with declarative cases (and optional `runner` cases). Skills get `skills/<name>/evals/evals.json` (Cursor Agent Skills spec). The same `requiresInteraction` flag controls whether the stamped case declares `interactions.answers` for the [AskQuestion bridge](#askquestion-bridge).
3. **Fallback** — when the analyser is unavailable, the stamper writes a single-case scaffold marked `_meta.classification_source: "fallback-default"` and prompts the operator to re-run `pnpm run eval:update --with-analyser` later.

## Static backend (pytest)

The default static layout is stamped from `templates/static/pytest/` when `static.framework` is **`pytest`**. Vitest/jest variants follow their respective template trees when configured.

- `conftest.py` — shared fixtures.
- `requirements.txt` — pytest, pyyaml, and friends.
- `per-primitive-test.py` — pattern for generated tests.
- `fixtures/` — keepalive directory.

Run it with `pnpm run eval` (host wiring typically invokes `python3 scripts/test.py` — see `templates/runner/test.py.tmpl`).

## LLM backend (@cursor/sdk)

Why `@cursor/sdk` and not the older February SDK: `@cursor/sdk ^1.0.12` is the supported, typed API for building agents and evaluations against Cursor's agent infrastructure. The older SDK package (`february`) is not used anywhere in this plugin.

The LLM backend is **a single unified harness** — there is no longer a per-target backend selector. Every non-skill primitive (command, agent, hook) stamps a co-located `<kind>/evals/<name>.json` file; Vitest discovers it through the JSON loader plugin in [`evals/vitest.config.ts`](../../evals/vitest.config.ts) (include glob `**/evals/*.json`). Skills keep `skills/<name>/evals/evals.json`. Advanced multi-turn flows can opt into TypeScript via a `runner` case (see [Advanced TS escape hatch](#advanced-ts-escape-hatch-runner-cases)) or a multi-primitive scenario under `evals/scenarios/`.

The shared engine modules under [`evals/llm/_shared/`](../../evals/llm/_shared/README.md) provide:

- `run-llm-suite.ts` — central harness; exports `defineLlmEval` + `LlmCaseDefinition`.
- `vitest-json-loader.ts` — Vitest plugin that synthesises in-memory test suites from co-located `.json` eval files.
- `runner-params.ts` — typed contract (`RunnerParams`, `RunnerFn`, `RunnerResult`) for the `runner` escape hatch.
- `sdk-bridge.ts` — sole direct `@cursor/sdk` wrapper; pins SDK version and token resolution.
- `askquestion-bridge.ts` — scripted AskQuestion simulation (`interactions.answers`).
- `graders/` — `contains`, `regex`, `tool-called`, `llm-judge`.
- `zoto-llm-reporter.ts` — writes canonical **`llm.yml`** + per-case logs.
- `_user-case-guards.ts` — `_meta.generated` predicates (file + case level).

The orchestrator stamp at `{evalsDir}/_llm/` still ships the runner shim, the surgical `update.ts` mirror, and the `/canvas` `compare.ts` hand-off for legacy skill-only declarative paths.

Model precedence at runtime:

1. `--model <id>` on the CLI.
2. `ZOTO_EVAL_MODEL` env var.
3. `config.llm.model.id` from `.zoto/eval-system/config.yml`.

### Environment variables (`.env` / `.env.example`)

`/z-eval-init` and `/z-eval-create` ensure the host repo has a `.env.example` placeholder, that repo-root `.gitignore` excludes `.env`, and that repo-root `README.md` / `AGENTS.md` exist (via `ensure-host-env-and-gitignore.ts` and `eval:ensure-host`). Templates live under `templates/host-package/`. The example env file contains `CURSOR_API_KEY=` (and a commented `ZOTO_EVAL_MODEL=`). Root docs and `.env.example` are **never overwritten** if they already exist.

`.zoto/eval-system/scripts/eval-bridge.ts` loads `<repoRoot>/.env` before every eval command, so values flow into `process.env` for orchestration, analysis, and LLM runs. Standard dotenv precedence applies — anything already exported in your shell wins over `.env`.

```bash
cp .env.example .env       # then edit .env locally; .env is gitignored
pnpm install               # root: tsx + dotenv only; plugin install carries eval runtime deps
pnpm run eval:full         # CURSOR_API_KEY is now sourced from .env
```

Never commit `.env`. `/z-eval-init` and `/z-eval-create` append `.env`, `.env.*`, and `!.env.example` to the repo-root `.gitignore` when those lines are missing.

## Co-located eval layout

Every non-skill primitive carries its LLM eval **next to its source** as `<kind>/evals/<name>.json`. Skills are exempt and continue to use the canonical Cursor Agent Skills layout.

```text
<repo>/
├── .cursor/                                 # central plugin primitives
│   ├── agents/
│   │   ├── zoto-plugin-manager.md
│   │   └── evals/
│   │       └── zoto-plugin-manager.json
│   ├── commands/
│   │   ├── zoto-create-plugin.md
│   │   └── evals/
│   │       └── zoto-create-plugin.json
│   └── hooks/
│       ├── hooks.json
│       └── evals/
│           └── hooks.json
├── plugins/
│   └── <plugin>/
│       ├── agents/
│       │   ├── <name>.md
│       │   └── evals/
│       │       └── <name>.json             # co-located JSON eval
│       ├── commands/
│       │   ├── <name>.md
│       │   └── evals/
│       │       └── <name>.json
│       ├── hooks/
│       │   ├── hooks.json
│       │   └── evals/
│       │       └── hooks.json
│       └── skills/
│           └── <name>/
│               ├── SKILL.md
│               └── evals/
│                   └── evals.json          # Skill exemption (see below)
└── evals/
    ├── vitest.config.ts                    # single repo-rooted config + JSON loader
    ├── scenarios/
    │   └── _example-multi-primitive.test.ts  # underscore-excluded example (opt-in)
    ├── llm/_shared/                        # unified LLM harness
    │   ├── run-llm-suite.ts                # exports defineLlmEval
    │   ├── vitest-json-loader.ts           # synthesises suites from .json
    │   ├── runner-params.ts                # RunnerParams / RunnerFn contract
    │   ├── llm-case.ts                     # LlmCaseDefinition
    │   ├── sdk-bridge.ts                   # sole @cursor/sdk wrapper
    │   ├── askquestion-bridge.ts           # scripted interactions
    │   ├── zoto-llm-reporter.ts            # writes llm.yml
    │   └── graders/
    ├── _llm/                               # legacy runner shim
    └── _runs/<ts>/                         # run outputs: static.yml, llm.yml, report.yml
```

Every co-located `<kind>/evals/<name>.json` file:

- Carries a top-level `_meta.generated: true` envelope when stamped by the eval system — the file-level user-authored gate enforced by `evals/llm/_shared/_user-case-guards.ts`.
- Declares a `target_id` and a `cases[]` array; cases that are **generated** carry `_meta.generated: true`, cases that are **user-authored** simply omit the marker (the updater preserves them verbatim forever).
- May include optional `runner` cases that point at a sibling `.test.ts` file for flows that exceed declarative grading (see [Eval formats](#eval-formats)).

> **Skills are exempt from co-location.** Per the Cursor Agent Skills spec ([evaluating-skills.mdx#L20](https://github.com/agentskills/agentskills/blob/5d4c1fda3f786fff826c7f56b6cb3341e7f3a911/docs/skill-creation/evaluating-skills.mdx#L20)), every skill keeps its evals at `skills/<name>/evals/evals.json`. The eval system never adds a JSON sidecar adjacent to a skill `evals.json`, and `skills-ref validate` continues to gate every skill's eval shape.

### AskQuestion bridge

Commands such as `/z-eval-configure` and `/z-eval-judge` use Cursor's **`askQuestion`** tool for operator-driven user input. Subagents never call `askQuestion` directly — they return `needs_user_input` and the command resumes with pre-collected answers (see [Overview](#overview)).

**Eval-time simulation** is separate: LLM evals for interactive primitives must supply scripted user answers without a human in the loop. The bridge at [`evals/llm/_shared/askquestion-bridge.ts`](../../evals/llm/_shared/askquestion-bridge.ts) wraps `sdk-bridge.ts` to replay scripted turns via `agent.send()` (synthetic interaction style on `@cursor/sdk` 1.0.12). SDK surface and limitations are documented in [`specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-askquestion-adr.md`](../../specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-askquestion-adr.md).

Interactive cases declare scripted answers in JSON:

```json
"interactions": {
  "questions": ["Which framework?"],
  "answers": ["pytest"]
}
```

Answer precedence: `interactions.answers` → legacy `follow_ups[]` → single-prompt case. The unified harness (`run-llm-suite.ts`) resolves the interaction plan and invokes `runCaseWithScriptedAnswers` automatically.

The JSON loader synthesises Vitest suites at runtime — runner `.test.ts` files import only from `evals/llm/_shared/*` — never from `@cursor/sdk` directly except through `sdk-bridge.ts`. Module catalogue: [`evals/llm/_shared/README.md`](../../evals/llm/_shared/README.md).

## Eval formats

Non-skill LLM evals are **JSON-first**. Each co-located `<kind>/evals/<name>.json` file declares a `target_id`, optional file-level `_meta`, and a `cases[]` array. Two case shapes are supported:

| Case type | When to use | Key fields |
|-----------|-------------|------------|
| **Declarative** | Single-prompt flows with assertion-based grading | `prompt`, `assertions[]`, optional `interactions`, `follow_ups[]` |
| **Runner** | Multi-step logic, custom graders, or side-effect checks that exceed declarative JSON | `runner` (relative `.test.ts` path), optional `parameters` |

Declarative cases are the default — the stamper emits them from the LLM analyser payload. Runner cases opt into TypeScript only when the declarative shape is insufficient.

### Advanced TS escape hatch (`runner` cases)

Use a `runner` case when a flow needs imperative setup, multi-turn orchestration inside one case, or assertions the declarative graders cannot express. The JSON case points at a sibling `.test.ts` file whose **default export** implements `RunnerFn`:

```typescript
// evals/llm/_shared/runner-params.ts
export interface RunnerParams {
  targetId: string;
  caseId: string;
  parameters: Record<string, unknown>;
  context: RunnerContext;  // sdk bridge, sandbox, expect, agentFactory, …
}

export type RunnerFn = (params: RunnerParams) => Promise<RunnerResult>;
```

JSON case shape:

```json
{
  "id": "complex-flow",
  "runner": "./complex-flow.test.ts",
  "parameters": { "scenarioVariant": "happy-path" }
}
```

Matching runner file outline:

```typescript
// complex-flow.test.ts — sibling to the JSON eval file
import type { RunnerFn } from "../../../evals/llm/_shared/runner-params.js";

const run: RunnerFn = async ({ parameters, context }) => {
  const { agentFactory, expect } = context;
  const agent = await agentFactory({ cwd: process.cwd() });
  // … drive the flow, assert side-effects …
  return { passed: true, reason: "happy-path completed" };
};

export default run;
```

The harness resolves `runner` relative to the JSON file's directory, dynamically imports the module, and passes a fully-populated `RunnerParams`. The JSON-Schema mirror lives at `templates/schema/runner-params.schema.json`.

### Multi-primitive scenarios

When a flow spans **multiple primitives** (command A → agent B → filesystem side-effect), author a scenario under `evals/scenarios/<scenario-name>.test.ts`. Scenarios are plain Vitest TypeScript files discovered by the `evals/scenarios/*.test.ts` include glob in `evals/vitest.config.ts`.

`/z-eval-create` copies an underscore-prefixed example to `evals/scenarios/_example-multi-primitive.test.ts` via `pnpm run eval:ensure-host` — in **lean** mode the bridge routes to the plugin's `scripts/eval-ensure-host.ts`; in **ejected** mode the vendored script runs from `.zoto/eval-system/scripts/eval-ensure-host.ts`. The leading underscore matches the `evals/scenarios/_*` exclude entry — the example is present but skipped until you rename it (drop the underscore) or copy its contents into a new scenario file. See `plugins/zoto-eval-system/templates/scenarios/_example-multi-primitive.test.ts.tmpl` for the canonical walkthrough.

Scenarios carry `// _meta.generated: false` on line 1 — the updater never rewrites them.

### Migration notes

As of **2026-05-27**, all non-skill primitive evals are stored as `.json` instead of co-located `.test.ts` files. The standalone `eval:llm` script is removed; the unified `evals/vitest.config.ts` discovers JSON evals via the JSON loader plugin and scenarios via the `evals/scenarios/*.test.ts` glob. In this monorepo only, run `pnpm exec tsx scripts/eval-migrate-ts-to-json.ts` idempotently to convert any remaining `.test.ts` LLM evals (repo-root CI/migration tooling — not shipped under `.zoto/eval-system/`). See [`CHANGELOG.md`](CHANGELOG.md) for the full BREAKING entry.

## Adding an eval as a plugin author

The post-restructure flow for adding a new eval to an existing plugin component:

1. **Drop your primitive.** Author the new command MD (`plugins/<plugin>/commands/<name>.md`), agent MD (`plugins/<plugin>/agents/<name>.md`), or hook JSON (`plugins/<plugin>/hooks/hooks.json`).
2. **Run the stamp flow.** From a Cursor agent, invoke `/z-eval-create` to scaffold the eval for the new primitive. From a shell, the equivalent direct call is `pnpm run eval:stamp -- <kind>:<name>` (see [`skills/zoto-eval-tooling/SKILL.md`](skills/zoto-eval-tooling/SKILL.md) for the full alias reference — never hard-code script paths).
3. **A co-located JSON eval appears.** The stamper writes `plugins/<plugin>/<kind>/evals/<name>.json` carrying:
   - Top-level `_meta.generated: true` envelope
   - A `target_id` matching the primitive
   - One or more declarative `cases[]` rows with `_meta.generated: true` and the analyser payload at `_meta.primitive_analysis`
4. **Edit cases by hand only when you need to override the generated content.** User-authored cases simply omit `_meta.generated` (or carry `_meta.generated: false`). The updater preserves any case with `_meta.generated !== true` verbatim, forever. For advanced flows, add a `runner` case or a scenario under `evals/scenarios/` (see [Eval formats](#eval-formats)).

Run `/z-eval-update --check` to confirm the new file has no drift; run `/z-eval-execute --full` (with `CURSOR_API_KEY` set) to exercise the LLM backend.

> **Tip:** Need to add an eval for a **skill** instead? Drop or edit cases in `plugins/<plugin>/skills/<name>/evals/evals.json`. The eval system never writes a TS sidecar for skills.

## Updating evals when code changes

> This is the core value-add of this plugin — behavioural drift in AI primitives is surfaced explicitly, and every eval update requires user confirmation. Generated evals stay honest, user-authored evals stay sovereign.

### When to run `/z-eval-update`

- Immediately after `/z-eval-create` — it should no-op.
- After any edit to a covered target (skill body, agent body, command, library export, hook script).
- In CI — use `pnpm run eval:update --check` as a gate (see CI integration).

### Targeted vs rediscovery modes

| Invocation | Mode | Interactive? | Writes? |
|------------|------|--------------|---------|
| `/z-eval-update` | rediscovery dry-run | no | no |
| `/z-eval-update --apply` | rediscovery apply | yes — command issues `askQuestion` per change (subagent returns patches; no subagent `askQuestion`) | yes |
| `/z-eval-update <file-or-glob>` | targeted dry-run | no | no |
| `/z-eval-update <file-or-glob> --apply` | targeted apply | yes | yes |
| `pnpm run eval:update --check` | CI check | no | no |

Rediscovery uses `manifest.discovery_config` (a deep snapshot of the discovery config at last-create-or-update), not the current `config.yml`. This prevents config edits from masquerading as code drift. Apply-mode stamping regenerates the co-located `<kind>/evals/<name>.json` (or the skill's `evals.json`) in place — `requiresInteraction` from the latest analyser payload controls whether the regenerated cases include `interactions.answers`, but the file path is stable.

### The `_meta.generated` contract

Every generated eval case carries `_meta`:

```yaml
_meta:
  generated: true
  source_hash: <sha256 of the target's normalised content at generation time>
  last_updated: <ISO 8601 timestamp>
  generated_by: "zoto-create-evals" | "zoto-update-evals"
```

- A case **without** `_meta`, or with `_meta.generated === false`, is **user-authored**.
- The updater **never** modifies user-authored cases. It flags them for "may need review" and moves on.
- The validator rejects any `update.ts` source that does not enforce this guard at compile time (via a literal-string check for `_meta?.generated === true`).

### Critical-change rubric

| Change | Classification | Reason |
|--------|---------------|--------|
| Added target with no eval coverage | critical | New surface area is untested. |
| Removed target with active generated cases | critical | Dangling cases would pass vacuously. |
| Skill frontmatter `name` or `description` changed | critical | Triggering and retrieval depend on these. |
| Public-surface change on a covered target | critical | The thing being tested behaves differently. |
| Prompt template change | critical | Generated prompts cite the template. |
| Comment-only / whitespace-only change | non-critical | No behaviour change. |
| Internal symbol change (not in public surface) | non-critical | Out of scope for covered behaviour. |

### `--check` mode for CI

Exits `0` when no critical drift is detected, and exits `2` (matching `config.update.checkExitCodeOnCriticalDrift`) otherwise. Structured diff goes to stdout / stderr as JSON-line reports, to stay greppable.

### `manifest.yml` + `manifest.history.yml`

- `.zoto/eval-system/manifest.yml` — current state. Validated against `templates/schema/manifest.schema.json`.
- `.zoto/eval-system/manifest.history.yml` — append-only list of full manifest snapshots. One entry per create / update, keyed by `git_ref` and `updated_at`.

Example:

```yaml
schema_version: 1
created_at: 2026-05-03T05:19:00Z
updated_at: 2026-05-03T05:19:00Z
git_ref: abc1234...def
generated_by: zoto-create-evals
discovery_config:
  evalsDir: evals
  skillsRoots: [.cursor/skills, skills]
  discoveryTargets: [skill, command, agent, hook]
  additionalAutomation: []
targets:
  - id: skill:zoto-create-spec
    kind: skill
    path: plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md
    content_hash: 9f8e...a12
    public_surface:
      frontmatter: { name: zoto-create-spec, description: "Guided..." }
      tools: []
    eval_files:
      - plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json
```

## Result schema

Per-backend YAML snapshots (`static.yml`, `llm.yml`) and the merged `report.yml` validate against `templates/schema/result.schema.json` (or backend-specific segments embedded by the orchestrator). The example below illustrates the LLM-shaped aggregate still written into `llm.yml`:

Example:

```yaml
schema_version: 1
run_id: 20260503-051900
started_at: 2026-05-03T05:19:00Z
ended_at: 2026-05-03T05:19:42Z
totals:
  cases: 14
  passed: 12
  failed: 2
aggregates:
  tokens_total: 48231
  duration_ms_total: 42017
  verbosity_avg: 0.41
  accuracy_avg: 0.86
  confidence_avg: 0.72
cases:
  - id: zoto-create-spec/1
    status: passed
    tokens: 3182
    duration_ms: 2710
    verbosity: 0.38
    accuracy: 0.92
    confidence: 0.81
  - id: zoto-help-evals/2
    status: passed
```

## Run logs

Verbose per-case logs land at `{evalsDir}/_runs/<run-id>/logs/<case>.log`. Each log contains: final prompt, full response, grader verdicts, tool-call trace, and any soft-metric deltas.

## Comparing runs (`/canvas` hand-off)

`/z-eval-compare <run-1> <run-2> [<run-N>]`:

1. Locates each run’s **`report.yml`** under `{evalsDir}/_runs/<ts>/` (per-backend totals nest under `report.static` / `report.llm`).
2. Emits a flat dataset (`runs × cases × dimensions`) plus the `templates/canvas/compare-prompt.md.tmpl` instruction.
3. Hands the instruction to the host agent, which invokes Cursor's built-in `/canvas` tool.
4. Drilldown: clicking a data point opens `{evalsDir}/_runs/<run>/logs/<case>.log`.

The skill never renders charts itself. The canvas tool decides layout.

## Judge & soft metrics

`/z-eval-judge` runs the `zoto-eval-judge` agent over the latest run. It:

- Reads **`static.yml`**, **`llm.yml`**, and merged **`report.yml`**, plus per-case logs.
- Looks for under-covered assertions.
- Flags weak graders (e.g. `contains` where `regex` would be stricter).
- Computes soft-metric anomalies (verbosity spikes, confidence drops).
- Appends `judge:` into **`llm.yml`**.
- The **`/z-eval-judge` command** offers, via `askQuestion`, to run `/z-eval-update` on the affected skills (the judge subagent/skill does not call `askQuestion` directly).

## Adviser — pre-hoc coverage gap analysis

`/z-eval-judge` tells you how a completed run performed; **`/z-eval-advise`** tells you what tests are missing *before* you run anything. The adviser reads source definitions and eval files — never run artefacts — and scores the suite across five dimensions:

| Dimension | What it checks |
|-----------|---------------|
| **Trigger-phrase coverage** | Do eval prompts exercise the trigger phrases declared in `SKILL.md`? |
| **Schema validation** | Do assertions validate output structure contracts (e.g. `needs_user_input` shape)? |
| **Regression baselines** | Is the grader mix strong enough for regression detection? |
| **Citation verification** | Do citation-producing targets have citation assertions? |
| **Checklist completeness** | Do spec-executing targets verify checklist completion? |

### Usage

```
/z-eval-advise                      # full scan — scope picker via askQuestion
/z-eval-advise <plugin-name>        # scope to a specific plugin
/z-eval-advise <skill-name>         # scope to a specific skill
```

### Interactive flow

The command drives a multi-turn interaction with two breakpoints:

1. **Summary drill-down** — the adviser presents per-dimension severity scores (ok / warn / critical). You choose which dimensions to drill into, or skip straight to recommendations.
2. **Action recommendations** — the adviser returns deterministic recommendations, each mapped to either `/z-eval-create` (no eval file exists) or `/z-eval-update --target <glob> --apply` (existing evals need strengthening). You accept all, walk each individually, or skip.

Accepted recommendations are handed off to the target commands automatically — the adviser never modifies files itself.

### Adviser vs Judge

| | Adviser (`/z-eval-advise`) | Judge (`/z-eval-judge`) |
|---|---|---|
| **When** | Before running | After a completed run |
| **Reads** | Source definitions + eval files | Run artefacts (`llm.yml`, logs) |
| **Answers** | "What tests are missing?" | "How did the tests perform?" |
| **Output** | Gap report + create/update recommendations | Soft-metric annotations in `llm.yml` |

## Manual checklists

When `manualChecklists.enabled` is true, `/z-eval-create` stamps `USER_EVAL_CHECKLISTS.md` — a harvested pattern from the CRUX-Compress reference. Scenario stubs go under `templates/user-checklists/scenario.md.tmpl`.

## CI integration

```yaml
# Example GitHub Actions gate
- run: pnpm install
- run: pnpm run eval:update --check   # exits 2 on critical drift
- run: pnpm run eval                  # static
- if: env.CURSOR_API_KEY != ''
  run: pnpm run eval:full             # LLM — may run declarative + code backends
  env:
    CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
```

`eval:full` orchestrates the static suite (per `static.framework`) plus the unified LLM backend through the single repo-rooted Vitest config; there are no per-backend collect scripts to wire separately.

The LLM backend is always gated on `--full` + `CURSOR_API_KEY`. It never self-runs.

## Troubleshooting

- **"Run /z-eval-create first."** — `.zoto/eval-system/manifest.yml` is missing; the updater has nothing to diff against.
- **`eval:update --check` keeps returning 2** — a target changed its public surface; either update the target's eval cases interactively or accept the drift via `/z-eval-update --apply`.
- **User-authored case got edited** — impossible by design. If it ever happens, it's a bug; the validator and runtime both guard against it. File an issue.
- **Config change triggered drift** — it shouldn't. Rediscovery uses the snapshot in `manifest.discovery_config`. To commit a config change, re-run `/z-eval-create`.
- **`@cursor/sdk` module not found** — run `pnpm install` at the repo root after `/z-eval-create` or `/z-eval-init` to pick up merged devDeps.
- **Cannot resolve zoto-eval-system plugin** — install the plugin, set `ZOTO_EVAL_PLUGIN_ROOT`, or (in this monorepo) ensure `plugins/zoto-eval-system/` exists. Lean mode cannot run without a resolvable plugin.
- **A co-located `<kind>/evals/<name>.json` is missing** — re-run `/z-eval-create` (or `pnpm run eval:stamp -- <id>`). The stamper writes only the missing file; existing user-authored cases in sibling primitives are untouched.

## Development

Shared LLM-harness helpers live at [`evals/llm/_shared/README.md`](../../evals/llm/_shared/README.md).

Compile the hook:

```bash
pnpm build
```

Run tests:

```bash
pnpm test
```

Run plugin validation:

```bash
pnpm validate
```

Install locally for Cursor:

```bash
pnpm install-local
```

## License

MIT — see [`LICENSE`](LICENSE).
