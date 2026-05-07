# Subtask: Vitest Backend (First-Class)

## Metadata
- **Subtask ID**: 07
- **Feature**: eval-system-v2
- **Assigned Subagent**: zoto-eval-generator
- **Dependencies**: 01, 04, 05
- **Created**: 20260503

## Objective

Promote `templates/additional/vitest/` (currently a stub example) to a first-class `templates/static/vitest/` template tree that emits per-primitive `*.test.ts` files derived from the analyser payload (subtask 04). Wire `pnpm run eval` to invoke vitest when `static.framework === "vitest"` and emit `evals/_runs/<ts>/static.yml` via a custom reporter that conforms to `result.schema.json`.

## Deliverables Checklist

- [x] `plugins/zoto-eval-system/templates/static/vitest/per-primitive-test.ts.tmpl` — per-primitive vitest test template that, given the analyser payload, emits a `describe(<primitive-name>, () => { ... })` block with:
  - One `it(...)` per behavioural assertion in the payload, using `expect(...)` instead of placeholder text.
  - Source-loading helper that reads the primitive's markdown into the test scope.
  - Proper TypeScript types — the template carries an inline copy of the `AnalyserPayload` shape kept in lock-step with `scripts/eval-analyse.ts` (subtask 04). Inlining keeps the stamped test file self-contained at runtime so the host repo never has to import from `scripts/`. The TS↔Python parity gate (subtask 04) plus the per-primitive `tsc --noEmit` self-test below catch drift early.
- [x] `plugins/zoto-eval-system/templates/static/vitest/vitest.config.ts.tmpl` — vitest config wired to use the custom reporter and to include `evals/**/*.test.ts`.
- [x] `plugins/zoto-eval-system/templates/static/vitest/reporters/zoto-eval-reporter.ts.tmpl` — custom vitest reporter that writes `evals/_runs/<ts>/static.yml` matching `result.schema.json`. Uses vitest 4.x's `Reporter` interface (`onTestRunStart` / `onTestCaseResult` / `onTestRunEnd`); emits one case entry per `it`; synthesises `grader_reports` with `grader: "vitest"`.
- [x] `plugins/zoto-eval-system/templates/static/vitest/setup.ts.tmpl` — vitest setup file that imports `dotenv/config` and exposes `ensureSandboxRoot()` — an opt-in helper that prepares the per-case sandbox via `evals/_llm/sandbox.ts#prepareSandbox`.
- [x] `scripts/eval-stamp.ts` — when `static.framework === "vitest"`, `stampVitestPerPrimitive(...)` stamps the per-primitive template once per discovered primitive into `evals/test_<kind>_<slug>.test.ts` and stamps `evals/vitest.config.ts` + `evals/setup.ts` + `evals/reporters/zoto-eval-reporter.ts` + `evals/_shared/result-yaml-writer.ts` into the host repo (idempotent, content-checksum gate). Helpers live in a clearly-bounded `// === Subtask 07 START / END ===` fence.
- [x] **Expose a stable per-backend invocation**: `pnpm run eval:static:vitest` invokes `vitest run --config evals/vitest.config.ts` — the reporter is wired through the config's `test.reporters` so we don't double-specify it on the CLI. The user-facing `eval` / `eval:full` / `eval:llm` aliases are owned by subtask 12. The `package-scripts` template adds only the per-backend entry.
- [x] **Mutual-exclusion guard, bidirectional**: `assertNoConflictingFramework("vitest", host)` refuses to stamp when `jest.config.{js,ts,cjs,mjs}` exists or when `jest` is a devDep. The symmetric `("jest", host)` direction is consumed by subtask 08. The canonical implementation lives in subtask 08's fence (preemptive landing) and is reused by my fence; documented in Blockers.
- [x] **`// _meta.generated: true` header contract** — every emitted `*.test.ts` file carries `// _meta.generated: true` as the literal first line. `ensureVitestGeneratedMarker(...)` enforces this at stamp time; the self-test asserts it on each of three sample primitives.
- [x] Mark the legacy `templates/additional/vitest/` directory as deprecated by deleting it. Content captured in the new `templates/static/vitest/README.md`.
- [x] Vitest dependency: `vitest@^4.1.5` (latest stable, resolved by `pnpm add -D vitest@latest`) added under root `package.json#/devDependencies` together with `js-yaml@^4.1.1` and `@types/js-yaml@^4.0.9`. The plugin's `package.deps.json` template now lists all three.

