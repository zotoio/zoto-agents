/**
 * Fixture runner consumed by `evals/llm/_shared/run-llm-suite.test.ts`
 * (spec `20260527-evals-json-first-migration`, subtask 03).
 *
 * Despite the `.test.ts` extension (required for the runner-discriminator
 * regex `\.test\.ts$`), this file does NOT register any Vitest cases —
 * it is dynamically imported by the harness as a runner module. The
 * `__fixtures__/` folder is excluded from the `_shared` Vitest config's
 * `test.include` glob so this file is never picked up as a regular
 * test suite.
 *
 * Behaviour:
 *
 *   • Exposes the harness-supplied `RunnerParams` shape to the host
 *     test via a module-scoped `lastParams` capture (re-exported as a
 *     getter for test assertions).
 *   • Default export returns `{ passed: true, reason: "ok" }` — the
 *     minimal happy-path verdict referenced in the subtask 03 spec.
 */
import type {
  RunnerFn,
  RunnerParams,
  RunnerResult,
} from "../runner-params.js";

let lastParams: RunnerParams | null = null;

/** Test-only accessor — the harness tests read this back. */
export function getLastParams(): RunnerParams | null {
  return lastParams;
}

const run: RunnerFn = async (params: RunnerParams): Promise<RunnerResult> => {
  lastParams = params;
  return { passed: true, reason: "ok" };
};

export default run;
