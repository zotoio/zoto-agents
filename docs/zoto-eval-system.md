# zoto-eval-system

Thin index for the [zoto-eval-system](../plugins/zoto-eval-system/) plugin.

## What it does

Generates, runs, and consciously updates evals when AI primitives change — every proposed update requires user confirmation. Ships two backends side-by-side:

- **Static (pytest)** — fast, deterministic, runs in any CI without secrets.
- **LLM (`@cursor/sdk`)** — agent-driven, soft-metric-rich, gated on `--full` + `CURSOR_API_KEY`.

The core differentiator: a diff-aware updater that detects when covered targets have changed and presents each proposed eval update for user confirmation before writing — behavioural drift in AI primitives is managed consciously, never silently. User-authored cases are never touched.

## Read more

- Plugin README: [plugins/zoto-eval-system/README.md](../plugins/zoto-eval-system/README.md)
- Commands: `/z-eval-init`, `/z-eval-configure`, `/z-eval-create`, `/z-eval-update`, `/z-eval-execute`, `/z-eval-judge`, `/z-eval-compare`, `/z-eval-help`, `/z-eval-advise`.
- Schemas: `plugins/zoto-eval-system/templates/schema/`.
- Help skill: `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md`.
