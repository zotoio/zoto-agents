/**
 * Shared case-shape types for the LLM `code`-strategy eval backend.
 *
 * ## Import Graph
 *
 *   evals/_llm/case.ts            ← canonical `EvalCase`, `DeclarativeGraderConfig`
 *       ↑
 *   evals/_llm/_user-case-guards.ts  ← canonical file/case guards
 *       ↑ (re-exported below)
 *   evals/llm/_shared/code-strategy-case.ts  ← THIS FILE
 *       ↑
 *   evals/llm/test_*.test.ts       ← stamped per-primitive tests
 *
 * The `CodeStrategyCaseDefinition` type below is the canonical shape that
 * the per-primitive test template (`per-primitive-test.ts.tmpl`) stamps
 * into every `test_*.test.ts` file's `CASES` array. Previously each test
 * file carried an inline `interface CaseDefinition` — this module
 * eliminates that duplication.
 *
 * ## Relationship to `EvalCase` (declarative backend)
 *
 * The code-strategy case shape is intentionally a *narrower* variant of
 * what `EvalCase` expresses:
 *
 *   - `id` is always `string` (Vitest uses string IDs; declarative's
 *     `EvalCase` permits `number | string`).
 *   - `graders` uses `Array<Record<string, unknown>>` — the test runner
 *     dispatches dynamically by `(g as {type?: string}).type`, so this
 *     remains a loose record from the case-data perspective. The harness
 *     applies type-narrowing when actually invoking each grader.
 *   - `fixtures` / `expected_filesystem` mirror `CaseFixtures` /
 *     `CaseExpectedFilesystem` from `evals/_llm/case.ts` structurally.
 *   - `_meta` is absent at the JSON-in-TypeScript boundary (stamped case
 *     data doesn't embed meta); the runner adds it post-load via the
 *     analyser cache.
 *
 * ## Migration (subtask 05/06)
 *
 * Subtask 05 will update the template to `import type { CodeStrategyCaseDefinition }
 * from "./_shared/code-strategy-case.js"` instead of inlining the interface.
 * Subtask 06 will bulk-migrate the 37 existing stamped files.
 */
import type {
  CaseFixtures,
  CaseExpectedFilesystem,
} from "#eval-engine/case.js";

/**
 * The case shape embedded in each stamped `test_*.test.ts` file's CASES array.
 *
 * Kept structurally compatible with the inline `interface CaseDefinition`
 * that the template previously stamped (lines 43-58 of
 * `per-primitive-test.ts.tmpl`). Consumers already destructure `.id`,
 * `.prompt`, `.assertions`, etc. — this type preserves that contract.
 */
export interface CodeStrategyCaseDefinition {
  id: string;
  prompt: string;
  follow_ups?: string[];
  assertions: string[];
  assertion_patterns?: string[];
  /**
   * Grader configs dispatched at runtime by `.type`. Kept as a loose
   * record here because the harness applies type-narrowing dynamically.
   * For typed grader construction, see `DeclarativeGraderConfig` in
   * `evals/_llm/case.ts`.
   */
  graders?: Array<Record<string, unknown>>;
  /**
   * Structurally mirrors `CaseFixtures` from `evals/_llm/case.ts`.
   * Uses inline shape for backwards compatibility with existing CASES
   * JSON blobs.
   */
  fixtures?: CaseFixtures;
  expected_filesystem?: CaseExpectedFilesystem;
  expected_output?: string;
}

/**
 * @deprecated Use `CodeStrategyCaseDefinition` instead. This alias exists
 * only for the transitional period where stamped test files still declare
 * `const CASES: CaseDefinition[]`.
 */
export type CaseDefinition = CodeStrategyCaseDefinition;
