import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import { unEjectHostLayout, isEjectedLayout } from "../scripts/eval-un-eject.js";
import { stampHostLayout } from "../scripts/stamp-host-layout.js";

const PLUGIN_DIR = join(import.meta.dirname, "..");

function tempRepo(): string {
  return mkdtempSync(join(tmpdir(), "zoto-uneject-"));
}

function writeMinimalHost(repo: string): void {
  mkdirSync(join(repo, ".zoto", "eval-system"), { recursive: true });
  writeFileSync(
    join(repo, ".zoto", "eval-system", "config.yml"),
    "# host config\nhostLayout: plugin\ndiscovery:\n  skillsRoots: []\n",
    "utf-8",
  );
  writeFileSync(
    join(repo, "package.json"),
    JSON.stringify({ name: "host", version: "1.0.0", scripts: { build: "tsc" } }, null, 2),
    "utf-8",
  );
}

describe("eval-un-eject CLI", () => {
  it("round-trips eject → un-eject", () => {
    const repo = tempRepo();
    try {
      mkdirSync(join(repo, "plugins"), { recursive: true });
      cpSync(PLUGIN_DIR, join(repo, "plugins", "zoto-eval-system"), { recursive: true });
      writeMinimalHost(repo);

      stampHostLayout({
        repoRoot: repo,
        pluginRoot: join(repo, "plugins", "zoto-eval-system"),
        forceScripts: true,
      });

      const evalHome = join(repo, ".zoto", "eval-system");
      expect(isEjectedLayout(evalHome)).toBe(true);

      const result = unEjectHostLayout({
        repoRoot: repo,
        pluginRoot: join(repo, "plugins", "zoto-eval-system"),
      });

      expect(existsSync(join(evalHome, "src"))).toBe(false);
      expect(existsSync(join(evalHome, "engine"))).toBe(false);
      expect(existsSync(join(evalHome, "templates"))).toBe(false);
      expect(existsSync(join(evalHome, "scripts", "eval-discover.ts"))).toBe(false);
      expect(existsSync(join(evalHome, "scripts", "eval-bridge.ts"))).toBe(true);
      expect(existsSync(join(evalHome, "package.json"))).toBe(true);
      expect(existsSync(join(evalHome, "config.yml"))).toBe(true);

      const config = parseYaml(readFileSync(join(evalHome, "config.yml"), "utf-8")) as {
        hostLayout: string;
      };
      expect(config.hostLayout).toBe("plugin");
      expect(result.configPatched).toBe(true);

      const flatAgent = join(repo, ".cursor", "agents", "eval-sys--zoto-eval-analyser-subagent.md");
      const nestedAgentDir = join(repo, ".cursor", "agents", "eval-sys");
      expect(existsSync(flatAgent)).toBe(false);
      expect(existsSync(nestedAgentDir)).toBe(false);

      const pkg = JSON.parse(readFileSync(join(evalHome, "package.json"), "utf-8")) as {
        scripts: Record<string, string>;
      };
      expect(pkg.scripts.eval).toContain("eval-bridge");
      expect(isEjectedLayout(evalHome)).toBe(false);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("dry-run does not delete or patch config", () => {
    const repo = tempRepo();
    try {
      writeMinimalHost(repo);
      const evalHome = join(repo, ".zoto", "eval-system");
      mkdirSync(join(evalHome, "engine"), { recursive: true });
      writeFileSync(join(evalHome, "engine", "runner.ts"), "// stub\n", "utf-8");
      const configBefore = readFileSync(join(evalHome, "config.yml"), "utf-8");

      const result = unEjectHostLayout({
        repoRoot: repo,
        pluginRoot: PLUGIN_DIR,
        dryRun: true,
      });

      expect(result.deleted.length).toBeGreaterThan(0);
      expect(readFileSync(join(evalHome, "config.yml"), "utf-8")).toBe(configBefore);
      expect(existsSync(join(evalHome, "engine", "runner.ts"))).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("throws when plugin cannot be resolved", () => {
    const repo = tempRepo();
    const emptyPluginsRoot = mkdtempSync(join(tmpdir(), "zoto-no-plugins-"));
    try {
      writeMinimalHost(repo);
      mkdirSync(join(repo, ".zoto", "eval-system", "engine"), { recursive: true });
      writeFileSync(
        join(repo, ".zoto", "eval-system", "engine", "runner.ts"),
        "// stub\n",
        "utf-8",
      );

      expect(() =>
        unEjectHostLayout({
          repoRoot: repo,
          resolvePluginRootOptions: { env: {}, cursorPluginsRoots: [emptyPluginsRoot] },
        }),
      ).toThrow(/Cannot resolve zoto-eval-system plugin/);
    } finally {
      rmSync(repo, { recursive: true, force: true });
      rmSync(emptyPluginsRoot, { recursive: true, force: true });
    }
  });

  it("throws when host is not ejected", () => {
    const repo = tempRepo();
    try {
      mkdirSync(join(repo, "plugins"), { recursive: true });
      cpSync(PLUGIN_DIR, join(repo, "plugins", "zoto-eval-system"), { recursive: true });
      writeMinimalHost(repo);

      expect(() =>
        unEjectHostLayout({
          repoRoot: repo,
          pluginRoot: join(repo, "plugins", "zoto-eval-system"),
        }),
      ).toThrow(/not in ejected layout/);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
