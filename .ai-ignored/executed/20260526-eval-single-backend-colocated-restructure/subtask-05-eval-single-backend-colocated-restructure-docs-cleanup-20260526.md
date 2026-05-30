# Subtask: Skill + agent docs cleanup (strategy language removal)

## Metadata
- **Subtask ID**: 05
- **Feature**: Eval Single Backend & Co-located Restructure
- **Assigned Subagent**: zoto-eval-architect
- **Suggested Model**: claude-4.6-sonnet-medium-thinking
- **Dependencies**: None
- **Created**: 20260526

## Objective

Remove every reference to `llm.strategy`, `llm.codeFramework`, "code vs declarative", and "code-strategy" from the user-facing documentation in the eval-system plugin's skills, agents, and commands. Replace those references with the new "single TS-everywhere co-located eval architecture" language. Subtasks 06–08 do the actual code/file restructure; this subtask gets the prose in sync so when subtask 10 ships the README + CHANGELOG, the agent/skill docs already match.

## Deliverables Checklist
- [x] `plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md` — remove strategy / codeFramework prompts (lines ~19–21, 108–122, 131 per exploration); replace with a single "static framework" prompt block; remove the cross-field validation that rejected `static.framework` ≠ `llm.codeFramework`
- [x] `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` — remove the "single input downstream stampers use to choose declarative JSON vs code-strategy TypeScript" sentence (line ~73 per exploration); replace with "single input the unified harness uses to choose scripted-answer vs single-prompt runtime branch"
- [x] `plugins/zoto-eval-system/agents/zoto-eval-generator.md` — remove `llm.strategy` / `llm.codeFramework` bullets (lines ~14–16 per exploration); update the "what fields you respect from config" section to drop the LLM strategy block
- [x] `plugins/zoto-eval-system/agents/zoto-eval-updater.md` — remove the `regenerateLlmCode` / `regenerateLlmDeclarative` dispatch description (lines ~31–37 per exploration); replace with a single `regenerateLlm` mention
- [x] `plugins/zoto-eval-system/agents/zoto-eval-executor.md` — remove the strategy-aware orchestrator note (line ~11 per exploration); replace with the single `eval:llm` script reference
- [x] `plugins/zoto-eval-system/agents/zoto-eval-configurer.md` — remove strategy / codeFramework prompts (lines ~37–44 per exploration); align with the SKILL.md rewrite
- [x] `plugins/zoto-eval-system/commands/z-eval-configure.md` — remove any "ask the user about LLM strategy" guidance; align with the configurer agent's new prompt set
- [x] `plugins/zoto-eval-system/commands/z-eval-execute.md` — remove the per-strategy invocation table; replace with a single "runs the unified LLM suite" description
- [x] Search across the eval-system plugin's `agents/`, `skills/`, `commands/`, `docs/` for any other mention of "code strategy", "declarative strategy", "llm.strategy", "codeFramework" and rewrite the prose (also caught: `commands/z-eval-update.md`, `skills/zoto-create-evals/SKILL.md`, `skills/zoto-update-evals/SKILL.md`, `skills/zoto-help-evals/SKILL.md`, `skills/zoto-eval-tooling/SKILL.md`)

## Definition of Done
- [x] `rg -n 'llm\\.strategy|llm\\.codeFramework|code.?strategy|declarative.?strategy|codeFramework' plugins/zoto-eval-system/{agents,skills,commands,docs}` returns zero hits in markdown (verified via `rg --type md`); the remaining hits live inside skill `evals/evals.json` fixtures (KD-1 byte-preserved by this subtask), inside `README.md` / `CHANGELOG.md` (subtask 10), and inside `templates/llm/code-cursor-sdk/README.md` (subtask 06–08 territory)
- [x] The new language consistently uses "unified LLM eval harness" and "co-located `<kind>/evals/<name>.test.ts`" — verified via `rg -c` in `skills/zoto-configure-evals/SKILL.md`, `agents/zoto-eval-analyser-subagent.md`, `agents/zoto-eval-generator.md`, and `agents/zoto-eval-updater.md` (each ≥1 hit for both strings)
- [x] The 14 skill `evals.json` files are untouched by this subtask (no edits issued; pre-existing modification on `skills/zoto-eval-tooling/evals/evals.json` predates this session at mtime 1779794381 vs session start 1779794806)
- [x] No linter errors in modified Markdown (`ReadLints` clean across all 13 edited files; fenced-block parity verified at 0 for every file)

## Implementation Notes

This subtask is **prose-only**. No TS / JSON / schema file is touched. You are the architecture voice: rewrite to reflect the new design with concrete examples (the new co-located path pattern, the unified harness file name `evals/llm/_shared/run-llm-suite.ts`, the renamed export `defineLlmEval`).

