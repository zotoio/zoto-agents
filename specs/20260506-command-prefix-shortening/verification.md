# Verification Report — Command Prefix Shortening

**Spec**: `20260506-command-prefix-shortening`  
**Subtask**: 07 — End-to-End Verification  
**Agent**: integrity-expert  
**Date**: 2026-05-06T22:03Z  

---

## 1. Validation Commands

| Command | Exit Code | Result |
|---------|-----------|--------|
| `node scripts/validate-template.mjs` | 0 | PASS (warnings only: no mcp.json for both plugins) |
| `node scripts/validate-skills.mjs` | 0 | PASS (12/12 skills valid) |
| `pnpm test` | 1 | FAIL — 7 test failures (see §1a) |

### 1a. Test Failures (7 total)

**`plugins/zoto-spec-system` — 6 failures:**

1. `Naming Convention > command files use zoto- prefix` — asserts all command files match `/^zoto-/`; fails on `z-spec-create.md`.
2. `Cross-References > commands reference an agent` — `zoto-spec-create.md` (now an alias stub) no longer contains inline agent reference.
3. `Cross-References > execute command references executor agent` — `zoto-spec-execute.md` alias stub does not contain `zoto-spec-executor`.
4. `Cross-References > create command references create skill` — `zoto-spec-create.md` alias stub does not contain `zoto-create-spec`.
5. `Cross-References > judge command references judge skill` — `zoto-spec-judge.md` alias stub does not contain `zoto-judge-spec`.
6. `Cross-References > execute command references execute skill` — `zoto-spec-execute.md` alias stub does not contain `zoto-execute-spec`.

**`plugins/zoto-eval-system` — 1 failure:**

7. `Naming Convention > command files use zoto- prefix` — asserts all command files match `/^zoto-/`; fails on `z-eval-advise.md`.

**Root cause**: The plugin test suites assume all command files begin with `zoto-` and that command files contain inline skill/agent references. After the rename, canonical files use `z-` prefix and alias files are thin stubs. The **tests need updating** to accommodate the new naming convention and alias delegation pattern.

---

## 2. File Count Verification

| Directory | Expected | Actual | Result |
|-----------|----------|--------|--------|
| `plugins/zoto-spec-system/commands/` | 8 (4 canonical + 4 alias) | 8 | PASS |
| `plugins/zoto-eval-system/commands/` | 18 (9 canonical + 9 alias) | 18 | PASS |

**Canonical files (z- prefix):**
- spec-system: `z-spec-create.md`, `z-spec-execute.md`, `z-spec-init.md`, `z-spec-judge.md`
- eval-system: `z-eval-advise.md`, `z-eval-compare.md`, `z-eval-configure.md`, `z-eval-create.md`, `z-eval-execute.md`, `z-eval-help.md`, `z-eval-init.md`, `z-eval-judge.md`, `z-eval-update.md`

**Alias files (zoto- prefix):**
- spec-system: `zoto-spec-create.md`, `zoto-spec-execute.md`, `zoto-spec-init.md`, `zoto-spec-judge.md`
- eval-system: `zoto-eval-advise.md`, `zoto-eval-compare.md`, `zoto-eval-configure.md`, `zoto-eval-create.md`, `zoto-eval-execute.md`, `zoto-eval-help.md`, `zoto-eval-init.md`, `zoto-eval-judge.md`, `zoto-eval-update.md`

---

## 3. Alias Quality Check

| Criterion | Result |
|-----------|--------|
| All alias files < 30 lines | PASS (all are 12 lines) |
| Uses "read and follow verbatim" delegation | PASS |
| No instruction duplication | PASS |
| `zoto-eval-help.md` uses askQuestion-aware idiom | PASS (delegates to canonical file which owns askQuestion) |
| `zoto-eval-advise.md` uses askQuestion-aware idiom | PASS (delegates to canonical file which owns askQuestion) |

All 13 alias files follow an identical pattern:
```
---
name: zoto-<type>-<action>
description: "Alias for /z-<type>-<action> — kept for back-compat..."
---
# zoto-<type>-<action> (alias)
> **Note**: Legacy name. Canonical is `/z-<type>-<action>`.
When invoked, **read `...z-<type>-<action>.md` and follow verbatim**.
```

---

## 4. Stale Reference Sweep

### 4a. `/zoto-spec-*` slash-command references (outside specs/**, pnpm-lock.yaml)

| File | Context | Classification |
|------|---------|---------------|
| `plugins/zoto-spec-system/commands/zoto-spec-*.md` | Alias files referencing legacy name | **Expected** |
| `plugins/zoto-spec-system/rules/zoto-spec-system.mdc` | Back-compat note | **Expected** |
| `plugins/zoto-spec-system/README.md` | Migration table | **Expected** |
| `plugins/zoto-spec-system/CHANGELOG.md` | Changelog entry | **Expected** |
| `plugins/zoto-spec-system/skills/*/evals/evals.json` | Alias eval cases | **Expected** |

### 4b. `/zoto-eval-*` slash-command references (outside specs/**, evals/_runs/**, pnpm-lock.yaml)