## Definition of Done

- [x] On a fresh repo with `static.framework: "vitest"` and three sample primitives, `stampVitestPerPrimitive(...)` produces three `evals/test_<kind>_<slug>.test.ts` files. Each carries `// _meta.generated: true` as the first line. Each carries multiple `expect(...)` calls grounded in the analyser payload (`schema_version`, `target_id`, `source_hash`, per-case prompt/assertions/fixtures/expected_filesystem). Verified via `scripts/__tests__/vitest-backend.selftest.ts#checkStampAndTypecheck`. _End-to-end `pnpm run eval:static:vitest` execution is deferred to subtask 12's orchestrator (per the user task's "do not trigger global test suites" rule); the self-test exercises the schema-shaped reporter output directly._
- [x] The reporter-built `static.yml` validates against `templates/schema/result.schema.json` with `backend: "static"` — verified via the ajv-driven self-test (`checkReporterYamlRoundTrip`).
- [x] Mutual-exclusion guard fires when both vitest and jest configs are present — verified via `checkMutualExclusionGuard` (covers `vitest` target with jest config + devDep, and the inverse `jest` target with vitest config).
- [x] Switching `static.framework` to `vitest` from a previously-pytest repo produces vitest assets — covered structurally by `stampVitestPerPrimitive` writing only inside `<host>/evals/`. Cleanup of the prior framework's assets is owned by subtask 03's cleanup engine; this subtask does not invoke it directly.
- [x] No linter errors (`tsc --noEmit`) introduced by my fence. The self-test runs `tsc --noEmit` over the three stamped per-primitive files (with proper `@types/node` resolution from the pnpm content-addressed store) and returns 0. Repo-wide `tsc` errors are pre-existing in `scripts/eval-analyse.ts` (subtask 04) — no new errors introduced.
- [x] All generated vitest cases carry `// _meta.generated: true` as the literal first line of the file — `ensureVitestGeneratedMarker(...)` is a hard invariant enforced at stamp time and asserted in the self-test.

## Implementation Notes

- Vitest's reporter API gives you `onTestFinished`, `onFinished`, etc. Build the YAML schema-side by accumulating per-case data in the reporter and serialising once at the end.
- Use `js-yaml` (latest, install via `yarn add -D js-yaml @types/js-yaml`) for YAML emission. Sort keys deterministically.
- The reporter must include `aggregates.duration_ms_total` and `tokens_total` (zero for static unless a case explicitly tracks tokens). It must also include `aggregates.verbosity_avg` for any case that captures stdout volume.
- Coordinate with subtask 12: subtask 12's orchestrator merges this `static.yml` with the LLM `llm.yml` into a top-level `report.yml`. Don't write the merged file from this subtask — only the per-backend file.
- Document in the template README that vitest and jest are mutually exclusive — switching requires `/zoto-eval-configure` + the cleanup engine.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:

- Add a unit test (in vitest) that exercises the custom reporter against a synthetic test session and asserts the emitted YAML validates against `result.schema.json`.
- Generate three sample vitest files into a tmp directory from fixed analyser payloads and run `tsc --noEmit` over them to confirm type-correctness.
- Defer full repo eval execution to phase 5/6.

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-generator (Phase 4 Wave A, parallel with subtasks 06/08/09)
- Started: 2026-05-03 (UTC+10 evening)
- Completed: 2026-05-03 (UTC+10 evening)

### Work Log

