# ADR: AskQuestion bridge strategy for `@cursor/sdk` 1.0.12

**Status:** Accepted  
**Date:** 20260526  
**Scope:** Pins the exported surface of `evals/llm/_shared/askquestion-bridge.ts` for subtasks 05–09.

## Context

Eval System `code`-strategy tests drive primitives that use Cursor's `AskQuestion` tool (commands such as `/z-eval-configure`, `/z-eval-create`). Today, `run-code-strategy-suite.ts#runCase` sends the initial `c.prompt`, then loops `c.follow_ups ?? []` as ordinary `agent.send(followUp)` turns — a **synthetic** workaround, not a faithful interactive simulation.

Subtask 01 probes `@cursor/sdk` **1.0.12** (pinned in `evals/llm/_shared/sdk-bridge.ts#PINNED_SDK_VERSION`) to decide whether native tool-call interception exists or whether the bridge must layer scripted answers on top of `agent.send`.

## Decision summary

| Topic | Decision |
|-------|----------|
| Native AskQuestion interception | **Not available** on SDK 1.0.12 |
| `interaction_style` in reports | **`synthetic`** (only style supported on pinned SDK) |
| Case answer source precedence | **`interactions.answers` > `follow_ups[]`** |
| Run orchestration entry point | **`runCaseWithScriptedAnswers`** |
| Plan resolution entry point | **`resolveInteractionPlanFromCase`** |
| Tool-call observation | **Best-effort observe-only** via `run.stream()` / `SendOptions.onDelta`; no injection hook |

## Investigation: what `@cursor/sdk` 1.0.12 exposes

### Agent lifecycle

- **`Agent.create(options)`** → `Promise<SDKAgent>` (`stubs.d.ts` L35–40).
- **`SDKAgent.send(message, options?)`** → `Promise<Run>` (`agent.d.ts` L12).
- **`SDKAgent.close()`** — best-effort teardown (`agent.d.ts` L13).

The repo already wraps these in `sdk-bridge.ts`: `createAgent`, `sendPrompt`, `awaitRun`, `closeAgent`.

### Run lifecycle

- **`Run.wait()`** → `Promise<RunResult>` — blocking wait for final text (`run.d.ts` L34).
- **`Run.stream()`** → `AsyncGenerator<SDKMessage>` — incremental message stream including tool events (`run.d.ts` L32).
- **`Run.conversation()`** → `Promise<ConversationTurn[]>` — post-hoc turn list (`run.d.ts` L33).
- **`Run.cancel()`**, status listeners, `supports(operation)` for `"stream" | "wait" | "cancel" | "conversation"` (`run.d.ts` L27–42).

There is **no** `Run.appendInput`, `Run.injectToolResult`, or `Run.resumeWithAnswers` surface.

### `RunResult` shape (1.0.12)

```typescript
interface RunResult {
  id: string;
  status: RunResultStatus;
  result?: string;      // final assistant text
  model?: ModelSelection;
  durationMs?: number;
  git?: RunGitInfo;
}
```

(`run.d.ts` L19–26)

**Absent from public types:** `usage`, `totalTokens`, `tokens`, per-run tool-call arrays, AskQuestion metadata. Confirmed by `sdk-bridge.ts#TOKEN_RESULT_FIELD` (`"approximate:chars/4"` fallback).

### Send-time observation hooks (observe-only)

`SendOptions` on `SDKAgent.send` (`agent.d.ts` L19–43):

| Field | Purpose |
|-------|---------|
| `onStep?: ({ step: ConversationStep }) => void` | Step boundary callback |
| `onDelta?: ({ update: InteractionUpdate }) => void` | Streaming delta callback |
| `local?.force?: boolean` | Expire wedged local run before follow-up |

`InteractionUpdate` variants exported from `index.d.ts` L12 include `ToolCallStartedUpdate`, `ToolCallCompletedUpdate`, `PartialToolCallUpdate`, `TextDeltaUpdate`, etc. These are **read-only callbacks** — there is no API to supply an answer and resume the same blocked tool call.

### Tool-call visibility in the message stream

`SDKToolUseMessage` (`messages.d.ts` L41–54):

```typescript
interface SDKToolUseMessage {
  type: "tool_call";
  call_id: string;
  name: string;           // e.g. "AskQuestion" when emitted by Cursor agent runtime
  status: "running" | "completed" | "error";
  args?: unknown;
  result?: unknown;
}
```

Tool calls are observable when consuming `run.stream()` or `onDelta` tool events. The fast path used today (`run.wait()` only) **does not capture** them — see `evals/llm/_shared/graders/tool-called.ts` L7–12.

### Questions explicitly ruled out

| Question | Answer | Citation |
|----------|--------|----------|
| `onToolCall` / answer injection between turns? | **No** | `Run` interface has only `stream`, `wait`, `conversation`, `cancel` (`run.d.ts` L27–35); `SendOptions` has observe-only `onDelta` (`agent.d.ts` L25–27) |
| `RunResult` carries AskQuestion metadata? | **No** | `RunResult` fields limited to id/status/result/model/durationMs/git (`run.d.ts` L19–26) |
| Scripted answers shim? | **`agent.send(answer)` follow-ups** tagged `interaction_style: synthetic` | This ADR |
| `follow_ups[]` compatibility? | **Preserved** as fallback when `interactions.answers` absent | Precedence rule below |

