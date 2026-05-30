# Subtask: Rewrite eval-system command suites

## Metadata
- **Subtask ID**: 05
- **Feature**: Eval Prompt Realism Audit
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: 04
- **Created**: 20260525

## Objective

Apply the Subtask 04 `eval-rewrites.json` payload to every JSON file under `plugins/zoto-eval-system/evals/commands/` — refreshing prompts, follow-ups, assertions, and expected_output on generated cases (those carrying `_meta.generated: true`) while leaving every user-authored case byte-identical.

## Deliverables Checklist
- [ ] All 13 files under `plugins/zoto-eval-system/evals/commands/*.json` updated per `audit/eval-rewrites.json`.
- [ ] Each rewritten generated case carries a refreshed `_meta.last_updated` (ISO-8601 timestamp at write time); `_meta.generated_by` remains the existing stable string `"zoto-update-evals"` (per user decision 2026-05-25 — see spec KD-7); `_meta.source_hash` is preserved per "Source-hash recomputation rule" below.
- [ ] Each rewritten generated case retains `_meta.generated: true`.
- [ ] The top-level `target_id` field is preserved verbatim per file (no schema reshape).
- [ ] Per-file byte-preservation proof for user-authored cases written to `specs/20260525-eval-prompt-realism-audit/status/subtask-05-...status.md` (a diff hunk count of `0` for non-generated cases).
- [ ] A summary table in the status report listing each file, the number of generated cases rewritten, and the number of user-authored cases preserved.

## Definition of Done
- [ ] All in-scope files JSON-parse successfully.
- [ ] Every case with `_meta.generated: true` was either rewritten per the payload or explicitly recorded as `preserve: true` in `eval-rewrites.json`.
- [ ] Every case without `_meta.generated: true` is byte-identical to its pre-Phase-3 state (proven via `git diff --shortstat` scoped to the file).
- [ ] No file outside `plugins/zoto-eval-system/evals/commands/` is touched.
- [ ] Targeted lint: `pnpm exec ajv validate -s plugins/zoto-eval-system/templates/schema/case-meta.schema.json -d "plugins/zoto-eval-system/evals/commands/*.json"` succeeds for every `_meta` block (run via the helper script if simpler; the gate is that every `_meta` block is schema-valid).

## Implementation Notes

In-scope files (13):

```
plugins/zoto-eval-system/evals/commands/z-eval-advise.json
plugins/zoto-eval-system/evals/commands/z-eval-compare.json
plugins/zoto-eval-system/evals/commands/z-eval-configure.json
plugins/zoto-eval-system/evals/commands/z-eval-create.json
plugins/zoto-eval-system/evals/commands/z-eval-execute.json
plugins/zoto-eval-system/evals/commands/z-eval-help.json
plugins/zoto-eval-system/evals/commands/z-eval-init.json
plugins/zoto-eval-system/evals/commands/z-eval-judge.json
plugins/zoto-eval-system/evals/commands/z-eval-jump.json
plugins/zoto-eval-system/evals/commands/z-eval-operator.json
plugins/zoto-eval-system/evals/commands/z-eval-start.json
plugins/zoto-eval-system/evals/commands/z-eval-update.json
plugins/zoto-eval-system/evals/commands/z-eval-workflow.json
```

Mechanical procedure per file:
1. Read the file, parse JSON.
2. For each entry in `cases[]`:
   - If the case id is in `audit/eval-rewrites.json[<path>].cases` AND `preserve === false`: replace `prompt`, `follow_ups` (if provided), `assertions`, `expected_output` with the payload's `rewrite_*` values.
   - Set `_meta.last_updated = <ISO-8601 now>`. Leave `_meta.generated_by` untouched; it should already read `"zoto-update-evals"` (the existing stamper string per user decision 2026-05-25). If a row is missing `_meta.generated_by` for any reason, set it to `"zoto-update-evals"` so the value is stable across the suite.
   - Preserve `_meta.source_hash`: see "Source-hash recomputation" below.
   - Leave `_meta.primitive_analysis` block untouched (still records the prior analyser snapshot — Subtask 11 may refresh via `pnpm run eval:update --apply --no-analyser` if drift remains).
3. If the case id is missing from the payload OR `preserve === true`: leave the case untouched (and verify byte-identity post-write).
4. Write the file back with the existing indentation (two-space JSON, trailing newline).

### Source-hash recomputation rule

`_meta.source_hash` per the analyser-payload schema is the sha256 of the cache-key tuple `(normalised source content + analyser_version + model_id)`. Because the realism rewrite does NOT change `analyser_version` or `model_id`, and the *source primitive* (the command markdown) has not changed, `_meta.source_hash` MUST remain the value it had before the rewrite. Do NOT recompute against the rewritten case body — that would break the next `pnpm run eval:update --check` (the updater compares against the source markdown hash, not the case body hash).

**TL;DR — preserve `_meta.source_hash` from the pre-rewrite case; only refresh `_meta.last_updated` and `_meta.generated_by`.** This keeps `pnpm run eval:update --check` exit 0 in Subtask 11.

### Bare-command exceptions

Cases that `audit/realism-rubric.md` lists in the bare-command exception register keep their bare prompt and only have their assertions rewritten (the assertion list still flows through `rewrite_assertions`).

### User-authored cases (rare in this directory)

If any file under `evals/commands/` contains a case lacking `_meta` or with `_meta.generated !== true`, treat it like Subtask 09's cursor-top file: byte-preserve and record in the per-file diff proof.

### Idempotency

Re-running this subtask against an already-rewritten tree MUST produce zero new diffs (apart from `_meta.last_updated` if the agent chooses to refresh it on every run — prefer to skip the refresh when the payload-driven content is already in place to keep the run idempotent).

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. Run only:
- `python3 -c "import json,glob; [json.load(open(f)) for f in glob.glob('plugins/zoto-eval-system/evals/commands/*.json')]"` — JSON-parse sweep.
- A targeted Vitest run scoped to any new self-test the rewrite helper introduces (none expected by default).

Defer `pnpm run eval:list` / `eval -- --collect-only` / `eval:update --check` to Subtask 11.

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
