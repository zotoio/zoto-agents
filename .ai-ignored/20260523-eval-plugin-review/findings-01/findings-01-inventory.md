# Inventory & taxonomy — `zoto-eval-system`

**Purpose:** Phase-2 shared reference. **Authority:** `/home/andrewv/.cursor/plugins/local/zoto-eval-system/` (authoritative mirror). **Monorepo path:** `/home/andrewv/git/cursor/zoto-agents/plugins/zoto-eval-system/` (currently `templates/env/.env.example.tmpl` plus `node_modules/` only).

**Note — engine / stamped host code:** Commands and skills reference `plugins/zoto-eval-system/engine/*` and various `scripts/*.ts` (e.g. `eval-stamp.ts`, `package-json-merger.ts`, cleanup runners). Those **do not exist** inside the local plugin mirror or the hollow monorepo plugin folder reviewed here — they ship with or are generated into **host repos** via `/z-eval-create`. Inventoried separately in subtask 02.

**Manifest:** ```1:21:/home/andrewv/.cursor/plugins/local/zoto-eval-system/.cursor-plugin/plugin.json``` — declares `agents`, `skills`, `commands`, `rules`, `hooks`; `logo: "assets/logo.png"` — **no `assets/` directory** present in local tree (possible packaging gap).

---

## 1. Component matrix

Path prefix for citations: `/home/andrewv/.cursor/plugins/local/zoto-eval-system/`.

### Agents (8)

| File | Lines | FM `name` | Declared deps (skills / notes) | One-line purpose |
|------|------:|-----------|-------------------------------|------------------|
| `agents/zoto-eval-adviser.md` | 61 | `zoto-eval-adviser` | Primary: **`zoto-advise-evals`**; mentions **`zoto-create-evals`**, **`zoto-update-evals`** as handoffs. | Coverage-gap analyst across five dimensions; read-only on sources/evals.json. ```1:24:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-adviser.md``` |
| `agents/zoto-eval-analyser-subagent.md` | 58 | `zoto-eval-analyser-subagent` | Schema **`analyser-payload.schema.json`**; invoked by **`pnpm run eval:analyse`** (host), `@cursor/sdk`. No slash command shell. | Emits strict JSON **`AnalyserPayload`** per primitive. ```1:24:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-analyser-subagent.md``` |
| `agents/zoto-eval-comparer.md` | 31 | `zoto-eval-comparer` | **`zoto-compare-evals`**. | Builds flat compare dataset + `/canvas` payload. ```1:25:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-comparer.md``` |
| `agents/zoto-eval-configurer.md` | 70 | `zoto-eval-configurer` | **`zoto-configure-evals`** only; **`engine/manifest-snapshot.ts`** (host path). | Writes config + **`cleanup_plan`**; rejects false preserve/mark flags. ```1:18:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-configurer.md``` |
| `agents/zoto-eval-executor.md` | 44 | `zoto-eval-executor` | **`zoto-execute-evals`**, **`zoto-update-evals`** (post-run drift line). | Runs host scripts, gates LLM on keys/`--full`. ```1:20:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-executor.md``` |
| `agents/zoto-eval-generator.md` | 52 | `zoto-eval-generator` | **`zoto-configure-evals`** (conditional), **`zoto-create-evals`**, **`zoto-update-evals`** (post-create check). | Scaffolds dual backends + manifest. ```1:43:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-generator.md``` |
| `agents/zoto-eval-judge.md` | 36 | `zoto-eval-judge` | **`zoto-judge-evals`**, **`zoto-update-evals`** (handoff). | Post-run adversarial critique; **`judge:`** block on **`llm.yml`**. ```1:29:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-judge.md``` |
| `agents/zoto-eval-updater.md` | 58 | `zoto-eval-updater` | **`zoto-update-evals`**, **`zoto-create-evals`** (empty targets). | Drift detection + analyser/regeneration pipelines. ```1:42:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-updater.md``` |

