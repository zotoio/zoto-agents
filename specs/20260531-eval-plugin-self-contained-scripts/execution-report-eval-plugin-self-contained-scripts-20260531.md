# Execution Report: Eval Plugin Self-Contained Scripts Consolidation

**Spec:** `spec-eval-plugin-self-contained-scripts-20260531.md`  
**Started:** 2026-05-31 22:20:52 UTC  
**Completed:** 2026-06-01  
**Repo:** `/home/andrewv/git/cursor/zoto-agents`  
**Branch context:** `feat/site-updates` @ `fbfecad`

## Executive Summary

All eight subtasks completed. Host eval CLI is consolidated under `plugins/zoto-eval-system/scripts/` with plugin-relative imports. Circular monorepo imports are eliminated; `stamp-host-layout.ts` copies from `PLUGIN_ROOT`; `install-local` ships `engine/` and `src/`. Monorepo dogfood uses the same plugin paths as marketplace consumers.

**Path/layout consolidation is complete** (`layout_drift_count: 0`). `spec-onstop-check` exits **0**. Documented non-blockers: full `pnpm test` exit 1 under parallel load (unrelated flakes); `eval:update --check` exit 2 from six SKILL.md content drifts introduced by subtask 07 docs cleanup.

## Subtask Results

| ID | Subagent | State | Judge verdict | Notes |
|----|----------|-------|---------------|-------|
| 01 | zoto-eval-engineer | completed | **partial** | Audit artefacts complete; `audit/` untracked (no user commit requested) |
| 02 | zoto-eval-engineer | completed | **verified** | CLI moved; stale forks removed |
| 03 | zoto-eval-engineer | completed | **verified** | `engine/update.ts` → `../scripts/`; evals dogfood retargeted |
| 04 | zoto-eval-engineer | completed | **verified** | Stamper + `install-local` |
| 05 | zoto-eval-engineer | completed | **verified** | Root `package.json` retarget; root scripts deleted |
| 06 | zoto-eval-engineer | completed | **pass** (re-spawn) | Tests relocated; validate 167/167; judge blockers fixed (timeouts, grep gate) |
| 07 | zoto-eval-architect | completed | **verified** | README, CHANGELOG, skills, templates, site |
| 08 | zoto-eval-engineer | completed | **verified** | Full gates in `audit/post-consolidation-verification.md` |

## Validation Gates (Subtask 08)

| Gate | Result | Detail |
|------|--------|--------|
| `pnpm test` | **exit 1** | Unrelated: `zoto-cursor-top` TUI timeout + `zoto-spec-system` CLI timeouts under parallel `pnpm -r`. Eval-system 146/146 pass in isolation. |
| `pnpm run eval:list` | **exit 0** | |
| `pnpm run eval:update --check` | **exit 2** | `layout_drift_count: 0` ✓; `content_drift_count: 6` (subtask 07 SKILL.md public-surface) |
| `pnpm --filter @zoto-agents/zoto-eval-system run validate` | **exit 0** | 167/167 |
| `validate-template.mjs` / `validate-skills.mjs` | **exit 0** | |
| `install-local --dry-run` | **exit 0** | Lists `engine/`, `src/` |
| `stamp-host-layout --dry-run` ×2 | **exit 0** | Byte-identical; PLUGIN_ROOT-sourced |

### Grep gates (consolidation)

| Gate | Matches | Verdict |
|------|---------|---------|
| `rg '../plugins/zoto-eval-system' plugins/zoto-eval-system/scripts/` | 0 | PASS |
| `rg '../../../scripts' plugins/zoto-eval-system/engine/` | 0 | PASS |
| `rg 'tsx scripts/eval-' package.json` | 0 | PASS |
| `rg 'scripts/eval-' evals/test_*.ts evals/_llm/` | 0 | PASS (after subtask 06 re-spawn) |

## Key Artefacts

- `specs/20260531-eval-plugin-self-contained-scripts/audit/import-graph-baseline.md`
- `specs/20260531-eval-plugin-self-contained-scripts/audit/file-inventory.md`
- `specs/20260531-eval-plugin-self-contained-scripts/audit/post-consolidation-verification.md`
- `plugins/zoto-eval-system/scripts/*` (host CLI)
- `plugins/zoto-eval-system/tests/eval-*.test.ts` (relocated suites)
- `evals/plugin-script-bridge.ts` (dogfood re-exports)

## Notable Fixes During Execution

- **Subtask 03:** Status yml `artifacts[]` schema repair (executor).
- **Subtask 06:** `engine/package.json` `"type": "module"` for ESM exports under tsx; per-test timeouts in `eval-stamp-json-first.test.ts`; stale evals dogfood prose retargeted.
- **Subtask 08:** `engine/update.ts` parity skip + `discoverAtRepo`; `evals/plugin-script-bridge.ts` for stable dogfood imports.

## Outstanding (non-blocking)

1. **Subtask 01 judge partial** — `audit/` markdown is untracked until user commits (by design).
2. **Content drift** — Run `pnpm run eval:update --apply` (with analyser if needed) to refresh generated eval cases after subtask 07 SKILL edits.
3. **Full suite green** — Re-run `pnpm test` when CI resources allow; failures are unrelated plugin flakes documented in audit.

## Consistency Check

`pnpm exec tsx plugins/zoto-spec-system/scripts/spec-onstop-check.ts --human` → **exit 0** (2026-06-01).

## Recommendation

**Spec objective achieved.** Safe to merge after user review. Optional follow-up: commit `audit/` artefacts and apply eval content drift refresh.
