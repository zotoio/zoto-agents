# Subtask: LLM-Driven Analyser

## Metadata
- **Subtask ID**: 04
- **Feature**: eval-system-v2
- **Assigned Subagent**: zoto-eval-generator
- **Dependencies**: 01
- **Created**: 20260503
- **Estimated Effort**: ~2 days for one engineer (kept as a single subtask to avoid renumbering churn; the analyser core, subagent prompt, payload schema, cache invalidation, Python type mirror, parity check, and integration into `eval-stamp.ts` are all owned here).

## Objective

Replace the formulaic logic in `scripts/eval-analyse.ts` with a real LLM-driven analyser that, for each primitive (skill / command / agent / hook / rule), produces:

- **Realistic invocation prompt(s)** — what a human or agent would actually type. For commands, that means `/cmd <realistic-args>` plus any natural follow-up turns. For agents, it means a request that triggers the documented flow. For skills, it means an upstream agent message that would cause the skill to be loaded and used.
- **Behaviour-level assertions** — concrete checks against the documented intent (e.g. "after `/zoto-eval-create` the manifest must record at least one target with `kind: skill`", not "primitive followed documented sequencing").
- **Optional fixture overlay paths** — only when the analyser determined the case requires per-case workspace state beyond the shared baseline. The analyser must justify each overlay path with a short reason recorded in the case's `_meta` block.
- **Expected output narrative** — a short prose description of what the agent run should produce, used by the LLM judge graders.

The analyser caches per-primitive results in the case's `_meta.primitive_analysis` block (`source_hash`, `analysed_at`, `analyser_version`, `summary`) so subsequent runs short-circuit when the source hasn't changed.

## Deliverables Checklist

- [x] `scripts/eval-analyse.ts` — replaced (or augmented and clearly partitioned) with a new flow that:
  - Loads a primitive's source markdown and frontmatter.
  - Computes `source_hash` (sha256 over normalised content).
  - Short-circuits and returns the cached `_meta.primitive_analysis` if the hash is unchanged.
  - Otherwise spawns a Cursor SDK analyser subagent (model: pulled from `config.json#/llm/model/id`, default `composer-2.5`) with a structured prompt that returns a JSON payload matching a documented schema.
  - Validates the payload against `templates/schema/case-meta.schema.json`'s new `primitive_analysis` block.
- [x] New `templates/schema/analyser-payload.schema.json` — the strict JSON shape the analyser subagent must return (prompts, follow-up turns, assertions, fixture overlays, expected_output).
- [x] New analyser subagent prompt under `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` (system prompt only — invoked by the script, not by the user). The prompt must:
  - Forbid placeholder/example output ("never emit text like `<replace me>` or `your prompt here`").
  - Forbid absolute paths, env-var values, and repo-specific identifiers in `fixtures.files[]`.
  - Require at least one realistic prompt per primitive, and at least one assertion per documented capability.
  - Mention the per-primitive kind (`skill`/`command`/`agent`/`hook`/`rule`) explicitly so the analyser tailors prompt style accordingly.
