import { describe, expect, it } from "vitest";

import {
  STATE_CLASSES,
  applyDependencyGraphColors,
  extractGraphNodeIds,
  statesFromSubtaskRows,
  subtaskIdFromLabel,
  type SubtaskState,
} from "./dependency-graph-colors.js";

describe("subtaskIdFromLabel", () => {
  it.each([
    ["01: Token-Budget Audit", "01"],
    ["subtask-01", "01"],
    ["subtask_03", "03"],
    ["03 Implement loader", "03"],
    ["1: short", "01"],
    ["09 Docs", "09"],
    ["bare label", null],
  ])("parses %s -> %s", (input, expected) => {
    expect(subtaskIdFromLabel(input as string)).toBe(expected);
  });
});

describe("extractGraphNodeIds", () => {
  it("handles the live-spec convention `S<NN>[NN: label]`", () => {
    const body = `
graph TD
    S01[01: Token-Budget Audit] --> S03[03: Config + Loader]
    S02[02: Status Schemas] --> S03
`;
    expect(extractGraphNodeIds(body)).toEqual([
      { nodeId: "S01", subtaskId: "01" },
      { nodeId: "S03", subtaskId: "03" },
      { nodeId: "S02", subtaskId: "02" },
    ]);
  });

  it("handles the generator-template convention `A[subtask-NN]`", () => {
    const body = `
graph TD
    A[subtask-01] --> C[subtask-03]
    B[subtask-02] --> C
`;
    expect(extractGraphNodeIds(body)).toEqual([
      { nodeId: "A", subtaskId: "01" },
      { nodeId: "C", subtaskId: "03" },
      { nodeId: "B", subtaskId: "02" },
    ]);
  });

  it("dedupes repeated node declarations (first occurrence wins)", () => {
    const body = `
graph TD
    S01[01: First] --> S02[02: Second]
    S01[01: First] --> S03[03: Third]
`;
    const ids = extractGraphNodeIds(body);
    expect(ids.filter((i) => i.nodeId === "S01")).toHaveLength(1);
  });

  it("ignores label-less mermaid identifiers", () => {
    const body = `graph TD\n    A --> B[01: X]\n`;
    expect(extractGraphNodeIds(body)).toEqual([
      { nodeId: "B", subtaskId: "01" },
    ]);
  });
});

