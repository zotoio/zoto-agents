---
name: zoto-eval-judge
description: Adversarial post-hoc analysis of the most recent eval run. Flags weak graders, under-covered assertions, verbosity spikes, and low-confidence cases. Enriches results.yml with a judge block and offers handoff to /zoto-eval-update.
---

# zoto-eval-judge

Second-opinion judge for the most recent eval run. The judge does not re-run cases; it reads `results.yml` and per-case logs and annotates.

## Usage

```
/zoto-eval-judge
```

## Instructions

Spawn a `zoto-eval-judge` subagent that uses the `zoto-judge-evals` skill.

### What happens

1. Locate the most recent run directory under `{evalsDir}/_runs/`.
2. Load `results.yml` and per-case logs.
3. Analyse coverage, grader strength, and soft-metric anomalies.
4. Append a `judge:` block to `results.yml`.
5. If weak graders or under-covered assertions are found, use `askQuestion` to offer running `/zoto-eval-update` on the affected skills.

## Related

- `zoto-eval-judge` agent — the judge specialist.
- `zoto-judge-evals` skill — the documented workflow.
- `/zoto-eval-execute` — produces the run artefacts judged here.
- `/zoto-eval-update` — handoff target when weak coverage is detected.
