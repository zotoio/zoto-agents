# Spec Assessment: Eval — Single LLM Backend & Co-located Test Restructure

**Target**: `specs/20260526-eval-single-backend-colocated-restructure/spec-eval-single-backend-colocated-restructure-20260526.md`
**Assessed**: 2026-05-26
**Verdict**: Conditional

## Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 4/5 | Covers all major files and paths, but has file-count discrepancies and a missing hook-eval edge case |
| Feasibility | 4/5 | Achievable at this granularity; Phase 1 parallel safety has one latent conflict |
| Structure | 4/5 | Dependency graph is sound overall; one unnecessary edge (05 → 06) and a coordination gap between 03/04 |
| Specificity | 5/5 | Exceptional — line-level guidance, exhaustive file lists, concrete DoDs |
| Risk Awareness | 3/5 | Biggest risk (subtask 08 failure mid-flight) has a rollback sketch but no formal plan; idempotency timestamp issue is called out but not solved in the spec |
| Convention Compliance | 4/5 | Follows repo conventions; one deviation: creating repo-root `CHANGELOG.md` (new convention, not existing) |
| **Overall** | **4.0/5** | **Conditional — approve after addressing findings** |

## Findings

### Strengths

- **Outstanding specificity**: every subtask names exact files, line ranges, functions, grep validation commands, and explicit "Do NOT touch" boundaries. This is among the best-spec'd migration plans one could ask for.
- **KD-7 `_meta.generated` gate is thoroughly enforced**: the spec correctly mandates the guard at every mutation point and refuses to add a `--force` flag. The per-case SHA256 verification in subtask 08 is a strong safeguard.
- **Clean phase structure**: the 5-phase waterfall with Phase 1 parallelism is appropriate. The spec correctly identifies subtask 08 as the riskiest and isolates it behind a gate (Phase 3).
- **Skill exemption (KD-1)** is comprehensive: the spec repeatedly asserts byte-preservation of the 14 `evals.json` files and includes verification at subtask 01, 05, 08, and 09.
- **Idempotency requirement** (Requirement 10) is the right design for a one-shot migration.

### Issues

