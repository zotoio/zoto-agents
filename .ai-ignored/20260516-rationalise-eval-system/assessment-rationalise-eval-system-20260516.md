# Spec Assessment: Rationalise Eval System (Post-Refactor Cleanup)

**Target**: `specs/20260516-rationalise-eval-system/spec-rationalise-eval-system-20260516.md`
**Assessed**: 2026-05-16
**Verdict**: Approve

## Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 4/5 | All six goals covered across subtasks; minor factual inaccuracy (42 vs 43 test files), and template import audit in subtask 01 only partially accounts for the breadth of stale `_llm/sandbox` references in templates |
| Feasibility | 5/5 | Every subtask is achievable with existing tooling; read-only audits have zero risk; code changes are surgical shim replacements and gitignore edits |
| Structure | 5/5 | Clean 4-phase dependency graph; phases are logical (audit → code changes → secondary audits → validation); no circular or unnecessary sequential constraints |
| Specificity | 4/5 | Deliverables checklists are concrete with exact file paths, grep commands, and expected outcomes; the test-count discrepancy (42 stated, 43 actual) could mislead subtask 03 into treating a valid file as a blocker |
| Risk Awareness | 4/5 | Good scoping (explicitly deferred bulk rewrites, no new tooling); identified known stale references; missing a note about the `_meta.generated: true` constraint when subtask 02 modifies stamped `_shared/` files |
| Convention Compliance | 5/5 | Uses CRUX agents (crux-platform-architect for audits, crux-software-engineer for implementation); follows spec-system conventions; read-only subtasks are separated from code-change subtasks; `.zoto/` convention followed |
| **Overall** | **4.45/5** | **Approve** |

## Findings

### Strengths

- **Surgical scope**: The spec correctly identifies this as cleanup, not redesign. Every decision explicitly defers or excludes work that doesn't belong (bulk re-stamp, new tooling, architecture reversal). This discipline dramatically reduces execution risk.
- **Excellent prior-spec continuity**: The spec builds directly on the completed `20260508-refactor-llm-eval-approach` spec, correctly citing its decisions (engine at `plugins/zoto-eval-system/engine/`) and deferring nothing the prior spec already resolved.
- **Well-chosen audit-first pipeline**: Phase 1 (subtask 01) is a read-only audit that produces a structured findings document, giving Phase 2 subtasks a concrete defect list rather than having them re-discover issues. This is a mature pattern.
- **Canonical paths table**: The spec index includes an explicit inventory of every area, making it easy for executing agents to locate surfaces without exploratory searching.
- **Phase 2 parallelism**: Subtasks 02 and 03 operate on different directory surfaces (`evals/_llm/` vs `evals/llm/_shared/`) with a clear non-interference boundary, making parallel execution safe.
- **Definition of Done is verifiable**: Every DoD item maps to a concrete command (`pnpm run validate-template`, `git status`, grep counts) or file existence check — no subjective criteria.
- **Template import audit in subtask 01 is specific**: Lists exact template paths, line numbers, and suspected stale references (e.g. `setup.ts.tmpl` line ~23, `sandbox-helpers.ts.tmpl` line ~25).
- **Out-of-scope section is explicit**: Names three specific deferrals with rationale, reducing scope creep during execution.

### Issues

