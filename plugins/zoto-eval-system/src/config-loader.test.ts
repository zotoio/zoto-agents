import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import YAML from "yaml";
import {
  ConfigValidationError,
  configPathForRepo,
  loadEvalConfig,
  migrateFromLegacy,
  type EvalSystemConfig,
} from "./config-loader.js";

const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
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
  const dir = mkdtempSync(join(tmpdir(), "zoto-eval-config-"));
  tmpDirs.push(dir);
  return dir;
}

function writeRepoConfig(repoRoot: string, contents: string): void {
  const dir = join(repoRoot, ".zoto", "eval-system");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "config.yml"), contents, "utf-8");
}

describe("loadEvalConfig", () => {
  it("returns schema defaults when the config file is missing", () => {
    const repo = tempRepo();
    const res = loadEvalConfig(repo);
    expect(res.path).toBe(configPathForRepo(repo));
    expect(res.mtimeMs).toBe(0);
    expect(res.reloaded).toBe(false);
    expect(res.config.evalsDir).toBe("evals");
    expect(res.config.skillsRoots).toEqual([".cursor/skills", "skills", "plugins/*/skills"]);
    expect(res.config.discoveryTargets).toEqual(["skill", "command", "agent", "hook"]);
    expect(res.config.static.framework).toBe("pytest");
    expect(res.config.llm.runtime).toBe("tsx");
    expect(res.config.llm.model.id).toBe("composer-2.5");
    expect((res.config.llm as Record<string, unknown>).strategy).toBeUndefined();
    expect((res.config.llm as Record<string, unknown>).codeFramework).toBeUndefined();
    expect(res.config.judgeModel).toBe("opus-4.6");
    expect(res.config.analyser.concurrency).toBe(4);
    expect(res.config.analyser.maxCallsPerInvocation).toBe(50);
    expect(res.config.runs.retention).toBe(30);
    expect(res.config.update.preserveUserAuthoredCases).toBe(true);
    expect(res.config.update.writeMetaMarker).toBe(true);
    expect(res.config.update.manifestPath).toBe(".zoto/eval-system/manifest.yml");
  });

  it("treats the all-comments init template as empty (defaults applied)", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, readFileSync(initTemplatePath, "utf-8"));
    const res = loadEvalConfig(repo);
    expect(res.config.evalsDir).toBe("evals");
    expect(res.config.static.framework).toBe("pytest");
    expect(res.config.runs.retention).toBe(30);
  });

  it("merges partial overrides over defaults", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, YAML.stringify({
      static: { framework: "vitest" },
      llm: { runtime: "node" },
      ignore: ["vendor/**"],
    }));
    const res = loadEvalConfig(repo);
    expect(res.config.static.framework).toBe("vitest");
    expect(res.config.llm.runtime).toBe("node");
    expect(res.config.ignore).toEqual(["vendor/**"]);
    expect(res.config.evalsDir).toBe("evals");
    expect(res.config.llm.model.id).toBe("composer-2.5");
  });

  it("rejects legacy llm.strategy via additionalProperties: false", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, YAML.stringify({
      llm: { strategy: "code" },
    }));
    expect(() => loadEvalConfig(repo)).toThrow(ConfigValidationError);
    try {
      loadEvalConfig(repo);
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigValidationError);
      const err = e as ConfigValidationError;
      const hasAdditional = err.errors.some(
        (it) => it.keyword === "additionalProperties" &&
          (it.params as { additionalProperty?: string }).additionalProperty === "strategy",
      );
      expect(hasAdditional).toBe(true);
    }
  });

  it("rejects legacy llm.codeFramework via additionalProperties: false", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, YAML.stringify({
      llm: { codeFramework: "vitest" },
    }));
    expect(() => loadEvalConfig(repo)).toThrow(ConfigValidationError);
    try {
      loadEvalConfig(repo);
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigValidationError);
      const err = e as ConfigValidationError;
      const hasAdditional = err.errors.some(
        (it) => it.keyword === "additionalProperties" &&
          (it.params as { additionalProperty?: string }).additionalProperty === "codeFramework",
      );
      expect(hasAdditional).toBe(true);
    }
  });

  it("accepts a config without llm.strategy / llm.codeFramework (single-backend default)", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, YAML.stringify({
      static: { framework: "vitest" },
      llm: { runtime: "tsx", model: { id: "composer-2.5" } },
    }));
    const res = loadEvalConfig(repo);
    expect(res.config.static.framework).toBe("vitest");
    expect(res.config.llm.runtime).toBe("tsx");
    expect(res.config.llm.model.id).toBe("composer-2.5");
    expect((res.config.llm as Record<string, unknown>).strategy).toBeUndefined();
    expect((res.config.llm as Record<string, unknown>).codeFramework).toBeUndefined();
  });

  it("throws ConfigValidationError on invalid enum value", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, YAML.stringify({ static: { framework: "mocha" } }));
    expect(() => loadEvalConfig(repo)).toThrow(ConfigValidationError);
    try {
      loadEvalConfig(repo);
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigValidationError);
      expect((e as ConfigValidationError).errors.length).toBeGreaterThan(0);
    }
  });

  it("throws ConfigValidationError on non-mapping root", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, "- 1\n- 2\n");
    expect(() => loadEvalConfig(repo)).toThrow(ConfigValidationError);
  });

  it("rejects preserveUserAuthoredCases: false via const constraint", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, YAML.stringify({
      update: { preserveUserAuthoredCases: false, writeMetaMarker: true },
    }));
    expect(() => loadEvalConfig(repo)).toThrow(ConfigValidationError);
  });

  it("returns reloaded true when mtime differs from prevMtimeMs", () => {
    const repo = tempRepo();
    writeRepoConfig(repo, YAML.stringify({ evalsDir: "evals" }));
    const first = loadEvalConfig(repo);
    expect(first.reloaded).toBe(true);

    const second = loadEvalConfig(repo, first.mtimeMs);
    expect(second.reloaded).toBe(false);

    const third = loadEvalConfig(repo, first.mtimeMs - 1);
    expect(third.reloaded).toBe(true);
  });
});

