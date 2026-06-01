import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    /** CLI subprocess tests (tsx spawn); default 5s flakes under parallel load. */
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
