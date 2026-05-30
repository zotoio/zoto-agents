# Subtask: Three-gate validation + manifest refresh

## Metadata
- **Subtask ID**: 11
- **Feature**: Eval Prompt Realism Audit
- **Assigned Subagent**: shell
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: 05, 06, 07, 08, 09, 10, 12
- **Created**: 20260525

## Objective

Run the three validation gates promised by the spec, refresh `.zoto/eval-system/manifest.yml`, append exactly one new entry to `.zoto/eval-system/manifest.history.yml`, and write the execution report capturing every command's stdout, stderr, and exit code.

## Deliverables Checklist
- [x] `pnpm run eval:list` executed; stdout + exit code captured in the status report.
- [x] `pnpm run eval -- --collect-only` executed; stdout + exit code captured.
- [x] `pnpm run eval:update --check` executed; stdout + exit code captured.
- [x] If `eval:update --check` exits non-zero with drift reported, run `pnpm run eval:update --apply --no-analyser` (cached analyser payloads — analyser_version unchanged per KD-6, so cached payloads remain valid) and re-run `--check`; both runs captured.
- [x] `.zoto/eval-system/manifest.yml` refreshed via the final `pnpm run eval:update --apply --no-analyser` invocation (run unconditionally as the closing step of this subtask so the manifest's `updated_at` and `git_ref` reflect the spec's end-state).
- [x] `.zoto/eval-system/manifest.history.yml` gains exactly one new appended entry produced by the same final `--apply --no-analyser` run.
- [x] No prior entry in `manifest.history.yml` is mutated (verified via `git diff` showing only additions in the appended block).
- [x] `specs/20260525-eval-prompt-realism-audit/execution-report-eval-prompt-realism-audit-20260525.md` written with: per-gate exit code table; per-subtask summary (cases rewritten / cases preserved / byte-preservation proof); list of bare-command exceptions retained; list of contract-assertion exceptions retained; final pass/fail verdict.

## Definition of Done
- [x] All three gates exit 0 on the final run.
- [x] `manifest.history.yml` git diff shows pure-additions (no deletions, no modifications to prior entries).
- [x] Execution report exists and references every Phase 3+4 subtask's status file.
- [x] No file outside `.zoto/eval-system/manifest.yml`, `.zoto/eval-system/manifest.history.yml`, and `specs/20260525-eval-prompt-realism-audit/execution-report-...` is touched by this subtask.
- [x] The execution report explains the final `--apply --no-analyser` invocation always runs as the closing step; if it had to also remediate critical drift, the report explains the drift cause and the targeted-fixup path used (see "When `--apply --no-analyser` is insufficient" under Implementation Notes).

## Implementation Notes

### Validation sequence

Run the three gates, record each exit code, then ALWAYS run `pnpm run eval:update --apply --no-analyser` as the closing step so the manifest snapshot and history entry reflect the spec's end-state (the command is idempotent when no drift exists — it still rewrites `manifest.yml` `updated_at` / `git_ref` and appends one history entry). Re-run `--check` after the apply and confirm exit 0.

```bash
# Gate 1
pnpm run eval:list 2>&1 | tee /tmp/eval-list.log
echo "exit=$?" >> /tmp/eval-list.log

# Gate 2
pnpm run eval -- --collect-only 2>&1 | tee /tmp/eval-collect.log
echo "exit=$?" >> /tmp/eval-collect.log

# Gate 3
pnpm run eval:update --check 2>&1 | tee /tmp/eval-update-check.log
echo "exit=$?" >> /tmp/eval-update-check.log

# Closing manifest refresh (always run, regardless of gate-3 outcome)
pnpm run eval:update --apply --no-analyser 2>&1 | tee /tmp/eval-update-apply.log
echo "exit=$?" >> /tmp/eval-update-apply.log

# Post-apply verification (must exit 0)
pnpm run eval:update --check 2>&1 | tee /tmp/eval-update-check-2.log
echo "exit=$?" >> /tmp/eval-update-check-2.log
```

