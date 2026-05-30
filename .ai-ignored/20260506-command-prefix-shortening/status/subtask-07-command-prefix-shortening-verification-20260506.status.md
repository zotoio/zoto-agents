# Subtask 07 — command-prefix-shortening — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 07 |
| feature | command-prefix-shortening |
| assigned_agent | integrity-expert |
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
- [ ] **D01** — Run `node scripts/validate-template.mjs` — must exit 0
- [ ] **D02** — Run `node scripts/validate-skills.mjs` — must exit 0
- [ ] **D03** — Run `pnpm test` at the repo root — must exit 0
- [ ] **D04** — Run plugin-local tests: `pnpm --filter @zoto-agents/zoto-spec-system test` and `pnpm --filter @zoto-agents/zoto-eval-system test` — both must exit 0
- [ ] **D05** — Confirm `plugins/zoto-spec-system/commands/` contains exactly 8 files: 4 canonical (`z-spec-{create,execute,judge,init}.md`) plus 4 alias (`zoto-spec-{create,execute,judge,init}.md`)
- [ ] **D06** — Confirm `plugins/zoto-eval-system/commands/` contains exactly **18 files**: 9 canonical (`z-eval-{init,configure,create,update,execute,judge,compare,help,advise}.md`) plus 9 alias (`zoto-eval-{init,configure,create,update,execute,judge,compare,help,advise}.md`)
- [ ] **D07** — Confirm every alias file's body matches the agreed delegation pattern (no instruction duplication, < 30 lines, mentions canonical name in description). For the `askQuestion`-owning aliases (`/zoto-eval-help`, `/zoto-eval-advise`), confirm the body uses the **"read and follow the canonical file's instructions verbatim"** idiom from subtask 02 rather than spawning a subagent directly
- [ ] **D08** — Confirm the alias-coverage eval cases added in subtask 05 actually run and pass — at minimum execute the eval suite for `zoto-help-evals`, `zoto-advise-evals`, and one Spec System skill (`zoto-create-spec` recommended)
- [ ] **D09** — **Out-of-Scope diff guard**: produce a `git diff --name-only` listing and assert that NO file under the following paths was modified:
- [ ] **D10** — Confirm no source rule was edited after subtask 06's CRUX regeneration (no race)
- [ ] **D11** — Spot-check at least 3 doc surfaces (one README, one rule, one site HTML page) to confirm canonical names are now primary
- [ ] **D12** — Write a short `verification.md` in the spec directory summarising results, with one section per check above
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
