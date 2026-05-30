// _meta.generated: true
/**
 * Shared grader types for the `code`-strategy LLM evals.
 *
 * Stamped into `evals/llm/_shared/graders/common.ts`. Mirrors the
 * declarative-strategy types at `evals/_llm/graders/common.ts` so
 * downstream code that wants to consume either strategy's reports can
 * share type imports. Keep the shapes identical — subtask 12's merged
 * `report.yml` depends on this invariant.
 */
export type Verdict = "pass" | "fail" | "warn";

export interface GraderReport {
  grader: string;
  verdict: Verdict;
  detail: string;
}
