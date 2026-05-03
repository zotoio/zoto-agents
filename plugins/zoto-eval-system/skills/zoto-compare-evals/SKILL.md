---
name: zoto-compare-evals
description: Cross-run analysis across two or more results.yml files. Emits a flat dataset (runs × cases × dimensions) plus the /canvas hand-off prompt, instructing the host agent to invoke Cursor's built-in /canvas tool. The skill never renders charts itself. Drill-down opens per-case logs.
---

# Compare Evals

Compare two or more eval runs. The skill does not render any UI; it emits a structured dataset and asks the host agent to route the dataset to Cursor's `/canvas` tool.

## Configuration

Reads `.zoto-eval-system/config.json` for `evalsDir`. Accepts run identifiers as either:

- Directory names under `{evalsDir}/_runs/` (e.g. `20260503051900`).
- Absolute paths to specific `results.yml` files.

## Usage

```
/zoto-eval-compare <run-1> <run-2> [<run-N>]
```

## Workflow

### Step 1: Resolve runs

For each argument, locate the corresponding `results.yml`. If a name resolves to multiple candidates, use `askQuestion` to disambiguate.

### Step 2: Load and normalise

Parse each `results.yml` and flatten into rows:

```json
{
  "run_id": "...",
  "model": "...",
  "case_id": "...",
  "status": "...",
  "tokens": 0,
  "duration_ms": 0,
  "verbosity": 0.0,
  "accuracy": 0.0,
  "confidence": 0.0,
  "log_path": "_runs/<run>/logs/<case>.log"
}
```

### Step 3: Load the canvas prompt template

Read `templates/canvas/compare-prompt.md.tmpl`. Do not modify it — forward it verbatim alongside the dataset.

### Step 4: Emit the hand-off

Output exactly this JSON (stdout):

```json
{
  "tool": "/canvas",
  "instructions": [ /* from the template */ ],
  "dataset": [ /* flattened rows */ ]
}
```

Then tell the host agent: "Route this payload to /canvas — do not render charts in text."

### Step 5: Drill-down

When the user selects a point on the rendered chart, the `log_path` field maps to `{evalsDir}/<log_path>`. The `/canvas` tool opens that file on click.

## What NOT to Do

- Do not render charts in text or markdown. `/canvas` owns layout.
- Do not aggregate or downsample. Emit every row; `/canvas` decides.
- Do not skip askQuestion when a run name is ambiguous.
