/**
 * Thin re-export shim. Canonical implementation lives at
 * `plugins/zoto-eval-system/engine/sandbox.ts`. Kept here so legacy
 * import paths in templates and selftests resolve without the Vitest
 * alias (which is unavailable in plain `tsx` invocations).
 */
export * from "../../plugins/zoto-eval-system/engine/sandbox.js";