| # | Severity | Subtask | Finding | Recommendation |
|---|----------|---------|---------|----------------|
| 1 | HIGH | 08 | **File count arithmetic is wrong**: spec index says "16 declarative JSON" but the exhaustive list in subtask 08 enumerates only 16 correctly. However, the spec index claims "52 stamped artefacts" (32 + 16 + 4), then subtask 08 subtracts to "38 new files + 12 deletions = 50 operations" — but the spec index DoD says `evals/llm/test_*.test.ts` directory should be empty except `_shared/`. The 5 JSON-only commands (`z-eval-compare`, `z-eval-init`, `z-eval-jump`, `z-eval-operator`, `z-eval-start`) and 2 JSON-only agents (`zoto-eval-analyser-subagent`, `zoto-spec-executor`) plus 3 JSON-only hooks have NO corresponding LLM TS files today — they are declarative-only. This means the "32 LLM TS" count includes files that don't exist on disk; the actual on-disk count is 32 files. But those 32 include 10 skill files that get deleted, so 22 LLM TS relocate. For the 14 JSON-wrapped files (16 minus the 2 that fold into static-stamped), those become NEW TS files at co-located paths — they're not relocations but creations. The net math in the spec is correct at the high level but the narrative is confusing. | Clarify subtask 08 Implementation Notes: separate "relocate" (22 LLM TS → new path), "wrap-and-create" (14 JSON → new TS), "fold" (2 static-stamped + their JSON pairs → merged co-located), and "delete" (10 skill TS + 2 skill static) into distinct counted groups. |
| 2 | HIGH | 06 | **Hook eval target path inconsistency**: KD-2 says workspace hooks get `.cursor/hooks/evals/hooks.test.ts`. But the source hooks file is `.cursor/hooks.json` (not inside a `hooks/` directory — there is no `.cursor/hooks/` directory containing `hooks.json`; the hooks scripts live at `.cursor/hooks/*.py` and `.cursor/hooks/*.mjs`). The spec says "the eval lives at `.cursor/hooks/evals/hooks.test.ts`" implying a sibling `evals/` dir next to the scripts. This path is feasible but the spec doesn't account for the fact that `hooks.json` is at `.cursor/hooks.json` while the hook scripts are at `.cursor/hooks/sync-plugins.mjs` etc. — the `evals/` dir would go under `.cursor/hooks/` which is a script directory, not the hooks definition directory. The plugin hook pattern (`plugins/<p>/hooks/evals/hooks.test.ts`) is cleaner because `plugins/<p>/hooks/hooks.json` IS the sibling. For workspace hooks, consider `.cursor/evals/hooks.test.ts` instead to avoid polluting the scripts directory. | Clarify the workspace hook eval path. Either (a) keep `.cursor/hooks/evals/hooks.test.ts` and document that this sits alongside the hook scripts, or (b) use `.cursor/evals/hooks.test.ts` since `.cursor/hooks.json` lives at the `.cursor/` level. Update KD-2, subtask 06, and subtask 08 to be consistent. |
| 3 | MEDIUM | 03, 04 | **Phase 1 coordination gap between subtask 03 and 04**: subtask 03 rewrites `package.json` `eval:llm` script to point at a vitest config, while subtask 04 rewrites that very vitest config. Both run in Phase 1 (parallel). Subtask 03 notes this explicitly: "To avoid a temporal conflict, this subtask MAY land a 'two-step' path." This is a design smell — if subtask 03 sets `--config evals/vitest.config.ts` but subtask 04 is simultaneously rewriting that file, the end-of-phase result depends on commit order. | Either (a) add 03 → 04 dependency (making 04 Phase 2, which pushes 06 to Phase 3 and adds a phase), or (b) define a clear contract: subtask 03 writes the `package.json` line referencing `evals/vitest.config.ts` (which already exists), and subtask 04 modifies that config. Since both operate on different files (`package.json` vs `evals/vitest.config.ts`), they don't truly conflict IF subtask 03 only edits `package.json` and leaves `evals/vitest.config.ts` alone. Add an explicit cross-subtask invariant: "subtask 03 MUST NOT edit `evals/vitest.config.ts`" (it already says this in Do-NOT-touch, which is correct). The current spec is actually fine — just remove the ambiguous "two-step" language from subtask 03. |
| 4 | MEDIUM | 08 | **JSON → TS wrapping SHA256 claim is impractical**: subtask 08 says "a SHA256 of each individual case object before and after the wrap MUST match." But wrapping a JSON case object into a TS `const CASES: LlmCaseDefinition[] = [...]` inherently changes the byte representation (adding TS syntax, potentially reformatting). The SHA256 should be computed over the serialized JSON of each case object (not the raw file bytes), which requires parsing both the input JSON and the output TS to extract the case objects. | Restate the SHA256 contract: "SHA256 is computed over `JSON.stringify(caseObject, null, 2)` extracted from the source JSON and from the embedded TS `CASES` array. Both must match." This clarifies the comparison surface. |
| 5 | MEDIUM | 08 | **Rollback plan is incomplete**: subtask 08 describes a transaction lock file and step-by-step abort semantics, but if the migration fails at step 8 (deleting old files) after step 6 (manifest written), the repo is in a hybrid state. The spec says "undo files written in step 3 and revert manifest" for steps 5–7 failures, but for step 8 failures, both old and new files exist with an updated manifest. | Add explicit rollback for step 8 failure: "If deletion of old files fails partway, the migration leaves both old and new files in place; re-running with `--apply` will detect existing new files (idempotent skip), complete the remaining deletes, and produce zero diff." This is actually the natural behavior of the idempotency requirement — make it explicit. |
| 6 | MEDIUM | 09 | **Vitest collect file count is fragile**: subtask 09 expects "38 co-located files + 1 smoke = 39". The exact count depends on subtask 08's folding decisions and whether hooks produce 1 or N files. If the count is off by 1, the validation agent will block. | Replace the exact count with a range or a "verify against subtask 08's work log" instruction. Or better: subtask 09 should compute the expected count from the manifest `eval_files[]` entries rather than hardcoding. |
| 7 | LOW | 05 | **Subtask 05 dependency on 06 is unnecessary**: subtask 05 (docs cleanup) is a Phase 1 parallel task with no code dependencies. It references the future names (`defineLlmEval`, `run-llm-suite.ts`) "ahead of subtask 06's commit", which is fine since these are prose references. But the spec index shows 05 → 06 as a dependency edge. Since 05 is Phase 1 and 06 is Phase 2, the edge direction is correct (06 depends on 05, not the other way around). Verified: the graph is correct — `S05 --> S06` means 06 waits for 05. No issue here. | No change needed. |
| 8 | LOW | 10 | **`plugins/zoto-spec-system/CHANGELOG.md` is mentioned in subtask 10's notes but not in the Deliverables Checklist**: "Also update `plugins/zoto-spec-system/CHANGELOG.md` if any spec-system eval files were relocated (they were — 3 files)". Since 3 spec-system declarative JSONs do relocate, this should be a checklist item. | Add `plugins/zoto-spec-system/CHANGELOG.md` to subtask 10's Deliverables Checklist. |
| 9 | LOW | — | **No repo-root `CHANGELOG.md` exists today**: subtask 10 creates it. This is a new convention. The spec doesn't clarify the relationship between this and the per-plugin CHANGELOGs long-term. | Add a one-line note to the spec index Non-Goals or Implementation Notes explaining the intended relationship: "The repo-root CHANGELOG covers cross-plugin changes; per-plugin CHANGELOGs cover plugin-scoped releases." |

