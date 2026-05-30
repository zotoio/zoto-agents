# Execution Report: Evals JSON-First Migration with `runner` Discriminator

**Spec**: `spec-evals-json-first-migration-20260527.md`
**Started**: 2026-05-29 09:06:41 UTC (resumed execution; spec originally launched 2026-05-27)
**Completed**: 2026-05-29 12:18:09 UTC
**Duration**: ~3h 11m (resume session; includes an interruption + reconciliation window)
**Status**: Completed

## Summary

The eval system was unified around a single JSON-first format for every non-skill primitive (commands, agents, hooks) and central JSON files, with a typed `runner` discriminator as the imperative-TypeScript escape hatch. All 38 co-located `.test.ts` LLM evals were migrated to `<name>.json` (0 skipped), a custom Vitest plugin loads the JSON suites in-memory (no disk shims), the orchestrator was consolidated onto the unified `evals/vitest.config.ts`, and the manifest schema now enforces `.json` for non-skill primitives. Skill `evals/evals.json` files were left on their fixed Cursor-spec shape.

## Subtask Results

| ID | Subtask | Subagent | Verification | Notes |
|----|---------|----------|--------------|-------|
| 01 | Schema + `RunnerParams` contract | generalPurpose | Verified | Unified JSON schema with `runner` discriminator; typed contract + JSON Schema. |
| 02 | Vitest JSON loader (Vite plugin) | generalPurpose | Verified | `resolveId`+`load` in-memory suites; skill `evals.json` excluded. |
| 03 | Harness runner dispatch | generalPurpose | Verified | `defineLlmEval` dynamically imports + invokes runner `.test.ts` default export. |
| 04 | Engine runner/update | generalPurpose | Verified (pass) | `engine/runner.ts` skips runner-only cases; update writes JSON. |
| 05 | Manifest schema | generalPurpose | Verified | `eval_files` constrained to `.json` (skills → `evals/evals.json`). |
| 06 | Vitest config + orchestrator | generalPurpose | Verified | Unified config; `eval:llm` removed; path-based reporter classifiers. |
| 07 | Migration script + execute | generalPurpose | Verified | 38/38 migrated, 0 failed, 0 skipped; manifest `eval_files` rewritten. |
| 08 | Stamper template cleanup | generalPurpose | Verified | TS template deleted; `eval-stamp.ts` writes `.json`. |
| 09 | Scenarios + docs | generalPurpose | Verified (this session) | Scenario example template + host file, README escape-hatch section, CHANGELOG, skill docs. |
| 10 | Final validation + CI | generalPurpose | Verified (after 2 fix-list rounds) | Validators + CI workflow; dead code removed; DOD06 drift cleared. |

## Verification Results

### Adversarial Verification
- Subtasks verified: 10/10 (each by a fresh `zoto-spec-judge` distinct from the executing agent).
- Issues found during verification: 2 rounds on subtask 10 — (1) partial verdict on open D06/D08 + status consistency; (2) executor-found DOD06 critical drift on 5 edited skill `SKILL.md` files.
- Issues resolved: both, via re-spawn of the originally-assigned `generalPurpose` subagent (single-owner provenance), each followed by fresh adversarial re-verification.

### Test Suite
- `pnpm test` (`pnpm -r test`): **PASS** — cursor-top 86/86, eval-system 128/128, spec-system 132/132.
- Full Vitest CI run (`CURSOR_API_KEY` unset): **PASS** — 951 passed / 270 skipped, exit 0; LLM cases skip gracefully.
- (Note: a single parallel-vitest invocation can flake on spec-system CLI integration timeouts; the canonical per-package `pnpm -r test` path is green.)

### Validators
- `node scripts/validate-template.mjs` → 0 (JSON-first hard-error gate active; planted-probe proven by judge).
- `node scripts/validate-skills.mjs` → 0 (13/13).
- `pnpm eval:update:check -- --no-analyser` → 0 (clean; `critical_count: 0`, `colocated_ts_eval_count: 0`, `layout_drift_count: 0`).
- `pnpm eval:list` → 0 (enumerates all migrated targets).

### Linter
- Status: CLEAN on modified files (per subtask status records).

### Quality Audit
- Covered by the 10 per-subtask adversarial verifications plus the onStop consistency gate. No outstanding correctness/consistency issues for this spec.

