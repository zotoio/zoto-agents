// _meta.generated: true
/**
 * `tool-called` grader for the `code`-strategy LLM evals.
 *
 * Standalone copy of `evals/_llm/graders/tool-called.ts`.
 *
 * NOTE: The `code` strategy does not currently expose a reliable
 * per-run tool-call stream from `@cursor/sdk` 1.0.12 (tool calls are
 * only visible through `run.stream()` and `TokenDeltaUpdate`
 * friends — none of those are captured by the `run.wait()` fast path).
 * Call sites pass an empty array by default; extend this grader when
 * the bridge starts surfacing tool calls.
 */
import type { GraderReport } from "./common.js";

export interface ToolCalledGraderConfig {
  type: "tool-called";
  tool: string;
  minCount?: number;
  maxCount?: number;
}

export function toolCalled(
  config: ToolCalledGraderConfig,
  toolCalls: Array<{ tool: string; ok: boolean }>,
): GraderReport {
  const count = toolCalls.filter((c) => c.tool === config.tool).length;
  const min = config.minCount ?? 1;
  const max = config.maxCount ?? Infinity;
  const ok = count >= min && count <= max;
  return {
    grader: "tool-called",
    verdict: ok ? "pass" : "fail",
    detail: `tool "${config.tool}" called ${count} time(s) (expected ${min}..${max === Infinity ? "\u221E" : max})`,
  };
}
