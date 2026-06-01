/**
 * Shared case-shape types for the unified LLM eval harness.
 *
 * ## Import Graph
 *
 *   plugins/zoto-eval-system/engine/case.ts     ← canonical EvalCase
 *       ↑
 *   plugins/zoto-eval-system/engine/_user-case-guards.ts
 *       ↑ (re-exported by this module's siblings)
 *   evals/llm/_shared/llm-case.ts               ← THIS FILE
 *       ↑
 *   <kind>/evals/<name>.test.ts                 ← stamped per-primitive tests
 *
 * The LlmCaseDefinition type below is the canonical shape that the
 * per-primitive test template stamps into every co-located test file's
 * CASES array. There is now a single LLM emitter; the historical
 * "code strategy" naming has been retired (KD-3 of
 * spec-eval-single-backend-colocated-restructure-20260526).
 *
 * ## Relationship to EvalCase (legacy declarative JSON shape)
 *
 * The runtime case shape is intentionally a *narrower* variant of what
 * EvalCase expresses (still defined in the engine package for the
 * historical declarative JSON loader the runner consumes):
 *
 *   - id is always string (Vitest uses string IDs; the JSON loader
 *     accepts number | string and stringifies on its side).
 *   - graders uses Array<Record<string, unknown>> — the test runner
 *     dispatches dynamically by (g as {type?: string}).type, so this
 *     remains a loose record from the case-data perspective. The harness
 *     applies type-narrowing when actually invoking each grader.
 *   - fixtures / expected_filesystem mirror CaseFixtures /
 *     CaseExpectedFilesystem from the engine case.ts structurally.
 *   - _meta is absent at the JSON-in-TypeScript boundary (stamped case
 *     data doesn't embed meta); the runner adds it post-load via the
 *     analyser cache.
 */
import type {
  CaseFixtures,
  CaseExpectedFilesystem,
} from "#eval-engine/case.js";

/**
 * Scripted AskQuestion turns for interactive cases.
 *
 * Answers are injected via `agent.send()` (synthetic interaction style on
 * SDK 1.0.12). Optional `questions` labels mirror AskQuestion prompt text
 * for graders and reports only — they are not sent to the agent.
 */
export interface CaseInteractions {
  /** Optional labels mirroring AskQuestion prompt text (graders / reports only). */
  questions?: string[];
  /** Scripted user answers injected via agent.send() — synthetic style only on SDK 1.0.12. */
  answers: string[];
}

/**
 * The case shape embedded in each stamped co-located `<name>.test.ts` file's
 * CASES array (declarative cases) or loaded from a JSON eval file (declarative
 * or runner cases).
 *
 * ## Runner cases
 *
 * When `runner` is set, the case is a *runner case*: execution is delegated
 * to the typed `.test.ts` file at that path (relative to the JSON file's
 * directory — resolved via `DefineLlmEvalOptions.__sourcePath`). Runner cases
 * MUST NOT carry `assertions`, `graders`, `fixtures`, `expected_filesystem`,
 * `expected_output`, `prompt`, `follow_ups`, or `interactions`. They require
 * `parameters` (object, may be empty).
 */
export interface LlmCaseDefinition {
  id: string;
  /**
   * Realistic user/agent turn for declarative cases. Omit on runner cases.
   */
  prompt?: string;
  /**
   * Relative path to a `.test.ts` runner from the JSON file's directory.
   * When present, the harness skips declarative grading entirely.
   */
  runner?: string;
  /**
   * Free-form payload passed to the runner as `RunnerParams.parameters`.
   * Required when `runner` is set.
   */
  parameters?: Record<string, unknown>;
  /**
   * Legacy synthetic follow-up turns (`agent.send` per entry). Kept for
   * backwards compatibility during the AskQuestion bridge migration.
   *
   * **Precedence:** when `interactions.answers` is non-empty, the bridge
   * (`resolveInteractionPlanFromCase`) uses those answers and **ignores**
   * `follow_ups[]`. When `interactions` is absent or has no answers, the
   * bridge falls back to `follow_ups[]` verbatim.
   */
  follow_ups?: string[];
  /**
   * Explicit scripted Q/A for interactive cases. When `answers` is present,
   * it wins over `follow_ups[]` (see precedence note on `follow_ups`).
   */
  interactions?: CaseInteractions;
  /** Declarative cases require ≥1 assertion; omit on runner cases. */
  assertions?: string[];
  assertion_patterns?: string[];
  /**
   * Grader configs dispatched at runtime by `.type`. Kept as a loose
   * record here because the harness applies type-narrowing dynamically.
   * For typed grader construction, see `DeclarativeGraderConfig` in
   * the engine `case.ts`.
   */
  graders?: Array<Record<string, unknown>>;
  /**
   * Structurally mirrors `CaseFixtures` from the engine `case.ts`.
   * Uses inline shape for backwards compatibility with existing CASES
   * JSON blobs.
   */
  fixtures?: CaseFixtures;
  expected_filesystem?: CaseExpectedFilesystem;
  expected_output?: string;
  /**
   * Optional stamped metadata. Absent on hand-written fixture cases; the
   * suite-load guard in `run-llm-suite.ts` exempts those from the
   * `interactions` ↔ `requiresInteraction` invariant.
   */
  _meta?: {
    generated?: boolean;
    primitive_analysis?: {
      requiresInteraction?: boolean;
      interactionStyle?: string;
      [key: string]: unknown;
    };
  };
}
