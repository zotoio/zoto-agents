# Subtask 06 — Eval AskQuestion Strategy Bridge — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 06 |
| feature | Eval AskQuestion Strategy Bridge |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — Stamper code path identified and updated. Likely entry points (verify in Phase 1 read of `scripts/eval-stamp.ts` or wherever `stampLlmCodeStrategy` lives — the `per-primitive-test.ts.tmpl` JSDoc names the function): the analyser-payload reader, the per-target dispatch, and the file-write call. (`scripts/eval-stamp.ts`)
- [x] **D02** — Per-target dispatch logic: when `_meta.primitive_analysis.requiresInteraction === true`, stamp the code-strategy TypeScript file under `evals/llm/test_<kind>_<name>.test.ts`; when `false` (or omitted), stamp the declarative JSON case row(s) under the appropriate `plugins/<plugin>/evals/<kind>/<name>.json`. Hooks always default to declarative (they never call `AskQuestion`). (`scripts/eval-stamp.ts`)
- [x] **D03** — Mutual-exclusion guard: before writing, the stamper checks the OPPOSITE backend's expected output path; if it exists, the stamper either rewrites away (when `--apply` AND we are migrating intentionally) or fails with a clear stderr message + non-zero exit (when not migrating). The guard reuses `_user-case-guards.isGeneratedFile` to avoid touching user-authored stamps. (`scripts/eval-stamp.ts`)
- [x] **D04** — Per-target classification echoed into stamped output: every generated case row gets `_meta.primitive_analysis.requiresInteraction` + `_meta.primitive_analysis.interactionStyle` mirroring the analyser payload; every stamped TypeScript file gets a leading JSDoc comment annotating the choice and the analyser version that drove it. (`scripts/eval-stamp.ts`)
- [x] **D05** — Targeted unit tests for the new dispatch + guard logic (vitest scoped to the stamper file). (`scripts/__tests__/eval-stamp-routing.test.ts`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `scripts/eval-stamp.ts` — Per-target routing exports, main() wire-in, buildPrimitiveAnalysisMeta integration
- **created** `scripts/__tests__/eval-stamp-routing.test.ts` — 9 vitest cases for dispatch, guard, and stamp routing
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Added resolveLlmPerTargetBackend, resolveLlmPerTargetBackendPaths, enforcePerTargetBackendExclusion,
stampTargetWithBackendRouting, and --apply CLI flag. main() routes via cached/fresh analyser payload;
heuristic fallback tags classification_source fallback-default. No live eval migration (subtask 09).
Vitest 9/9 passed. tsc --skipLibCheck reports only pre-existing eval-analyse.ts errors.

<!-- status:notes:end -->
