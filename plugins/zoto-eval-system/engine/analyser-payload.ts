/**
 * Canonical type definitions for the LLM analyser payload.
 *
 * The analyser (`scripts/eval-analyse.ts`) produces `AnalyserPayload` JSON
 * blobs; these are consumed by:
 *
 *   - `scripts/eval-stamp.ts` (stamps code-strategy test files)
 *   - `evals/llm/_shared/case-runner.ts` (when the template is stamped)
 *   - `scripts/check-analyser-payload-parity.ts` (cross-language drift check)
 *   - `evals/_llm/update.ts` (updater)
 *
 * Previously defined inline in `scripts/eval-analyse.ts` with a duplicated
 * copy in `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/_shared/case-runner.ts.tmpl`.
 * This module is now the single source of truth. The template should be
 * updated in subtask 05 to import from here (via the re-export at
 * `evals/llm/_shared/`).
 *
 * ## Import graph
 *
 *   evals/_llm/analyser-payload.ts     ← THIS FILE (canonical types)
 *       ↑
 *   scripts/eval-analyse.ts             ← re-imports and adds runtime logic
 *   evals/llm/_shared/code-strategy-case.ts  ← may reference for docs
 *   plugins/.../case-runner.ts.tmpl     ← subtask 05 updates template
 */

/**
 * Primitive kinds the analyser supports. Matches the JSON schema at
 * `plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json`.
 */
export type PrimitiveKind = "skill" | "command" | "agent" | "hook" | "rule";

/**
 * How a primitive owns user-facing interaction during eval runs. Emitted by the
 * LLM analyser and copied into `_meta.primitive_analysis.interactionStyle`.
 * Paired with `requiresInteraction` to drive the unified-harness runtime branch
 * (scripted AskQuestion answers vs single `sendPrompt`). Same file shape on
 * disk either way — every non-skill primitive emits a co-located
 * `<kind>/evals/<name>.test.ts`.
 */
export type InteractionStyle = "command-owned" | "subagent-escalated" | "none";

export interface AnalyserFixtureFile {
  path: string;
  content?: string;
  /**
   * Repo-relative source path. Mirrored as `from_` in the Python dataclass
   * because `from` is a Python keyword; the parity gate tolerates the rename.
   */
  from?: string;
}

export interface AnalyserFixtures {
  files: AnalyserFixtureFile[];
}

export interface AnalyserExpectedFilesystem {
  created?: string[];
  modified?: string[];
  removed?: string[];
  unchanged?: string[];
}

export interface AnalyserCase {
  scenario: string;
  prompt: string;
  assertions: string[];
  follow_ups?: string[];
  fixtures?: AnalyserFixtures;
  fixture_justifications?: string[];
  expected_filesystem?: AnalyserExpectedFilesystem;
  expected_output?: string;
}

export interface AnalyserPayload {
  schema_version: 1;
  analyser_version: string;
  model_id: string;
  target_id: string;
  kind: PrimitiveKind;
  source_path: string;
  source_hash: string;
  summary: string;
  /**
   * Whether eval cases for this primitive require scripted multi-turn
   * interaction. When `true`, the unified-harness runtime loads
   * `interactions.answers` and uses the scripted-answer branch; when `false`,
   * the harness uses a single `agent.send(prompt)` and grades the response.
   * Same emitted file shape (`<kind>/evals/<name>.test.ts`) either way.
   * Optional for backwards-compat with cached payloads predating the
   * askQuestion interaction bridge.
   */
  requiresInteraction?: boolean;
  /**
   * Who owns AskQuestion / needs_user_input hand-offs. Paired with
   * `requiresInteraction` whenever the analyser can classify the primitive.
   */
  interactionStyle?: InteractionStyle;
  cases: AnalyserCase[];
}
