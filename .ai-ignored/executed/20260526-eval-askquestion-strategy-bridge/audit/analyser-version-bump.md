# Analyser version bump — Eval AskQuestion Strategy Bridge

| Field | Value |
|-------|-------|
| Prior `analyser_version` | `2026.05.03-1` |
| New `analyser_version` | `2026.05.26-1` |
| Canonical constant | `scripts/eval-analyse.ts#ANALYSER_VERSION` |
| Trigger | Subtask 04 of `specs/20260526-eval-askquestion-strategy-bridge/` — optional `requiresInteraction` + `interactionStyle` fields added to `analyser-payload.schema.json` and analyser system prompt |

## Justification

The askQuestion strategy bridge adds interaction classification to every analyser payload. Cached entries under `.zoto/eval-system/cache/analyser/*.json` must re-analyse on the next `pnpm run eval:update --apply --with-analyser` so stampers receive the new routing fields. Bumping `analyser_version` invalidates the cache key (`sha256(normalised source + analyser_version + model_id)`) without a breaking change to `schema_version`.
