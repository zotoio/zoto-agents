/**
 * Integration tests for lean vs ejected dual host layout (subtask 09).
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import YAML, { parse as parseYaml } from "yaml";

import { loadEvalConfig, loadEvalPaths } from "../src/config-loader.js";
import { runUpdate, sha256, normaliseContent } from "../engine/update.js";
import { discover, manifestFor } from "../scripts/eval-discover.js";
import { stampLeanLayout } from "../scripts/stamp-lean-layout.js";
import { stampHostLayout } from "../scripts/stamp-host-layout.js";
import { unEjectHostLayout, isEjectedLayout } from "../scripts/eval-un-eject.js";

const PLUGIN_DIR = join(import.meta.dirname, "..");

const LEAN_FORBIDDEN_UNDER_EVAL_HOME = [
  "src",
  "engine",
  "templates",
  "agents",
] as const;

const LEAN_VENDORED_SCRIPT_MARKERS = [
  "scripts/eval-discover.ts",
  "scripts/eval-orchestrate.ts",
] as const;

const EJECTED_REQUIRED_UNDER_EVAL_HOME = [
  "src",
  "engine",
  "templates",
  "scripts/eval-discover.ts",
  "package.json",
] as const;

function tempRepo(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

function writeMinimalLeanHost(repo: string): void {
  mkdirSync(join(repo, ".zoto", "eval-system"), { recursive: true });
  writeFileSync(
    join(repo, ".zoto", "eval-system", "config.yml"),
    "hostLayout: plugin\nevalsDir: evals\nskillsRoots:\n  - plugins/*/skills\ndiscoveryTargets:\n  - skill\n",
    "utf-8",
  );
  writeFileSync(
    join(repo, "package.json"),
    JSON.stringify({ name: "lean-host", version: "0.0.0", private: true }, null, 2),
    "utf-8",
  );
}

function seedPluginCopy(repo: string): string {
  const pluginDest = join(repo, "plugins", "zoto-eval-system");
  mkdirSync(join(repo, "plugins"), { recursive: true });
  cpSync(PLUGIN_DIR, pluginDest, { recursive: true });
  return pluginDest;
}

function writePluginSkill(repo: string, slug: string, description: string): void {
  const dir = join(repo, "plugins", "demo-plugin", "skills", slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "SKILL.md"),
    `---\nname: ${slug}\ndescription: ${description}\n---\n\n# ${slug}\n`,
    "utf-8",
  );
}

