# Command Prefix Shortening — Inventory & Decision

> **Subtask 01 deliverable.**  
> Produced by: crux-platform-architect  
> Date: 2026-05-06  

## Decision Confirmation

**Option 2 — Rename + back-compat alias** is confirmed as the implementation strategy.

| Criterion | Assessment |
|-----------|-----------|
| User intent | Explicit request for shorter names (`z-*`). |
| Back-compat | Thin alias files keep every existing `/zoto-*` invocation working. No breakage for transcripts, saved chats, muscle memory, or external automation. |
| Doc surface | Short form is canonical in all docs, rules, agents, skills, and hooks. Long form appears only in the alias files and one "Back-compat aliases" table per plugin README. |
| Risk | Low — alias mechanism delegates to the same subagent + skill, so behaviour cannot drift. |

---

## Sweep Summary

| Metric | Count |
|--------|-------|
| Files with `/zoto-spec-*` slash-command references (in scope) | 29 |
| Files with `/zoto-eval-*` slash-command references (in scope) | 41 |
| Total unique in-scope files | 58 (some files have both) |
| Occurrences classified as **command-file canonical** (subtask 02/03) | 13 command files |
| Occurrences classified as **prose/code reference → update** (subtask 04/05) | ~45 files |
| Occurrences classified as **out-of-scope** | see §Out-of-Scope Surfaces below |

---

## Classified Change List

### Subtask 02 — Spec-System Command Files (crux-software-engineer)

These are the 4 existing command files that become thin aliases, plus the 4 new canonical `z-spec-*` files to create.

#### Command files to convert to aliases

| File | Lines with slash refs | Classification |
|------|----------------------|----------------|
| `plugins/zoto-spec-system/commands/zoto-spec-create.md` | 13–15, 24, 70–71 | **alias** — convert to thin delegate for `/z-spec-create` |
| `plugins/zoto-spec-system/commands/zoto-spec-execute.md` | 13–16, 27, 65, 70, 87–88 | **alias** — convert to thin delegate for `/z-spec-execute` |
| `plugins/zoto-spec-system/commands/zoto-spec-judge.md` | 13–15, 26, 65, 96–97 | **alias** — convert to thin delegate for `/z-spec-judge` |
| `plugins/zoto-spec-system/commands/zoto-spec-init.md` | 13–14, 20, 25–26, 36–39 | **alias** — convert to thin delegate for `/z-spec-init` |

#### New canonical files to create

| File | Source |
|------|--------|
| `plugins/zoto-spec-system/commands/z-spec-create.md` | Migrate from `zoto-spec-create.md`; update all in-body refs to short form |
| `plugins/zoto-spec-system/commands/z-spec-execute.md` | Migrate from `zoto-spec-execute.md` |
| `plugins/zoto-spec-system/commands/z-spec-judge.md` | Migrate from `zoto-spec-judge.md` |
| `plugins/zoto-spec-system/commands/z-spec-init.md` | Migrate from `zoto-spec-init.md` |

---

### Subtask 03 — Eval-System Command Files (crux-software-engineer)

These are the 9 existing command files that become thin aliases, plus the 9 new canonical `z-eval-*` files to create.

#### Command files to convert to aliases

| File | Lines with slash refs | Classification |
|------|----------------------|----------------|
| `plugins/zoto-eval-system/commands/zoto-eval-configure.md` | 13, 22, 83, 97, 123 | **alias** — delegate to `/z-eval-configure` |
| `plugins/zoto-eval-system/commands/zoto-eval-create.md` | 13, 22, 30, 66–68 | **alias** — delegate to `/z-eval-create` |
| `plugins/zoto-eval-system/commands/zoto-eval-execute.md` | 21–23, 32, 65–66 | **alias** — delegate to `/z-eval-execute` |
| `plugins/zoto-eval-system/commands/zoto-eval-judge.md` | 17, 26, 32, 48, 54–55 | **alias** — delegate to `/z-eval-judge` |
| `plugins/zoto-eval-system/commands/zoto-eval-update.md` | 13–18, 36, 78–79 | **alias** — delegate to `/z-eval-update` |
| `plugins/zoto-eval-system/commands/zoto-eval-compare.md` | 17, 26, 58 | **alias** — delegate to `/z-eval-compare` |
| `plugins/zoto-eval-system/commands/zoto-eval-help.md` | 13–14, 23, 31, 52, 57 | **alias** — delegate to `/z-eval-help` |
| `plugins/zoto-eval-system/commands/zoto-eval-init.md` | 13–14, 20, 25–26, 37–40 | **alias** — delegate to `/z-eval-init` |
| `plugins/zoto-eval-system/commands/zoto-eval-advise.md` | 3, 13–15, 24, 30, 73–74, 80, 104, 110–112 | **alias** — delegate to `/z-eval-advise` |