## Chosen architecture: synthetic scripted follow-ups

Because the SDK provides **observe-only** tool streaming and **no** AskQuestion interception, the bridge:

1. Resolves an **`InteractionPlan`** from the case (`resolveInteractionPlanFromCase`).
2. Sends the initial prompt, waits for completion.
3. For each scripted answer, sends it as a normal follow-up via `agent.send` (`runCaseWithScriptedAnswers`).
4. Optionally observes tool calls via `run.stream()` concurrently with `wait()` (best-effort; not required for MVP).
5. Tags every injected turn and the case report row with **`interaction_style: "synthetic"`**.
6. When `interactions.answers` is present, it **wins over** `follow_ups[]` (legacy field kept for round-trip migration).

This preserves existing `follow_ups[]` semantics for cases not yet migrated while giving interactive cases an explicit `interactions` block.

### Answer precedence

```
if (case.interactions?.answers?.length)
  → source: "interactions.answers", scriptedAnswers = interactions.answers
else if (case.follow_ups?.length)
  → source: "follow_ups[]", scriptedAnswers = follow_ups
else
  → source: "none", scriptedAnswers = []
```

When both are present, **`interactions.answers` takes precedence**; `follow_ups[]` is ignored (migration subtask 09 may move legacy data into `interactions.answers` verbatim).

### `CodeStrategyCaseDefinition` extension (subtask 07)

```typescript
interface CaseInteractions {
  /** Optional labels mirroring AskQuestion prompt text (graders / reports only). */
  questions?: string[];
  /** Scripted user answers injected via agent.send() — synthetic style only on SDK 1.0.12. */
  answers: string[];
}

// Added to CodeStrategyCaseDefinition:
interactions?: CaseInteractions;
```

`follow_ups?: string[]` remains optional for backwards compatibility during migration.

## Exported surface: `evals/llm/_shared/askquestion-bridge.ts`

| Export | Kind | Signature / shape | Purpose |
|--------|------|-------------------|---------|
| `InteractionStyle` | type alias | `"synthetic" \| "native"` | Report + turn tagging; only `"synthetic"` used on SDK 1.0.12 |
| `CaseInteractions` | interface | `{ questions?: string[]; answers: string[] }` | Case JSON slot for scripted Q/A |
| `InteractionPlanSource` | type alias | `"interactions.answers" \| "follow_ups[]" \| "none"` | Provenance for reports |
| `InteractionPlan` | interface | `{ style: InteractionStyle; scriptedAnswers: string[]; source: InteractionPlanSource }` | Resolved plan consumed by runner |
| `ObservedToolCall` | interface | `{ tool: string; callId?: string; status?: string; ok: boolean }` | Best-effort stream capture for `tool-called` grader |
| `ScriptedRunTurn` | interface | `{ prompt: string; text: string; result: RunResult; interactionStyle: InteractionStyle; toolCalls: ObservedToolCall[] }` | Per-turn audit record |
| `ScriptedRunResult` | interface | `{ turns: ScriptedRunTurn[]; text: string; tokens: number; tokenSource: string; interactionStyle: InteractionStyle }` | Aggregate result for `runCase` / reporter |
| `resolveInteractionPlanFromCase` | function | `(c: Pick<CodeStrategyCaseDefinition, "interactions" \| "follow_ups">) => InteractionPlan` | **Case-compatible accessor** — single source of precedence rules |
| `beginScriptedInteractionCase` | function | `(opts: CreateAgentOptions & { prompt: string; case: Pick<CodeStrategyCaseDefinition, "interactions" \| "follow_ups">; resolveTokens: typeof resolveTokens; observeToolCalls?: boolean }) => Promise<{ agent: SDKAgent; plan: InteractionPlan; result: ScriptedRunResult }>` | **Create agent with scripted answers** — wraps `createAgent` + plan resolution + `runCaseWithScriptedAnswers`; caller owns `closeAgent` in `finally` |
| `formatSyntheticAnswer` | function | `(answer: string, ctx?: { questionIndex?: number }) => string` | Optional wrapper so answers read like user choices in the agent transcript |
| `observeToolCallsFromRun` | function | `(run: Run) => Promise<ObservedToolCall[]>` | Consumes `run.stream()` until terminal; filters `SDKToolUseMessage` |
| `runCaseWithScriptedAnswers` | function | `(opts: { agent: SDKAgent; prompt: string; plan: InteractionPlan; resolveTokens: typeof resolveTokens; observeToolCalls?: boolean }) => Promise<ScriptedRunResult>` | **Advance run with answer injection** — initial prompt + scripted sends |
| `ASKQUESTION_BRIDGE_SURFACE` | const tuple | `["InteractionStyle", "resolveInteractionPlanFromCase", "beginScriptedInteractionCase", "runCaseWithScriptedAnswers", ...]` | Self-test / drift guard (mirrors `BRIDGE_SURFACE`) |
| `DEFAULT_INTERACTION_STYLE` | const | `"synthetic" as const` | Single-style default for SDK 1.0.12 |

