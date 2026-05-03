# zoto-eval-system

Thin index for the [zoto-eval-system](../plugins/zoto-eval-system/) plugin.

## What it does

Generates, runs, and keeps evals in sync with code changes for any repository. Ships two backends side-by-side:

- **Static (pytest)** — fast, deterministic, runs in any CI without secrets.
- **LLM (`@cursor/sdk`)** — agent-driven, soft-metric-rich, gated on `--full` + `CURSOR_API_KEY`.

The core differentiator: a diff-aware updater that regenerates generated eval cases when the code they cover drifts, while leaving user-authored cases untouched.

## Read more

- Plugin README: [plugins/zoto-eval-system/README.md](../plugins/zoto-eval-system/README.md)
- Commands: `/zoto-eval-configure`, `/zoto-eval-create`, `/zoto-eval-update`, `/zoto-eval-execute`, `/zoto-eval-judge`, `/zoto-eval-compare`, `/zoto-eval-help`.
- Schemas: `plugins/zoto-eval-system/templates/schema/`.
- Help skill: `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md`.
