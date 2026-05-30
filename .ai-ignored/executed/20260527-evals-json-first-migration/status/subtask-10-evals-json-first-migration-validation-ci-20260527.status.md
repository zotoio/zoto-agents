# Subtask 10 — evals-json-first-migration — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 10 |
| feature | evals-json-first-migration |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at | 2026-05-28T03:08:00Z |
| last_heartbeat | 2026-05-29T12:10:18.540Z |
| completed_at | 2026-05-29T11:33:10.283Z |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Run every relevant validator locally and capture results in the Work Log: (`specs/20260527-evals-json-first-migration/status/subtask-10-evals-json-first-migration-validation-ci-20260527.status.yml`)
- [x] **D02** — Tighten `scripts/validate-template.mjs`: (`scripts/validate-template.mjs`)
- [x] **D03** — Add a new CI workflow (or extend an existing one) under `.github/workflows/`: (`.github/workflows/eval-format-check.yml`)
- [x] **D04** — Update `.github/workflows/eval-update-check.yml` to additionally assert: (`.github/workflows/eval-format-check.yml`)
- [x] **D05** — Update `plugins/zoto-eval-system/tests/plugin.test.ts` (or add a new test file) with assertions that run as part of `pnpm test`: (`plugins/zoto-eval-system/tests/plugin.test.ts`)
- [x] **D06** — Clean up dead code referenced by earlier subtasks: (`evals/vitest.config.ts`)
- [x] **D07** — Update the spec status file: (`specs/20260527-evals-json-first-migration/spec-evals-json-first-migration-20260527.md`)
- [x] **D08** — Final smoke test of `/z-eval-create` end-to-end: (`scripts/eval-ensure-host.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **created** `.github/workflows/eval-format-check.yml` — Consolidated CI — validate-template, eval:update:check, Vitest JSON discovery.
- **modified** `scripts/validate-template.mjs` — enforceJsonFirstNoColocatedTsEvals() hard-errors on co-located TS evals.
- **modified** `plugins/zoto-eval-system/tests/plugin.test.ts` — JSON-first migration invariants describe (5 tests).
- **modified** `scripts/eval-ensure-host.ts` — ensureScenarioExample() idempotent scenario stamp.
- **modified** `evals/vitest.config.ts` — Re-restored unified JSON-loader config after the 2026-05-29 eval:update --apply rediscovery re-stamped the static template over it (writeVitestIfChanged overwrites unconditionally — see notes); reinstated #eval-engine resolve.alias, dual static+llm reporters/setups, and reworded the JSDoc bullet so the '**/evals/*.json' glob no longer emits a premature block-comment */ terminator.
- **modified** `evals/llm/_shared/zoto-create-plugin-suite.test.ts` — Expect .json stamp output instead of co-located .test.ts.
- **deleted** `scripts/bootstrap-llm-code-from-cache.ts` — Removed dead one-shot stamp-from-cache script (only referenced by package.json; superseded by eval:update apply rediscovery in JSON-first mode)
- **modified** `package.json` — Removed eval:bootstrap-llm-code script entry (dead code)
- **modified** `.zoto/eval-system/manifest.yml` — eval:update --apply --no-analyser refreshed covered-target content hashes, clearing the 5 critical skill-frontmatter drifts (configure/create/eval-tooling/help/update). eval:update:check --no-analyser now exits 0 (status clean, critical_count 0).
- **modified** `.zoto/eval-system/manifest.history.yml` — Append-only audit lines written by the eval:update --apply rediscovery pass.
- **modified** `plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json` — Generated cases regenerated from cached analyser payloads; 2 user-authored cases (ids 1,2) preserved verbatim. Repaired a trailing-comma ('},]') the updater's UA+generated merge emitted, which left invalid JSON; UA cases untouched.
- **modified** `plugins/zoto-eval-system/skills/zoto-create-evals/evals/evals.json` — Generated cases regenerated from cached analyser payloads; 3 user-authored cases (ids 1,2,3) preserved verbatim. Repaired a trailing-comma (',]') merge artifact that left invalid JSON; UA cases untouched.
- **modified** `plugins/zoto-eval-system/skills/zoto-eval-tooling/evals/evals.json` — Generated cases regenerated from cached analyser payloads (0 user-authored cases); JSON stayed valid (no trailing-comma artifact).
- **modified** `plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json` — Generated cases regenerated from cached analyser payloads; 4 user-authored cases (ids 1,2,3,4) preserved verbatim. Repaired a trailing-comma (',]') merge artifact that left invalid JSON; UA cases untouched.
- **modified** `plugins/zoto-eval-system/skills/zoto-update-evals/evals/evals.json` — Generated cases regenerated from cached analyser payloads; 3 user-authored cases (ids 1,2,3) preserved verbatim; JSON stayed valid (no trailing-comma artifact).
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Re-verification 2026-05-29: migration complete (0 co-located .test.ts).
Deleted duplicate eval-update-check.yml (consolidated into eval-format-check.yml).
eval:update --apply cleared skill drift; restored zoto-eval-tooling evals.json skill shape.
Vitest CI mode (CURSOR_API_KEY unset): 937 passed, 266 skipped, exit 0.
Re-spawn 2026-05-29 (judge partial fix-list):
- D06: removed dead scripts/bootstrap-llm-code-from-cache.ts + eval:bootstrap-llm-code
  package.json entry. The script's documented purpose (one-shot rematerialisation of
  co-located LLM test files) was completed by the JSON-first migration; it was referenced
  nowhere except package.json (no docs/CI/tests/other scripts). Remaining code-cursor-sdk
  references are all live (template root dir holding _shared/ + JSON templates) or
  intentional (plugin.test.ts asserting per-primitive-test.ts.tmpl is gone). Re-ran
  validate-template, plugin.test.ts (64/64) and eval:list after removal — all green.
- D08: recorded /z-eval-create create/ensure-host end-to-end smoke. Ran eval-ensure-host
  live in a fresh tempdir (exit 0): stamps .env.example, .gitignore, and the skipped
  scenario example; idempotent on re-run. Scenario present+skipped is also covered by the
  durable plugin.test.ts tempdir test; vitest json-loader wiring and manifest .json entries
  are asserted by the JSON-first invariant tests.
- D01: confirmed extra.tests_run already includes pnpm test, tsc --noEmit per TS root,
  eval:list, and the full vitest discovery run — accurate, kept done.
Re-spawn 2026-05-29 (DOD06 drift gap — eval:update:check exited 2 with 5 critical
skill-frontmatter drifts left by subtask 09's docs refresh):
- Resolved the documented way: `pnpm run eval:update -- --apply` first (key was set) but
  the @cursor/sdk analyser could not reach the API key exchange endpoint (network), so it
  crashed at init with no writes; fell back to `pnpm run eval:update -- --apply
  --no-analyser` (cached payloads), which refreshed the manifest content-hashes and
  regenerated _meta.generated cases. `eval:update:check --no-analyser` now exits 0
  (critical_count 0). Migration invariants stayed clean (colocated_ts_eval_count 0,
  layout_drift_count 0).
- User-authored cases preserved: configure=2 (ids 1,2), create=3 (1,2,3), eval-tooling=0,
  help=4 (1,2,3,4), update=3 (1,2,3) — identical before/after; updater logged
  "case-level guard skipped N non-generated case(s) — preserved verbatim" for each.
- FINDING 1 (updater serialization defect, out-of-scope to fix here): for the 3 skills
  whose evals.json prepends user-authored cases to the generated block (configure, create,
  help), the --no-analyser merge emitted a trailing comma before the array close ('},]' /
  ',]'), producing invalid JSON even though eval:update:check still reported "clean" (the
  check does not parse generated evals.json). Repaired surgically by removing the single
  trailing comma in each file (regex ',\\s*]\\s*}$' -> ']}'); all 30 generated eval JSON
  files now parse; UA cases byte-identical. The updater's UA+generated merge path should be
  fixed upstream (subtask 04 territory) so apply emits valid JSON for prepended-UA files.
- FINDING 2 (non-idempotent apply clobbers the unified vitest config): the rediscovery
  apply re-stamped the static vitest backend, and scripts/eval-stamp.ts#writeVitestIfChanged
  overwrites evals/vitest.config.ts UNCONDITIONALLY (it ignores the // _meta.generated
  marker), so it reverted the working-tree-only unified config to the static template and
  broke plugin.test.ts's 'unified vitest config' invariant. Re-restored the unified config
  (REPO_ROOT root, evalJsonLoader plugin, #eval-engine resolve.alias -> engine/, dual
  static+llm reporters/setups, include **/evals/*.test.ts + **/evals/*.json +
  scenarios/*.test.ts) and reworded the JSDoc bullet that contained the '**/evals/*.json'
  glob so it no longer closes the block comment with a stray '*/'. plugin.test.ts 64/64 and
  the full CI discovery run (951 passed / 270 skipped) confirm. Durable fix is to make the
  static vitest template embed the loader OR have the stamper preserve a present unified
  config (cross-subtask; documented as a risk, not fixed under this subtask's drift scope).
- Did NOT fabricate a judge verdict; left extra.judge as-is for fresh re-verification.
- Resolved token_budget 200000 recorded.

<!-- status:notes:end -->
