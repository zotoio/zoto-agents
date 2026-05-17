/**
 * Declarative `EvalCase` surface — grader wiring, `validateEnriched`, and helpers.
 *
 * `validateEnriched` mirrors the runtime grader contract: every **object** in
 * `graders[]` must match a shape dispatched by `#eval-engine/graders/*.js`
 * (`contains`, `regex`, `tool-called`, `llm-judge`). Bare strings are legacy
 * tags and are skipped during validation — they are not graders and must not be
 * confused with shorthand `{"type":"…"}` objects.
 *
 * The stamped LLM **code-strategy** tests drive the same discriminant/`type`
 * mapping through `evals/llm/_shared/run-code-strategy-suite.ts` (see
 * `DeclarativeGraderConfig` on the canonical engine module). Runtime execution
 * of each grader kind still lives under `plugins/zoto-eval-system/engine/graders/`.
 *
 * Implementation lives in `plugins/zoto-eval-system/engine/case.ts` (`#eval-engine/case.js`
 * in Vitest configs that define the `#eval-engine` alias). This file is a **thin re-export**
 * with a repo-relative specifier so `tsx evals/_llm/*.ts` resolves without Vitest aliases.
 * Paths documented as `evals/_llm/case.ts` stay stable while CLI and packaging share one
 * definition (no duplicate `validateGradersList` drift).
 */
export * from "../../plugins/zoto-eval-system/engine/case.js";
