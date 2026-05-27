# Spec Assessment: Eval AskQuestion Strategy Bridge

**Target**: `specs/20260526-eval-askquestion-strategy-bridge/spec-eval-askquestion-strategy-bridge-20260526.md`
**Assessed**: 2026-05-26
**Verdict**: Approve

## Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 4/5 | Thorough coverage of all six scope areas; 10 requirements, 14 DoD items; minor gaps in rollback planning and one implicit dependency |
| Feasibility | 4/5 | Investigation-first approach with fallback mitigates SDK risk well; subtask 09 scope is ambitious for a single agent; `CURSOR_API_KEY` is a hard external dependency |
| Structure | 5/5 | All 27 graph edges match the manifest exactly; no backward ID deps; phase assignments consistent; good parallelism (3+2+3+2+2+1) |
| Specificity | 5/5 | Every subtask has concrete deliverables with exact file paths; implementation notes cite function names and line ranges; testing constraints are precise |
| Risk Awareness | 3/5 | SDK fallback well-handled; user-authored sovereignty preserved; but no rollback plan, analyser misclassification mitigation unclear, subtask 09 scale risk uncalled |
| Convention Compliance | 5/5 | Follows repo patterns exactly — `_user-case-guards`, `_meta.generated`, eval-system tooling, subagent protocol, `.zoto/` directory, spec format |
| **Overall** | **4.35/5** | **Approve — ready for execution** |

## Findings

### Strengths

- **Investigation-first architecture (KD-3)**: Phase 1's SDK probe before committing to the bridge helper's API surface is a disciplined de-risking choice. The ADR deliverable pins the downstream contract cleanly.
- **Airtight dependency graph**: All 27 edges verified against the subtask manifest table — perfect correspondence. No circular deps, no backward ID references, and phase assignments are consistent with topological ordering.
- **User-authored sovereignty (KD-6)**: The migration explicitly uses `isGeneratedFile(path, { strict: true })` and the `_meta.generated === true` case marker contract, exactly mirroring the prior `20260525-eval-prompt-realism-audit` spec's discipline. The diff-empty proof requirement per migrated file is a strong verification guard.
- **Exceptional specificity**: Each subtask cites exact file paths (e.g. `scripts/eval-analyse.ts#ANALYSER_VERSION`), function names (e.g. `dispatchExplicitGraders`, `runCase`), and even line-range hints. Implementation notes give concrete guidance that reduces ambiguity for the executing agent.
- **Testing isolation discipline**: Every subtask explicitly states "Do NOT trigger global test suites" with a whitelist of permitted commands. This prevents side-effects during parallel Phase execution.
- **Graceful fallback (KD-7)**: Plugin-creation integration falls back to declarative JSON with `_meta.classification_source: "fallback-default"` when `CURSOR_API_KEY` is missing, ensuring the creation flow never blocks.
- **Mutual-exclusion guard (KD-5)**: The stamper's write-time rejection of dual-backend scaffolds is a strong invariant that prevents misclassification from shipping silently.
- **Codebase references verified**: All referenced files exist — `evals/llm/_shared/*.ts` (7 files), `scripts/eval-stamp.ts`, `analyser-payload.schema.json`, `runner.ts.tmpl`, `per-primitive-test.ts.tmpl`, `site/eval-system/*.html` (4 files), `eval-askquestion-flow.svg`, and all 43 stamped `test_*.test.ts` files confirmed present.

### Issues

