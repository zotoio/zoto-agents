import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 60_000,
    hookTimeout: 30_000,
    // `*.test.ts` files are the standard vitest suites. The three entries
    // below are wrapper-less vitest suites that use non-standard suffixes
    // (`*.selftest.ts` / `*.smoke.ts`) and must be listed explicitly. Do NOT
    // broaden these to `tests/**/*.selftest.ts`: the spawn-pair runners
    // (eval-orchestrate / eval-cleanup-stale / eval-update-guards `.selftest.ts`)
    // call `process.exit` at module load and would crash the vitest worker —
    // they are executed via `tsx` by their `.test.ts` wrappers instead.
    include: [
      "src/**/*.test.ts",
      "tests/**/*.test.ts",
      "tests/eval-stamp-jest.selftest.ts",
      "tests/vitest-backend.selftest.ts",
      "tests/eval-stamp-pytest.smoke.ts",
    ],
  },
});
