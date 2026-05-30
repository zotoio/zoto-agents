---
name: z-eval-advise
description: Pre-hoc eval coverage adviser. Assesses gaps across five dimensions (trigger-phrase, schema, regression, citation, checklist) and recommends actions. Command-owned askQuestion drives multi-turn interaction at two breakpoints (drill-down selection, action recommendations); zoto-eval-adviser subagent surfaces needs_user_input. Hands off accepted recommendations to /z-eval-create or /z-eval-update.
---

# z-eval-advise

Assesses eval suite coverage gaps — answering "what tests are missing?" rather than "how did the last run perform?" Scans source definitions and eval files against five quality dimensions, then recommends targeted actions to close gaps.

## Usage

```
/z-eval-advise                      # full scan — scope picker via askQuestion
/z-eval-advise <plugin-name>        # scope to a specific plugin
/z-eval-advise <skill-name>         # scope to a specific skill
```

## Instructions

### Precondition

Before doing anything else, verify that **`.zoto/eval-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

Do not synthesize a default config and do not proceed.

### Pre-collect (before Task)

1. If a `<plugin-name>` or `<skill-name>` argument is provided, resolve it to a target glob (e.g. `plugins/zoto-eval-system/skills/zoto-help-evals/**`).
2. If no argument is provided, run `askQuestion` with scope options:
   - **Full scan** — analyse all targets in the manifest.
   - **Specific plugin** — analyse all targets within a named plugin (present list of detected plugins).
   - **Specific skill** — analyse a single skill target (present list of manifest skill targets).
3. Build `advise_context: { scope: "full" | "targeted", target_glob: <string | null> }` for the subagent.

### Spawn subagent

Spawn a `zoto-eval-adviser` subagent that uses the `zoto-advise-evals` skill, passing:

- The resolved `advise_context` (scope + target glob).
- Path to config: `.zoto/eval-system/config.yml`.
- Path to manifest: `.zoto/eval-system/manifest.yml`.

### Resume loop (multi-turn)

The adviser subagent has two breakpoints that return `needs_user_input`. Handle each in turn:

**Breakpoint 1 — Summary drill-down** (after initial gap scan):

The subagent returns a gap summary across all five dimensions with per-dimension severity scores. It includes `needs_user_input` with drill-down options.

1. Present the summary to the user via `askQuestion`, showing:
   - Per-dimension severity (ok / warn / critical) with target counts.
   - Options: drill into specific dimensions, all dimensions with gaps, or skip to recommendations.
2. **Resume** the subagent with the user's drill-down selections.

**Breakpoint 2 — Action recommendations** (after detailed analysis):

The subagent returns detailed per-target findings and a list of deterministic recommendations. It includes `needs_user_input` with action options.

1. Present recommendations to the user via `askQuestion`, showing:
   - Numbered list of proposed actions (create new evals, add assertions, strengthen graders).
   - Options: accept all, walk each individually, create-only, update-only, or no action.
2. If "walk each individually" is selected, iterate through recommendations with per-item accept/skip via additional `askQuestion` calls, then **resume** with the final accepted list.
3. Otherwise, **resume** the subagent with the selected action set.

### Handoff routing

After the adviser returns the final report with accepted recommendations, the **command** (not the subagent) executes handoffs:

1. Group accepted recommendations by handoff command:
   - Recommendations with `action: create` → `/z-eval-create`.
   - Recommendations with `action: update` → `/z-eval-update --target <glob> --apply`.
2. If both create and update targets exist, run **create first** (since update requires existing eval files), then update.
3. Pass accepted recommendations as structured context to the target command:

```yaml
adviser_handoff:
  source: /z-eval-advise
  accepted_recommendations:
    - id: <slug>
      target_id: <manifest target id>
      dimension: <dimension-id>
      action: create | update
  create_targets:
    - <target_id>
  update_targets:
    - glob: <target path glob>
      reason: <short description>
```

4. If "no action" is selected, present the report summary and exit without handoff.

### What happens

1. Precondition check — config exists.
2. Scope collected (argument or `askQuestion`).
3. Subagent loads manifest + config, reads source definitions and eval files.
4. Scores five gap dimensions: trigger-phrase coverage, schema validation coverage, regression baseline coverage, citation verification, checklist completeness.
5. Returns summary → command presents drill-down options (Breakpoint 1).
6. Deepens analysis on selected dimensions → returns recommendations (Breakpoint 2).
7. User selects which recommendations to apply.
8. Command routes accepted recommendations to `/z-eval-create` and/or `/z-eval-update`.

## Related

- `zoto-eval-adviser` agent — the adviser specialist (read-only, two-breakpoint pattern).
- `zoto-advise-evals` skill — five-dimension gap analysis workflow.
- `/z-eval-create` — handoff target when targets need initial eval scaffolding.
- `/z-eval-update` — handoff target when existing evals need strengthening or new assertions.
- `/z-eval-judge` — complementary post-hoc analysis (assesses run quality, not coverage breadth).
