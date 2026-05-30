# Subtask: Plugin-creation analyser integration

## Metadata
- **Subtask ID**: 10
- **Feature**: Eval AskQuestion Strategy Bridge
- **Assigned Subagent**: generalPurpose
- **Suggested Model**: claude-opus-4-7-thinking-xhigh
- **Dependencies**: 04, 06
- **Created**: 20260526

## Objective

Wire the new analyser-driven backend choice into `.cursor/skills/zoto-create-plugin/SKILL.md` so newly scaffolded plugins land in the right backend on their first stamp instead of being migrated post-hoc. Add a smoke test that creates a synthetic plugin with one interactive command and one non-interactive skill, then verifies the resulting `evals/` tree contains the right backend per target.

## Deliverables Checklist
- [ ] `.cursor/skills/zoto-create-plugin/SKILL.md` Step 6 ("Generate Components") gains a sub-step "6e — Classify and stamp evals" that calls `pnpm run eval:analyse --target <path>` for each generated component, reads back `requiresInteraction`, and stamps the appropriate backend into the new plugin's `evals/` tree using the same paths as Subtask 06's stamper.
- [ ] Fallback behaviour documented: when `CURSOR_API_KEY` is missing or `pnpm run eval:analyse` fails, the skill stamps a declarative-JSON eval with `_meta.classification_source: "fallback-default"` and clearly tells the operator a later `pnpm run eval:update --with-analyser` will re-classify.
- [ ] Smoke test under `evals/llm/_shared/zoto-create-plugin-strategy.test.ts` (or wherever scope-isolated tests live; do NOT add it under `evals/llm/test_*.test.ts` — that path is reserved for stamped tests). The test scaffolds a temporary plugin tree (interactive command + non-interactive skill) and asserts the eval tree contains a code-strategy `evals/llm/test_command_*.test.ts` for the command and a declarative `plugins/<temp>/skills/<name>/evals/evals.json` for the skill.
- [ ] Cross-link the new sub-step in `plugins/zoto-eval-system/README.md` "Plugin scaffolding" section (a one-line forward reference; the full doc update lives in Subtask 12).
- [ ] If `.cursor/agents/zoto-plugin-manager.md` (the agent that drives `/zoto-create-plugin`) is the one that consumes the skill, refresh its instructions to mention the new sub-step.

## Definition of Done
- [ ] Smoke test passes locally (vitest scoped to the new test file) without `CURSOR_API_KEY` (it stubs the analyser invocation).
- [ ] Manual run: `/zoto-create-plugin` against a fictitious plugin in a scratch tree (or a dry-run flag if the skill supports one) yields the expected backend split, with the migration matrix entry from Subtask 09 referenced as the canonical pattern.
- [ ] No regression to existing plugin-creation flow when no eval components are requested.
- [ ] No global test suite triggered.

## Implementation Notes

`/zoto-create-plugin` workflow today (from `.cursor/skills/zoto-create-plugin/SKILL.md`):
- Step 6 ("Generate Components") writes agents/skills/commands/rules/hooks one at a time.
- Step 9 ("Validate") runs `pnpm validate`. The new sub-step lands inside Step 6, before validation, so validation sees the right backend artefacts.

Where to add the analyser invocation:
- Each component file is written first, then its analyser classification is requested. The skill calls `pnpm run eval:analyse --target <component-source-path>` and reads stdout (the script writes the JSON payload to stdout when `--out` is omitted, per the script's `Usage:` block).
- Parse `requiresInteraction`. Default to `false` when missing.
- Dispatch to the same stamper used in Subtask 06 by importing it as a Node module (call the same exported function rather than shelling out to `eval:update`). If the stamper isn't yet exposed as a clean Node API, raise it as a Subtask-09 blocker — but the analyser-payload-driven dispatch is the same code path either way.

Smoke-test fixtures:
- Build a synthetic plugin under `os.tmpdir()` with one command (containing literal `AskQuestion`) and one skill (no interactive markers).
- Stub `pnpm run eval:analyse` by intercepting the child-process call (vitest's `vi.mock` or a dedicated stub); return a canned analyser payload per target.
- Run the skill's eval-classify-and-stamp sub-step.
- Assert the resulting tree.

Avoid:
- Running the full `/zoto-create-plugin` flow inside the test — too slow and side-effect-heavy. Only the eval-classify-and-stamp sub-step is exercised.
- Touching `.cursor/skills/zoto-create-plugin/evals/evals.json` (user-authored — Subtask 09 already records its byte-preserve property).

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Run only:
- `pnpm exec vitest run` scoped to the new smoke test.
- `pnpm exec tsc --noEmit` scoped to any touched TypeScript.

Do not invoke `/zoto-create-plugin` against the live tree as part of the test suite.

## Execution Notes

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
