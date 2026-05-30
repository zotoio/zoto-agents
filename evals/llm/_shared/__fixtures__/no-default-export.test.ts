/**
 * Fixture runner consumed by `evals/llm/_shared/run-llm-suite.test.ts`
 * (spec `20260527-evals-json-first-migration`, subtask 03).
 *
 * Intentionally exports NO `default` so the harness dispatcher
 * (`runRunnerCase` in `run-llm-suite.ts`) takes the "missing default
 * export" failure branch with a clear error message naming the runner
 * path. Like its sibling fixture, the `__fixtures__/` folder is
 * excluded from the `_shared` Vitest config's `test.include` glob so
 * this file is never picked up as a regular test suite.
 */
export const TAG = "no-default-export-fixture";
