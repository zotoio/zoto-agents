# SDK surface snapshot — `@cursor/sdk@1.0.12`

Verbatim excerpts from `node_modules/@cursor/sdk/dist/esm/*.d.ts` (pinned baseline per `sdk-bridge.ts#PINNED_SDK_VERSION`).  
Captured 20260526 via unpkg `@cursor/sdk@1.0.12` and cross-checked against the locally installed `@cursor/sdk@1.0.13` copy (Run / RunResult / SendOptions / SDKToolUseMessage shapes unchanged for the investigated API).

Source root: `dist/esm/`

---

## `run.d.ts`

```typescript
import { ConfigurationError } from "./errors.js";
import type { SDKMessage } from "./messages.js";
import type { ModelSelection } from "./options.js";
import type { ConversationTurn } from "./types/conversation-types.js";
export type RunStatus = "running" | "finished" | "error" | "cancelled";
export type RunResultStatus = Exclude<RunStatus, "running">;
export type RunOperation = "stream" | "wait" | "cancel" | "conversation";
export declare class UnsupportedRunOperationError extends ConfigurationError {
    constructor(operation: RunOperation, reason?: string);
}
export interface RunGitBranchInfo {
    repoUrl: string;
    branch?: string;
    prUrl?: string;
}
export interface RunGitInfo {
    branches: RunGitBranchInfo[];
}
export interface RunResult {
    id: string;
    status: RunResultStatus;
    result?: string;
    model?: ModelSelection;
    durationMs?: number;
    git?: RunGitInfo;
}
export interface Run {
    readonly id: string;
    readonly agentId: string;
    supports(operation: RunOperation): boolean;
    unsupportedReason(operation: RunOperation): string | undefined;
    stream(): AsyncGenerator<SDKMessage, void>;
    conversation(): Promise<ConversationTurn[]>;
    wait(): Promise<RunResult>;
    cancel(): Promise<void>;
    readonly status: RunStatus;
    onDidChangeStatus(listener: (status: RunStatus) => void): () => void;
    readonly result?: string;
    readonly model?: ModelSelection;
    readonly durationMs?: number;
    readonly git?: RunGitInfo;
    readonly createdAt?: number;
}
```

---

## `agent.d.ts` — `SDKAgent` and `SendOptions`

```typescript
import type { McpServerConfig, ModelListItem, ModelSelection, SDKUserMessage } from "./options.js";
import type { Run } from "./run.js";
import type { ConversationStep } from "./types/conversation-types.js";
import type { InteractionUpdate } from "./types/delta-types.js";
export interface SDKAgent {
    readonly agentId: string;
    /**
     * The agent's current model selection. Updated after each successful
     * `send({ model })`; `undefined` until something sets it.
     */
    readonly model: ModelSelection | undefined;
    send(message: string | SDKUserMessage, options?: SendOptions): Promise<Run>;
    close(): void;
    reload(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
    listArtifacts(): Promise<import("./artifacts.js").SDKArtifact[]>;
    downloadArtifact(path: string): Promise<Buffer>;
}
export interface SendOptions {
    model?: ModelSelection;
    mcpServers?: Record<string, McpServerConfig>;
    onStep?: (args: {
        step: ConversationStep;
    }) => void | Promise<void>;
    onDelta?: (args: {
        update: InteractionUpdate;
    }) => void | Promise<void>;
    /**
     * Per-send options that only apply to local agents. Nested to make the
     * local-only scope explicit at the type level — cloud callers cannot
     * pass these fields.
     */
    local?: {
        /**
         * Expire the currently active persisted run, if any, before starting
         * this message as a new follow-up run. Recovery path for local agents
         * left wedged after a crashed CLI process. Cloud enforces a busy-run
         * check server-side (`409 agent_busy`), so no equivalent is needed.
         */
        force?: boolean;
    };
}
```

---

## `stubs.d.ts` — `Agent` static factory

```typescript
export declare class Agent {
    private constructor();
    /**
     * Create an agent instance.
     */
    static create(options: AgentOptions): Promise<SDKAgent>;
    /**
     * Resume an existing agent by ID.
     */
    static resume(agentId: string, options?: Partial<AgentOptions>): Promise<SDKAgent>;
    /**
     * Convenience API to create an agent, run one prompt, and close.
     */
    static prompt(message: string, options?: AgentOptions): Promise<RunResult>;
    static list(options?: ListAgentsOptions): Promise<ListResult<SDKAgentInfo>>;
    static listRuns(agentId: string, options?: ListRunsOptions): Promise<ListResult<Run>>;
    static getRun(runId: string, options?: GetRunOptions): Promise<Run>;
    static cancelRun(runId: string, options?: GetRunOptions): Promise<void>;
    static get(agentId: string, options?: GetAgentOptions): Promise<SDKAgentInfo>;
    static archive(agentId: string, options?: AgentOperationOptions): Promise<void>;
    static unarchive(agentId: string, options?: AgentOperationOptions): Promise<void>;
    static delete(agentId: string, options?: AgentOperationOptions): Promise<void>;
    static readonly messages: {
        list(agentId: string, options?: GetAgentMessagesOptions): Promise<AgentMessage[]>;
    };
}
```

