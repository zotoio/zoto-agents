---
name: z-eval-help
description: Section-routed help for the Eval System plugin. Command-owned askQuestion for section selection and follow-ups; zoto-help-evals composes a project-tailored answer anchored on the chosen README section, with mandatory `start:end:path` citations back to the README and any project files it inspected. The skill never calls askQuestion (no subagent askQuestion).
---

# z-eval-help

Canonical help command. The skill loads this plugin's `README.md`, inspects the host repo's eval-system state (config, manifest, runs), and returns a **tailored answer anchored on the chosen section** with citations back to the README — so every how-to answer is in lockstep with shipped docs and reflects the user's actual project.

## Usage

```
/z-eval-help                 # section picker via askQuestion first
/z-eval-help <topic>         # e.g. /z-eval-help updating
```

## Instructions

### Precondition

Before doing anything else, verify that **`.zoto/eval-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

Do not synthesize a default config and do not proceed.

Use the `zoto-help-evals` skill directly — no intermediate agent is required unless you prefer symmetry with other commands.

### Pre-collect (before invoking the skill)

1. Load `plugins/zoto-eval-system/README.md` and enumerate `##` sections.
2. If `<topic>` is missing → `askQuestion`: numbered list of sections.
3. If `<topic>` matches multiple headers → `askQuestion`: pick one.
4. If the user typed a free-form follow-up (instead of choosing a numbered option), capture it as `help_context.user_question`.
5. Build `help_context: { selected_section, user_question?, follow_up? }` for the skill.

Optional: after the skill returns its tailored answer, run `askQuestion` for related navigation vs exit; if the user wants another section, update `help_context` and re-invoke the skill (or resume a Task if you wrapped it).

### Resume loop

If the skill returns `needs_user_input` (missing context — e.g. ambiguous section, missing follow-up enum), run `askQuestion`, then call the skill again with completed `help_context`.

### What happens

1. README loaded (by you or the skill).
2. Section chosen via command-owned prompts.
3. Skill reads the README **and** the relevant project signals (`.zoto/eval-system/config.yml`, `manifest.yml`, `.env*`, `package.json` scripts, latest `evals/_runs/<run-id>/`), then composes a tailored answer anchored on the chosen section with `start:end:path` citations back to the README.
4. Follow-up navigation via command-owned `askQuestion` as needed.

### Citation contract

The skill MUST cite the README using the code-reference syntax `start:end:plugins/zoto-eval-system/README.md` for any quoted lines, and MUST tailor with values read from the host repo (e.g. actual `evalsDir`, manifest target count, latest run id) — never invented defaults. See `skills/zoto-help-evals/SKILL.md` for the full rules and anti-patterns.

## Related

- `zoto-help-evals` skill — the documented workflow.
- `rules/zoto-eval-system.mdc` — the routing rule that invokes this skill for help-intent.
