import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { loadEvalConfig } from "../src/config-loader.js";
import { analyserAgentPath, resolveEvalPaths } from "../src/paths.js";
import { stampHostLayout } from "../scripts/stamp-host-layout.js";
import {
  DEFAULT_EJECTED_PRIMITIVES_LAYOUT,
  stampEjectedPrimitives,
} from "../scripts/stamp-primitives.js";

const PLUGIN_DIR = join(import.meta.dirname, "..");

function tempRepo(): string {
  return mkdtempSync(join(tmpdir(), "zoto-primitives-"));
}

function writeMinimalHost(repo: string): void {
  mkdirSync(join(repo, ".zoto", "eval-system"), { recursive: true });
  writeFileSync(
    join(repo, ".zoto", "eval-system", "config.yml"),
    "hostLayout: plugin\nevalsDir: evals\n",
    "utf-8",
  );
}

describe("stampEjectedPrimitives", () => {
  it("copies all agents, skills, and commands with flat-prefix layout by default", () => {
    const repo = tempRepo();
    try {
      const result = stampEjectedPrimitives({ repoRoot: repo, pluginRoot: PLUGIN_DIR });

      expect(result.layout).toBe(DEFAULT_EJECTED_PRIMITIVES_LAYOUT);
      expect(result.agents.length).toBe(8);
      expect(result.skills.length).toBe(9);
      expect(result.commands.length).toBe(13);

      const analyser = join(repo, ".cursor", "agents", "eval-sys--zoto-eval-analyser-subagent.md");
      expect(existsSync(analyser)).toBe(true);

      const skill = join(repo, ".cursor", "skills", "eval-sys--zoto-create-evals", "SKILL.md");
      expect(existsSync(skill)).toBe(true);

      const cmd = join(repo, ".cursor", "commands", "eval-sys--z-eval-init.md");
      expect(existsSync(cmd)).toBe(true);

      expect(existsSync(join(repo, ".zoto", "eval-system", "agents"))).toBe(false);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("supports nested eval-sys layout when explicitly requested", () => {
    const repo = tempRepo();
    try {
      const result = stampEjectedPrimitives({
        repoRoot: repo,
        pluginRoot: PLUGIN_DIR,
        layout: "nested",
      });

      expect(result.layout).toBe("nested");
      expect(
        existsSync(
          join(repo, ".cursor", "agents", "eval-sys", "zoto-eval-analyser-subagent.md"),
        ),
      ).toBe(true);
      expect(
        existsSync(join(repo, ".cursor", "skills", "eval-sys", "zoto-help-evals", "SKILL.md")),
      ).toBe(true);
      expect(existsSync(join(repo, ".cursor", "commands", "eval-sys", "z-eval-create.md"))).toBe(
        true,
      );
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("does not write files on dry-run", () => {
    const repo = tempRepo();
    try {
      const result = stampEjectedPrimitives({
        repoRoot: repo,
        pluginRoot: PLUGIN_DIR,
        dryRun: true,
      });

      expect(result.agents.length).toBe(8);
      expect(existsSync(join(repo, ".cursor"))).toBe(false);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe("stampHostLayout primitives integration", () => {
  it("stamps primitives as part of eject", () => {
    const repo = tempRepo();
    try {
      writeMinimalHost(repo);
      const result = stampHostLayout({
        repoRoot: repo,
        pluginRoot: PLUGIN_DIR,
        forceScripts: true,
      });

      expect(result.primitives).toBeDefined();
      expect(result.primitives!.agents.length).toBe(8);
      expect(
        existsSync(join(repo, ".cursor", "agents", "eval-sys--zoto-eval-analyser-subagent.md")),
      ).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

describe("analyserAgentPath ejected resolution", () => {
  it("prefers flat-prefix ejected agent over plugin source", () => {
    const repo = tempRepo();
    try {
      writeMinimalHost(repo);
      mkdirSync(join(repo, ".cursor", "agents"), { recursive: true });
      writeFileSync(
        join(repo, ".cursor", "agents", "eval-sys--zoto-eval-analyser-subagent.md"),
        "# ejected analyser\n",
        "utf-8",
      );

      const configPath = join(repo, ".zoto", "eval-system", "config.yml");
      const { config } = loadEvalConfig(repo);
      const paths = resolveEvalPaths(repo, config, configPath);

      expect(analyserAgentPath(paths)).toBe(
        join(repo, ".cursor", "agents", "eval-sys--zoto-eval-analyser-subagent.md"),
      );
      expect(readFileSync(analyserAgentPath(paths), "utf-8")).toContain("ejected analyser");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("resolves nested eval-sys agent when flat-prefix absent", () => {
    const repo = tempRepo();
    try {
      writeMinimalHost(repo);
      const nested = join(repo, ".cursor", "agents", "eval-sys", "zoto-eval-analyser-subagent.md");
      mkdirSync(join(repo, ".cursor", "agents", "eval-sys"), { recursive: true });
      writeFileSync(nested, "# nested\n", "utf-8");

      const configPath = join(repo, ".zoto", "eval-system", "config.yml");
      const { config } = loadEvalConfig(repo);
      const paths = resolveEvalPaths(repo, config, configPath);

      expect(analyserAgentPath(paths)).toBe(nested);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
