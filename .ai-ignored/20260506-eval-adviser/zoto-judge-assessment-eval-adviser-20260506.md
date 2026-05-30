# Spec Assessment: Eval Adviser

**Target**: `specs/20260506-eval-adviser/spec-eval-adviser-20260506.md`
**Assessed**: 2026-05-06
**Verdict**: Approve

## Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 4/5 | All core components covered; minor gaps in config schema and version bump |
| Feasibility | 5/5 | Realistic scope, well-established patterns, achievable by assigned agents |
| Structure | 5/5 | Dependencies correct, no cycles, good parallelism, graph matches manifest |
| Specificity | 4/5 | Deliverables are concrete with file paths and counts; subtask 01 interface contract could be tighter |
| Risk Awareness | 3/5 | Good test-isolation strategy; missing rollback plan and config-path transition acknowledgment |
| Convention Compliance | 4/5 | Strong adherence to plugin conventions; minor agent-allocation tension in subtask 06 |
| **Overall** | **4.3/5** | **Approve — ready for execution** |

## Findings

### Strengths

- **Well-modeled on existing patterns**: Every subtask explicitly references the closest structural model (`zoto-eval-judge.md`, `zoto-judge-evals/SKILL.md`, etc.), making implementation straightforward for the assigned agents.
- **Clear separation of concerns**: The five gap dimensions are distinct from the judge's run-quality analysis, with no overlap. The spec articulates the adviser/judge boundary clearly.
- **Good parallelism**: Phase 2 (skill + agent) and Phase 3 (command + evals) run in parallel, minimizing total execution time while respecting real dependencies.
- **Test isolation**: Every subtask explicitly warns against triggering global test suites during parallel execution, deferring full validation to the terminal subtask 06.
- **Hybrid askQuestion contract compliance**: The command/agent/skill responsibility split is correctly specified throughout — command owns `askQuestion`, skill uses `needs_user_input`.
- **Comprehensive implementation notes**: Subtasks 01 and 02 provide detailed dimension detection criteria and workflow steps, reducing ambiguity for executing agents.

### Issues

| # | Severity | Subtask | Finding | Recommendation |
|---|----------|---------|---------|----------------|
| 1 | MEDIUM | — | **No rollback plan** in spec index. If the feature is rejected post-implementation, there is no documented procedure for cleanly removing the 4 new files and reverting the 3 modified files. | Add a Rollback section to the spec index listing all files to remove (`agents/zoto-eval-adviser.md`, `skills/zoto-advise-evals/SKILL.md`, `skills/zoto-advise-evals/evals/evals.json`, `commands/zoto-eval-advise.md`) and modifications to revert (`rules/zoto-eval-system.mdc`, `README.md`, `CHANGELOG.md`). |
| 2 | LOW | 06 | **Agent allocation tension**: Subtask 06 assigns `crux-platform-architect` but includes running `pnpm test` (categorized as "Integration testing and verification" → `crux-software-engineer` per AGENTS.md). | Acceptable as-is since documentation is the primary responsibility. Add a note that the architect may invoke test commands for validation purposes without needing a dedicated engineer subtask. |
| 3 | LOW | 06 | **No plugin version bump**: Adding a new agent, skill, and command is a feature addition that should increment `plugin.json` version (e.g., `0.1.0` → `0.2.0`). | Add `plugin.json` version bump to subtask 06's deliverables checklist. |
| 4 | LOW | 02, 05 | **Eval case count inconsistency**: Spec index DoD says ">= 2 test cases" but subtask 05 specifies "minimum 3 test cases". | Harmonize by updating the spec index DoD to say ">= 3 test cases" to match the subtask's stricter bar. |
| 5 | LOW | 02 | **No adviser-specific config option**: The judge has `judgeModel` in config; the adviser has no equivalent. If the adviser should use a different model for analysis, there is no config pathway. | Consider adding an `adviserModel` config option to the config schema, or document explicitly in subtask 02 that the adviser uses the default model and needs no dedicated config field. |
| 6 | INFO | — | **Config path transition**: The spec correctly references `.zoto/eval-system/config.yml` (matching the rule file and init template). The repo migration has since made this the only supported path — the legacy `.zoto-eval-system/config.json` is no longer read. | Resolved by the repo-wide hard-cutover migration. |

### Subtask Manifest Verification

All six verification checks pass:

- [x] All listed subtask files exist in the spec directory
- [x] Each subtask file's metadata (agent, dependencies) matches the manifest row
- [x] Assigned agents are appropriate for the work type per AGENTS.md allocation table
- [x] No subtask depends on a higher-numbered subtask ID
- [x] Phase assignments are consistent with dependencies (each subtask's phase > all dependency phases)
- [x] Subtask metadata matches manifest exactly (verified all 6 rows)

### Subtask Quality

| ID | Single Responsibility | Concrete Deliverables | Agent Match | Deps Correct | Impl Notes | Testing Strategy |
|----|----------------------|----------------------|-------------|--------------|------------|-----------------|
| 01 | Yes (design only) | Yes (5 specific sections) | Yes | Yes (none) | Excellent | N/A (design) |
| 02 | Yes (skill impl) | Yes (7 checklist items) | Yes | Yes (01) | Excellent | Deferred to 06 |
| 03 | Yes (agent impl) | Yes (6 checklist items) | Yes | Yes (01) | Good | Deferred to 06 |
| 04 | Yes (command impl) | Yes (6 checklist items) | Yes | Yes (02, 03) | Good | Deferred to 06 |
| 05 | Yes (evals only) | Yes (5 checklist items) | Yes | Yes (02) | Good | Deferred to 06 |
| 06 | Mostly (docs + validation) | Yes (7 checklist items) | Acceptable | Yes (02-05) | Good | Full suite |

### Dependency Graph

The Mermaid graph exactly matches the Subtask Manifest — all 9 edges are present and correct:

```
01 → 02, 01 → 03       (Phase 1 → Phase 2)
02 → 04, 03 → 04       (Phase 2 → Phase 3)
02 → 05                 (Phase 2 → Phase 3)
02 → 06, 03 → 06       (Phase 2 → Phase 4)
04 → 06, 05 → 06       (Phase 3 → Phase 4)
```

- No missing edges detected
- No unnecessary sequential constraints — parallelism within Phase 2 and Phase 3 is maximized
- No circular dependencies
- Phase ordering is logically sound: design → implementation → integration → documentation/validation

### Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Design doc (subtask 01) quality gates downstream work | Low | Medium | Subtask 01 has detailed implementation notes with detection criteria per dimension — reduces ambiguity |
| Config path confusion during execution | Low | Low | Rule file is authoritative; spec uses correct path |
| Parallel phase 2 agents producing inconsistent naming/patterns | Low | Medium | Both reference the same existing models (judge agent/skill); architecture doc from subtask 01 provides alignment |
| No rollback procedure if feature is rejected | Medium | Low | Clean component boundaries make manual rollback straightforward even without docs |

## Recommendation

This is a well-structured spec that follows established plugin conventions and makes good use of existing patterns as structural models. The six subtasks decompose naturally along component boundaries with correct dependency ordering and good parallelism. The two actionable findings worth addressing before execution are: (1) adding a rollback section to the spec index, and (2) adding the `plugin.json` version bump to subtask 06. The remaining findings are minor consistency improvements that could be addressed during execution without blocking.

**Ready for `/zoto-spec-execute`.**
