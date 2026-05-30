/**
 * Minimal static-backend file so `vitest run --config evals/vitest.config.ts`
 * always discovers at least one test. Per-primitive LLM evals live under
 * `evals/llm/` (excluded from the static vitest include set).
 */
import { describe, expect, it } from "vitest";

describe("static eval harness", () => {
  it("keeps vitest reporter wiring alive for orchestrated static runs", () => {
    expect(true).toBe(true);
  });
});