---

## `messages.d.ts` — tool-call stream messages

```typescript
export interface ToolUseBlock {
    type: "tool_use";
    id: string;
    name: string;
    input: unknown;
}
export interface SDKAssistantMessage {
    type: "assistant";
    agent_id: string;
    run_id: string;
    message: {
        role: "assistant";
        content: Array<TextBlock | ToolUseBlock>;
    };
}
export interface SDKToolUseMessage {
    type: "tool_call";
    agent_id: string;
    run_id: string;
    call_id: string;
    name: string;
    status: "running" | "completed" | "error";
    args?: unknown;
    result?: unknown;
    truncated?: {
        args?: boolean;
        result?: boolean;
    };
}
export type SDKMessage = SDKSystemMessage | SDKUserMessageEvent | SDKAssistantMessage | SDKToolUseMessage | SDKThinkingMessage | SDKStatusMessage | SDKRequestMessage | SDKTaskMessage;
```

---

## `index.d.ts` — exported `InteractionUpdate` variants (observe-only deltas)

The on-disk `types/delta-types.d.ts` is a one-line re-export:

```typescript
export * from "@anysphere/cursor-sdk-shared/delta-types";
```

Public names exported from the package entry (`index.d.ts`):

```typescript
export type {
  InteractionListener,
  InteractionUpdate,
  PartialToolCallUpdate,
  ShellOutputDeltaUpdate,
  SummaryCompletedUpdate,
  SummaryStartedUpdate,
  SummaryUpdate,
  TextDeltaUpdate,
  ThinkingCompletedUpdate,
  ThinkingDeltaUpdate,
  TokenDeltaUpdate,
  ToolCallCompletedUpdate,
  ToolCallStartedUpdate,
  TurnEndedUpdate,
  UserMessageAppendedUpdate,
} from "./types/delta-types.js";
```

No variant in this export list accepts a caller-supplied answer payload or resumes a blocked tool call.

---

## `options.d.ts` — `AgentOptions` (agent creation)

```typescript
export interface AgentOptions {
    model?: ModelSelection;
    apiKey?: string;
    name?: string;
    local?: LocalAgentOptions;
    cloud?: CloudAgentOptions;
    mcpServers?: Record<string, McpServerConfig>;
    agents?: Record<string, AgentDefinition>;
    agentId?: string;
    idempotencyKey?: string;
    platform?: CursorAgentPlatformOptions;
}
```

---

## Release-note / drift watchlist

Fields relevant to eval-bridge maintenance when bumping `@cursor/sdk`:

| Field / API | Present on 1.0.12? | Notes |
|-------------|-------------------|-------|
| `RunResult.result` | Yes | Final assistant text; `awaitRun` reads this |
| `RunResult.usage.totalTokens` | **No** | Token fallback remains `approximate:chars/4` |
| `RunResult.tokens` | **No** | Same |
| `Run.stream()` | Yes | Required for tool-call observation |
| `Run.wait()` | Yes | Current fast path; no tool metadata |
| `SendOptions.onDelta` | Yes | Observe-only; no answer injection |
| `SendOptions.onStep` | Yes | Observe-only step boundaries |
| `SDKToolUseMessage.name` | Yes | Filter `"AskQuestion"` when observing stream |
| `SDKToolUseMessage.args` / `.result` | Yes | Optional; may be truncated |
| Tool-call injection / replay API | **No** | Drives `interaction_style: synthetic` ADR decision |
| `SendOptions.idempotencyKey` | **No (1.0.12)** | Added in locally installed **1.0.13** (`agent.d.ts` L42) — unrelated to AskQuestion |
| `AgentBusyError` | **No (1.0.12 index exports)** | Present in **1.0.13** `index.d.ts` — cloud busy-run ergonomics only |

---

## Absent APIs (confirmed negative)

The following were searched for in the 1.0.12 public `.d.ts` tree and **not found**:

- `onToolCall`, `appendInput`, `injectToolResult`, `resumeWithAnswers`
- `AskQuestion` as a typed tool-call variant (tool names are runtime strings on `SDKToolUseMessage.name`)
- `RunResult.toolCalls`, `RunResult.interactions`, `RunResult.usage`
