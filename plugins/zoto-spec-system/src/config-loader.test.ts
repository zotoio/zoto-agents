import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import YAML from "yaml";
import {
  ConfigValidationError,
  configPathForRepo,
  loadConfig,
  migrateFromLegacy,
  resolveSubagentBudget,
  type SpecSystemConfig,
} from "./config-loader.js";

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const exampleConfigPath = join(pluginRoot, "docs", "example-config.yml");
const initTemplatePath = join(pluginRoot, "templates", "init-config.yml");

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
  const dir = mkdtempSync(join(tmpdir(), "zoto-spec-config-"));
  tmpDirs.push(dir);
  return dir;
}

function writeRepoConfig(repoRoot: string, contents: string): void {
  const dir = join(repoRoot, ".zoto", "spec-system");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "config.yml"), contents, "utf-8");
}

describe("loadConfig", () => {
  it("loads defaults when the config file is missing", () => {
    const repo = tempRepo();
    const res = loadConfig(repo);
    expect(res.path).toBe(join(repo, ".zoto", "spec-system", "config.yml"));
    expect(res.path).toBe(configPathForRepo(repo));
    expect(res.mtimeMs).toBe(0);
    expect(res.reloaded).toBe(false);
    expect(res.config).toMatchObject({
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
    });
  });

  it("loads and validates a fully populated YAML example", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, readFileSync(exampleConfigPath, "utf-8"));
    const res = loadConfig(repo);
    expect(res.mtimeMs).not.toBe(0);
    expect(res.config.subagents.generator?.tokenBudget).toBe(250000);
    expect(res.config.subagents.generator?.model).toBe("claude-opus-4-7-thinking-xhigh");
    expect(res.config.aggregator.pollIntervalMs).toBe(1500);
  });

  it("treats the all-comments init template as an empty override (defaults applied)", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, readFileSync(initTemplatePath, "utf-8"));
    const res = loadConfig(repo);
    expect(res.config.unitOfWork).toBe("spec");
    expect(res.config.subagents.default.tokenBudget).toBe(200000);
    expect(res.config.aggregator.enabled).toBe(true);
  });

  it("throws ConfigValidationError on an out-of-range aggregator.pollIntervalMs", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, YAML.stringify({ aggregator: { pollIntervalMs: 50 } }));
    expect(() => loadConfig(repo)).toThrow(ConfigValidationError);
    try {
      loadConfig(repo);
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigValidationError);
      const err = e as ConfigValidationError;
      expect(err.errors.length).toBeGreaterThan(0);
      expect(JSON.stringify(err.errors)).toMatch(/pollIntervalMs|minimum/i);
    }
  });

  it("throws ConfigValidationError when the YAML root is not a mapping", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, "- 1\n- 2\n");
    expect(() => loadConfig(repo)).toThrow(ConfigValidationError);
  });

  it("returns reloaded true when mtime differs from prevMtimeMs", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, YAML.stringify({ unitOfWork: "spec" }));
    const first = loadConfig(repo);
    expect(first.reloaded).toBe(true);

    const second = loadConfig(repo, first.mtimeMs);
    expect(second.reloaded).toBe(false);

    const third = loadConfig(repo, first.mtimeMs - 1);
    expect(third.reloaded).toBe(true);
  });
});

describe("resolveSubagentBudget", () => {
  const base: SpecSystemConfig = {
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

  it("inherits tokenBudget and model from default when the role is absent", () => {
    const r = resolveSubagentBudget(base, "judge");
    expect(r.tokenBudget).toBe(200000);
    expect(r.model).toBe("default-model");
  });

  it("uses role-specific tokenBudget and model when present", () => {
    const cfg: SpecSystemConfig = {
      ...base,
      subagents: {
        ...base.subagents,
        judge: { tokenBudget: 400000, model: "judge-only" },
      },
    };
    const r = resolveSubagentBudget(cfg, "judge");
    expect(r.tokenBudget).toBe(400000);
    expect(r.model).toBe("judge-only");
  });
});

describe("migrateFromLegacy", () => {
  it("moves .zoto-spec-system/ to .zoto/spec-system/ and converts config.json content to YAML", () => {
    const repo = tempRepo();
    const legacyDir = join(repo, ".zoto-spec-system");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(join(legacyDir, "config.json"), '{ "unitOfWork": "story" }', "utf-8");

    const result = migrateFromLegacy(repo);

    expect(result.migrated).toBe(true);
    expect(existsSync(legacyDir)).toBe(false);
    expect(existsSync(join(repo, ".zoto", "spec-system", "config.yml"))).toBe(true);
    expect(existsSync(join(repo, ".zoto", "spec-system", "config.json"))).toBe(false);

    const content = readFileSync(join(repo, ".zoto", "spec-system", "config.yml"), "utf-8");
    expect(YAML.parse(content)).toMatchObject({ unitOfWork: "story" });
    expect(content).not.toContain("{");
    expect(content).toContain("unitOfWork: story");
  });

  it("does not clobber when new dir already exists (conflict)", () => {
    const repo = tempRepo();
    mkdirSync(join(repo, ".zoto-spec-system"), { recursive: true });
    writeFileSync(join(repo, ".zoto-spec-system", "config.json"), "{}", "utf-8");
    mkdirSync(join(repo, ".zoto", "spec-system"), { recursive: true });
    writeFileSync(join(repo, ".zoto", "spec-system", "config.yml"), "specsDir: custom\n", "utf-8");

    const result = migrateFromLegacy(repo);

    expect(result.migrated).toBe(false);
    expect(result.conflict).toBe(true);
    expect(existsSync(join(repo, ".zoto-spec-system", "config.json"))).toBe(true);
    expect(readFileSync(join(repo, ".zoto", "spec-system", "config.yml"), "utf-8")).toContain("custom");
  });

  it("is a no-op when only the new dir exists", () => {
    const repo = tempRepo();
    const result = migrateFromLegacy(repo);
    expect(result.migrated).toBe(false);
    expect(result.conflict).toBeUndefined();
  });

  it("loadConfig auto-migrates and then reads the moved config", () => {
    const repo = tempRepo();
    const legacyDir = join(repo, ".zoto-spec-system");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(join(legacyDir, "config.json"), JSON.stringify({ unitOfWork: "prp" }), "utf-8");

    const res = loadConfig(repo);

    expect(existsSync(legacyDir)).toBe(false);
    expect(res.config.unitOfWork).toBe("prp");
    expect(res.mtimeMs).not.toBe(0);
  });
});
