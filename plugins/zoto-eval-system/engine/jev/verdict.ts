/**
 * Jev grader verdict — a closed discriminated union. There is deliberately no
 * boolean `passed` field: every consumer switches on `kind` and ends with an
 * `assertNever` default, so adding a kind without handling it fails `tsc`.
 *
 * `inconclusive` is never a pass. It is counted separately and makes a run
 * non-green.
 */
export type JevVerdict =
  | { kind: "pass" }
  | { kind: "fail"; reason: string }
  | { kind: "inconclusive"; reason: string };

export type JevVerdictKind = JevVerdict["kind"];

export function assertNever(value: never, context = "JevVerdict"): never {
  throw new Error(`Unhandled ${context}: ${JSON.stringify(value)}`);
}

export interface JevRunCounts {
  pass: number;
  fail: number;
  inconclusive: number;
}

export function emptyCounts(): JevRunCounts {
  return { pass: 0, fail: 0, inconclusive: 0 };
}

/** Tally verdicts into three separate counts. */
export function countVerdicts(verdicts: readonly JevVerdict[]): JevRunCounts {
  const counts = emptyCounts();
  for (const v of verdicts) {
    switch (v.kind) {
      case "pass":
        counts.pass += 1;
        break;
      case "fail":
        counts.fail += 1;
        break;
      case "inconclusive":
        counts.inconclusive += 1;
        break;
      default:
        assertNever(v);
    }
  }
  return counts;
}

/** Green only when every case passed: any fail OR inconclusive is non-zero. */
export function exitCodeFor(counts: JevRunCounts): 0 | 1 {
  return counts.fail === 0 && counts.inconclusive === 0 ? 0 : 1;
}

export function describeVerdict(v: JevVerdict): string {
  switch (v.kind) {
    case "pass":
      return "PASS";
    case "fail":
      return `FAIL (${v.reason})`;
    case "inconclusive":
      return `INCONCLUSIVE (${v.reason})`;
    default:
      return assertNever(v);
  }
}

/**
 * Legacy `GraderReport` verdict for the shared LLM harnesses, which only know
 * pass | fail | warn (and treat `warn` as non-failing). Inconclusive maps to
 * `fail` there so it can never be read as green; the three-way split lives in
 * the `eval:jev` run summary.
 */
export function toLegacyVerdict(v: JevVerdict): "pass" | "fail" {
  switch (v.kind) {
    case "pass":
      return "pass";
    case "fail":
      return "fail";
    case "inconclusive":
      return "fail";
    default:
      return assertNever(v);
  }
}
