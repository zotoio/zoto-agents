# Findings 08 — Documentation & Developer Experience (`zoto-eval-system`)

**Subtask:** [`subtask-08-eval-plugin-review-documentation-dx-20260523.md`](../subtask-08-eval-plugin-review-documentation-dx-20260523.md)  
**Prerequisite (component counts):** [`findings-01/findings-01-inventory.md`](../findings-01/findings-01-inventory.md) — **13 commands**, **9 skills**, **8 agents**, **1 rule**, **1 sessionStart hook**.  
**Authoritative doc tree:** `/home/andrewv/.cursor/plugins/local/zoto-eval-system/` (cited below as `<plugin>/`).  
**Method:** Static review only (no commands, evals, or tests executed).

---

## Findings ledger

Severity: **blocker** · **major** · **minor** · **info**. Effort: **S** ≤ 1d · **M** 1–3d · **L** > 3d.

| ID | Sev | Confidence | Effort | Title |
|----|-----|-----------|--------|-------|
| D1 | blocker | high | M | Released version **0.3.1** not reflected in **`CHANGELOG.md`**; `[Unreleased]` holds shipping-facing changes |
| D2 | major | high | S | **`config.yml`** is canonical but README + multiple skills still say **`config.json`** (rediscovery + help UX) |
| D3 | major | high | S | README **Install** claims no host churn until **`/z-eval-configure`**; contradicts **`/z-eval-init`**-first Quick start and precondition copy |
| D4 | major | medium | S | **`pnpm run eval:gc -- --apply`** in README vs stamped **`eval:gc:apply`** in `base.json` — document the shipped alias first |
| D5 | minor | high | S | README **footnote (line 7)** is logically true but reads like unresolved migration debt |
| D6 | minor | medium | S | **`rules/zoto-eval-system.mdc`** `TodoWrite` table omits several multi-step agents; contract is prose-only (not mechanically enforced) |
| D7 | minor | medium | S | **`alwaysApply: true` + mandatory `/z-eval-help`** remains high global cost — aligns with ergonomics critique in findings-04 |
| D8 | minor | medium | S | README **≤500 lines** at file EOF; **no TOC** — navigation cost for publishers |
| D9 | info | high | S | **`LICENSE`** holder/year align with **`plugin.json` `author`** intent (zotoio / 2026) |
| D10 | info | medium | S | **`crux-memories-integration.crux.mdc`** is generated CRUX + short; **`zoto-eval-system.mdc`** is long prose + tables — convention divergence is expected |

**Top-3 documentation-only publish blockers:** **D1**, **D2**, **D3** (changelog–version integrity; filename accuracy for config; onboarding narrative consistency).

---

## 1. README.md (`<plugin>/README.md`, 500 lines)

### 1.1 Line-7 footnote (`eval:live` / `_live`)

**Claim in doc:** Rename to `eval:update` / `_update` is complete everywhere except this footnote ```7:7:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md```.

**Source check:** Repository-wide grep for `eval:live`, `_live` under `<plugin>/` yields **only** that line ```7:7:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` — no other occurrences in commands, skills, rules, hooks, or templates under `<plugin>/`.

**Verdict:** **Confirmed** — for the **name pair** mentioned, the statement is accurate. **Caveat (minor):** Legacy output naming (`results.yml`) still appears outside the footnote ```22:27:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` and in LLM templates (e.g. legacy reader paths) ```262:265:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/llm/agent-sdk/runner.ts.tmpl``` — a different artefact lineage than `eval:live`. Consider rewording the footnote to avoid sounding like “everything except this line” covers `results.yml` history.

### 1.2 Accuracy — config path / rediscovery wording

README states rediscovery snapshot source incorrectly as **`config.json`** ```286:286:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` whereas the updater command describes **`manifest.discovery_config`** vs live **`config.yml`** for **full-catalog** modes ```66:67:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-update.md```.

### 1.3 Accuracy — lifecycle “Install” vs init

README **Lifecycle → Install**: “No host-repo files change until you run **`/z-eval-configure`**” ```121:122:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` contradicts Quick start and **`z-eval-init`**, which require **`.zoto/eval-system/config.yml`** from **`/z-eval-init`** first ```35:41:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` ```8:21:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-init.md```.

### 1.4 Accuracy — run GC scripts