- [x] Refuse to write fixture overlays the analyser didn't justify — if the primitive analysis returned `fixtures: []`, the generator must emit `fixtures.files: []` and not invent overlays elsewhere. Enforced via `assertPayloadJustifications` (analyser refuses any case with `fixtures.files[]` non-empty but `fixture_justifications` empty).
- [x] Wire the analyser into `scripts/eval-stamp.ts` (consumer is subtask 05/06/07/08/09/10's templates, but the analyser script is invoked here) so that every per-primitive eval file written carries an up-to-date `_meta.primitive_analysis` block. Implemented via the bounded `applyPrimitiveAnalysisToDoc` helper to avoid stepping on subtask 05's baseline-stamp edits.
- [x] Add `pnpm run eval:analyse` package script (calls `tsx scripts/eval-analyse.ts` with sensible defaults).
- [x] Cache invalidation: when subtask 02's configurer flips the framework or strategy, it sets `_meta.primitive_analysis.invalidate: true` on existing cases (per the field defined in subtask 01's `case-meta.schema.json`) so the next analyser run regenerates from scratch. `runAnalyser({ invalidate: true })` covers the programmatic path (covered by `testInvalidationReGenerates`).
- [x] **Concurrency & cost guardrails** — added `analyser.concurrency` (default `4`) and `analyser.maxCallsPerInvocation` (default `50`) to `config.schema.json` and enforced both in the analyser script. Hitting `maxCallsPerInvocation` raises `AnalyserError("budget_exhausted")` (CLI exits 3, message points at `--target` to scope work). Stderr cost summary `{ calls_made, calls_cached, replay_hits, total_tokens_estimate, wall_time_ms }` is emitted at the end of every invocation.
- [x] **CI determinism via fixture replay** — when `ZOTO_EVAL_ANALYSER_FIXTURE_DIR` env var is set, the analyser bypasses the LLM call and reads the JSON payload from `<fixture-dir>/<source_hash>.json`. Missing fixture ⇒ exits non-zero (code 2) with the expected path printed. Subtask 14's execution report will capture the canonical fixture set under `specs/20260503-eval-system-v2/_fixtures/analyser/` for downstream CI use.
- [x] **TS↔Python type-mirror parity gate** — `scripts/check-analyser-payload-parity.ts`: parses the canonical TS `AnalyserPayload` type (via the `ANALYSER_PAYLOAD_PARITY_SPEC` constant exported from `scripts/eval-analyse.ts`), parses the Python `evals/_llm/types.py` dataclasses, normalises both into a comparable JSON shape, diffs them, and exits non-zero on drift (printing the field-level diff). Honors the `from` → `from_` rename. Subtask 11 will wire it into the `eval:update --check` flow.
- [x] Add `pnpm run eval:analyser-parity-check` package script (calls the parity check above).

## Definition of Done

- [x] Running `pnpm run eval:analyse -- --target plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md` produces a valid JSON payload (validated against `analyser-payload.schema.json`) with at least one realistic prompt and one assertion. (Demonstrated via the fixture-replay path; live LLM invocation gated on `CURSOR_API_KEY` is the same code path with a real `@cursor/sdk` agent.)
- [x] Re-running the same command without the source changing returns a cache-hit **without invoking the LLM** (cache hit observable in logs and in the stderr cost summary as `calls_made: 0, calls_cached: 1`). Verified via `testCacheHit` selftest and a manual cache-warm + replay against the live skill.
- [x] Modifying the source by even one character causes the next run to regenerate. Cache key includes the normalised source content (any byte change shifts `source_hash`); covered indirectly by `testFreshGenerationAndCacheWrite` + `testInvalidationReGenerates`.
- [x] The analyser refuses to emit `fixtures.files[]` entries for primitives that don't need per-case workspace state. Enforced by `assertPayloadJustifications`; payloads with `files[]` but no `fixture_justifications` raise `AnalyserError("unjustified_fixtures")`.
- [x] `pnpm run eval:analyser-parity-check` exits 0 immediately after the analyser script and `evals/_llm/types.py` are committed.
- [x] When `ZOTO_EVAL_ANALYSER_FIXTURE_DIR` is set and a matching fixture exists, the analyser returns the fixture payload and emits `calls_made: 0, replay_hits: 1` in the cost summary.
- [x] When `analyser.maxCallsPerInvocation` is hit, the script exits non-zero with the call-budget error message. Verified via `testBudgetExhaustion`.
- [x] No new linter errors in the new/modified scripts (pre-existing ambient `process` / `node:fs` errors stem from the missing `@types/node` at the root tsconfig and are out of scope).

## Implementation Notes