#### New canonical files to create

| File | Source |
|------|--------|
| `plugins/zoto-eval-system/commands/z-eval-configure.md` | Migrate from `zoto-eval-configure.md` |
| `plugins/zoto-eval-system/commands/z-eval-create.md` | Migrate from `zoto-eval-create.md` |
| `plugins/zoto-eval-system/commands/z-eval-execute.md` | Migrate from `zoto-eval-execute.md` |
| `plugins/zoto-eval-system/commands/z-eval-judge.md` | Migrate from `zoto-eval-judge.md` |
| `plugins/zoto-eval-system/commands/z-eval-update.md` | Migrate from `zoto-eval-update.md` |
| `plugins/zoto-eval-system/commands/z-eval-compare.md` | Migrate from `zoto-eval-compare.md` |
| `plugins/zoto-eval-system/commands/z-eval-help.md` | Migrate from `zoto-eval-help.md` |
| `plugins/zoto-eval-system/commands/z-eval-init.md` | Migrate from `zoto-eval-init.md` |
| `plugins/zoto-eval-system/commands/z-eval-advise.md` | Migrate from `zoto-eval-advise.md` |

---

### Subtask 04 — Docs, Rules, Agents, Skills, Hooks, Site (docs-sync-agent)

All files below contain **prose-level** `/zoto-spec-*` or `/zoto-eval-*` references that must be updated to the canonical short form.

#### Plugin READMEs

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `plugins/zoto-spec-system/README.md` | 27–28, 30, 34, 38, 88, 122, 130, 137, 147, 158, 164, 166, 178, 197–198, 214–215 | ~25 `/zoto-spec-*` refs | Heavy — every command section header + quickstart + workflow diagram |
| `plugins/zoto-eval-system/README.md` | 28, 35–43, 46, 52, 59, 81, 89, 93, 97, 101, 105, 109, 113, 150, 156, 166, 168, 176–179, 283, 294, 301, 305, 318–320, 328, 334, 343, 362–363, 365–366 | ~55 `/zoto-eval-*` refs | Heaviest file in the repo |

#### CHANGELOGs

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `plugins/zoto-spec-system/CHANGELOG.md` | 16–17, 28 | 4 `/zoto-spec-*` refs | Historical entries + live-status feature |
| `plugins/zoto-eval-system/CHANGELOG.md` | 10, 20, 38, 52 | ~8 `/zoto-eval-*` refs | v2 release + advise feature |

#### AGENTS.md (repo root)

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `AGENTS.md` | 53 | 1 — `/zoto-spec-execute` | Update to `/z-spec-execute` |

#### Plugin rules

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `plugins/zoto-spec-system/rules/zoto-spec-system.mdc` | 12–15, 19, 27, 31, 45, 68–69 | 12 `/zoto-spec-*` refs | "Available Commands" section, config section, reviewer contract |
| `plugins/zoto-eval-system/rules/zoto-eval-system.mdc` | 12–20, 22, 26, 28 | 14 `/zoto-eval-*` refs | "Available Commands" section, help routing |

