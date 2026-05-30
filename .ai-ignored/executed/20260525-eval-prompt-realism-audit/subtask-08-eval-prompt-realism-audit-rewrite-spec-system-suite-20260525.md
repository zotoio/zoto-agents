# Subtask: Rewrite spec-system suite (commands + agents + hooks + per-skill)

## Metadata
- **Subtask ID**: 08
- **Feature**: Eval Prompt Realism Audit
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: 04
- **Created**: 20260525

## Objective

Apply the Subtask 04 `eval-rewrites.json` payload to every spec-system eval JSON file. Spec-system suites mirror eval-system shape (central commands / agents / hooks plus per-skill files); the same `_meta.generated` discipline applies.

## Deliverables Checklist
- [ ] All 4 files under `plugins/zoto-spec-system/evals/commands/*.json` updated.
- [ ] All 3 files under `plugins/zoto-spec-system/evals/agents/*.json` updated.
- [ ] The 1 file under `plugins/zoto-spec-system/evals/hooks/*.json` updated.
- [ ] All 3 files under `plugins/zoto-spec-system/skills/*/evals/evals.json` updated.
- [ ] Each generated case carries refreshed `_meta.last_updated` + `_meta.generated_by`; `_meta.source_hash` and `_meta.primitive_analysis` preserved per Subtask 05's rule.
- [ ] User-authored cases byte-identical to pre-spec state.
- [ ] Per-file byte-preservation proof captured in the status report.

## Definition of Done
- [ ] All in-scope files JSON-parse successfully.
- [ ] Every generated case has been rewritten or recorded as `preserve: true`.
- [ ] Every user-authored case byte-identical to pre-spec state.
- [ ] No file outside `plugins/zoto-spec-system/` is touched.
- [ ] No file inside `plugins/zoto-spec-system/` outside `evals/` / `skills/*/evals/` is touched.

## Implementation Notes

In-scope files (11):

Commands (4):
```
plugins/zoto-spec-system/evals/commands/z-spec-create.json
plugins/zoto-spec-system/evals/commands/z-spec-execute.json
plugins/zoto-spec-system/evals/commands/z-spec-init.json
plugins/zoto-spec-system/evals/commands/z-spec-judge.json
```

Agents (3):
```
plugins/zoto-spec-system/evals/agents/zoto-spec-executor.json
plugins/zoto-spec-system/evals/agents/zoto-spec-generator.json
plugins/zoto-spec-system/evals/agents/zoto-spec-judge.json
```

Hooks (1):
```
plugins/zoto-spec-system/evals/hooks/zoto-spec-system.json
```

Per-skill (3):
```
plugins/zoto-spec-system/skills/zoto-create-spec/evals/evals.json
plugins/zoto-spec-system/skills/zoto-execute-spec/evals/evals.json
plugins/zoto-spec-system/skills/zoto-judge-spec/evals/evals.json
```

Mechanical procedure mirrors Subtasks 05, 06, 07. Pay attention to:

- **`command:z-spec-create` case 1** — the bare `/z-spec-create` precondition-abort case stays bare (registered in `audit/realism-rubric.md` bare-command exception register). Its assertions still get rewritten to the exact refuse text + on-disk absence checks (no new dated dir under `specs/`).
- **`command:z-spec-create` case 2** — `/z-spec-create` with no args enters the guided interview; this is documented behaviour and qualifies for `documented-no-args` exemption. Prompt stays bare; assertions tighten to user-visible outcomes (the interview's first `askQuestion` appears, no `specs/...` dir is created until the user confirms).
- **`command:z-spec-execute`** — realistic prompts include either a `@spec-path` argument or `--resume`. The Subtask 04 rewrites should already exercise both shapes; this subtask applies them.
- **`agent:zoto-spec-generator`** — natural-English parent-command delegation (`/z-spec-create asked you to draft a spec for …`). The current generator eval JSON is a useful self-reference for shape.
- **`hook:zoto-spec-system`** — lifecycle-event-framed prompts (e.g. `Cursor fires sessionStart in this workspace where specs/current/ holds 23 unprocessed items above the default threshold of 20.`).

### Source-hash recomputation

Same rule as Subtask 05: preserve `_meta.source_hash` AND `_meta.primitive_analysis`; only refresh `_meta.last_updated` (and leave `_meta.generated_by` at its existing stable value per spec KD-7).

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- `python3 -c "import json,glob; [json.load(open(f)) for f in glob.glob('plugins/zoto-spec-system/evals/commands/*.json') + glob.glob('plugins/zoto-spec-system/evals/agents/*.json') + glob.glob('plugins/zoto-spec-system/evals/hooks/*.json') + glob.glob('plugins/zoto-spec-system/skills/*/evals/evals.json')]"` — JSON-parse sweep.

Defer the validation trio to Subtask 11.

## Execution Notes

Applied `audit/eval-rewrites.json` to all 11 in-scope spec-system eval files (63 generated cases rewritten, 12 user-authored cases preserved). Refreshed `_meta.last_updated` on generated rows; preserved `source_hash`, `primitive_analysis`, and `generated_by`. Repaired invalid JSON syntax in `zoto-execute-spec/evals/evals.json` at HEAD. JSON parse sweep passed.

### Agent Session Info
- Agent: generalPurpose (composer-2.5-fast)
- Started: 2026-05-25
- Completed: 2026-05-25

### Work Log
- Mechanical apply from `eval-rewrites.json` with `id@index` / bare `id` key resolution for mixed skill evals.
- Validation: 0 assertion mismatches, 0 source_hash drift, 0 user-case semantic diffs vs HEAD.

### Blockers Encountered
_None._

### Files Modified
- `plugins/zoto-spec-system/evals/commands/*.json` (4)
- `plugins/zoto-spec-system/evals/agents/*.json` (3)
- `plugins/zoto-spec-system/evals/hooks/zoto-spec-system.json`
- `plugins/zoto-spec-system/skills/*/evals/evals.json` (3)
- `specs/20260525-eval-prompt-realism-audit/status/subtask-08-*.status.{md,yml}`