Stamped **`package-scripts`** exposes **`eval:gc`** (dry-run) and **`eval:gc:apply`** (apply) ```5:8:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/package-scripts/base.json```. README teaches **`pnpm run eval:gc -- --apply`** ```110:111:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` — may work if **`eval-gc.ts`** parses trailing flags, but the **documented canonical** merged script name is **`eval:gc:apply`**.

### 1.5 Cross-check vs schema / manifest

README model list **`composer-2`**, **`opus-4.6`**, **`sonnet`** ```69:70:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` matches schema enums ```43:43:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` ```61:61:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json```.

Declared plugin version **`0.3.1`** ```15:15:/home/andrewv/.cursor/plugins/local/zoto-eval-system/.cursor-plugin/plugin.json``` is **not** documented in **`CHANGELOG.md`** after **`[0.2.0]`** ```42:62:/home/andrewv/.cursor/plugins/local/zoto-eval-system/CHANGELOG.md``` — **D1**.

### 1.6 Structure / ergonomics

- No top-level TOC; long sections (e.g. LLM strategies, updating) bury mid-file answers.
- Monorepo-only relative link to an old spec path ```72:72:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` breaks for installs that only have `~/.cursor/plugins/local/zoto-eval-system/` (marketplace parity).

---

## 2. CHANGELOG.md (`<plugin>/CHANGELOG.md`)

| Topic | Observation |
|--------|---------------|
| **`[Unreleased]` vs shipped `0.3.1`** | Manifest is **`0.3.1`** ```15:15:/home/andrewv/.cursor/plugins/local/zoto-eval-system/.cursor-plugin/plugin.json```; changelog lists **`[Unreleased]`** ```5:20:/home/andrewv/.cursor/plugins/local/zoto-eval-system/CHANGELOG.md``` then **`0.1.0`**, skips any **`0.3.x`** section — publishers cannot reconcile “what shipped when”. |
| **Semver / breaking tone** | `[Unreleased]` includes slash-command rename and new surface ```7:17:/home/andrewv/.cursor/plugins/local/zoto-eval-system/CHANGELOG.md``` — if not yet released to users, classify explicitly (typically **MINOR** for renamed public commands); if already in **`0.3.1`**, changelog must reflect that boundle. |
| **Migration guidance** | Strong checklist exists for **`0.2.0`** ```46:56:/home/andrewv/.cursor/plugins/local/zoto-eval-system/CHANGELOG.md```; **`[Unreleased]`** lacks a short “operators upgrading from 0.3.x → next” bullet for command prefix changes unless that is folded into backfilled **`0.3.1`**. |

**Cut recommendation:** **Yes** — cut a changelog release (and **backfill missing `0.3.0` / `0.3.1` notes** OR **rename `[Unreleased]` into the correct numbered section**) so **`plugin.json`** and **`CHANGELOG.md`** agree **before** marketplace publish.

---

## 3. LICENSE (`<plugin>/LICENSE`)

MIT text; **`Copyright (c) 2026 zotoio`** ```1:7:/home/andrewv/.cursor/plugins/local/zoto-eval-system/LICENSE``` — consistent with org branding in **`plugin.json`** ```6:10:/home/andrewv/.cursor/plugins/local/zoto-eval-system/.cursor-plugin/plugin.json```.

---

## 4. Plugin rule (`<plugin>/rules/zoto-eval-system.mdc`)

| Topic | Evidence & note |
|--------|-----------------|
| **`alwaysApply: true`** ```3:4:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc``` | Loads **~100 lines** ```1:101:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc``` for **every** session in repos with the plugin. Justified only if stakeholders accept token + routing tax; findings-04 **F2** already flags help-routing overreach ```105:148:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-04/findings-04-surface-ergonomics.md```. |
| **Help routing / “skip”** | Explicit carve-out when only the **next slash command** is needed ```31:34:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc``` — overlaps with “any question about evals → `/z-eval-help`”, creating priority ambiguity (**F2**). |
| **`needs_user_input` schema** block | Matches documented shape ```51:64:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc```; canonical schema path ```51:51:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc``` aligns with inventory ```117:117:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md```. |
| **TodoWrite** | Table mandates todos for executor, updater, judge, adviser, configurer ```67:78:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc``` — **does not** list generator, comparer, analyser subagent, etc.; **no code enforcement**, only instructional. |

### 4.1 Length vs CRUX memories rule

