import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSpawnPrefix,
  buildSpawnPrefixFromConfig,
  spawnPromptBudgetLead,
} from "./spawn-prompt.js";
import type { SpecSystemConfig } from "./config-loader.js";

const EXPECTED_BUDGET_PREFIX =
  `${spawnPromptBudgetLead(12345)}. Stay within this budget; record the resolved value in your status.yml token_budget field; if you exceed it, add a warn-level entry to your status.yml errors[] array.`;

const baseCfg: SpecSystemConfig = {
  unitOfWork: "spec",
  specsDir: "specs",
  workDir: "specs/current",
  spec: { maxSubtasks: 99, parallelLimit: 4, adversarialVerification: true },
  subagents: { default: { tokenBudget: 200000, model: "default-model" } },
  aggregator: {
    enabled: true,
    pollIntervalMs: 1500,
    debounceMs: 250,
    outputs: { specStatusMd: "status.md", specStatusYml: "status.yml" },
  },
};

describe("buildSpawnPrefix", () => {
  it("includes the resolved budget and both status paths in the correct order", () => {
    const out = buildSpawnPrefix({
      role: "subtask",
      tokenBudget: 12345,
      model: undefined,
      statusYmlPath: "specs/foo/status/subtask-01-x-status.yml",
      statusMdPath: "specs/foo/status/subtask-01-x-status.md",
    });

    expect(out).toContain(EXPECTED_BUDGET_PREFIX);
    expect(out).toContain("  - specs/foo/status/subtask-01-x-status.md");
    expect(out).toContain("  - specs/foo/status/subtask-01-x-status.yml");
    expect(out.indexOf("subtask-01-x-status.md")).toBeLessThan(
      out.indexOf("subtask-01-x-status.yml"),
    );
  });

  it('uses verbatim "Token budget:" opening for downstream greps', () => {
    const out = buildSpawnPrefix({
      role: "generator",
      tokenBudget: 1,
      model: undefined,
      statusYmlPath: "/tmp/a.yml",
      statusMdPath: "/tmp/a.md",
    });

    expect(out.startsWith(`${spawnPromptBudgetLead(1)}. Stay within this budget`)).toBe(true);
    expect(out).toContain(
      "Final state must be one of: completed | blocked | failed.",
    );
    expect(out).toContain("Status files (you own these):");
  });
});

describe("buildSpawnPrefixFromConfig", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates budget resolution per role via resolveSubagentBudget", async () => {
    const configLoader = await import("./config-loader.js");
    const spy = vi
      .spyOn(configLoader, "resolveSubagentBudget")
      .mockReturnValue({ tokenBudget: 999999, model: "mock" });

    const cfg: SpecSystemConfig = {
      ...baseCfg,
      subagents: {
        ...baseCfg.subagents,
        subtask: { tokenBudget: 111 },
      },
    };

    const out = buildSpawnPrefixFromConfig(
      cfg,
      "subtask",
      "y.yml",
      "x.md",
    );

    expect(spy).toHaveBeenCalledWith(cfg, "subtask");
    expect(out).toContain(`${spawnPromptBudgetLead(999999)}.`);
    expect(out).toContain("  - x.md");
    expect(out).toContain("  - y.yml");
  });
});
