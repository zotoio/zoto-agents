// _meta.generated: true
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Maps `#eval-engine/*` to the zoto-eval-system engine package (sdk-bridge, graders, case). */
const evalEngineRoot = resolve(__dirname, "../../plugins/zoto-eval-system/engine");

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "#eval-engine": evalEngineRoot,
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/_shared/**"],
    setupFiles: ["./_shared/setup.ts"],
    testTimeout: 300_000,
    hookTimeout: 60_000,
    pool: "forks",
    reporters: ["default"],
    passWithNoTests: false,
  },
});
