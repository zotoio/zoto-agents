# zoto-spec-system

Thin index for the [zoto-spec-system](../plugins/zoto-spec-system/) plugin.

## What it does

A structured spec workflow that decomposes complex initiatives into reviewable specs, judges them independently, then executes them with adversarial verification — every deliverable, every subtask.

- **Create** — break a feature, refactor, or migration into phased subtasks with dependencies, deliverables, and definitions of done.
- **Judge** — get an independent assessment of feasibility, risk, and completeness before any code is written.
- **Execute** — implement subtasks in order; each deliverable is adversarially verified before moving on, with live execution status aggregation and no-restart token-budget configuration.

Specs land as durable markdown in your repo, so the *why* behind a change survives the chat session.

## Read more

- Plugin README: [plugins/zoto-spec-system/README.md](../plugins/zoto-spec-system/README.md)
- Commands: `/z-spec-init`, `/z-spec-create`, `/z-spec-judge`, `/z-spec-execute`.
- Skills: `plugins/zoto-spec-system/skills/` (`zoto-create-spec`, `zoto-judge-spec`, `zoto-execute-spec`).
- Agents: `zoto-spec-generator`, `zoto-spec-judge`, `zoto-spec-executor`.
