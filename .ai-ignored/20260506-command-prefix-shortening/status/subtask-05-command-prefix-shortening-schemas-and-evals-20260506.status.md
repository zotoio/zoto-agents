# Subtask 05 — command-prefix-shortening — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 05 |
| feature | command-prefix-shortening |
| assigned_agent | crux-software-engineer |
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
- [ ] **D01** — Audit `plugins/zoto-spec-system/templates/schema/*.json` and `plugins/zoto-eval-system/templates/schema/*.json` for any `description`, `examples`, or hard-coded constant that mentions a slash command. Update each match to the canonical short form.
- [ ] **D02** — Update `plugins/zoto-eval-system/templates/schema/cleanup-plan.schema.json` if it currently references `/zoto-eval-configure` (or any other command) inside a `description` / `examples`
- [ ] **D03** — Update `plugins/zoto-spec-system/skills/*/evals/evals.json` cases that hard-code slash-command prompts or expected_output strings (e.g. `zoto-create-spec`, `zoto-execute-spec`, `zoto-judge-spec` skill evals)
- [ ] **D04** — Update `plugins/zoto-eval-system/skills/*/evals/evals.json` cases that hard-code slash-command prompts — explicit list:
- [ ] **D05** — Add at least **one** alias-coverage eval case per plugin (and per `askQuestion`-owning command):
- [ ] **D06** — Audit `plugins/zoto-eval-system/scripts/eval-update.ts`, `plugins/zoto-eval-system/scripts/eval-discover.ts`, `scripts/eval-stamp.ts`, `scripts/eval-cleanup-stale.ts`, `scripts/eval-orchestrate.ts`, `scripts/eval-analyse.ts`, `scripts/eval-discover.ts` (root) — wherever a slash command appears inside an **error message or help string literal**, switch it to the canonical short form
- [ ] **D07** — Audit `evals/_llm/*.ts` files (e.g. `runner.ts`, `update.ts`, `manifest-snapshot.ts`, `case.ts`, `sandbox.ts`, `sdk-bridge.ts`, `analyser.cache.selftest.ts`, `runner-validate-enriched.test.ts`, `result.schema.json`, `README.md`) for slash-command literals; update strings, leave class/function/field identifiers alone
- [ ] **D08** — Audit `evals/test_meta_invariants.py` and `scripts/test.py` for any hard-coded slash command names
- [ ] **D09** — Audit template files under `plugins/zoto-eval-system/templates/llm/agent-sdk/*.tmpl`, `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/*.tmpl`, `plugins/zoto-eval-system/templates/static/{pytest,jest,vitest}/**/*.tmpl`, `plugins/zoto-eval-system/templates/runner/*.tmpl`, `plugins/zoto-eval-system/templates/user-checklists/USER_EVAL_CHECKLISTS.md.tmpl` — update slash-command literals (these propagate into host-repo evals on next stamp)
- [ ] **D10** — Audit `plugins/zoto-spec-system/templates/init-config.yml`, `plugins/zoto-eval-system/templates/init-config.yml`, and `plugins/zoto-eval-system/templates/baseline-fixtures/.zoto/eval-system/config.yml` (note: prose-level updates here are owned by subtask 04; this subtask only updates them if they contain *structured* data fields with command names like `examples:` or `defaults:`)
- [ ] **D11** — Confirm `scripts/validate-template.mjs` and `scripts/validate-skills.mjs` do NOT regress — the validators do not hard-code a `zoto-spec-` / `zoto-eval-` prefix policy, so adding `z-spec-*` / `z-eval-*` files alongside should pass; if any check assumes a prefix, update the validator to accept both
- [ ] **D12** — Run `node scripts/validate-template.mjs` and `node scripts/validate-skills.mjs` after edits — both must exit 0
- [ ] **D13** — Run `pnpm --filter @zoto-agents/zoto-eval-system test` and `pnpm --filter @zoto-agents/zoto-spec-system test` — both must pass
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
