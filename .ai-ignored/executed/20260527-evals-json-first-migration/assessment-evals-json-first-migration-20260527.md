# Spec Assessment: Evals JSON-First Migration with `runner` Discriminator

**Target**: `specs/20260527-evals-json-first-migration/spec-evals-json-first-migration-20260527.md`
**Assessed**: 2026-05-27
**Verdict**: Conditional

## Scores

| Dimension | Score | Notes |
|-----------|-------|-------|
| Completeness | 4/5 | Thorough coverage of migration mechanics; gaps in rollback planning, error-recovery, and the `zoto-spec-system` plugin whose evals are silently in-scope but never mentioned |
| Feasibility | 3/5 | Vite plugin approach is ambitious; AST-based migration script has non-trivial extraction hazards; the 40-file count mismatch suggests incomplete discovery |
| Structure | 4/5 | Dependency graph is sound and correctly phased; one missing edge and one over-serialized dependency reduce parallelism |
| Specificity | 5/5 | Deliverables are concrete, file paths named, validation criteria measurable |
| Risk Awareness | 3/5 | Big-bang migration risk acknowledged but under-mitigated; no rollback plan; Vitest virtual-module failure modes unexplored |
| Convention Compliance | 4/5 | Aligns well with repo patterns; minor naming drift (`eval:vitest` vs existing `eval:static:vitest`) and template conventions need care |
| **Overall** | **3.8/5** | **Conditional — address findings before executing** |

## Findings

### Strengths

- **Excellent specificity.** Every subtask names exact file paths, function signatures, and validation commands. Executing agents will have minimal ambiguity.
- **Clean discriminator design.** The `oneOf` schema with `runner` field presence as the discriminator is elegant — it avoids a fragile `type` enum and naturally extends via JSON Schema composition.
- **`RunnerParams` typed contract is well-designed.** Surfacing `expect` and `agentFactory` directly on the context avoids leaky abstractions and makes runner TS files self-contained.
- **Phase 2 four-way parallelism** is well-structured; the subtasks are genuinely independent and the convergence at Phase 3 (subtask 06) makes sense.
- **Migration idempotency** (`--dry-run`, `--apply`, `--keep-ts`, `--single` flags) is a strong risk mitigation for the migration script.
- **User-case preservation** is carefully threaded through multiple subtasks (01, 04, 07, 08) with the `_meta.generated` contract.

### Issues

