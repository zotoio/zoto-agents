---
name: zoto-execute-evals
description: Executes eval runs via the host repo's package.json scripts (pnpm run eval, eval:full, eval:llm, eval:judge). Forwards --model to the LLM runner via both a CLI flag and the ZOTO_EVAL_MODEL environment variable. After each run, calls eval:update --check and appends the drift status to the run report as a warn-only line.
---

# Execute Evals

Runs the host repo's eval scripts, optionally forwarding a model override, and records whether the evals are in drift relative to the code they cover.

## Configuration

Reads `.zoto-eval-system/config.json`. Uses `config.evalsDir` (default `evals`) to locate run outputs.

## When to Use

- `/zoto-eval-execute` invoked.
- The user wants a CI-parity local run without chasing individual package scripts.

## Usage

```
/zoto-eval-execute                  # static only (pnpm run eval)
/zoto-eval-execute --full           # static + LLM (pnpm run eval:full) — requires CURSOR_API_KEY
/zoto-eval-execute --model opus-4.6 # same as above, but overrides the default model
```

## Workflow

### Step 1: Decide which script to run

- No flags → `pnpm run eval`.
- `--full` → `pnpm run eval:full`.
- `--model <id>` is valid with or without `--full`; it only affects LLM cases.

### Step 2: Forward the model

When `--model <id>` is passed, forward it two ways so downstream code picks it up regardless of shape:

1. `pnpm run eval:full -- --model <id>` (for scripts that parse CLI args).
2. `ZOTO_EVAL_MODEL=<id>` (for scripts that read env vars).

The runner's precedence is `--model > ZOTO_EVAL_MODEL > config.llm.model.id`.

### Step 3: Confirm intent

If `--full` is requested but `CURSOR_API_KEY` is not in the environment, use `askQuestion` to either:
- abort, or
- run static-only (`pnpm run eval`) instead.

Do not run the LLM backend without the key.

### Step 4: Run

Spawn a `shell` subagent to execute the chosen script. Stream stdout/stderr to the user.

### Step 5: Append drift line

After the run, invoke `pnpm run eval:update --check`. Parse the exit code:

| Exit code | Drift status |
|-----------|-------------|
| 0 | `clean` |
| 2 | `critical` |
| other | `unknown` |

Append a `drift:` block to the most recent `results.yml`:

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
- Result YAML: `{evalsDir}/_runs/<ts>/results.yml` (also written as `llm.yml` when the LLM backend participates).
- Logs: `{evalsDir}/_runs/<ts>/logs/<case>.log`.

## What NOT to Do

- Do not bypass `package.json` scripts — always run through `pnpm run …`.
- Do not invoke the LLM backend without `--full` and `CURSOR_API_KEY`.
- Do not modify `config.json` or `manifest.yml`.
- Do not skip askQuestion when prompting for missing credentials.