### Skills (9) — Each includes `skills/<name>/evals/evals.json` (skill eval scaffolding; ~10–175 lines depending on skill)

| Skill dir (`SKILL.md`) | Lines | FM `name` | Declared / implied deps | One-line purpose |
|------------------------|------:|-----------|-------------------------|------------------|
| `skills/zoto-advise-evals/SKILL.md` | 413 | `zoto-advise-evals` | Command **`/z-eval-advise`**; handoffs to **`/z-eval-create`** / **`/z-eval-update`** (command layer). Agent **`zoto-eval-adviser`**. | Five-dimension suite gap scanner; **`needs_user_input`** at two breakpoints. ```1:4:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-advise-evals/SKILL.md``` |
| `skills/zoto-compare-evals/SKILL.md` | 83 | `zoto-compare-evals` | **`templates/schema/needs-user-input.schema.json`**, **`templates/canvas/compare-prompt.md.tmpl`**. | Cross-run flatten + **`/canvas`** hook; ambiguity → **`needs_user_input`**. ```1:4:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-compare-evals/SKILL.md``` |
| `skills/zoto-configure-evals/SKILL.md` | 174 | `zoto-configure-evals` | **`templates/schema/config.schema.json`**, **`cleanup-plan.schema.json`**, **`templates/config.json`**, **`engine/manifest-snapshot`** (referenced in skill text). | Atomic config write + cleanup plan emission. ```1:13:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-configure-evals/SKILL.md``` |
| `skills/zoto-create-evals/SKILL.md` | 159 | `zoto-create-evals` | **`templates/static/pytest/`**, **`templates/llm/agent-sdk/`**, **`runner/test.py.tmpl`**, **`schema/result.schema.json`**, **`env/.env.example.tmpl`**, **`skill-evals/evals.json.tmpl`**, **`{command,agent,hook}-evals/*.tmpl`**, **`package-scripts/base.json`**, **`user-checklists/*.tmpl`**, **`static/vitest`**, **`static/jest`**, **`llm/code-cursor-sdk`** (conditional per config — see skill body); host **`scripts/*`**. | Full dual-backend scaffolding + manifest. ```1:22:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-create-evals/SKILL.md``` |
| `skills/zoto-eval-tooling/SKILL.md` | 109 | `zoto-eval-tooling` | **`analyser-payload.schema.json`**, **`cleanup-plan.schema.json`**; **`pnpm run eval:*`** aliases. | Single doc surface for CLI invocation (no slash command owner). ```1:46:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md``` |
| `skills/zoto-execute-evals/SKILL.md` | 104 | `zoto-execute-evals` | Host **`pnpm run eval`**, **`eval:full`**; post-run **`eval:update --check`**. | Executes backends; appends drift line to reports. ```1:13:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-execute-evals/SKILL.md``` |
| `skills/zoto-help-evals/SKILL.md` | 129 | `zoto-help-evals` | **`README.md`**, **`config.schema.json`** (reference), `.zoto` / `manifest` / `_runs` / `package.json` reads. | README-anchored section help + project tailoring; **`/z-eval-help`** (skill direct, no mandated agent). ```1:17:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-help-evals/SKILL.md``` |
| `skills/zoto-judge-evals/SKILL.md` | 94 | `zoto-judge-evals` | **`/z-eval-update`** handoff via **`needs_user_input`**; **`judgeModel`**. | Adversarial read of **`llm.yml`** + logs. ```1:13:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-judge-evals/SKILL.md``` |
| `skills/zoto-update-evals/SKILL.md` | 148 | `zoto-update-evals` | **`needs-user-input.schema.json`**; **`engine/_user-case-guards.ts`** (host); **`zoto-eval-analyser`** path. | Drift classify; preserve user-authored contracts. ```1:13:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-update-evals/SKILL.md``` |

### Commands (13)

All under `commands/*.md`; line counts via `wc -l`.