#### Plugin agent files — body-level command references

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `plugins/zoto-spec-system/agents/zoto-spec-executor.md` | 45, 54, 219 | 3 `/zoto-spec-execute` | Mode heading + aggregator wiring |
| `plugins/zoto-spec-system/agents/zoto-spec-generator.md` | 184 | 1 `/zoto-spec-create` | Mode heading |
| `plugins/zoto-spec-system/agents/zoto-spec-judge.md` | 22, 26, 105, 114 | 4 — `/zoto-spec-judge`, `/zoto-spec-execute` | Three mode headings |
| `plugins/zoto-eval-system/agents/zoto-eval-executor.md` | 11, 24, 28, 32, 44 | 5 — `/zoto-eval-configure`, `/zoto-eval-execute` | Mode headings + config note |
| `plugins/zoto-eval-system/agents/zoto-eval-generator.md` | 11, 31, 33 | 3 — `/zoto-eval-configure`, `/zoto-eval-create` | Mode heading + config gate |
| `plugins/zoto-eval-system/agents/zoto-eval-configurer.md` | 15, 17, 34 | 3 — `/zoto-eval-configure`, `/zoto-eval-create` | Mode heading + next-step pointer |
| `plugins/zoto-eval-system/agents/zoto-eval-updater.md` | 16, 20, 24, 40 | 4 — all `/zoto-eval-update` | Mode headings (4 modes) |
| `plugins/zoto-eval-system/agents/zoto-eval-judge.md` | 4, 20, 29, 34 | 4 — `/zoto-eval-update`, `/zoto-eval-judge` | Description + mode heading + handoff |
| `plugins/zoto-eval-system/agents/zoto-eval-comparer.md` | 19 | 1 — `/zoto-eval-compare` | Mode heading |
| `plugins/zoto-eval-system/agents/zoto-eval-adviser.md` | 28, 30, 32–33, 47, 52 | 7 — `/zoto-eval-advise`, `/zoto-eval-configure`, `/zoto-eval-create`, `/zoto-eval-update` | Mode heading + multiple handoff pointers |
| `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` | (none) | 0 slash-command refs | No update needed — agent mentions only schema paths |

#### Plugin skill files — body-level command references

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `plugins/zoto-spec-system/skills/zoto-create-spec/SKILL.md` | 12 | 1 — `/zoto-spec-init` | Config gate message |
| `plugins/zoto-spec-system/skills/zoto-execute-spec/SKILL.md` | 12 | 1 — `/zoto-spec-init` | Config gate message |
| `plugins/zoto-spec-system/skills/zoto-judge-spec/SKILL.md` | 44, 197 | 2 — `/zoto-spec-create`, `/zoto-spec-execute` | Verdict thresholds |
| `plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md` | 8, 12, 16, 29, 45 | 5 — `/zoto-eval-update`, `/zoto-eval-create`, `/zoto-eval-configure` | Lifecycle pointers |
| `plugins/zoto-eval-system/skills/zoto-execute-evals/SKILL.md` | 20, 26–28, 39 | 4 — `/zoto-eval-execute` | Usage examples + command ref |
| `plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md` | 12, 33–38, 42 | 10 — `/zoto-eval-update`, `/zoto-eval-create` | Mode table + lifecycle ref |
| `plugins/zoto-eval-system/skills/zoto-judge-evals/SKILL.md` | 3, 20, 27, 63, 68, 75, 85, 92 | 8 — `/zoto-eval-judge`, `/zoto-eval-execute`, `/zoto-eval-update` | Description + handoff |
| `plugins/zoto-eval-system/skills/zoto-compare-evals/SKILL.md` | 21, 24 | 2 — `/zoto-eval-compare` | Usage + command ref |
| `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md` | 3, 19, 30, 73 | 4 — `/zoto-eval-help`, `/zoto-eval-create` | Description + command flow |
| `plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md` | 3, 8, 22, 38, 134 | 5 — `/zoto-eval-configure`, `/zoto-eval-create` | Description + lifecycle |
| `plugins/zoto-eval-system/skills/zoto-advise-evals/SKILL.md` | 10, 21, 39, 41, 57, 60, 70, 73, 266, 309–312, 318, 321, 324, 341, 345, 347, 356, 410 | ~20 — `/zoto-eval-create`, `/zoto-eval-update`, `/zoto-eval-advise`, `/zoto-eval-configure` | Heaviest skill file |

#### Hook files (nudge message strings)

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `plugins/zoto-spec-system/hooks/zoto-session-start.ts` | 7, 18 | 2 — `/zoto-spec-init`, `/zoto-spec-create` | TS source: comment + DEFAULT_MESSAGE string literal |
| `plugins/zoto-spec-system/hooks/zoto-session-start.mjs` | 10 | 1 — `/zoto-spec-create` | Compiled JS: DEFAULT_MESSAGE string literal |
| `plugins/zoto-eval-system/hooks/zoto-eval-session-start.ts` | 135, 140, 147 | 3 — `/zoto-eval-execute`, `/zoto-eval-update` | TS source: nudge message strings |
| `plugins/zoto-eval-system/hooks/zoto-eval-session-start.mjs` | 7447, 7451, 7457 | 3 — `/zoto-eval-execute`, `/zoto-eval-update` | Compiled JS: nudge message strings |

