export type Verdict = "pass" | "fail" | "warn";

export interface GraderReport {
  grader: string;
  verdict: Verdict;
  detail: string;
}