### Documentation
- Updated: eval-system README ("Advanced TS escape hatch" + `runner` example), CHANGELOG (BREAKING), refreshed skill docs.

### onStop Consistency Gate
- Spec `20260527-evals-json-first-migration`: **CLEAN** — `aggregate_state: completed`, all 12 DoD items mirrored as done, zero subtask mentions.
- (3 unrelated criticals remain for older specs `20260506` and `20260526` ×2 — out of scope for this execution.)

## Definition of Done — all 12 confirmed

| DoD | Evidence |
|-----|----------|
| DOD01 | All 10 subtasks `state: completed` with verified judge verdicts. |
| DOD02 | 0 residual co-located `*.test.ts` LLM evals. |
| DOD03 | 38 non-skill primitive `.json` evals present. |
| DOD04 | Migration audit: 38 discovered / 38 migrated / 0 skipped / 0 failed. |
| DOD05 | Unified-config Vitest run exits 0; LLM cases skip without `CURSOR_API_KEY`. |
| DOD06 | `eval:update:check` exit 0, zero critical drift. |
| DOD07 | `eval:list` exit 0, all targets enumerated. |
| DOD08 | validate-template (0), validate-skills (0), `pnpm test` (0). |
| DOD09 | README "Advanced TS escape hatch" section with `runner` example. |
| DOD10 | `evals/scenarios/_example-multi-primitive.test.ts` host file + template present; stamped by ensure-host. |
| DOD11 | CHANGELOG records the BREAKING JSON-first change (2026-05-27). |
| DOD12 | `manifest.schema.json` rejects non-`.json` non-skill entries (smoke test `plugin.test.ts:299`). |

## Files Modified (high level)

- **38 deleted** co-located `.test.ts` LLM evals; **38 created** co-located `.json` evals (`plugins/*/{commands,agents,hooks}/evals/`, `.cursor/{commands,agents,hooks}/evals/`).
- Engine/harness: `evals/llm/_shared/` (loader, runner-params, path-classifiers, run-llm-suite, reporter), `evals/vitest.config.ts`.
- Plugin engine: `plugins/zoto-eval-system/engine/{case,runner,update,manifest-snapshot}.ts`.
- Schemas: `templates/schema/{manifest,case,eval-file,runner-params,case-meta}.schema.json`.
- Scripts: `scripts/eval-migrate-ts-to-json.ts` (new), `scripts/eval-stamp.ts`, `scripts/eval-orchestrate.ts`, `scripts/validate-template.mjs`, `scripts/eval-ensure-host.ts`.
- Templates: scenario example + JSON eval templates; removed `templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`.
- CI: `.github/workflows/eval-format-check.yml` (consolidated).
- Docs: eval-system README, CHANGELOG, skill `SKILL.md` files + their `evals/evals.json`.
- Removed dead code: `scripts/bootstrap-llm-code-from-cache.ts` + `eval:bootstrap-llm-code` package script.
- Manifest: `.zoto/eval-system/manifest.yml` + `manifest.history.yml` rewritten to `.json` paths.
- ~163 non-spec files touched in total (working tree).

## Outstanding Items (follow-ups, not blocking)

1. **Updater UA-merge JSON validity** — `eval:update --apply` (UA + generated merge) emitted trailing-comma invalid JSON in 3 skill `evals.json`; repaired in-tree this session, but the engine merge itself should emit valid JSON. (Engine/subtask-04 territory.)
2. **Static stamper clobbering present config** — `writeVitestIfChanged` unconditionally overwrote the working-tree-only unified `evals/vitest.config.ts`; re-restored, but the stamper should respect a present/`_meta.generated`-marked config. (Stamper territory.)
3. **`eval:update --apply` (with analyser)** requires network reachability to the @cursor/sdk API-key exchange endpoint; the `--no-analyser` cached-payload path is the working fallback in offline/CI contexts.

## Lessons Learned

- On resume, filesystem reality and status files must be reconciled first: the migration artifacts already existed on disk while several status files still read `pending`.
- Editing covered skills' `SKILL.md` requires a follow-up `eval:update --apply` to refresh manifest content-hashes, or `eval:update:check` flags critical drift — this is part of the validation subtask's DoD, not an unrelated failure.
- Per-package `pnpm -r test` is the reliable signal; a single parallel Vitest invocation can flake on CLI integration timeouts.
