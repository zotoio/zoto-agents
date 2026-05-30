import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import YAML from "yaml";

import { aggregateOnce, type SpecRootDoc } from "../../src/aggregator.js";
import type { SpecSystemConfig } from "../../src/config-loader.js";

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
  const d = mkdtempSync(join(tmpdir(), "zoto-spec-blockers-"));
  tmpDirs.push(d);
  return d;
}

function baseCfg(): SpecSystemConfig {
  return {
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
  };
}

function subtaskYaml(
  id: string,
  state: "pending" | "in_progress" | "blocked" | "completed" | "failed",
  errors: Array<{ at: string; message: string; severity: "info" | "warn" | "error" }> = [],
  lastHeartbeat = "2026-05-06T10:00:00.000Z",
): string {
  return YAML.stringify(
    {
      schema_version: 1,
      subtask_id: id,
      feature: "spec-system-live-status",
      assigned_agent: "explore",
      model: "composer-2.5-fast",
      token_budget: 100000,
      state,
      checklist: [],
      artifacts: [],
      errors,
      notes: "",
      extra: {},
      last_heartbeat: lastHeartbeat,
    },
    { lineWidth: 0 },
  );
}

function readSpecRootYml(p: string): SpecRootDoc {
  return YAML.parse(readFileSync(p, "utf-8")) as SpecRootDoc;
}

function bumpMtime(path: string, addMs: number): void {
  const t = (Date.now() + addMs) / 1000;
  utimesSync(path, t, t);
}

describe("aggregator blocker surfacing (integration)", () => {
  it("blockers[] is empty initially, populated when a subtask flips to blocked, cleared when reverted", () => {
    const repo = tempRepo();
    const specDir = join(repo, "20260506-spec-system-live-status");
    const statusDir = join(specDir, "status");
    mkdirSync(statusDir, { recursive: true });

    const sub01 = join(statusDir, "subtask-01-x.status.yml");
    const sub02 = join(statusDir, "subtask-02-x.status.yml");
    const sub03 = join(statusDir, "subtask-03-x.status.yml");
    writeFileSync(sub01, subtaskYaml("01", "in_progress"), "utf-8");
    writeFileSync(sub02, subtaskYaml("02", "in_progress"), "utf-8");
    writeFileSync(sub03, subtaskYaml("03", "in_progress"), "utf-8");

    const cfg = baseCfg();

    const r1 = aggregateOnce({
      specDir,
      config: cfg,
      repoRoot: repo,
      nowIso: "2026-05-06T10:00:00.000Z",
    });
    expect(r1.rebuilt).toBe(true);
    let doc = readSpecRootYml(r1.statusYmlPath);
    expect(doc.blockers).toEqual([]);
    expect(doc.aggregate_state).toBe("in_progress");

    const blockedErr = {
      at: "2026-05-06T11:00:00.000Z",
      message: "Database fixture refused to seed",
      severity: "error" as const,
    };
    writeFileSync(
      sub02,
      subtaskYaml("02", "blocked", [blockedErr], "2026-05-06T11:00:00.000Z"),
      "utf-8",
    );
    bumpMtime(sub02, 60_000);

    const r2 = aggregateOnce({
      specDir,
      config: cfg,
      repoRoot: repo,
      nowIso: "2026-05-06T11:00:00.000Z",
    });
    expect(r2.rebuilt).toBe(true);
    doc = readSpecRootYml(r2.statusYmlPath);
    expect(doc.blockers).toHaveLength(1);
    const blocker = doc.blockers[0]!;
    expect(blocker.subtask_id).toBe("02");
    expect(blocker.reason).toBe(blockedErr.message);
    expect(blocker.path).toMatch(/subtask-02-x\.status\.md$/);
    expect(doc.aggregate_state).toBe("blocked");

    writeFileSync(sub02, subtaskYaml("02", "in_progress"), "utf-8");
    bumpMtime(sub02, 120_000);

    const r3 = aggregateOnce({
      specDir,
      config: cfg,
      repoRoot: repo,
      nowIso: "2026-05-06T12:00:00.000Z",
    });
    expect(r3.rebuilt).toBe(true);
    doc = readSpecRootYml(r3.statusYmlPath);
    expect(doc.blockers).toEqual([]);
    expect(doc.aggregate_state).toBe("in_progress");
  });
});