| # | Severity | Subtask | Finding | Recommendation |
|---|----------|---------|---------|----------------|
| 1 | HIGH | 07 | **File count mismatch: spec says 38, repo has 40.** The glob `**/evals/*.test.ts` (excluding `evals/llm/_shared/**`, `evals/smoke*`, `evals/scenarios/**`) returns 40 files, not 38. The discrepancy includes files from `plugins/zoto-spec-system/` (4 commands + 3 agents + 1 hooks = 8 files) and `plugins/zoto-cursor-top/` (2 files). If spec was authored against a stale working tree, the migration script may under-discover. | Update the spec to reference the actual count (or "all matching") rather than hardcoding 38. Add explicit `plugins/zoto-spec-system/` and `plugins/zoto-cursor-top/` paths to the migration glob documentation. |
| 2 | HIGH | — | **No rollback plan anywhere in the spec.** A destructive migration of 40 files with no documented rollback strategy is risky. If the Vite plugin has a subtle defect that only surfaces under `pnpm eval:full` with real API keys (which subtask 10 tests last), the entire eval infrastructure is broken with no revert path beyond `git revert`. | Add a "Rollback Strategy" section to the spec index: (a) the migration script's `--keep-ts` flag is the pre-migration safety net, (b) document `git revert <commit>` as the post-migration rollback, (c) add a pre-migration checkpoint: `git stash` or feature-branch commit before running `--apply`. |
| 3 | HIGH | 07 | **AST extraction via `vm.Script` / `eval()` is a security and correctness risk.** The implementation notes suggest evaluating TS array literals in a VM context. These CASES arrays often contain template strings, `process.env` references, and imported types that cannot be evaluated in isolation. The recommended `JSON.parse` after "TS→JSON normalisation" is acknowledged as "non-trivial" but no fallback is specified. | Specify a concrete fallback: if AST extraction fails for a file, log it to the migration audit report and leave it un-migrated (with a deprecation warning) rather than silently producing corrupt JSON. Add an acceptance criterion: "migration audit shows 0 failures." |
| 4 | HIGH | 02, 06 | **Vitest `include: ['**/evals/*.json']` may over-match.** The glob `**/evals/*.json` will match *any* JSON file under any `evals/` directory, including: `evals/fixtures/baseline/.zoto/eval-system/*.json`, analyser cache files, and potentially `evals/_runs/` artifacts. The `exclude` patterns need to be comprehensive. | Explicitly enumerate exclusion patterns in subtask 06's deliverables: `**/fixtures/**`, `**/_runs/**`, `**/.zoto/**`, `**/cache/**`. Better: tighten the include glob to match the actual layout: `plugins/*/commands/evals/*.json`, `plugins/*/agents/evals/*.json`, etc. |
| 5 | MEDIUM | 03 | **Missing dependency: subtask 03 depends on subtask 02 implicitly.** Subtask 03 extends `defineLlmEval` to accept `__sourcePath`, which is "set by the JSON loader" (subtask 02). During Phase 2, both subtasks run in parallel — but 03 cannot meaningfully test the `__sourcePath` flow without the loader having established the convention. The fixture-based test partially mitigates this, but the API surface (`__sourcePath` naming and semantics) should be contracted in subtask 01 (the schema/contract subtask). | Move the `__sourcePath` option interface definition to subtask 01's `RunnerParams` or `LlmEvalConfig` contract, so both 02 and 03 code against the same spec without implicit coordination. |
| 6 | MEDIUM | 06 | **Orchestrator still references `eval:llm` as `LLM_SCRIPT`.** `scripts/eval-orchestrate.ts` line 519 hardcodes `const LLM_SCRIPT = "eval:llm"`. Subtask 06 removes the `eval:llm` script from `package.json` — but the orchestrator rewrite must also replace this reference. The subtask deliverables mention removing the "LLM-vs-static split" but don't explicitly call out the `LLM_SCRIPT` constant. | Add an explicit deliverable to subtask 06: "Replace `const LLM_SCRIPT = 'eval:llm'` with the unified vitest invocation. The orchestrator now invokes `eval:static:vitest` (or `eval:vitest`) directly instead of a separate LLM script." |
| 7 | MEDIUM | 08 | **`eval-stamp.ts` is 2,489 lines — subtask 08 modifies it heavily.** The file is massive and the subtask doesn't scope its changes precisely enough. With parallel subtasks 08 and 09 both potentially touching template-adjacent code, merge conflicts are likely. | Consider splitting the stamper changes into a focused diff (only the `stampLlmTarget` + `resolveLlmTargetPath` functions and the template deletion) and explicitly listing the unchanged functions. |
| 8 | MEDIUM | 02 | **`isNonSkillEvalJsonPath` discrimination rule has an edge case.** The heuristic "contains `/skills/<name>/evals/evals.json`" works for standard layouts, but plugins with non-standard skill directory names or skill evals not named `evals.json` could slip through. The spec does not document what happens if a skill eval file is accidentally loaded by the Vitest plugin. | Add a defensive assertion in the loader's `load` hook: after parsing JSON, check for `skill_name` field — if present, skip the file and log a warning. This is defence-in-depth against discrimination failures. |
| 9 | MEDIUM | 09 | **Underscore prefix exclusion (`_example-multi-primitive.test.ts`) relies on a Vitest glob convention that is not default.** Vitest does NOT exclude `_`-prefixed files by default — only `node_modules`. The spec says "excluded by Vitest glob patterns by default" but the actual `include` patterns would match `evals/scenarios/_*.test.ts`. | Either: (a) add `evals/scenarios/_*` to the `exclude` array in `evals/vitest.config.ts`, or (b) use `describe.skip` (already present) as the exclusion mechanism and drop the underscore-prefix claim from the spec. |
| 10 | MEDIUM | 04, 08 | **`engine/update.ts` is modified by both subtask 04 (Phase 2) and subtask 08 (Phase 5).** Subtask 04 adds `findCoLocatedTsEvals()` and deprecation warnings; subtask 08 changes `regenerateLlm` to write JSON and makes `--check` exit 2. These are different phases so they don't conflict in execution, but subtask 08 must build on 04's additions. The dependency graph only shows 08 → 07, not 08 → 04. | Add explicit dependency: subtask 08 depends on subtask 04 (transitive via 06 → 04 → 07 → 08, but the direct edge makes the engine/update.ts ownership chain clear). Alternatively, document in subtask 08 that it consumes subtask 04's `findCoLocatedTsEvals()` helper. |
| 11 | MEDIUM | 07 | **CASES extraction assumes a single `const CASES` per file.** The existing `.test.ts` files use `const CASES: LlmCaseDefinition[] = [...]` — but some might use different variable names or patterns (e.g. `SUITE_CASES`, inline arrays, or `as const` assertions). The spec doesn't document what happens on extraction failure. | Add a deliverable to the migration script: "For any file where CASES extraction fails, write an entry to the migration audit with the file path and parse error, and skip that file. The spec DoD should include: 'migration audit shows 0 skipped files'." |
| 12 | LOW | 01 | **`RunnerContext.sdk` typed as `typeof import("./sdk-bridge")` is fragile.** The runner TS file would need to know the exact module path to use the type. A named interface export would be more ergonomic. | Export a named `SdkBridge` interface from `runner-params.ts` that mirrors the SDK bridge's public surface, rather than using `typeof import(...)`. |
| 13 | LOW | 10 | **CI workflow adds a new file (`eval-format-check.yml`) but doesn't update the existing `eval-update-check.yml` coherently.** The deliverables list both adding a new workflow AND updating the existing one, creating potential duplication. | Consolidate into one workflow file. The existing `eval-update-check.yml` already runs `eval:update:check`; extend it with the additional steps rather than creating a parallel workflow. |
| 14 | LOW | 09 | **`/z-eval-create` scaffold hook update is vaguely specified.** "Update the underlying create script / engine path (most likely `scripts/eval-ensure-host.ts` or the `zoto-create-evals` skill implementation files — confirm during execution)" — the executing agent may waste cycles discovering the right file. | Pin the file: `scripts/eval-ensure-host.ts` is the confirmed host-repo bootstrapper (verified in the codebase). Name it explicitly. |
| 15 | LOW | — | **`plugins/zoto-spec-system` evals are silently in-scope but never mentioned.** The spec references "non-skill primitives" generically, but `plugins/zoto-spec-system/` contains 8 co-located `.test.ts` eval files (4 commands, 3 agents, 1 hooks). These are technically in-scope for migration but the spec only discusses `plugins/zoto-eval-system/` and `.cursor/` paths. | Explicitly acknowledge all three plugin roots (`zoto-eval-system`, `zoto-spec-system`, `zoto-cursor-top`) and `.cursor/` in the migration glob documentation. |

