import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import YAML from "yaml";

import {
  aggregateOnce,
  parseDefinitionOfDoneFromIndex,
  watch,
  type SpecRootDoc,
} from "./aggregator.js";
import type { SpecSystemConfig } from "./config-loader.js";

const baseCfg = (): SpecSystemConfig =>
  ({
    unitOfWork: "spec",
    specsDir: "specs",
    workDir: "specs/current",
    spec: { maxSubtasks: 99, parallelLimit: 4, adversarialVerification: true },
    subagents: { default: { tokenBudget: 200000 } },
    aggregator: {
      enabled: true,
      pollIntervalMs: 1500,
      debounceMs: 250,
      outputs: { specStatusMd: "status.md", specStatusYml: "status.yml" },
    },
  }) as SpecSystemConfig;

const tmpDirs: string[] = [];

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  vi.restoreAllMocks();
});

function tempDir(): string {
  const d = mkdtempSync(join(tmpdir(), "zoto-agg-"));
  tmpDirs.push(d);
  return d;
}

function minimalSubtask(
  id: string,
  state: SpecRootDoc["subtasks"][0]["state"],
  lastHeartbeat: string,
): string {
  return YAML.stringify(
    {
      schema_version: 1,
      subtask_id: id,
      feature: "t",
      assigned_agent: "a",
      model: "m",
      token_budget: 1,
      state,
      checklist: [],
      artifacts: [],
      errors: [],
      notes: "",
      extra: {},
      last_heartbeat: lastHeartbeat,
    },
    { lineWidth: 0 },
  );
}

describe("parseDefinitionOfDoneFromIndex", () => {
  it("parses Definition of Done checkboxes in order", () => {
    const md = `
## Definition of Done
- [ ] first item
- [x] second item
- [ ] third

## Other
`;
    const r = parseDefinitionOfDoneFromIndex(md);
    expect(r).toEqual([
      { text: "first item", done: false },
      { text: "second item", done: true },
      { text: "third", done: false },
    ]);
  });
});

