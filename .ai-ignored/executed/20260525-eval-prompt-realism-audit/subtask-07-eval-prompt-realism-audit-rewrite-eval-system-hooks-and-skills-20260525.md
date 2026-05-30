# Subtask: Rewrite eval-system hook + per-skill suites

## Metadata
- **Subtask ID**: 07
- **Feature**: Eval Prompt Realism Audit
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: 04
- **Created**: 20260525

## Objective

Apply the Subtask 04 `eval-rewrites.json` payload to:
1. The central hook eval at `plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json` (cases[] shape, generated rows).
2. Every per-skill eval file under `plugins/zoto-eval-system/skills/*/evals/evals.json` (mixed shape: older user-authored `evals[]` rows plus newer generated rows).

User-authored rows in the per-skill files MUST be byte-preserved.

## Deliverables Checklist
- [ ] `plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json` updated per the payload (hook cases stay framed around concrete Cursor lifecycle events).
- [ ] All 9 per-skill `evals.json` files under `plugins/zoto-eval-system/skills/*/evals/` updated per the payload.
- [ ] User-authored rows (those lacking `_meta` or with `_meta.generated !== true`) are byte-identical to pre-spec state.
- [ ] Generated rows carry refreshed `_meta.last_updated` + `_meta.generated_by`; `_meta.source_hash` and `_meta.primitive_analysis` preserved per Subtask 05's rule.
- [ ] Per-file byte-preservation proof captured in the status report (diff hunk count = 0 for non-generated rows).

## Definition of Done
- [ ] All in-scope files JSON-parse successfully.
- [ ] Every generated case has been rewritten or recorded as `preserve: true`.
- [ ] Every user-authored case is byte-identical to pre-spec state (proven via `git diff --shortstat` scoped to each file).
- [ ] No file outside `plugins/zoto-eval-system/evals/hooks/` and `plugins/zoto-eval-system/skills/*/evals/` is touched.

## Implementation Notes

In-scope files (10 total):

Hook (1):
```
plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json
```

Per-skill (9):
```
plugins/zoto-eval-system/skills/zoto-advise-evals/evals/evals.json
plugins/zoto-eval-system/skills/zoto-compare-evals/evals/evals.json
plugins/zoto-eval-system/skills/zoto-configure-evals/evals/evals.json
plugins/zoto-eval-system/skills/zoto-create-evals/evals/evals.json
plugins/zoto-eval-system/skills/zoto-eval-tooling/evals/evals.json
plugins/zoto-eval-system/skills/zoto-execute-evals/evals/evals.json
plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json
plugins/zoto-eval-system/skills/zoto-judge-evals/evals/evals.json
plugins/zoto-eval-system/skills/zoto-update-evals/evals/evals.json
```

### Mixed-shape per-skill files — be careful

Several skill eval files (e.g. `zoto-create-evals/evals/evals.json`) carry BOTH:
- A low-id (`id: 1, 2, 3, …`) block of older user-authored `evals[]` rows with no `_meta`. These are bytes-preserved.
- A higher block of generator-stamped rows (also under the same `evals[]` array) carrying `_meta.generated: true`. These are rewritten per the payload.

Iterate per row, classify by `_meta?.generated === true`, then apply the payload only to generated rows. Be aware that the duplicate-id pattern (two cases sharing `id: 1`) is intentional in the older format — do not "fix" it as part of this subtask.

### Hook rewrite style

The analyser system prompt's per-kind row for hooks says: prompts should describe the Cursor lifecycle event (e.g. `Cursor fires sessionStart in this workspace after the operator opens it for the first time today and the manifest is present but .last-drift-check is absent.`). Assertions should focus on:
- Exit status 0 (per the Cursor hooks contract).
- Stdout JSON validity and the documented `additional_context` key.
- Any documented written-artefact paths (e.g. `.last-drift-check`).
- Refused branches when the hook short-circuits (early-return JSON of `{}`).

Assertions on transcript-side observations ("No askQuestion was emitted from the hook binary") may remain because hooks ARE non-interactive by contract and the assertion encodes that hard rule. Treat it as a contract-assertion exception (per `audit/realism-rubric.md`).

### Source-hash recomputation

Follow Subtask 05's rule: preserve `_meta.source_hash` AND `_meta.primitive_analysis` (the source_hash is tied to the source primitive's hash + analyser_version + model_id; none of those change here, and the cached analyser snapshot in `_meta.primitive_analysis` must stay aligned with the cache file Subtask 12 updates).

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- `python3 -c "import json,glob; [json.load(open(f)) for f in glob.glob('plugins/zoto-eval-system/evals/hooks/*.json') + glob.glob('plugins/zoto-eval-system/skills/*/evals/evals.json')]"` — JSON-parse sweep.

Defer the validation trio to Subtask 11.

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