describe("applyDependencyGraphColors", () => {
  const indexWithLiveSpecGraph = (): string => `# Spec: Test

## Subtask Manifest

| ID | File | Subagent |
|----|------|----------|
| 01 | sub-01.md | gen |

## Subtask Dependency Graph

\`\`\`mermaid
graph TD
    S01[01: Audit] --> S03[03: Loader]
    S02[02: Schemas] --> S03
\`\`\`

## Definition of Done
- [ ] All subtasks completed
`;

  it("adds a managed classDef + class block colouring completed nodes green", () => {
    const states = new Map<string, SubtaskState>([
      ["01", "completed"],
      ["02", "in_progress"],
      ["03", "pending"],
    ]);
    const out = applyDependencyGraphColors(indexWithLiveSpecGraph(), states);

    expect(out).toContain("%% spec-system:classes:begin");
    expect(out).toContain("%% spec-system:classes:end");
    expect(out).toContain(`classDef ${STATE_CLASSES.completed.className} fill:${STATE_CLASSES.completed.fill}`);
    expect(out).toContain(`class S01 ${STATE_CLASSES.completed.className}`);
    expect(out).toContain(`class S02 ${STATE_CLASSES.in_progress.className}`);
    expect(out).toContain(`class S03 ${STATE_CLASSES.pending.className}`);
  });

  it("never modifies content outside the mermaid fence", () => {
    const src = indexWithLiveSpecGraph();
    const states = new Map<string, SubtaskState>([["01", "completed"]]);
    const out = applyDependencyGraphColors(src, states);

    // Header, manifest table, DoD remain untouched.
    expect(out).toContain("# Spec: Test");
    expect(out).toContain("| 01 | sub-01.md | gen |");
    expect(out).toContain("- [ ] All subtasks completed");
    // The mermaid topology lines themselves are unchanged.
    expect(out).toContain("S01[01: Audit] --> S03[03: Loader]");
    expect(out).toContain("S02[02: Schemas] --> S03");
  });

  it("is idempotent — re-running with the same states yields identical output", () => {
    const states = new Map<string, SubtaskState>([
      ["01", "completed"],
      ["02", "completed"],
      ["03", "in_progress"],
    ]);
    const once = applyDependencyGraphColors(indexWithLiveSpecGraph(), states);
    const twice = applyDependencyGraphColors(once, states);
    expect(twice).toBe(once);
  });

  it("re-renders cleanly when state transitions (no growing block, no stale lines)", () => {
    const initial = new Map<string, SubtaskState>([["01", "in_progress"]]);
    const after = new Map<string, SubtaskState>([["01", "completed"]]);
    const step1 = applyDependencyGraphColors(indexWithLiveSpecGraph(), initial);
    const step2 = applyDependencyGraphColors(step1, after);

    expect(step2).toContain(`class S01 ${STATE_CLASSES.completed.className}`);
    expect(step2).not.toContain(`class S01 ${STATE_CLASSES.in_progress.className}`);

    const begins = step2.split("%% spec-system:classes:begin").length - 1;
    const ends = step2.split("%% spec-system:classes:end").length - 1;
    expect(begins).toBe(1);
    expect(ends).toBe(1);
  });

  it("is a no-op when the index has no mermaid fence", () => {
    const src = "# Spec: empty\n\nNo graph here.\n";
    const states = new Map<string, SubtaskState>([["01", "completed"]]);
    expect(applyDependencyGraphColors(src, states)).toBe(src);
  });

  it("is a no-op when no subtask in `states` matches a graph node", () => {
    const src = indexWithLiveSpecGraph();
    const states = new Map<string, SubtaskState>([["99", "completed"]]);
    const out = applyDependencyGraphColors(src, states);
    expect(out).not.toContain("%% spec-system:classes:begin");
  });

  it("handles the generator-template convention end-to-end", () => {
    const src = `## Subtask Dependency Graph

\`\`\`mermaid
graph TD
    A[subtask-01] --> C[subtask-03]
    B[subtask-02] --> C
\`\`\`
`;
    const states = new Map<string, SubtaskState>([
      ["01", "completed"],
      ["02", "completed"],
      ["03", "blocked"],
    ]);
    const out = applyDependencyGraphColors(src, states);
    expect(out).toContain(`class A,B ${STATE_CLASSES.completed.className}`);
    expect(out).toContain(`class C ${STATE_CLASSES.blocked.className}`);
  });

  it("strips a previously-managed block written by an earlier render before injecting", () => {
    const stale = `## Subtask Dependency Graph

\`\`\`mermaid
graph TD
    S01[01: A] --> S02[02: B]

    %% spec-system:classes:begin
    classDef ${STATE_CLASSES.in_progress.className} fill:${STATE_CLASSES.in_progress.fill},stroke:${STATE_CLASSES.in_progress.stroke},color:${STATE_CLASSES.in_progress.color}
    class S01 ${STATE_CLASSES.in_progress.className}
    %% spec-system:classes:end
\`\`\`
`;
    const states = new Map<string, SubtaskState>([
      ["01", "completed"],
      ["02", "completed"],
    ]);
    const out = applyDependencyGraphColors(stale, states);

    // Stale class assignment must be gone.
    expect(out).not.toContain(`class S01 ${STATE_CLASSES.in_progress.className}`);
    // Fresh class assignment is present.
    expect(out).toContain(`class S01,S02 ${STATE_CLASSES.completed.className}`);
    // Exactly one managed block.
    expect(out.split("%% spec-system:classes:begin")).toHaveLength(2);
  });

  it("statesFromSubtaskRows builds a usable map", () => {
    const rows: Array<{ subtask_id: string; state: SubtaskState }> = [
      { subtask_id: "01", state: "completed" },
      { subtask_id: "02", state: "in_progress" },
    ];
    const map = statesFromSubtaskRows(rows);
    expect(map.get("01")).toBe("completed");
    expect(map.get("02")).toBe("in_progress");
    expect(map.has("03")).toBe(false);
  });
});
