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

**User confirmation at every step**: When the updater detects drift or the configurer proposes a change, the user sees and approves each modification before it is written. Under the hood, slash commands own the interactive prompts and pass answers to subagents via a structured `needs_user_input` / resume contract (see `rules/zoto-eval-system.mdc` for the schema). This is an implementation detail of how Cursor subagents handle user input, not a standalone feature — the important thing is that **no generated eval is rewritten without explicit user consent**.

## Migration from current state

If your repository already used earlier Eval System scaffolding (heuristic discovery, shape-test-heavy pytest suites, or the old single-file `results.yml` layout), adopt **eval-system v2** deliberately — there is no separate “released v1” product line to upgrade from.

Breaking changes operators should expect:

1. Config fields added (with safe defaults).
2. Output filename rename (`results.yml` → `llm.yml`, plus new `static.yml` and `report.yml`).
3. Framework and strategy are now mutually exclusive — switching requires `/z-eval-configure`.
4. Generated cases now embed `_meta.primitive_analysis`.
5. User-case preservation is hard-coded — no opt-out.

## Quick start

```bash
/z-eval-init        # one-time scaffold of .zoto/eval-system/config.yml (every key commented)
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
| `static.framework` | Static test harness the stamper targets: **`pytest`** (default shape from `templates/static/pytest/` or vitest/jest variants when configured). |
| `llm.strategy` | How LLM eval cases are authored: **`code`** (executable harness aligned with `llm.codeFramework`) or **`declarative`** (enriched declarative payloads). Mutually exclusive with changing `static.framework` without running `/z-eval-configure` cleanup semantics. |
| `llm.codeFramework` | When `llm.strategy` is **`code`**, selects **`vitest`** or **`jest`** for the stamped LLM reporter/harness scaffolding. |
| `evalsDir` | Where static tests and the `_llm/` backend are stamped. Default: `evals`. |
| `skillsRoots[]` | Glob roots the discoverer walks to find `SKILL.md` files. Default: `[".cursor/skills", "skills", "plugins/*/skills"]`. |
| `discoveryTargets[]` | Which kinds of artefacts to scaffold evals for: `skill`, `command`, `agent`, `hook`, `cli`, `lib`. |
| `llm.runtime` | `"tsx"` (default) or `"node"`. |
| `llm.model.id` | Default LLM model. One of `composer-2`, `opus-4.6`, `sonnet`. |
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
| `report.yml` | Merged rollup across both backends — primary input for `/z-eval-compare` and high-level CI summaries. |

Per-case verbose logs remain at `{evalsDir}/_runs/<ts>/logs/<case>.log`.

## Lifecycle walk-through

### Install

Add the **zoto-eval-system** plugin to Cursor (marketplace or local dev install from this monorepo). No host-repo files change until you run `/z-eval-configure`.

### Configure

Run `/z-eval-configure` so the command can `askQuestion` through every field, emit a validated `cleanup_plan` when framework/strategy switches, and write `.zoto/eval-system/config.yml`. Authoritative workflow: [`skills/zoto-configure-evals/SKILL.md`](skills/zoto-configure-evals/SKILL.md).

### Create

Run `/z-eval-create` after configuration. It discovers targets, runs the LLM analyser per approved central primitive, stamps **both** static and LLM backends, and records `manifest.yml`. Authoritative workflow: [`skills/zoto-create-evals/SKILL.md`](skills/zoto-create-evals/SKILL.md).

### Update

Run `/z-eval-update` (dry-run or `--apply`) to diff live targets against generated eval cases, re-invoke the analyser on drift, and stamp per-framework / per-strategy outputs while preserving user-authored cases. Authoritative workflow: [`skills/zoto-update-evals/SKILL.md`](skills/zoto-update-evals/SKILL.md).

### Execute

Run `/z-eval-execute` (optionally `--full` for LLM cases). The host `package.json` scripts invoke the orchestrator, which produces **`static.yml`**, **`llm.yml`**, and **`report.yml`**, then runs `eval:update --check` for a warn-only drift line. Authoritative workflow: [`skills/zoto-execute-evals/SKILL.md`](skills/zoto-execute-evals/SKILL.md).

### Judge

Run `/z-eval-judge` on the latest run directory. The judge reads **`static.yml`**, **`llm.yml`**, and merged **`report.yml`** plus logs, then appends `judge:` into `llm.yml`. Authoritative workflow: [`skills/zoto-judge-evals/SKILL.md`](skills/zoto-judge-evals/SKILL.md).

### Compare

Run `/z-eval-compare` with two or more run ids. Comparison is driven by each run’s **`report.yml`** (per-backend rollups appear under `report.static` / `report.llm`). Authoritative workflow: [`skills/zoto-compare-evals/SKILL.md`](skills/zoto-compare-evals/SKILL.md).

## Static backend (pytest)

The default static layout is stamped from `templates/static/pytest/` when `static.framework` is **`pytest`**. Vitest/jest variants follow their respective template trees when configured.

- `conftest.py` — shared fixtures.
- `requirements.txt` — pytest, pyyaml, and friends.
- `per-primitive-test.py` — pattern for generated tests.
- `fixtures/` — keepalive directory.

Run it with `pnpm run eval` (host wiring typically invokes `python3 scripts/test.py` — see `templates/runner/test.py.tmpl`).

## LLM backend (@cursor/sdk)

Why `@cursor/sdk` and not the older February SDK: `@cursor/sdk ^1.0.12` is the supported, typed API for building agents and evaluations against Cursor's agent infrastructure. The older SDK package (`february`) is not used anywhere in this plugin.

`llm.strategy` chooses **`code`** vs **`declarative`** case shapes; when `code`, `llm.codeFramework` selects vitest or jest reporters co-stamped with the runner.

The LLM backend is stamped at `{evalsDir}/_llm/`:

- `runner.ts` — discovers cases, gates on `--full` + `CURSOR_API_KEY`, runs per-case, writes canonical **`llm.yml`** (historically `results.yml`) + `logs/<case>.log`.
- `case.ts` — typed case loader; understands `_meta.generated`.
- `graders/` — `contains`, `regex`, `tool-called`, `llm-judge`.
- `metrics.ts` — tokens, duration, verbosity, accuracy, confidence.
- `writer.ts` — schema-valid YAML + per-case logs.
- `update.ts` — surgical diff engine (mirror of `scripts/eval-update.ts`).
- `compare.ts` — emits the `/canvas` hand-off dataset.

Model precedence at runtime:

1. `--model <id>` on the CLI.
2. `ZOTO_EVAL_MODEL` env var.
3. `config.llm.model.id` from `.zoto/eval-system/config.yml`.

### Environment variables (`.env` / `.env.example`)

`/z-eval-create` stamps a `.env.example` placeholder at the repo root containing `CURSOR_API_KEY=` (and a commented `ZOTO_EVAL_MODEL=`). It is **never overwritten** if one already exists.

The runner imports `dotenv/config` at startup, so values in `.env` flow into `process.env` automatically. Standard dotenv precedence applies — anything already exported in your shell wins over `.env`.

```bash
cp .env.example .env       # then edit .env locally; .env is gitignored
pnpm install               # picks up the dotenv devDep added by /z-eval-create
pnpm run eval:full         # CURSOR_API_KEY is now sourced from .env
```

Never commit `.env`. The default repo `.gitignore` already excludes `.env*` while allowing `.env.example`.

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

Rediscovery uses `manifest.discovery_config` (a deep snapshot of the discovery config at last-create-or-update), not the current `config.json`. This prevents config edits from masquerading as code drift.

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
```

