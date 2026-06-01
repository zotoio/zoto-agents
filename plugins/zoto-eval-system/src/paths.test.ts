import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEvalConfig } from "./config-loader.js";
import {
  collectCursorPluginCandidates,
  resolveEvalPaths,
  resolveConfiguredPath,
  resolveHostRepoRoot,
  resolvePluginRoot,
} from "./paths.js";

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

function stubPluginRoot(base: string, version = "1.0.0"): void {
  mkdirSync(join(base, "templates"), { recursive: true });
  writeFileSync(join(base, "templates", ".gitkeep"), "", "utf-8");
  writeFileSync(
    join(base, "package.json"),
    JSON.stringify({ name: "@zoto-agents/zoto-eval-system", version }),
    "utf-8",
  );
}

describe("resolveEvalPaths", () => {
  it("detects plugin layout when evals/conftest.py lives at repo root", () => {
    const repo = tempRepo();
    const configPath = writeConfig(repo);
    mkdirSync(join(repo, "evals"), { recursive: true });
    writeFileSync(join(repo, "evals", "conftest.py"), "# pytest\n", "utf-8");

    const { config } = loadEvalConfig(repo);
    const paths = resolveEvalPaths(repo, config, configPath);

    expect(paths.layout).toBe("plugin");
    expect(paths.evalsDirAbs).toBe(join(repo, "evals"));
    expect(paths.evalsDirRel).toBe("evals");
    expect(paths.scriptsDirAbs).toBe(join(repo, "scripts"));
  });

  it("detects ejected layout when scripts live under eval home", () => {
    const repo = tempRepo();
    const configPath = writeConfig(repo);
    const evalHome = join(repo, ".zoto", "eval-system");
    mkdirSync(join(evalHome, "scripts"), { recursive: true });
    writeFileSync(join(evalHome, "scripts", "eval-discover.ts"), "// stub\n", "utf-8");
    mkdirSync(join(evalHome, "engine"), { recursive: true });
    writeFileSync(join(evalHome, "engine", "runner.ts"), "// stub\n", "utf-8");

    const { config } = loadEvalConfig(repo);
    const paths = resolveEvalPaths(repo, config, configPath);

    expect(paths.layout).toBe("ejected");
    expect(paths.evalsDirAbs).toBe(join(evalHome, "evals"));
    expect(paths.evalsDirRel).toBe(".zoto/eval-system/evals");
    expect(paths.scriptsDirAbs).toBe(join(evalHome, "scripts"));
    expect(paths.templatesDirAbs).toBe(join(evalHome, "templates"));
    expect(paths.engineDirAbs).toBe(join(evalHome, "engine"));
    expect(paths.cacheDirAbs).toBe(join(evalHome, "cache", "analyser"));
  });

  it("defaults greenfield installs to ejected evals under eval home", () => {
    const repo = tempRepo();
    const configPath = writeConfig(repo);
    const { config } = loadEvalConfig(repo);
    const paths = resolveEvalPaths(repo, config, configPath);

    expect(paths.layout).toBe("ejected");
    expect(paths.evalsDirAbs).toBe(join(repo, ".zoto", "eval-system", "evals"));
  });

  it("uses monorepo plugin templates in plugin layout", () => {
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

    expect(paths.layout).toBe("plugin");
    expect(paths.pluginRootAbs).toBe(join(repo, "plugins", "zoto-eval-system"));
    expect(paths.templatesDirAbs).toBe(join(repo, "plugins", "zoto-eval-system", "templates"));
    expect(existsSync(join(paths.templatesDirAbs, "schema", "result.schema.json"))).toBe(true);
  });

  it("sets pluginRootAbs to eval home in ejected layout", () => {
    const repo = tempRepo();
    const configPath = writeConfig(repo);
    const evalHome = join(repo, ".zoto", "eval-system");
    mkdirSync(join(evalHome, "scripts"), { recursive: true });
    writeFileSync(join(evalHome, "scripts", "eval-discover.ts"), "// stub\n", "utf-8");

    const { config } = loadEvalConfig(repo);
    const paths = resolveEvalPaths(repo, config, configPath);

    expect(paths.pluginRootAbs).toBe(evalHome);
  });
});

