---
name: zoto-eval-execute
description: Run the eval suite via the host repo's package.json scripts. --full enables LLM (gated on CURSOR_API_KEY); --model forwards an override to the LLM runner.
---

# zoto-eval-execute

Runs the configured eval suites.

## Usage

```
/zoto-eval-execute                        # static only
/zoto-eval-execute --full                 # static + LLM (needs CURSOR_API_KEY)
/zoto-eval-execute --full --model opus-4.6
```

## Instructions

Spawn a `zoto-eval-executor` subagent that uses the `zoto-execute-evals` skill.

### Flag handling

- `--full` — run `pnpm run eval:full` (static + LLM). Requires `CURSOR_API_KEY`. If missing, use `askQuestion` to abort or fall back to static-only.
- `--model <id>` — forward to the LLM runner via both `-- --model <id>` and the `ZOTO_EVAL_MODEL` environment variable. Precedence at runtime: `--model > ZOTO_EVAL_MODEL > config.llm.model.id`.

### What happens

1. Resolve the script to run based on the flags.
2. If `--full` and no `CURSOR_API_KEY`, `askQuestion` before proceeding.
3. Invoke the chosen script via a `shell` subagent, streaming stdout/stderr.
4. After the run, call `pnpm run eval:update --check` and append a `drift:` block to the latest `results.yml` (warn-only).
5. Print totals, aggregates, and the drift line.

## Related

- `zoto-eval-executor` agent — runs the scripts.
- `zoto-execute-evals` skill — the documented workflow.
- `/zoto-eval-judge` — adversarial analysis of the run.
- `/zoto-eval-compare` — cross-run visualisation via `/canvas`.
