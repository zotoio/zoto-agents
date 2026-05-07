import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import YAML from "yaml";

import {
  mdFromYmlPaths,
  type SubtaskStatusDoc,
} from "../scripts/spec-status-roundtrip.js";
import {
  checkAllSpecs,
  checkSpecDir,
  checkSubtaskPair,
  checklistMismatches,
  uncheckedMdBoxIds,
} from "./onstop-check.js";

const tmpDirs: string[] = [];

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

function tempRepo(): string {
  const d = mkdtempSync(join(tmpdir(), "zoto-onstop-"));
  tmpDirs.push(d);
  return d;
}

function baseDoc(overrides: Partial<SubtaskStatusDoc> = {}): SubtaskStatusDoc {
  return {
    schema_version: 1,
    subtask_id: "01",
    feature: "test-feature",
    assigned_agent: "generalPurpose",
    model: "composer-2-fast",
    token_budget: 200_000,
    state: "in_progress",
    checklist: [
      { id: "D01", text: "deliverable one", done: false, evidence_path: null },
      { id: "D02", text: "deliverable two", done: false, evidence_path: null },
    ],
    artifacts: [],
    errors: [],
    notes: "",
    extra: {},
    started_at: "2026-05-06T00:00:00.000Z",
    last_heartbeat: "2026-05-06T00:00:01.000Z",
    ...overrides,
  };
}

function writeMinimalConfig(repoRoot: string): void {
  const dir = join(repoRoot, ".zoto", "spec-system");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "config.yml"), "# defaults\n", "utf-8");
}

function writePair(
  specDir: string,
  doc: SubtaskStatusDoc,
): { ymlPath: string; mdPath: string } {
  const statusDir = join(specDir, "status");
  mkdirSync(statusDir, { recursive: true });
  const base = `subtask-${doc.subtask_id}-${doc.feature}-test`;
  const ymlPath = join(statusDir, `${base}.status.yml`);
  const mdPath = join(statusDir, `${base}.status.md`);
  writeFileSync(ymlPath, YAML.stringify(doc, { lineWidth: 0 }), "utf-8");
  mdFromYmlPaths(ymlPath, mdPath);
  return { ymlPath, mdPath };
}

describe("uncheckedMdBoxIds (regex backstop)", () => {
  it("finds all unchecked Dxx boxes in the md", () => {
    const md = [
      "- [ ] **D01** — first",
      "- [x] **D02** — second",
      "- [ ] **D03** — third",
    ].join("\n");
    expect(uncheckedMdBoxIds(md)).toEqual(["D01", "D03"]);
  });

  it("returns an empty list when every box is checked", () => {
    const md = ["- [x] **D01** — first", "- [x] **D02** — second"].join("\n");
    expect(uncheckedMdBoxIds(md)).toEqual([]);
  });
});

describe("checklistMismatches", () => {
  it("returns ids whose done flags differ", () => {
    const yml = [
      { id: "D01", text: "a", done: true, evidence_path: null },
      { id: "D02", text: "b", done: false, evidence_path: null },
    ];
    const md = [
      { id: "D01", text: "a", done: false, evidence_path: null },
      { id: "D02", text: "b", done: false, evidence_path: null },
    ];
    expect(checklistMismatches(yml, md)).toEqual(["D01"]);
  });
});

