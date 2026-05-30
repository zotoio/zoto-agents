# Assessment: Eval System v2 Spec

**Reviewer**: zoto-spec-judge (independent)
**Date**: 20260503
**Spec under review**: `specs/20260503-eval-system-v2/spec-eval-system-v2-20260503.md`
**Subtasks reviewed**: 01–14

## Summary

The spec is **substantively well-structured** and successfully translates the five locked decisions and five user goals into 14 subtasks distributed across seven dependency-respecting phases. The Subtask Manifest, dependency graph, and per-subtask Deliverables Checklists are uniformly concrete; cross-references between subtasks are mostly accurate; and the user-case-preservation contract is invoked in every place destructive editing happens. The Goal-1 "LLM-driven generation" theme is consistently propagated from the analyser (subtask 04) through every backend (subtasks 06–10) and the updater (subtask 11). Phase boundaries respect the locked decisions — schema first, then strategy-orthogonal building blocks (configurer, analyser, baseline), then per-backend templates, then orchestration, then docs, then live-repo dogfood.

That said, several **shippable-but-revision-worthy** issues exist: (a) subtasks 03 and 05 default to `generalPurpose` when more specific zoto-* subagents fit better; (b) the dependency graph is missing an edge from 11 → 12 because the orchestrator's drift-hook requires the rewritten `eval:update --check` to be in place; (c) the user-case-preservation contract is well-defined for `evals.json` (per-case `_meta.generated`) but ambiguously specified for `code`-strategy `*.test.ts` files (file-level `// _meta.generated: true` header); (d) `package.json#/eval` script ownership is double-claimed by the per-backend subtasks (06/07/08) and the orchestrator (12); (e) live-repo deletion of `evals/test_example.py` is double-owned by subtask 06 and subtask 14; (f) several material risks (LLM cost ceiling, analyser determinism in CI, Python↔TS analyser-payload mirror drift, bats template fate) are not in the Risk Assessment. Overall verdict is **Conditional approval** — the spec can ship with surgical fixes (recommended below) before execution.

## Per-Subtask Assessment