Capture all five logs in the execution report. The post-apply `--check` (final log) is the authoritative gate for this subtask's pass/fail verdict.

### Manifest invariants

After the final `--apply --no-analyser` (or the clean `--check`):

```bash
# Confirm manifest.history.yml gained exactly one new appended entry
git diff --stat .zoto/eval-system/manifest.history.yml
# Expected: insertions-only, no deletions.

# Spot-check the appended entry references this spec's date
tail -n 30 .zoto/eval-system/manifest.history.yml
```

If the history file shows deletions, STOP and surface the diff in the status report's `errors[]`. The append-only invariant is encoded in `audit/realism-rubric.md`'s contract-assertion exception list.

### What `pnpm run eval:update --check` actually compares

`--check` (see `plugins/zoto-eval-system/engine/update.ts:592–684`) compares the manifest snapshot's stored `targets[].content_hash` against the live `content_hash` of each discovered source primitive (skill SKILL.md, command markdown, agent markdown, hook bundles). It does NOT read any per-case `_meta` field, including `_meta.source_hash`.

Drift is classified by `classify` (`update.ts:508–586`). For non-skill modified targets, the classifier returns `non-critical`, and `--check` exits 0 regardless. Critical drift arises for: added skills, added non-skill targets without eval coverage, removed targets with active generated cases, and modified skill frontmatter (name/description).

### When `--apply --no-analyser` is insufficient

If a critical "added" delta is reported for a primitive that has no cached analyser payload (loader at `update.ts:1315–1335` returns null and the drifted target emits `{"skipped": "no_cached_analyser_payload"}` per `update.ts:1597`), `--apply --no-analyser` will not converge. In that case, run `pnpm run eval:update --apply --with-analyser --target <id>` targeted at the specific primitive. Re-run `--check` afterwards. Record the escalation in the execution report under a dedicated `## Fallback applied?` section.

### Diagnosing re-drift

If `--check` continues to fail after `--apply --no-analyser`, the cause is almost always a source-primitive content edit by an earlier subtask. Diff candidates with `git diff --stat plugins/*/agents/*.md plugins/*/commands/*.md plugins/*/skills/*/SKILL.md plugins/*/hooks/hooks.json .cursor/commands/*.md .cursor/agents/*.md .cursor/hooks.json` and surface the result in the status report.

### Execution report shape

```markdown
# Execution Report — Eval Prompt Realism Audit (20260525)

## Gate exit summary
| Gate | Command | Exit | Notes |
|------|---------|------|-------|
| 1 | `pnpm run eval:list` | 0 | ... |
| 2 | `pnpm run eval -- --collect-only` | 0 | ... |
| 3 | `pnpm run eval:update --check` | 0 | ... |
| 4 (closing apply, always) | `pnpm run eval:update --apply --no-analyser` | 0 | refreshes manifest + appends history entry |
| 5 (post-apply verify) | `pnpm run eval:update --check` | 0 | authoritative gate; if non-zero, see "Fallback applied?" |

## Per-suite summary
(table from each Phase 3+4 status file)

## Bare-command exceptions retained
(list from `audit/realism-rubric.md` bare-command exception register)

## Contract-assertion exceptions retained
(list from `audit/realism-rubric.md` contract-assertion exception list)

## Final verdict
PASS | FAIL
```

## Testing Strategy

This subtask IS the validation pass — it runs the project's eval gates. It does NOT trigger the broader `pnpm test` because that runs every plugin's vitest / jest suite and is not part of the eval validation trio promised by the spec.

If `pnpm test` was previously green on the branch (verify by checking the most recent CI run before Phase 1), this subtask can optionally append `pnpm test 2>&1 | tail -n 50` to the report as a sanity check, but the result is informative, not gating.

## Execution Notes
[To be filled by executing agent]

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
