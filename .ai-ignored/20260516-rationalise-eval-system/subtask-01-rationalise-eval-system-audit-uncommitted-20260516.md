# Subtask: Audit Uncommitted Eval-System Changes

## Metadata
- **Subtask ID**: 01
- **Feature**: Rationalise Eval System
- **Assigned Subagent**: crux-platform-architect
- **Dependencies**: None
- **Created**: 20260516

## Objective

Produce a single written audit of every uncommitted change to the eval system (169 modified files, -24 068 / +7 630 lines, plus untracked artefacts and a new workflow). The audit categorises each change as **coherent**, **cleanup needed**, or **defect**, names the owning follow-up subtask (02–05), and surfaces any blocker that requires re-planning before Phase 2 starts.

This is a **read-only** subtask. No code or content edits.

## Deliverables Checklist

- [x] Inventory the deleted set in `evals/_llm/` (declarative engine modules + graders) and confirm each has a counterpart at `plugins/zoto-eval-system/engine/` with equivalent exports.
- [x] Inventory the deleted set in `evals/llm/_shared/` (old shared files) and confirm each is replaced by the new helpers (`code-strategy-case.ts`, `run-code-strategy-suite.ts`, `sandbox-helpers.ts`, `setup.ts`, `zoto-llm-reporter.ts`).
- [x] Verify `evals/_llm/case.ts` and `evals/_llm/_user-case-guards.ts` are thin re-export shims pointing at the engine.
- [x] Confirm whether `evals/_llm/sandbox.ts` is a shim or a duplicate full implementation. If duplicate, flag for subtask 02.
- [x] Grep all template files (`plugins/zoto-eval-system/templates/llm/**`, `templates/static/**`) for imports of `../../_llm/*` and list each occurrence with the recommended replacement (`#eval-engine/*` alias or shim).
- [x] Grep all `evals/llm/test_*.test.ts` files for any remaining `interface CaseDefinition` inline declarations or imports from `../../_llm/*` outside of allowed shims.
- [x] Grep `scripts/eval-*.ts` and `evals/setup.ts` for imports/comments referencing moved engine paths (`evals/_llm/runner.ts`, `evals/_llm/manifest-snapshot.ts`, `evals/_llm/sdk-bridge.ts`, etc.). List each with a recommended fix.
- [x] List all untracked artefacts: `evals/_runs/*` (count, size estimate), `.zoto/eval-system/cache/analyser/*` (count). Confirm the `.gitignore` does **not** currently cover them.
- [x] Inspect `.github/workflows/eval-cleanup-stale-check.yml` for correctness (script invocation, exit-code handling, concurrency).
- [x] Spot-check 3 modified test files (`evals/llm/test_command_*.test.ts`) to confirm they use the shared harness pattern and contain no orphan imports.
- [x] Inspect `.zoto/eval-system/config.yml`, `manifest.yml`, `manifest.history.yml` modifications and confirm the changes align with the documented schema (no broken keys).
- [x] Verify `package.json` script mapping is internally consistent: `eval:llm:code` uses Vitest on `evals/llm/`, `eval:llm:declarative` uses the engine path, `eval:update` and `eval:compare` point at engine modules.
- [x] Write `audit-rationalise-eval-system-20260516.md` in the spec directory with the structure below.
- [x] Open one or more **Blockers** in the audit if anything cannot proceed without re-planning (e.g. an engine module is missing or a shim is broken).

### Audit document structure

```markdown
# Audit — Rationalise Eval System (20260516)

## Summary
- Files reviewed: <n>
- Coherent: <n>     Cleanup: <n>     Defect: <n>     Blocker: <n>

## Findings

### F-01 [severity] [owning subtask]
**Path(s):** ...
**Observation:** ...
**Recommended action:** ...

### F-02 [severity] [owning subtask]
...

## Blockers
(Empty unless something requires re-planning before Phase 2.)

## Out-of-scope items found
(Anything noticed that the spec does not cover; for awareness only.)
```

## Definition of Done
- [x] Every uncommitted file (modified, added, deleted, untracked) is accounted for in the audit, either explicitly or via a category bucket (e.g. "all 130 untracked `evals/_runs/*` directories — covered by F-NN").
- [x] Each finding cites the file path(s), the observation, and the owning subtask (02 / 03 / 04 / 05) or marks itself out-of-scope.
- [x] The audit document compiles findings into severity totals at the top.
- [x] No code or content files are modified; only the audit document is written.

## Implementation Notes

- Use `git status`, `git diff --stat`, and `Grep`/`Glob` to gather data. Do **not** run any of the eval scripts or invoke `tsx`/`vitest` — execution belongs to subtask 06.
- The spec's **Decision 2** is the allow-list for `evals/_llm/`. Any file there that does not appear in Decision 2 is either a defect (subtask 02 fixes) or a known shim (`case.ts`, `_user-case-guards.ts`).
- The spec's **Decision 3** is the rule for `evals/llm/_shared/`. Tests must import only from `./_shared/*` and `#eval-engine/*`.
- When in doubt about whether a finding is "cleanup" or "defect", use:
  - **Defect** = breaks the architecture (duplicate engine module, broken alias, missing shim).
  - **Cleanup** = stale doc reference, unused import, missing gitignore entry.
  - **Cosmetic** = wording in a comment with no functional impact (still record, but mark low-priority).
- Known starting points to grep for (from the parent generator's exploration):
  - `evals/_llm/sandbox.ts` is suspected to be a duplicate, not a shim.
  - `scripts/eval-analyse.ts` line ~1011 has a comment referring to `evals/_llm/analyser-payload.ts` (now at the engine).
  - `evals/llm/test_skill_zoto-configure-evals.test.ts` line ~24 has assertion text mentioning `evals/_llm/manifest-snapshot.ts` (now at the engine).
  - Templates `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/setup.ts.tmpl` (line ~23) and `sandbox-helpers.ts.tmpl` (line ~25) import from `../../_llm/sandbox.js`.
  - `plugins/zoto-eval-system/templates/static/jest/setup.ts.tmpl` line ~25 imports from `./_llm/sandbox.ts`.

## Testing Strategy

**Read-only subtask — no tests run.** Verification consists of:
- The audit document exists and is well-formed.
- Severity totals at the top match the count of findings below.
- Every category in Deliverables has at least one entry or an explicit "no findings" note.

Do **not** run `pnpm test`, `pnpm run eval:*`, or any global test suite.

## Execution Notes

### Agent Session Info
- Agent: [Not yet assigned]
- Started: [Not yet started]
- Completed: [Not yet completed]

### Work Log
[Agent adds notes here during execution]

### Blockers Encountered
[Any blockers or issues]

### Files Modified
[List of files changed — should be only the audit doc]
