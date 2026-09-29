/**
 * Declarative grader dispatch — the single exhaustive consumer of the grader
 * kind union, shared by `engine/runner.ts` and the unified LLM harness
 * (`evals/llm/_shared/run-llm-suite.ts`).
 *
 * Extracted from those files so it can sit inside the `tsconfig.jev.json` gate:
 * both host files pull in pre-existing type errors when type-checked whole.
 * Adding a grader kind without handling it here is a TS2345 at the
 * `assertNeverGrader` default below.
 */
import type { DeclarativeGraderConfig, DeclarativeGraderKind } from "../case.js";
import type { GraderReport } from "./common.js";
import { contains } from "./contains.js";
import { gradeWithJev, jevToGraderReport, type JevGraderContext } from "./jev.js";
import { llmJudge, type LlmJudgeContext } from "./llm-judge.js";
import { regex } from "./regex.js";
import { toolCalled } from "./tool-called.js";

export const GRADER_KINDS: readonly DeclarativeGraderKind[] = ["contains", "regex", "tool-called", "llm-judge", "jev"];

export function isGraderKind(t: unknown): t is DeclarativeGraderKind {
  return typeof t === "string" && (GRADER_KINDS as readonly string[]).includes(t);
}

export interface GraderDispatchDeps {
  toolCalls: Array<{ tool: string; ok: boolean }>;
  judge: LlmJudgeContext["judge"];
  /** Lazily provides the Jev context (lock verified once, on first use). */
  jevContext: () => JevGraderContext;
}

function assertNeverGrader(g: never): never {
  throw new Error(`unhandled grader kind: ${JSON.stringify(g)}`);
}

export async function dispatchGrader(
  g: DeclarativeGraderConfig,
  response: string,
  deps: GraderDispatchDeps,
): Promise<GraderReport> {
  switch (g.type) {
    case "contains":
      return contains(g, response);
    case "regex":
      return regex(g, response);
    case "tool-called":
      return toolCalled(g, deps.toolCalls);
    case "llm-judge":
      return llmJudge(g, response, { judge: deps.judge });
    case "jev":
      /* Jev proposes, grader code decides; inconclusive maps to a non-pass report. */
      return jevToGraderReport(await gradeWithJev(g, response, deps.jevContext()));
    default:
      return assertNeverGrader(g);
  }
}

/**
 * Run every object grader in order. Bare-string legacy tags and unknown kinds
 * are skipped, exactly as the previous inline if/else chains did.
 */
export async function dispatchGraders(
  graders: ReadonlyArray<unknown> | undefined,
  response: string,
  deps: GraderDispatchDeps,
): Promise<GraderReport[]> {
  const reports: GraderReport[] = [];
  for (const g of graders ?? []) {
    if (g === null || typeof g !== "object" || !isGraderKind((g as { type?: unknown }).type)) continue;
    reports.push(await dispatchGrader(g as DeclarativeGraderConfig, response, deps));
  }
  return reports;
}