**Coordination:**
- Subtask 06 owns the actual harness rename (`defineLlmCodeEval` → `defineLlmEval`, `run-code-strategy-suite.ts` → `run-llm-suite.ts`). Your prose may reference the new names ahead of subtask 06's commit; that's fine — agents read these docs at runtime, so being correct after the entire spec lands is what matters
- Subtask 10 owns the README and CHANGELOG. Leave the README alone in this subtask; only touch the SKILL.md / agent.md / command.md files inside the plugin

**Files (per exploration):**
- `plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md`
- `plugins/zoto-eval-system/agents/zoto-eval-{analyser-subagent,generator,updater,executor,configurer,adviser,architect,comparer,engineer,judge}.md` (audit all, edit those that mention strategy)
- `plugins/zoto-eval-system/commands/z-eval-{configure,execute,create,update,advise,compare,help,judge,workflow,init,jump,operator,start}.md` (audit all, edit those that mention strategy)
- `plugins/zoto-eval-system/docs/**/*.md` (audit all)

**Do NOT touch:**
- The README (`plugins/zoto-eval-system/README.md`) — subtask 10 owns it
- The CHANGELOG (`CHANGELOG.md` at repo root or plugin root) — subtask 10 owns it
- Any TS / JSON / schema file — subtask 01–04, 06–08 territory
- Any skill `evals.json` (KD-1 — byte-preserve)
- Any agent/skill/command MD file OUTSIDE `plugins/zoto-eval-system/` (other plugins are untouched by this spec)

## Testing Strategy

**IMPORTANT**: Do NOT trigger global test suites.

- Markdown linting only (if a linter is configured): `pnpm exec markdownlint plugins/zoto-eval-system/**/*.md`
- Grep validation: confirm `rg -c 'llm\\.strategy|codeFramework|code.?strategy|declarative.?strategy' plugins/zoto-eval-system/{agents,skills,commands,docs}` is `0`
- Verify the agent description headers still match the spec format expected by the plugin validator (`pnpm run validate:plugins` if it exists, or manual inspection)

## Execution Notes

### Agent Session Info
- Agent: zoto-eval-architect
- Started: 2026-05-26 11:26:46 UTC
- Completed: 2026-05-26 11:38:21 UTC

### Work Log
- 2026-05-26 11:26:46 UTC — Subagent claimed subtask, created TodoWrite list from deliverables + DoD, began file-by-file audit.
- 2026-05-26 11:28–11:32 UTC — Inventoried every `llm.strategy` / `codeFramework` / `code-strategy` / `declarative-strategy` / `regenerateLlmCode` / `regenerateLlmDeclarative` / `defineLlmCodeEval` / `run-code-strategy-suite` / `CodeStrategyCaseDefinition` / `stampLlmCodeStrategy` / `buildDeclarativeStampedCase` hit across `plugins/zoto-eval-system/{agents,skills,commands}` Markdown. No `docs/` directory exists.
- 2026-05-26 11:32–11:37 UTC — Rewrote prose in 13 Markdown files to align with the unified LLM eval harness (`evals/llm/_shared/run-llm-suite.ts`, `defineLlmEval`) and co-located `<kind>/evals/<name>.test.ts` architecture. Replaced strategy-aware dispatch language with the single `regenerateLlm` helper and runtime `requiresInteraction` branching.
- 2026-05-26 11:37 UTC — DoD validation pass: `rg --type md` returns zero matches across `agents/`, `skills/`, `commands/`; `unified LLM eval harness` + co-located path appear in all four required files; fenced-block parity = 0 everywhere; `ReadLints` clean.
- 2026-05-26 11:38:21 UTC — Closed out: Deliverables + DoD ticked, Execution Notes filled in, no blockers.

### Blockers Encountered
None.

### Files Modified
- `plugins/zoto-eval-system/skills/zoto-configure-evals/SKILL.md`
- `plugins/zoto-eval-system/skills/zoto-create-evals/SKILL.md`
- `plugins/zoto-eval-system/skills/zoto-update-evals/SKILL.md`
- `plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md`
- `plugins/zoto-eval-system/skills/zoto-eval-tooling/SKILL.md`
- `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md`
- `plugins/zoto-eval-system/agents/zoto-eval-generator.md`
- `plugins/zoto-eval-system/agents/zoto-eval-updater.md`
- `plugins/zoto-eval-system/agents/zoto-eval-executor.md`
- `plugins/zoto-eval-system/agents/zoto-eval-configurer.md`
- `plugins/zoto-eval-system/commands/z-eval-configure.md`
- `plugins/zoto-eval-system/commands/z-eval-execute.md`
- `plugins/zoto-eval-system/commands/z-eval-update.md`

Out-of-scope and intentionally left untouched (per spec):
- `plugins/zoto-eval-system/README.md` — subtask 10.
- `plugins/zoto-eval-system/CHANGELOG.md` — subtask 10.
- `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/README.md` — template artefact, subtask 06–08 territory.
- All `**/evals/evals.json` files — KD-1 byte-preserve. The `skills/zoto-eval-tooling/evals/evals.json` diff observed in `git status` predates this session (mtime 1779794381 vs session start 1779794806).
