import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { mkdtempSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  applyHeartbeat,
  bumpMtimeMs,
  extractStatusBlocks,
  readYml,
  renderMdFromDoc,
  scaffoldSpecDir,
  statusFromMarkedMd,
  validateSpecStatusDir,
  writePathAtomic,
  type SubtaskStatusDoc,
} from "./spec-status-roundtrip.js";

const PLUGIN_ROOT = resolve(import.meta.dirname, "..");

function listTmpFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) out.push(...listTmpFilesRecursive(p));
    else if (name.name.endsWith(".tmp")) out.push(p);
  }
  return out;
}

function minimalStatusYml(): string {
  return `schema_version: 1
subtask_id: "01"
feature: demo
assigned_agent: generalPurpose
model: composer-2.5-fast
token_budget: 0
state: pending
checklist:
  - id: D01
    text: First
    done: false
    evidence_path: null
  - id: D02
    text: Second
    done: false
    evidence_path: null
artifacts: []
errors: []
notes: ""
extra: {}
`;
}

function runRoundtripCli(
  args: string[],
): { status: number | null; stderr: string; stdout: string } {
  const r = spawnSync(
    "pnpm",
    ["exec", "tsx", "scripts/spec-status-roundtrip.ts", ...args],
    {
      cwd: PLUGIN_ROOT,
      encoding: "utf-8",
    },
  );
  return {
    status: r.status,
    stderr: String(r.stderr ?? ""),
    stdout: String(r.stdout ?? ""),
  };
}