| File | Lines | FM `name` | Agent / skill | Declared refs |
|------|------:|-----------|---------------|---------------|
| `z-eval-advise.md` | 112 | `z-eval-advise` | **`zoto-eval-adviser`** · **`zoto-advise-evals`** | **`/z-eval-create`**, **`/z-eval-update`** handoffs ```1:4:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-advise.md``` |
| `z-eval-compare.md` | 59 | `z-eval-compare` | **`zoto-eval-comparer`** · **`zoto-compare-evals`** | No **`askQuestion`** for ambiguity; **`needs-user-input`** surface ```1:43:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-compare.md``` |
| `z-eval-configure.md` | 127 | `z-eval-configure` | **`zoto-eval-configurer`** · **`zoto-configure-evals`** | **`engine/manifest-snapshot.ts`**, **`pnpm run eval:cleanup-stale`** ```1:72:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-configure.md``` |
| `z-eval-create.md` | 68 | `z-eval-create` | **`zoto-eval-generator`** · **`zoto-create-evals`** (+ configure handoff paths) | **`pnpm run eval:discover|stamp`** etc. ```1:56:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-create.md``` |
| `z-eval-execute.md` | 66 | `z-eval-execute` | **`zoto-eval-executor`** · **`zoto-execute-evals`** | **`/z-eval-judge`**, **`/z-eval-compare`** ```1:57:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-execute.md``` |
| `z-eval-help.md` | 58 | `z-eval-help` | **`zoto-help-evals`** (skill-first; explicit “no intermediate agent required”) | Routing note for **`/z-eval-start`**, **`/z-eval-workflow`** etc. ```27:58:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-help.md``` |
| `z-eval-init.md` | 40 | `z-eval-init` | *None* · copies **`templates/init-config.yml`** | **`config.schema.json`**, **`/z-eval-configure`** ```1:39:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-init.md``` |
| `z-eval-judge.md` | 55 | `z-eval-judge` | **`zoto-eval-judge`** · **`zoto-judge-evals`** | **`/z-eval-update`** ```1:54:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-judge.md``` |
| `z-eval-jump.md` | 40 | `z-eval-jump` | Delegates to **`commands/z-eval-workflow.md`** (read-only), no Task | Same as **`/z-eval-start`**, **`/z-eval-operator`** ```1:39:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-jump.md``` |
| `z-eval-operator.md` | 40 | `z-eval-operator` | → **`z-eval-workflow.md`** verbatim | Alias entry ```1:39:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-operator.md``` |
| `z-eval-start.md` | 40 | `z-eval-start` | → **`z-eval-workflow.md`** verbatim | Alias entry ```1:39:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-start.md``` |
| `z-eval-update.md` | 84 | `z-eval-update` | **`zoto-eval-updater`** · **`zoto-update-evals`** | **`engine/_user-case-guards.ts`** references ```1:74:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-update.md``` |
| `z-eval-workflow.md` | 63 | `z-eval-workflow` | *None — command-owned **`askQuestion`*** | Maps lifecycle picks → sibling **`/z-eval-*`** commands ```37:61:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-workflow.md``` |

### Rules (1)

| File | Lines | FM | One-line purpose |
|------|------:|----|------------------|
| `rules/zoto-eval-system.mdc` | 100 | `description` only (always-on) ```1:33:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc``` | Command catalogue, init gate, **`/z-eval-help`** routing, **`needs_user_input`** norms, TodoWrite mentions for evaluator agents/skills. |

### Hooks (1 logical event; 3 files)

| Asset | Lines | Trigger | Side effects |
|-------|------:|---------|----------------|
| `hooks/hooks.json` | 13 | **`sessionStart`** → `node hooks/zoto-eval-session-start.mjs` ```5:11:/home/andrewv/.cursor/plugins/local/zoto-eval-system/hooks/hooks.json``` | Loads hook command |
| `hooks/zoto-eval-session-start.ts` | 160 | *Source compiled to `.mjs`* | Legacy dir migration `.zoto-eval-system`→`.zoto/eval-system`, optional JSON→YAML; reads config + repo; emits `additional_context` messages or `{}` ```72:126:/home/andrewv/.cursor/plugins/local/zoto-eval-system/hooks/zoto-eval-session-start.ts``` *(see compiled `.mjs` for deployed lines)* |
| `hooks/zoto-eval-session-start.mjs` | 128 | stdin hook protocol | Same runtime behaviour as TS (bundled/minified structure) ```1:128:/home/andrewv/.cursor/plugins/local/zoto-eval-system/hooks/zoto-eval-session-start.mjs``` |