## Run logs

Verbose per-case logs land at `{evalsDir}/_runs/<run-id>/logs/<case>.log`. Each log contains: final prompt, full response, grader verdicts, tool-call trace, and any soft-metric deltas.

## Comparing runs (`/canvas` hand-off)

`/z-eval-compare <run-1> <run-2> [<run-N>]`:

1. Locates each run’s **`report.yml`** under `{evalsDir}/_runs/<ts>/` (per-backend totals inside `report.static` / `report.llm`).
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
  run: pnpm run eval:full             # LLM — gated on secret
  env:
    CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
```

The LLM backend is always gated on `--full` + `CURSOR_API_KEY`. It never self-runs.

## Troubleshooting

- **"Run /z-eval-create first."** — `.zoto/eval-system/manifest.yml` is missing; the updater has nothing to diff against.
- **`eval:update --check` keeps returning 2** — a target changed its public surface; either update the target's eval cases interactively or accept the drift via `/z-eval-update --apply`.
- **User-authored case got edited** — impossible by design. If it ever happens, it's a bug; the validator and runtime both guard against it. File an issue.
- **Config change triggered drift** — it shouldn't. Rediscovery uses the snapshot in `manifest.discovery_config`. To commit a config change, re-run `/z-eval-create`.
- **`@cursor/sdk` module not found** — run `pnpm install` (or your package-manager equivalent) after `/z-eval-create` to pick up the merged `devDependencies`.

## Development

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
