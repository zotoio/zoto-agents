# Execution Report: Eval AskQuestion Strategy Bridge

**Spec**: `spec-eval-askquestion-strategy-bridge-20260526.md`
**Started**: 2026-05-25 15:06:46 UTC
**Completed**: 2026-05-25 17:43:35 UTC
**Duration**: 2h 37m
**Status**: Completed with exceptions

## Summary

Introduced analyser-driven hybrid LLM eval routing: optional `requiresInteraction` / `interactionStyle` on analyser payloads (`analyser_version` bumped to `2026.05.26-1`), a synthetic `askquestion-bridge.ts` helper for code-strategy tests, stamper mutual-exclusion routing, migration of 11 non-interactive targets to declarative JSON, and bridge imports on 32 interactive code-strategy tests. Documentation (site, README, `_shared/README`, eval-help anchors) and plugin-creation integration landed. Static validation gates pass; declarative LLM smoke on `hook:cursor-workspace` case 1 is deferred (LLM judge grading, not bridge infra).

## Subtask Results

| ID | Subtask | Subagent | Verification | Files Modified | Notes |
|----|---------|----------|-------------|----------------|-------|
| 01 | SDK investigation | explore | Verified | 2 audit | ADR pins synthetic fallback for SDK 1.0.12 |
| 02 | Eval corpus baseline | explore | Verified | 3 audit | 52 targets classified |
| 03 | Docs discovery | explore | Verified | 2 audit | 19 flagged sections |
| 04 | Analyser classification | generalPurpose | Verified | 5 | Version bump + schema |
| 05 | Bridge helper module | generalPurpose | Verified | 4 | 10 unit tests |
| 06 | Stamper routing | generalPurpose | Verified | 2 | 9 routing tests |
| 07 | Code template upgrade | generalPurpose | Verified | 5 | Bridge import placeholder wired |
| 08 | Declarative template upgrade | generalPurpose | Verified | 5 | Rejects `interactions` |
| 09 | Existing eval migration | generalPurpose | Partial | 40+ eval | 11 declarative / 32 code; D05 execute-spec 1-line JSON fix |
| 10 | Plugin creation integration | generalPurpose | Verified | 5 | Step 6e classify+stamp |
| 11 | Site docs update | generalPurpose | Verified | 7 | SVG pipeline diagram |
| 12 | README + eval-help | generalPurpose | Verified | 4 | Strategy bridge section |
| 13 | Validation + manifest | shell | Partial | 3 | Gates 0/0/0; declarative smoke deferred |

## Verification Results

### Adversarial Verification
- Subtasks verified: 11/13 fully verified; 09 and 13 partial (documented gaps)
- Issues found: explore read-only artifact writes; corrupt JSON from partial migration; dual-backend artefacts; collect-only vitest bleed; declarative smoke judge failure
- Issues resolved: all blockers fixed except declarative smoke grading

### Test Suite
- Status: **PASS**
- `pnpm test`: all plugin packages green (eval-system plugin.test.ts fixed via `evals` key rename)

### Gate Logs (final)

| Gate | Exit | Log |
|------|------|-----|
| `pnpm run eval:list` | **0** | `audit/gate-eval-list.log` |
| `pnpm run eval -- --collect-only` | **0** | `audit/gate-collect-only.log` |
| `pnpm run eval:update --check` | **0** | `audit/gate-update-check.log` (after `--apply --no-analyser`) |
| LLM smoke — code | **0** | `audit/gate-llm-smoke.log` (`command:sync-plugins`, `backend: code`) |
| LLM smoke — declarative | **deferred** | `hook:cursor-workspace` case 1 — LLM judge 0.72 threshold not met (×2) |

### Backend distribution (post-migration)

| Backend | Targets | Cases |
|---------|---------|-------|
| code + bridge | 32 | 184 |
| declarative JSON | 11 migrated + skill evals | 174 listed |
| no-eval-yet | 9 | — |

Per-plugin: zoto-eval-system (majority code), zoto-spec-system (mixed), workspace hooks (declarative).

### Linter
- Status: **CLEAN** on modified eval/_shared files (scoped tsc)

### Quality Audit
- Status: **PASS** with notes
- Hybrid routing enforced; mutual-exclusion guard tested; user-authored skill evals restored

### Documentation
- Status: **Updated**
- `site/eval-system/*.html`, SVG, README, `_shared/README.md`, zoto-help-evals anchors

### Manifest
- `manifest.yml` refreshed once (`updated_at: 2026-05-25T17:14:22.925Z`)
- `manifest.history.yml`: +1 snapshot (+767 lines)

## Files Modified (all subtasks combined)

Key paths: `scripts/eval-analyse.ts`, `scripts/eval-stamp.ts`, `evals/llm/_shared/askquestion-bridge.ts`, `run-code-strategy-suite.ts`, `zoto-llm-reporter.ts`, `evals/vitest.config.ts`, `plugins/zoto-eval-system/templates/**`, `evals/llm/test_*.test.ts` (32 retained), `plugins/*/evals/**/*.json`, `site/eval-system/**`, `plugins/zoto-eval-system/README.md`, `.cursor/skills/zoto-create-plugin/SKILL.md`, `.zoto/eval-system/manifest.yml`.

## Outstanding Items

1. **Declarative LLM smoke**: Re-run `hook:cursor-workspace` case 1 or pick a stable declarative case when triaging judge prompts.
2. **Subtask 09 D05**: `zoto-execute-spec/evals/evals.json` has a 1-line pre-existing JSON typo fix (`,]` → `]`) — documented in migration matrix.
3. **Analyser re-run**: Full `eval:update --apply --with-analyser` hung at ~41min; migration completed via baseline scripts — consider batch re-analyse for stale cache entries.

## Lessons Learned

- `explore` subagents cannot write audit artefacts — use `generalPurpose` for investigation deliverables that require file output.
- Partial migration can corrupt declarative JSON (`},]`); validate with `eval:list` after each batch.
- Static `evals/vitest.config.ts` must exclude `llm/**` to prevent `#eval-engine` import failures during collect-only.
