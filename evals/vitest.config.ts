// _meta.generated: true
/**
 * Unified Vitest configuration for the zoto-eval-system eval suite.
 *
 * One config discovers and runs every eval category in a single Vitest
 * invocation:
 *
 *   • Static smoke tests at `<repo>/evals/*.test.ts` (static reporter →
 *     `evals/_runs/<ts>/static.yml`).
 *   • Non-skill JSON evals (the recursive `evals/*.json` glob, any
 *     directory depth), synthesised at runtime by `evalJsonLoader`
 *     (LLM harness → `llm.yml` via `reportCase`).
 *   • Multi-primitive scenario suites at `evals/scenarios/*.test.ts`
 *     (LLM harness, static reporter excluded).
 *   • Legacy co-located LLM `.test.ts` files at `<kind>/evals/*.test.ts`
 *     until subtask 07 migrates them to JSON.
 *
 * Reporters partition by module id (`path-classifiers.ts`) so LLM cases
 * never land in `static.yml` and static smoke never pollutes `llm.yml`.
 *
 * Orchestrator entry points: `pnpm run eval:vitest` (preferred) or the
 * backwards-compatible alias `pnpm run eval:static:vitest`. Both invoke
 * this file. `scripts/eval-orchestrate.ts` spawns exactly one Vitest run
 * when `static.framework === "vitest"`; pytest/jest hosts still call
 * Vitest separately for the LLM/JSON path.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { evalJsonLoader } from "./llm/_shared/vitest-json-loader.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const EVAL_ENGINE_ROOT = resolve(REPO_ROOT, "plugins/zoto-eval-system/engine");

export default defineConfig({
  root: REPO_ROOT,
  plugins: [evalJsonLoader()],
  resolve: {
    alias: {
      "#eval-engine": EVAL_ENGINE_ROOT,
    },
  },
  test: {
    globals: false,
    include: [
      "**/evals/*.test.ts",
      "**/evals/*.json",
      "evals/scenarios/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/skills/*/evals/evals.json",
      "**/fixtures/**",
      "**/__fixtures__/**",
      "**/_runs/**",
      "**/.zoto/**",
      "**/cache/**",
      "evals/llm/_shared/**",
      "evals/scenarios/_*",
      "**/_llm/**",
    ],
    setupFiles: ["./evals/setup.ts", "./evals/llm/_shared/setup.ts"],
    reporters: [
      "default",
      ["./evals/reporters/zoto-eval-reporter.ts", {}],
      ["./evals/llm/_shared/zoto-llm-reporter.ts", {}],
    ],
    testTimeout: 300_000,
    hookTimeout: 300_000,
    pool: "forks",
  },
});