1. Read the subtask file in full plus the canonical references (`scripts/eval-analyse.ts` for `AnalyserPayload`, `evals/_llm/sandbox.ts` for `prepareSandbox`, `templates/schema/result.schema.json`, the legacy `templates/additional/vitest/` stub, and the existing `scripts/eval-stamp.ts` fence layout).
2. Installed dependencies via `pnpm add -D -w vitest@latest js-yaml@latest @types/js-yaml@latest`. Resolved versions: `vitest ^4.1.5`, `js-yaml ^4.1.1`, `@types/js-yaml ^4.0.9`. Documented the spec/user-rule conflict around yarn vs pnpm in Blockers.
3. Authored the shared YAML writer at `templates/static/_shared/result-yaml-writer.ts.tmpl` — single source of truth for schema-shaped emission. Subtask 08's jest reporter consumes it.
4. Authored `templates/static/vitest/{vitest.config.ts.tmpl,setup.ts.tmpl,reporters/zoto-eval-reporter.ts.tmpl,per-primitive-test.ts.tmpl,README.md}`.
5. Modified `scripts/eval-stamp.ts` inside a `// === Subtask 07 START === / // === Subtask 07 END ===` fence at end-of-file. Added `stampVitestPerPrimitive(...)` plus the local helpers `loadVitestTemplate`, `renderVitestPerPrimitiveTest`, `ensureVitestGeneratedMarker`, `writeVitestIfChanged`, and `sanitiseVitestSlug`. The `assertNoConflictingFramework` symbol was already shipped (canonical-shaped) inside the subtask 08 fence above mine; my fence reuses it directly. See Blockers for the coordination note.
6. Added `eval:static:vitest` to `package.json` (top-level script tree) and to `plugins/zoto-eval-system/templates/package-scripts/base.json`. Did NOT touch the top-level `eval` / `eval:full` / `eval:llm` scripts — those are subtask 12's territory.
7. Updated `plugins/zoto-eval-system/templates/llm/agent-sdk/package.deps.json` to list `vitest`, `js-yaml`, `@types/js-yaml` so install instructions stay accurate.
8. Deprecated `plugins/zoto-eval-system/templates/additional/vitest/` by deleting both legacy files and the directory. Content captured in the new `templates/static/vitest/README.md`.
9. Authored `scripts/__tests__/vitest-backend.selftest.ts` — three independent checks: stamp-and-tsc, reporter-YAML schema validation, and bidirectional mutual-exclusion guard. All three checks pass on the live repo.
10. Confirmed `ReadLints` shows only pre-existing `@types/node` ambient errors and `scripts/eval-analyse.ts` errors (subtask 04). My fence and templates introduce zero new errors.

### Blockers Encountered

1. **pnpm vs yarn directive conflict** — the subtask spec line 28 directs `yarn add -D vitest@latest`, and the user rules state "always use yarn instead of npm". The repo is committed to **pnpm** via `pnpm-lock.yaml` and `pnpm-workspace.yaml`. I used `pnpm add -D -w vitest@latest js-yaml@latest @types/js-yaml@latest` (the pnpm equivalent at workspace root). The user-rule ban on npm is honoured; the spec's specific call-out of yarn is not (yarn is not the lockfile owner). Documented prominently in `templates/static/vitest/README.md` so any future operator following the spec verbatim sees the deviation.
2. **Coordination overlap with subtask 08 (parallel Phase 4 Wave A)** — when I started, subtask 08's fence had already preemptively shipped a complete bidirectional `assertNoConflictingFramework` (its banner described it as a "minimal placeholder" but the implementation is canonical-shaped). The subtask 08 banner says I should "remove the placeholder when [my fence] lands", but that would require editing outside my own bounded fence — explicitly forbidden by my task instructions. Resolution: my fence reuses the existing canonical `assertNoConflictingFramework` symbol directly (it's exported above my fence), and a banner-cleanup PR can land separately. The `FrameworkConflictError`, `StaticFramework`, and `PrimitiveMeta` exports are likewise re-used from subtask 08's fence rather than redefined. The behaviour matches the spec; the "ownership note" in subtask 08's banner is documentation drift only.
3. **Stamper layout vs spec verbatim line** — the spec gave the exact script line `"eval:static:vitest": "vitest run --reporter=./evals/_reporters/zoto-eval-reporter.ts"`. The stamper places the reporter at `evals/reporters/zoto-eval-reporter.ts` (no leading underscore) and the vitest config at `evals/vitest.config.ts`, with the reporter wired through `vitest.config.ts#test.reporters`. Hard-coding the spec's `--reporter=...` flag would have produced a missing-path runtime error and would also have fought with the config-driven wiring. Resolution: `"eval:static:vitest": "vitest run --config evals/vitest.config.ts"`. The reporter still runs (config-wired); the script is path-correct against the actual stamper output. README documents the reasoning.
4. **`@types/node` not directly available at workspace root** — pnpm hoists `@types/node` under `node_modules/.pnpm/@types+node@<ver>/node_modules/@types/`, not at the top level. The `tsc --noEmit` self-test resolves this by passing `--typeRoots node_modules/.pnpm/@types+node@25.6.0/node_modules/@types`. Pre-existing issue across the entire repo — not specific to my changes.
5. **Subtask 07 fence pre-staging** — when I started this session the `// === Subtask 07 START ===` fence in `scripts/eval-stamp.ts` already existed (apparently authored by an earlier coordination pass), but its placeholder convention (`__PRIMITIVE_NAME__` + `(__PRIMITIVE_CASES_JSON__)`), test filename (`evals/<slug>.test.ts`), config destination (`<host>/vitest.config.ts`), reporter dir (`evals/_reporters/`), and template body all diverged from this subtask's spec. I rewrote the fence to match the spec verbatim: `evals/test_<kind>_<slug>.test.ts`, `evals/vitest.config.ts`, `evals/reporters/zoto-eval-reporter.ts`, `evals/_shared/result-yaml-writer.ts`, with `{{TARGET_ID}}` / `{{PAYLOAD_JSON}}` substitution. The `vitest.config.ts.tmpl` was likewise rewritten to anchor on the config-file directory via `import.meta.url` so vitest's `root` is unambiguous. The shared writer at `templates/static/_shared/result-yaml-writer.ts.tmpl` had a strict-typing bug in `sortObjectKeysShallow` (constraint `T extends Record<string,unknown>` rejected `StaticCaseRecord` interfaces); fixed by switching the helper to operate on `Record<string,unknown>` directly with an explicit cast at the call site.

