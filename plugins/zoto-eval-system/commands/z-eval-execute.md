---
name: z-eval-execute
description: Run the eval suite via the host repo's package.json scripts. Command-owned askQuestion when --full lacks CURSOR_API_KEY; zoto-eval-executor returns needs_user_input if unresolved. --model forwards to LLM runner.
---

# z-eval-execute

Runs the configured eval suites.

## Configuration honoured

The host `.zoto/eval-system/config.yml` selects how the static backend runs: **`static.framework`** (`pytest` | `vitest` | `jest`) chooses the static stamper/runner shape. The LLM side is single-shape — `pnpm run eval:llm` runs the unified LLM eval suite, which discovers every co-located `<kind>/evals/<name>.test.ts` file driven by the unified LLM eval harness at `evals/llm/_shared/run-llm-suite.ts` (exported as `defineLlmEval`). Switching `static.framework` is cleanup territory — use `/z-eval-configure`.

## File layout / writes

The orchestrator writes three sibling artefacts under `{evalsDir}/_runs/<ts>/`: **`static.yml`** (static-backend results), **`llm.yml`** (LLM-backend results and warn-only overlays such as `drift:`), and **`report.yml`** (merged view of both backends).

## Usage

```
/z-eval-execute                        # static only
/z-eval-execute --full                 # static + LLM (needs CURSOR_API_KEY)
/z-eval-execute --full --model opus-4.6
```

## Instructions

### Precondition

Before doing anything else, verify that **`.zoto/eval-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

Do not synthesize a default config and do not proceed.

### Pre-collect (before Task)

When `--full` is requested:

1. Treat `CURSOR_API_KEY` as **present** if **either** `process.env.CURSOR_API_KEY` is set, **or** the repo-root `.env` contains an uncommented non-empty `CURSOR_API_KEY=<value>` line (the runner imports `dotenv/config` and will pick it up).
2. If both checks fail, run `askQuestion`: abort vs fall back to static-only (`pnpm run eval`). Mention `.env.example` as the recommended way to set the key.
3. Encode the decision as `credential_resolution` in the Task prompt.

When `--model <id>` is present, include it verbatim in the Task prompt.

### Spawn subagent

Spawn a `zoto-eval-executor` subagent that uses the `zoto-execute-evals` skill.

### Resume loop

If the subagent returns `needs_user_input` for credential intent (edge cases), run `askQuestion`, **resume** with the answer.

### What happens

1. Resolve the script to run based on the flags.
2. Invoke via `shell` subagent; stream output.
3. After the run, call `pnpm run eval:update --check` and append a `drift:` block to the latest run's `llm.yml` (warn-only).
4. Print totals, aggregates, and drift line.

## Related

- `zoto-eval-executor` agent — runs the scripts.
- `zoto-execute-evals` skill — the documented workflow.
- `/z-eval-judge` — adversarial analysis of the run.
- `/z-eval-compare` — cross-run visualisation via `/canvas`.
