# Subtask: Rewrite eval-system agent suites

## Metadata
- **Subtask ID**: 06
- **Feature**: Eval Prompt Realism Audit
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: 04
- **Created**: 20260525

## Objective

Apply the Subtask 04 `eval-rewrites.json` payload to every JSON file under `plugins/zoto-eval-system/evals/agents/` — refreshing prompts, follow-ups, assertions, and expected_output on generated cases (those carrying `_meta.generated: true`) while leaving every user-authored case byte-identical. Subtask 10 will subsequently append analyser-vocab guard assertions to `zoto-eval-analyser-subagent.json`; this subtask is responsible only for the realism rewrite of the existing case bodies.

## Deliverables Checklist
- [ ] All 8 files under `plugins/zoto-eval-system/evals/agents/*.json` updated per `audit/eval-rewrites.json`.
- [ ] Each rewritten generated case carries a refreshed `_meta.last_updated`; `_meta.generated_by` remains the existing stable string `"zoto-update-evals"` (per user decision 2026-05-25 — see spec KD-7); `_meta.source_hash` and `_meta.primitive_analysis` are preserved verbatim (per Subtask 05's "Source-hash recomputation rule").
- [ ] Each rewritten generated case retains `_meta.generated: true`.
- [ ] Top-level `target_id` preserved per file.
- [ ] Per-file byte-preservation proof for user-authored cases written to the status report.
- [ ] Summary table in the status report mirrors Subtask 05's shape.
- [ ] Agent prompt style across rewrites obeys the analyser contract's `kind: agent` row: natural-English delegation, no leading `/`, ideally mirroring how a parent command would hand off (e.g. `From /z-eval-create, please continue stamping the approved skill bundle once the configurer's needs_user_input is satisfied; …`).

## Definition of Done
- [ ] All in-scope files JSON-parse successfully.
- [ ] Every generated case has been rewritten or explicitly recorded as `preserve: true`.
- [ ] User-authored cases (if any) are byte-identical to pre-spec state.
- [ ] No file outside `plugins/zoto-eval-system/evals/agents/` is touched.
- [ ] No rewritten agent prompt begins with `/` (slash command) unless the source's analyser contract documents a slash-command surface — confirm by spot-check against the rubric.

## Implementation Notes

In-scope files (8):

```
plugins/zoto-eval-system/evals/agents/zoto-eval-adviser.json
plugins/zoto-eval-system/evals/agents/zoto-eval-analyser-subagent.json
plugins/zoto-eval-system/evals/agents/zoto-eval-comparer.json
plugins/zoto-eval-system/evals/agents/zoto-eval-configurer.json
plugins/zoto-eval-system/evals/agents/zoto-eval-executor.json
plugins/zoto-eval-system/evals/agents/zoto-eval-generator.json
plugins/zoto-eval-system/evals/agents/zoto-eval-judge.json
plugins/zoto-eval-system/evals/agents/zoto-eval-updater.json
```

The mechanical procedure mirrors Subtask 05 (read → match cases against `audit/eval-rewrites.json` → rewrite in place → refresh `_meta.last_updated` + `_meta.generated_by` → preserve `_meta.source_hash` + `_meta.primitive_analysis`).

### Agent-prompt style — recurring rewrite patterns

The analyser system prompt's per-kind row for agents says: "Natural-English request that triggers the documented agent flow ('run an eval against the new skill, judge mode')." Practical patterns the rewrites should favour:

- **Parent-command handoff**: `From /z-eval-create with skills,commands,agents,hooks approved, please scaffold the suite under …`
- **Inline delegation**: `I just merged a new skill at plugins/foo/skills/bar — generate eval cases for it and verify pnpm run eval:list still passes.`
- **Adversarial / boundary**: `Even though I already drafted the analysis, please redo it from scratch — the previous analyser run cached against the old source hash.`

Avoid:

- Third-person operator narration ("The agent should …").
- Schema-meta requests as the prompt body ("Please emit AnalyserPayload JSON …") — those leak the contract into the prompt and read like prompt-engineering chatter rather than realistic delegation. (Exception: the `agent:zoto-eval-analyser-subagent` cases legitimately ARE schema-tailoring requests because the analyser is non-interactive and only ever receives schema-shaped payloads — see the analyser source's "Output envelope reminder" section.)

### `agent:zoto-eval-comparer` — preserve the dual-flow constraint

The analyser system prompt has a target-specific section: every comparer case prompt MUST be conversational orchestration that combines a **compare flow** theme with a **judge-adjacent flow** theme. The Subtask 04 rewrites should already respect this; this subtask just applies them faithfully.

### `agent:zoto-eval-analyser-subagent` — leave room for Subtask 10

Subtask 10 will append analyser-vocab guard assertions to this file. To avoid an ordering hazard, Subtask 06's rewrites for `zoto-eval-analyser-subagent.json` are limited to the *prompt* and *expected_output* fields plus refreshing `_meta.last_updated` and `_meta.generated_by`. Do NOT rewrite the `assertions[]` arrays in this file — Subtask 10 owns that.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- `python3 -c "import json,glob; [json.load(open(f)) for f in glob.glob('plugins/zoto-eval-system/evals/agents/*.json')]"` — JSON-parse sweep.

Defer the `pnpm run eval:list` / `eval -- --collect-only` / `eval:update --check` trio to Subtask 11.

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
