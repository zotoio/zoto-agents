---
name: zoto-compare-evals
description: Cross-run analysis across two or more eval runs driven by **`report.yml`**. Inputs are resolved per run directory under `{evalsDir}/_runs/<ts>/`; per-backend summaries are nested under **`report.static`** and **`report.llm`**. Emits a flat dataset (runs × cases × dimensions) plus the /canvas hand-off prompt, instructing the host agent to invoke Cursor's built-in /canvas tool. The skill never renders charts itself. Drill-down opens per-case log files. Does not call askQuestion — when a fragment (e.g. `20260503`) matches multiple hourly folders and the Task lacks a disambiguator, emit schema-valid **`needs_user_input`** whose **`options[].label`** lists every full **`{evalsDir}/_runs/<ts>/`** candidate path (`/z-eval-compare` surfaces this without **`askQuestion`**).
---

# Compare Evals

Compare two or more eval runs. The skill does not render any UI; it emits a structured dataset and asks the host agent to route the dataset to Cursor's `/canvas` tool.

## Configuration

Reads `.zoto/eval-system/config.yml` for `evalsDir`. Accepts run identifiers as either directory names under `{evalsDir}/_runs/` (timestamps such as `20260503051900`, or symbolic stamps like `run-a` / `run-b` / `run-c`) or paths that resolve to that run folder.

## File layout / reads

Comparison is anchored on each run’s **`report.yml`** (merged static + LLM). When flattening datasets, **`static.yml`** carries static-backend case rows/outcomes and **`llm.yml`** carries LLM case rows/metrics; per-backend rollup numbers also appear under **`report.static`** and **`report.llm`** inside `report.yml`. Logs for drill-down: `{evalsDir}/_runs/<run>/logs/<case>.log`.

## Usage

```
/z-eval-compare <run-1> <run-2> [<run-N>]
```

Prefer receiving identifiers that resolve to exactly one **`_runs/`** folder. If **`/z-eval-compare`** received only a fragment (`20260503`) and multiple hourly directories match, the command surfaces **`needs_user_input`** with **`{evalsDir}/_runs/...`** paths — no **`askQuestion`** pre-step.

## Workflow

### Step 1: Resolve runs

For each argument, locate the corresponding run directory (and its **`report.yml`**). Prefer `report.yml` as the canonical comparison input; use sibling **`static.yml`** / **`llm.yml`** when a dimension needs backend-specific replay.

**Matching:** Accept directory basenames (`20260503121500`), relative paths under `{evalsDir}/_runs/`, or **fragments**: any `_runs/` child whose basename is **exactly** the token **or** begins with the token (so `20260503` matches `20260503120000` and `20260503121500`).

**Ambiguity:** If lookup yields **multiple** `_runs/` directories for one argument **and** the Task prompt did not pin that argument to a single path (exact basename, unequivocal relative path, or other explicit resolution), stop comparison and emit **`needs_user_input`** validated against **`templates/schema/needs-user-input.schema.json`**. Encode disambiguation as one question per unresolved argument (`id`: e.g. `disambiguate-run-1`). Each **`options[].label`** MUST be the **full run path** **`{evalsDir}/_runs/<matched-basename>/`** so every candidate folder is enumerated; **`options[].id`** SHOULD be slug-safe (e.g. the basename itself when it fits the slug pattern).

**Never** call `askQuestion`; the invoking command relays this payload without prompting.

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
