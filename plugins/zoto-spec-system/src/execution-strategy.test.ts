import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkSpecExecutionStrategy,
  criteriaRefsFromMarkdown,
  extractExecutionBlock,
  lintExecutionStrategy,
  normalizeExecutionStrategy,
  parseExecutionStrategy,
  refExists,
} from "./execution-strategy.js";

const INDEX = (block = "") => `# Spec: Vector Calculator

## Status
Draft

## Requirements
1. Add, subtract, dot and cross product
2. Normalize never returns NaN

## Subtask Manifest

| ID | File | Subagent | Dependencies | Phase | Status |
|----|------|----------|-------------|-------|--------|
| 01 | \`subtask-01-vc-math-20261115.md\` | generalPurpose | — | 1 | Pending |
| 02 | \`subtask-02-vc-tests-20261115.md\` | generalPurpose | 01 | 2 | Pending |
${block}
## Definition of Done
- [ ] All subtasks completed
- [ ] npm test passes
`;

const SUB1 = `# Subtask: Math

## Deliverables Checklist
- [ ] public/lib/vector.js
- [ ] add, subtract, dot, cross

## Definition of Done
- [ ] Zero vector normalizes to [0,0,0]
`;
const SUB2 = `# Subtask: Tests

## Deliverables Checklist
- [ ] test/vector.test.mjs
- [ ] README.md

## Definition of Done
- [ ] node --test passes
`;
const SUBS = { "subtask-01-vc-math-20261115.md": SUB1, "subtask-02-vc-tests-20261115.md": SUB2 };

const LOOP = `
## Execution Strategy

\`\`\`yaml
execution_strategy: loop
loop:
  max_loops: 6
  max_duration_minutes: 30
  max_cost_usd: 1.5
  swarm_size: 2
  checks:
    - id: C01
      covers: [R01, R02, DoD01, DoD02, "01"]
      kind: test
      run: node --test test/vector.test.mjs
    - id: C02
      covers: ["02"]
      kind: jev
      question: Do the tests and README cover every vector function?
evals: jev
\`\`\`
`;

const refs = criteriaRefsFromMarkdown(INDEX(), SUBS);

describe("execution strategy parsing", () => {
  it("treats a spec without the block as phased", () => {
    const r = parseExecutionStrategy(INDEX());
    expect(r.declared).toBe(false);
    expect(r.strategy).toEqual({ execution_strategy: "phased" });
    expect(r.errors).toEqual([]);
  });

  it("extracts only the fence under the Execution Strategy heading", () => {
    expect(extractExecutionBlock(INDEX(LOOP))).toContain("execution_strategy: loop");
    expect(extractExecutionBlock("## Other\n```yaml\na: 1\n```\n")).toBeUndefined();
  });

  it("applies defaults and the evals shorthand", () => {
    const r = parseExecutionStrategy(INDEX(LOOP));
    expect(r.errors).toEqual([]);
    expect(r.strategy.execution_strategy).toBe("loop");
    expect(r.strategy.loop).toMatchObject({ max_loops: 6, swarm_size: 2, batch_size: 3, max_stalled_loops: 2 });
    expect(r.strategy.loop?.checks[1].threshold).toBeUndefined();
    expect(r.strategy.evals).toEqual({ provider: "jev", guard_inputs: true, score_checks: true, threshold: 0.85 });
  });

  it("reports schema errors for missing kind-specific fields and unknown keys", () => {
    const { errors } = normalizeExecutionStrategy({
      execution_strategy: "loop",
      loop: { max_loops: 2, max_duration_minutes: 5, max_tokens: 50000, checks: [{ id: "C01", covers: ["R01"], kind: "test" }], retries: 3 },
    });
    const text = errors.map((e) => e.finding).join("\n");
    expect(text).toMatch(/run/);
    expect(text).toMatch(/retries/);
  });

  it("rejects an empty strategy heading and non-mapping block", () => {
    expect(parseExecutionStrategy(INDEX("## Execution Strategy\nmissing fence")).errors).toHaveLength(1);
    expect(parseExecutionStrategy(INDEX("## Execution Strategy\n```yaml\nnull\n```")).errors).toHaveLength(1);
  });

  it("reports YAML that does not parse", () => {
    const r = parseExecutionStrategy(INDEX("\n## Execution Strategy\n\n```yaml\nloop: [\n```\n"));
    expect(r.declared).toBe(true);
    expect(r.errors[0].rule).toBe("ES000");
  });
});

