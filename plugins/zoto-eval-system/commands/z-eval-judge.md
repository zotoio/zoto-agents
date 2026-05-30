---
name: z-eval-judge
description: Adversarial post-hoc analysis of the most recent eval run. Command-owned askQuestion for handoff to /z-eval-update; judge subagent surfaces needs_user_input. Enriches llm.yml with a judge block.
---

# z-eval-judge

Second-opinion judge for the most recent eval run. The judge does not re-run cases; it reads run artefacts and per-case logs and annotates.

## File layout / reads

Targets the latest `{evalsDir}/_runs/<ts>/`. The judge workflow loads **`static.yml`** and **`llm.yml`** for per-backend signals and **`report.yml`** for the merged summary, plus `logs/<case>.log` for transcripts. Writes the `judge:` overlay back into **`llm.yml`** (append-only).

## Usage

```
/z-eval-judge
```

## Instructions

### Precondition

Before doing anything else, verify that **`.zoto/eval-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

Do not synthesize a default config and do not proceed.

### Pre-collect

Usually none upfront — the judge skill emits `needs_user_input` when proposing `/z-eval-update` handoff.

### Spawn subagent

Spawn a `zoto-eval-judge` subagent that uses the `zoto-judge-evals` skill.

### Resume loop

When the report contains `needs_user_input` for handoff options, run `askQuestion`, then **resume** with the selected option.

### What happens

1. Locate the most recent run directory under `{evalsDir}/_runs/`.
2. Load **`static.yml`**, **`llm.yml`**, and merged **`report.yml`**, plus per-case logs under `logs/`.
3. Analyse coverage, grader strength, and soft-metric anomalies.
4. Append a `judge:` block to `llm.yml`.
5. If weak graders or under-covered assertions are found, the subagent returns `needs_user_input`; **you** offer `/z-eval-update` via `askQuestion`, then resume.

## Related

- `zoto-eval-judge` agent — the judge specialist.
- `zoto-judge-evals` skill — the documented workflow.
- `/z-eval-execute` — produces the run artefacts judged here.
- `/z-eval-update` — handoff target when weak coverage is detected.
