# Eval System

Generate, run, and keep evals in sync with code changes — for any repository.

The Eval System plugin scaffolds two eval backends side by side: a **static pytest** backend for fast, deterministic checks, and an **LLM backend** powered by `@cursor/sdk` for agent-based evaluations with soft metrics (tokens, duration, verbosity, accuracy, confidence). It then provides a diff-aware updater that keeps generated eval cases in lockstep with the code they cover, while never touching user-authored cases.

> **Note**: An earlier name for the continuous evaluation surface was `eval:live` / `_live`. The plugin now ships `eval:update` / `_update` throughout. The rename is complete everywhere except this single footnote.

## Overview

Use this plugin when you want to:

- Stand up an eval suite for a brand-new repo or an existing one, with no bespoke plumbing.
- Ensure eval cases for skills, agents, commands, and libraries stay aligned with the code they describe as it evolves.
- Gate CI on drift between code and evals (`pnpm run eval:update --check`).
- Compare runs across models, dates, or PRs using a structured dataset rendered by Cursor's built-in `/canvas` tool.

Every interactive prompt surfaced by this plugin routes through the `askQuestion` tool — the plugin never assumes silent consent.

## Quick start

```bash
/zoto-eval-configure   # askQuestion-driven — writes .zoto-eval-system/config.json
/zoto-eval-create      # scaffolds static + LLM backends, writes manifest.yml
/zoto-eval-update      # dry-run; confirms nothing drifted after create
/zoto-eval-execute     # runs pytest suite
/zoto-eval-judge       # adversarial coverage + soft-metric analysis
/zoto-eval-compare r1 r2  # cross-run analysis via /canvas
/zoto-eval-help        # section-based help, loads this README
```

## Configuration

Configuration lives at `.zoto-eval-system/config.json` and is validated against `templates/schema/config.schema.json`. Every field can be edited by hand, but the recommended path is running `/zoto-eval-configure` which asks each question through `askQuestion`.

Key fields:

| Field | Purpose |
|-------|---------|
| `evalsDir` | Where static pytest tests and the `_llm/` backend are stamped. Default: `evals`. |
| `skillsRoots[]` | Glob roots the discoverer walks to find `SKILL.md` files. Default: `[".cursor/skills", "skills", "plugins/*/skills"]`. |
| `discoveryTargets[]` | Which kinds of artefacts to scaffold evals for: `skill`, `command`, `agent`, `hook`, `cli`, `lib`. |
| `llm.runtime` | `"tsx"` (default) or `"node"`. |
| `llm.model.id` | Default LLM model. One of `composer-2`, `opus-4.6`, `sonnet`. |
| `judgeModel` | Model the judge skill uses for soft-metric scoring. |
| `manualChecklists.enabled` | Stamp `USER_EVAL_CHECKLISTS.md` on create. |
| `additionalAutomation[]` | Enable extra backends: `vitest`, `jest`, `bats`. |
| `update.criticalChangeRules.*` | Which kinds of drift are critical (fail `--check`). |
| `update.preserveUserAuthoredCases` | **Hard-coded `true`** — rejecting this is a validation error. |
| `update.writeMetaMarker` | **Hard-coded `true`** — rejecting this is a validation error. |

## Static backend (pytest)

The static backend is stamped from `templates/static/pytest/`:

- `conftest.py` — shared fixtures.
- `requirements.txt` — pytest, pyyaml, and friends.
- `test_example.py` — one working example.
- `fixtures/` — keepalive directory.

Run it with `pnpm run eval` (which invokes `python3 scripts/test.py` under the hood — see `templates/runner/test.py.tmpl`).

## LLM backend (@cursor/sdk)

Why `@cursor/sdk` and not the older February SDK: `@cursor/sdk ^1.0.12` is the supported, typed API for building agents and evaluations against Cursor's agent infrastructure. The older SDK package (`february`) is not used anywhere in this plugin.

The LLM backend is stamped at `{evalsDir}/_llm/`:

