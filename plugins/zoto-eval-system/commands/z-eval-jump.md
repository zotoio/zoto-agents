---
name: z-eval-jump
description: Jump operators into the evaluator workflow — verifies `.zoto/eval-system/config.yml`, loads commands/z-eval-workflow.md, then applies its Probe, Lifecycle router, and Resolution sections verbatim (read-only; no subagents).
---

# z-eval-jump

Use this command when operators want a **jump** verb into the evaluator workflow (docs or runbooks that say “jump in here”). Behaviour matches **`/z-eval-workflow`** exactly; this slash sits alongside **`/z-eval-start`** and **`/z-eval-operator`** without duplicating routing logic.

## Usage

```
/z-eval-jump
```

## Instructions

### Precondition

Before doing anything else, verify that **`.zoto/eval-system/config.yml`** exists at the repository root. If it does not, abort with the exact message:

> Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.

Do not synthesize a default config and do not proceed.

### Delegate routing semantics

After Preconditions succeed:

1. Resolve **`plugins/zoto-eval-system/commands/z-eval-workflow.md`** — fall back to the same relative path under the installed Eval System plugin mirror (for example **`~/.cursor/plugins/zoto-eval-system/commands/z-eval-workflow.md`**) when the host workspace does not ship the monorepo tree.
2. Execute **Probe**, **Lifecycle router**, and **Resolution** from that file **without omission or reinterpretation**, exactly as if the operator had invoked **`/z-eval-workflow`**.

Do **not** spawn subagents or skills inside this command. Do **not** mutate manifests or configs.

## Related

- `commands/z-eval-workflow.md` — canonical lifecycle routing specification shared by jump/start/operator entry slashes
- `/z-eval-start` — same delegation pattern with a “start” onboarding label
- `/z-eval-operator` — same delegation pattern with an explicit operator runbook label
- `rules/zoto-eval-system.mdc` — consolidated command list and routing norms
