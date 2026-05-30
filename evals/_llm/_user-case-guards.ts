/**
 * Thin re-export so `evals/_llm/case.ts` can import `./_user-case-guards.js`
 * alongside sandbox and other `_llm` modules. Canonical implementation lives in
 * `plugins/zoto-eval-system/engine/_user-case-guards.ts` (subtask 09).
 */
export * from "../../plugins/zoto-eval-system/engine/_user-case-guards.js";
