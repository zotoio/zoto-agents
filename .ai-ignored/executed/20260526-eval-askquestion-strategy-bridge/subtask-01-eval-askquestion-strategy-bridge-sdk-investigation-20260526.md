# Subtask: SDK AskQuestion investigation & ADR

## Metadata
- **Subtask ID**: 01
- **Feature**: Eval AskQuestion Strategy Bridge
- **Assigned Subagent**: explore
- **Suggested Model**: composer-2.5-fast
- **Dependencies**: None
- **Created**: 20260526

## Objective

Probe `@cursor/sdk` (pinned at 1.0.12 per `evals/llm/_shared/sdk-bridge.ts#PINNED_SDK_VERSION`) for its handling of interactive tool calls — specifically `AskQuestion` — and produce an Architecture Decision Record (ADR) that pins the exported surface of the new `evals/llm/_shared/askquestion-bridge.ts` module so every downstream subtask consumes a stable contract. This is read-only investigation; no production source files are modified.

## Deliverables Checklist
- [x] `specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-askquestion-adr.md` — short ADR with: (a) what `@cursor/sdk` 1.0.12 exposes (`Run`, `RunResult`, `agent.send`, `run.wait`, etc.); (b) whether the SDK surfaces tool-call interception, replay, or scripted answers; (c) the chosen helper architecture (concrete signatures); (d) a fallback path if the SDK has no native interception (script answers as ordinary follow-up prompts but tag them so the runner can mark `interaction_style: synthetic` in the report); (e) at least one concrete usage sketch.
- [x] `specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-surface-snapshot.md` — verbatim transcript of the relevant `node_modules/@cursor/sdk/dist/esm/*.d.ts` entries, plus a list of any release-note-relevant SDK fields (e.g. `RunResult` extensions like `usage.totalTokens`).
- [x] An exported-surface table for the new `evals/llm/_shared/askquestion-bridge.ts` module, copied verbatim into the ADR — function names, parameter shapes, return types, and the package barrel re-export plan.

## Definition of Done
- [x] ADR identifies whether the live SDK supports interception or whether the bridge falls back to scripted follow-ups; the choice is justified with a citation to a `.d.ts` line range.
- [x] Surface table covers at least: a "create agent with scripted answers" entry point, an "advance run with answer injection" helper, and a `CodeStrategyCaseDefinition`-compatible accessor that downstream cases use to declare their scripted answers.
- [x] Fallback strategy preserves the current `follow_ups[]` semantics so existing migrations stay round-trippable.
- [x] No code files outside `specs/20260526-eval-askquestion-strategy-bridge/` are modified.

## Implementation Notes

Read-only investigation only. Useful starting points:

- `evals/llm/_shared/sdk-bridge.ts` — the canonical SDK wrapper; `BRIDGE_SURFACE` lists every consumer-facing export.
- `node_modules/@cursor/sdk/dist/esm/run.d.ts`, `agent.d.ts`, `index.d.ts` — public types.
- `evals/llm/_shared/run-code-strategy-suite.ts` — current case-runner; `runCase()` (lines ≈213-325) shows where follow-ups currently get sent.
- `plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md` — analyser prompt; references `askQuestion` semantics.
- `AGENTS.md` "User Input Escalation — Subagent Protocol" — Pattern A (pre-collect) vs Pattern B (work-then-escalate). Subagents NEVER call `AskQuestion`; only top-level commands do.

Things to confirm in the ADR:

1. Does `Run` expose any `onToolCall` / `onMessage` / `appendInput` surface for injecting answers between turns?
2. Does `RunResult` carry tool-call metadata that lets us assert `AskQuestion` was emitted?
3. If neither: what is the cleanest "script the next N answers" shim layered on `agent.send(prompt)`?
4. How does the bridge surface integrate with `CodeStrategyCaseDefinition` (e.g. a new optional `interactions: { questions: string[]; answers: string[] }` or a callback-driven pattern)?
5. How will the declarative runner (`templates/llm/agent-sdk/runner.ts.tmpl`) refuse classifying-mismatch cases at validation time?

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites during parallel execution. This subtask is investigation-only — the only run permitted is `node -e "console.log(require.resolve('@cursor/sdk'))"` and direct `Read` calls into `node_modules/@cursor/sdk/dist/esm/*.d.ts`.

## Execution Notes

### Agent Session Info
- Agent: explore (fix round — generalPurpose subagent)
- Started: 20260526
- Completed: 20260526

### Work Log
- Probed `@cursor/sdk@1.0.12` public `.d.ts` surface (`run.d.ts`, `agent.d.ts`, `messages.d.ts`, `stubs.d.ts`).
- Confirmed SDK exposes **observe-only** tool streaming (`Run.stream`, `SendOptions.onDelta`) with **no** AskQuestion interception or answer injection API.
- Wrote ADR locking `interaction_style: synthetic`, `resolveInteractionPlanFromCase`, `runCaseWithScriptedAnswers`, and `interactions.answers` > `follow_ups[]` precedence.
- Wrote verbatim SDK surface snapshot with drift watchlist (`RunResult.usage.totalTokens` absent on 1.0.12).

### Blockers Encountered
- Explore agent completed investigation but could not write files; fix round authored audit artefacts directly.

### Files Modified
- `specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-askquestion-adr.md` (created)
- `specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-surface-snapshot.md` (created)
- `specs/20260526-eval-askquestion-strategy-bridge/status/subtask-01-*.status.yml` (updated)
- `specs/20260526-eval-askquestion-strategy-bridge/subtask-01-*.md` (checklists ticked)
