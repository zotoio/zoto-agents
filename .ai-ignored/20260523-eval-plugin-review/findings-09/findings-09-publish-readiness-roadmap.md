# Findings 09 — Publish-readiness roadmap (`zoto-eval-system`)

**Subtask:** 09 · **Agent:** `zoto-plugin-manager` · **Date:** 2026-05-23  
**Scope:** Consolidation of Phase-1/2 findings (`findings-01` … `findings-08`). **Analysis only** — no code or manifest changes; **no sync** from `~/.cursor/plugins/local/zoto-eval-system/` into `plugins/zoto-eval-system/` per explicit no-copy gate.

---

## Executive answers

### 1. Could this plugin be published to the Cursor marketplace **today, as-is**?

**No.** The monorepo’s intended shipping path **`plugins/zoto-eval-system/`** does not contain a publishable payload (almost the entire plugin exists only under the authoritative local mirror), and **`zoto-eval-system` is not registered** in root `marketplace.json`. Even ignoring monorepo layout, **`CHANGELOG.md` does not document the shipped `plugin.json` version `0.3.1`**, and validators run from this repo **do not exercise** the eval plugin because it is absent under `plugins/`. Evidence: gaps and marketplace absence ```113:276:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md```; changelog vs version ```14:71:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-08/findings-08-documentation-dx.md```; validation caveat ```43:46:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-05/findings-05-code-quality.md```.

*(If one hypothetically zipped only the **local** mirror as a standalone artefact: several **workspace convention** boxes still pass locally, but **marketplace publication from this repo** remains blocked until the structural items below are cleared.)*

### 2. Minimum ordered remediation (severity-tagged roadmap)

See **§4** (ordered steps, S/M/L, owners, deps) and **§4b** (PR batches).

---

## Marketplace-readiness checklist (per `zoto-plugin-conventions.mdc`)

**Convention:** verdicts apply to **publish through this monorepo** unless noted “local mirror only.” Citations point at finding docs under `specs/20260523-eval-plugin-review/findings-NN/`.

| Item | Verdict | Citation |
|------|---------|----------|
| `.cursor-plugin/plugin.json` — `name`, `displayName`, `version`, `description`, `author`, `license` complete | **PASS** *(local authoritative tree)* · **FAIL** *(file missing under `plugins/zoto-eval-system/`)* | ```1:7:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md``` · gap ```117:138:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md``` |
| Entry in `.cursor-plugin/marketplace.json` | **FAIL** — `zoto-eval-system` not listed | ```271:277:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md``` · ```12:22:/home/andrewv/git/cursor/zoto-agents/.cursor-plugin/marketplace.json``` |
| `README.md` ≥ 50 lines | **PASS** *(local mirror, ~500 lines)* · **FAIL** *(absent under monorepo `plugins/` until sync)* | ```130:138:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md``` · ```31:64:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-08/findings-08-documentation-dx.md``` |
| `LICENSE` present | **PASS** *(local)* · **FAIL** *(monorepo path until sync)* | ```78:81:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-08/findings-08-documentation-dx.md``` · gap table ```126:138:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md``` |
| `CHANGELOG.md` present and **current** vs `[Unreleased]` / `0.3.1` | **FAIL** — version `0.3.1` in `plugin.json` not reflected; `[Unreleased]` holds shipping-facing notes | ```14:74:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-08/findings-08-documentation-dx.md``` |
| Plugin name kebab-case | **PASS** — `zoto-eval-system` | ```1:7:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md``` |
| Skill directory name matches frontmatter `name` | **PASS** *(local mirror inventory)* | ```28:41:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md``` |
| Every skill has `evals/evals.json` with ≥ 2 cases + assertions | **PASS** *(local mirror)* · **FAIL** *(monorepo path until sync)* | ```28:41:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md``` |
| `SKILL.md` ≤ 500 lines | **PASS** — largest ~413 lines | ```106:113:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-08/findings-08-documentation-dx.md``` |
| `node scripts/validate-template.mjs` passes | **PASS** with warnings unrelated to eval plugin presence | ```28:36:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-05/findings-05-code-quality.md``` |
| `node scripts/validate-skills.mjs` passes | **PASS**, but eval plugin skills **not scanned** until under `plugins/` | ```37:46:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-05/findings-05-code-quality.md``` |
| `pnpm test` passes | **UNKNOWN** — not run this subtask; defer to implementation spec | *Subtask 09 Testing Strategy* |

---

## Source-of-truth resolution plan

