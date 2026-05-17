# Spec Assessment: Refactor LLM Eval Approach (Dual Strategy + Shared Types)

**Target**: `specs/20260508-refactor-llm-eval-approach/spec-refactor-llm-eval-approach-20260508.md`  
**Assessed**: 2026-05-08  
**Verdict**: Approve

## Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 4/5 | Requirements, key decisions, canonical path inventory, DoD, and execution notes are strong; a few meta-inconsistencies (status banner vs judge workflow; judge output filename) should be cleaned up. |
| Feasibility | 4.5/5 | Phasing is realistic; duplication problem is real and verified in-tree (~35 `CaseDefinition` blocks in `evals/llm/`). Dual entrypoints (`eval:llm:code`, `eval:llm:declarative`) match root `package.json`. |
| Structure | 5/5 | Subtask manifest, mermaid graph, and phase table agree; dependencies respect ID order; phases increase monotonically along every dependency edge. |
| Specificity | 4/5 | Deliverables are testable; explicit coordination points (03↔04, 05↔06 bulk regen, 02 README final pass) reduce ambiguity. |
| Risk Awareness | 4/5 | Calls out `_meta.generated` guards, CRUX-generated file rules, `CURSOR_API_KEY` skips, and doc drift during parallel work. Residual risk: README truth lags code until phase 5—called out but still execution-sensitive. |
| Convention Compliance | 4/5 | Subagent choices match `AGENTS.md` (architect 01–02, engineer 03–06). Spec’s suggested judge filename diverges from `zoto-judge-spec` / `/z-spec-judge` convention (see findings). |
| **Overall** | **4.3/5** | **Approve** |

## Findings

### Strengths

- **Accurate diagnosis**: The repo still stamps nearly identical `interface CaseDefinition` blocks across `evals/llm/test_*.test.ts`; the spec’s motivation matches `grep` reality.
- **Clear dual-strategy stance**: Preserves declarative JSON + Vitest code paths with manifest/discovery as authority—aligned with current `package.json` scripts.
- **Correct dependency topology**: `06` correctly merges documentation taxonomy (02) with template/harness rollout (05); `05` chains from `04` from `03` from `01`.
- **Executable verification**: Subtasks name concrete commands (`vitest` with `evals/llm/vitest.config.ts`, plugin tests, stamp `--check`).
- **Referenced paths exist**: e.g. `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`, `evals/_llm/runner.ts`, `evals/_llm/case.ts`, `.zoto/eval-system/` layout.

### Issues

| # | Severity | Subtask | Finding | Recommendation |
|---|----------|---------|---------|----------------|
| 1 | MEDIUM | — (index) | **Status** block says “no `zoto-spec-judge` run until explicitly approved,” while **Definition of Done** also defers judge—user has now approved judge; text reads stale. | After judge: set status to “Reviewed” or “Approved for execution” and remove or rewrite the “no judge” line so executors are not confused. |
| 2 | LOW | — (index) | **Execution Notes** name the report `zoto-judge-assessment-refactor-llm-eval-approach-20260508.md`; `zoto-judge-spec` and `/z-spec-judge` specify `assessment-[feature-name]-[yyyymmdd].md`. | Align filename in the spec to the skill/command convention (this assessment is written as `assessment-refactor-llm-eval-approach-20260508.md`). |
| 3 | LOW | — (index) | **Subtask Manifest** lists all subtasks as `Pending` while `status/*.status.yml` files exist with `state: pending`—accurate but easy to misread as “manifest out of date.” | Optionally note in Execution Notes that YAML status is canonical during `/z-spec-execute`, or refresh manifest Status column when execution starts. |
| 4 | LOW | 02 | README must reflect “post-refactor truth” but much work lands in 05–06; spec already says to finalize in phase 5—**executor** must treat subtask 06 “final doc pass” as blocking for closing 02. | No spec change required if executor follows 06 DoD; optional explicit checkbox in 02 pointing to 06 final README confirmation. |

### Subtask Manifest Validation

| Check | Result |
|-------|--------|
| Each manifest row’s file exists | Yes (01–06 present under spec directory) |
| Subtask file metadata (ID, agent, deps) matches manifest | Yes |
| Assigned subagent appropriate for work type | Yes per `AGENTS.md` |
| No dependency on higher-numbered subtask ID | Yes |
| Phase ≥ all dependencies’ phases | Yes (01→1; 02,03→2; 04→3; 05→4; 06→5) |

### Dependency Graph

- **Mermaid vs manifest**: Edges match (`01→02`, `01→03`, `03→04`, `04→05`, `02→06`, `05→06`).
- **Parallelism**: Phase 2 correctly parallelizes architect docs (02) and engineer types (03) after audit (01). No unnecessary serial edge from 02→03 or 03→02.
- **Implicit edge check**: 06 does not need a direct dependency on 04 because `05→06` transitively requires harness work; OK.

### Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Doc/README drift while 03–05 change code | Medium | Medium | Subtask 02 + 06 “final doc pass” and 06 DoD already scoped—enforce in execution. |
| Bulk regen merge conflicts if 05 and 06 both touch all `test_*.test.ts` | Medium | Medium | Spec already says to pick one owner for bulk regen; executor must assign before parallel agents run. |
| Circular type imports between `evals/llm/_shared` and `evals/_llm` | Low | Medium | Subtask 03 allows re-export / thin module; subtask 01 open questions should record the chosen graph. |
| Weakening user-authored eval cases | Low | High | Explicit guard references in 03, 05, 06—keep `evals/llm/_shared/_user-case-guards.ts` in scope for reviews. |

## Recommendation

The spec is **ready for `/z-spec-execute`**: scope is justified by the codebase, dependencies are sound, and subtasks are concrete enough for parallel execution with the documented coordination points. **Before or as part of execution**, update the spec index **Status** and **judge filename** notes so meta-text matches the Spec System commands and the user’s approval to run judge.

## Fixes Applied

User approved spec-only fixes on 2026-05-08:

1. **`spec-refactor-llm-eval-approach-20260508.md`**: Set **Status** to approved-for-execution with pointer to this assessment; checked the Definition of Done judge item; added **Manifest vs status files** note; corrected **Judge** filename and wording to match `/z-spec-judge` + `zoto-judge-spec`.
2. **`subtask-02-refactor-llm-eval-approach-docs-patterns-20260508.md`**: Added **Closing gate** deliverable tying README finalisation to subtask 06 DoD; clarified Definition of Done cross-reference.