#### Config templates (example messages / comments)

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `plugins/zoto-spec-system/templates/init-config.yml` | 70 | 1 — `/zoto-spec-create` | Commented example: `message: "...running /zoto-spec-create..."` |
| `plugins/zoto-eval-system/templates/init-config.yml` | 44, 72 | 2 — `/zoto-eval-judge`, `/zoto-eval-update` | Commented examples |
| `plugins/zoto-eval-system/templates/baseline-fixtures/.zoto/eval-system/config.yml` | 44, 72 | 2 — `/zoto-eval-judge`, `/zoto-eval-update` | Baseline fixture mirror of init-config |
| `.zoto/spec-system/config.yml` | 70 | 1 — `/zoto-spec-create` | Live workspace config, same commented example |

#### Spec-System docs (prose)

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `plugins/zoto-spec-system/docs/config-schema.md` | 3, 20, 70, 87 | 4 — `/zoto-spec-init`, `/zoto-spec-execute` | Config doc |
| `plugins/zoto-spec-system/docs/status-schema.md` | 164, 166 | 2 — `/zoto-spec-create`, `/zoto-spec-execute` | Lifecycle diagram |
| `plugins/zoto-spec-system/docs/memory-extension-guide.md` | 49–50 | 4 — `/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute` | Workflow instructions |
| `plugins/zoto-spec-system/docs/example-config.yml` | 37 | 1 — `/zoto-spec-create` | Example message string |

#### `.cursor/agents/zoto-plugin-manager.md`

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `.cursor/agents/zoto-plugin-manager.md` | 390, 392 | 3 — `/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute`, `/zoto-spec-init` | **Note:** line 390 omits `/zoto-spec-init`; the rewrite should add `/z-spec-init` |

#### `docs/zoto-eval-system.md`

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `docs/zoto-eval-system.md` | 17 | 7 — all eval commands listed | Thin index doc |

#### GitHub Pages site

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `site/index.html` | 448, 456, 464 | 3 — `/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute` | Landing page feature cards |
| `site/spec-system/index.html` | 343, 352, 364, 380, 395, 400, 405 | 7 — `/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute` | Overview page + command table |
| `site/spec-system/quickstart.html` | 84, 87, 90, 116, 121–122, 133, 137, 160, 233, 320, 330, 342, 354 | ~15 — all spec commands | Quickstart walkthrough — heaviest site page |
| `site/spec-system/configuration.html` | 84 | 1 — `/zoto-spec-init` | Config setup |
| `site/spec-system/design.html` | 93–95, 131, 150, 167, 204, 284, 291, 360–362, 408, 766, 771, 775–777, 797, 801–803, 822, 826–829, 913, 940, 949 | ~35 — all spec commands | Architecture deep dive — second heaviest site page |

#### SVG diagrams (text inside `<text>` elements)

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `site/images/diagrams/workflow-overview.svg` | 21, 63, 107 | 3 — `/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute` | **SURPRISE**: SVG `<text>` elements. Updatable — the text values are plain strings, no kerning tricks. |
| `site/images/diagrams/agent-architecture.svg` | 26, 30, 34 | 3 — `/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute` | **SURPRISE**: SVG `<text>` elements. Same clean text-anchor pattern. |
| `site/images/mockups/execute-progress.svg` | 162 | 1 — `/zoto-spec-execute` | **SURPRISE**: SVG `<text>` with class `text-mono`. Clean update. |
| `site/images/mockups/create-spec.svg` | 160 | 1 — `/zoto-spec-create "add auth"` | **SURPRISE**: SVG `<text>`. Includes quoted argument. Clean update. |
| `site/images/mockups/judge-output.svg` | 147 | 1 — `/zoto-spec-judge specs/20260406-auth` | **SURPRISE**: SVG `<text>`. Includes path argument. Clean update. |

> **SVG verdict:** All five SVGs use simple `<text>` elements with no path-based text or complex transforms. The slash-command strings are clean ASCII, so text replacement is safe (character widths are comparable: `/z-spec-*` is 5 chars shorter than `/zoto-spec-*`; the SVG viewBox and font-size can absorb this). No follow-up required.

---

### Subtask 05 — Schemas, Eval Cases, Scripts, Templates (crux-software-engineer)

