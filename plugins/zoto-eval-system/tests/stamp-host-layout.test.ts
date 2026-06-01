import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";

import {
  patchConfigHostLayout,
  stampHostLayout,
  stampRootEvalAliases,
} from "../scripts/stamp-host-layout.js";

const PLUGIN_DIR = join(import.meta.dirname, "..");
const MONOREPO_ROOT = join(PLUGIN_DIR, "../..");

function tempRepo(): string {
  return mkdtempSync(join(tmpdir(), "zoto-eject-"));
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

describe("stamp-host-layout eject CLI", () => {
  it("copies runtime dirs and sets hostLayout: ejected", () => {
    const repo = tempRepo();
    try {
      writeMinimalHost(repo);
      const result = stampHostLayout({
        repoRoot: repo,
        pluginRoot: PLUGIN_DIR,
        forceScripts: true,
      });

      expect(existsSync(join(result.evalHome, "src"))).toBe(true);
      expect(existsSync(join(result.evalHome, "engine"))).toBe(true);
      expect(existsSync(join(result.evalHome, "templates"))).toBe(true);
      expect(existsSync(join(result.evalHome, "scripts", "eval-discover.ts"))).toBe(true);
      expect(existsSync(join(result.evalHome, "package.json"))).toBe(true);
      expect(existsSync(join(result.evalHome, "agents"))).toBe(false);

      const config = parseYaml(readFileSync(join(result.evalHome, "config.yml"), "utf-8")) as {
        hostLayout: string;
      };
      expect(config.hostLayout).toBe("ejected");
      expect(result.configPatched).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("does not write files on --dry-run", () => {
    const repo = tempRepo();
    try {
      writeMinimalHost(repo);
      const configBefore = readFileSync(join(repo, ".zoto", "eval-system", "config.yml"), "utf-8");
      const result = stampHostLayout({
        repoRoot: repo,
        pluginRoot: PLUGIN_DIR,
        dryRun: true,
      });

      expect(result.copied.length).toBeGreaterThan(0);
      expect(readFileSync(join(repo, ".zoto", "eval-system", "config.yml"), "utf-8")).toBe(
        configBefore,
      );
      expect(existsSync(join(result.evalHome, "engine", "runner.ts"))).toBe(false);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("updates root eval aliases to delegate to nested package", () => {
    const repo = tempRepo();
    try {
      writeMinimalHost(repo);
      writeFileSync(
        join(repo, "package.json"),
        JSON.stringify(
          {
            name: "host",
            scripts: {
              eval: "tsx plugins/zoto-eval-system/scripts/eval-orchestrate.ts",
              "eval:discover": "tsx plugins/zoto-eval-system/scripts/eval-discover.ts",
            },
          },
          null,
          2,
        ),
        "utf-8",
      );

      const aliases = stampRootEvalAliases(repo, PLUGIN_DIR, false);
      expect(aliases.updated.length).toBeGreaterThan(0);

      const pkg = JSON.parse(readFileSync(join(repo, "package.json"), "utf-8")) as {
        scripts: Record<string, string>;
      };
      expect(pkg.scripts.eval).toBe("pnpm -C .zoto/eval-system eval");
      expect(pkg.scripts["eval:discover"]).toBe("pnpm -C .zoto/eval-system eval:discover");
      expect(pkg.scripts["eval:stamp-host-layout"]).toBe(
        "pnpm -C .zoto/eval-system eval:stamp-host-layout",
      );
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("preserves config comments when patching hostLayout", () => {
    const repo = tempRepo();
    try {
      const evalHome = join(repo, ".zoto", "eval-system");
      mkdirSync(evalHome, { recursive: true });
      const configPath = join(evalHome, "config.yml");
      writeFileSync(configPath, "# operator notes\nhostLayout: plugin\n", "utf-8");

      patchConfigHostLayout(evalHome, "ejected", false);
      const patched = readFileSync(configPath, "utf-8");
      expect(patched).toContain("# operator notes");
      expect(patched).toContain("hostLayout: ejected");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("resolves plugin from monorepo plugins/ when pluginRoot omitted", () => {
    const repo = tempRepo();
    try {
      mkdirSync(join(repo, "plugins"), { recursive: true });
      cpSync(PLUGIN_DIR, join(repo, "plugins", "zoto-eval-system"), { recursive: true });
      writeMinimalHost(repo);

      const result = stampHostLayout({ repoRoot: repo, forceScripts: true });
      expect(result.pluginRoot).toBe(join(repo, "plugins", "zoto-eval-system"));
      expect(existsSync(join(result.evalHome, "engine", "runner.ts"))).toBe(true);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});