- `runner.ts` — discovers cases, gates on `--full` + `CURSOR_API_KEY`, runs per-case, writes `results.yml` + `logs/<case>.log`.
- `case.ts` — typed case loader; understands `_meta.generated`.
- `graders/` — `contains`, `regex`, `tool-called`, `llm-judge`.
- `metrics.ts` — tokens, duration, verbosity, accuracy, confidence.
- `writer.ts` — schema-valid YAML + per-case logs.
- `update.ts` — surgical diff engine (mirror of `scripts/eval-update.ts`).
- `compare.ts` — emits the `/canvas` hand-off dataset.

Model precedence at runtime:

1. `--model <id>` on the CLI.
2. `ZOTO_EVAL_MODEL` env var.
3. `config.llm.model.id` from `.zoto-eval-system/config.json`.

## Updating evals when code changes

> This is the core value-add of this plugin — generated evals stay honest, user-authored evals stay sovereign.

### When to run `/zoto-eval-update`

- Immediately after `/zoto-eval-create` — it should no-op.
- After any edit to a covered target (skill body, agent body, command, library export, hook script).
- In CI — use `pnpm run eval:update --check` as a gate (see CI integration).

### Targeted vs rediscovery modes

| Invocation | Mode | Interactive? | Writes? |
|------------|------|--------------|---------|
| `/zoto-eval-update` | rediscovery dry-run | no | no |
| `/zoto-eval-update --apply` | rediscovery apply | yes (askQuestion per change) | yes |
| `/zoto-eval-update <file-or-glob>` | targeted dry-run | no | no |
| `/zoto-eval-update <file-or-glob> --apply` | targeted apply | yes | yes |
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

- `.zoto-eval-system/manifest.yml` — current state. Validated against `templates/schema/manifest.schema.json`.
- `.zoto-eval-system/manifest.history.yml` — append-only list of full manifest snapshots. One entry per create / update, keyed by `git_ref` and `updated_at`.

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

Run results are written as YAML and validated against `templates/schema/result.schema.json`.

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

`/zoto-eval-compare <run-1> <run-2> [<run-N>]`:

1. Loads the named `results.yml` files.
2. Emits a flat dataset (`runs × cases × dimensions`) plus the `templates/canvas/compare-prompt.md.tmpl` instruction.
3. Hands the instruction to the host agent, which invokes Cursor's built-in `/canvas` tool.
4. Drilldown: clicking a data point opens `{evalsDir}/_runs/<run>/logs/<case>.log`.

The skill never renders charts itself. The canvas tool decides layout.

## Judge & soft metrics

`/zoto-eval-judge` runs the `zoto-eval-judge` agent over the latest run. It:

- Looks for under-covered assertions.
- Flags weak graders (e.g. `contains` where `regex` would be stricter).
- Computes soft-metric anomalies (verbosity spikes, confidence drops).
- Offers, via `askQuestion`, to run `/zoto-eval-update` on the affected skills.

## Manual checklists

When `manualChecklists.enabled` is true, `/zoto-eval-create` stamps `USER_EVAL_CHECKLISTS.md` — a harvested pattern from the CRUX-Compress reference. Scenario stubs go under `templates/user-checklists/scenario.md.tmpl`.

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

- **"Run /zoto-eval-create first."** — `.zoto-eval-system/manifest.yml` is missing; the updater has nothing to diff against.
- **`eval:update --check` keeps returning 2** — a target changed its public surface; either update the target's eval cases interactively or accept the drift via `/zoto-eval-update --apply`.
- **User-authored case got edited** — impossible by design. If it ever happens, it's a bug; the validator and runtime both guard against it. File an issue.
- **Config change triggered drift** — it shouldn't. Rediscovery uses the snapshot in `manifest.discovery_config`. To commit a config change, re-run `/zoto-eval-create`.
- **`@cursor/sdk` module not found** — run `pnpm install` (or your package-manager equivalent) after `/zoto-eval-create` to pick up the merged `devDependencies`.

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