| # | Severity | Subtask | Finding | Recommendation |
|---|----------|---------|---------|----------------|
| 1 | MEDIUM | 12 | Missing dependency on subtask 09. The README's "Strategy bridge" section is instructed to "Cite Subtask 09's migration matrix as the example diff readers can review" — this requires 09's deliverable to exist. The dependency is implicit through Phase ordering (12 is Phase 5, 09 is Phase 4) so execution won't break, but the formal dependency is absent from the manifest. | Add `09` to subtask 12's Dependencies column in the manifest table. Update the Mermaid graph with edge `S09 --> S12`. |
| 2 | MEDIUM | 09 | Scope risk: subtask 09 migrates 43 LLM test files, produces a migration matrix, runs validation gates, and performs a smoke LLM cohort — all in a single agent session. This is the largest subtask by deliverable count and touches the most files. | Consider splitting into 09a (reclassify + migrate non-interactive targets to declarative) and 09b (upgrade interactive targets to bridge + validation gates). Or document a "batched migration" approach in implementation notes. |
| 3 | LOW | — | No rollback plan. If the migration partially completes (e.g. some targets migrated, others not), there's no documented recovery path. The mutual-exclusion guard catches misclassification but not partial migration state. | Add a "Rollback Strategy" section to the spec index noting that `git checkout -- evals/ plugins/*/evals/` restores pre-migration state, and that `pnpm run eval:update --apply --no-analyser` can re-stamp from cached payloads. |
| 4 | LOW | 09 | Missing explicit handling of edge cases in classification — what happens when a command markdown contains `AskQuestion` in a comment, documentation block, or quoted example rather than as an actual invocation instruction? The heuristic `\b(AskQuestion|askQuestion)\b` in subtask 02 may over-match. | Add a note in subtask 02/04 that the heuristic should exclude matches inside markdown code fences, quoted strings, or "Forbidden internal-mechanic vocabulary" sections — or document that over-matching is acceptable because the code-strategy path is strictly more capable. |
| 5 | LOW | 12 | Subtask 12 is assigned to Phase 5 but its declared dependencies (03, 04, 05, 06, 07, 08) all complete by Phase 3. Without the missing dep on 09 (issue #1), it could run in Phase 4 — a parallelism opportunity. With the fix from issue #1, Phase 5 placement becomes correctly justified. | This resolves naturally when issue #1's dependency is added. No separate action needed. |
| 6 | LOW | 13 | `CURSOR_API_KEY` is a hard external dependency for the smoke `eval:llm` cohort with no mitigation path — the DoD "strictly requires the key". If the key is unavailable in the execution environment, the entire spec cannot reach DoD. | Add a conditional DoD clause: if `CURSOR_API_KEY` is unavailable, the smoke cohort is skipped and the execution report records it as a known gap requiring a follow-up manual verification. |

### Dependency Graph

- All 27 edges verified against the manifest — perfect match.
- No circular dependencies detected.
- No backward ID dependencies (all subtask dependencies point to lower IDs).
- Phase assignments are consistent with topological ordering.
- **One missing edge**: `S09 --> S12` (subtask 12 references subtask 09's migration matrix but does not declare the dependency). See Issue #1.
- **Parallelism**: The 6-phase structure provides good parallelism — 3 + 2 + 3 + 2 + 2 + 1 subtasks per phase. No over-serialization detected beyond the Phase 5 placement of subtask 12 (which resolves with Issue #1's fix).

### Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SDK lacks `AskQuestion` interception surface | Medium | Medium | Documented fallback to scripted follow-ups with `interaction_style: synthetic` tag; KD-3 ADR pins the choice before implementation |
| Analyser misclassifies a primitive | Low | Medium | Mutual-exclusion guard catches dual-backend state at write time; `_meta.classification_source: "fallback-default"` allows re-classification; but post-migration misclassification (e.g. over-matching `AskQuestion` in docs) could stamp the wrong backend |
| Subtask 09 exceeds agent context/session limits | Medium | Medium | 43 files is large for a single agent; if it stalls mid-migration, partial state is not documented for recovery |
| `CURSOR_API_KEY` unavailable in execution environment | Low | High | Blocks the entire spec's DoD; no conditional path documented |
| Analyser version bump triggers expensive full re-analysis | Low | Low | Intentional trade-off documented in KD-2; the prior spec's curated rewrites are already cached and will be re-enriched rather than lost |

## Recommendation

This is a well-structured, highly specific spec that demonstrates strong understanding of the codebase conventions and eval-system internals. The investigation-first approach to SDK capability, the mutual-exclusion guard, and the user-authored sovereignty discipline are all excellent design choices. The two medium-severity issues (missing dependency on subtask 12 and subtask 09 scope) are straightforward to fix. The spec is ready for execution after addressing issues #1 and optionally #2.
