// _meta.generated: true
/**
 * `llm-judge` grader for the `code`-strategy LLM evals.
 *
 * Standalone copy of `evals/_llm/graders/llm-judge.ts`. Callers supply
 * a `judge` function that routes a rubric prompt through a Cursor
 * agent (typically via `createAgent → sendPrompt → awaitRun` from the
 * sdk-bridge) and returns `{ score, detail }`. The default judge model
 * is read from `config.json#/judgeModel` at stamp time; the stamped
 * test file passes it through `process.env.ZOTO_EVAL_JUDGE_MODEL`.
 */
import type { GraderReport } from "./common.js";

export interface LlmJudgeGraderConfig {
  type: "llm-judge";
  rubric: string;
  passThreshold?: number;
  judgeModel?: string;
}

export interface LlmJudgeContext {
  judge: (args: { prompt: string; model?: string }) => Promise<{
    score: number;
    detail: string;
  }>;
}

export async function llmJudge(
  config: LlmJudgeGraderConfig,
  response: string,
  ctx: LlmJudgeContext,
): Promise<GraderReport> {
  const threshold = config.passThreshold ?? 0.6;
  const prompt = [
    "You are an adversarial judge. Score how well the response satisfies the rubric.",
    'Return only a JSON object like {"score": <0..1>, "detail": "<reason>"}.',
    "",
    "RUBRIC:",
    config.rubric,
    "",
    "RESPONSE:",
    response,
  ].join("\n");

  try {
    const out = await ctx.judge({ prompt, model: config.judgeModel });
    const ok = out.score >= threshold;
    return {
      grader: "llm-judge",
      verdict: ok ? "pass" : "fail",
      detail: `score=${out.score.toFixed(2)} threshold=${threshold} - ${out.detail}`,
    };
  } catch (err) {
    return {
      grader: "llm-judge",
      verdict: "warn",
      detail: `judge unavailable: ${(err as Error).message}`,
    };
  }
}