describe("checkSubtaskPair", () => {
  it("reports no issues for a fresh, consistent pair", () => {
    const repo = tempRepo();
    const specDir = join(repo, "specs", "20260506-feature");
    const { ymlPath } = writePair(specDir, baseDoc());
    const res = checkSubtaskPair(ymlPath, { writeFixes: true });
    expect(res.issues).toEqual([]);
    expect(res.fixes).toEqual([]);
    expect(res.hasCritical).toBe(false);
    expect(res.checked).toBe(1);
  });

  it("flags a critical issue when state=completed but checklist items are open", () => {
    const repo = tempRepo();
    const specDir = join(repo, "specs", "20260506-feature");
    const doc = baseDoc({
      state: "completed",
      completed_at: "2026-05-06T00:01:00.000Z",
      checklist: [
        { id: "D01", text: "one", done: true, evidence_path: null },
        { id: "D02", text: "two", done: false, evidence_path: null },
      ],
    });
    // Bypass the round-trip helper's own completion guard by writing the yml directly.
    const statusDir = join(specDir, "status");
    mkdirSync(statusDir, { recursive: true });
    const ymlPath = join(statusDir, "subtask-01-test-feature-test.status.yml");
    writeFileSync(ymlPath, YAML.stringify(doc, { lineWidth: 0 }), "utf-8");

    const res = checkSubtaskPair(ymlPath, { writeFixes: true });
    expect(res.hasCritical).toBe(true);
    const kinds = res.issues.map((i) => i.kind);
    expect(kinds).toContain("completed_with_open_items");
  });

  it("flags a critical issue when extra.judge.verdict=verified but items open", () => {
    const repo = tempRepo();
    const specDir = join(repo, "specs", "20260506-feature");
    const doc = baseDoc({
      checklist: [
        { id: "D01", text: "a", done: true, evidence_path: null },
        { id: "D02", text: "b", done: false, evidence_path: null },
      ],
      extra: {
        judge: {
          verdict: "verified",
          at: "2026-05-06T00:02:00.000Z",
          notes: "all good",
        },
      },
    });
    const { ymlPath } = writePair(specDir, doc);
    const res = checkSubtaskPair(ymlPath, { writeFixes: true });
    expect(res.hasCritical).toBe(true);
    expect(res.issues.map((i) => i.kind)).toContain("verified_with_open_items");
  });

  it("auto-fixes md/yml mismatch by re-rendering md when writeFixes=true", () => {
    const repo = tempRepo();
    const specDir = join(repo, "specs", "20260506-feature");
    const doc = baseDoc({
      checklist: [
        { id: "D01", text: "one", done: true, evidence_path: "src/a.ts" },
        { id: "D02", text: "two", done: false, evidence_path: null },
      ],
    });
    const { ymlPath, mdPath } = writePair(specDir, doc);

    // Hand-mangle the md to make D01 unchecked even though yml says done.
    let md = readFileSync(mdPath, "utf-8");
    md = md.replace(/- \[x\] \*\*D01\*\*/, "- [ ] **D01**");
    writeFileSync(mdPath, md, "utf-8");

    const res = checkSubtaskPair(ymlPath, { writeFixes: true });
    expect(res.fixes.map((f) => f.kind)).toContain("rerendered_md_from_yml");
    expect(res.hasCritical).toBe(false);

    const after = readFileSync(mdPath, "utf-8");
    expect(after).toMatch(/- \[x\] \*\*D01\*\*/);
  });

  it("reports md/yml mismatch but does NOT write when writeFixes=false", () => {
    const repo = tempRepo();
    const specDir = join(repo, "specs", "20260506-feature");
    const doc = baseDoc({
      checklist: [
        { id: "D01", text: "one", done: true, evidence_path: null },
        { id: "D02", text: "two", done: false, evidence_path: null },
      ],
    });
    const { ymlPath, mdPath } = writePair(specDir, doc);

    let md = readFileSync(mdPath, "utf-8");
    md = md.replace(/- \[x\] \*\*D01\*\*/, "- [ ] **D01**");
    writeFileSync(mdPath, md, "utf-8");
    const before = readFileSync(mdPath, "utf-8");

    const res = checkSubtaskPair(ymlPath, { writeFixes: false });
    expect(res.fixes).toEqual([]);
    expect(res.issues.map((i) => i.kind)).toContain("md_yml_mismatch");

    const after = readFileSync(mdPath, "utf-8");
    expect(after).toBe(before);
  });

  it("re-renders a missing .status.md from the yml when writeFixes=true", () => {
    const repo = tempRepo();
    const specDir = join(repo, "specs", "20260506-feature");
    const { ymlPath, mdPath } = writePair(specDir, baseDoc());
    rmSync(mdPath);
    expect(existsSync(mdPath)).toBe(false);

    const res = checkSubtaskPair(ymlPath, { writeFixes: true });
    expect(res.fixes.map((f) => f.kind)).toContain("rerendered_md_from_yml");
    expect(existsSync(mdPath)).toBe(true);
  });

  it("flags schema_invalid_yml as critical when the yml is malformed", () => {
    const repo = tempRepo();
    const specDir = join(repo, "specs", "20260506-feature");
    const statusDir = join(specDir, "status");
    mkdirSync(statusDir, { recursive: true });
    const ymlPath = join(statusDir, "subtask-01-broken-test.status.yml");
    writeFileSync(
      ymlPath,
      YAML.stringify({ subtask_id: "01" }, { lineWidth: 0 }),
      "utf-8",
    );

    const res = checkSubtaskPair(ymlPath, { writeFixes: true });
    expect(res.hasCritical).toBe(true);
    expect(res.issues.map((i) => i.kind)).toContain("schema_invalid_yml");
  });
});