| Option | Description |
|--------|-------------|
| **(a) Sync local → monorepo** | Copy or merge authoritative content from `~/.cursor/plugins/local/zoto-eval-system/` into `plugins/zoto-eval-system/` (excluding dev-only artefacts per policy); monorepo becomes canonical for CI + marketplace. |
| **(b) Local canonical + doc** | Keep developing in `~/.cursor/plugins/local/` only; document that marketplace consumers must sync manually — **does not satisfy** root `marketplace.json` pointing at `plugins/`. |
| **(c) Hybrid symlink** | `plugins/zoto-eval-system` → symlink to local copy — fragile for CI/other machines; **not recommended** for a shared repo. |

**Recommendation: (a)** — Treat the **monorepo `plugins/` tree as the single canonical shipping source**, perform a controlled one-time sync (or scripted rsync with ignore rules), then rely on existing `sync-plugins` / PR review for drift. **Rationale:** `marketplace.json` already assumes `pluginRoot: "plugins"` ```8:22:/home/andrewv/git/cursor/zoto-agents/.cursor-plugin/marketplace.json```; validation scripts only discover plugins under `plugins/` ```43:46:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-05/findings-05-code-quality.md```; hollow `plugins/zoto-eval-system/` blocks publish and audit ```284:297:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md```. **This subtask does not perform the copy** (explicit no-copy gate).

---

## Severity-grouped findings ledger (consolidating 03–08)

Legend: **Bl** blocker · **Mj** major · **Mn** minor · **In** info. Items trace to prior findings; sampled minors/infos where volume is high.

### Blockers (must fix before marketplace publish)

| ID | Consolidated topic | Sources |
|----|-------------------|---------|
| B1 | **`plugins/zoto-eval-system/` hollow** vs full local mirror — cannot ship from repo path | ```113:138:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md``` ```198:208:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md``` |
| B2 | **No `marketplace.json` registration** | ```271:277:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md``` |
| B3 | **CHANGELOG/version integrity** — `[Unreleased]` vs shipped `0.3.1` | ```14:74:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-08/findings-08-documentation-dx.md``` |
| B4 | **Documented tooling absent** — `scripts/validate-plugin.ts`, stamping (`eval-stamp.ts`), **`_user-case-guards`** not in authoritative tree; README/CHANGELOG claim compile-time validator | ```13:93:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-05/findings-05-code-quality.md``` ```360:378:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-07/findings-07-schemas-contracts.md``` |
| B5 | **Declarative LLM path: empty `graders` + stub `llm-judge` → cases pass vacuously** | ```12:16:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-06/findings-06-token-quality-performance.md``` ```229:246:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-06/findings-06-token-quality-performance.md``` · aligns ```116:130:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-05/findings-05-code-quality.md``` |
| B6 | **All non-judge subagents pin opus** — cost + precedence doc mismatch (`llm.model.id` ineffective for those Tasks) | ```23:146:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-06/findings-06-token-quality-performance.md``` |

### Major (should fix before publish — quality, trust, ergonomics)

| ID | Consolidated topic | Sources |
|----|-------------------|---------|
| Mj1 | Duplicate router commands (**F1** findings-04); help rule **alwaysApply** catch-22 (**F2**); noisy hook (**F5**); thin-wrapper agents (**F3**); long configure (**F4**) | ```24:266:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-04/findings-04-surface-ergonomics.md``` |
| Mj2 | **Parallel declarative vs `code` strategy** duplication + deprecation recommendation | ```14:489:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-03/findings-03-architecture.md``` |
| Mj3 | **Strategy/framework switch ceremony** (`cleanup_plan`, staleness) | ```546:591:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-03/findings-03-architecture.md``` |
| Mj4 | **`config.yml` vs `config.json`** drift across README, skills, templates | ```97:114:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-05/findings-05-code-quality.md``` ```268:291:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-04/findings-04-surface-ergonomics.md``` ```16:113:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-08/findings-08-documentation-dx.md``` |
| Mj5 | **Schema taxonomy / cleanup-plan / case-meta drift** (`kind` enums, `preserve_user_authored`, init missing `failOnNoAnalyserInCI`, etc.) | ```12:397:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-07/findings-07-schemas-contracts.md``` |
| Mj6 | **README inconsistencies** — Install vs Quick start; GC script naming | ```16:76:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-08/findings-08-documentation-dx.md``` |
| Mj7 | **Analyser/cache unusable without manifest** in this host repostate; 332 `_runs/` dirs vs retention — operational debt | ```280:297:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md``` ```171:176:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-06/findings-06-token-quality-performance.md``` |