| File | Lines (approx.) | Role |
|------|-----------------|------|
| `<plugin>/rules/zoto-eval-system.mdc` | 100 ```1:101:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc``` | Prose catalogue + contracts |
| `zoto-agents/.cursor/rules/crux-memories-integration.crux.mdc` | 42 ```1:42:/home/andrewv/git/cursor/zoto-agents/.cursor/rules/crux-memories-integration.crux.mdc``` | Generated CRUX block + banner |

**Divergence:** CRUX rule is **compressed + generated**; eval rule is **hand-maintained operational spec**. Not a defect by itself — but **both** use **`alwaysApply: true`** ```3:3:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc``` ```9:9:/home/andrewv/git/cursor/zoto-agents/.cursor/rules/crux-memories-integration.crux.mdc```, compounding baseline context load in repos that enable both plugins.

---

## 5. Skills (`skills/*/SKILL.md`) — line limit & spot checks

Workspace convention: SKILL body **≤ 500 lines** (monorepo plugin rule). **All nine** SKILL files are under limit per `wc -l`: largest **`zoto-advise-evals`** **413** lines.

**Spot — stale `config.json` prose (help/configure/execute skills):**

- ```52:80:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-help-evals/SKILL.md``` refers to **`config.json`** as the live config artefact — should align with **`config.yml`** ```54:54:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` ```123:126:/home/andrewv/.cursor/plugins/local/zoto-eval-system/hooks/zoto-eval-session-start.ts```.
- ```162:162:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-configure-evals/SKILL.md``` “File: `config.json`” vs actual write target **`config.yml`** in command/rule copy.
- ```103:103:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-execute-evals/SKILL.md``` “Do not modify `config.json`”.

**Representative completeness (inputs / outputs):** **`zoto-configure-evals`** documents pre-collected fields, **`needs_user_input`**, manifest snapshot and **`cleanup_plan`** side-effects ```1:13:/home/andrewv/.cursor/plugins/local/zoto-eval-system/skills/zoto-configure-evals/SKILL.md``` (consistent with agent ```1:18:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-configurer.md```).

---

## 6. Commands (`commands/*.md`)

Sampling shows the expected trilogy **precondition → askQuestion ownership → subagent/spawn**:

| Command | askQuestion | Subagent / skill | Flags |
|---------|-------------|------------------|-------|
| **`z-eval-help`** | Section picker + follow-ups ```31:35:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-help.md``` | Skill direct ```27:27:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-help.md``` | Optional `<topic>` ```13:14:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-help.md``` |
| **`z-eval-update`** | Per-change in apply modes ```44:44:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-update.md``` | **`zoto-eval-updater`** + **`zoto-update-evals`** ```49:49:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-update.md``` | **`--apply`**, **`--target`**, **`--check`**, **`--no-analyser`**, **`--with-analyser`** ```21:29:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-update.md``` |
| **`z-eval-init`** | None (pure scaffold) ```10:27:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-init.md``` | No subagent ```27:27:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-init.md``` | **`--force`** ```14:14:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-init.md``` |

Gap (info): Inventory lists **13** commands ```42:61:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md```; README Quick start lists **12** slash lines (combined compare line) ```35:46:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` — reconcile explicitly (e.g. **`/z-eval-workflow`** family vs **`/z-eval-help`**) in docs.

---

## 7. Agents (`agents/*.md`)

Example — **thin comparer wrapper** documents **skill consumed**, **`/z-eval-compare`** I/O sketch, **`needs_user_input`**, **`no askQuestion`** in frontmatter and rules ```4:31:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-comparer.md```.

Example — **generator** documents **`no askQuestion`**, **`needs_user_input`** fallback, **`zoto-create-evals` / `zoto-configure-evals` / `zoto-update-evals`** ```4:52:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-generator.md```.

Example — **`zoto-eval-analyser-subagent`** is explicitly non-interactive JSON-only ```4:58:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-analyser-subagent.md```.

**Gap:** **`zoto-eval-generator`** Step 4 still says “static pytest” unconditionally ```38:39:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-generator.md``` while **`config.static.framework`** can be **`vitest`/`jest`** ```27:31:/home/andrewv/.cursor/plugins/local/zoto-eval-system/templates/schema/config.schema.json``` — wording drift vs dual static frameworks.

---

## 8. Error / nudge strings (tone & actionability — samples from findings-04)