**Side-effects summary (`sessionStart`):** one-time-ish legacy path migration + config JSON→YAML; lists stale **`_runs/`** (>14d), lists skills missing **`evals/evals.json`**; conditional drift nudge + writes **`.last-drift-check`** marker (~24h throttle); prints JSON **`{ additional_context }`** or `{}`.

---

## 2. Template inventory — directories under `templates/`

Count: **31** child directories (**32** directories if including `templates/` root). Listed as path → role → primary consumer(s).

| Path | Role | Consumer |
|------|------|----------|
| `templates/agent-evals` | Annotated JSON template **`evals.json.tmpl`** docs for centrally stamped agents | Host **`eval-stamp.ts`** pipeline (see **`zoto-create-evals`**); **`zoto-eval-tooling`** |
| `templates/baseline-fixtures` | Mini host-repo fixture tree (sample config, MCP stub, **`package.json`**) | Maintainer / README reference only — **no `grep` hit** in shipped skills/commands for stamp |
| `templates/canvas` | **`compare-prompt.md.tmpl`** for **`/canvas`** instruction passthrough | **`zoto-compare-evals`** |
| `templates/command-evals` | Central command eval **`evals.json.tmpl`** docs | **`eval-stamp.ts`** · **`zoto-create-evals`** |
| `templates/env` | **`.env.example.tmpl`** (keys for LLM runner) | **`zoto-create-evals`** |
| `templates/hook-evals` | Hook eval **`evals.json.tmpl`** docs | **`eval-stamp.ts`** · **`zoto-create-evals`** |
| `templates/llm/agent-sdk` | Declarative LLM strategy harness (`runner`, `writers`, graders, **`@cursor/sdk`**) | **`zoto-create-evals`** when **`llm.strategy: declarative`** (default scaffolding text) |
| `templates/llm/code-cursor-sdk` | Code-strategy sandbox/case-runners/reporters/templates | **`zoto-create-evals`** when **`llm.strategy: code`** (plus Vitest/Jest variants) |
| `templates/package-scripts` | **`base.json`** `package.json` script/devDep merge fragment | **`zoto-create-evals`** (**`scripts/package-json-merger.ts`**) |
| `templates/runner` | **`test.py.tmpl`**, **`eval-orchestrate.ts.tmpl`** | **`zoto-create-evals`** (**orchestration** stamped to host **`scripts/`**) |
| `templates/schema` | JSON schemas (7 files) — see §3 | **`zoto-configure-evals`**, **`zoto-create-evals`**, **`zoto-compare-evals`**, **`zoto-update-evals`**, **`zoto-help-evals`**, **`zoto-eval-analyser-subagent`** contract |
| `templates/skill-evals` | **`evals.json.tmpl`** pattern for skill-level eval rows | **`zoto-create-evals`** overlays per approved skill dir |
| `templates/static/pytest` | Python static pytest backend | **`static.framework`** path selection in create/update stamping |
| `templates/static/vitest` | Vitest static reporters + per-primitive tests | Selected when **`static.framework: vitest`** during stamp |
| `templates/static/jest` | Jest static reporters + configs | Selected when **`static.framework: jest`** during stamp |
| `templates/static/_shared` | **`result-yaml-writer`** shared snippets | Selected static/LLM code paths combine |
| `templates/user-checklists` | **`USER_EVAL_CHECKLISTS.md.tmpl`** + **`scenario.md.tmpl`** | **`zoto-create-evals`** when **`manualChecklists.enabled`** |