describe("aggregateOnce", () => {
  it("rebuilds the spec-root pair on first call", () => {
    const repo = tempDir();
    const specDir = join(repo, "20260101-x");
    mkdirSync(join(specDir, "status"), { recursive: true });
    writeFileSync(join(specDir, "status", "subtask-01-demo.status.yml"), minimalSubtask("01", "completed", "2026-05-06T10:00:00.000Z"), "utf-8");
    writeFileSync(
      join(specDir, "spec-demo.md"),
      "# Spec\n\n## Definition of Done\n- [ ] A\n",
      "utf-8",
    );

    const cfg = baseCfg();
    const r = aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    expect(r.rebuilt).toBe(true);
    expect(existsSync(r.statusYmlPath)).toBe(true);
    expect(existsSync(r.statusMdPath)).toBe(true);
    expect(r.sourceCount).toBe(1);
  });

  it("colours the spec index dependency graph green for completed subtasks", () => {
    const repo = tempDir();
    const specDir = join(repo, "20260106-graph");
    mkdirSync(join(specDir, "status"), { recursive: true });

    writeFileSync(
      join(specDir, "status", "subtask-01-demo.status.yml"),
      minimalSubtask("01", "completed", "2026-05-06T10:00:00.000Z"),
      "utf-8",
    );
    writeFileSync(
      join(specDir, "status", "subtask-02-demo.status.yml"),
      minimalSubtask("02", "in_progress", "2026-05-06T10:01:00.000Z"),
      "utf-8",
    );

    const indexPath = join(specDir, "spec-demo.md");
    const indexBefore = `# Spec: Test

## Subtask Manifest
| ID | File |
|----|------|
| 01 | sub-01.md |
| 02 | sub-02.md |

## Subtask Dependency Graph

\`\`\`mermaid
graph TD
    S01[01: Audit] --> S02[02: Loader]
\`\`\`

## Definition of Done
- [ ] First gate
`;
    writeFileSync(indexPath, indexBefore, "utf-8");

    const cfg = baseCfg();
    const r = aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    expect(r.rebuilt).toBe(true);

    const indexAfter = readFileSync(indexPath, "utf-8");
    expect(indexAfter).toContain("%% spec-system:classes:begin");
    expect(indexAfter).toContain("classDef specDone fill:#86efac");
    expect(indexAfter).toContain("class S01 specDone");
    expect(indexAfter).toContain("class S02 specInProgress");
    expect(indexAfter).toContain("S01[01: Audit] --> S02[02: Loader]");
    expect(indexAfter).toContain("- [ ] First gate");
  });

  it("returns rebuilt false when called twice with no source changes", () => {
    const repo = tempDir();
    const specDir = join(repo, "20260101-x");
    mkdirSync(join(specDir, "status"), { recursive: true });
    writeFileSync(join(specDir, "status", "subtask-01-demo.status.yml"), minimalSubtask("01", "completed", "2026-05-06T10:00:00.000Z"), "utf-8");

    const cfg = baseCfg();
    const a = aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    expect(a.rebuilt).toBe(true);
    const st = statSync(a.statusYmlPath).mtimeMs;
    const b = aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    expect(b.rebuilt).toBe(false);
    expect(statSync(a.statusYmlPath).mtimeMs).toBe(st);
  });

  it("touches a source yml to change digest and trigger rebuild", () => {
    const repo = tempDir();
    const specDir = join(repo, "20260102-x");
    mkdirSync(join(specDir, "status"), { recursive: true });
    const p = join(specDir, "status", "subtask-01-demo.status.yml");
    writeFileSync(p, minimalSubtask("01", "completed", "2026-05-06T10:00:00.000Z"), "utf-8");
    const cfg = baseCfg();
    aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    const t = Date.now();
    utimesSync(p, t, t);
    const r = aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    expect(r.rebuilt).toBe(true);
  });

  it("orders blockers by last_heartbeat descending", () => {
    const repo = tempDir();
    const specDir = join(repo, "20260103-x");
    mkdirSync(join(specDir, "status"), { recursive: true });
    writeFileSync(
      join(specDir, "status", "subtask-01-demo.status.yml"),
      minimalSubtask("01", "blocked", "2026-05-06T09:00:00.000Z"),
      "utf-8",
    );
    writeFileSync(
      join(specDir, "status", "subtask-02-demo.status.yml"),
      YAML.stringify(
        {
          schema_version: 1,
          subtask_id: "02",
          feature: "t",
          assigned_agent: "a",
          model: "m",
          token_budget: 1,
          state: "failed",
          checklist: [],
          artifacts: [],
          errors: [{ at: "2026-05-06T10:00:00.000Z", message: "boom", severity: "error" }],
          notes: "",
          extra: {},
          last_heartbeat: "2026-05-06T12:00:00.000Z",
        },
        { lineWidth: 0 },
      ),
      "utf-8",
    );

    const cfg = baseCfg();
    aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    const raw = YAML.parse(readFileSync(join(specDir, "status.yml"), "utf-8")) as SpecRootDoc;
    expect(raw.blockers.map((b) => b.subtask_id)).toEqual(["02", "01"]);
  });

  it("skips invalid yml, emits a warn event, and still aggregates valid sources", () => {
    const repo = tempDir();
    const specDir = join(repo, "20260104-x");
    mkdirSync(join(specDir, "status"), { recursive: true });
    writeFileSync(join(specDir, "status", "subtask-01-demo.status.yml"), minimalSubtask("01", "completed", "2026-05-06T10:00:00.000Z"), "utf-8");
    writeFileSync(join(specDir, "status", "bad.status.yml"), "not: [valid", "utf-8");

    const cfg = baseCfg();
    const r = aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    expect(r.invalidSourcePaths.length).toBeGreaterThan(0);
    expect(r.sourceCount).toBe(1);
    const raw = YAML.parse(readFileSync(join(specDir, "status.yml"), "utf-8")) as SpecRootDoc;
    expect(raw.events.some((e) => e.kind === "source_validation_warn")).toBe(true);
    expect(raw.subtasks).toHaveLength(1);
  });

  it("rolls up definition_of_done_status from spec index checkboxes", () => {
    const repo = tempDir();
    const specDir = join(repo, "20260105-demo-feature");
    mkdirSync(join(specDir, "status"), { recursive: true });
    writeFileSync(join(specDir, "status", "subtask-01-demo.status.yml"), minimalSubtask("01", "completed", "2026-05-06T10:00:00.000Z"), "utf-8");
    writeFileSync(
      join(specDir, "spec-demo-feature.md"),
      `# Spec

## Definition of Done
- [ ] Alpha
- [ ] Beta
- [x] Gamma
`,
      "utf-8",
    );

    const cfg = baseCfg();
    aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    const raw = YAML.parse(readFileSync(join(specDir, "status.yml"), "utf-8")) as SpecRootDoc;
    expect(raw.definition_of_done_status).toEqual([
      { id: "DOD01", text: "Alpha", done: false },
      { id: "DOD02", text: "Beta", done: false },
      { id: "DOD03", text: "Gamma", done: true },
    ]);
  });

  it("appends config_reloaded audit row and event when configReloadAudit is set", () => {
    const repo = tempDir();
    const specDir = join(repo, "cfg-audit");
    mkdirSync(join(specDir, "status"), { recursive: true });
    writeFileSync(join(specDir, "status", "subtask-01-demo.status.yml"), minimalSubtask("01", "completed", "2026-05-06T10:00:00.000Z"), "utf-8");

    const cfg = baseCfg();
    aggregateOnce({ specDir, config: cfg, repoRoot: repo, nowIso: "2026-05-06T12:00:00.000Z" });
    const r = aggregateOnce({
      specDir,
      config: cfg,
      repoRoot: repo,
      nowIso: "2026-05-06T12:01:00.000Z",
      configReloadAudit: { at: "2026-05-06T12:01:00.000Z", mtime: "2026-05-06T11:59:59.000Z" },
    });
    expect(r.rebuilt).toBe(true);
    const raw = YAML.parse(readFileSync(join(specDir, "status.yml"), "utf-8")) as SpecRootDoc;
    expect(raw.config_reloaded.length).toBeGreaterThanOrEqual(1);
    expect(raw.events.some((e) => e.kind === "config_reloaded")).toBe(true);
  });

  it("appends config_reload_failed extra audit events", () => {
    const repo = tempDir();
    const specDir = join(repo, "fail-audit");
    mkdirSync(join(specDir, "status"), { recursive: true });
    writeFileSync(join(specDir, "status", "subtask-01-demo.status.yml"), minimalSubtask("01", "completed", "2026-05-06T10:00:00.000Z"), "utf-8");

    const cfg = baseCfg();
    aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    const r = aggregateOnce({
      specDir,
      config: cfg,
      repoRoot: repo,
      nowIso: "2026-05-06T12:02:00.000Z",
      extraAuditEvents: [
        {
          at: "2026-05-06T12:02:00.000Z",
          kind: "config_reload_failed",
          message: "ConfigValidationError: test",
        },
      ],
    });
    expect(r.rebuilt).toBe(true);
    const raw = YAML.parse(readFileSync(join(specDir, "status.yml"), "utf-8")) as SpecRootDoc;
    expect(raw.events.some((e) => e.kind === "config_reload_failed")).toBe(true);
  });

  it("rebuilds when spec index mtime changes (DoD checkbox ticked)", () => {
    const repo = tempDir();
    const specDir = join(repo, "20260108-dod");
    mkdirSync(join(specDir, "status"), { recursive: true });
    writeFileSync(
      join(specDir, "status", "subtask-01-demo.status.yml"),
      minimalSubtask("01", "completed", "2026-05-06T10:00:00.000Z"),
      "utf-8",
    );
    const indexPath = join(specDir, "spec-dod-demo.md");
    writeFileSync(
      indexPath,
      "# Spec\n\n## Definition of Done\n- [ ] Alpha\n",
      "utf-8",
    );

    const cfg = baseCfg();
    const a = aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    expect(a.rebuilt).toBe(true);

    const b = aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    expect(b.rebuilt).toBe(false);

    writeFileSync(
      indexPath,
      "# Spec\n\n## Definition of Done\n- [x] Alpha\n",
      "utf-8",
    );
    const c = aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    expect(c.rebuilt).toBe(true);

    const raw = YAML.parse(readFileSync(join(specDir, "status.yml"), "utf-8")) as SpecRootDoc;
    expect(raw.definition_of_done_status).toEqual([
      { id: "DOD01", text: "Alpha", done: true },
    ]);
  });

  it("caps events at 100 entries", () => {
    const repo = tempDir();
    const specDir = join(repo, "20260106-x");
    mkdirSync(join(specDir, "status"), { recursive: true });
    writeFileSync(join(specDir, "status", "subtask-01-demo.status.yml"), minimalSubtask("01", "completed", "2026-05-06T10:00:00.000Z"), "utf-8");

    const cfg = baseCfg();
    aggregateOnce({ specDir, config: cfg, repoRoot: repo });

    const existing = YAML.parse(readFileSync(join(specDir, "status.yml"), "utf-8")) as SpecRootDoc;
    existing.events = Array.from({ length: 100 }, (_, i) => ({
      at: "2026-01-01T00:00:00.000Z",
      kind: "fill",
      message: `row ${i}`,
    }));
    writeFileSync(join(specDir, "status.yml"), YAML.stringify(existing, { lineWidth: 0 }), "utf-8");

    utimesSync(join(specDir, "status", "subtask-01-demo.status.yml"), Date.now(), Date.now());
    aggregateOnce({ specDir, config: cfg, repoRoot: repo });
    const raw = YAML.parse(readFileSync(join(specDir, "status.yml"), "utf-8")) as SpecRootDoc;
    expect(raw.events.length).toBeLessThanOrEqual(100);
  });
});

describe("watch", () => {
  it("exits shortly after AbortSignal (one debounced tick)", async () => {
    const repo = tempDir();
    const specDir = join(repo, "20260107-x");
    mkdirSync(join(specDir, "status"), { recursive: true });
    writeFileSync(join(specDir, "status", "subtask-01-demo.status.yml"), minimalSubtask("01", "pending", "2026-05-06T10:00:00.000Z"), "utf-8");

    const cfg = baseCfg();
    cfg.aggregator.pollIntervalMs = 20;
    cfg.aggregator.debounceMs = 10;

    const ac = new AbortController();
    const ticks: unknown[] = [];
    const p = watch({
      specDir,
      repoRoot: repo,
      config: cfg,
      signal: ac.signal,
      onTick: (r) => {
        ticks.push(r.digest);
      },
    });

    await new Promise((r) => setTimeout(r, 45));
    ac.abort();

    await p;
    expect(ticks.length).toBeGreaterThanOrEqual(1);
  });
});
