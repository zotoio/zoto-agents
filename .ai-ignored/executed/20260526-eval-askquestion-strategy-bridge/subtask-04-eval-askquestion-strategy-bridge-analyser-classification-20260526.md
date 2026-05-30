# Subtask: Analyser schema & classification detection

## Metadata
- **Subtask ID**: 04
- **Feature**: Eval AskQuestion Strategy Bridge
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: claude-opus-4-7-thinking-xhigh
- **Dependencies**: 02
- **Created**: 20260526

## Objective

Extend the analyser payload to carry interaction classification, update the analyser system prompt so it actually emits that classification, and update `scripts/eval-analyse.ts` (and any related runtime code) to pass through, validate, and cache the new fields. Bump `analyser_version` exactly once so every cached payload re-analyses on the next `eval:update --with-analyser` pass.

## Deliverables Checklist
- [x] `plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json` carries two new optional top-level fields: `requiresInteraction: boolean` and `interactionStyle: enum<"command-owned"|"subagent-escalated"|"none">`. Both are added with `additionalProperties: false` still in force; the `required` list is unchanged so old cached payloads still validate.
- [x] `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` gains an explicit "Interaction classification" section explaining the heuristic (commands typically own `AskQuestion`, agents/skills return `needs_user_input`, hooks are non-interactive per existing analyser guidance). Add at least one worked example per `interactionStyle` value.
- [x] `scripts/eval-analyse.ts` recognises the new fields in the parsed payload, propagates them into `_meta.primitive_analysis`, and exposes them through the in-memory `AnalyserPayload` shape consumed by the stamper.
- [x] `plugins/zoto-eval-system/engine/analyser-payload.ts` (or wherever the canonical TypeScript type lives — discovered while implementing) gains the two optional fields with JSDoc.
- [x] `analyser_version` is bumped exactly once (current value found in `scripts/eval-analyse.ts` constants); the new value is recorded in `audit/analyser-version-bump.md` with the prior value, the new value, and the trigger justification (this spec).
- [x] Targeted tests for the schema change: at least one test that asserts the schema rejects a non-boolean `requiresInteraction`, accepts `null`-equivalent omission, and round-trips a real payload.

## Definition of Done
- [x] Schema validation rejects payloads that emit `requiresInteraction` as a non-boolean.
- [x] Schema validation accepts payloads omitting both fields (backwards-compat with already-cached payloads while the cache hash includes `analyser_version` — a bump invalidates them anyway).
- [x] Analyser prompt's "Interaction classification" section cites the heuristic and the corpus baseline note from Subtask 02.
- [x] `analyser_version` constant is updated in exactly one location; rg shows no stale references.
- [x] Targeted unit tests (vitest, scoped to the eval-analyse plus schema files) pass without running global suites.
- [x] No global test suite is triggered. No declarative-runner or LLM stamping is touched in this subtask.

## Implementation Notes

Schema-edit guidance:
- Use the existing `additionalProperties: false` block; add the two new properties with `description` strings. Do NOT add them to `required`.
- For `interactionStyle`, define the enum inline; do not invent a separate `$defs` block.

Analyser-prompt guidance:
- Add the new section AFTER "Forbidden internal-mechanic vocabulary" so it sits with the realism rubric — interaction classification is a realism property, not a hard rule.
- Worked examples MUST be drawn from this repo's primitives (e.g. `command:z-eval-configure` is `command-owned`; `agent:zoto-eval-generator` is `subagent-escalated`; `hook:zoto-eval-system` is `none`).
- DO mention the contract: the classification is the SINGLE input the stamper uses to choose a backend; misclassification ships the wrong test scaffold.
- The heuristic MUST exclude matches inside markdown code fences, inline code spans, and quoted/example blocks. Only imperative usage in instruction sections counts — documenting or citing `AskQuestion` in examples does not make a primitive interactive.

`scripts/eval-analyse.ts` guidance:
- The existing `runAnalyser` flow validates with the schema; once the schema accepts the new fields, the parsed payload propagates automatically. The work is in the type plumbing and the cache invalidation (the version bump handles cache invalidation).
- `_meta.primitive_analysis` is what gets written into stamped cases — make sure the new fields land there too so the stamper (subtask 06) can read them off existing cases without re-running the analyser.

Cache invalidation:
- `analyser_version` is part of the cache key (alongside `model_id` and `source_hash`). Bumping it is the canonical "force re-analyse" knob per `analyser-payload.schema.json` field docs.

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- `pnpm exec tsc --noEmit` scoped to the touched files (the schema + the analyser script).
- A new vitest test file (or extend an existing `tests/eval-analyse-*.test.ts` if any) covering the schema acceptance/rejection cases.
- `node --check scripts/eval-analyse.ts` smoke test if vitest scoping is awkward.

## Execution Notes

### Agent Session Info
- Agent: generalPurpose (composer-2.5-fast)
- Started: 2026-05-26
- Completed: 2026-05-26

### Work Log
- Added optional `requiresInteraction` + `interactionStyle` to analyser schema and TS types.
- Added **Interaction classification** section to analyser subagent prompt with corpus baseline reference and three worked examples.
- Exported `buildPrimitiveAnalysisMeta()` from `eval-analyse.ts` for stamper `_meta.primitive_analysis` projection.
- Bumped `ANALYSER_VERSION` `2026.05.03-1` → `2026.05.26-1`; recorded in `audit/analyser-version-bump.md`.
- Added `scripts/__tests__/analyser-payload-schema.test.ts` (3 vitest cases, all passed).

### Blockers Encountered
None.

### Files Modified
- `plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json`
- `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md`
- `plugins/zoto-eval-system/engine/analyser-payload.ts`
- `scripts/eval-analyse.ts`
- `specs/20260526-eval-askquestion-strategy-bridge/audit/analyser-version-bump.md` (new)
- `scripts/__tests__/analyser-payload-schema.test.ts` (new)
- Status files under `specs/20260526-eval-askquestion-strategy-bridge/status/`
