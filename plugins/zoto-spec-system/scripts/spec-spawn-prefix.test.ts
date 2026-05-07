import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import YAML from "yaml";
import type { SpecSystemConfig } from "../src/config-loader.js";
import { buildSpawnPrefixFromConfig } from "../src/spawn-prompt.js";

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = join(pluginRoot, "scripts", "spec-spawn-prefix.ts");
const tsxBin = join(pluginRoot, "node_modules", ".bin", "tsx");

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
  const dir = mkdtempSync(join(tmpdir(), "zoto-spec-spawn-prefix-"));
  tmpDirs.push(dir);
  return dir;
}

/** Write the user-facing config.yml. `contents` may be raw YAML or a JSON string
 * (which is itself valid YAML), so older fixtures keep working. */
function writeRepoConfig(repoRoot: string, contents: string): void {
  const dir = join(repoRoot, ".zoto", "spec-system");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "config.yml"), contents, "utf-8");
}

function runCli(
  cwd: string,
  args: string[],
): { stdout: string; stderr: string; status: number | null } {
  const res = spawnSync(tsxBin, [scriptPath, ...args], {
    cwd,
    encoding: "utf-8",
    env: { ...process.env },
  });
  return {
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
    status: res.status,
  };
}

describe("spec-spawn-prefix CLI", () => {
  it("prints the verbatim spawn prefix on a valid temp config", () => {
    const repo = tempRepo();
    const tmplJson = readFileSync(join(pluginRoot, "templates", "config.json"), "utf-8");
    // Convert the internal JSON baseline to YAML on disk to mirror real usage.
    writeRepoConfig(repo, YAML.stringify(JSON.parse(tmplJson)));

    const y = "/tmp/x.yml";
    const m = "/tmp/x.md";
    const { status, stdout, stderr } = runCli(repo, [
      "--role",
      "subtask",
      "--status-yml",
      y,
      "--status-md",
      m,
    ]);

    expect(status).toBe(0);
    expect(stderr).toBe("");

    const cfg = JSON.parse(tmplJson) as SpecSystemConfig;
    const expected = buildSpawnPrefixFromConfig(cfg, "subtask", y, m);
    expect(stdout.replace(/\r\n/g, "\n").trimEnd()).toBe(expected);
  });

  it("exits non-zero with a structured JSON line on stderr for invalid config", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, YAML.stringify({ unitOfWork: 42 }));

    const { status, stdout, stderr } = runCli(repo, [
      "--role",
      "executor",
      "--status-yml",
      "/a.yml",
      "--status-md",
      "/a.md",
    ]);

    expect(status).not.toBe(0);
    expect(stdout).toBe("");
    const line = stderr.trim().split("\n").filter(Boolean).pop()!;
    const parsed = JSON.parse(line) as { error: string; code: string };
    expect(parsed.code).toBe("ConfigValidationError");
    expect(typeof parsed.error).toBe("string");
  });

  it("resolves --role subtask via subagents.subtask.tokenBudget ?? subagents.default.tokenBudget", () => {
    const repo = tempRepo();
    const base = JSON.parse(
      readFileSync(join(pluginRoot, "templates", "config.json"), "utf-8"),
    ) as SpecSystemConfig;
    base.subagents = {
      default: { tokenBudget: 1000 },
      subtask: { tokenBudget: 222333 },
    };
    writeRepoConfig(repo, YAML.stringify(base));

    const { status, stdout } = runCli(repo, [
      "--role",
      "subtask",
      "--status-yml",
      "/y.yml",
      "--status-md",
      "/z.md",
    ]);

    expect(status).toBe(0);
    expect(stdout).toContain("Token budget: 222333.");
  });
});