describe("resolvePluginRoot", () => {
  it("prefers monorepo plugins/zoto-eval-system over env and Cursor installs", () => {
    const repo = tempRepo();
    const monorepoPlugin = join(repo, "plugins", "zoto-eval-system");
    stubPluginRoot(monorepoPlugin, "9.0.0");

    const envPlugin = tempRepo();
    stubPluginRoot(envPlugin, "8.0.0");

    const cursorBase = tempRepo();
    const cursorPlugin = join(cursorBase, "zoto-eval-system");
    stubPluginRoot(cursorPlugin, "7.0.0");

    const resolved = resolvePluginRoot(repo, {
      env: { ZOTO_EVAL_PLUGIN_ROOT: envPlugin },
      cursorPluginsRoots: [cursorBase],
    });

    expect(resolved).toBe(monorepoPlugin);
  });

  it("uses ZOTO_EVAL_PLUGIN_ROOT when monorepo plugin is absent", () => {
    const repo = tempRepo();
    const envPlugin = tempRepo();
    stubPluginRoot(envPlugin, "2.0.0");

    const resolved = resolvePluginRoot(repo, {
      env: { ZOTO_EVAL_PLUGIN_ROOT: envPlugin },
      cursorPluginsRoots: [],
    });

    expect(resolved).toBe(envPlugin);
  });

  it("picks highest semver among Cursor install candidates", () => {
    const repo = tempRepo();
    const pluginsBase = tempRepo();

    const low = join(pluginsBase, "marketplace-a", "zoto-eval-system");
    stubPluginRoot(low, "1.0.0");

    const high = join(pluginsBase, "cache", "hash-b", "zoto-eval-system");
    stubPluginRoot(high, "2.5.0");

    const resolved = resolvePluginRoot(repo, {
      env: {},
      cursorPluginsRoots: [pluginsBase],
    });

    expect(resolved).toBe(high);
    expect(collectCursorPluginCandidates(pluginsBase)).toHaveLength(2);
  });

  it("falls back to newest mtime when semver is unavailable", () => {
    const repo = tempRepo();
    const pluginsBase = tempRepo();

    const older = join(pluginsBase, "zoto-eval-system");
    stubPluginRoot(older);
    writeFileSync(join(older, "package.json"), "{}", "utf-8");

    const newer = join(pluginsBase, "vendor-x", "zoto-eval-system");
    stubPluginRoot(newer);
    writeFileSync(join(newer, "package.json"), "{}", "utf-8");

    const oldTime = new Date("2020-01-01");
    const newTime = new Date("2024-06-01");
    utimesSync(older, oldTime, oldTime);
    utimesSync(newer, newTime, newTime);

    const resolved = resolvePluginRoot(repo, {
      env: {},
      cursorPluginsRoots: [pluginsBase],
    });

    expect(resolved).toBe(newer);
  });

  it("throws an actionable error when nothing resolves", () => {
    const repo = tempRepo();
    expect(() =>
      resolvePluginRoot(repo, { env: {}, cursorPluginsRoots: [tempRepo()] }),
    ).toThrow(/Cannot resolve zoto-eval-system plugin/);
    expect(() =>
      resolvePluginRoot(repo, { env: {}, cursorPluginsRoots: [tempRepo()] }),
    ).toThrow(/ZOTO_EVAL_PLUGIN_ROOT/);
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
  it("honours ZOTO_EVAL_HOST_REPO when set", () => {
    const repo = tempRepo();
    const prev = process.env.ZOTO_EVAL_HOST_REPO;
    process.env.ZOTO_EVAL_HOST_REPO = repo;
    try {
      expect(resolveHostRepoRoot("/tmp/anywhere")).toBe(repo);
    } finally {
      if (prev === undefined) delete process.env.ZOTO_EVAL_HOST_REPO;
      else process.env.ZOTO_EVAL_HOST_REPO = prev;
    }
  });

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
