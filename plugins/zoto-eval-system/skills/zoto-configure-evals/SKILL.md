---
name: zoto-configure-evals
description: Guided askQuestion-driven workflow for writing .zoto-eval-system/config.json. Collects eval directory, skill discovery roots, LLM runtime and model, judge model, manual-checklist toggle, additional automation backends, and update criticality rules. Validates the result against templates/schema/config.schema.json. Use when a repository needs an eval-system config or when /zoto-eval-configure is invoked.
---

# Configure Evals

Interactive configuration for the Eval System plugin. Every question is asked through the `askQuestion` tool. The skill never infers consent.

## Configuration

Writes `.zoto-eval-system/config.json` at the repository root. Validated against `templates/schema/config.schema.json`.

Two fields are hard-coded contracts and cannot be disabled:

- `update.preserveUserAuthoredCases: true`
- `update.writeMetaMarker: true`

The schema rejects any config that tries to flip either to `false`.

## When to Use

Use this skill when:
- The user runs `/zoto-eval-configure`.
- `.zoto-eval-system/config.json` is missing and another eval skill (create, update, execute, judge, compare) needs it.

## Workflow

### Step 1: Check existing config

Read `.zoto-eval-system/config.json` if present. If it exists, use `askQuestion` to ask whether to overwrite. If the user declines, exit with a summary of the current config.

### Step 2: Ask each field via `askQuestion`

For every field below, spawn an `askQuestion` prompt with the documented options. Do not free-form. Example: instead of "What LLM model should we use?", pose:

```
Which default LLM model should the runner use?
  1. composer-2 (fast, recommended for local iteration)
  2. opus-4.6 (high quality, slower)
  3. sonnet (balanced)
```

Fields to collect, in order:

| # | Field | Options |
|---|-------|---------|
| 1 | `evalsDir` | Default `evals`; user may override. |
| 2 | `skillsRoots` | Checkboxes: `.cursor/skills`, `skills`, `plugins/*/skills`, custom. |
| 3 | `discoveryTargets` | Checkboxes: `skill`, `command`, `agent`, `hook`, `cli`, `lib`. |
| 4 | `llm.runtime` | `tsx` (default) / `node`. |
| 5 | `llm.model.id` | `composer-2` / `opus-4.6` / `sonnet`. |
| 6 | `judgeModel` | Same options as `llm.model.id`; default `opus-4.6`. |
| 7 | `manualChecklists.enabled` | yes / no. |
| 8 | `additionalAutomation` | Checkboxes: `vitest`, `jest`, `bats`, or none. |
| 9 | `update.criticalChangeRules.*` | Five yes/no prompts (all default yes). |

`update.preserveUserAuthoredCases` and `update.writeMetaMarker` are stamped as `true` without prompting — they are contracts.

### Step 3: Write and validate

Write `.zoto-eval-system/config.json` with the collected values. Validate the written file against `templates/schema/config.schema.json` using `ajv`. If validation fails, show the errors via `askQuestion` and offer to re-enter the offending fields.

### Step 4: Summarise

Print the effective config and the next command to run: `/zoto-eval-create`.

## Conventions

- Directory: `.zoto-eval-system/` at the repository root.
- File: `config.json`.
- All prompts: `askQuestion` with named options. No free-form typing unless a field is open-ended (e.g. custom `skillsRoots`).
- Contract fields: never offered as prompts.

## What NOT to Do

- Do not write to any path other than `.zoto-eval-system/config.json`.
- Do not mutate existing evals or manifests.
- Do not skip `askQuestion` — every interactive step goes through that tool.
- Do not accept `preserveUserAuthoredCases: false` or `writeMetaMarker: false` — both are contract-level rejections.
