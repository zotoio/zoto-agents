---
persona: zoto-test-engineer
---

# Subtask: Evals — per-persona smoke tests + dispatch integration test

## Metadata
- **Subtask ID**: 08
- **Feature**: zoto-spec-system-sdlc-personas
- **Assigned Subagent**: generalPurpose
- **Dependencies**: 02, 03, 04
- **Created**: 20260527

## Objective

Ship the eval coverage required by the spec acceptance criteria and the
plugin conventions:

- **One smoke eval per persona** under `plugins/zoto-spec-system/agents/evals/<persona>.test.ts`
  asserting the agent file loads, has valid frontmatter, and references
  its phase skill(s).
- **One dispatch integration test** under
  `plugins/zoto-spec-system/tests/integration/persona-dispatch.test.ts`
  that loads a fixture subtask with `persona: zoto-backend-engineer` and
  verifies the executor's spawn-prefix call resolves
  `persona-zoto-backend-engineer` against
  `subagents.persona-zoto-backend-engineer.tokenBudget` from a fixture
  config.
- Phase-skill `evals/evals.json` files (≥ 2 cases each) were already
  shipped in subtask 02; this subtask only verifies they pass and adds
  any missing assertions.

## Deliverables Checklist

- [ ] **D01** — `plugins/zoto-spec-system/agents/evals/zoto-product-analyst.test.ts`
      smoke test (file loads, frontmatter valid, references
      `zoto-skill-sdlc-discovery`).
- [ ] **D02** — `plugins/zoto-spec-system/agents/evals/zoto-software-architect.test.ts`
      smoke test (references `zoto-skill-sdlc-design`).
- [ ] **D03** — `plugins/zoto-spec-system/agents/evals/zoto-backend-engineer.test.ts`
      smoke test (references `zoto-skill-sdlc-implementation`).
- [ ] **D04** — `plugins/zoto-spec-system/agents/evals/zoto-frontend-engineer.test.ts`
      smoke test (references `zoto-skill-sdlc-implementation`).
- [ ] **D05** — `plugins/zoto-spec-system/agents/evals/zoto-test-engineer.test.ts`
      smoke test (references `zoto-skill-sdlc-quality`).
- [ ] **D06** — `plugins/zoto-spec-system/agents/evals/zoto-devops-engineer.test.ts`
      smoke test (references `zoto-skill-sdlc-operations`).
- [ ] **D07** — `plugins/zoto-spec-system/agents/evals/zoto-technical-writer.test.ts`
      smoke test (references `zoto-skill-sdlc-operations`).
- [ ] **D08** — `plugins/zoto-spec-system/agents/evals/zoto-security-engineer.test.ts`
      smoke test (references **both** `zoto-skill-sdlc-design` and
      `zoto-skill-sdlc-quality`).
- [ ] **D09** — `plugins/zoto-spec-system/agents/evals/zoto-sre.test.ts`
      smoke test (references `zoto-skill-sdlc-operations`).
- [ ] **D10** — `plugins/zoto-spec-system/agents/evals/zoto-code-reviewer.test.ts`
      smoke test (references `zoto-skill-sdlc-quality`; asserts
      "review-only / no code authoring" guardrail prose is present).
- [ ] **D11** — `plugins/zoto-spec-system/tests/integration/persona-dispatch.test.ts`
      integration test:
      1. Writes a temp `.zoto/spec-system/config.yml` with
         `subagents.default.tokenBudget = 100000` and
         `subagents.persona-zoto-backend-engineer.tokenBudget = 175000`.
      2. Writes a temp subtask fixture file with
         ```
         ---
         persona: zoto-backend-engineer
         ---
         # Subtask: …
         ```
      3. Invokes the persona-extraction parser introduced in subtask 01
         and asserts the persona is `zoto-backend-engineer`.
      4. Invokes `spec-spawn-prefix --role persona-zoto-backend-engineer`
         (or the equivalent in-process API) and asserts the emitted
         prefix contains `Token budget: 175000.`.
      5. Repeats with a missing-persona fixture and asserts the
         executor-side validator throws / exits non-zero with an error
         message naming the offending file.
- [ ] **D12** — Verify each phase skill's `evals/evals.json` (shipped in
      subtask 02) actually runs in whatever skill-eval harness the plugin
      uses. If a runner exists (`pnpm --filter @zoto-agents/zoto-spec-system run eval`
      or similar), exercise it and capture results in the work log. If a
      runner does not exist, document that the skills satisfy the static
      `>=2 cases` requirement only.
- [ ] **D13** — Optionally extend the existing
      `plugins/zoto-spec-system/agents/evals/zoto-spec-executor.test.ts`
      with a case that asserts persona dispatch is documented in the
      executor agent file (frontmatter / "Available subagents" table /
      `--role persona-*` enum). Per the user's requirements, either
      extending this file *or* a new
      `zoto-spec-executor-persona-dispatch.test.ts` file is acceptable —
      pick whichever matches the existing test harness style.

## Definition of Done
- [ ] 10 persona smoke tests exist and pass.
- [ ] 1 dispatch integration test exists and passes.
- [ ] All 5 phase-skill `evals/evals.json` files contain ≥ 2 cases.
- [ ] Existing executor eval is updated (or a sibling eval added) to cover
      persona dispatch documentation.
- [ ] No linter errors in modified files.

## Implementation Notes

- Look at `plugins/zoto-spec-system/agents/evals/zoto-spec-executor.test.ts`
  for the existing test harness style. The smoke tests should follow the
  same shape (vitest, fixture-style, no LLM calls for static checks).
- For the smoke tests, prefer reading the agent markdown file directly
  and asserting against its content — this is fast, deterministic, and
  doesn't require an LLM. LLM-driven assertions are not required for
  these smoke tests.
- The dispatch integration test belongs alongside
  `plugins/zoto-spec-system/tests/integration/no-restart-token-budget.test.ts`
  and should reuse the same temp-config-via-`utimesSync` pattern where
  applicable.
- Reuse the canonical Tier 1 persona list and the persona/skill mapping
  from the spec index when authoring the smoke tests — avoid hardcoding
  the same list in 11 places. Consider importing from
  `plugins/zoto-spec-system/src/personas.ts` (introduced in subtask 01).
- For each smoke test, assert at minimum:
  1. File exists at the expected path.
  2. YAML frontmatter has `name: zoto-<persona>` and a non-empty
     `description`.
  3. File body contains the phase skill name(s).
  4. File body length ≤ 200 lines (matching the hard cap from subtask 03).
- For the security-engineer smoke test, assert presence of *both* phase
  skill references.
- For the code-reviewer smoke test, assert presence of the "review-only"
  / "stops with a fix-list" prose pattern (mirrors the
  `zoto-spec-judge` non-interference contract).

## Testing Strategy

**Do NOT trigger global test suites during parallel execution.** Instead:

- Run `pnpm --filter @zoto-agents/zoto-spec-system test` to exercise the
  new smoke + integration tests in isolation.
- Run `pnpm --filter @zoto-agents/zoto-spec-system run eval` (or the
  plugin's documented eval runner) for the skill `evals.json` files if a
  runner exists.
- Defer the repo-wide `pnpm test` and the validation scripts to subtask
  09.

## Execution Notes
_(to be filled by the executing agent)_

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