describe("migrateFromLegacy", () => {
  it("moves .zoto-eval-system/ to .zoto/eval-system/ and converts config.json to YAML", () => {
    const repo = tempRepo();
    const legacyDir = join(repo, ".zoto-eval-system");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(join(legacyDir, "config.json"), '{ "evalsDir": "my-evals" }', "utf-8");

    const result = migrateFromLegacy(repo);

    expect(result.migrated).toBe(true);
    expect(existsSync(legacyDir)).toBe(false);
    expect(existsSync(join(repo, ".zoto", "eval-system", "config.yml"))).toBe(true);
    expect(existsSync(join(repo, ".zoto", "eval-system", "config.json"))).toBe(false);

    const content = readFileSync(join(repo, ".zoto", "eval-system", "config.yml"), "utf-8");
    expect(YAML.parse(content)).toMatchObject({ evalsDir: "my-evals" });
    expect(content).not.toContain("{");
    expect(content).toContain("evalsDir: my-evals");
  });

  it("does not clobber when new dir already exists (conflict)", () => {
    const repo = tempRepo();
    mkdirSync(join(repo, ".zoto-eval-system"), { recursive: true });
    writeFileSync(join(repo, ".zoto-eval-system", "config.json"), "{}", "utf-8");
    mkdirSync(join(repo, ".zoto", "eval-system"), { recursive: true });
    writeFileSync(join(repo, ".zoto", "eval-system", "config.yml"), "evalsDir: custom\n", "utf-8");

    const result = migrateFromLegacy(repo);

    expect(result.migrated).toBe(false);
    expect(result.conflict).toBe(true);
    expect(readFileSync(join(repo, ".zoto", "eval-system", "config.yml"), "utf-8")).toContain("custom");
  });

  it("is a no-op when only the new dir exists", () => {
    const repo = tempRepo();
    const result = migrateFromLegacy(repo);
    expect(result.migrated).toBe(false);
    expect(result.conflict).toBeUndefined();
  });

  it("loadEvalConfig auto-migrates then reads the converted config", () => {
    const repo = tempRepo();
    const legacyDir = join(repo, ".zoto-eval-system");
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(
      join(legacyDir, "config.json"),
      JSON.stringify({ static: { framework: "vitest" }, llm: { runtime: "node" } }),
      "utf-8",
    );

    const res = loadEvalConfig(repo);

    expect(existsSync(legacyDir)).toBe(false);
    expect(res.config.static.framework).toBe("vitest");
    expect(res.config.llm.runtime).toBe("node");
    expect(res.mtimeMs).not.toBe(0);
  });
});
