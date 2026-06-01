// _meta.generated: true
// Unified Vitest config: LLM JSON evals for commands/agents/hooks (skill evals.json → pytest).
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { evalEngineRoot, repoRoot } from "./_zoto/plugin-root.js";
import { evalJsonLoader } from "./llm/_shared/vitest-json-loader.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: repoRoot,
  plugins: [evalJsonLoader()],
  resolve: {
    alias: {
      "#eval-engine": evalEngineRoot,
    },
  },
  test: {
    globals: false,
    include: [
      ".cursor/commands/evals/*.json",
      ".cursor/agents/evals/*.json",
      ".cursor/hooks/evals/*.json",
      "plugins/*/commands/evals/*.json",
      "plugins/*/agents/evals/*.json",
      "plugins/*/hooks/evals/*.json",
      "evals/smoke-static-eval.test.ts",
      "evals/scenarios/*.test.ts",
    ],
    exclude: [
      "**/node_modules/**",
      "**/fixtures/**",
      "**/__fixtures__/**",
      "**/_runs/**",
      "**/.zoto/**",
      "**/cache/**",
      "**/skills/**/evals/evals.json",
      "**/evals/llm/_shared/**",
      "**/evals/scenarios/_*",
      "**/_llm/**",
    ],
    setupFiles: [resolve(__dirname, "setup.ts"), resolve(__dirname, "llm/_shared/setup.ts")],
    reporters: [
      "default",
      [resolve(__dirname, "reporters/zoto-eval-reporter.ts"), {}],
      [resolve(__dirname, "llm/_shared/zoto-llm-reporter.ts"), {}],
    ],
    testTimeout: 300_000,
    hookTimeout: 300_000,
    pool: "forks",
  },
});
