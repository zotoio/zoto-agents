# Audit — Rationalise Eval System (20260516)

## Summary

- Files reviewed: 169 tracked (149 modified, 20 deleted) + ~164 untracked run dirs + 63 untracked analyser cache files + 1 untracked workflow
- Coherent: 17     Cleanup: 8     Defect: 2     Blocker: 0

## Findings

### F-01 [coherent] [subtask 02]
**Path(s):** `evals/_llm/compare.ts`, `evals/_llm/metrics.ts`, `evals/_llm/runner.ts`, `evals/_llm/sdk-bridge.ts`, `evals/_llm/update.ts`, `evals/_llm/writer.ts`, `evals/_llm/manifest-snapshot.ts`, `evals/_llm/result.schema.json`, `evals/_llm/graders/common.ts`, `evals/_llm/graders/contains.ts`, `evals/_llm/graders/llm-judge.ts`, `evals/_llm/graders/regex.ts`, `evals/_llm/graders/tool-called.ts`
**Observation:** All 13 deleted files from `evals/_llm/` (engine modules + graders + schema) have confirmed counterparts at `plugins/zoto-eval-system/engine/` with equivalent exports:
- `runner.ts` → `plugins/zoto-eval-system/engine/runner.ts` ✓
- `sdk-bridge.ts` → `plugins/zoto-eval-system/engine/sdk-bridge.ts` ✓
- `update.ts` → `plugins/zoto-eval-system/engine/update.ts` ✓
- `writer.ts` → `plugins/zoto-eval-system/engine/writer.ts` ✓
- `manifest-snapshot.ts` → `plugins/zoto-eval-system/engine/manifest-snapshot.ts` ✓
- `compare.ts` → `plugins/zoto-eval-system/engine/compare.ts` ✓
- `metrics.ts` → `plugins/zoto-eval-system/engine/metrics.ts` ✓
- `case.ts` (full impl) → `plugins/zoto-eval-system/engine/case.ts` ✓
- `result.schema.json` → `plugins/zoto-eval-system/engine/result.schema.json` ✓
- `graders/common.ts` → `plugins/zoto-eval-system/engine/graders/common.ts` ✓
- `graders/contains.ts` → `plugins/zoto-eval-system/engine/graders/contains.ts` ✓
- `graders/llm-judge.ts` → `plugins/zoto-eval-system/engine/graders/llm-judge.ts` ✓
- `graders/regex.ts` → `plugins/zoto-eval-system/engine/graders/regex.ts` ✓
- `graders/tool-called.ts` → `plugins/zoto-eval-system/engine/graders/tool-called.ts` ✓

The engine directory additionally contains `index.ts`, `discovery-filters.ts`, `sandbox.ts`, `_user-case-guards.ts`, and `analyser-payload.ts` — all canonical.
**Recommended action:** No action needed — engine migration is complete.

### F-02 [coherent] [subtask 02]
**Path(s):** `evals/llm/_shared/_user-case-guards.ts`, `evals/llm/_shared/sdk-bridge.ts`, `evals/llm/_shared/graders/common.ts`, `evals/llm/_shared/graders/contains.ts`, `evals/llm/_shared/graders/llm-judge.ts`, `evals/llm/_shared/graders/regex.ts`, `evals/llm/_shared/graders/tool-called.ts`
**Observation:** 7 deleted files from `evals/llm/_shared/` — these were duplicated re-exports that are no longer needed because the code-strategy shared helpers now import directly from `#eval-engine/*` (the Vitest alias). The remaining `_shared/` files (`code-strategy-case.ts`, `run-code-strategy-suite.ts`, `sandbox-helpers.ts`, `setup.ts`, `zoto-llm-reporter.ts`) correctly import from `#eval-engine/*` or `../../_llm/sandbox.js`.
**Recommended action:** No action needed — deletion is coherent with Decision 3.

### F-03 [coherent] [—]
**Path(s):** `evals/_llm/case.ts`, `evals/_llm/_user-case-guards.ts`
**Observation:** Both are thin re-export shims as required by Decision 2:
- `case.ts` → `export * from "../../plugins/zoto-eval-system/engine/case.js";`
- `_user-case-guards.ts` → `export * from "../../plugins/zoto-eval-system/engine/_user-case-guards.js";`
**Recommended action:** None — shims are correct.

