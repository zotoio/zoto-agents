# Subtask 01 — Eval Single Backend & Co-located Restructure — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 01 |
| feature | Eval Single Backend & Co-located Restructure |
| assigned_agent | zoto-eval-engineer |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | pending |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [ ] **D01** — `plugins/zoto-eval-system/templates/schema/config.schema.json` — remove `llm.strategy`, `llm.codeFramework`, and the cross-field documentation between them; retain `static.framework` enum, `update.preserveUserAuthoredCases: const true`, `update.writeMetaMarker: const true`
- [ ] **D02** — `plugins/zoto-eval-system/engine/analyser-payload.ts` — remove `LlmStrategy` and `CodeFramework` exports if they exist; keep `RequiresInteraction`, `InteractionStyle`, and all payload shape types
- [ ] **D03** — `plugins/zoto-eval-system/engine/manifest-snapshot.ts` — remove `LlmStrategy` / `CodeFramework` re-exports; drop reads of `discovery_config.llm.strategy` and `discovery_config.llm.codeFramework`; keep `discovery_config.static.framework`
- [ ] **D04** — `plugins/zoto-eval-system/src/config-loader.ts` — drop `llm.strategy` / `llm.codeFramework` parsing branches; keep `static.framework` resolution
- [ ] **D05** — `.zoto/eval-system/config.yml` — remove the entire `llm:` block (strategy + codeFramework keys); leave `static.framework: vitest` intact
- [ ] **D06** — `evals/fixtures/baseline/.zoto/eval-system/config.yml` — same edit; remove `llm:` block, keep `static.framework`
- [ ] **D07** — Any other fixture configs discovered under `evals/fixtures/**/.zoto/eval-system/config.yml` — same edit
- [ ] **D08** — Targeted vitest tests for the schema validator (or AJV harness) confirming a config without `llm.strategy` validates cleanly and a config WITH `llm.strategy` is rejected with the AJV `additionalProperties` error
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
