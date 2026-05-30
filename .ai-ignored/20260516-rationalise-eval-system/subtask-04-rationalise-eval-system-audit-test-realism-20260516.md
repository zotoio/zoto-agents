# Subtask: Audit Test Realism + Standalone Readability

## Metadata
- **Subtask ID**: 04
- **Feature**: Rationalise Eval System
- **Assigned Subagent**: crux-platform-architect
- **Dependencies**: 02, 03
- **Created**: 20260516

## Objective

Read 5–7 representative test files (one per primitive kind plus two stretch picks) and produce a **written** audit of:

- **Prompt realism** — do the prompts mirror real user invocations (multi-step, branching tool usage, slash-commands with args), or are they synthetic single-shot strings?
- **Grader meaningfulness** — do graders test behaviour (LLM-judge rubrics, regex on tool-call sequences, `tool-called` invariants) or just string presence?
- **Standalone readability** — can a reader understand what the test is testing without chasing imports through 3+ files? The shared-runner pattern (`./_shared/run-code-strategy-suite.js`) is encouraged; what matters is that the `CASES` array remains obvious.

This is **read-only**. No bulk rewrites. The output is a list of follow-up items the team can address later via the existing `/z-eval-update` workflow.

## Deliverables Checklist

- [x] Pick 5–7 files spanning kinds (at least one each: command, agent, skill, hook). Suggested baseline picks (override if the audit from subtask 01 surfaces stronger candidates):
  - `evals/llm/test_command_z-eval-execute.test.ts`
  - `evals/llm/test_command_z-spec-create.test.ts`
  - `evals/llm/test_agent_zoto-eval-judge.test.ts`
  - `evals/llm/test_skill_zoto-create-spec.test.ts`
  - `evals/llm/test_hook_zoto-eval-system.test.ts`
  - One stretch pick from agents: `evals/llm/test_agent_zoto-spec-generator.test.ts`
  - One stretch pick from commands: `evals/llm/test_command_z-eval-update.test.ts`
- [x] For each file, record in the audit doc:
  - File path + total line count
  - Number of cases in `CASES`
  - For each case: `id`, prompt one-liner, `assertions[]` count, `assertion_patterns[]` count, `graders[]` count + types
  - Subjective realism rating (Realistic / Mixed / Synthetic) with one-sentence justification
  - Subjective grader rating (Strong / Mixed / Weak) with one-sentence justification
  - Standalone readability rating (Obvious / Needs lookup / Opaque)
- [x] Compile a per-rating summary table at the top of the audit doc.
- [x] List **specific follow-up items** in priority order. Each item names: the file, the case `id`, the issue, and a suggested fix that fits the existing `/z-eval-update` workflow.
- [x] Write `audit-test-realism-rationalise-eval-system-20260516.md` in the spec directory.

### Audit document structure

```markdown
# Test Realism Audit — Rationalise Eval System (20260516)

## Summary
| Rating | Realism | Graders | Readability |
|--------|---------|---------|-------------|
| Strong | <n>     | <n>     | <n>         |
| Mixed  | <n>     | <n>     | <n>         |
| Weak   | <n>     | <n>     | <n>         |

## Files Reviewed

### `evals/llm/test_command_z-eval-execute.test.ts` (<lines>, <cases> cases)
- **Realism:** Realistic — prompts use real slash-commands and arguments.
- **Graders:** Mixed — case 2 relies on a `contains` check that could pass on stub output.
- **Readability:** Obvious — single `defineLlmCodeEval` invocation; CASES array is concrete.
- Notes: ...

### ... (other files)

## Follow-up items (priority order)

1. **[file:case-id]** — <issue>. <suggested fix>.
2. ...

## Out-of-scope observations
(Anything noticed that this spec does not cover; for awareness only.)
```

## Definition of Done
- [x] At least 5 files audited (one per kind plus stretch picks).
- [x] Each case in each audited file has its own row with all rating + count fields filled.
- [x] Summary table totals match the per-file detail.
- [x] Follow-up items are concrete (named file + case id + fix), not generic statements.
- [x] Audit document saved in the spec directory.
- [x] No code or test files modified.

## Implementation Notes

- "Realistic" means the prompt mirrors how a real user would invoke the primitive: slash-commands with realistic arguments, multi-step `follow_ups` for command flows, references to actual repo paths. Single-line "/z-eval-execute" with no follow-ups is **Synthetic** unless the test specifically targets the no-arg refusal path.
- "Strong graders" means the case verifies behaviour: `tool-called` invariants, `regex` patterns on tool-call sequences or specific output structures, or `llm-judge` rubrics tied to assertion semantics. "Weak graders" rely solely on `contains` for short generic strings (e.g. `contains: "Eval"`).
- "Obvious readability" means a reader who knows the shared-runner pattern can answer "what does this test verify?" by reading only the test file. Tests whose only meaningful content is in a JSON file referenced via `import` would rate **Needs lookup**.
- The recent 7 commits (`6f1dbfa`, `2038182`, `e14278e`, `d08678c`, `40b92f3`, `4e8f768`, `527a1f7`) already tightened the most-flagged primitives (judge, spec). Mention any case that those commits already addressed but where residual weakness remains.
- Out of scope: rewriting any case, generating new cases, modifying templates.

## Testing Strategy

**Read-only subtask — no test runs.** Verification is structural:
- The audit doc exists in the spec directory.
- The summary table arithmetic adds up.
- Follow-up items reference real file paths and case ids.

Defer all eval execution to subtask 06.

## Execution Notes

### Agent Session Info
- Agent: crux-platform-architect
- Started: 2026-05-16T12:50:00Z
- Completed: 2026-05-16T12:57:00Z

### Work Log
- D01: 7 files selected (3 commands, 2 agents, 1 skill, 1 hook)
- D02: Per-file analysis completed for all 38 cases across 7 files
- D03: Summary table compiled — Realistic/Strong/Obvious: 3/2/7; Mixed: 4/3/0; Synthetic/Weak/Opaque: 0/2/0
- D04: 10 follow-up items identified across 3 priority tiers
- D05: Audit document written to spec directory
- Key finding: zero `graders[]` entries across all 38 cases; all grading relies on LLM-judge assertions + regex assertion_patterns

### Blockers Encountered
None.

### Files Modified
- `specs/20260516-rationalise-eval-system/audit-test-realism-rationalise-eval-system-20260516.md` (created)
- `specs/20260516-rationalise-eval-system/subtask-04-rationalise-eval-system-audit-test-realism-20260516.md` (deliverable ticks)
- `specs/20260516-rationalise-eval-system/status/subtask-04-rationalise-eval-system-audit-test-realism-20260516.status.yml` (status updates)
- `specs/20260516-rationalise-eval-system/status/subtask-04-rationalise-eval-system-audit-test-realism-20260516.status.md` (via roundtrip)
