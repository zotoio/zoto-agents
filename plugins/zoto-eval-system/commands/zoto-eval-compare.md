---
name: zoto-eval-compare
description: Cross-run analysis across two or more runs. Emits a flat dataset and a /canvas hand-off prompt. Skill never renders charts — Cursor's /canvas tool does.
---

# zoto-eval-compare

Compare two or more eval runs by preparing a structured dataset and asking the host agent to render it via `/canvas`.

## Usage

```
/zoto-eval-compare <run-1> <run-2> [<run-N>]
```

## Instructions

Spawn a `zoto-eval-comparer` subagent that uses the `zoto-compare-evals` skill.

### What happens

1. Resolve each argument to a `results.yml` (directories under `{evalsDir}/_runs/` or explicit file paths). Use `askQuestion` to disambiguate.
2. Flatten cases into rows with `run_id`, `model`, `case_id`, `status`, `tokens`, `duration_ms`, `verbosity`, `accuracy`, `confidence`, and `log_path`.
3. Read `templates/canvas/compare-prompt.md.tmpl` verbatim.
4. Emit `{ "tool": "/canvas", "instructions": [...], "dataset": [...] }` and instruct the host agent to invoke `/canvas`.
5. Drilldown: clicking a data point opens the matching `log_path`.

## Related

- `zoto-eval-comparer` agent — prepares the payload.
- `zoto-compare-evals` skill — the documented workflow.
- `/canvas` — Cursor's built-in canvas rendering tool.
- `/zoto-eval-execute` — produces the runs compared here.