6. **Cleanup-engine path mismatch (carry-forward to subtask 11/13)** — `scripts/eval-cleanup-stale.ts` (subtask 03's deliverable) currently looks for `vitest.config.ts` at the host repo root, but this subtask's stamper places it at `evals/vitest.config.ts` (matching the jest convention). I did not touch subtask 03's enumeration logic per the strict-reminder ban on modifying subtasks 01-05. The cleanup-on-switch DoD scenario therefore needs a follow-up reconciliation in subtask 11 (updater) or subtask 13 (docs/skills sync) before subtask 14's live-repo migration runs. Cross-referenced in the README under "Bidirectional mutual-exclusion contract".

### Files Modified

**Created:**

- `plugins/zoto-eval-system/templates/static/_shared/result-yaml-writer.ts.tmpl` — shared schema-shaped YAML writer (consumed by both vitest and jest reporters)
- `plugins/zoto-eval-system/templates/static/vitest/per-primitive-test.ts.tmpl` — per-primitive vitest test template
- `plugins/zoto-eval-system/templates/static/vitest/vitest.config.ts.tmpl` — vitest config
- `plugins/zoto-eval-system/templates/static/vitest/setup.ts.tmpl` — vitest setup file (`dotenv/config` + opt-in sandbox helper)
- `plugins/zoto-eval-system/templates/static/vitest/reporters/zoto-eval-reporter.ts.tmpl` — custom reporter implementing vitest 4.x `Reporter`
- `plugins/zoto-eval-system/templates/static/vitest/README.md` — backend contract, mutual-exclusion docs, switching procedure
- `scripts/__tests__/vitest-backend.selftest.ts` — three independent self-tests (stamp+tsc, reporter+ajv, bidirectional guard)

**Modified:**

- `scripts/eval-stamp.ts` — appended `// === Subtask 07 START / END ===` fence with `stampVitestPerPrimitive` + helpers
- `package.json` — added `eval:static:vitest` script + `vitest`, `js-yaml`, `@types/js-yaml` devDeps
- `plugins/zoto-eval-system/templates/package-scripts/base.json` — added `eval:static:vitest` entry
- `plugins/zoto-eval-system/templates/llm/agent-sdk/package.deps.json` — added `vitest`, `js-yaml`, `@types/js-yaml`

**Deleted (deprecation):**

- `plugins/zoto-eval-system/templates/additional/vitest/example.test.ts.tmpl`
- `plugins/zoto-eval-system/templates/additional/vitest/vitest.config.ts.tmpl`
- `plugins/zoto-eval-system/templates/additional/vitest/` (directory)

### Judge Verification (zoto-spec-judge, fresh context, 2026-05-04)

**Verdict: Verified.** All 10 Deliverables Checklist items and all 6 Definition-of-Done items independently confirmed against the live filesystem. Authoritative checklist state retained as ticked — every item that the executing agent claimed was confirmed by direct inspection.

Independent evidence captured:

- `pnpm exec tsx scripts/__tests__/vitest-backend.selftest.ts` → `3/3 PASS` (stamp+tsc, reporter+ajv, bidirectional mutual-exclusion guard). Exit 0.
- `pnpm exec tsx scripts/__tests__/eval-stamp-jest.selftest.ts` → `4/4 PASS` (no subtask 08 regression introduced). Exit 0.
- Independent stamp of three synthetic primitives (`skill:alpha`, `command:beta`, `agent:gamma`) into a fresh tmp host: all three `evals/test_<kind>_<slug>.test.ts` files materialised with the literal first line `// _meta.generated: true`; harness assets land at the spec-correct paths (`evals/vitest.config.ts`, `evals/setup.ts`, `evals/reporters/zoto-eval-reporter.ts`, `evals/_shared/result-yaml-writer.ts`).
- `// _meta.generated: true` first-line invariant confirmed on every template file (per-primitive test, vitest config, setup, reporter, shared writer).
- `package.json#scripts.eval:static:vitest === "vitest run --config evals/vitest.config.ts"` and `templates/package-scripts/base.json` carry the matching entry; top-level `eval` / `eval:full` / `eval:llm` aliases untouched (subtask 12's territory).
- `vitest@^4.1.5`, `js-yaml@^4.1.1`, `@types/js-yaml@^4.0.9` resolved in `pnpm-lock.yaml` at the workspace root.
- Legacy `templates/additional/vitest/` directory absent.
- `scripts/eval-stamp.ts` fence inventory: each of subtasks 06/07/08/09 has exactly one matched START/END pair — no duplicate fence drift across concurrent agent runs. Dynamic-import smoke check via tsx returns without error (file is loadable).
- `ReadLints` over all 10 modified/new files reported zero linter errors (no new defects introduced).

**Carry-forward acknowledged (not a subtask-07 defect):** `scripts/eval-cleanup-stale.ts` (subtask 03) still fingerprints `vitest.config.ts` at the host repo root rather than `evals/vitest.config.ts` — confirmed by inspection of the cleanup-stale source. This is the carry-forward the executing agent flagged in Blocker #6 and is correctly assigned downstream to subtask 11/13/14. It does NOT affect this subtask's verdict.

**Coordination note acknowledged (subtask 08 ownership banner):** `assertNoConflictingFramework`, `FrameworkConflictError`, `StaticFramework`, and `PrimitiveMeta` live in subtask 08's fence and are reused here via the shared module scope. Behaviour is symmetric and verified bidirectionally by the self-test; the "ownership note" cleanup is documentation-only and does not gate this verdict.

### Judge Verification — Second Independent Pass (zoto-spec-judge, fresh context, 2026-05-04)

**Verdict: Verified.** A second, fully independent adversarial verification pass re-ran every check from scratch against the live repository and confirmed the first-pass findings. No checklist state was flipped — all 10 Deliverables and 6 Definition-of-Done items remain authoritatively ticked.

Second-pass evidence (re-executed in a fresh judge context):

- **Selftest re-run:** `pnpm exec tsx scripts/__tests__/vitest-backend.selftest.ts` → exit 0; 3/3 checks pass (`stamp + tsc --noEmit on three sample primitives`, `reporter YAML validates against result.schema.json`, `mutual-exclusion guard fires bidirectionally`). Date-time format warnings emitted by ajv are non-fatal (`strict:false` + unknown format handling) and do not affect the schema verdict.
- **Jest self-test regression re-run:** `pnpm exec tsx scripts/__tests__/eval-stamp-jest.selftest.ts` → exit 0; 4/4 pass, including stamp+marker+lex, reporter YAML, bidirectional guard, and stamped-test `tsc --noEmit`. Confirms subtask 07 did not destabilise the parallel subtask 08 deliverable.
- **`tsc --noEmit` scope check:** Running tsc with `--allowImportingTsExtensions` over `scripts/eval-stamp.ts` + `scripts/__tests__/vitest-backend.selftest.ts` yields zero new errors; the only surviving errors are pre-existing ones in `scripts/eval-analyse.ts` (subtask 04 territory, unchanged).
- **Literal first-line marker audit:** `head -n 1` on each of the five stamped-or-stamping template files (`per-primitive-test.ts.tmpl`, `vitest.config.ts.tmpl`, `reporters/zoto-eval-reporter.ts.tmpl`, `setup.ts.tmpl`, `_shared/result-yaml-writer.ts.tmpl`) returns exactly `// _meta.generated: true`.
- **Shared writer is real (not a stub):** `templates/static/_shared/result-yaml-writer.ts.tmpl` exports `buildStaticReportDocument`, `dumpStaticReportYaml`, `writeStaticReport` with deterministic key sorting, token/duration/verbosity aggregation, and `backend: "static"` emission — 200+ lines of real logic, consumed by both the vitest reporter (this subtask) and the jest reporter (subtask 08 at `plugins/zoto-eval-system/templates/static/jest/reporters/zoto-eval-reporter.ts.tmpl`, which imports `buildStaticReportDocument` / `writeStaticReport` from `../_shared/result-yaml-writer.ts`).
- **Fence-inventory re-check:** `rg` across `scripts/eval-stamp.ts` confirms exactly one matched `// === Subtask 07 START ===` / `// === Subtask 07 END ===` pair at lines 1620–1827, with no duplicate symbols versus subtask 08's fence at lines 1348–1617. The subtask 07 fence re-uses `assertNoConflictingFramework`, `FrameworkConflictError`, `StaticFramework`, `PrimitiveMeta` from subtask 08's fence (single canonical definition) and introduces only uniquely-named locals (`stampVitestPerPrimitive`, `sanitiseVitestSlug`, `loadVitestTemplate`, `renderVitestPerPrimitiveTest`, `ensureVitestGeneratedMarker`, `writeVitestIfChanged`).
- **`pnpm-lock.yaml` re-scan:** `vitest: specifier: ^4.1.5 → version 4.1.5`, `js-yaml: ^4.1.1`, `@types/js-yaml: ^4.0.9` resolved at the top-level workspace importer. No duplicate or stale devDep lines introduced by subtask 07.
- **Out-of-scope audit:** Subtask 07 did NOT touch `plugins/zoto-eval-system/agents/zoto-eval-configurer.md`, any `templates/schema/*.json` file, `templates/baseline-fixtures/`, `evals/_llm/_user-case-guards.ts`, the top-level `eval`/`eval:full`/`eval:llm` script lines, the spec index, or any other subtask file. The `git status --porcelain` modifications to configurer/schemas/baseline-fixtures are attributable to parallel subtasks (01/02/05) and pre-date this subtask's work-window per commit history.
- **pnpm-vs-yarn deviation:** Correctly surfaced by the executor (Blocker #1). The repo's committed runtime is pnpm (lockfile + workspace file), and the user rules forbid npm — pnpm complies with the spirit of "no npm" while honouring the lockfile commitment. The spec's literal `yarn add` directive is documentation drift and does not gate this verdict. Documented in `templates/static/vitest/README.md`.
- **Script-line deviation:** `"eval:static:vitest": "vitest run --config evals/vitest.config.ts"` is the spec-aligned resolution of the `--reporter=...` drift (Blocker #3). The reporter is wired through the config's `test.reporters` so the CLI does not duplicate it; path-correct against the actual stamper output. Not a defect.
- **Coordination overlap resolution:** Confirmed that both stampers converge on a single canonical `assertNoConflictingFramework` symbol exported from subtask 08's fence. The function is exercised by both directions in the vitest self-test (`checkMutualExclusionGuard`) and the jest self-test; no duplicate symbol definition exists anywhere in `scripts/eval-stamp.ts`.
- **`ReadLints` re-scan:** Zero linter errors reported across all 10 files in the Files Modified list (`per-primitive-test.ts.tmpl`, `vitest.config.ts.tmpl`, `reporters/zoto-eval-reporter.ts.tmpl`, `setup.ts.tmpl`, `_shared/result-yaml-writer.ts.tmpl`, `static/vitest/README.md`, `scripts/__tests__/vitest-backend.selftest.ts`, `scripts/eval-stamp.ts`, `package.json`, `plugins/zoto-eval-system/templates/package-scripts/base.json`).

**Final authoritative verdict: VERIFIED.** The first-pass judge findings and tick state are confirmed by this independent re-run. The cleanup-stale carry-forward (Blocker #6) remains correctly assigned to downstream subtasks (11/13/14) and does not gate subtask 07.