| File | Context | Classification |
|------|---------|---------------|
| `plugins/zoto-eval-system/commands/zoto-eval-*.md` | Alias files | **Expected** |
| `plugins/zoto-eval-system/rules/zoto-eval-system.mdc` | Back-compat note | **Expected** |
| `plugins/zoto-eval-system/README.md` | Migration table | **Expected** |
| `plugins/zoto-eval-system/CHANGELOG.md` | Changelog entry | **Expected** |
| `docs/zoto-eval-system.md` | Documents aliases | **Expected** |
| `plugins/zoto-eval-system/skills/*/evals/evals.json` | Alias eval cases | **Expected** |
| `plugins/zoto-eval-system/templates/static/jest/README.md` | `/zoto-eval-configure`, `/zoto-eval-create` (4+2 refs) | **Minor — template uses alias name** |
| `plugins/zoto-eval-system/templates/static/vitest/README.md` | `/zoto-eval-configure`, `/zoto-eval-create` (2+1 refs) | **Minor — template uses alias name** |
| `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/README.md` | `/zoto-eval-configure` (1 ref) | **Minor — template uses alias name** |

### 4c. Finding: Template README stale references

Three template README files still reference `/zoto-eval-configure` and `/zoto-eval-create` instead of the canonical `/z-eval-*` names. These are templates stamped into host repos. Functionally the alias names work, so this is a documentation consistency gap, not a runtime issue.

**Recommendation**: Update these 3 template README files to use `/z-eval-configure` and `/z-eval-create` as primary references.

---

## 5. Out-of-Scope Diff Guard

| Protected Surface | Changed? | Details |
|-------------------|----------|---------|
| Skill `name:` frontmatter fields | No | No `name:` diffs in any skill SKILL.md |
| Agent `name:` frontmatter fields | No | `zoto-eval-analyser-subagent.md` is a new file (not a rename) |
| `.cursor-plugin/marketplace.json` `plugins[].name` | No | Only `description` updated (from live-status spec) |
| `plugins/zoto-spec-system/.cursor-plugin/plugin.json` `name` | No | Only `version` + `description` (live-status spec) |
| `plugins/zoto-eval-system/.cursor-plugin/plugin.json` `name` | No | Only `version` + `description` (eval-system-v2 spec) |
| Root `package.json` | Modified | By eval-system-v2 spec (new scripts + deps), NOT by this spec |
| `pnpm-lock.yaml` | Modified | By eval-system-v2 spec, NOT by this spec |
| Historical specs (20260403, 20260406, 20260503, eval-adviser, live-status) | No content modifications | Only new files added by their own running specs |

**Result**: PASS — no out-of-scope modifications attributable to the command-prefix-shortening spec.

---

## 6. Doc Surface Spot-Check

| Surface | File | Canonical names used? |
|---------|------|----------------------|
| README | `plugins/zoto-spec-system/README.md` | Yes — `/z-spec-*` primary, migration table present |
| Rule | `plugins/zoto-spec-system/rules/zoto-spec-system.mdc` | Yes — `/z-spec-*` in command list |
| Site HTML | `site/spec-system/design.html` | Yes — all `/z-spec-*` references |

---

## 7. Summary & Verdict

### Passing checks
- ✅ `node scripts/validate-template.mjs` — exit 0
- ✅ `node scripts/validate-skills.mjs` — exit 0
- ✅ File counts correct (8 spec, 18 eval)
- ✅ Alias quality (delegation pattern, < 30 lines, no duplication)
- ✅ askQuestion-aware idiom for help/advise aliases
- ✅ Out-of-scope guard — no violations
- ✅ No stale unexpected references
- ✅ Doc surfaces updated to canonical names

### Failing checks
- ❌ `pnpm test` — 7 failures in plugin test suites

### Fix List (per Reviewer Non-Interference rule)

These fixes should be routed back to subtask 05 owner (schemas-and-evals):

1. **`plugins/zoto-spec-system/tests/plugin.test.ts`** — Update "Naming Convention > command files use zoto- prefix" test to allow both `zoto-` and `z-` prefixed command files (or adjust to expect `z-` as canonical).
2. **`plugins/zoto-spec-system/tests/plugin.test.ts`** — Update cross-reference tests to check canonical files (`z-spec-*.md`) for skill/agent references instead of alias files (`zoto-spec-*.md`).
3. **`plugins/zoto-eval-system/tests/plugin.test.ts`** — Update "Naming Convention > command files use zoto- prefix" test to allow `z-` prefixed canonical files.

Optional (non-blocking):

4. **Template README files** (3 files) — Update `/zoto-eval-configure` / `/zoto-eval-create` to canonical `/z-eval-*` names.

---

## Final Verdict: **CONDITIONAL FAIL**

The spec's rename logic is structurally correct (file counts, alias delegation, docs, rule updates all pass), but the existing plugin test suites were not updated to accommodate the new naming convention. 7 test assertions still enforce the old `zoto-` prefix constraint and expect inline skill/agent references in what are now thin alias stubs.

The fix is mechanical (adjust 2 test files), and the underlying feature works correctly. Routing fix list to subtask-05 owner per the Reviewer Non-Interference rule.