| ID | Subtask | Status | Notes |
|----|---------|--------|-------|
| 01 | Schema & Config Foundation | **pass** | Clean foundation. Cross-field validation deferred to runtime is correctly scoped. Extends `case-meta.schema.json` for `primitive_analysis`. Acceptance criteria are concrete (draft-07 metaschema validation, defaults supply legacy fields). |
| 02 | Configurer Rewrite | **minor concerns** | Slight overlap with 01 on `templates/config.json` (defaults already populated in 01; 02 says "updated to reflect the new defaults" — clarify whether 02 ever writes to that file or only references it). The `cleanup_plan` shape is implicit; should reference subtask 03's stdout JSON contract explicitly so both subtasks share a schema. Bats template is silently ignored — see Risk #6. |
| 03 | Cleanup Engine | **minor concerns** | Subagent allocation is `generalPurpose` — should be `zoto-eval-configurer` (this is config-change cleanup, owned by the configurer command per the subtask body itself). The user-case-preservation logic ("walk each file first and skip any case marked `_meta.generated: false`") only applies cleanly to `evals.json`; for `code`-strategy `*.test.ts` files there is no per-case `_meta`, only a file-level header — this distinction needs to be explicit. The `--dry-run-must-precede-apply` "session" gate is undefined (no token/lockfile mechanism described). |
| 04 | LLM-Driven Analyser | **minor concerns** | The most under-budgeted subtask. Owns: new schema + new agent prompt + analyser script + cache mechanism + integration into `eval-stamp.ts` + Python type mirror + tests. Likely warrants a split into 04a (analyser core + cache) and 04b (subagent prompt + payload schema), or at minimum an explicit time/effort estimate. Missing: cost/concurrency budget for bulk runs, frozen-fixture mode for CI determinism, and a CI gate that verifies the TS↔Python `AnalyserPayload` mirror stays in sync. |
| 05 | Baseline Fixtures | **minor concerns** | Subagent allocation is `generalPurpose` — should be `zoto-eval-generator` (template scaffolding + `eval-stamp.ts` wiring is exactly the generator's domain). Otherwise solid: deterministic file content, idempotent stamp, framework-agnostic baseline. |
| 06 | Pytest Backend | **minor concerns** | Two scope creep items: (a) "Replace `evals/test_example.py` (the live example file)" overlaps with subtask 14's live-repo migration — this should be 14's job; 06 owns the *template* and the *generator*, not the live file replacement. (b) "`pnpm run eval` — when `static.framework === "pytest"` — invokes `pytest evals/`" double-claims the `eval` script with subtask 12's orchestrator. The orchestrator is the entry point; per-backend subtasks should expose a stable invocation contract (e.g. `pnpm run eval:static`) that the orchestrator calls. |
| 07 | Vitest Backend | **minor concerns** | Same `eval`-script double-claim as 06 (the subtask says `eval` becomes `vitest run --reporter=...`, but 12's orchestrator says `eval` becomes `tsx scripts/eval-orchestrate.ts`). Mutual-exclusion-with-jest guard is mentioned implicitly via subtask 08's symmetric guard, but 07's deliverable list should call it out explicitly. Ditto-marker `// _meta.generated: true` comment is correct but should be matched by an explicit cleanup-engine note (subtask 03) for code-strategy files. |
| 08 | Jest Backend | **pass** | Mutual-exclusion guard is explicit and bidirectional. Shared YAML-emission helper (`templates/static/_shared/result-yaml-writer.ts.tmpl`) is a nice de-duplication win. Same `eval`-script ownership concern as 06/07. |
| 09 | LLM `code` Strategy | **minor concerns** | Cleanup-engine integration: when 03 deletes "the other strategy's case files", code-strategy files are whole `*.test.ts` files — the file-level `// _meta.generated: true` header is the deletion key. This contract is not stated in 03 and only implicit in 09. Make the cross-reference bidirectional. The reporter must capture per-case `tokens` from `result.tokens` "or equivalent — confirm against the `cursor-sdk` skill"; the "or equivalent" hedge is a real risk and should be a deliverable, not a comment. |
| 10 | LLM `declarative` Strategy | **pass** | Output filename rename (`results.yml` → `llm.yml`) is a clear breaking change with a documented downstream-update path (subtasks 12, 13). The reject-on-missing-prompt/assertion fail-fast is excellent. The mutual-exclusion guard mirrors subtask 09 cleanly. |
| 11 | Updater Rewrite | **minor concerns** | The hard-coded user-case guard is well-defined for `evals.json` (`assert(case._meta?.generated === true)`). The same guard for `code`-strategy file-level deletion/regeneration is missing — `regenerateLlmCode()` should refuse to touch any `*.test.ts` file lacking the `// _meta.generated: true` header. The `--no-analyser` flag is convenient for development but has no CI-warning gate; mention that in the deliverables. |
| 12 | Run Folder & Merged Report | **blocker** (dependency only) | The orchestrator's drift-hook calls `pnpm run eval:update -- --check`, which is the rewritten script from subtask 11. The dependency graph lists 12's deps as `06, 07, 08, 09, 10` but **omits 11**. Either: add `11 → 12` edge (which forces 12 into Phase 6 alongside docs) or weaken the drift-hook to a no-op when the rewritten script isn't yet in place. Without this fix, parallel Phase 5 execution would have 12 calling pre-rewrite `eval:update --check` and emitting unreliable `report.yml#/drift` content. **Also**: scope-claims `eval`/`eval:full`/`eval:llm` in `package.json` — needs explicit deconfliction with subtasks 06/07/08/09/10. |
| 13 | Skills/Commands/Agents/Docs | **minor concerns** | Comprehensive coverage, but: (a) the migration note says "for v1 → v2 consumers" — there is no released v1 yet, so this should be reframed as "from-current-state migration"; (b) `pnpm test` is listed in DoD without specifying which framework (vitest, after 14? or repo default?); (c) repo top-level `README.md` is in scope but lives outside the plugin — coordinate with whoever owns repo-root docs. |
| 14 | Live-Repo Migration | **minor concerns** | Excellent integration-test posture. Two gaps: (a) "Replace `evals/test_example.py`" was double-claimed by subtask 06; remove the duplicate from 06 so 14 is the single owner. (b) Before deleting the existing 107-test `evals/test_example.py`, the migration must explicitly verify `evals/test_meta_invariants.py` (created by subtask 06) covers the still-valuable invariants — currently the deletion is gated only on the cleanup engine's confirmation, not on equivalent-coverage proof. (c) No transactional rollback procedure beyond "if migration partially fails, file follow-up note" — a half-applied cleanup + half-stamped backend would leave the live repo unrunnable. |

## Top 5 Risks Not Captured in the Spec's Risk Assessment

1. **LLM cost & latency for bulk analyser runs.** `/zoto-eval-create` invokes the analyser per primitive (skills + commands + agents + hooks + rules). For this monorepo that's roughly 25–35 calls; for larger consumer repos it could be 100+. There is no concurrency limit, no per-call timeout, no aggregate cost ceiling, and no `--limit N` flag. *Mitigation*: subtask 04 should add `analyser.concurrency` and `analyser.maxCallsPerInvocation` config knobs (defaults: 4 / 50) with a clear stderr cost summary at the end.

2. **Analyser non-determinism in CI.** Cache key is `sha256(source + analyser_version + model_id)` — but the LLM response under a cache miss is non-deterministic. Two CI runs of "fresh `/zoto-eval-create` then `/zoto-eval-update --check`" can produce slightly different `_meta.primitive_analysis.summary` strings, causing spurious drift. *Mitigation*: subtask 04 should add a `ZOTO_EVAL_ANALYSER_FIXTURE_DIR` env var that, when set, replays JSON payloads from a fixture directory instead of calling the LLM. Subtask 14's execution report should capture the canonical fixture set for downstream CI use.

3. **TypeScript ↔ Python `AnalyserPayload` mirror drift.** Subtask 04 mentions `evals/_llm/types.py` mirrors the canonical TS type, but there is no automated check. A field added in TS (consumed by vitest/jest/code-strategy) silently bypasses pytest. *Mitigation*: subtask 04 should ship a small `scripts/check-analyser-payload-parity.ts` that diffs the TS type against the Python dataclass and exits non-zero on drift; wire into 04's DoD.

4. **`@cursor/sdk` API surface drift in stamped templates.** Subtasks 04 and 09 both hand-roll `Agent.create → agent.send → run.wait`. If the SDK API changes, every stamped consumer repo's eval suite breaks until they re-run `/zoto-eval-update`. *Mitigation*: subtask 09's templates should import from a thin internal wrapper (`evals/_llm/sdk-bridge.ts` or similar) that consumers can patch in one place. The `cursor-sdk` skill is the right runtime authority — link its current canonical pattern from the template README and from subtask 09's DoD.

5. **bats template is silently orphaned.** `plugins/zoto-eval-system/templates/additional/bats/` exists today. The spec's locked decision F enumerates only pytest/vitest/jest as test frameworks; the configurer questions in subtask 02 don't include bats; the cleanup engine in subtask 03 doesn't enumerate bats assets; subtask 13's docs don't mention bats. The template will sit dead in the tree, confusing future contributors. *Mitigation*: subtask 13 (docs) or subtask 03 (cleanup) should explicitly delete `templates/additional/bats/` (or move it under a `templates/_archive/` tree with a README explaining the deprecation), and the CHANGELOG entry should call this out.

(Honourable mention — would be #6 if room): **Run-folder retention policy.** The spec creates `evals/_runs/<ts>/` per run with no retention mandate. Repos doing nightly CI evals will accumulate runs indefinitely. Subtask 12 should add a `runs.retention` config field (default: keep last 30) and a `pnpm run eval:gc` helper.

## Recommended Fixes (grouped by subtask)

### Subtask 01
- Clarify that `templates/config.json` default-population is fully owned here; subtask 02 references but never re-edits.
- Document the `case-meta.schema.json#/primitive_analysis.invalidate` field used by subtask 04's cache invalidation flow.

### Subtask 02
- Add a deliverable: define and reference the `cleanup_plan` JSON contract that subtask 03 implements (avoid implicit shared schemas).
- Add explicit cross-reference to subtask 03's stdout schema.

### Subtask 03 — **change subagent**
- Change `Assigned Subagent` from `generalPurpose` to `zoto-eval-configurer` (config-change cleanup is the configurer's domain — the subtask body itself states "The script is invoked by the configurer command (subtask 02)").
- Add explicit deliverable: for `code`-strategy `*.test.ts` files, deletion is gated on file-level `// _meta.generated: true` header (not per-case `_meta`).
- Define the `--dry-run-must-precede-apply` "same session" mechanism (e.g. write a temp lockfile under `evals/_runs/.cleanup-token-<runId>`).
- Enumerate `templates/additional/bats/` in the cleanup list (or hand it to subtask 13 to delete with a CHANGELOG entry).

### Subtask 04
- Split into 04a (analyser core + cache) and 04b (subagent prompt + payload schema), or at minimum add explicit effort/time estimate.
- Add `analyser.concurrency` and `analyser.maxCallsPerInvocation` config knobs.
- Add a `ZOTO_EVAL_ANALYSER_FIXTURE_DIR` env-var fallback for CI determinism.
- Add `scripts/check-analyser-payload-parity.ts` to gate TS↔Python type drift.

### Subtask 05 — **change subagent**
- Change `Assigned Subagent` from `generalPurpose` to `zoto-eval-generator` (templates + `eval-stamp.ts` wiring).

### Subtask 06
- Remove the deliverable bullet "Replace `evals/test_example.py` (the live example file)" — that belongs solely to subtask 14.
- Replace the `pnpm run eval` script-modification deliverable with: "expose a stable per-backend invocation (`pnpm run eval:static:pytest` or equivalent) that subtask 12's orchestrator calls."

### Subtask 07
- Same `eval`-script descope as 06.
- Add explicit cross-reference to the symmetric mutual-exclusion guard (subtask 08).
- Document the `// _meta.generated: true` header contract for cleanup-engine consumption.

### Subtask 08
- Same `eval`-script descope as 06/07.

### Subtask 09
- Promote "confirm against the `cursor-sdk` skill" from a hedge in Implementation Notes to a Deliverable: "verify `tokens` field name against the live `cursor-sdk` skill at execution time and pin the resolved field in template comments."
- Add deliverable: import SDK calls from a single `evals/_llm/sdk-bridge.ts` so future SDK API changes need a one-place patch.
- Cross-reference subtask 03 explicitly for the file-level `// _meta.generated: true` cleanup contract.

### Subtask 10
- Add deliverable: "after rename (`results.yml` → `llm.yml`), grep the repo for any tooling/docs still referencing `results.yml` and either redirect or break-loud."

### Subtask 11
- Add explicit guard for code-strategy file-level regeneration: `regenerateLlmCode()` must refuse to overwrite any `*.test.ts` lacking the `// _meta.generated: true` header.
- Mention `--no-analyser` should print a CI-loud warning when invoked in CI (when `process.env.CI === "true"`).
- Cross-reference: subtask 12 calls back into the rewritten `eval:update --check` — flag this dependency forward.

### Subtask 12 — **fix dependency graph**
- Add dependency on subtask 11 (the orchestrator's drift hook calls the rewritten `eval:update --check`). Either move 12 to Phase 6 or accept that 11 and 12 are now sequential within Phase 5.
- Add explicit deconfliction: subtasks 06/07/08/09/10 expose stable per-backend script names (`eval:static:*`, `eval:llm:*`); this subtask owns the user-facing `eval`/`eval:full`/`eval:llm` aliases.
- Add `runs.retention` config + `pnpm run eval:gc` helper.

### Subtask 13
- Reframe "v1 → v2" migration note as "from-current-state migration" (no released v1 exists).
- Specify which test framework `pnpm test` runs (likely vitest after subtask 14).
- Confirm scope of repo top-level `README.md` edits with the repo maintainer (it lives outside the plugin tree).

### Subtask 14
- Sole owner of live `evals/test_example.py` deletion (after 06 descopes).
- Add gate: before deleting `evals/test_example.py`, verify `evals/test_meta_invariants.py` (subtask 06's infrastructure-test deliverable) exists and passes.
- Add transactional-rollback procedure: if cleanup applied but stamping fails, restore from `_backup/` automatically.

## Subagent Allocation Summary

Per the user's allocation guidance ("does each subtask use the most specific zoto-* subagent_type, or does any default unnecessarily to generalPurpose?"):

| ID | Current | Recommended | Reason |
|----|---------|-------------|--------|
| 01 | zoto-eval-configurer | ✅ keep | Schema + config defaults — configurer domain |
| 02 | zoto-eval-configurer | ✅ keep | Configurer command + skill rewrite |
| **03** | **generalPurpose** | **zoto-eval-configurer** | Cleanup is config-change driven; the subtask body itself says "invoked by the configurer command" |
| 04 | zoto-eval-generator | ✅ keep | Generator owns analyser + payload + cache |
| **05** | **generalPurpose** | **zoto-eval-generator** | Template scaffolding + `eval-stamp.ts` wiring is exactly the generator's domain |
| 06–10 | zoto-eval-generator | ✅ keep | Per-backend templates and stamp logic |
| 11 | zoto-eval-updater | ✅ keep | Updater rewrite |
| 12 | zoto-eval-executor | ✅ keep | Runner orchestration + per-backend coordination |
| 13 | zoto-plugin-manager | ✅ keep | Plugin component frontmatter + README + validation |
| 14 | zoto-eval-configurer | ✅ keep | Configurer drives the migration end-to-end |

**Net: 2 subtasks (03 and 05) currently default to `generalPurpose` and should be re-pointed to specific zoto-* subagents.**

## User-Case Preservation Contract — Cross-Subtask Audit

| Subtask | Mechanism | Status |
|---------|-----------|--------|
| 02 (configurer) | Skill must not read user-authored test files; only manifest `eval_files` + framework fingerprints | ✅ explicit |
| 03 (cleanup) | Walks each `evals.json` and skips per-case `_meta.generated: false`; surfaces "manual merge required" for mixed files | ⚠️ explicit for `evals.json`, **silent for code-strategy `*.test.ts` files** |
| 09 (code strategy) | All generated files carry `// _meta.generated: true` at the top | ⚠️ asserts the marker exists, but no cross-reference to how cleanup/updater enforce file-level preservation |
| 10 (declarative) | All generated `evals.json` cases carry `_meta.generated: true` and `_meta.primitive_analysis.source_hash` | ✅ explicit |
| 11 (updater) | Hard-coded `assert(case._meta?.generated === true)` for `evals.json` cases | ⚠️ explicit for declarative; **no analogous file-level guard for code-strategy regeneration** |

The contract is **consistent and verifiable for `evals.json`** (per-case `_meta.generated: false`) but has a **gap for code-strategy `*.test.ts` files** (file-level `// _meta.generated: true` header). Subtasks 03 and 11 should both add file-level preservation guards. Recommend a single shared helper, e.g. `evals/_llm/_user-case-guards.ts` exporting `isGeneratedFile(path)` and `isGeneratedCase(case)`, consumed by 03 + 11 + 09 + 10.

## Cross-Subtask Coordination Audit

| Forward reference | Backward reference | Status |
|-------------------|--------------------|--------|
| 02 → 03 (cleanup-plan handoff) | 03 → 02 (invoked by configurer command) | ✅ bidirectional |
| 04 → 06–10 (`AnalyserPayload` consumers) | 06–10 → 04 (consume payload) | ✅ bidirectional |
| 04 → 11 (updater calls analyser) | 11 → 04 (re-invoke per drifted primitive) | ✅ bidirectional |
| 06–10 → 12 (per-backend reports merged) | 12 → 06–10 (orchestrator consumes) | ✅ bidirectional |
| 11 → 12 (drift hook in `report.yml`) | **12 → 11 missing in dep graph** | ⚠️ **dep graph fix needed** |
| 09 ↔ 10 (mutual exclusion) | 10 ↔ 09 | ✅ bidirectional |
| 07 ↔ 08 (mutual exclusion) | 08 mentions, 07 implicit | ⚠️ make 07 explicit |
| 05 → 06–10 (baseline copy in sandbox) | 06–10 → 05 | ✅ bidirectional |
| 13 → all (docs) | All → 13 (cross-link to docs) | ✅ ok |
| 14 → all (live-repo dogfood) | All → 14 (mention live-repo migration) | ✅ ok |

## Acceptance Criteria Quality

- **Concrete & verifiable**: ~85% of DoD bullets have a clear pass/fail check (file exists, schema validates, exit code, byte-identical preservation).
- **Quantitative**: Where appropriate (e.g. "at least three primitives", "≥ 2 cases per skill", "tokens_total"), bullets specify thresholds.
- **Vague spots that need tightening**:
  - Subtask 04 DoD: "exits in under 1 second" — depends on machine and disk; soften to "without invoking the LLM (cache hit observable in logs)".
  - Subtask 14 DoD: "judged 'realistic' by `zoto-eval-judge`" — needs a numeric threshold (judge accuracy ≥ N? confidence ≥ N?) or a textual rubric reference.
  - Subtask 13 DoD: "No broken cross-references" — specify how this is verified (markdown link checker invocation).

## Overall Verdict

**Conditional approval — apply recommended fixes before execution.**

The spec is well-engineered and the dependency graph is mostly sound. The **single blocking issue** is the missing `11 → 12` dependency edge (subtask 12 will run before subtask 11 is complete under the current Phase 5 grouping, breaking the drift-hook). The two subagent re-allocations (03, 05) and the user-case-preservation gap for code-strategy files are the **highest-value non-blocking fixes**. The five risks not yet captured (LLM cost, analyser determinism, type-mirror drift, SDK API surface drift, orphaned bats template) should be added to the Risk Assessment with mitigations.

**Score (six dimensions, 1–5 scale):**

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 4.5 | All locked decisions and user goals are covered; only minor risk gaps |
| Feasibility | 4.0 | Subtask 04 is under-budgeted; otherwise realistic |
| Structure | 4.5 | Clean phase boundaries, parallelism explicit |
| Specificity | 4.0 | Most DoD bullets are concrete; a few need numeric thresholds |
| Risk Awareness | 3.5 | Existing risks well-handled; five material risks omitted |
| Convention Compliance | 4.0 | Frontmatter validation called out; subagent allocation has 2 generalPurpose defaults that should be specific |

**Composite: 4.1 / 5 — Conditional (4.0–4.4 band).**

Apply the fixes in the **Recommended Fixes** section, re-confirm the dep graph, then proceed to execution.
