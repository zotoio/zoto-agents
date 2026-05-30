import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import YAML from "yaml";

import {
  loadConfig,
  resolveSubagentBudget,
} from "../../src/config-loader.js";
import { buildSpawnPrefix, spawnPromptBudgetLead } from "../../src/spawn-prompt.js";

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
  const d = mkdtempSync(join(tmpdir(), "zoto-spec-no-restart-"));
  tmpDirs.push(d);
  return d;
}

function writeConfigYaml(repoRoot: string, body: object): void {
  const dir = join(repoRoot, ".zoto", "spec-system");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "config.yml"), YAML.stringify(body), "utf-8");
}

describe("no-restart token-budget propagation (integration)", () => {
  it("rewriting .zoto/spec-system/config.yml between two spawn calls bumps the prompt budget without process restart", () => {
    const repo = tempRepo();
    writeConfigYaml(repo, {
      subagents: {
        default: { tokenBudget: 100000 },
        subtask: { tokenBudget: 100000 },
      },
    });

    const first = loadConfig(repo, 0);
    expect(first.reloaded).toBe(true);
    const firstBudget = resolveSubagentBudget(first.config, "subtask");
    expect(firstBudget.tokenBudget).toBe(100000);

    const firstPrefix = buildSpawnPrefix({
      role: "subtask",
      tokenBudget: firstBudget.tokenBudget,
      model: firstBudget.model,
      statusYmlPath: "specs/x/status/subtask-01-x.status.yml",
      statusMdPath: "specs/x/status/subtask-01-x.status.md",
    });
    expect(firstPrefix).toContain(spawnPromptBudgetLead(100000));

    const cfgPath = join(repo, ".zoto", "spec-system", "config.yml");
    writeConfigYaml(repo, {
      subagents: {
        default: { tokenBudget: 100000 },
        subtask: { tokenBudget: 250000 },
      },
    });
    const bumped = statSync(cfgPath).mtimeMs + 5_000;
    utimesSync(cfgPath, new Date(bumped), new Date(bumped));

    const second = loadConfig(repo, first.mtimeMs);
    expect(second.reloaded).toBe(true);
    expect(second.mtimeMs).not.toBe(first.mtimeMs);

    const secondBudget = resolveSubagentBudget(second.config, "subtask");
    expect(secondBudget.tokenBudget).toBe(250000);

    const secondPrefix = buildSpawnPrefix({
      role: "subtask",
      tokenBudget: secondBudget.tokenBudget,
      model: secondBudget.model,
      statusYmlPath: "specs/x/status/subtask-02-x.status.yml",
      statusMdPath: "specs/x/status/subtask-02-x.status.md",
    });
    expect(secondPrefix).toContain(spawnPromptBudgetLead(250000));
    expect(secondPrefix).not.toContain(spawnPromptBudgetLead(100000));
  });

  it("a third loadConfig call with the same mtime returns reloaded:false (no spurious reload)", () => {
    const repo = tempRepo();
    writeConfigYaml(repo, {
      subagents: { default: { tokenBudget: 100000 } },
    });
    const first = loadConfig(repo, 0);
    const second = loadConfig(repo, first.mtimeMs);
    expect(second.reloaded).toBe(false);
    expect(second.mtimeMs).toBe(first.mtimeMs);
  });
});