**Standalone template files at `templates/` root:** **`init-config.yml`** (`/z-eval-init`); **`config.json`** (ignore defaults — **`zoto-configure-evals`** / discover docs).

---

## 3. Schema inventory — `templates/schema/*.schema.json`

| File | Title | Top-level `required[]` | Governs |
|------|-------|-------------------------|---------|
| `config.schema.json` | Zoto Eval System Config | *(none declared at root; keys optional / defaulted)* ```1:7:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` | **`.zoto/eval-system/config.yml`** semantics + loader validation (**AJV** in configurer skill) |
| `manifest.schema.json` | Zoto Eval System Manifest | **`schema_version`**, **`created_at`**, **`updated_at`**, **`git_ref`**, **`generated_by`**, **`discovery_config`**, **`targets`** ```4:8:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/manifest.schema.json``` | **`manifest.yml`** persisted target graph |
| `result.schema.json` | Zoto Eval System Result | **`schema_version`**, **`run_id`**, **`started_at`**, **`ended_at`**, **`totals`**, **`cases`** ```4:8:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/result.schema.json``` | Per-run YAML/serialised backend result payloads |
| `case-meta.schema.json` | Zoto Eval Case Meta Block | **`generated`** ```4:9:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/case-meta.schema.json``` | **`_meta`** object on generated eval rows |
| `analyser-payload.schema.json` | Zoto Eval Analyser Payload | **`schema_version`**, **`analyser_version`**, **`model_id`**, **`target_id`**, **`kind`**, **`source_path`**, **`source_hash`**, **`summary`**, **`cases`** ```6:17:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/analyser-payload.schema.json``` | **`pnpm run eval:analyse`** LLM JSON (`zoto-eval-analyser-subagent`) |
| `cleanup-plan.schema.json` | Zoto Eval System Cleanup Plan | **`schema_version`**, **`generated_at`**, **`old_snapshot`**, **`new_snapshot`**, **`groups`**, **`totals`** ```6:14:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/cleanup-plan.schema.json``` | **`/z-eval-configure`** destructive cleanup **`cleanup_plan`** + **`pnpm run eval:cleanup-stale`** |
| `needs-user-input.schema.json` | *(title key)* `needs_user_input` | **`needs_user_input`** (wrapper root) ```1:8:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/needs-user-input.schema.json``` | Structured resume payloads from skills/agents → commands |

---

## 4. Command → agent/skill call graph

```text
z-eval-init                 → filesystem copy (templates/init-config.yml); no Task
z-eval-help                 → zoto-help-evals (skill; optional wrapper Task)

z-eval-workflow             → askQuestion only → dispatches verbally to other /z-eval-* commands
z-eval-start  ──┐
z-eval-jump   ──┼── same verbatim delegation → Probe/Lifecycle/Resolution of z-eval-workflow.md (no Task)
z-eval-operator ──┘

z-eval-configure            → zoto-eval-configurer + zoto-configure-evals
z-eval-create               → zoto-eval-generator + zoto-create-evals (+ conditional configure paths inside agent)
z-eval-update               → zoto-eval-updater + zoto-update-evals
z-eval-execute              → zoto-eval-executor + zoto-execute-evals (skill may invoke zoto-update-evals logically post-run)

z-eval-judge                → zoto-eval-judge + zoto-judge-evals
z-eval-compare              → zoto-eval-comparer + zoto-compare-evals

z-eval-advise               → zoto-eval-adviser + zoto-advise-evals
                              → routes accepted recs → /z-eval-create and/or /z-eval-update (command-layer)

pnpm run eval:analyse       → (host) zoto-eval-analyser-subagent — no dedicated plugin slash command
```

---

## 5. Lifecycle triad table (commands ↔ agents ↔ skills)