describe("criteria refs", () => {
  it("counts requirements, spec DoD and subtask checklists", () => {
    expect(refs).toEqual({ requirements: 2, definitionOfDone: 2, subtasks: { "01": { deliverables: 2, definitionOfDone: 1 }, "02": { deliverables: 2, definitionOfDone: 1 } } });
  });

  it("resolves every ref form", () => {
    for (const ok of ["R01", "R02", "DoD02", "01", "02.D02", "01.DoD01"]) expect(refExists(ok, refs)).toBe(true);
    for (const bad of ["R03", "DoD03", "03", "01.D03", "02.DoD02", "R1"]) expect(refExists(bad, refs)).toBe(false);
  });
});

describe("execution strategy lint", () => {
  const codes = (s: unknown, opts = {}) => lintExecutionStrategy(normalizeExecutionStrategy(s).strategy, refs, opts).map((f) => `${f.rule}:${f.severity}`);

  it("accepts a fully covered loop", () => {
    expect(lintExecutionStrategy(parseExecutionStrategy(INDEX(LOOP)).strategy, refs, { parallelLimit: 4 })).toEqual([]);
  });

  it("requires limits, a spend limit and checks", () => {
    expect(codes({ execution_strategy: "loop" })).toEqual(["ES001:HIGH"]);
    expect(codes({ execution_strategy: "loop", loop: { max_loops: 3, max_duration_minutes: 10, checks: [] } })).toEqual(
      expect.arrayContaining(["ES002:HIGH", "ES003:HIGH", "ES005:HIGH"]),
    );
  });

  it("flags unknown criteria, uncovered requirements and uncovered subtask DoD", () => {
    const found = codes({ execution_strategy: "loop", loop: { max_loops: 3, max_duration_minutes: 10, max_tokens: 100000, checks: [{ id: "C01", covers: ["R01", "R09"], kind: "review" }] } });
    expect(found).toEqual(expect.arrayContaining(["ES004:HIGH", "ES005:HIGH", "ES006:MEDIUM"]));
  });

  it("needs the provider a check kind uses", () => {
    const found = codes({
      execution_strategy: "loop",
      loop: { max_loops: 3, max_duration_minutes: 10, max_tokens: 100000, checks: [
        { id: "C01", covers: ["R01", "R02", "01", "02"], kind: "jev", question: "Met?" },
        { id: "C02", covers: ["R01"], kind: "agent_eval", eval: "criterion" },
      ] },
    });
    expect(found.filter((f) => f.startsWith("ES007"))).toHaveLength(2);
  });

  it("requires spec DoD coverage and a repo-relative SDK path", () => {
    expect(codes({ execution_strategy: "loop", loop: { max_loops: 1, max_duration_minutes: 1, max_tokens: 10, checks: [{ id: "C01", covers: ["R01", "R02", "01", "02"], kind: "review", description: "Check all criteria" }] }, agent_sdk: { project: "../outside", version: "0.6.0" } })).toEqual(expect.arrayContaining(["ES012:MEDIUM", "ES013:HIGH"]));
  });

  it("flags duplicate ids, oversized swarms, ignored loop settings and unpinned SDK", () => {
    const loop = { max_loops: 3, max_duration_minutes: 10, max_tokens: 100000, swarm_size: 8, checks: [
      { id: "C01", covers: ["R01", "R02", "01", "02"], kind: "review" },
      { id: "C01", covers: ["R01"], kind: "review" },
    ] };
    expect(codes({ execution_strategy: "loop", loop }, { parallelLimit: 4 })).toEqual(expect.arrayContaining(["ES009:HIGH", "ES008:MEDIUM"]));
    expect(codes({ execution_strategy: "phased", loop, agent_sdk: { project: "agents/checker" } })).toEqual(["ES010:LOW", "ES011:LOW"]);
  });
});

describe("checkSpecExecutionStrategy", () => {
  let dir: string | undefined;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  it("reads a spec directory from disk", () => {
    dir = mkdtempSync(join(tmpdir(), "spec-strategy-"));
    writeFileSync(join(dir, "spec-vc-20261115.md"), INDEX(LOOP));
    for (const [name, body] of Object.entries(SUBS)) writeFileSync(join(dir, name), body);
    const r = checkSpecExecutionStrategy(dir, { parallelLimit: 4 });
    expect(r.declared).toBe(true);
    expect(r.findings).toEqual([]);
    expect(r.strategy.execution_strategy).toBe("loop");
  });
});
