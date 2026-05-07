import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { readYml } from "../../scripts/spec-status-roundtrip.js";

const PLUGIN_ROOT = resolve(import.meta.dirname, "../..");
const TSX_CLI = join(PLUGIN_ROOT, "node_modules", ".bin", "tsx");
const ROUNDTRIP_SCRIPT = join(PLUGIN_ROOT, "scripts", "spec-status-roundtrip.ts");

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

function tempDir(): string {
  const d = mkdtempSync(join(tmpdir(), "zoto-spec-hb-guard-"));
  tmpDirs.push(d);
  return d;
}

function fixtureYml(): string {
  return `schema_version: 1
subtask_id: "01"
feature: demo-feature
assigned_agent: explore
model: composer-2-fast
token_budget: 100000
state: in_progress
checklist:
  - id: D01
    text: First deliverable
    done: true
    evidence_path: src/a.ts
  - id: D02
    text: Second deliverable
    done: false
    evidence_path: null
artifacts: []
errors: []
notes: ""
extra: {}
`;
}

function runRoundtripCli(args: string[]): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  try {
    const stdout = execFileSync(TSX_CLI, [ROUNDTRIP_SCRIPT, ...args], {
      cwd: PLUGIN_ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (e: unknown) {
    const err = e as { status?: number; stderr?: Buffer | string; stdout?: Buffer | string };
    return {
      status: typeof err.status === "number" ? err.status : 1,
      stdout: typeof err.stdout === "string" ? err.stdout : (err.stdout?.toString("utf-8") ?? ""),
      stderr: typeof err.stderr === "string" ? err.stderr : (err.stderr?.toString("utf-8") ?? ""),
    };
  }
}

describe("heartbeat completion guard (integration)", { timeout: 15_000 }, () => {
  it("refuses --state completed while checklist items are open with an actionable error", () => {
    const dir = tempDir();
    const yml = join(dir, "subtask-01-x.status.yml");
    writeFileSync(yml, fixtureYml(), "utf-8");

    const r = runRoundtripCli(["heartbeat", "--in", yml, "--state", "completed"]);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/cannot set state to completed/i);
    expect(r.stderr).toMatch(/D02/);
    expect(r.stderr).toMatch(/tick remaining items first/i);

    const after = readYml(yml);
    expect(after.state).toBe("in_progress");
  });

  it("ticking the remaining checklist item then re-running --state completed succeeds", () => {
    const dir = tempDir();
    const yml = join(dir, "subtask-01-x.status.yml");
    const md = join(dir, "subtask-01-x.status.md");
    writeFileSync(yml, fixtureYml(), "utf-8");

    const tick = runRoundtripCli(["heartbeat", "--in", yml, "--tick", "D02"]);
    expect(tick.status, tick.stderr).toBe(0);
    const tickedDoc = readYml(yml);
    expect(tickedDoc.checklist.find((c) => c.id === "D02")?.done).toBe(true);

    const complete = runRoundtripCli([
      "heartbeat",
      "--in",
      yml,
      "--state",
      "completed",
    ]);
    expect(complete.status, complete.stderr).toBe(0);

    const final = readYml(yml);
    expect(final.state).toBe("completed");
    expect(final.completed_at).toBeDefined();
    expect(existsSync(md)).toBe(true);
  });
});
