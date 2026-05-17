/**
 * Eval engine — canonical runtime for LLM eval backends.
 *
 * This directory is the single source of truth for the eval engine's core
 * modules. Host repos consume them through re-export shims at
 * `evals/_llm/` (see backward-compat shims there).
 *
 * Modules:
 *   sdk-bridge        — @cursor/sdk wrapper (retry, token heuristic)
 *   sandbox           — per-case sandbox, baseline copy, fixtures, diffs
 *   case              — typed case loader, validateEnriched
 *   writer            — schema-valid llm.yml + per-case log files
 *   metrics           — soft metrics (tokens, duration, verbosity, ...)
 *   compare           — cross-run flat dataset + /canvas hand-off
 *   runner            — declarative LLM harness
 *   update            — diff-aware updater
 *   manifest-snapshot — manifest.yml reader
 *   _user-case-guards — isGeneratedFile / isGeneratedCase
 *   analyser-payload  — shared TypeScript types for analyser JSON
 *   graders/*         — contains, regex, tool-called, llm-judge
 */
export * from "./sdk-bridge.js";
export * from "./sandbox.js";
export * from "./case.js";
export * from "./writer.js";
export * from "./metrics.js";
export * from "./_user-case-guards.js";
export * from "./analyser-payload.js";
export * from "./manifest-snapshot.js";
export type { GraderReport } from "./graders/common.js";