### F-04 [defect] [subtask 02]
**Path(s):** `evals/_llm/sandbox.ts`
**Observation:** This is a **full duplicate** (390 lines) of `plugins/zoto-eval-system/engine/sandbox.ts` — byte-identical per `diff`. Decision 2 states it should be either a thin re-export shim or deleted. It is consumed by:
- `evals/llm/_shared/sandbox-helpers.ts` (imports from `../../_llm/sandbox.js`)
- `evals/llm/_shared/setup.ts` (imports `resolveBaselineDir` from `../../_llm/sandbox.js`)
- Template-stamped code references `../../_llm/sandbox.js` in various templates
**Recommended action:** Convert to a thin re-export shim (`export * from "../../plugins/zoto-eval-system/engine/sandbox.js";`) or delete and update the 2 `_shared/` consumers to import from `#eval-engine/sandbox.js`. This is a **defect** because it violates Decision 1 (no duplicate engine module in host tree).

### F-05 [cleanup] [subtask 03]
**Path(s):** 8 template files under `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/`
**Observation:** Templates still import from `../../_llm/*` and `../../../_llm/graders/*`:
- `_shared/graders/tool-called.ts.tmpl` → `../../../_llm/graders/tool-called.js`
- `_shared/graders/regex.ts.tmpl` → `../../../_llm/graders/regex.js`
- `_shared/graders/contains.ts.tmpl` → `../../../_llm/graders/contains.js`
- `_shared/graders/llm-judge.ts.tmpl` → `../../../_llm/graders/llm-judge.js`
- `_shared/sdk-bridge.ts.tmpl` → `../../_llm/sdk-bridge.js`
- `_shared/sandbox-helpers.ts.tmpl` → `../../_llm/sandbox.js`
- `sandbox-helpers.ts.tmpl` → `../../_llm/sandbox.js`
- `setup.ts.tmpl` → `../../_llm/sandbox.js`