| # | Severity | Subtask | Finding | Recommendation |
|---|----------|---------|---------|----------------|
| 1 | MEDIUM | 03 | **Test file count is 43, not 42.** The spec states "all 42 stamped `evals/llm/test_*.test.ts` files" in Requirements §3, Decision 3, subtask 03 deliverables, subtask 06 validation rows 3 and 8, and the spec-level DoD. Actual count on disk is **43** (`test_command_zoto-create-plugin.test.ts` appears to be the 43rd). Subtask 03's implementation notes say "Counts deviating by more than the documented filter… are a Blocker" — so the executing agent for subtask 03 will waste time investigating a false positive or incorrectly raise a blocker. | Update every occurrence of "42" to "43" (7 locations across the spec index and subtasks 03, 06). Alternatively, replace the hard-coded count with "all `test_*.test.ts` files" and let the audit in subtask 01 establish the canonical count. |
| 2 | LOW | 02 | **Template stale-reference scope is broader than subtask 02 accounts for.** Subtask 02 lists four specific template files to update, but codebase grep reveals **at least 12 stale `_llm/sandbox` references across 8 template files** (including README templates, `_shared/sandbox-helpers.ts.tmpl` with 4 separate import lines, and the `static/vitest/setup.ts.tmpl`). The deliverables checklist may be underscoped — not every template reference is enumerated. | Add a deliverable item to subtask 02: "Grep all `plugins/zoto-eval-system/templates/**/*` for `_llm/sandbox` and update or annotate every occurrence." The current list of four files is a good start but the template READMEs and the `_shared/sandbox-helpers.ts.tmpl` have additional references. |
| 3 | LOW | 01 | **`scripts/eval-stamp.ts` and `scripts/eval-cleanup-stale.ts` also reference stale engine paths.** Subtask 01's deliverables mention grepping `scripts/eval-*.ts` for moved paths, but the known starting points list only calls out `scripts/eval-analyse.ts`. Grep confirms `eval-stamp.ts` (lines 2061, 2069) and `eval-cleanup-stale.ts` (line 321) also reference `evals/_llm/runner.ts`. These are comments, not imports, so they are cosmetic — but they should be categorized in the audit. | No spec change needed — subtask 01's deliverable already covers "Grep `scripts/eval-*.ts`… for imports/comments referencing moved engine paths." This is informational: the audit will naturally find them. |
| 4 | LOW | 05 | **Workflow concurrency group uses `${{ github.workflow }}` redundantly.** The `eval-cleanup-stale-check.yml` workflow's concurrency group is `eval-cleanup-stale-check-${{ github.workflow }}-${{ github.ref }}` — `github.workflow` resolves to the workflow name which is already encoded in the literal prefix, making the group key awkwardly long. This is cosmetic and does not affect correctness. | Optionally simplify to `eval-cleanup-stale-check-${{ github.ref }}` in subtask 05, or leave as-is. |
| 5 | LOW | 06 | **Missing `tsc` check for the plugin package.** Subtask 06's deliverable says "run `pnpm exec tsc -p plugins/zoto-eval-system`" but the plugin may not have a `tsconfig.json` (many monorepo plugins use the root config). If tsc fails due to missing config, the executing agent will need to improvise. | Add an implementation note to subtask 06: "If `plugins/zoto-eval-system/tsconfig.json` does not exist, fall back to smoke-import checks." |

### Dependency Graph

The Mermaid graph in the spec index faithfully represents the Subtask Manifest:

- S01 → S02, S03, S05 (audit feeds all Phase 2–3 code work)
- S02, S03 → S04 (test realism audit depends on consolidation being done)
- S02, S03, S04, S05 → S06 (end-to-end validation is the final gate)

**No missing edges detected.** Every data dependency is captured:
- Subtask 04 correctly depends on both 02 and 03 (it audits test files that those subtasks may modify)
- Subtask 06 correctly depends on all prior subtasks
- Subtask 05 is independent of 02/03 (different surfaces) and can run in Phase 3 alongside subtask 04

**No unnecessary sequential constraints.** Phase 2 (subtasks 02 and 03) runs in parallel — and they genuinely touch different file surfaces (`evals/_llm/` vs `evals/llm/_shared/`). Phase 3 (subtasks 04 and 05) also runs in parallel, with 04 being read-only and 05 touching `.gitignore` and workflow files.

**Phase assignments are correct.** No subtask runs before its dependencies complete. Phase ordering: 1 → 2 → 3 → 4.

**Subtask ID ordering respects dependencies.** No lower-numbered subtask depends on a higher-numbered one.

### Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| False-blocker from wrong test count (43 vs 42) | High | Low | Fix the count in the spec before execution; subtask 03's implementation notes will otherwise cause the agent to stop and investigate |
| Template import scope underestimated in subtask 02 | Medium | Low | Add a comprehensive grep deliverable; the work itself is mechanical (replacing `../../_llm/sandbox.js` with `#eval-engine/sandbox.js` or the shim path) |
| Re-stamp of `_shared/` files in subtask 02 changes more than expected | Low | Medium | Subtask 02 already documents a fallback: "manually mirrored if re-stamping is too disruptive — record the choice in the Work Log" |
| `tsc -p plugins/zoto-eval-system` fails due to missing tsconfig | Medium | Low | Subtask 06 has a fallback path (smoke imports); add an implementation note |
| Subtask 02 and 03 accidentally touch overlapping files | Low | Medium | Clear boundaries are set: 02 owns `evals/_llm/` and templates; 03 owns `evals/llm/_shared/` and scripts. The only overlap point is the `evals/llm/vitest.config.ts` alias check (subtask 03 reads it, doesn't write it) |

## Recommendation

**Approve for execution.** This is a well-structured, conservatively scoped cleanup spec with clear deliverables and sensible phase ordering. The two actionable fixes before execution are: (1) correct the test file count from 42 to 43 across the spec and subtask files, and (2) expand subtask 02's template deliverable to cover all `_llm/sandbox` references found via grep (currently 12 across 8 template files, vs the 4 explicitly listed). Both are quick edits that prevent wasted agent time during execution. All other findings are LOW severity and can be addressed organically during execution.
