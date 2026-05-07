---
name: zoto-judge-evals
description: Adversarial judge for eval runs. Identifies weak graders, under-covered assertions, verbosity spikes, and accuracy/confidence regressions. Produces an enriched llm.yml with soft-metric annotations. Does not call askQuestion — handoff to /z-eval-update is expressed as needs_user_input for the command to confirm via askQuestion and resume. Uses the configured judgeModel (default opus-4.6).
---

# Judge Evals

Independent coverage critic for the most recent eval run. The judge does not re-run cases; it reads the existing `llm.yml` and per-case logs, then writes back an enriched document and an adversarial report.

## Configuration

Reads `.zoto/eval-system/config.yml`. Uses `config.judgeModel` (default `opus-4.6`) and `config.evalsDir`.

## File layout / reads

For the latest `{evalsDir}/_runs/<ts>/`, load **`static.yml`** and **`llm.yml`** separately for backend-specific totals and per-case detail, and **`report.yml`** for the merged rollup. Per-case logs remain under `logs/<case>.log`. When enriching results, writes append to `llm.yml` as documented below.

## When to Use

- `/z-eval-judge` invoked.
- After an eval run when the user wants a second opinion on coverage.

## Workflow

### Step 1: Locate the latest run

Find the most recent directory under `{evalsDir}/_runs/`. If no runs exist, abort with a pointer to `/z-eval-execute`.

### Step 2: Load artefacts

- **`static.yml`** — static-backend totals and per-static outcomes where present.
- **`llm.yml`** — LLM-backend totals, aggregates, per-case metrics.
- **`report.yml`** — merged summary across backends.
- `logs/<case>.log` — prompt + response + grader reports.

### Step 3: Analyse

For each case, score:

1. **Assertion coverage**: do the assertions in the case's eval file correspond to grader reports that assert them? Flag under-covered assertions.
2. **Grader strength**: flag `contains` graders that match short, ambiguous strings (< 4 chars). Suggest `regex` or `llm-judge`.
3. **Soft metric anomalies**:
   - Verbosity > 2.0 or < 0.2.
   - Confidence < 0.4.
   - Accuracy < 0.5.
   - Duration outliers beyond 2σ of the suite average.

### Step 4: Write the enriched report

Append a `judge` block to `llm.yml`:

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
    - "Run /z-eval-update on skill zoto-judge-spec"
```

### Step 5: Offer follow-up (needs_user_input)

When handoff to `/z-eval-update` is appropriate, emit:

```yaml
needs_user_input:
  reason: "Run updater on affected targets?"
  questions:
    - id: handoff
      prompt: "Some assertions look weak. Run /z-eval-update on the affected skills?"
      options:
        - id: accept-all
          label: "Yes — accept-all on the affected skills"
        - id: walk
          label: "Yes — walk each change interactively"
        - id: no
          label: "No — leave as-is"
```

The **`/z-eval-judge` command** maps this through `askQuestion` and resumes with your answer. Do **not** call `askQuestion` from this skill.

If the user accepts via resume, hand off to `zoto-update-evals` with the affected target list as targeted inputs.

## What NOT to Do

- Do not re-run eval cases. The judge is post-hoc.
- Do not modify eval JSON directly — delegate to `/z-eval-update`.
- Do not overwrite the `totals` or `aggregates` blocks; only append `judge`.
- Do **not** call `askQuestion`.