| Lifecycle stage | Command(s) | Agent | Skill(s) | Gaps |
|-----------------|------------|-------|----------|------|
| **init** | `/z-eval-init` | — | — (template only) | None for template bootstrap |
| **configure** | `/z-eval-configure` | **`zoto-eval-configurer`** | **`zoto-configure-evals`** | Engine **`manifest-snapshot`** not shipped in plugin tree |
| **create** | `/z-eval-create` | **`zoto-eval-generator`** | **`zoto-create-evals`** (+ **`zoto-update-evals`** post-check inside agent narrative) | Host **`scripts/`** stamping not in mirrored plugin payload |
| **update** | `/z-eval-update` | **`zoto-eval-updater`** | **`zoto-update-evals`** | Slash command naming vs skill **`zoto-*`** prefix asymmetry |
| **execute** | `/z-eval-execute` | **`zoto-eval-executor`** | **`zoto-execute-evals`** · **`zoto-update-evals`** (drift tail) | Depends on **`package.json`** merged earlier |
| **judge** | `/z-eval-judge` | **`zoto-eval-judge`** | **`zoto-judge-evals`** | — |
| **compare** | `/z-eval-compare` | **`zoto-eval-comparer`** | **`zoto-compare-evals`** | — |
| **advise** | `/z-eval-advise` | **`zoto-eval-adviser`** | **`zoto-advise-evals`** | — |
| **help** | `/z-eval-help` | — *(optional symmetry)* | **`zoto-help-evals`** | **No dedicated paired agent file** unlike other workflows |
| **workflow / router** | `/z-eval-workflow`, `/z-eval-start`, `/z-eval-jump`, `/z-eval-operator` | — | — | Read-only onboarding; directs to owning commands above |
| **analyse / stamp (CLI)** | *(no `/z-eval-analyse`; host CLI)* | **`zoto-eval-analyser-subagent`** | **`zoto-eval-tooling`** (docs alias surface) | **No first-class slash command** for analyse — operators use **`pnpm run eval:*`** |

---

## 6. Templates ↔ skills cross-reference

| Skill | Stamped / validated template subtree (high level) |
|-------|-----------------------------------------------------|
| **`zoto-configure-evals`** | `templates/schema/config.schema.json`, `cleanup-plan.schema.json`; reads manifest snapshot diffs (`templates/schema` contract) |
| **`zoto-create-evals`** | `templates/init-config.yml` (indirect prerequisite only), `static/pytest|vitest|jest/**`, `llm/agent-sdk/**` or `llm/code-cursor-sdk/**`, `runner/*`, `schema/result.schema.json` copy to `{evalsDir}/_llm/`, `env/.env.example.tmpl`, `skill-evals|command-evals|agent-evals|hook-evals/*.tmpl` patterns, `package-scripts/base.json`, `user-checklists/*` |
| **`zoto-compare-evals`** | `templates/canvas/compare-prompt.md.tmpl`; `needs-user-input.schema.json` validation |
| **`zoto-help-evals`** | References `templates/schema/config.schema.json` for field semantics when answering |
| **`zoto-update-evals`** | Validates **`needs-user_input`** payloads against **`templates/schema/needs-user-input.schema.json`**; relies on **`case-meta`** + **`analyser-payload`** contracts indirectly via engine (host) |
| **`zoto-judge-evals`** / **`zoto-execute-evals`** / **`zoto-advise-evals`** | Primarily consume **runtime artefacts** (`_runs/**`, manifests) — templates only via indirect schema/manifest coupling |
| **`zoto-eval-tooling`** | Documents analyser parity + **`analyser-payload.schema.json`**, **`cleanup-plan.schema.json`**, **`pnpm run`** surface |

---

## 7. Counts summary

| Quantity | Value |
|---------|-------|
| Agents | **8** |
| Skills | **9** (each with `evals/evals.json`) |
| Commands | **13** |
| Rules | **1** |
| Hook events (distinct) | **1** (`sessionStart`) — manifest lists **one** invocation (two on-disk implementations: `.ts` + `.mjs`) |
| JSON Schemas (`templates/schema/`) | **7** |
| Directories under `templates/` (**including root**) | **32** (**31** child dirs) |
| Total LOC (**all files** under local mirror, `wc -l`) | **14,339** |

