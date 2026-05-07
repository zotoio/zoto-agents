---
name: zoto-compare-evals
description: Cross-run analysis across two or more eval runs driven by **`report.yml`**. Inputs are resolved per run directory under `{evalsDir}/_runs/<ts>/`; per-backend summaries are nested under **`report.static`** and **`report.llm`**. Emits a flat dataset (runs × cases × dimensions) plus the /canvas hand-off prompt, instructing the host agent to invoke Cursor's built-in /canvas tool. The skill never renders charts itself. Drill-down opens per-case log files. Does not call askQuestion — ambiguous run IDs use needs_user_input for the command.
---

# Compare Evals

Compare two or more eval runs. The skill does not render any UI; it emits a structured dataset and asks the host agent to route the dataset to Cursor's `/canvas` tool.

## Configuration

Reads `.zoto/eval-system/config.yml` for `evalsDir`. Accepts run identifiers as either directory names under `{evalsDir}/_runs/` (e.g. `20260503051900`) or paths that resolve to that run folder.

## File layout / reads

Comparison is anchored on each run’s **`report.yml`** (merged static + LLM). When flattening datasets, **`static.yml`** carries static-backend case rows/outcomes and **`llm.yml`** carries LLM case rows/metrics; per-backend rollup numbers also appear under **`report.static`** and **`report.llm`** inside `report.yml`. Logs for drill-down: `{evalsDir}/_runs/<run>/logs/<case>.log`.

## Usage

```
/z-eval-compare <run-1> <run-2> [<run-N>]
```

Prefer receiving **disambiguated** run paths from **`/z-eval-compare`** (the command may have prompted before spawning this workflow).

## Workflow

### Step 1: Resolve runs

For each argument, locate the corresponding run directory (and its **`report.yml`**). Prefer `report.yml` as the canonical comparison input; use sibling **`static.yml`** / **`llm.yml`** when a dimension needs backend-specific replay. If a name resolves to multiple candidates and the Task prompt does not include a resolution, return `needs_user_input` listing candidates — **never** call `askQuestion`.

### Step 2: Load and normalise

Parse each **`report.yml`** (and pull per-backend totals from **`report.static`** / **`report.llm`** as needed); include linked rows from **`static.yml`** / **`llm.yml`** where the flatten step requires case-level metrics. Flatten into rows:

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
- Do **not** call `askQuestion`.
