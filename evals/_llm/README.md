# LLM eval backend (@cursor/sdk) — `declarative` strategy

Scaffolded by `zoto-eval-system`. This directory is stamped into your repo
at `evals/_llm/`. Everything here is yours - feel free to edit, but the
diff-aware updater (`/z-eval-update`) will regenerate generated eval
cases (those with `_meta.generated: true`) when covered targets drift.

## Layout

- `runner.ts` - discovers cases, validates the enriched shape, runs them, writes `llm.yml` + per-case logs.
- `update.ts` - surgical diff engine. Mirrors `scripts/eval-update.ts` inside the plugin.
- `compare.ts` - emits the `/canvas` hand-off dataset for cross-run analysis.
- `case.ts` - typed eval-case loader. Owns `validateEnriched(case)`.
- `_user-case-guards.ts` - canonical `_meta.generated` predicates (subtask 09).
- `graders/` - `contains`, `regex`, `tool-called`, `llm-judge`.
- `metrics.ts` - tokens, duration, verbosity, accuracy, confidence.
- `writer.ts` - schema-valid YAML + per-case logs.
- `result.schema.json` - JSON Schema for `llm.yml` (renamed from `results.yml`
  by subtask 10; copied from plugin templates).

## Output filename — `llm.yml` (renamed from `results.yml`)

Subtask 10 renamed the per-backend report file from `results.yml` to
`llm.yml` so it sits alongside the static backend's `static.yml` and the
merged top-level `report.yml` (subtask 12). The on-disk path is now:

```
evals/_runs/<ts>/llm.yml
evals/_runs/<ts>/logs/<case>.log
```

The `--judge-only` smoke check still falls back to the legacy
`results.yml` filename when reading historical run snapshots so older
runs stay replayable; new runs only emit `llm.yml`.

## Running

```bash
pnpm run eval:list                    # list discovered cases
pnpm run eval:full                    # static + LLM, gated on CURSOR_API_KEY
pnpm run eval:llm                     # LLM only (still gated, subtask 12 owns this alias)
pnpm run eval:llm:declarative -- --full
                                      # subtask 10 entry point — declarative runner only
pnpm run eval:update                  # rediscovery dry-run
pnpm run eval:update:check            # CI gate (exit 2 on critical drift)
pnpm run eval:compare run-a run-b     # /canvas hand-off
```

## Two-gate startup

The runner refuses to start without both:

1. `--full` passed on the CLI.
2. `CURSOR_API_KEY` in the environment.

Both gates "skip + exit 0" when not satisfied — the runner never fails
loudly on a missing key or a missing flag. CI scripts that want a hard
"must run" gate use `--full` explicitly and surface the skip line.

### Sourcing `CURSOR_API_KEY` from `.env`

`runner.ts` imports `dotenv/config` at startup, so values in `.env` at the
repo root flow into `process.env` automatically. Standard dotenv precedence
applies: anything already exported in your shell wins over `.env`.

```bash
cp .env.example .env       # .env is gitignored — never commit it
# edit .env, set CURSOR_API_KEY=...
pnpm run eval:full
```

`.env.example` ships as a placeholder via `/z-eval-create` and is never
overwritten by the scaffolder.

## Model precedence

1. `--model <id>` flag.
2. `ZOTO_EVAL_MODEL` env var.
3. `config.llm.model.id` from `.zoto/eval-system/config.yml` (default: `composer-2`).

Allowed ids: `composer-2`, `opus-4.6`, `sonnet`.

## Per-case logs

Each case writes `evals/_runs/<run-id>/logs/<case>.log` containing:

- The final prompt.
- The raw response.
- All grader reports.
- Soft metrics (tokens, duration, verbosity, accuracy, confidence).

`/z-eval-compare` drill-down links to these log files.
