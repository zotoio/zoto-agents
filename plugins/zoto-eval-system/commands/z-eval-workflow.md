---
name: z-eval-workflow
description: Interactive evaluator entry point — command-owned askQuestion maps the operator’s current lifecycle stage to the correct Eval System slash command (configure, scaffold, drift, execute, judge, compare, advise, help) without spawning subagents.
---

# z-eval-workflow

Use this command when operators need a fast path **into** the evaluator workflow instead of guessing which slash command fits their situation.

## Usage

```
/z-eval-workflow
```

## Instructions

### Precondition

Before doing anything else, verify that **`.zoto/eval-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

Do not synthesize a default config and do not proceed.

### Probe (read-only)

1. Resolve the repository root from `$CURSOR_WORKING_DIRECTORY`, falling back to the current working directory when unset.
2. Note whether `.zoto/eval-system/manifest.yml` exists (do not mutate it).

### Lifecycle router

Emit **one** `askQuestion` that lists exactly these options **in order** (labels may be tightened for readability, but ids and implied commands must survive):

| id | Slash command focus |
|----|---------------------|
| `configure` | `/z-eval-configure` — interactive YAML setup |
| `scaffold` | `/z-eval-create` — stamp backends + manifest |
| `drift-check` | `/z-eval-update` — dry-run drift |
| `drift-apply` | `/z-eval-update --apply` — interactive apply |
| `execute` | `/z-eval-execute` (mention `--full` + `CURSOR_API_KEY` caveat from that command’s doc) |
| `judge` | `/z-eval-judge` — analyse latest `_runs/` artefacts |
| `compare` | `/z-eval-compare <r1> <r2>` — cross-run review |
| `advise` | `/z-eval-advise` — pre-run coverage gaps |
| `help` | `/z-eval-help [<topic>]` — README-anchored deep help |

**Tailoring clause:** When `manifest.yml` is absent and the operator picks anything other than `configure` / `help`, prepend a bold one-liner reminding them **`/z-eval-create`** has not run yet and artefacts may be incomplete.

### Resolution

After the operator answers:

1. Summarise why that stage matches their choice using **≤4 short bullets** anchored on the behaviours described in [`plugins/zoto-eval-system/README.md`](plugins/zoto-eval-system/README.md).
2. Name the **`/z-eval-*` invocation** verbatim (plus key flags discussed above) so they can paste it next.
3. Do **not** spawn subagents or skills inside this command. Do **not** run filesystem writes. If operators need scripted execution, instruct them to run the named slash command in a fresh turn.

## Related

- `/z-eval-start` — operator-facing jump into this same evaluator lifecycle (delegates here after the init gate)
- `/z-eval-jump` — same read-only delegation with an explicit “jump” verb for runbooks and docs
- `/z-eval-operator` — same delegation as `/z-eval-start` for runbooks that want an explicit operator-facing name
- `rules/zoto-eval-system.mdc` — consolidated command list & routing norms
- `/z-eval-help` — citations + project-tailored narrative on any topic