These work today because `evals/_llm/` still has shims or the duplicate `sandbox.ts`, but they should reference `#eval-engine/*` or the shim path for correctness post-cleanup. Since these are templates stamped to external host repos as well as this dogfood repo, the template import paths need careful consideration (external repos may have the `_llm/` tree stamped, so the templates are correct for them — the `_llm/` shim layer is what makes this work).
**Recommended action:** For this dogfood repo, no breakage occurs because the `_llm/` shims + alias exist. For external repos, the stamped `_llm/` tree is the correct import target. Mark as cleanup for subtask 03 to evaluate whether templates should switch to `#eval-engine/*` imports (which would require the alias in external repos' vitest configs too).

### F-06 [cleanup] [subtask 03]
**Path(s):** 4 template files under `plugins/zoto-eval-system/templates/static/`
**Observation:** Static templates also reference `_llm/`:
- `vitest/setup.ts.tmpl` line 30: `import { prepareSandbox } from "./_llm/sandbox.js";`
- `vitest/vitest.config.ts.tmpl` line 42: `"_llm/**"` (exclude pattern — benign)
- `jest/setup.ts.tmpl` line 25: `import { caseSlug, createSandbox } from "./_llm/sandbox.ts";`
- `pytest/per-primitive-test.py.tmpl` lines 17, 51, 224: references to `evals/_llm/types.py`
**Recommended action:** The static templates import from `_llm/sandbox.ts` which is correct for external host repos (they receive the stamped `_llm/` tree). The reference to `evals/_llm/types.py` in the pytest template is also correct for host repos. Cleanup priority: low. Subtask 03 should verify these remain correct and document the dual-path strategy.

### F-07 [coherent] [—]
**Path(s):** All `evals/llm/test_*.test.ts` files (37+ files)
**Observation:** No remaining `interface CaseDefinition` inline declarations. No imports from `../../_llm/*` outside allowed paths. All test files follow the shared harness pattern:
```
import type { CodeStrategyCaseDefinition } from "./_shared/code-strategy-case.js";
import { defineLlmCodeEval } from "./_shared/run-code-strategy-suite.js";
```
This is consistent with Decision 3.
**Recommended action:** None.

### F-08 [cleanup] [subtask 04]
**Path(s):** `evals/llm/test_command_z-eval-configure.test.ts` (line 60), `evals/llm/test_skill_zoto-configure-evals.test.ts` (line 24)
**Observation:** Two test files contain assertion text that references `evals/_llm/manifest-snapshot.ts` as a path:
- `"...readManifestSnapshot (via evals/_llm/manifest-snapshot.ts)..."`
- `"...readManifestSnapshot from evals/_llm/manifest-snapshot.ts..."`
These are string literals inside LLM test case prompts/assertions, not actual imports. The referenced module now lives at `plugins/zoto-eval-system/engine/manifest-snapshot.ts`. While these are just assertion text describing expected agent behaviour, they cite a stale path.
**Recommended action:** Update assertion text to reference `plugins/zoto-eval-system/engine/manifest-snapshot.ts` or the `#eval-engine/manifest-snapshot.js` alias. Low priority since these are prompt assertions and not code imports.

### F-09 [cleanup] [subtask 04]
**Path(s):** `evals/llm/test_agent_zoto-eval-judge.test.ts` (line 58)
**Observation:** Assertion text references `"Patch evals/_llm/case.ts grader wiring..."` — the module is now a thin shim. The assertion prompt instructs the agent to edit a shim, which may be misleading.
**Recommended action:** Update assertion text to reference the canonical engine path. Low priority.

### F-10 [cleanup] [subtask 04]
**Path(s):** `scripts/eval-analyse.ts` (line 1011), `scripts/eval-stamp.ts` (multiple lines), `scripts/eval-cleanup-stale.ts` (line 55, 321)
**Observation:** Comments in script files reference `evals/_llm/` paths:
- `eval-analyse.ts` line 1011: `"Canonical analyser types — imported from evals/_llm/analyser-payload.ts"`
- `eval-stamp.ts` lines 1940-2654: extensive comments referencing `evals/_llm/runner.ts`, `evals/_llm/_user-case-guards.ts`, `evals/_llm/cases.json`, etc.
- `eval-cleanup-stale.ts` lines 55, 321: comments referencing `evals/_llm/_user-case-guards.ts`
These are stale comment references — the modules have moved to `plugins/zoto-eval-system/engine/`.
**Recommended action:** Update comments to reference the canonical engine paths. Low priority (cosmetic). Subtask 04 should sweep these during the stale-reference cleanup.

### F-11 [cleanup] [subtask 04]
**Path(s):** `evals/setup.ts` (line 14), `evals/llm/_shared/setup.ts` (line 13), `evals/llm/_shared/sandbox-helpers.ts` (line 8), `evals/llm/_shared/code-strategy-case.ts` (lines 6, 8, 32, 66, 70)
**Observation:** Comments in these `_shared/` helper files and `evals/setup.ts` reference `evals/_llm/sandbox.ts`, `evals/_llm/runner.ts`, `evals/_llm/case.ts`, and `evals/_llm/_user-case-guards.ts` by the old paths. The actual imports are correct (they use `../../_llm/sandbox.js` which resolves to the shim/duplicate, or `#eval-engine/*` which resolves to the engine).
**Recommended action:** Update comments to reference canonical engine paths. Cosmetic priority.

### F-12 [cleanup] [subtask 04]
**Path(s):** ~37 `evals/llm/test_*.test.ts` files
**Observation:** All generated test files contain the comment: `evals/_llm/_user-case-guards.ts#isGeneratedFile(path, { strict: true })` (line 10). This is a documentation reference to the guard function, but the module is now a re-export shim. The comment is accurate in that the shim re-exports the same function, but the canonical implementation path has changed.
**Recommended action:** Update the template (`per-primitive-test.ts.tmpl`) to reference `plugins/zoto-eval-system/engine/_user-case-guards.ts` or `#eval-engine/_user-case-guards.js`. After template update, re-stamp will propagate. Low priority as the shim path still works.

### F-13 [defect] [subtask 02]
**Path(s):** `evals/_llm/sandbox.ts` (duplicate), `evals/llm/_shared/setup.ts`, `evals/llm/_shared/sandbox-helpers.ts`
**Observation:** Two `_shared/` files import from `../../_llm/sandbox.js`, which currently resolves to the full duplicate (F-04). This import chain works today but creates a hidden dependency on the duplicate:
- `evals/llm/_shared/setup.ts` line 23: `import { resolveBaselineDir } from "../../_llm/sandbox.js";`
- `evals/llm/_shared/sandbox-helpers.ts` line 25: `import { createSandbox, diffSnapshots, prepareSandbox, snapshotDir, ... } from "../../_llm/sandbox.js";`
If F-04's duplicate were converted to a shim, these imports would still work (re-exports). If deleted, they'd break. This is a dependent defect — it will resolve once F-04 is addressed.
**Recommended action:** When F-04 is fixed (convert to shim or delete), these imports must be updated to either `../../_llm/sandbox.js` (if shim remains) or `#eval-engine/sandbox.js` (if deleted). Track with subtask 02.

### F-14 [coherent] [subtask 05]
**Path(s):** `evals/_runs/` (164 directories, ~13 MB), `.zoto/eval-system/cache/analyser/` (63 files)
**Observation:** Large volume of untracked artefacts. The `.gitignore` does **not** currently cover either path:
- No `evals/_runs/` entry in `.gitignore`
- No `.zoto/eval-system/cache/` entry in `.gitignore`
- No `.zoto/` entry in `.gitignore`
The `.gitignore` change in this diff only adds `.ruff_cache/` — no eval-related additions.
**Recommended action:** Add `evals/_runs/` and `.zoto/eval-system/cache/` (or broader `.zoto/`) to `.gitignore`. Subtask 05.

### F-15 [coherent] [—]
**Path(s):** `.github/workflows/eval-cleanup-stale-check.yml`
**Observation:** New workflow is well-formed:
- Triggers on `pull_request` and `merge_group` — appropriate for a PR check
- Uses `concurrency` with `cancel-in-progress: true` — prevents duplicate runs
- Standard checkout → pnpm → node → install → run flow
- Invokes `pnpm run eval:cleanup-stale -- --check` — matches the script contract
- Uses `pnpm install --frozen-lockfile` — appropriate for CI
- No exit-code handling issues: `--check` mode exits 2 on stale assets, which correctly fails the step
**Recommended action:** None.

### F-16 [coherent] [—]
**Path(s):** `evals/llm/test_command_z-eval-execute.test.ts`, `evals/llm/test_command_z-eval-compare.test.ts`, `evals/llm/test_command_z-eval-configure.test.ts`
**Observation:** Spot-check of 3 modified test files confirms:
- All use `// _meta.generated: true` as first line
- All import from `./_shared/code-strategy-case.js` and `./_shared/run-code-strategy-suite.js`
- No inline `interface CaseDefinition` declarations
- No orphan imports from `../../_llm/*`
- Well-structured `CASES` array with proper assertion fields
**Recommended action:** None.

### F-17 [coherent] [—]
**Path(s):** `.zoto/eval-system/config.yml`, `.zoto/eval-system/manifest.yml`, `.zoto/eval-system/manifest.history.yml`
**Observation:**
- `config.yml`: Uncomments `model.id: composer-2.5` and `judgeModel: opus-4.6` — valid schema keys, values are known model identifiers
- `manifest.yml`: Updates `updated_at`, `git_ref`, and content hashes for several skills/targets. Description text for `zoto-compare-evals` is refined. All changes align with schema (no broken keys, no missing required fields)
- `manifest.history.yml`: Appends a new snapshot entry — standard append-only behaviour
**Recommended action:** None.

### F-18 [coherent] [—]
**Path(s):** `package.json`
**Observation:** Script mappings updated consistently:
- `eval:list` → `tsx plugins/zoto-eval-system/engine/runner.ts --list` ✓
- `eval:judge` → `tsx plugins/zoto-eval-system/engine/runner.ts --judge-only` ✓
- `eval:update` → `tsx plugins/zoto-eval-system/engine/update.ts` ✓
- `eval:update:check` → `tsx plugins/zoto-eval-system/engine/update.ts --check` ✓
- `eval:compare` → `tsx plugins/zoto-eval-system/engine/compare.ts` ✓
- `eval:llm:declarative` → `tsx plugins/zoto-eval-system/engine/runner.ts --full` ✓
- `eval:llm:code` → `vitest run --config evals/llm/vitest.config.ts` ✓ (unchanged, correct)
- `eval:cleanup-stale` → removes erroneous `-- --dry-run` default ✓
- New: `eval:bootstrap-llm-code` → `tsx scripts/bootstrap-llm-code-from-cache.ts`
- `eval:sandbox-selftest` → still points to `tsx evals/_llm/sandbox.selftest.ts` (selftest location is Decision 2 compliant)
**Recommended action:** None — internally consistent.

### F-19 [coherent] [—]
**Path(s):** `evals/_llm/sandbox.selftest.ts`, `evals/_llm/sandbox.smoke.ts`, `evals/_llm/sdk-bridge.selftest.ts`, `evals/_llm/_user-case-guards.test.ts`, `evals/_llm/runner-validate-enriched.test.ts`
**Observation:** All selftests/test harnesses have been updated to import from the canonical engine path (`../../plugins/zoto-eval-system/engine/*.js` or `../../plugins/zoto-eval-system/engine/*.ts`):
- `sandbox.selftest.ts`: imports from `../../plugins/zoto-eval-system/engine/sandbox.js` ✓
- `sandbox.smoke.ts`: imports from `../../plugins/zoto-eval-system/engine/sandbox.ts` ✓
- `sdk-bridge.selftest.ts`: imports from `../../plugins/zoto-eval-system/engine/sdk-bridge.ts` ✓
- `_user-case-guards.test.ts`: imports from `../../plugins/zoto-eval-system/engine/_user-case-guards.js` ✓
- `runner-validate-enriched.test.ts`: imports from `./case.js` (the shim) ✓
**Recommended action:** None — Decision 2 compliant.

### F-20 [coherent] [—]
**Path(s):** `evals/_llm/README.md`
**Observation:** README rewritten to reflect the new minimal scope. Documents the engine has moved to `plugins/zoto-eval-system/engine/`. Lists the remaining files accurately (selftests, types.py, shims, README).
**Recommended action:** None.

### F-21 [coherent] [—]
**Path(s):** `evals/llm/vitest.config.ts`
**Observation:** Vitest config correctly maps the `#eval-engine` alias to `plugins/zoto-eval-system/engine/`. Config is generated (`// _meta.generated: true`). Uses `setupFiles: ["./_shared/setup.ts"]`, appropriate test timeout and pool settings.
**Recommended action:** None.

### F-22 [coherent] [—]
**Path(s):** `evals/llm/_shared/zoto-llm-reporter.ts`
**Observation:** Modified (2 insertions, 2 deletions). Now imports `GraderReport` from `#eval-engine/graders/common.js` — consistent with Decision 3.
**Recommended action:** None.

### F-23 [coherent] [—]
**Path(s):** `.env.example`
**Observation:** Adds documentation for `ZOTO_EVAL_JUDGE_MODEL` and `ZOTO_EVAL_MODEL_ALIASES` environment variables. All lines are commented examples. No secrets.
**Recommended action:** None.

### F-24 [cleanup] [subtask 04]
**Path(s):** `.gitignore`
**Observation:** The only change is adding `.ruff_cache/`. No `evals/_runs/` or `.zoto/eval-system/cache/` entries were added.
**Recommended action:** See F-14 — add gitignore entries for untracked eval artefacts.

### F-25 [coherent] [—]
**Path(s):** `AGENTS.md`
**Observation:** Adds the "Eval Strategy for Agents" section documenting the `code` LLM eval strategy and the `eval:llm:code` entry point. Coherent addition aligned with the strategy switch.
**Recommended action:** None.

### F-26 [coherent] [—]
**Path(s):** 57 files under `plugins/zoto-eval-system/` (agents, commands, evals JSON, skills, templates, hooks, src, scripts, tests, package.json, plugin.json, CHANGELOG.md, README.md, rules)
**Observation:** Bulk plugin updates — skill descriptions refined, eval JSON cases updated with richer assertions, templates updated for code-strategy stamping, commands updated with needs_user_input patterns, agents updated with code-strategy references. No structural anomalies detected. These are routine evolution of the plugin.
**Recommended action:** None.

### F-27 [coherent] [—]
**Path(s):** `scripts/eval-analyse.ts`, `scripts/eval-cleanup-stale.ts`, `scripts/eval-discover.ts`, `scripts/eval-orchestrate.ts`, `scripts/eval-stamp.ts`, `scripts/__tests__/eval-cleanup-stale.test.ts`, `scripts/__tests__/eval-orchestrate.test.ts`, `scripts/__tests__/eval-stamp-llm-code.selftest.ts`, `scripts/__tests__/eval-update-guards.test.ts`
**Observation:** Script modifications support the engine migration. Import paths in actual code use the engine path correctly. Stale comments exist (covered by F-10). Tests are updated to match new APIs.
**Recommended action:** None (stale comments addressed separately in F-10).

## Blockers

None. No missing engine modules, no broken shims, no missing dependencies. Phase 2 can proceed.

The two defects (F-04, F-13) are correctness issues that subtask 02 should address, but they do not block Phase 2 because the current state is functionally correct (the duplicate works; consumers resolve correctly).

## Out-of-scope items found

1. **`.ruff_cache/` gitignore addition** — Python linter cache ignore added; unrelated to eval system rationalisation but benign.
2. **`evals/_llm/analyser.cache.selftest.ts`** — Present in the working tree but not listed in Decision 2's explicit selftest list. It appears to be a legitimate selftest for the analyser cache system. Suggest adding it to the Decision 2 allow-list or confirming it should remain.
3. **`evals/_llm/types.py`** — Listed in Decision 2 as "Python parity" file. Present in the working tree, unmodified. Coherent.
4. **`scripts/bootstrap-llm-code-from-cache.ts`** — New script added via package.json (`eval:bootstrap-llm-code`). Not in the git diff name-status (may be pre-existing or committed). No audit concern.
5. **Import path style inconsistency** — Selftests use bare relative paths (`../../plugins/zoto-eval-system/engine/sandbox.js`) while `_shared/` code-strategy helpers use the `#eval-engine/*` alias. Both work but create two conventions. Not a defect — the alias requires the vitest config, and selftests run standalone via `tsx`.
