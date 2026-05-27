# Subtask: Validation, manifest refresh & end-to-end LLM smoke

## Metadata
- **Subtask ID**: 13
- **Feature**: Eval AskQuestion Strategy Bridge
- **Assigned Subagent**: shell
- **Suggested Model**: gpt-5.2-codex-high-fast
- **Dependencies**: 09, 10, 11, 12
- **Created**: 20260526

## Objective

Run the four validation gates end-to-end with the migrated tree, refresh `.zoto/eval-system/manifest.yml` exactly once, append exactly one new entry to `manifest.history.yml`, and capture every gate's exit log into the execution report so reviewers can confirm the spec landed cleanly.

## Deliverables Checklist
- [ ] `pnpm run eval:list` exit 0 — log captured.
- [ ] `pnpm run eval -- --collect-only` exit 0 — log captured.
- [ ] `pnpm run eval:update --check` exit 0 — log captured. If non-zero, run `pnpm run eval:update --apply --no-analyser` to refresh `_meta.last_updated` using cached analyser payloads (analyser version is already at the bumped value from Subtask 04), then re-run `--check` and capture the second log.
- [ ] `pnpm run eval:llm` smoke cohort with `CURSOR_API_KEY` exported — at least two case ids per backend (one declarative, one code-strategy with scripted interactions) — log captured. Mark each row with its `backend:` annotation.
- [ ] `.zoto/eval-system/manifest.yml` snapshot refreshed exactly once (the `eval:update --apply` from Subtask 09 may have already done this — confirm via `git diff` before refreshing again; do not double-refresh).
- [ ] `.zoto/eval-system/manifest.history.yml` gains exactly one new appended entry; no prior entry is mutated.
- [ ] Execution report at `specs/20260526-eval-askquestion-strategy-bridge/execution-report-eval-askquestion-strategy-bridge-20260526.md` captures: every gate command + its exit code; the per-backend distribution post-migration (e.g. "23 declarative, 20 code"); the manifest history diff; any blockers encountered and how they were resolved.
- [ ] Final spec status update: edit the index file's `## Status` block from `Draft` (or `Ready for Review`, depending on Step 8 outcome) to `Completed`.

## Definition of Done
- [ ] All four gate logs are exit 0; if `--check` had to be re-run, both logs are captured.
- [ ] The smoke `eval:llm` cohort shows passing rows for both backends (no `errored` status; failed cases must be triaged before declaring DoD).
- [ ] Manifest snapshot diff is reasonable: only `targets[*].eval_files`, `updated_at`, `git_ref`, and the manifest's discovery-config block change shape between pre- and post-migration. Targets removed/added match Subtask 09's migration matrix.
- [ ] `manifest.history.yml` line count = previous-line-count + (1 entry's worth of lines).
- [ ] Execution report is committed in the spec directory; aggregator-level `status.md` / `status.yml` are updated by the executor as usual.

## Implementation Notes

This subtask runs **after** Subtasks 09 (migration), 10 (plugin-creation integration), 11 (site docs), and 12 (README + eval-help). The migration's writes from Subtask 09 should already have produced a clean tree; this subtask's job is to run the gates and capture the audit trail.

Gate ordering rationale:
- `eval:list` first — proves the manifest still enumerates every target.
- `eval -- --collect-only` second — proves both backends can collect their cases.
- `eval:update --check` third — proves no drift between cached payloads and the on-disk evals.
- `eval:llm` smoke fourth — proves the new backends actually execute end-to-end.

If `eval:update --check` exits non-zero, it usually means `_meta.last_updated` drifted relative to the cached payload (very common right after a migration). The fix is `pnpm run eval:update --apply --no-analyser` — this refreshes the metadata without re-analysing (analyser version is unchanged from Subtask 04). After the refresh, `--check` MUST exit 0.

CURSOR_API_KEY handling:
- The smoke `eval:llm` run requires the key. Source it from `.env` (loaded automatically by `dotenv/config` per `runner.ts.tmpl` JSDoc) or from the operator's environment.
- **Conditional DoD**: If `CURSOR_API_KEY` is unavailable at execution time, the smoke `eval:llm` gate is downgraded from a hard requirement to a deferred gate. In this case: (1) the execution report MUST explicitly record `CURSOR_API_KEY: unavailable` and list the smoke run as `deferred`; (2) the remaining three gates (`eval:list`, `--collect-only`, `eval:update --check`) MUST still exit 0; (3) the spec status may be promoted to `Completed (smoke deferred)` with a follow-up action item to run the smoke cohort when the key becomes available.

Manifest history shape (from prior specs):
- Each entry has: `timestamp`, `git_ref`, `change_class`, `description`. Mirror the latest entry's shape; do not invent new fields.

## Testing Strategy
**IMPORTANT**: This is the verification phase — running the gates is the deliverable. Do NOT run any other test suites that aren't on the gate list above. Stick to:
- `pnpm run eval:list`
- `pnpm run eval -- --collect-only`
- `pnpm run eval:update --check` (and the conditional `--apply --no-analyser` recovery)
- `pnpm run eval:llm` (smoke cohort only)

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