| String | Assessment |
|--------|------------|
| Init gate (**`/z-eval-help`**, **update**, **jump**, …): *“Eval System is not initialised. Run **`/z-eval-init`**…”* ```37:37:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-help.md``` | Clear, actionable, consistent across commands (**F7** duplication noted in findings-04 ```34:37:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-04/findings-04-surface-ergonomics.md```). |
| Session hook nudges: stale runs, missing **`evals.json`**, drift reminder ```134:148:/home/andrewv/.cursor/plugins/local/zoto-eval-system/hooks/zoto-eval-session-start.ts``` | Concrete next steps (**`/z-eval-execute`**, **`/z-eval-update`**); drift line can fire whenever manifest exists (see **F5** ergonomics critique ```32:36:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-04/findings-04-surface-ergonomics.md``` — not a tone issue, repetition risk). |
| **`z-eval-init` exists-without-force** `.zoto/eval-system/config.yml already exists; pass --force` ```32:32:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-init.md``` | Exact, low ambiguity. |

**Help precondition vs “what does this plugin do?”** Combining mandatory **`/z-eval-help`** routing ```28:31:/home/andrewv/.cursor/plugins/local/zoto-eval-system/rules/zoto-eval-system.mdc``` with **`config.yml` missing** precondition ```21:25:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-help.md``` yields the **catch-22** documented in findings-04 **F2.1** ```119:126:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-04/findings-04-surface-ergonomics.md``` — publishing should **call out** onboarding order (**init → configure → …**) prominently to offset rule behaviour until routing is softened.

---

## 9. Onboarding happy-path friction (1 = low friction, 5 = high)

| Step | Doc anchor | Notes | Score |
|------|------------|-------|------:|
| **1. Install plugin** | ```117:122:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` | Marketplace path OK; README omits **`assets/logo.png`** gap from inventory ```7:8:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md```; engine/stamping lives in host after create per inventory §Note ```5:6:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md```. | **3** |
| **2. `/z-eval-init`** | ```35:41:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` ```8:27:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-init.md``` | Straightforward if user finds **`/z-eval-init`** **before** invoking other slash commands (**init gate**) ```49:50:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md```. | **2** |
| **3. `/z-eval-configure`** | ```124:126:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` ```27:41:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-04/findings-04-surface-ergonomics.md``` | Long **`askQuestion`** chain **F4**; jargon without README deep-links. | **5** |
| **4. `/z-eval-create`** | ```129:129:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` ```31:46:/home/andrewv/.cursor/plugins/local/zoto-eval-system/agents/zoto-eval-generator.md``` | Analyser + dual-backend stamp + approvals — high conceptual load (**inventory** warns engine not on plugin mirror) ```5:6:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md```. | **4** |
| **5. `/z-eval-update`** | ```276:284:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` ```12:62:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-update.md``` | Mode matrix helpful; **`--apply` vs `--check`** and CI semantics need careful reading; targeted vs rediscovery **`config`** split advanced ```66:67:/home/andrewv/.cursor/plugins/local/zoto-eval-system/commands/z-eval-update.md```. | **3** |
| **6. `/z-eval-execute`** | ```137:137:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` ```174:178:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` | **`--full`**, **`CURSOR_API_KEY`**, dotenv wiring ```186:190:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` — common failure lane for CI/local mismatch. | **4** |

**Total friction score (sum):** **3 + 2 + 5 + 4 + 3 + 4 = 21** / 30.

---

## 10. Consistency checklist vs inventory

- Commands **13** · README quick-start listing should explicitly include **`/z-eval-help`** parity with **`commands/`** tree ```43:61:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md``` ```35:47:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md```.
- Agents **8** · README does not enumerate agents (acceptable) but **`Judge`** section references **`zoto-eval-judge`** ```396:398:/home/andrewv/.cursor/plugins/local/zoto-eval-system/README.md``` — aligns with matrix ```21:26:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md```.

---

## 11. Resolved questions (executive)

| Question | Answer |
|----------|--------|
| README line-7 footnote factual? | **Yes** for `eval:live`/`_live` token removal; wording still confuses readers (**D5**). |
| **`[Unreleased]` cut?** | **Yes**, plus **repair version history** vs **`plugin.json`** (**D1**). |
| Onboarding friction total | **21** / 30 (§9). |

---

*End of findings-08.*
