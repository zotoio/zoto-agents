# Memory extension guide

This document describes an **optional** extension to Spec System: a **memory system** that persists structured learnings across sessions. The base Spec System plugin does not include memory features; they are provided by installing a separate memory plugin and enabling it in configuration.

## What is the memory system?

**Memories** are structured facts (for example patterns, decisions, risks, and conventions) extracted from completed work. They are stored in your repository and reused when similar work comes up later.

Three ideas show up often in memory-enabled workflows:

1. **Dream** — After a unit of work finishes (for example when a spec has been executed), run an extraction pass to propose new or updated memories from artifacts such as execution reports and diffs.
2. **REM sleep** — Periodically consolidate the memory store: merge or archive weakly used items, rebalance importance, and resolve conflicts so the corpus stays useful.
3. **Mindreader** — Before or during planning and implementation, retrieve memories that match the current task or context so agents do not rediscover the same facts every time.

Exact file layouts and tooling depend on the memory plugin you install; Spec System only defines how configuration points at that plugin.

## Commands it adds

When a memory plugin is installed and integrated, you will typically get chat commands such as:

| Command | Role |
|---------|------|
| **`/crux-dream`** | Extract candidate memories from completed specs (or other configured units of work) and merge them into the memory store with proper validation. |
| **`/crux-mindreader`** | Search or rank memories by the current context (task description, open files, plan title, etc.) and surface the most relevant items to the agent. |

Command names and behaviour are defined by the memory plugin; this guide describes the intended shape of the workflow.

## How to enable

1. Install the **memory plugin** separately (it is not shipped inside the Spec System plugin package).
2. In `.zoto-spec-system/config.json`, set:

```json
{
  "extensions": {
    "memory": {
      "enabled": true,
      "plugin": "crux-memories"
    }
  }
}
```

- **`extensions.memory.enabled`** — Turn memory integration on or off.
- **`extensions.memory.plugin`** — Identifier of the installed memory plugin (example above uses `crux-memories` as a conventional name; use the value required by your chosen plugin’s documentation).

See [`config-schema.md`](config-schema.md) for defaults and related settings.

## Integration with the spec lifecycle

A typical flow with memory enabled:

1. **`/zoto-spec-create`** → **`/zoto-spec-judge`** → **`/zoto-spec-execute`** as usual.
2. After **`/zoto-spec-execute`** completes successfully, the system (or integration rule) **suggests running `/crux-dream`** so learnings from the execution report and outcomes are captured.
3. **REM sleep** runs on a schedule or when you trigger a maintenance command, depending on the memory plugin — it keeps the memory corpus tidy over time.
4. **`/crux-mindreader`** (or automatic recall hooks, if provided) runs when starting new work so relevant memories appear in context.

Until `extensions.memory.enabled` is `true`, Spec System behaves as **spec / judge / execute only**; no memory commands are required.

## Note on the memory plugin source

A reference implementation and ongoing development of a compatible memory plugin live in the **[CRUX-Compress](https://github.com/zotoio/CRUX-Compress)** open-source project. That memory stack is **not bundled** with Spec System: you install and version it on its own, and point `extensions.memory.plugin` at the plugin you actually use. Spec System stays decoupled; memory is an add-on.
