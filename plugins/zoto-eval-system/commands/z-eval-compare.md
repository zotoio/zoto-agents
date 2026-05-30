---
name: z-eval-compare
description: Cross-run analysis across two or more runs. When run fragments match multiple `_runs/` folders and the invocation is undifferentiated, the comparer returns `needs_user_input` enumerating candidates — surface that payload verbatim; **do not** run `askQuestion`. Emits flat dataset and /canvas hand-off once paths resolve.
---

# z-eval-compare

Compare two or more eval runs by preparing a structured dataset and asking the host agent to render it via `/canvas`.

## File layout / reads

Each resolved run maps to `{evalsDir}/_runs/<ts>/`. The comparer consumes **`report.yml`** as the primary cross-run artefact (per-backend blocks **`report.static`** and **`report.llm`** summarise totals). **`static.yml`** and **`llm.yml`** remain available when case-level replay needs a specific backend slice. Drill-down targets `logs/<case>.log`.

## Usage

```
/z-eval-compare <run-1> <run-2> [<run-N>]
```

## Instructions

### Precondition

Before doing anything else, verify that **`.zoto/eval-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

Do not synthesize a default config and do not proceed.

### Pre-collect (before Task)

After parsing arguments, pass **each identifier through unchanged** into the Task prompt (including fragments like `20260503`).

**Do not** call `askQuestion` to disambiguate run folders here — the comparer resolves or returns structured `needs_user_input`.

### Spawn subagent

Spawn a `zoto-eval-comparer` subagent that uses the `zoto-compare-evals` skill.

### Ambiguous run resolution (**no askQuestion**, **no resume**)

If the subagent returns `needs_user_input` because one or more run arguments matched **multiple** directories under `{evalsDir}/_runs/`, output that structured block **verbatim** for the operator (YAML or JSON conforming to `templates/schema/needs-user-input.schema.json`). Explain that comparisons stay blocked until `/z-eval-compare` is re-run with **disambiguated** run basenames.

**Do not** invoke `askQuestion` or `resume` for this outcome — `/z-eval-compare` lists candidates inline and stops.

### What happens

1. Resolve each argument to a **`report.yml`** inside `{evalsDir}/_runs/<ts>/`. Use sibling **`static.yml`** / **`llm.yml`** and `report.static` / `report.llm` summaries when flattening datasets.
2. Flatten cases into rows with `run_id`, `model`, `case_id`, `status`, metrics, `log_path`.
3. Read `templates/canvas/compare-prompt.md.tmpl` verbatim.
4. Emit `{ "tool": "/canvas", "instructions": [...], "dataset": [...] }` and instruct the host agent to invoke `/canvas`.
5. Drilldown: clicking a data point opens the matching `log_path`.

## Related

- `zoto-eval-comparer` agent — prepares the payload.
- `zoto-compare-evals` skill — the documented workflow.
- `/canvas` — Cursor's built-in canvas rendering tool.
- `/z-eval-execute` — produces the runs compared here.