describe("checkSpecDir", () => {
  it("walks every status pair under <specDir>/status/ and aggregates", () => {
    const repo = tempRepo();
    const specDir = join(repo, "specs", "20260506-feature");

    writePair(specDir, baseDoc({ subtask_id: "01" }));
    writePair(specDir, baseDoc({ subtask_id: "02" }));

    const res = checkSpecDir(specDir, { writeFixes: true });
    expect(res.checked).toBe(2);
    expect(res.issues).toEqual([]);
    expect(res.hasCritical).toBe(false);
  });

  it("reports a warn for an invalid spec-root status.yml without auto-fix", () => {
    const repo = tempRepo();
    const specDir = join(repo, "specs", "20260506-feature");
    writePair(specDir, baseDoc({ subtask_id: "01" }));
    writeFileSync(join(specDir, "status.yml"), "not: a: valid: spec status\n", "utf-8");

    const res = checkSpecDir(specDir, { writeFixes: true });
    expect(res.issues.map((i) => i.kind)).toContain("schema_invalid_spec_status");
    expect(res.hasCritical).toBe(false);
  });

  it("flags critical when aggregate_state=completed but DoD items are unchecked", () => {
    const repo = tempRepo();
    const specDir = join(repo, "specs", "20260506-feature");
    writePair(specDir, baseDoc({
      subtask_id: "01",
      state: "completed",
      completed_at: "2026-05-06T00:01:00.000Z",
      checklist: [
        { id: "D01", text: "one", done: true, evidence_path: null },
      ],
    }));
    writeFileSync(
      join(specDir, "status.yml"),
      YAML.stringify({
        schema_version: 1,
        spec_id: "20260506-feature",
        phase: 0,
        aggregate_state: "completed",
        started_at: "2026-05-06T00:00:00.000Z",
        updated_at: "2026-05-06T00:01:00.000Z",
        aggregate_progress: { total: 1, completed: 1, in_progress: 0, blocked: 0, failed: 0 },
        subtasks: [{
          subtask_id: "01",
          state: "completed",
          status_path: "specs/20260506-feature/status/subtask-01-test-feature-test.status.yml",
          last_heartbeat: "2026-05-06T00:01:00.000Z",
        }],
        blockers: [],
        definition_of_done_status: [
          { id: "DOD01", text: "First gate", done: true },
          { id: "DOD02", text: "Second gate", done: false },
        ],
        config_reloaded: [],
        events: [],
        extra: { aggregator_digest: "abc" },
      }, { lineWidth: 0 }),
      "utf-8",
    );

    const res = checkSpecDir(specDir, { writeFixes: true });
    expect(res.hasCritical).toBe(true);
    expect(res.issues.map((i) => i.kind)).toContain("completed_with_open_dod");
    const dodIssue = res.issues.find((i) => i.kind === "completed_with_open_dod")!;
    expect(dodIssue.message).toContain("DOD02");
  });

  it("does not flag DoD when aggregate_state is not completed", () => {
    const repo = tempRepo();
    const specDir = join(repo, "specs", "20260506-feature");
    writePair(specDir, baseDoc({ subtask_id: "01" }));
    writeFileSync(
      join(specDir, "status.yml"),
      YAML.stringify({
        schema_version: 1,
        spec_id: "20260506-feature",
        phase: 0,
        aggregate_state: "in_progress",
        started_at: "2026-05-06T00:00:00.000Z",
        updated_at: "2026-05-06T00:01:00.000Z",
        aggregate_progress: { total: 1, completed: 0, in_progress: 1, blocked: 0, failed: 0 },
        subtasks: [{
          subtask_id: "01",
          state: "in_progress",
          status_path: "specs/20260506-feature/status/subtask-01-test-feature-test.status.yml",
          last_heartbeat: "2026-05-06T00:01:00.000Z",
        }],
        blockers: [],
        definition_of_done_status: [
          { id: "DOD01", text: "First gate", done: false },
        ],
        config_reloaded: [],
        events: [],
        extra: { aggregator_digest: "abc" },
      }, { lineWidth: 0 }),
      "utf-8",
    );

    const res = checkSpecDir(specDir, { writeFixes: true });
    expect(res.issues.map((i) => i.kind)).not.toContain("completed_with_open_dod");
  });
});

describe("checkAllSpecs", () => {
  it("discovers spec dirs that contain a status/ subdirectory under specsDir", () => {
    const repo = tempRepo();
    writeMinimalConfig(repo);

    const sd1 = join(repo, "specs", "20260506-one");
    const sd2 = join(repo, "specs", "20260506-two");
    writePair(sd1, baseDoc({ subtask_id: "01", feature: "one" }));
    writePair(sd2, baseDoc({ subtask_id: "01", feature: "two" }));

    // An unrelated spec dir without status/ — must be ignored.
    mkdirSync(join(repo, "specs", "20260506-no-status"), { recursive: true });

    const res = checkAllSpecs({ repoRoot: repo, writeFixes: true });
    // 1 config + 2 subtask pairs (no spec-root status.yml)
    expect(res.checked).toBe(3);
    expect(res.issues).toEqual([]);
  });

  it("flags a critical issue for an invalid .zoto/spec-system/config.yml", () => {
    const repo = tempRepo();
    const dir = join(repo, ".zoto", "spec-system");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "config.yml"),
      "specsDir: 12345\nspec:\n  parallelLimit: -1\n",
      "utf-8",
    );

    const res = checkAllSpecs({ repoRoot: repo, writeFixes: true });
    expect(res.hasCritical).toBe(true);
    expect(res.issues.map((i) => i.kind)).toContain("schema_invalid_config");
  });

  it("supports a single-spec --spec-dir style invocation", () => {
    const repo = tempRepo();
    writeMinimalConfig(repo);
    const sd1 = join(repo, "specs", "20260506-one");
    const sd2 = join(repo, "specs", "20260506-two");
    writePair(sd1, baseDoc({ subtask_id: "01", feature: "one" }));
    writePair(sd2, baseDoc({ subtask_id: "01", feature: "two" }));

    const res = checkAllSpecs({
      repoRoot: repo,
      writeFixes: true,
      specDir: sd1,
    });
    // 1 config + 1 subtask pair from sd1 only
    expect(res.checked).toBe(2);
  });
});
