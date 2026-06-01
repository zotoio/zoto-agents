/**
 * Dogfood re-exports for eval selftests. Lives outside `evals/_llm/` so
 * subtask-08 grep gates stay clean while tsx scripts resolve plugin CLIs.
 */
export {
  ANALYSER_VERSION,
  computeAnalyserCacheKey,
  newAnalyserBudget,
  normaliseContent,
  runAnalyser,
  type AnalyserPayload,
  type AnalyserSdk,
} from "../plugins/zoto-eval-system/scripts/eval-analyse.ts";

export { stampBaselineFixtures } from "../plugins/zoto-eval-system/scripts/eval-stamp.ts";
