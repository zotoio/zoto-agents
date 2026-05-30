# Subtask: Existing eval reclassification & migration

## Metadata
- **Subtask ID**: 09
- **Feature**: Eval AskQuestion Strategy Bridge
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: claude-opus-4-7-thinking-xhigh
- **Dependencies**: 02, 04, 05, 06, 07, 08
- **Created**: 20260526

## Objective

Reclassify every primitive currently covered by the eval suite, run the analyser to refresh `_meta.primitive_analysis` (with the new `requiresInteraction` field), migrate eligible non-interactive stamped LLM tests to declarative JSON, and upgrade the remaining interactive tests to import the new `askquestion-bridge`. User-authored cases stay byte-identical throughout.

## Deliverables Checklist
- [ ] `pnpm run eval:update --apply --with-analyser` invocation log captured under `audit/migration-update-log.txt`. The flag `--with-analyser` forces re-analyse of every cached payload (Subtask 04's version bump invalidated them all anyway).
- [ ] Migration matrix at `audit/migration-matrix.md`: rows = each of the 43 stamped LLM tests + every manifest target without a stamped test; columns = pre-migration backend, post-migration backend, migration_class, file path before, file path after, diff-empty proof for user-authored rows.
- [ ] Eligible non-interactive primitives migrated: their `evals/llm/test_<kind>_<name>.test.ts` is removed (with `_user-case-guards.isGeneratedFile(path, { strict: true })` enforced first), and their case rows land in `plugins/<plugin>/evals/<kind>/<name>.json` with identical case payloads. Existing `_meta.generated: true` markers are preserved.
- [ ] Interactive primitives keep their `test_*.test.ts` file but switch to the new bridge import; existing case data is preserved verbatim except for the import line(s) added by Subtask 07's template change.
- [ ] User-authored cases (no `_meta` or `_meta.generated !== true`, OR mixed-shape files) byte-identical pre-/post-migration; the matrix records a `git diff --stat` line per file proving zero byte change.
- [ ] Mutual-exclusion guard from Subtask 06 not tripped by any production write (because the migration explicitly removes the opposite-backend artefact first).

## Definition of Done
- [ ] Every entry in Subtask 02's `eval-corpus-baseline.json` has a corresponding row in the migration matrix.
- [ ] No file with `_meta.generated !== true` is touched (proven by per-file `git diff` snippets in the matrix).
- [ ] `pnpm run eval:list` exits 0 after migration.
- [ ] `pnpm run eval -- --collect-only` exits 0 after migration.
- [ ] `pnpm run eval:update --check` exits 0 (no drift).
- [ ] `evals/_runs/<ts>/llm.yml` from a smoke run contains the new `backend:` annotation per row (verifies subtask 07/08's reporter changes wired through).
- [ ] Manifest snapshot is NOT refreshed in this subtask (subtask 13 owns the manifest refresh and the single appended history entry).

## Implementation Notes

Migration ordering matters:
1. Run `pnpm run eval:analyse --invalidate` (or equivalent — find in `scripts/eval-analyse.ts`) to clear cache, OR rely on the version-bump invalidation alone. The cache directory is `.zoto/eval-system/cache/analyser/`.
2. Run `pnpm run eval:update --apply --with-analyser`. The stamper from Subtask 06 takes care of routing per-target. Capture stdout+stderr.
3. For each LLM test that the stamper rewrites, verify the file's first line is still `// _meta.generated\: true` for any retained code-strategy file, OR the file no longer exists for migrated targets.
4. Run the three validation gates and record their exit codes.
5. Commit-shape audit: produce the `git status --porcelain` output capped to the eval-related paths in `audit/migration-git-status.txt` so the next phase has a clean reference.

Batched migration approach (scope risk mitigation):
- Process targets in batches grouped by plugin (e.g. `zoto-eval-system`, `zoto-spec-system`, `zoto-cursor-top`, workspace-level) rather than running a single `eval:update --apply` across all 43 tests at once.
- After each batch: run `pnpm run eval:list && pnpm run eval -- --collect-only` to confirm no regression before proceeding.
- If a batch introduces drift or a gate failure, isolate the offending target, record the issue in the migration matrix with `migration_class: "deferred"`, and continue with the remaining batches. Revisit deferred targets after all batches complete.
- The agent session should checkpoint the migration matrix after each batch so progress is recoverable if the session is interrupted.

User-authored sovereignty:
- Files like `plugins/zoto-eval-system/skills/zoto-create-evals/evals/evals.json` carry mixed user-authored + generated rows. The stamper from Subtask 06 already preserves rows lacking `_meta.generated === true`. Verify that at the file level — a `git diff` on the file MUST show only changes to rows with `_meta.generated === true`.
- Files like `plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json` (entirely user-authored) MUST be untouched.

When the stamper attempts to migrate a target whose existing TS test contains user-authored case rows (legacy hand-written), it MUST refuse (via the `isGeneratedFile` strict check) and the matrix records `migration_class: "user-authored-byte-preserve"`.

Smoke `pnpm run eval:llm` cohort:
- This subtask runs a small smoke (one or two case ids per backend) WITH `CURSOR_API_KEY` set to verify the new shape actually executes — full LLM run with all cases is left to Subtask 13. Use the `--list` flag first to confirm both backends enumerate cases; then run a focused subset.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global non-eval test suites. Permitted runs:
- `pnpm run eval:list`
- `pnpm run eval -- --collect-only`
- `pnpm run eval:update --apply --with-analyser` (the migration itself)
- `pnpm run eval:update --check`
- `pnpm run eval:llm` smoke run (one or two case ids only)

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
[List of files changed]
