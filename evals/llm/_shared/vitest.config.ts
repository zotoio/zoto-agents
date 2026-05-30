import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));
const evalEngineRoot = resolve(__dirname, "../../../plugins/zoto-eval-system/engine");

/** Unit tests for `_shared/` helpers (excluded from `evals/llm/vitest.config.ts`). */
export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "#eval-engine": evalEngineRoot,
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/__fixtures__/**"],
    testTimeout: 30_000,
    pool: "forks",
    reporters: ["default"],
  },
});