*Cross-check:* 8 × agents + 9 × SKILL.md + 13 × commands + hooks (13+160+128=301) + rule 100 ≈ baseline component lines; remainder = templates/README + skill eval JSON + template bodies.

---

## 8. Local vs monorepo delta (informational)

**Compared:** relative paths under each plugin root. Monorepo `plugins/zoto-eval-system/` excludes `node_modules/*` from diff.

Result: **`126`** files appear in the authoritative local mirror but **not** in monorepo `plugins/zoto-eval-system/`.

**Inverse:** Files present only monorepo-side (excluding **`node_modules/**`**): **`none`**.

Partial monorepo coverage today: **`templates/env/.env.example.tmpl`** (only common file beside `node_modules`).

<details>
<summary><strong>Full list — local-only relative paths (126)</strong></summary>

```
agents/zoto-eval-adviser.md
agents/zoto-eval-analyser-subagent.md
agents/zoto-eval-comparer.md
agents/zoto-eval-configurer.md
agents/zoto-eval-executor.md
agents/zoto-eval-generator.md
agents/zoto-eval-judge.md
agents/zoto-eval-updater.md
CHANGELOG.md
commands/z-eval-advise.md
commands/z-eval-compare.md
commands/z-eval-configure.md
commands/z-eval-create.md
commands/z-eval-execute.md
commands/z-eval-help.md
commands/z-eval-init.md
commands/z-eval-judge.md
commands/z-eval-jump.md
commands/z-eval-operator.md
commands/z-eval-start.md
commands/z-eval-update.md
commands/z-eval-workflow.md
.cursor-plugin/plugin.json
hooks/hooks.json
hooks/zoto-eval-session-start.mjs
hooks/zoto-eval-session-start.ts
LICENSE
README.md
rules/zoto-eval-system.mdc
skills/zoto-advise-evals/evals/evals.json
skills/zoto-advise-evals/SKILL.md
skills/zoto-compare-evals/evals/evals.json
skills/zoto-compare-evals/SKILL.md
skills/zoto-configure-evals/evals/evals.json
skills/zoto-configure-evals/SKILL.md
skills/zoto-create-evals/evals/evals.json
skills/zoto-create-evals/SKILL.md
skills/zoto-eval-tooling/evals/evals.json
skills/zoto-eval-tooling/SKILL.md
skills/zoto-execute-evals/evals/evals.json
skills/zoto-execute-evals/SKILL.md
skills/zoto-help-evals/evals/evals.json
skills/zoto-help-evals/SKILL.md
skills/zoto-judge-evals/evals/evals.json
skills/zoto-judge-evals/SKILL.md
skills/zoto-update-evals/evals/evals.json
skills/zoto-update-evals/SKILL.md
templates/agent-evals/evals.json.tmpl
templates/baseline-fixtures/.cursor/.gitkeep
templates/baseline-fixtures/.cursor/mcp.json
templates/baseline-fixtures/.gitignore
templates/baseline-fixtures/package.json
templates/baseline-fixtures/README.md
templates/baseline-fixtures/.zoto/eval-system/config.yml
templates/baseline-fixtures/.zoto/eval-system/.gitkeep
templates/canvas/compare-prompt.md.tmpl
templates/command-evals/evals.json.tmpl
templates/config.json
templates/hook-evals/evals.json.tmpl
templates/init-config.yml
templates/llm/agent-sdk/case.ts.tmpl
templates/llm/agent-sdk/compare.ts.tmpl
templates/llm/agent-sdk/graders/common.ts.tmpl
templates/llm/agent-sdk/graders/contains.ts.tmpl
templates/llm/agent-sdk/graders/llm-judge.ts.tmpl
templates/llm/agent-sdk/graders/regex.ts.tmpl
templates/llm/agent-sdk/graders/tool-called.ts.tmpl
templates/llm/agent-sdk/metrics.ts.tmpl
templates/llm/agent-sdk/package.deps.json
templates/llm/agent-sdk/README.md.tmpl
templates/llm/agent-sdk/runner.ts.tmpl
templates/llm/agent-sdk/update.ts.tmpl
templates/llm/agent-sdk/writer.ts.tmpl
templates/llm/code-cursor-sdk/graders/common.ts.tmpl
templates/llm/code-cursor-sdk/graders/contains.ts.tmpl
templates/llm/code-cursor-sdk/graders/llm-judge.ts.tmpl
templates/llm/code-cursor-sdk/graders/regex.ts.tmpl
templates/llm/code-cursor-sdk/graders/tool-called.ts.tmpl
templates/llm/code-cursor-sdk/jest.config.ts.tmpl
templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl
templates/llm/code-cursor-sdk/README.md
templates/llm/code-cursor-sdk/reporters/zoto-llm-reporter.ts.tmpl
templates/llm/code-cursor-sdk/sandbox-helpers.ts.tmpl
templates/llm/code-cursor-sdk/setup.ts.tmpl
templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl
templates/llm/code-cursor-sdk/_shared/graders/contains.ts.tmpl
templates/llm/code-cursor-sdk/_shared/graders/llm-judge.ts.tmpl
templates/llm/code-cursor-sdk/_shared/graders/regex.ts.tmpl
templates/llm/code-cursor-sdk/_shared/graders/tool-called.ts.tmpl
templates/llm/code-cursor-sdk/_shared/reporters/zoto-llm-reporter.jest.ts.tmpl
templates/llm/code-cursor-sdk/_shared/reporters/zoto-llm-reporter.vitest.ts.tmpl
templates/llm/code-cursor-sdk/_shared/result-yaml-writer.ts.tmpl
templates/llm/code-cursor-sdk/_shared/sandbox-helpers.ts.tmpl
templates/llm/code-cursor-sdk/_shared/sdk-bridge.ts.tmpl
templates/llm/code-cursor-sdk/_shared/setup.ts.tmpl
templates/llm/code-cursor-sdk/vitest.config.ts.tmpl
templates/package-scripts/base.json
templates/runner/eval-orchestrate.ts.tmpl
templates/runner/test.py.tmpl
templates/schema/analyser-payload.schema.json
templates/schema/case-meta.schema.json
templates/schema/cleanup-plan.schema.json
templates/schema/config.schema.json
templates/schema/manifest.schema.json
templates/schema/needs-user-input.schema.json
templates/schema/result.schema.json
templates/skill-evals/evals.json.tmpl
templates/static/jest/jest.config.ts.tmpl
templates/static/jest/package.deps.json
templates/static/jest/per-primitive-test.ts.tmpl
templates/static/jest/README.md
templates/static/jest/reporters/zoto-eval-reporter.ts.tmpl
templates/static/jest/setup.ts.tmpl
templates/static/pytest/conftest.py.tmpl
templates/static/pytest/fixtures/.gitkeep
templates/static/pytest/per-primitive-test.py.tmpl
templates/static/pytest/_reporter.py.tmpl
templates/static/pytest/requirements.txt
templates/static/_shared/result-yaml-writer.ts.tmpl
templates/static/vitest/per-primitive-test.ts.tmpl
templates/static/vitest/README.md
templates/static/vitest/reporters/zoto-eval-reporter.ts.tmpl
templates/static/vitest/setup.ts.tmpl
templates/static/vitest/vitest.config.ts.tmpl
templates/user-checklists/scenario.md.tmpl
templates/user-checklists/USER_EVAL_CHECKLISTS.md.tmpl
```

</details>

---

## 9. Subtask checklist traceability

Deliverables for **`subtask-01-…md`** mapped to headings **§§1–8** respectively (component matrix, templates, schemas, hooks, call-graph, triad+cross-reference combined in §§5–6, counts §7, delta §8).
