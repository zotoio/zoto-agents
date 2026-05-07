// _meta.generated: true
/**
 * `contains` grader for the `code`-strategy LLM evals.
 *
 * Standalone copy of `evals/_llm/graders/contains.ts` stamped into
 * `evals/llm/_shared/graders/contains.ts`. Behaviour is identical; the
 * copy exists so the `code` strategy does not depend on the
 * declarative-runtime module graph.
 */
import type { GraderReport } from "./common.js";

export interface ContainsGraderConfig {
  type: "contains";
  needle: string;
  caseInsensitive?: boolean;
}

export function contains(config: ContainsGraderConfig, response: string): GraderReport {
  const hay = config.caseInsensitive ? response.toLowerCase() : response;
  const needle = config.caseInsensitive ? config.needle.toLowerCase() : config.needle;
  const ok = hay.includes(needle);
  return {
    grader: "contains",
    verdict: ok ? "pass" : "fail",
    detail: ok
      ? `response contains "${config.needle}"`
      : `response does not contain "${config.needle}"`,
  };
}