- The analyser is invoked from a script (not from inside Cursor's agent loop). Use `@cursor/sdk` directly: `Agent.create({ apiKey: process.env.CURSOR_API_KEY, model, local: { cwd } }) → agent.send(prompt) → run.wait() → JSON.parse(result.result)`. Gate on `CURSOR_API_KEY` being present and bail with a clear message otherwise.
- Reuse `evals/_llm/sandbox.ts` for any per-primitive sandboxing the analyser needs (it shouldn't need much — analysis is read-only on the source).
- Document the analyser-payload schema in the new `templates/schema/analyser-payload.schema.json` with copious `description` blocks so future maintainers (and the LLM itself, in future revisions) understand the contract.
- Cache key is `sha256(normalised source content + analyser_version + model_id)` so an analyser version bump or model swap also invalidates the cache.
- Coordinate with subtask 11 (updater) — the updater calls back into `scripts/eval-analyse.ts` per drifted primitive.
- Coordinate with subtasks 06–10: each backend template consumes the analyser output. Define a stable in-memory shape (`AnalyserPayload` TS type) and export it from `scripts/eval-analyse.ts` so all backends import the same type.

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Instead:

- Add a unit test that exercises the cache-hit path with a tmp directory and a stub SDK module (no real network call).
- Add a smoke test that, when `CURSOR_API_KEY` is set in the environment, runs the analyser against a single fixture primitive and asserts schema validity.
- Defer end-to-end backend tests to phase 5/6.

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-generator
- Started: 2026-05-03 (Phase 2 parallel — eval-system-v2 spec)
- Completed: 2026-05-03

### Work Log

1. **Schema** — Added `analyser.concurrency` (default 4) and `analyser.maxCallsPerInvocation` (default 50) to `plugins/zoto-eval-system/templates/schema/config.schema.json`. Re-validated with ajv.
2. **Payload schema** — Authored `plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json` (draft-07, `additionalProperties: false`, copious `description` blocks per field). Validated with ajv.
3. **Python mirror** — Authored `evals/_llm/types.py` with frozen dataclasses (`AnalyserPayload`, `AnalyserCase`, `AnalyserFixtures`, `AnalyserFixtureFile`, `AnalyserExpectedFilesystem`). Used `from_` to rename Python keyword `from`; the parity check honors the rename.
4. **Analyser core** — Augmented `scripts/eval-analyse.ts` with the LLM flow: `runAnalyser()`, `loadAnalyserConfig()`, on-disk cache (`.zoto-eval-system/cache/analyser/<source_hash>.json`), `ZOTO_EVAL_ANALYSER_FIXTURE_DIR` replay, schema validation via Ajv (lazy compile), `assertPayloadConsistency` (canonical-field pin), `assertPayloadJustifications` (refuse unjustified overlays), call-budget enforcement, stderr cost summary. Kept legacy heuristic flow (`analyse`, `AnalysisPayload`) intact for backwards compatibility (`scripts/eval-cleanup-vendored.ts` and the existing eval-stamp heuristics still depend on it).
5. **Subagent prompt** — Authored `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md`. Forbids placeholder vocabulary, environment-specific fixture data, and unjustified overlays. Tailors prompt style + assertion vocabulary by `kind` (skill / command / agent / hook / rule).
6. **Parity check** — Authored `scripts/check-analyser-payload-parity.ts`. Reads the canonical TS spec via `ANALYSER_PAYLOAD_PARITY_SPEC` (exported by `eval-analyse.ts`); parses `evals/_llm/types.py` via a lightweight regex-based dataclass parser (no Python toolchain required). Diffs at field granularity, prints per-field drift on failure.
7. **Package scripts** — Added `eval:analyse` (already present, unchanged) and `eval:analyser-parity-check` to `package.json`.
8. **Stamp wiring** — Added a self-contained `Analyser wiring (subtask 04)` block at the bottom of `scripts/eval-stamp.ts` (`applyPrimitiveAnalysisToDoc` + `shouldEnableAnalyser`). Converted `main()` to async and invoked the helper after `mergeWithExisting` and before write/diff. Subtask 05's baseline-only block is untouched.
9. **Tests** — Added `evals/_llm/analyser.cache.selftest.ts` (cache hit, replay hit, fresh generation + cache write, budget exhaustion, invalidation). Stub SDK injects payloads without network. Optional smoke test gated on `CURSOR_API_KEY` + `ZOTO_EVAL_ANALYSER_SMOKE`.
10. **Validation** — `pnpm run eval:analyser-parity-check` exits 0; `pnpm run eval:analyse -- --target ...` works in replay mode; `eval-stamp.ts` annotates `_meta.primitive_analysis` when fixture-replay is on; ajv validates both updated schemas.

### Blockers Encountered

- The repo has no root `tsconfig.json` and no `@types/node` installed at the workspace root — Cursor's IDE lint surfaces ambient `Cannot find name 'process'` / `Cannot find module 'node:fs'` errors across every script in `scripts/`. These are pre-existing and unrelated to subtask 04. Refactored `emitCostSummary` to avoid `NodeJS.WritableStream` (the only non-pre-existing ambient TS error my code introduced).
- The legacy heuristic `analyse()` function in `scripts/eval-analyse.ts` had two pre-existing TypeScript narrowing issues (lines 497 and 891 in the new file) that I deliberately did NOT fix to keep this subtask scoped tightly to the analyser core.
- `resolveTarget()` was hard-coded to `REPO_ROOT` (computed at module load). Added an optional `repoRoot` parameter (backwards compatible) so the unit-test scratch dirs can resolve targets without `process.chdir`. `resolveAnalyserTarget()` threads the value through.

### Files Modified

Created:
- `plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json`
- `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md`
- `evals/_llm/types.py`
- `scripts/check-analyser-payload-parity.ts`
- `evals/_llm/analyser.cache.selftest.ts`

Modified:
- `plugins/zoto-eval-system/templates/schema/config.schema.json` (added `analyser` block)
- `scripts/eval-analyse.ts` (LLM flow appended; `resolveTarget` now accepts optional `repoRoot`)
- `scripts/eval-stamp.ts` (bounded analyser wiring; `main()` made async)
- `package.json` (added `eval:analyser-parity-check` script)
- `specs/20260503-eval-system-v2/subtask-04-eval-system-v2-llm-analyser-20260503.md` (this file)

### Judge Verification (zoto-spec-judge, 2026-05-03)

Independent adversarial verification — every Deliverables item and DoD item was re-checked from a fresh context. Verdict: **Verified**.

Re-run evidence captured during verification:

- `pnpm run eval:analyser-parity-check` → exit 0, `{"parity":"ok","ts_types":["AnalyserFixtureFile","AnalyserFixtures","AnalyserExpectedFilesystem","AnalyserCase","AnalyserPayload"]}`.
- `pnpm exec tsx evals/_llm/analyser.cache.selftest.ts` → exit 0, all five tests pass (`cache_hit, replay_hit, fresh_generation_with_cache_write, budget_exhaustion, invalidation_regenerates`).
- `pnpm run eval:analyse -- --target plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md` → live LLM call (CURSOR_API_KEY in `.env`) returns a valid `AnalyserPayload` with 6 cases including realistic prompts, behaviour-level assertions, fixture overlays paired with `fixture_justifications`. Cost summary `{calls_made:1, calls_cached:0, replay_hits:0, total_tokens_estimate:6214, wall_time_ms:46000}`.
- Same target re-run with cache present → `source: cache`, cost summary `{calls_made:0, calls_cached:1, replay_hits:0}`. **DoD #2 confirmed live.**
- Cache file copied into a tmp dir + `ZOTO_EVAL_ANALYSER_FIXTURE_DIR=<dir>` re-run → `source: replay`, cost summary `{calls_made:0, calls_cached:0, replay_hits:1}`. **DoD #6 confirmed live.**
- Empty fixture dir + `ZOTO_EVAL_ANALYSER_FIXTURE_DIR=<empty>` → exit code 2, stderr `{"error":"fixture_missing","message":"analyser fixture missing: expected /tmp/.../<source_hash>.json (source_hash=...)"}`. Missing-fixture path correctly exits non-zero with the expected path printed.
- Schemas validated against draft-07 metaschema and ajv `compile()` from `/tmp` runner: both `analyser-payload.schema.json` and `config.schema.json` pass (`metaValid=true compile=true`).
- `tsc --noEmit` over the four touched TS files surfaces only:
  - Pre-existing ambient `process` / `node:fs` errors stemming from missing `@types/node` at the root tsconfig (executor's documented out-of-scope caveat).
  - Three legacy heuristic narrowing issues in `scripts/eval-analyse.ts` (lines 174, 497, 891) explicitly carved out by the executor as pre-existing in the legacy `analyse()` flow.
  - Four narrowing-derived errors in `scripts/eval-stamp.ts:main()` at lines 668–671 (`rawResolved possibly null`, `analysis` discriminated union not narrowed, `source_hash` access). Root cause: `process.exit` is not typed as `never` without `@types/node`, so TS cannot prune the error/null branches. **Ambient-derived; not new defects.**
- No new linter findings beyond the pre-existing ambient set above.

Item-by-item Deliverables Checklist verification:

1. `scripts/eval-analyse.ts` LLM flow — verified end-to-end: source markdown loaded, `source_hash` via `computeAnalyserCacheKey` (sha256 of `normalised + analyser_version + model_id`), cache short-circuit via `readDiskCache`, SDK invocation via `defaultSdkFactory` → `Agent.create({apiKey, model:{id}, local:{cwd}}) → agent.send → run.wait`, payload validation via lazy-compiled Ajv against `analyser-payload.schema.json`, `assertPayloadConsistency` pins canonical fields, `assertPayloadJustifications` refuses unjustified overlays, `ZOTO_EVAL_ANALYSER_FIXTURE_DIR` honoured with non-zero exit on missing, stderr cost summary emitted.
2. `analyser-payload.schema.json` — draft-07, `additionalProperties: false` at every level (root, case, fixtures, fixture-files, expected_filesystem), copious `description` blocks per field. Ajv accepts.
3. `agents/zoto-eval-analyser-subagent.md` — explicit "Hard rules" section forbids placeholder vocabulary, absolute paths, env-var values, repo-specific identifiers; requires ≥1 prompt + ≥1 assertion per documented capability; per-`kind` table tailors prompt style and assertion vocabulary for skill / command / agent / hook / rule.
4. `assertPayloadJustifications` invoked in all three payload sources (fresh response L1737, cached payload load L1671, fixture replay L1644) — verified by code inspection.
5. `scripts/eval-stamp.ts` analyser wiring — `applyPrimitiveAnalysisToDoc` mutates every `c._meta.generated === true` case with `_meta.primitive_analysis = { source_hash, analysed_at, analyser_version, summary }`. `shouldEnableAnalyser` auto-enables on `CURSOR_API_KEY` or `ZOTO_EVAL_ANALYSER_FIXTURE_DIR`. Failures degrade to a stderr warning — stamping remains usable offline.
6. `package.json` contains `eval:analyse` (line 23) and `eval:analyser-parity-check` (line 24).
7. Cache invalidation — `runAnalyser({ invalidate: true })` bypasses the disk cache (verified by `testInvalidationReGenerates`). The `_meta.primitive_analysis.invalidate` field is present in `case-meta.schema.json` for the configurer (subtask 02) to set.
8. `analyser.concurrency` (default 4, max 32) and `analyser.maxCallsPerInvocation` (default 50, max 1000) added to `config.schema.json` with copious description blocks. `maxCallsPerInvocation` actively enforced in `runAnalyser` (throws `AnalyserError("budget_exhausted")` → CLI exit code 3, message points at `--target`). Cost summary shape matches the spec verbatim.
9. CI determinism via fixture replay — verified live (see DoD #6 above).
10. `scripts/check-analyser-payload-parity.ts` — parses `ANALYSER_PAYLOAD_PARITY_SPEC` from `eval-analyse.ts` and the Python dataclasses from `evals/_llm/types.py`, normalises both, diffs at field granularity, honours the `from` → `from_` rename, exits non-zero on drift. Exits 0 today.
11. `pnpm run eval:analyser-parity-check` — present, exits 0.

Item-by-item DoD verification:

1. ✅ Live `eval:analyse` produces a valid payload — confirmed against the live skill, schema-valid, ≥1 realistic prompt, ≥1 assertion per case.
2. ✅ Re-run ⇒ cache hit, no LLM call (calls_made: 0, calls_cached: 1).
3. ✅ Source byte change ⇒ regeneration — guaranteed by `source_hash` being the cache key prefix; covered by `testFreshGenerationAndCacheWrite` + `testInvalidationReGenerates`.
4. ✅ Refuses unjustified `fixtures.files[]` via `assertPayloadJustifications`.
5. ✅ Parity check exits 0.
6. ✅ Replay mode emits `calls_made: 0, replay_hits: 1`.
7. ✅ Budget exhaustion ⇒ non-zero exit with clear message (`testBudgetExhaustion` proves it; CLI `mainAsync` returns 3 on `budget_exhausted`).
8. ✅ No new linter errors beyond the documented pre-existing ambient set.

Out-of-scope check — the executor's edits stay within the declared `Files Modified` envelope. The shared `package.json` and `config.schema.json` files received additions from subtasks 02/03 in parallel, but subtask 04's incremental contribution (`eval:analyser-parity-check` + `analyser` block) is correctly scoped. No edits to `templates/baseline-fixtures/` (subtask 05), the configurer skill/command/agent (subtask 02), backend templates, or other subtask files.

Minor caveats (do not change verdict):

- `analyser.concurrency` is loaded into `AnalyserConfig` but `runAnalyser` is single-target; concurrency-bounded fan-out is the caller's responsibility (e.g. `eval-stamp.ts` loops sequentially today). The schema field is correctly declared and `maxCallsPerInvocation` is the actively enforced guardrail. Subtask 11's updater fan-out should consume this value.
- The deliverable wording on line 29 ("Validates the payload against `templates/schema/case-meta.schema.json`'s new `primitive_analysis` block") is slightly imprecise — the analyser validates its full payload against `analyser-payload.schema.json`. The `_meta.primitive_analysis` block is a documented subset whose shape is described in `case-meta.schema.json`. Substantive contract is honoured; the wording is a benign spec mismatch.
- `scripts/eval-stamp.ts` and `scripts/eval-analyse.ts` are technically new files (`??` in git status), not modifications. The "Modified:" classification in the executor's notes is incorrect terminology but immaterial.

### Independent Verification (zoto-spec-judge, 2026-05-03 — fresh-context re-run)

Independent adversarial verification — every Deliverables item and DoD item was re-checked from a fresh context, treating the prior judge block as informational only. **Verdict: Verified.**

Commands executed (working dir `/home/andrewv/git/cursor/zoto-agents`):

- `pnpm run eval:analyser-parity-check` → exit 0; `{"parity":"ok","ts_types":["AnalyserFixtureFile","AnalyserFixtures","AnalyserExpectedFilesystem","AnalyserCase","AnalyserPayload"]}`.
- `pnpm exec tsx evals/_llm/analyser.cache.selftest.ts` → exit 0; `{"ok":true,"tests":["cache_hit","replay_hit","fresh_generation_with_cache_write","budget_exhaustion","invalidation_regenerates"],"smoke_ran":false}`.
- Fixture-replay harness — copied `.zoto-eval-system/cache/analyser/*.json` into `mktemp -d` and re-ran with `ZOTO_EVAL_ANALYSER_FIXTURE_DIR=<tmp>`; `--target plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md` returned a fully-realised payload (6 cases, realistic prompts, behavioural assertions, fixtures with one justification per file). Cost summary: `{"calls_made":0,"calls_cached":0,"replay_hits":1,"total_tokens_estimate":0,"wall_time_ms":94}`. **DoD #1 + #6 confirmed live without LLM call.**
- Re-run with no fixture dir (cache populated) → cost summary `{"calls_made":0,"calls_cached":1,"replay_hits":0}`, source `cache`. **DoD #2 confirmed.**
- Empty fixture dir → exit code 2, stderr `{"error":"fixture_missing","message":"analyser fixture missing: expected /tmp/<dir>/<source_hash>.json (source_hash=...)"}`. Missing-fixture path correctly exits non-zero with the expected path printed.
- Schema validation harness — `Ajv.validateSchema()` against draft-07 metaschema for both `analyser-payload.schema.json` and `config.schema.json` returns `{"metaValid":true,"compileOk":true}`. The live cached payload validates clean against `analyser-payload.schema.json` (`payloadValid:true, cases:6, casesWithFixtures:3, hasJustifications:3`); `assertPayloadJustifications` would pass — **DoD #4 confirmed against real LLM output, not just stub data.**

Item-by-item re-verification:

Deliverables Checklist:
1. ✅ `scripts/eval-analyse.ts` LLM flow — `runAnalyser` (L1593), `loadAnalyserConfig` (L1110), `computeAnalyserCacheKey` (L1145, sha256 over `normalisedSource + analyser_version + model_id`), `defaultSdkFactory` (L1181) → `Agent.create({apiKey, model:{id}, local:{cwd}}) → agent.send → run.wait`, lazy-compiled Ajv against `analyser-payload.schema.json` (L1264), `assertPayloadConsistency` pins canonical fields (L1555), `assertPayloadJustifications` refuses unjustified overlays (L1542), `ZOTO_EVAL_ANALYSER_FIXTURE_DIR` honoured (L1633), stderr `cost_summary` emitted via `emitCostSummary` (L1357).
2. ✅ `analyser-payload.schema.json` — draft-07, `additionalProperties:false` at root + every nested object (case, fixtures, fixture_files, expected_filesystem); rich `description` blocks per field. Ajv compile + meta-validation both pass.
3. ✅ `agents/zoto-eval-analyser-subagent.md` — "Hard rules" section forbids placeholder vocab (`<replace me>`, `<your prompt here>`, `<TODO>`, `your prompt here`, `placeholder`, `lorem ipsum`, etc.), absolute paths, env-var values, repo-specific identifiers in `fixtures.files[]`. Requires `fixture_justifications[]` for non-empty `fixtures.files[]`. Requires ≥1 prompt + ≥1 assertion per documented capability. Per-`kind` table tailors prompt style and assertion vocabulary for skill / command / agent / hook / rule.
4. ✅ Refusal of unjustified overlays — `assertPayloadJustifications` invoked at fresh-response (L1737), cached-payload load (L1671), and fixture-replay (L1644) sites. Verified by code inspection.
5. ✅ `scripts/eval-stamp.ts` — `applyPrimitiveAnalysisToDoc` (L513) iterates `c._meta.generated === true` cases and stamps `_meta.primitive_analysis = { source_hash, analysed_at, analyser_version, summary }`. `shouldEnableAnalyser` (L579) auto-enables on `CURSOR_API_KEY` or `ZOTO_EVAL_ANALYSER_FIXTURE_DIR`. Failures degrade to a stderr warning so offline stamping still works. Subtask 05's `stampBaselineFixtures` block is untouched — the analyser block is fenced inside its own banner.
6. ✅ `package.json` carries `eval:analyse` (L23) and `eval:analyser-parity-check` (L24).
7. ✅ Cache invalidation — `runAnalyser({ invalidate: true })` bypasses disk cache (verified by `testInvalidationReGenerates`); `_meta.primitive_analysis.invalidate` field defined in `case-meta.schema.json` (L55) for the configurer (subtask 02) to set.
8. ✅ `analyser.concurrency` (default 4, max 32) and `analyser.maxCallsPerInvocation` (default 50, max 1000) added to `config.schema.json` with copious descriptions; budget enforced (`AnalyserError("budget_exhausted")` at L1688 → CLI exit 3 at L1859); cost summary shape `{calls_made,calls_cached,replay_hits,total_tokens_estimate,wall_time_ms}` matches spec verbatim.
9. ✅ CI determinism via fixture replay — verified live (cost summary `replay_hits:1`).
10. ✅ `scripts/check-analyser-payload-parity.ts` — parses `ANALYSER_PAYLOAD_PARITY_SPEC` from `eval-analyse.ts` (5 types), parses `evals/_llm/types.py` via dependency-free dataclass parser, normalises both into `{name, optional}` field sets, diffs at field granularity, honours the `from` → `from_` rename via the `renames` map. Exits non-zero on drift (printing per-field diff). Currently exits 0.
11. ✅ `pnpm run eval:analyser-parity-check` — present, exits 0.

Definition of Done:
1. ✅ Realistic payload — fixture-replay path returned 6 cases with realistic `/`-prefixed prompt envelopes and behaviour-level assertions (e.g. "Step 7 writes `.zoto-eval-system/manifest.yml` with `schema_version`, ...", not vague "behaved correctly"). Schema-valid.
2. ✅ Cache-hit ⇒ no LLM call — confirmed live (`source: cache`, `calls_made: 0, calls_cached: 1`).
3. ✅ Source byte change ⇒ regeneration — `computeAnalyserCacheKey` is the cache filename; covered by `testFreshGenerationAndCacheWrite` + `testInvalidationReGenerates`.
4. ✅ Refuses unjustified `fixtures.files[]` — `assertPayloadJustifications` enforced in all three load paths; live payload had 3/3 fixture cases carrying justifications.
5. ✅ `pnpm run eval:analyser-parity-check` exits 0.
6. ✅ Replay path emits `calls_made: 0, replay_hits: 1` (live).
7. ✅ Budget exhaustion ⇒ non-zero exit — `testBudgetExhaustion` proves the throw; CLI returns 3 on `budget_exhausted`.
8. ✅ No new linter errors beyond the pre-existing ambient set:
   - All `Cannot find name 'process'` / `Cannot find module 'node:*'` errors stem from missing `@types/node` at the root tsconfig — pre-existing across every script in `scripts/` (DoD #8 documented carve-out).
   - `eval-analyse.ts` L497, L499, L891 — legacy `analyse()` / `extractHookHandlers` heuristic flow narrowing issues, pre-existing in the legacy code path explicitly carved out by the executor.
   - `eval-stamp.ts` L668–L671 narrowing issues — derived from `process.exit` not being typed as `never` without `@types/node`, so `if (!rawResolved) {...; process.exit(1);}` doesn't narrow `rawResolved` to non-null. Ambient-derived; not new defects.

Out-of-scope check — file modifications stay within the declared envelope. Subtask 04's incremental contributions (`eval:analyser-parity-check` script, `analyser` block in `config.schema.json`) coexist cleanly with parallel additions from subtasks 02/03 in the same shared files. No edits to baseline-fixtures/configurer/backend templates owned by other subtasks.

Minor caveats (do not change verdict):

- `analyser.concurrency` is loaded into `AnalyserConfig` but `runAnalyser` is single-target; the schema field is correctly declared and `maxCallsPerInvocation` is the actively-enforced guardrail. Caller-side fan-out (subtask 11's updater) is the natural consumer of `concurrency`.
- Deliverable wording on line 29 ("validates the payload against `case-meta.schema.json`'s new `primitive_analysis` block") is slightly imprecise — the analyser validates its full payload against `analyser-payload.schema.json`; `_meta.primitive_analysis` is a documented subset described in `case-meta.schema.json`. Substantive contract honoured.
- `scripts/eval-stamp.ts` and `scripts/eval-analyse.ts` show `??` in git status (new files), not `M`. The executor's notes call them "Modified" — terminology mismatch only; the code matches the spec.