#### Schema files with slash-command references in `description` or `examples`

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json` | 5 | 1 — `/zoto-eval-configure` in `description` | Update description string |

> **Note:** The `$id` URLs (e.g. `"https://zotoio.github.io/zoto-agents/schemas/zoto-eval-system/..."`) use the **plugin identity** prefix, not slash-command names, and are **out of scope**.

#### Skill eval cases (`evals/evals.json`) — prompts and expected_output

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `plugins/zoto-eval-system/skills/zoto-compare-evals/evals/evals.json` | 6, 19 | 2 — `/zoto-eval-compare` | Prompt strings |
| `plugins/zoto-eval-system/skills/zoto-execute-evals/evals/evals.json` | 6, 18, 31 | 3 — `/zoto-eval-execute` | Prompt strings |
| `plugins/zoto-eval-system/skills/zoto-create-evals/evals/evals.json` | 23, 35 | 2 — `/zoto-eval-create` | Prompt strings |
| `plugins/zoto-eval-system/skills/zoto-update-evals/evals/evals.json` | 6, 21, 33 | 3 — `/zoto-eval-update` | Prompt strings |
| `plugins/zoto-eval-system/skills/zoto-judge-evals/evals/evals.json` | 6, 19–20, 25, 31–32, 36 | 7 — `/zoto-eval-judge`, `/zoto-eval-update`, `/zoto-eval-execute` | Prompt + expected + assertions |
| `plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json` | 7, 10, 13, 15, 21–22, 33, 40, 43, 45 | ~10 — `/zoto-eval-help`, `/zoto-eval-create`, `/zoto-eval-configure` | Heavy: prompt + expected + assertion strings |
| `plugins/zoto-spec-system/skills/zoto-judge-spec/evals/evals.json` | 6 | 1 — `/zoto-spec-judge` | Prompt string |
| `plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json` | 35, 64 | 2 — `/zoto-spec-execute` | Prompt strings |

#### TS/Python error-message strings in scripts

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `scripts/eval-stamp.ts` | 1217, 1230, 1407, 1930 | 4 — `/zoto-eval-configure`, `/zoto-eval-create` | Error message string literals |
| `scripts/eval-cleanup-stale.ts` | 9 | 1 — `/zoto-eval-configure` | JSDoc comment |
| `scripts/test.py` | 71 | 1 — `/zoto-eval-create` | User-facing print message |
| `plugins/zoto-eval-system/scripts/eval-update.ts` | 262 | 1 — `/zoto-eval-create` | Error message string |
| `plugins/zoto-eval-system/scripts/eval-discover.ts` | 15 | 1 — `/zoto-eval-update` | JSDoc comment |

#### Template files (stamped into host repos)

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `plugins/zoto-eval-system/templates/llm/agent-sdk/case.ts.tmpl` | 173 | 1 — `/zoto-eval-update` | Error message |
| `plugins/zoto-eval-system/templates/llm/agent-sdk/update.ts.tmpl` | 329 | 1 — `/zoto-eval-create` | Error message |
| `plugins/zoto-eval-system/templates/llm/agent-sdk/README.md.tmpl` | 5, 31, 122, 146 | 4 — `/zoto-eval-update`, `/zoto-eval-create`, `/zoto-eval-compare` | README template |
| `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/README.md` | 80, 135 | 1 — `/zoto-eval-configure` | README for code strategy |
| `plugins/zoto-eval-system/templates/static/pytest/per-primitive-test.py.tmpl` | 11, 122 | 2 — `/zoto-eval-create`, `/zoto-eval-update` | Doc comment + error message |
| `plugins/zoto-eval-system/templates/static/pytest/conftest.py.tmpl` | 11, 106 | 2 — `/zoto-eval-update` | Doc comment + docstring |
| `plugins/zoto-eval-system/templates/static/jest/per-primitive-test.ts.tmpl` | 9 | 1 — `/zoto-eval-create`, `/zoto-eval-update` | File header comment |
| `plugins/zoto-eval-system/templates/static/vitest/README.md` | 62, 67–68 | 3 — `/zoto-eval-configure`, `/zoto-eval-create` | Framework-switching docs |
| `plugins/zoto-eval-system/templates/static/vitest/vitest.config.ts.tmpl` | 23 | 1 — `/zoto-eval-configure` | Comment |
| `plugins/zoto-eval-system/templates/static/jest/README.md` | 32, 101, 105, 108 | 4 — `/zoto-eval-configure`, `/zoto-eval-create` | Framework-switching docs |
| `plugins/zoto-eval-system/templates/runner/test.py.tmpl` | 62 | 1 — `/zoto-eval-create` | User-facing print message |
| `plugins/zoto-eval-system/templates/user-checklists/USER_EVAL_CHECKLISTS.md.tmpl` | 12–13, 28, 30, 51, 66, 80, 93, 103, 114, 118, 128 | ~15 — all eval commands | Heavy: step-by-step workflow guide |

#### Stamped evals in host repo (`evals/`)

| File | Lines | Occurrences | Notes |
|------|-------|-------------|-------|
| `evals/_llm/case.ts` | 207 | 1 — `/zoto-eval-update` | Error message (stamped from template) |
| `evals/_llm/update.ts` | 1249 | 1 — `/zoto-eval-create` | Error message (stamped from template) |
| `evals/_llm/README.md` | 5, 72, 92 | 3 — `/zoto-eval-update`, `/zoto-eval-create`, `/zoto-eval-compare` | Stamped README |
| `evals/_llm/manifest-snapshot.ts` | 7 | 1 — `/zoto-eval-configure` | JSDoc comment |
| `evals/_llm/runner-validate-enriched.test.ts` | 102 | 1 — `/zoto-eval-create` | Test fixture string |
| `evals/test_meta_invariants.py` | 211, 406 | 2 — `/zoto-eval-create` | User-facing skip/assertion messages |

---

### Subtask 06 — CRUX Rule Sync (crux-cursor-rule-manager)

#### CRUX-compressed files in the repo

| File | Source | Contains slash-command refs? |
|------|--------|------------------------------|
| `install.crux.md` | (standalone) | **No** — no `/zoto-spec-*` or `/zoto-eval-*` references |
| `.cursor/rules/crux-memories-integration.crux.mdc` | `.cursor/rules/crux-memories-integration.md` | **No** — no slash-command references |

**Conclusion for subtask 06:** Neither CRUX-compressed file references any slash command. If no source `.mdc` or `.md` rule edited in subtask 04 has a paired `.crux.mdc` / `.crux.md`, subtask 06 completes immediately with a "no candidates" status.

The rules that **will** be edited in subtask 04:
- `plugins/zoto-spec-system/rules/zoto-spec-system.mdc` — **no** paired CRUX file
- `plugins/zoto-eval-system/rules/zoto-eval-system.mdc` — **no** paired CRUX file
- `.cursor/rules/zoto-plugin-conventions.mdc` — **no** paired CRUX file (has no slash-command refs anyway)

**No CRUX regeneration is required.** Subtask 06 is a no-op.

---

## Out-of-Scope Surfaces (explicitly enumerated)

These were found in the sweep but are **not** slash-command references and must NOT be changed:

### Plugin folder/package identity paths

All references like `plugins/zoto-spec-system/...` and `plugins/zoto-eval-system/...` are **directory paths**, not slash commands. Dozens of files reference these. All out of scope.

### Plugin manifest names and marketplace entries

| File | Content | Why out of scope |
|------|---------|------------------|
| `.cursor-plugin/marketplace.json` | `"source": "plugins/zoto-spec-system"`, `"source": "plugins/zoto-eval-system"` | Package identity |
| `plugins/zoto-eval-system/package.json` | `"name": "@zoto-agents/zoto-eval-system"` | Package identity |

### Skill identifiers and agent identifiers

All `zoto-create-spec`, `zoto-execute-spec`, `zoto-judge-spec`, `zoto-create-evals`, `zoto-configure-evals`, etc. are **skill names** (directory names + frontmatter `name:` values). Similarly, `zoto-spec-generator`, `zoto-spec-executor`, `zoto-eval-configurer`, etc. are **agent names**. These are NOT renamed.

### Workspace-local config dirs

`.zoto/spec-system/`, `.zoto/eval-system/` — per plugin convention rule.

### Schema `$id` URLs

All `"$id": "https://zotoio.github.io/zoto-agents/schemas/zoto-eval-system/..."` and `"$id": "https://zotoio.github.io/zoto-agents/schemas/zoto-spec-system/..."` use the **plugin name** in the URL path. These are **not** slash-command prefixes and are out of scope.

### Import paths and module references

All `import { loadEvalConfig } from "../plugins/zoto-eval-system/src/config-loader.js"` and similar are TypeScript module paths, not command references.

### `pnpm --filter` references

All `pnpm --filter @zoto-agents/zoto-spec-system ...` are package-manager filter expressions.

### Analyser cache JSON

`.zoto/eval-system/cache/analyser/*.json` — regenerated on demand, not manually updated.

### Manifest files (runtime state)

`.zoto/eval-system/manifest.yml` and `.zoto/eval-system/manifest.history.yml` — these contain `path:` fields with directory paths (not slash commands) and some `description:` strings that embed `/zoto-eval-configure` etc. However, these are **runtime state** files regenerated by `/zoto-eval-create` and `/zoto-eval-update`. Per the spec's assumption #8, they do not need manual migration. The next `create` or `update` run will naturally emit the new canonical names once the source files (skills, commands, agents) are updated.

### Root `README.md`

Confirmed clean — contains only link paths like `[zoto-spec-system](plugins/zoto-spec-system/)` and shell examples like `cd plugins/zoto-spec-system`. No slash-command literals.

### Root `package.json`

Confirmed clean — no `/zoto-spec-*` or `/zoto-eval-*` literals.

### `evals/_runs/**`

Excluded per scope rules — runtime output.

### `specs/**`

Excluded per scope rules — historical artefacts.

---

## Surprises and Edge Cases

### 1. SVG `<text>` elements (5 files)

Five SVG files under `site/images/` contain slash commands inside `<text>` elements. All use simple text-anchor patterns with no path-based text rendering or complex transforms. Text replacement is safe. The shorter `/z-spec-*` names (5 fewer characters) will comfortably fit within existing viewBox dimensions.

Files: `workflow-overview.svg`, `agent-architecture.svg`, `execute-progress.svg`, `create-spec.svg`, `judge-output.svg`

### 2. Compiled `.mjs` hook files mirror `.ts` source

Both `zoto-session-start.mjs` and `zoto-eval-session-start.mjs` are compiled bundles that duplicate the `.ts` source. Both must be updated (or the `.mjs` must be regenerated from the `.ts` source after editing). Subtask 04 should update both directly since there's no build step configured for hooks in this repo.

### 3. `site/spec-system/index.html` line 380 — SVG `alt` text

The `alt` attribute for the architecture SVG image embeds `/zoto-spec-create`, `/zoto-spec-judge`, `/zoto-spec-execute` in a description string. This must be updated alongside the SVG itself.

### 4. `site/spec-system/design.html` line 913 — JSON example in `<code>`

The design page includes a JSON example with a `"additional_context"` field containing `/zoto-spec-create`. This is rendered HTML, not a code file.

### 5. `.zoto/spec-system/config.yml` — live workspace config

Line 70 contains a commented example with `/zoto-spec-create`. This file is workspace-local state but ships in the git repo. The template (`plugins/zoto-spec-system/templates/init-config.yml`) is the canonical source; the workspace copy should be updated to match.

### 6. `zoto-plugin-manager.md` omits `/zoto-spec-init`

Line 390 lists only three spec commands. The rewrite (subtask 04) should add `/z-spec-init` to the list.

### 7. `evals/_llm/runner-validate-enriched.test.ts` — test fixture

Line 102 contains a prompt string `/zoto-eval-create — bootstrap a fresh repo from scratch including baseline fixtures.`. This is a test case that should be updated to the new canonical form.

### 8. `plugins/zoto-eval-system/templates/user-checklists/USER_EVAL_CHECKLISTS.md.tmpl`

This template file contains ~15 slash-command references across a step-by-step workflow guide. All need updating to the short form.

---

## Verified-Clean Surfaces

The following were searched and confirmed to contain **no** `/zoto-spec-*` or `/zoto-eval-*` slash-command literals:

| Surface | Status |
|---------|--------|
| Root `README.md` | Clean |
| Root `package.json` | Clean |
| `.cursor-plugin/marketplace.json` | Clean (only plugin identity, no slash commands) |
| `install.crux.md` | Clean |
| `.cursor/rules/crux-memories-integration.crux.mdc` | Clean |
| `.cursor/rules/zoto-plugin-conventions.mdc` | Clean (only plugin dir paths) |
| `plugins/zoto-eval-system/src/config-loader.ts` | Clean |
| `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` | Clean (schema paths only) |