### Dependency Graph

The Mermaid graph matches the Subtask Manifest accurately. All edges are correct:

- Phase 1 (01–05) truly has no intra-phase dependencies
- Phase 2 (06) correctly depends on all of Phase 1
- Phase 3 (07, 08) correctly depend on 06 and can run in parallel
- Phase 4 (09) correctly gates on both 07 and 08
- Phase 5 (10) correctly gates on 09

**One observation**: subtasks 07 and 08 both depend only on 06, not on each other. This is correct — subtask 07 updates the engine code that runs AFTER migration, while subtask 08 writes the migration script. They can land in either order. The spec explicitly documents this coordination point in subtask 07's notes.

### Risk Summary

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **Subtask 08 migration fails mid-flight** with partial file moves + updated manifest | Low | Critical | Transaction lock + idempotent re-run. But the spec should make step-8 failure recovery explicit (see Issue #5). |
| R2 | **Idempotency broken by timestamps**: `last_updated` in manifest history entries or cached analyser `invalidate` stamps could cause re-run diffs | Medium | Medium | The spec calls this out (subtask 09 notes) but leaves the fix to the implementer. Recommend: read existing timestamps if present, only stamp on first run. |
| R3 | **Phase 1 subtask 03 + 04 temporal conflict** on vitest config path | Low | Low | Both subtasks edit different files; the "two-step" language is just confusing prose. See Issue #3. |
| R4 | **Harness hard cutover (KD-3) breaks `pnpm tsc`** across the entire repo between subtask 06 and subtask 08 | Expected | Low | Accepted by design — subtask 06's DoD explicitly scopes `tsc` to `scripts/`, `engine/`, and `_shared/` directories. The 32 existing stamped files will fail tsc until subtask 08 restamps them. This is fine as long as CI doesn't run between phases. |
| R5 | **10 skill TS file deletions remove coverage that `evals.json` doesn't fully replicate** | Low | Medium | KD-4 explicitly accepts this. The skill `evals.json` cases are the canonical coverage source. If gaps emerge, the remedy is extending `evals.json`, not restoring the TS files. |

### Per-Subtask Assessment

| ID | Rating | Notes |
|----|--------|-------|
| 01 | Good | Well-scoped schema cleanup. Clear grep-based DoD. One note: the `static.framework` description (line 31 of `config.schema.json`) still mentions `llm.codeFramework` — the subtask's deliverables correctly capture this. |
| 02 | Good | Clean removal of strategy-switch branch. The regression test (empty-plan assertion) is a smart addition. |
| 03 | Good | Simple collapse. The "two-step" coordination note should be removed (see Issue #3) since the Do-NOT-touch section already handles it. |
| 04 | Good | Tricky reporter partitioning logic is well-spec'd. Option A (filter by filepath) is correct. The `exclude` for `evals/llm/test_*.test.ts` during migration window is smart. |
| 05 | Good | Prose-only, low risk. Assigned to `zoto-eval-architect` (appropriate for docs). |
| 06 | Excellent | The most detailed subtask. Skill auto-route logic, workspace hook path, and dry-run validation are all concrete. |
| 07 | Good | Clean dispatch collapse. The "legacy-drift detection message" for the migration window is a nice touch. |
| 08 | Good but complex | Riskiest subtask. The `_meta.generated` gate, SHA256 verification, and idempotency requirement are well-designed. The file count narrative needs cleanup (Issue #1). The rollback for step-8 failures needs explicit documentation (Issue #5). |
| 09 | Good | Pure validation — correct approach. The hardcoded file count is fragile (Issue #6). |
| 10 | Good | Appropriate assignment to `zoto-plugin-manager`. Missing `plugins/zoto-spec-system/CHANGELOG.md` from deliverables (Issue #8). |

## Assessment Criteria Responses

### 1. Completeness — do the 10 subtasks cover every file, schema, engine path, and manifest change needed?

**Yes, with minor gaps.** The spec covers the full surface: schema, config, cleanup engine, orchestrator, vitest config, stamper, updater, migration, validation, and docs. The two gaps are:

- The workspace hook eval path ambiguity (Issue #2)
- The spec-system CHANGELOG omission (Issue #8)
- There are no subtasks addressing `evals/llm/_shared/index.ts` re-exports after the rename, though subtask 06 does list this in deliverables

### 2. Dependency graph correctness — are the phase boundaries and dependency edges correct?

**Yes.** Phase 1 subtasks truly can run in parallel — they operate on disjoint file sets. The 03/04 coordination concern is mitigated by the Do-NOT-touch sections. The 07/08 parallel in Phase 3 is sound because they don't share any write targets.

### 3. Risk assessment — what's the riskiest subtask? What breaks if the hard cutover fails mid-flight?

**Subtask 08 is the riskiest**, as the spec correctly identifies. If the hard cutover (KD-3, subtask 06) introduces a type error that propagates into subtask 08's migration script, the migration could abort at step 1 (validation). This is actually a safe failure mode.

The dangerous scenario is subtask 08 failing at step 8 (old-file deletion) after the manifest is already updated (step 6). The repo would have both old and new files with a manifest pointing to new paths. The spec's idempotency requirement handles this — a re-run should complete the deletes — but this should be explicit (Issue #5).

### 4. Constraint enforcement — do the DoDs enforce KD-1, KD-7, KD-9?

**Mostly yes:**
- **KD-1 (skill exemption)**: enforced in subtask 01 (grep), 05 (grep), 08 (explicit skip list + abort guard), 09 (`validate-skills.mjs` exit 0)
- **KD-7 (`_meta.generated` gate)**: enforced in subtask 08 (per-file validation, `.spec-blocker.json` on failure), subtask 07 (guard import verification)
- **KD-9 (validation gates)**: enforced in subtask 09 (four gates + idempotency check)

One gap: subtask 08's DoD doesn't explicitly require running `node scripts/validate-skills.mjs` — that's deferred to subtask 09. This is fine since 09 gates on 08.

### 5. Feasibility — is 10 subtasks the right granularity?

**Yes.** The split is clean: each subtask has a single responsibility, clear file boundaries, and appropriate agents. Subtask 08 is the largest but appropriately so — the migration is indivisible. Splitting it would create coordination problems worse than its size.

### 6. Missing edge cases — workspace hooks with unique path patterns

**Partially addressed.** The spec recognizes that `.cursor/hooks.json` is special (one source file, multiple hook entries) and proposes a single bundled `hooks.test.ts`. This is correct. However:

- The spec doesn't address what happens if a future `afterAgentResponse` hook entry is added to `.cursor/hooks.json` — the migration script should be aware that hook bundles can grow, and the co-located eval covers all entries in the bundle.
- The path `.cursor/hooks/evals/hooks.test.ts` is unusual because `.cursor/hooks/` contains scripts, not the hooks definition. The hooks definition is at `.cursor/hooks.json` (Issue #2).

For plugin hooks, the pattern is clean: `plugins/zoto-eval-system/hooks/hooks.json` → `plugins/zoto-eval-system/hooks/evals/hooks.test.ts`.

### 7. Idempotency claim

**Achievable with one caveat.** The migration script writes:
- New files at co-located paths (idempotent: skip if byte-identical content exists)
- Manifest updates (idempotent: read current, only write if different)
- History append (NOT idempotent: appends a new entry each run unless the script checks for an existing entry with the same `spec` identifier)
- Analyser cache invalidation stamps (idempotent: set flag, already set = no-op)

**The history append breaks idempotency** unless the script explicitly checks for an existing entry with `spec: "20260526-eval-single-backend-colocated-restructure"` and skips the append if found. The spec should add this check to subtask 08's deliverables.

The `last_updated` timestamp risk (R2) is also relevant: if the manifest write updates a `last_updated` field on every run, the "zero diff" claim fails. The migration script must preserve existing timestamps.

## Recommendation

**Conditional approval.** The spec is exceptionally well-structured and specific — it's ready for execution after addressing these fixes:

1. **(Required)** Add idempotency guard for `manifest.history.yml` append in subtask 08 — check for existing entry with matching `spec` identifier before appending
2. **(Required)** Clarify the workspace hook eval path (Issue #2) — pick `.cursor/hooks/evals/hooks.test.ts` or `.cursor/evals/hooks.test.ts` and make all subtasks consistent
3. **(Recommended)** Clean up the file count narrative in subtask 08 (Issue #1) to avoid confusing the executing agent
4. **(Recommended)** Make step-8 failure recovery explicit (Issue #5)
5. **(Recommended)** Add `plugins/zoto-spec-system/CHANGELOG.md` to subtask 10 deliverables (Issue #8)
6. **(Recommended)** Remove "two-step" ambiguity from subtask 03 (Issue #3)

**Go/no-go for `/z-spec-execute`: Conditional go** — execute after items 1 and 2 are resolved. Items 3–6 can be addressed during execution if needed, but resolving them upfront reduces the risk of subtask blockers.
