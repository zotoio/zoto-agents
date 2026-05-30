# Subtask 10 — Eval AskQuestion Strategy Bridge — live status

<!-- status:metadata:start -->
| Key | Value |
|-----|-------|
| schema_version | 1 |
| subtask_id | 10 |
| feature | Eval AskQuestion Strategy Bridge |
| assigned_agent | generalPurpose |
| model | composer-2.5-fast |
| token_budget | 200000 |
| state | completed |
| started_at |  |
| last_heartbeat |  |
| completed_at |  |
| git_sha |  |
| agent_session_id |  |
<!-- status:metadata:end -->

<!-- status:checklist:start -->
- [x] **D01** — `.cursor/skills/zoto-create-plugin/SKILL.md` Step 6 ("Generate Components") gains a sub-step "6e — Classify and stamp evals" that calls `pnpm run eval:analyse --target <path>` for each generated component, reads back `requiresInteraction`, and stamps the appropriate backend into the new plugin's `evals/` tree using the same paths as Subtask 06's stamper. (`.cursor/skills/zoto-create-plugin/SKILL.md`)
- [x] **D02** — Fallback behaviour documented: when `CURSOR_API_KEY` is missing or `pnpm run eval:analyse` fails, the skill stamps a declarative-JSON eval with `_meta.classification_source: "fallback-default"` and clearly tells the operator a later `pnpm run eval:update --with-analyser` will re-classify. (`.cursor/skills/zoto-create-plugin/SKILL.md`)
- [x] **D03** — Smoke test under `evals/llm/_shared/zoto-create-plugin-strategy.test.ts` (or wherever scope-isolated tests live; do NOT add it under `evals/llm/test_*.test.ts` — that path is reserved for stamped tests). The test scaffolds a temporary plugin tree (interactive command + non-interactive skill) and asserts the eval tree contains a code-strategy `evals/llm/test_command_*.test.ts` for the command and a declarative `plugins/<temp>/skills/<name>/evals/evals.json` for the skill. (`evals/llm/_shared/zoto-create-plugin-strategy.test.ts`)
- [x] **D04** — Cross-link the new sub-step in `plugins/zoto-eval-system/README.md` "Plugin scaffolding" section (a one-line forward reference; the full doc update lives in Subtask 12). (`plugins/zoto-eval-system/README.md`)
- [x] **D05** — If `.cursor/agents/zoto-plugin-manager.md` (the agent that drives `/zoto-create-plugin`) is the one that consumes the skill, refresh its instructions to mention the new sub-step. (`.cursor/agents/zoto-plugin-manager.md`)
<!-- status:checklist:end -->

<!-- status:artifacts:start -->
- **modified** `.cursor/skills/zoto-create-plugin/SKILL.md` — Step 6e classify and stamp evals
- **created** `evals/llm/_shared/zoto-create-plugin-strategy.ts` — Plugin creation strategy helper
- **created** `evals/llm/_shared/zoto-create-plugin-strategy.test.ts` — Smoke test for backend split
- **modified** `plugins/zoto-eval-system/README.md` — Plugin scaffolding forward reference
- **modified** `.cursor/agents/zoto-plugin-manager.md` — Mentions Step 6e sub-step
<!-- status:artifacts:end -->

<!-- status:errors:start -->
_None._
<!-- status:errors:end -->

<!-- status:notes:start -->
Scoped vitest 2/2 passed without CURSOR_API_KEY (stubbed analyser). Helper normalises absolute paths to repo-relative before resolveAnalyserTarget.
<!-- status:notes:end -->
