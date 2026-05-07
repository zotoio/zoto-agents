---
name: zoto-execute-evals
description: Executes eval runs via the host repo's package.json scripts (pnpm run eval, eval:full, eval:llm, eval:judge). Forwards --model to the LLM runner via both a CLI flag and the ZOTO_EVAL_MODEL environment variable. After each run, calls eval:update --check and appends the drift status to the run report as a warn-only line. Does not call askQuestion — credential gaps use needs_user_input for the command.
---

# Execute Evals

Runs the host repo's eval scripts, optionally forwarding a model override, and records whether the evals are in drift relative to the code they cover.

## Configuration

Reads `.zoto/eval-system/config.yml`. Uses `config.evalsDir` (default `evals`) to locate run outputs.

## File layout / writes

Each run timestamp directory `{evalsDir}/_runs/<ts>/` is produced by the eval orchestrator (merged reporting). **`static.yml`** holds static-backend totals and case outcomes; **`llm.yml`** holds LLM-backend totals, aggregates, per-case metrics, and post-run overlays such as `drift:`; **`report.yml`** merges both backends for a single-machine-readable summary consumed by tooling and docs.

## When to Use

- `/z-eval-execute` invoked.
- The user wants a CI-parity local run without chasing individual package scripts.

## Usage

```
/z-eval-execute                  # static only (pnpm run eval)
/z-eval-execute --full           # static + LLM (pnpm run eval:full) — requires CURSOR_API_KEY
/z-eval-execute --model opus-4.6 # same as above, but overrides the default model
```

## Workflow

### Step 1: Decide which script to run

- No flags → `pnpm run eval`.
- `--full` → `pnpm run eval:full`.
- `--model <id>` is valid with or without `--full`; it only affects LLM cases.

Flags and credential intent are pre-resolved by **`/z-eval-execute`** when possible; check the Task prompt for `credential_resolution` (abort vs static-only).

### Step 2: Forward the model

When `--model <id>` is passed, forward it two ways so downstream code picks it up regardless of shape:

1. `pnpm run eval:full -- --model <id>` (for scripts that parse CLI args).
2. `ZOTO_EVAL_MODEL=<id>` (for scripts that read env vars).

The runner's precedence is `--model > ZOTO_EVAL_MODEL > config.llm.model.id`.

### Step 3: Missing CURSOR_API_KEY

The runner imports `dotenv/config`, so `.env` at the repo root is auto-loaded
into `process.env` at runtime. The executor's pre-flight check must consider
the key **present** if **either** of the following is true:

1. `process.env.CURSOR_API_KEY` is set in the executor's own environment, or
2. `.env` at the repo root contains an uncommented `CURSOR_API_KEY=<value>`
   line where `<value>` is non-empty after trimming whitespace.

Only when both checks fail and the command did not pre-resolve intent, return
`needs_user_input` with abort vs static-only options — **never** call
`askQuestion`. Do not run the LLM backend without the key.

### Step 4: Run

Spawn a `shell` subagent to execute the chosen script. Stream stdout/stderr to the user.

### Step 5: Append drift line

After the run, invoke `pnpm run eval:update --check`. Parse the exit code:

| Exit code | Drift status |
|-----------|-------------|
| 0 | `clean` |
| 2 | `critical` |
| other | `unknown` |

Append a `drift:` block to the most recent `llm.yml`:

```yaml
drift:
  status: clean | critical | unknown
  exit_code: <int>
  message: <short human-readable>
```

This is warn-only — the run's own pass/fail status is not changed by the drift check.

### Step 6: Summarise

Print totals (cases / passed / failed), aggregates (tokens, duration, verbosity, accuracy, confidence), and the drift line. Do NOT render charts; that is the compare skill's job.

## Conventions

- Run directory: `{evalsDir}/_runs/<ts>/`.
- Per-run artefacts: `static.yml`, `llm.yml`, and merged `report.yml` (same directory).
- Logs: `{evalsDir}/_runs/<ts>/logs/<case>.log`.

## What NOT to Do

- Do not bypass `package.json` scripts — always run through `pnpm run …`.
- Do not invoke the LLM backend without `--full` and `CURSOR_API_KEY`.
- Do not modify `config.json` or `manifest.yml`.
- Do **not** call `askQuestion`.
