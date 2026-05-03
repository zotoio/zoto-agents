---
name: zoto-judge-evals
description: Adversarial judge for eval runs. Identifies weak graders, under-covered assertions, verbosity spikes, accuracy/confidence regressions, and offers via askQuestion to run /zoto-eval-update on affected skills. Uses the configured judgeModel (default opus-4.6). Produces an enriched results.yml with soft-metric annotations.
---

# Judge Evals

Independent coverage critic for the most recent eval run. The judge does not re-run cases; it reads the existing `results.yml` and per-case logs, then writes back an enriched document and an adversarial report.

## Configuration

Reads `.zoto-eval-system/config.json`. Uses `config.judgeModel` (default `opus-4.6`) and `config.evalsDir`.

## When to Use

- `/zoto-eval-judge` invoked.
- After an eval run when the user wants a second opinion on coverage.

## Workflow

### Step 1: Locate the latest run

Find the most recent directory under `{evalsDir}/_runs/`. If no runs exist, abort with a pointer to `/zoto-eval-execute`.

### Step 2: Load artefacts

- `results.yml` — totals, aggregates, per-case metrics.
- `logs/<case>.log` — prompt + response + grader reports.

### Step 3: Analyse

For each case, score:

1. **Assertion coverage**: do the assertions in the case's `evals.json` actually correspond to grader reports that assert them? Flag under-covered assertions.
2. **Grader strength**: flag `contains` graders that match short, ambiguous strings (< 4 chars). Suggest `regex` or `llm-judge`.
3. **Soft metric anomalies**:
   - Verbosity > 2.0 or < 0.2.
   - Confidence < 0.4.
   - Accuracy < 0.5.
   - Duration outliers beyond 2σ of the suite average.

### Step 4: Write the enriched report

Append a `judge` block to `results.yml`:

```yaml
judge:
  model: <judgeModel>
  analysed_at: <ISO 8601>
  findings:
    - case: <case-id>
      dimension: verbosity | accuracy | confidence | grader | assertion
      severity: warn | flag
      detail: <short reason>
  recommendations:
    - "Strengthen graders for case zoto-create-spec/2"
    - "Run /zoto-eval-update on skill zoto-judge-spec"
```

### Step 5: Offer follow-up

Via `askQuestion`:

> Some assertions look weak. Run /zoto-eval-update on the affected skills?
>   1. Yes — accept-all on the affected skills
>   2. Yes — walk each change interactively
>   3. No — leave as-is

If the user accepts, hand off to the `zoto-update-evals` skill with the affected skill list as targeted inputs.

## What NOT to Do

- Do not re-run eval cases. The judge is post-hoc.
- Do not modify evals.json files directly — delegate to `/zoto-eval-update`.
- Do not overwrite the `totals` or `aggregates` blocks; only append `judge`.
- Do not skip askQuestion when proposing handoff.
