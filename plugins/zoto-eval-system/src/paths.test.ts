import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEvalConfig } from "./config-loader.js";
import { resolveEvalPaths, resolveConfiguredPath, resolveHostRepoRoot } from "./paths.js";

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
  const dir = mkdtempSync(join(tmpdir(), "zoto-eval-paths-"));
  tmpDirs.push(dir);
  return dir;
}

function writeConfig(repo: string): string {
  const evalHome = join(repo, ".zoto", "eval-system");
  mkdirSync(evalHome, { recursive: true });
  writeFileSync(join(evalHome, "config.yml"), "evalsDir: evals\n", "utf-8");
  return join(evalHome, "config.yml");
}

describe("resolveEvalPaths", () => {
  it("detects legacy-root when evals/conftest.py lives at repo root", () => {
    const repo = tempRepo();
    const configPath = writeConfig(repo);
    mkdirSync(join(repo, "evals"), { recursive: true });
    writeFileSync(join(repo, "evals", "conftest.py"), "# pytest\n", "utf-8");

    const { config } = loadEvalConfig(repo);
    const paths = resolveEvalPaths(repo, config, configPath);

    expect(paths.layout).toBe("legacy-root");
    expect(paths.evalsDirAbs).toBe(join(repo, "evals"));
    expect(paths.evalsDirRel).toBe("evals");
    expect(paths.scriptsDirAbs).toBe(join(repo, "scripts"));
  });

  it("detects self-contained when scripts live under eval home", () => {
    const repo = tempRepo();
    const configPath = writeConfig(repo);
    const evalHome = join(repo, ".zoto", "eval-system");
    mkdirSync(join(evalHome, "scripts"), { recursive: true });
    writeFileSync(join(evalHome, "scripts", "eval-discover.ts"), "// stub\n", "utf-8");
    mkdirSync(join(evalHome, "engine"), { recursive: true });
    writeFileSync(join(evalHome, "engine", "runner.ts"), "// stub\n", "utf-8");

    const { config } = loadEvalConfig(repo);
    const paths = resolveEvalPaths(repo, config, configPath);

    expect(paths.layout).toBe("self-contained");
    expect(paths.evalsDirAbs).toBe(join(evalHome, "evals"));
    expect(paths.evalsDirRel).toBe(".zoto/eval-system/evals");
    expect(paths.scriptsDirAbs).toBe(join(evalHome, "scripts"));
    expect(paths.templatesDirAbs).toBe(join(evalHome, "templates"));
    expect(paths.engineDirAbs).toBe(join(evalHome, "engine"));
    expect(paths.cacheDirAbs).toBe(join(evalHome, "cache", "analyser"));
  });

  it("defaults greenfield installs to self-contained evals under eval home", () => {
    const repo = tempRepo();
    const configPath = writeConfig(repo);
    const { config } = loadEvalConfig(repo);
    const paths = resolveEvalPaths(repo, config, configPath);

    expect(paths.layout).toBe("self-contained");
    expect(paths.evalsDirAbs).toBe(join(repo, ".zoto", "eval-system", "evals"));
  });

  it("uses monorepo plugin templates in legacy-root layout", () => {
    const repo = tempRepo();
    const configPath = writeConfig(repo);
    mkdirSync(join(repo, "evals"), { recursive: true });
    writeFileSync(join(repo, "evals", "conftest.py"), "# pytest\n", "utf-8");
    mkdirSync(join(repo, "plugins", "zoto-eval-system", "templates", "schema"), {
      recursive: true,
    });
    writeFileSync(
      join(repo, "plugins", "zoto-eval-system", "templates", "schema", "result.schema.json"),
      "{}",
      "utf-8",
    );

    const { config } = loadEvalConfig(repo);
    const paths = resolveEvalPaths(repo, config, configPath);

    expect(paths.layout).toBe("legacy-root");
    expect(paths.templatesDirAbs).toBe(join(repo, "plugins", "zoto-eval-system", "templates"));
    expect(existsSync(join(paths.templatesDirAbs, "schema", "result.schema.json"))).toBe(true);
  });
});

describe("resolveConfiguredPath", () => {
  it("prefers eval-home-relative manifest paths for v3", () => {
    const repo = tempRepo();
    const evalHome = join(repo, ".zoto", "eval-system");
    mkdirSync(evalHome, { recursive: true });
    writeFileSync(join(evalHome, "manifest.yml"), "schema_version: 1\n", "utf-8");

    const resolved = resolveConfiguredPath(repo, evalHome, "manifest.yml");
    expect(resolved).toBe(join(evalHome, "manifest.yml"));
  });

  it("resolves legacy manifest paths from repo root", () => {
    const repo = tempRepo();
    const evalHome = join(repo, ".zoto", "eval-system");
    mkdirSync(evalHome, { recursive: true });
    mkdirSync(join(repo, ".zoto", "eval-system"), { recursive: true });
    writeFileSync(join(repo, ".zoto", "eval-system", "manifest.yml"), "schema_version: 1\n", "utf-8");

    const resolved = resolveConfiguredPath(
      repo,
      evalHome,
      ".zoto/eval-system/manifest.yml",
    );
    expect(resolved).toBe(join(repo, ".zoto", "eval-system", "manifest.yml"));
  });
});

describe("resolveHostRepoRoot", () => {
  it("returns repo root when cwd is the self-contained eval home", () => {
    const repo = tempRepo();
    const evalHome = join(repo, ".zoto", "eval-system");
    mkdirSync(join(evalHome, "engine"), { recursive: true });
    writeFileSync(join(evalHome, "config.yml"), "evalsDir: evals\n", "utf-8");
    writeFileSync(join(evalHome, "package.json"), "{}\n", "utf-8");
    writeFileSync(join(evalHome, "engine", "runner.ts"), "// stub\n", "utf-8");

    expect(resolveHostRepoRoot(evalHome)).toBe(repo);
  });
});