describe("dual-host-layout integration", () => {
  it("lean create materialises only repo-specific assets", () => {
    const repo = tempRepo("zoto-dhl-lean-");
    try {
      seedPluginCopy(repo);
      writeMinimalLeanHost(repo);
      stampLeanLayout({ repoRoot: repo });

      const evalHome = join(repo, ".zoto", "eval-system");
      expect(existsSync(join(evalHome, "scripts", "eval-bridge.ts"))).toBe(true);
      expect(existsSync(join(evalHome, "package.json"))).toBe(true);
      expect(existsSync(join(evalHome, "cache", "analyser", ".gitkeep"))).toBe(true);
      expect(existsSync(join(evalHome, ".gitignore"))).toBe(true);
      expect(existsSync(join(repo, "evals", "_runs", ".gitkeep"))).toBe(true);
      expect(existsSync(join(repo, "scripts", "eval-bridge.ts"))).toBe(false);

      for (const rel of LEAN_FORBIDDEN_UNDER_EVAL_HOME) {
        expect(existsSync(join(evalHome, rel)), `unexpected ${rel} in lean layout`).toBe(false);
      }
      for (const rel of LEAN_VENDORED_SCRIPT_MARKERS) {
        expect(existsSync(join(evalHome, rel)), `unexpected ${rel} in lean layout`).toBe(false);
      }

      const paths = loadEvalPaths(repo);
      expect(paths.layout).toBe("plugin");
      expect(paths.pluginRootAbs).toBe(join(repo, "plugins", "zoto-eval-system"));
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("eject copies full runtime and stamps primitives", () => {
    const repo = tempRepo("zoto-dhl-eject-");
    try {
      const pluginRoot = seedPluginCopy(repo);
      writeMinimalLeanHost(repo);

      const result = stampHostLayout({
        repoRoot: repo,
        pluginRoot,
        forceScripts: true,
      });

      for (const rel of EJECTED_REQUIRED_UNDER_EVAL_HOME) {
        expect(existsSync(join(result.evalHome, rel)), `missing ejected ${rel}`).toBe(true);
      }

      const config = parseYaml(readFileSync(join(result.evalHome, "config.yml"), "utf-8")) as {
        hostLayout: string;
      };
      expect(config.hostLayout).toBe("ejected");
      expect(result.primitives?.agents.length).toBeGreaterThan(0);
      expect(
        existsSync(join(repo, ".cursor", "agents", "eval-sys--zoto-eval-analyser-subagent.md")),
      ).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("un-eject reverses eject (round-trip)", () => {
    const repo = tempRepo("zoto-dhl-roundtrip-");
    try {
      const pluginRoot = seedPluginCopy(repo);
      writeMinimalLeanHost(repo);

      stampHostLayout({ repoRoot: repo, pluginRoot, forceScripts: true });
      const evalHome = join(repo, ".zoto", "eval-system");
      expect(isEjectedLayout(evalHome)).toBe(true);

      unEjectHostLayout({ repoRoot: repo, pluginRoot });

      for (const rel of LEAN_FORBIDDEN_UNDER_EVAL_HOME) {
        expect(existsSync(join(evalHome, rel)), `${rel} should be removed`).toBe(false);
      }
      for (const rel of LEAN_VENDORED_SCRIPT_MARKERS) {
        expect(existsSync(join(evalHome, rel)), `${rel} should be removed`).toBe(false);
      }
      expect(existsSync(join(evalHome, "scripts", "eval-bridge.ts"))).toBe(true);
      expect(existsSync(join(evalHome, "package.json"))).toBe(true);
      expect(existsSync(join(evalHome, "config.yml"))).toBe(true);

      const config = parseYaml(readFileSync(join(evalHome, "config.yml"), "utf-8")) as {
        hostLayout: string;
      };
      expect(config.hostLayout).toBe("plugin");
      expect(isEjectedLayout(evalHome)).toBe(false);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("eval:discover works in lean monorepo-like layout", () => {
    const repo = tempRepo("zoto-dhl-discover-");
    try {
      seedPluginCopy(repo);
      writeMinimalLeanHost(repo);
      writePluginSkill(repo, "demo-skill", "Demo skill for lean discover");

      const cfg = loadEvalConfig(repo).config as unknown as Record<string, unknown>;
      const targets = discover(repo, cfg);
      const manifest = manifestFor(repo, cfg, "zoto-create-evals") as {
        discovery_config?: { layout?: string };
      };

      expect(manifest.discovery_config?.layout).toBe("plugin");
      const target = targets.find((t) => t.id === "skill:demo-skill");
      expect(target).toBeDefined();
      expect(target!.path).toBe("plugins/demo-plugin/skills/demo-skill/SKILL.md");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("eval:update --check exits 0 on clean lean host", () => {
    const repo = tempRepo("zoto-dhl-update-");
    try {
      seedPluginCopy(repo);
      writeMinimalLeanHost(repo);
      stampLeanLayout({ repoRoot: repo });
      writePluginSkill(repo, "demo-skill", "Stable description for drift check");

      const skillPath = join(repo, "plugins", "demo-plugin", "skills", "demo-skill", "SKILL.md");
      const hash = sha256(normaliseContent(readFileSync(skillPath, "utf-8")));
      const evalsDir = join(repo, "plugins", "demo-plugin", "skills", "demo-skill", "evals");
      mkdirSync(evalsDir, { recursive: true });
      writeFileSync(
        join(evalsDir, "evals.json"),
        JSON.stringify(
          {
            skill_name: "demo-skill",
            evals: [
              {
                id: 1,
                prompt: "generated",
                assertions: ["ok"],
                _meta: {
                  generated: true,
                  source_hash: hash,
                  last_updated: "2026-06-01T00:00:00Z",
                  generated_by: "zoto-create-evals",
                },
              },
            ],
          },
          null,
          2,
        ),
        "utf-8",
      );

      const cfg = loadEvalConfig(repo).config as unknown as Record<string, unknown>;
      const mf = manifestFor(repo, cfg, "zoto-create-evals");
      const evalHome = join(repo, ".zoto", "eval-system");
      writeFileSync(join(evalHome, "manifest.yml"), YAML.stringify(mf));
      writeFileSync(join(evalHome, "manifest.history.yml"), "---\n" + YAML.stringify(mf));

      const out = runUpdate({ repoRoot: repo, mode: "check", noAnalyser: true });
      expect(out.code).toBe(0);
      expect(out.deltas.filter((d) => d.critical)).toHaveLength(0);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