describe("spec-status-roundtrip", () => {
  it("md → yml round trip preserves checklist IDs, text, done, evidence", () => {
    const doc: SubtaskStatusDoc = {
      schema_version: 1,
      subtask_id: "03",
      feature: "demo-feature",
      assigned_agent: "shell",
      model: "composer-2.5-fast",
      token_budget: 1000,
      state: "in_progress",
      started_at: "2026-05-06T12:00:00.000Z",
      checklist: [
        {
          id: "D01",
          text: "First deliverable",
          done: true,
          evidence_path: "README.md",
        },
        {
          id: "D02",
          text: "Second deliverable",
          done: false,
          evidence_path: null,
        },
      ],
      artifacts: [],
      errors: [],
      notes: "Working.",
      extra: {},
    };
    const md = renderMdFromDoc(doc);
    const back = statusFromMarkedMd(md);
    expect(back.checklist).toEqual(doc.checklist);
    expect(back.subtask_id).toBe(doc.subtask_id);
    expect(back.feature).toBe(doc.feature);
    expect(back.state).toBe(doc.state);
    expect(back.notes).toBe(doc.notes);
  });

  it("yml → md round trip places checklist text inside block markers", () => {
    const doc: SubtaskStatusDoc = {
      schema_version: 1,
      subtask_id: "02",
      feature: "x",
      assigned_agent: "generalPurpose",
      model: "composer-2.5-fast",
      token_budget: 0,
      state: "pending",
      checklist: [
        {
          id: "D01",
          text: "Scoped checklist line",
          done: false,
          evidence_path: null,
        },
      ],
      artifacts: [],
      errors: [],
      notes: "",
      extra: {},
    };
    const md = renderMdFromDoc(doc);
    const blocks = extractStatusBlocks(md);
    expect(blocks.checklist).toContain("**D01**");
    expect(blocks.checklist).toContain("Scoped checklist line");
  });

  it("scaffold creates paired status files for each subtask file", () => {
    const root = mkdtempSync(join(tmpdir(), "spec-scaffold-"));
    writeFileSync(
      join(root, "subtask-01-demo-feature-a-20260506.md"),
      `# Subtask

## Metadata
- **Subtask ID**: 01
- **Feature**: demo-feature
- **Assigned Subagent**: generalPurpose

## Deliverables Checklist
- [ ] Build parser
- [ ] Add tests

## Definition of Done
- [ ] Done
`,
      "utf-8",
    );
    writeFileSync(
      join(root, "subtask-02-demo-feature-b-20260506.md"),
      `# Subtask

## Metadata
- **Subtask ID**: 02
- **Feature**: demo-feature
- **Assigned Subagent**: explore

## Deliverables Checklist
- [ ] Wire CLI

## Definition of Done
- [ ] Done
`,
      "utf-8",
    );
    scaffoldSpecDir(root);
    const st = join(root, "status");
    expect(existsSync(join(st, "subtask-01-demo-feature-a-20260506.status.yml"))).toBe(
      true,
    );
    expect(existsSync(join(st, "subtask-01-demo-feature-a-20260506.status.md"))).toBe(
      true,
    );
    expect(existsSync(join(st, "subtask-02-demo-feature-b-20260506.status.yml"))).toBe(
      true,
    );
    expect(existsSync(join(st, "subtask-02-demo-feature-b-20260506.status.md"))).toBe(
      true,
    );
    expect(validateSpecStatusDir(root)).toBe(true);
  });

  it("scaffold is idempotent when .status.md is newer than .status.yml", () => {
    const root = mkdtempSync(join(tmpdir(), "spec-idem-"));
    writeFileSync(
      join(root, "subtask-01-demo-feature-a-20260506.md"),
      `## Metadata
- **Subtask ID**: 01
- **Feature**: demo-feature
- **Assigned Subagent**: generalPurpose

## Deliverables Checklist
- [ ] One item

## Definition of Done
- [ ] Done
`,
      "utf-8",
    );
    scaffoldSpecDir(root);
    const mdPath = join(
      root,
      "status/subtask-01-demo-feature-a-20260506.status.md",
    );
    const ymlPath = join(
      root,
      "status/subtask-01-demo-feature-a-20260506.status.yml",
    );
    const injected = `${readFileSync(mdPath, "utf-8")}\n<!-- KEEP_ME -->\n`;
    writeFileSync(mdPath, injected, "utf-8");
    const yOld = statSync(ymlPath).mtimeMs;
    const mNew = Date.now();
    bumpMtimeMs(ymlPath, yOld - 60_000);
    bumpMtimeMs(mdPath, mNew);
    expect(statSync(mdPath).mtimeMs).toBeGreaterThan(statSync(ymlPath).mtimeMs);
    scaffoldSpecDir(root);
    const after = readFileSync(mdPath, "utf-8");
    expect(after).toContain("<!-- KEEP_ME -->");
  });

  it("validate exits non-zero on malformed yml (CLI)", () => {
    const root = mkdtempSync(join(tmpdir(), "spec-bad-"));
    mkdirSync(join(root, "status"), { recursive: true });
    writeFileSync(
      join(root, "status/broken.status.yml"),
      "schema_version: 1\nsubtask_id: XX\n",
      "utf-8",
    );
    const { status, stderr } = runRoundtripCli(["validate", "--spec-dir", root]);
    expect(status).toBe(1);
    expect(stderr).toMatch(/FAIL|subtask_id|schema/i);
  });

  it("heartbeat CLI updates last_heartbeat and state", () => {
    const root = mkdtempSync(join(tmpdir(), "spec-heartbeat-"));
    const yml = join(root, "subtask-01-x.status.yml");
    const md = join(root, "subtask-01-x.status.md");
    writeFileSync(yml, minimalStatusYml(), "utf-8");
    const before = readYml(yml);
    const { status, stderr } = runRoundtripCli([
      "heartbeat",
      "--in",
      yml,
      "--state",
      "in_progress",
    ]);
    expect(stderr).toBe("");
    expect(status).toBe(0);
    const after = readYml(yml);
    expect(after.state).toBe("in_progress");
    expect(after.last_heartbeat).toBeDefined();
    expect(after.last_heartbeat).not.toBe(before.last_heartbeat);
    expect(after.started_at).toBe(after.last_heartbeat);
    expect(existsSync(md)).toBe(true);
    expect(listTmpFilesRecursive(root)).toEqual([]);
  });

  it("heartbeat refuses state completed with open checklist items", () => {
    const root = mkdtempSync(join(tmpdir(), "spec-hb-done-"));
    const yml = join(root, "s.status.yml");
    writeFileSync(yml, minimalStatusYml(), "utf-8");
    const { status, stderr } = runRoundtripCli([
      "heartbeat",
      "--in",
      yml,
      "--state",
      "completed",
    ]);
    expect(status).toBe(1);
    expect(stderr).toMatch(/cannot set state to completed|checklist/i);
    const doc = readYml(yml);
    expect(doc.state).toBe("pending");
    expect(listTmpFilesRecursive(root)).toEqual([]);
  });

  it("heartbeat rejects unknown checklist id", () => {
    const root = mkdtempSync(join(tmpdir(), "spec-hb-id-"));
    const yml = join(root, "s.status.yml");
    writeFileSync(yml, minimalStatusYml(), "utf-8");
    const { status, stderr } = runRoundtripCli([
      "heartbeat",
      "--in",
      yml,
      "--tick",
      "NOPE",
    ]);
    expect(status).toBe(1);
    expect(stderr).toMatch(/unknown checklist id/i);
    expect(listTmpFilesRecursive(root)).toEqual([]);
  });

  it("mutating CLI leaves no .tmp files after success", () => {
    const root = mkdtempSync(join(tmpdir(), "spec-tmp-clean-"));
    const yml = join(root, "x.status.yml");
    const md = join(root, "x.status.md");
    writeFileSync(yml, minimalStatusYml(), "utf-8");
    const r1 = runRoundtripCli(["md-from-yml", "--in", yml, "--out", md]);
    expect(r1.status).toBe(0);
    expect(listTmpFilesRecursive(root)).toEqual([]);
    const injected = `${readFileSync(md, "utf-8")}\n`;
    writeFileSync(md, injected, "utf-8");
    const yOut = join(root, "out.status.yml");
    const r2 = runRoundtripCli(["yml-from-md", "--in", md, "--out", yOut]);
    expect(r2.status).toBe(0);
    expect(listTmpFilesRecursive(root)).toEqual([]);
  });

  it("atomic contract: content stays on target until rename (partial tmp only)", () => {
    const root = mkdtempSync(join(tmpdir(), "spec-atomic-"));
    const target = join(root, "out.status.yml");
    writeFileSync(target, "committed-yaml-v1", "utf-8");
    writeFileSync(`${target}.tmp`, "partial-bytes-never-renamed", "utf-8");
    expect(readFileSync(target, "utf-8")).toBe("committed-yaml-v1");
    writePathAtomic(target, "committed-yaml-v2");
    expect(readFileSync(target, "utf-8")).toBe("committed-yaml-v2");
    expect(existsSync(`${target}.tmp`)).toBe(false);
    expect(listTmpFilesRecursive(root)).toEqual([]);
  });

  it("applyHeartbeat enforces completed checklist gate (unit)", () => {
    const doc: SubtaskStatusDoc = {
      schema_version: 1,
      subtask_id: "01",
      feature: "f",
      assigned_agent: "a",
      model: "m",
      token_budget: 0,
      state: "in_progress",
      checklist: [
        { id: "D01", text: "t", done: true, evidence_path: null },
        { id: "D02", text: "u", done: false, evidence_path: null },
      ],
      artifacts: [],
      errors: [],
      notes: "",
      extra: {},
    };
    expect(() =>
      applyHeartbeat({ doc, nowIso: "2026-05-06T12:00:00.000Z", state: "completed" }),
    ).toThrow(/checklist items are open/i);
  });
});