### Barrel re-export plan

Mirrors `sdk-bridge.ts` discipline:

| Consumer path | Import |
|---------------|--------|
| `evals/llm/_shared/run-code-strategy-suite.ts` | `import { resolveInteractionPlanFromCase, runCaseWithScriptedAnswers } from "./askquestion-bridge.js"` |
| Stamped `test_*.test.ts` (via `#eval-engine` alias) | `import { resolveInteractionPlanFromCase } from "#eval-engine/askquestion-bridge.js"` |
| Canonical engine copy (subtask 05) | `plugins/zoto-eval-system/engine/askquestion-bridge.ts` — thin re-export or shared source synced with `_shared/` |
| `evals/llm/vitest.config.ts` | No change — existing `#eval-engine` → `plugins/zoto-eval-system/engine/` mapping covers new file |

Future SDK releases that add native interception may introduce `interaction_style: "native"` by extending `runCaseWithScriptedAnswers` internally; case JSON and exported names stay stable.

## Integration with `run-code-strategy-suite.ts`

Replace the inline follow-up loop (`run-code-strategy-suite.ts` L242–247):

```typescript
// Before (current):
for (const followUp of c.follow_ups ?? []) {
  const followRun = await sendPrompt(agent, followUp);
  ...
}

// After (subtask 07):
const plan = resolveInteractionPlanFromCase(c);
const scripted = await runCaseWithScriptedAnswers({
  agent,
  prompt: c.prompt,
  plan,
  resolveTokens,
  observeToolCalls: (c.graders ?? []).some((g) => g.type === "tool-called"),
});
text = scripted.text;
tokens = scripted.tokens;
tokenSource = scripted.tokenSource;
// reportCase gains: interaction_style: scripted.interactionStyle
```

When `plan.source === "none"`, behaviour matches today's single-prompt cases.

## Usage sketch

```typescript
import { createAgent, closeAgent } from "#eval-engine/sdk-bridge.js";
import {
  resolveInteractionPlanFromCase,
  runCaseWithScriptedAnswers,
} from "#eval-engine/askquestion-bridge.js";
import { resolveTokens } from "#eval-engine/sdk-bridge.js";
import type { CodeStrategyCaseDefinition } from "./code-strategy-case.js";

const CASE: CodeStrategyCaseDefinition = {
  id: "configure-framework-choice",
  prompt: "Run /z-eval-configure for this repo.",
  interactions: {
    questions: ["Which static framework?", "Which LLM strategy?"],
    answers: ["pytest", "code"],
  },
  // follow_ups ignored when interactions.answers present
  follow_ups: ["legacy-should-not-run"],
  assertions: ["Response confirms pytest + code strategy were written to config.yml"],
};

async function runInteractiveCase() {
  const agent = await createAgent({ modelId: "composer-2", cwd: process.cwd() });
  try {
    const plan = resolveInteractionPlanFromCase(CASE);
    // plan.style === "synthetic"
    // plan.scriptedAnswers === ["pytest", "code"]
    // plan.source === "interactions.answers"

    const result = await runCaseWithScriptedAnswers({
      agent,
      prompt: CASE.prompt,
      plan,
      resolveTokens,
      observeToolCalls: true,
    });

    // result.interactionStyle === "synthetic"
    // result.text — concatenated assistant output across all turns
    // result.turns[1].toolCalls — may include { tool: "AskQuestion", ok: true } if streamed
  } finally {
    closeAgent(agent);
  }
}
```

## Declarative runner guard (subtask 08 preview)

Cases with `requiresInteraction: true` MUST NOT land in the declarative JSON backend. The declarative `runner.ts.tmpl` validation step rejects cases whose analyser payload or explicit `interactions` block implies AskQuestion when `requiresInteraction !== false`. That guard is out of scope for this ADR but depends on the `CaseInteractions` shape above.

## Consequences

- **Positive:** Stable contract for subtasks 05–09; explicit `interaction_style: synthetic` in reports; `interactions.answers` precedence makes migration intent clear; `follow_ups[]` keeps working for unmigrated cases.
- **Negative:** Tests still do not block the agent mid-run on a real AskQuestion tool call — answers arrive as subsequent user messages, which may diverge slightly from IDE UX.
- **Neutral:** `tool-called` grader becomes useful only when `observeToolCalls: true`; default off to preserve wall-time.

## References

- `evals/llm/_shared/sdk-bridge.ts` — pinned SDK wrapper
- `evals/llm/_shared/run-code-strategy-suite.ts#L213-L247` — current follow-up loop
- `evals/llm/_shared/graders/tool-called.ts#L7-L12` — documents missing stream capture
- `specs/20260526-eval-askquestion-strategy-bridge/audit/sdk-surface-snapshot.md` — verbatim `.d.ts` excerpts
- `@cursor/sdk@1.0.12` — `dist/esm/run.d.ts`, `agent.d.ts`, `messages.d.ts`, `stubs.d.ts`