### Dependency Graph

- **Correct edges verified:** 01→02, 01→03, 01→04, 01→05, 02→06, 03→06, 04→06, 05→07, 06→07, 07→08, 07→09, 08→10, 09→10 — all match the Mermaid graph and manifest.
- **Missing edge:** Subtask 08 implicitly depends on subtask 04's `findCoLocatedTsEvals()` helper and `engine/update.ts` deprecation-warning additions. The transitive dependency exists (08→07→06→04) but making it explicit would help the executing agent understand the `update.ts` ownership chain.
- **Over-serialization:** Subtask 05 (manifest schema) depends only on 01, but the migration script (07) waits for both 05 and 06. Subtask 05 could run in parallel with 02/03/04 (already does) — but more importantly, subtask 07 could potentially start its *script development* before 06 completes (since the migration script doesn't need the Vitest config to extract ASTs). However, the 07→06 dependency is justified because 07 includes a verification step (`vitest run … <one migrated file>`) that requires 06's wiring. This is acceptable.
- **No parallelism improvement available** beyond what's already specified — the phases are well-designed.
- **ID ordering:** All dependency IDs reference lower-numbered subtasks. No violations.

### Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Vite plugin fails silently for edge-case JSON (malformed, BOM, unexpected encoding) | Medium | High | Add robust error handling with file-path-prefixed messages; add a JSON lint step to the migration script |
| AST extraction produces invalid JSON for complex CASES (template literals, spread operators, computed properties) | High | High | Add per-file validation against `eval-file.schema.json` post-extraction; fail-loud with migration audit entry |
| Migration count mismatch causes files to be missed | Medium | Medium | Use dynamic discovery (glob) rather than hardcoded count; assert post-migration that `findCoLocatedTsEvals()` returns empty |
| Virtual-module IDs confuse downstream tooling (reporters, IDE test explorers, stack traces) | Medium | Medium | The `//# sourceURL` heuristic is a good start; document known limitations in the README |
| `eval:llm` removal breaks external scripts or CI that reference it | Low | Medium | Add a deprecation alias that prints a warning and delegates to the new script for one release cycle |
| Subtasks 08 and 09 (parallel in Phase 5) conflict on shared files | Low | Medium | They touch different files (stamp scripts vs docs/templates); low risk but document the boundary |
| Post-migration, `pnpm eval:full` fails because the orchestrator still calls `eval:llm` | High | High | Issue #6 above — the orchestrator rewrite in subtask 06 MUST replace the `LLM_SCRIPT` constant |

## Recommendation

This is a well-structured spec with excellent specificity — the executing agents will know exactly what to build. The three HIGH issues must be addressed before execution:

1. **Fix the file count** (or make it dynamic) — the migration script must discover all 40 files, not assume 38.
2. **Add a rollback plan** to the spec index — even a brief "revert the migration commit" note would de-risk the big-bang approach.
3. **Specify AST extraction failure handling** — the migration script needs a documented fallback for files it cannot parse.

The MEDIUM issues (especially #5 `__sourcePath` coordination, #6 orchestrator `LLM_SCRIPT` constant, and #9 underscore-prefix exclusion) should also be resolved to avoid execution-time surprises. With these addressed, the spec is ready for `/z-spec-execute`.