### Minor / Info (sample)

- Duplicate agent/skill narration, alias commands (also under Mj1 work items) ```214:259:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-03/findings-03-architecture.md```
- **`logo: assets/logo.png` without `assets/`** ```473:479:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-04/findings-04-surface-ergonomics.md```
- README **line 7 footnote**, **no TOC** ```30:62:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-08/findings-08-documentation-dx.md```
- **`pnpm` assumption** vs host tooling preferences ```517:519:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-04/findings-04-surface-ergonomics.md```
- **`eval:judge` script vs real judge flow** ```15:107:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-06/findings-06-token-quality-performance.md```

---

## Effort-sized remediation roadmap (ordered, no forward references)

**Effort:** S &lt; 30 min · M ≈ half day · L ≈ full day+. **Owner:** primary subagent type for implementation spec follow-up.

| Step | Name | Sev | Owner | Deps | Effort |
|:----:|------|-----|-------|------|-------:|
| 1 | **Sync authoritative plugin tree into `plugins/zoto-eval-system/`** (or equivalent content-complete PR) — *recommended execution of §2 option (a); not performed here* | Bl | `zoto-plugin-manager` | — | L |
| 2 | **`marketplace.json`**: add `{ name: zoto-eval-system, source: plugins/zoto-eval-system, description }`; re-run validate-template | Bl | `zoto-plugin-manager` | 1 | S |
| 3 | **Prune/normalise monorepo `plugins/zoto-eval-system/node_modules`** if copied accidentally — `.gitignore` + remove vendored deps (supply-chain) | Bl | `zoto-plugin-manager` | 1 | S–M |
| 4 | **CHANGELOG repair** — sections for `0.3.1` (and any missing minors), empty or retarget `[Unreleased]` | Bl | `zoto-plugin-manager` | 1 | S |
| 5 | **`assets/logo.png` shipped or `logo` key removed** from `plugin.json` | Bl→Mn | `zoto-plugin-manager` | 1 | S |
| 6 | **`scripts/validate-plugin.ts`** + stamping/guard artefacts **either shipped or docs demoted** to match reality | Bl | `zoto-eval-engineer` | 1 | L |
| 7 | **Declarative runner: real graders + non-stub llm-judge wiring** (and template `evals.json.tmpl` population strategy) | Bl | `zoto-eval-engineer` | 6 | L |
| 8 | **Subagent frontmatter**: remove opus pin except judge; README precedence clarification | Bl | `zoto-plugin-manager` | 1 | S |
| 9 | **`config.yml` canonical reads** everywhere (skills, README, stamped templates reporters/graders) | Mj | `zoto-eval-engineer` | 1·6 | M |
|10 | **Schema ledger**: reconcile `kind` enums, cleanup-plan `preserve_user_authored`, init `failOnNoAnalyserInCI`, manifest history schema decision | Mj | `zoto-eval-engineer` + `zoto-eval-architect` | 6 | M |
|11 | Surface ergonomics tranche: **collapse router aliases**, **soften/trigger-scope help rule**, hook **truthful drift check**, optional **thin agent removal** per findings-04 | Mj | `zoto-eval-engineer` + `zoto-plugin-manager` | 1 | L |
|12 | README **Install/quick start/GC/script** consistency; footnote cleanup | Mj | `zoto-plugin-manager` | 1·4 | S |
|13 | **Architectural deprecate `code` strategy** (optional Programme B) OR **narrow duplication inside both strategies** – large | Mj | `zoto-eval-architect` | 7·10 | L |
|14 | **`pnpm test` / CI** — add workflow gating **`eval:update --check`** where host adopts scripts (document + optional starter) | Mn | `zoto-eval-engineer` | 1·2·6 | M |

Steps are sequentially safe by dependency column; parallel tracks: (**4**, **5**, **8**) after **1**; **10** can start after **6** scaffolding.

### PR-sized batches

| Batch | Steps | Theme |
|-------|-------|-------|
| **PR-A** | 1 · 3 · 2 · 4 · 5 | **Repo + marketplace honesty** |
| **PR-B** | 6 · 8 · 9 | **Integrity: validators, config loaders, docs-truth** |
| **PR-C** | 7 · 10 | **Runtime quality + schemas** |
| **PR-D** | 11 · 12 | **UX / rule / onboarding** |
| **PR-E** | 13 | **Strategy programme (may split milestones)** |
| **PR-F** | 14 | **Automation & CI ergonomics** |

---

## No-host-coupling check

