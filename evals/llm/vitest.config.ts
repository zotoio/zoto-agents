// _meta.generated: true
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
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
