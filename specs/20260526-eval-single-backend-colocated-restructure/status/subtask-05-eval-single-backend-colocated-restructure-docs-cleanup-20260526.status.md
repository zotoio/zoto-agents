# Subtask 05 — Eval Single Backend & Co-located Restructure — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 05 |
| feature | Eval Single Backend & Co-located Restructure |
| assigned_agent | zoto-eval-architect |
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
- [ ] **D01** — `plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md` — remove strategy / codeFramework prompts (lines ~19–21, 108–122, 131 per exploration); replace with a single "static framework" prompt block; remove the cross-field validation that rejected `static.framework` ≠ `llm.codeFramework`
- [ ] **D02** — `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` — remove the "single input downstream stampers use to choose declarative JSON vs code-strategy TypeScript" sentence (line ~73 per exploration); replace with "single input the unified harness uses to choose scripted-answer vs single-prompt runtime branch"
- [ ] **D03** — `plugins/zoto-eval-system/agents/zoto-eval-generator.md` — remove `llm.strategy` / `llm.codeFramework` bullets (lines ~14–16 per exploration); update the "what fields you respect from config" section to drop the LLM strategy block
- [ ] **D04** — `plugins/zoto-eval-system/agents/zoto-eval-updater.md` — remove the `regenerateLlmCode` / `regenerateLlmDeclarative` dispatch description (lines ~31–37 per exploration); replace with a single `regenerateLlm` mention
- [ ] **D05** — `plugins/zoto-eval-system/agents/zoto-eval-executor.md` — remove the strategy-aware orchestrator note (line ~11 per exploration); replace with the single `eval:llm` script reference
- [ ] **D06** — `plugins/zoto-eval-system/agents/zoto-eval-configurer.md` — remove strategy / codeFramework prompts (lines ~37–44 per exploration); align with the SKILL.md rewrite
- [ ] **D07** — `plugins/zoto-eval-system/commands/z-eval-configure.md` — remove any "ask the user about LLM strategy" guidance; align with the configurer agent's new prompt set
- [ ] **D08** — `plugins/zoto-eval-system/commands/z-eval-execute.md` — remove the per-strategy invocation table; replace with a single "runs the unified LLM suite" description
- [ ] **D09** — Search across the eval-system plugin's `agents/`, `skills/`, `commands/`, `docs/` for any other mention of "code strategy", "declarative strategy", "llm.strategy", "codeFramework" and rewrite the prose
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
_None._
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->

<!-- status:notes:end -->