The plugin content **does** bake in **`plugins/zoto-eval-system/`** path literals in commands and rules for workflow delegation ```52:59:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-04/findings-04-surface-ergonomics.md```; stamping merges **`pnpm run eval:*`** into host **`package.json`** ```80:101:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md``` `[Findings reference package-scripts template indirectly via 02]`; **`skillsRoots` defaults** cover `.cursor/skills`, `skills`, **`plugins/*/skills`** ```19:41:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md``` — optimised for polyglot monorepos, not **`zoto-agents`-only**. **validators today ignore eval plugin until it lives under `plugins/`** ```43:46:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-05/findings-05-code-quality.md```.

---

## Security & CI/CD posture

| Topic | Assessment |
|------|-------------|
| **`CURSOR_API_KEY`** | Required gate for **`--full` LLM** paths documented in README / runner ```174:178:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-06/findings-06-token-quality-performance.md``` ```298:317:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-06/findings-06-token-quality-performance.md```; treat secrets as **never commit** standard. |
| **`.env` / `.env.example`** | Templates ship **`.env.example.tmpl`** (create path) per inventory ```89:93:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-01/findings-01-inventory.md```; host onboarding should keep `.gitignore` for real `.env` (host responsibility). |
| **Pre-commit / `eval:update --check`** | Mentioned skills/post-run behaviours; host repo **`package.json`** currently has **zero `eval*`** scripts ```82:101:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md``` — CI gating requires **creating integration first** · roadmap step **14**. |
| **Supply-chain: `node_modules/` in repo plugin path** | In-monorepo copy contains **extra** files under **`node_modules/`** not mirrored from authoritative source ```117:122:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md``` — **never publish** vendor trees · step **3**. |

---

## Target-state definition (publish-ready)

**`plugins/zoto-eval-system/` is content-complete**, registered in **`marketplace.json`**, passes **`validate-template.mjs`** and **`validate-skills.mjs`** with eval skills in scope, has **accurate semver + CHANGELOG**, **shipping logo or absent key**, **`scripts/` + guards consistent with README claims**, declarative/code paths **enforce non-vacuous grading**, subagent **`model`** policy matches documented cost story, **`config.yml` single loader** across templates/docs, schemas **taxonomy-aligned**. Host repos still receive **`eval:*` merges** via create — documented as deliberate host coupling · optional CI recipe for **`eval:update --check`**.

---

## Recommended next steps (options)

| Option | What user gives up | What they get | Timeline (order of magnitude) |
|--------|-------------------|---------------|--------------------------------|
| **(a) v0.4.0 implementation spec** | Short-term roadmap complexity; sequencing discipline | Addresses **all** ledger items with programme for strategy deprecation optional | Weeks (multi-batch) |
| **(b) Park + longer-horizon redesign** | Immediate marketplace revenue / discoverability | Clean architecture (e.g. single LLM strategy) before ship | Months |
| **(c) Ship v0.3.2 patch — blockers only** | Leaves major UX duplication, strategy split, CI story | Faster “exists on marketplace” with honest CHANGELOG + tree sync | Days–1 week |

---

## Verdict

**Publish-ready:** **No** — monorepo **shipping tree + marketplace gap + changelog truth + tooling/grading honesty** remain unresolved ```271:297:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-02/findings-02-application-audit.md``` ```57:74:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-08/findings-08-documentation-dx.md``` ```73:93:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-05/findings-05-code-quality.md``` ```22:241:/home/andrewv/git/cursor/zoto-agents/specs/20260523-eval-plugin-review/findings-06/findings-06-token-quality-performance.md```.

**One-line justification:** You cannot honestly list **`zoto-eval-system`** in **`marketplace.json`** or claim validation/coverage maturity while **`plugins/` is hollow**, **CHANGELOG mismatches version**, **declarative grading is vacuous**, and **validators skip the plugin**.

---

## Appendix — Consolidated blocker/major counts (for trackers)

| Class | Count (this roadmap) |
|-------|----------------------|
| Blocker rows (§3) | **6** (`B1`–`B6`) |
| Major rows (§3) | **7** (`Mj1`–`Mj7`) |
| Ordered roadmap steps (§4) | **14** |

**Recommended selection:** **(a)** Cut **v0.4.0** implementation spec — matches breadth of majors (surface + architecture + schemas) and honours quality blockers **`B5`/`B6`**.

---

## No-copy gate (DoD echo)

Roadmap **recommends** sync from `~/.cursor/plugins/local/zoto-eval-system/` into `plugins/zoto-eval-system/` (step **1**). **No copy executed** during subtask **09.**
