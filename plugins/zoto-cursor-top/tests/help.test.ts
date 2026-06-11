import { describe, expect, it } from "vitest";
import { diagnosticExplanation } from "../src/ui/help.js";

describe("diagnosticExplanation", () => {
  it("explains prune diagnostics emitted by the collector", () => {
    const cursorOnly = diagnosticExplanation(
      "--cursor-only: pruned 8 non-Cursor root subtrees.",
    );
    expect(cursorOnly?.match).toBe("--cursor-only:");

    const withLogs = diagnosticExplanation(
      "--with-logs: pruned 44 nodes with no readable agent output.",
    );
    expect(withLogs?.match).toBe("--with-logs:");

    const activeOnly = diagnosticExplanation(
      "--active-only: pruned 36 done agents (pass --no-active-only to include finished sessions).",
    );
    expect(activeOnly?.match).toBe("--active-only:");
  });
});
