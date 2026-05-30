# Subtask: Rewrite workspace `.cursor/evals/*` + verify cursor-top

## Metadata
- **Subtask ID**: 09
- **Feature**: Eval Prompt Realism Audit
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: 04
- **Created**: 20260525

## Objective

Apply the Subtask 04 `eval-rewrites.json` payload to workspace-level eval files (`.cursor/evals/` and `.cursor/skills/zoto-create-plugin/evals/`). Separately, verify that `plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json` — which is entirely user-authored — remains byte-identical.

## Deliverables Checklist
- [ ] `.cursor/evals/commands/sync-plugins.json` updated per the payload.
- [ ] `.cursor/evals/commands/zoto-create-plugin.json` updated per the payload.
- [ ] `.cursor/evals/agents/zoto-plugin-manager.json` updated per the payload.
- [ ] `.cursor/evals/hooks/hooks.json` updated per the payload.
- [ ] `.cursor/skills/zoto-create-plugin/evals/evals.json` user-authored rows byte-preserved; any generated rows (if present) rewritten per the payload.
- [ ] `plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json` byte-identical to pre-spec state — recorded in the status report as `bytes_preserved: true, generated_cases: 0`.
- [ ] Per-file byte-preservation proof captured in the status report.

## Definition of Done
- [ ] All in-scope files JSON-parse successfully.
- [ ] Every generated case has been rewritten or recorded as `preserve: true`.
- [ ] Every user-authored case byte-identical to pre-spec state.
- [ ] `plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json` shows zero git diff after Phase 3 (verified via `git diff --shortstat plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json` → empty).
- [ ] No file outside `.cursor/evals/`, `.cursor/skills/zoto-create-plugin/evals/`, or `plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/` is touched.

## Implementation Notes

In-scope files (6):

```
.cursor/evals/commands/sync-plugins.json
.cursor/evals/commands/zoto-create-plugin.json
.cursor/evals/agents/zoto-plugin-manager.json
.cursor/evals/hooks/hooks.json
.cursor/skills/zoto-create-plugin/evals/evals.json
plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json   ← byte-preserve verification only
```

Notes on individual files:

- **`.cursor/evals/commands/sync-plugins.json`** — case 1 is already largely realistic (concrete user request + `/sync-plugins`); case 2 is bare `/sync-plugins` and qualifies for either a `documented-no-args` exemption or a realistic rewrite. The Subtask 04 payload makes the call.
- **`.cursor/evals/commands/zoto-create-plugin.json`** — bare `/zoto-create-plugin` cases should mostly be rewritten to include a realistic plugin description ("Scaffold a new Cursor plugin called `zoto-foo` with one skill and one command for …").
- **`.cursor/evals/agents/zoto-plugin-manager.json`** — natural-English plugin-author requests.
- **`.cursor/evals/hooks/hooks.json`** — lifecycle-event-framed prompts.
- **`.cursor/skills/zoto-create-plugin/evals/evals.json`** — predominantly user-authored; rewrite only generated rows (those with `_meta.generated: true`).
- **`plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json`** — exploration confirmed every case in this file is user-authored (no `_meta` block, classic `skill_name` + `evals[]` shape). Phase 3 leaves it untouched; this subtask's job is the byte-preserve proof.

### Source-hash recomputation

Same rule as Subtask 05: preserve `_meta.source_hash` AND `_meta.primitive_analysis`; only refresh `_meta.last_updated` (and leave `_meta.generated_by` at its existing stable value per spec KD-7).

### Byte-preserve verification for cursor-top

```
git diff --shortstat plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json
# expected: empty output
```

If the diff is non-empty, the subtask MUST stop and surface the diff in the status report's `errors[]`.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- `python3 -c "import json,glob; [json.load(open(f)) for f in glob.glob('.cursor/evals/commands/*.json') + glob.glob('.cursor/evals/agents/*.json') + glob.glob('.cursor/evals/hooks/*.json') + ['.cursor/skills/zoto-create-plugin/evals/evals.json', 'plugins/zoto-cursor-top/skills/zoto-cursor-top-monitor/evals/evals.json']]"` — JSON-parse sweep.

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
