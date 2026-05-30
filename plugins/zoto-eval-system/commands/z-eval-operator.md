---
name: z-eval-operator
description: Operator jump into the evaluator workflow — verifies `.zoto/eval-system/config.yml`, loads commands/z-eval-workflow.md, then applies its Probe, Lifecycle router, and Resolution sections verbatim (read-only; no subagents).
---

# z-eval-operator

Use this command when **operators** need a named entry point into the evaluator lifecycle without memorising router details. Behaviour matches **`/z-eval-workflow`** exactly; this slash exists for runbooks and on-call docs that want an explicit “operator” verb alongside **`/z-eval-start`** and **`/z-eval-jump`**.

## Usage

```
/z-eval-operator
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

- `commands/z-eval-workflow.md` — canonical lifecycle routing specification
- `/z-eval-start` — same delegation pattern with a “start” onboarding label
- `/z-eval-jump` — same delegation pattern with a “jump” onboarding label
- `rules/zoto-eval-system.mdc` — consolidated command list and routing norms
