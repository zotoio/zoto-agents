import { spawn, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import YAML from "yaml";

const pluginRoot = join(import.meta.dirname, "..");

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
  const d = mkdtempSync(join(tmpdir(), "zoto-spec-cli-"));
  tmpDirs.push(d);
  return d;
}

function minimalSubtask01(): string {
  return YAML.stringify(
    {
      schema_version: 1,
      subtask_id: "01",
      feature: "t",
      assigned_agent: "a",
      model: "m",
      token_budget: 1,
      state: "completed",
      checklist: [],
      artifacts: [],
      errors: [],
      notes: "",
      extra: {},
      last_heartbeat: "2026-05-06T10:00:00.000Z",
    },
    { lineWidth: 0 },
  );
}

function runCli(
  repoRoot: string,
  args: string[],
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const tsxCli = join(pluginRoot, "node_modules/tsx/dist/cli.mjs");
    const child = spawn(
      process.execPath,
      [tsxCli, join(pluginRoot, "scripts/spec-aggregator.ts"), ...args, "--repo-root", repoRoot],
      {
        cwd: pluginRoot,
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (c) => {
      stdout += String(c);
    });
    child.stderr?.on("data", (c) => {
      stderr += String(c);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function writeQuickPollConfig(
  repo: string,
  specYaml = "spec:\n  parallelLimit: 4\naggregator:\n  pollIntervalMs: 250\n  debounceMs: 50\n",
): void {
  const cfgDir = join(repo, ".zoto", "spec-system");
  mkdirSync(cfgDir, { recursive: true });
  writeFileSync(join(cfgDir, "config.yml"), specYaml, "utf-8");
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function spawnAggregator(repoRoot: string, args: string[]): ChildProcess {
  const tsxCli = join(pluginRoot, "node_modules/tsx/dist/cli.mjs");
  return spawn(
    process.execPath,
    [
      tsxCli,
      join(pluginRoot, "scripts/spec-aggregator.ts"),
      ...args,
      "--repo-root",
      repoRoot,
    ],
    {
      cwd: pluginRoot,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

async function stopAggregator(child: ChildProcess, killAfterMs = 3000): Promise<void> {
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, killAfterMs);
    child.once("close", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGINT");
  });
}

describe("spec-aggregator CLI", () => {
  it("writes status files with --once and exits 0", async () => {
    const repo = tempRepo();
    const specDir = join(repo, "spec-x");
    mkdirSync(join(specDir, "status"), { recursive: true });
    writeFileSync(join(specDir, "status", "subtask-01-x.status.yml"), minimalSubtask01(), "utf-8");

    const { code, stdout } = await runCli(repo, ["--spec-dir", specDir, "--once"]);
    expect(code).toBe(0);
    const j = JSON.parse(stdout) as { rebuilt: boolean };
    expect(j.rebuilt).toBe(true);
    expect(existsSync(join(specDir, "status.yml"))).toBe(true);
    expect(existsSync(join(specDir, "status.md"))).toBe(true);
  });

  it("resolves a relative --spec-dir against --repo-root, not CWD", async () => {
    const repo = tempRepo();
    const specDir = join(repo, "specs", "my-spec");
    mkdirSync(join(specDir, "status"), { recursive: true });
    writeFileSync(join(specDir, "status", "subtask-01-x.status.yml"), minimalSubtask01(), "utf-8");

    const { code, stdout } = await runCli(repo, ["--spec-dir", "specs/my-spec", "--once"]);
    expect(code).toBe(0);
    const j = JSON.parse(stdout) as { rebuilt: boolean; sourceCount: number };
    expect(j.rebuilt).toBe(true);
    expect(j.sourceCount).toBe(1);
    expect(existsSync(join(specDir, "status.yml"))).toBe(true);
  });

  it("exits non-zero with --validate-only when a source is malformed", async () => {
    const repo = tempRepo();
    const specDir = join(repo, "spec-y");
    mkdirSync(join(specDir, "status"), { recursive: true });
    writeFileSync(join(specDir, "status", "subtask-01-x.status.yml"), minimalSubtask01(), "utf-8");
    writeFileSync(join(specDir, "status", "bad.status.yml"), "{", "utf-8");

    const { code } = await runCli(repo, ["--spec-dir", specDir, "--validate-only"]);
    expect(code).toBe(2);
  });

  it("rebuilds on source mtime change under --watch and stops on SIGINT", async () => {
    const repo = tempRepo();
    writeQuickPollConfig(repo);

    const specDir = join(repo, "spec-z");
    mkdirSync(join(specDir, "status"), { recursive: true });
    const subPath = join(specDir, "status", "subtask-01-x.status.yml");
    writeFileSync(subPath, minimalSubtask01(), "utf-8");

    const child = spawnAggregator(repo, ["--spec-dir", specDir, "--watch"]);

    let y0: { updated_at: string; events?: { kind: string }[] } | undefined;
    for (let i = 0; i < 40; i++) {
      await delay(50);
      const p = join(specDir, "status.yml");
      if (existsSync(p)) {
        y0 = YAML.parse(readFileSync(p, "utf-8")) as typeof y0;
        break;
      }
    }
    expect(y0, "watch should materialize status.yml").toBeTruthy();

    const y1 = y0!;

    const t = Date.now();
    writeFileSync(subPath, minimalSubtask01(), "utf-8");
    const fs = await import("node:fs");
    fs.utimesSync(subPath, t + 180_000, t + 180_000);

    await delay(500);
    const y2 = YAML.parse(readFileSync(join(specDir, "status.yml"), "utf-8")) as { updated_at: string };

    await stopAggregator(child);

    const rebuilds = (y: { events?: { kind: string }[] }) =>
      (y.events ?? []).filter((e) => e.kind === "rebuild").length;
    expect(rebuilds(y2)).toBeGreaterThan(rebuilds(y1));
  });

  it(
    "watch mode writes spec-root status and exits on stopAggregator (smoke)",
    async () => {
      const repo = tempRepo();
      writeQuickPollConfig(repo);
      const specDir = join(repo, "smoke-w");
      mkdirSync(join(specDir, "status"), { recursive: true });
      writeFileSync(join(specDir, "status", "subtask-01-x.status.yml"), minimalSubtask01(), "utf-8");

      const child = spawnAggregator(repo, ["--spec-dir", specDir, "--watch"]);
      let seen = false;
      for (let i = 0; i < 80; i++) {
        await delay(50);
        if (existsSync(join(specDir, "status.yml")) && existsSync(join(specDir, "status.md"))) {
          seen = true;
          break;
        }
      }
      expect(seen, "watch should write spec-root status pair").toBe(true);
      await stopAggregator(child);

      expect(existsSync(join(specDir, "status.yml"))).toBe(true);
      expect(existsSync(join(specDir, "status.md"))).toBe(true);
    },
    15_000,
  );

  it(
    "watch emits config_reloaded event after .zoto/spec-system/config.yml mtime advances",
    async () => {
      const repo = tempRepo();
      writeQuickPollConfig(
        repo,
        "spec:\n  parallelLimit: 2\naggregator:\n  pollIntervalMs: 250\n  debounceMs: 50\n",
      );

      const specDir = join(repo, "spec-cfg");
      mkdirSync(join(specDir, "status"), { recursive: true });
      writeFileSync(
        join(specDir, "status", "subtask-01-x.status.yml"),
        minimalSubtask01(),
        "utf-8",
      );

      const child = spawnAggregator(repo, ["--spec-dir", specDir, "--watch"]);

      const statusYmlPath = join(specDir, "status.yml");
      let bootstrapped = false;
      for (let i = 0; i < 80; i++) {
        await delay(50);
        if (existsSync(statusYmlPath)) {
          bootstrapped = true;
          break;
        }
      }
      expect(bootstrapped, "watch should bootstrap status.yml").toBe(true);

      const cfgPath = join(repo, ".zoto", "spec-system", "config.yml");
      writeFileSync(
        cfgPath,
        "spec:\n  parallelLimit: 9\naggregator:\n  pollIntervalMs: 250\n  debounceMs: 50\n",
        "utf-8",
      );
      const fs = await import("node:fs");
      const future = Date.now() + 180_000;
      fs.utimesSync(cfgPath, future / 1000, future / 1000);

      let yml:
        | { config_reloaded: { mtime: string }[]; events: { kind: string }[] }
        | undefined;
      for (let i = 0; i < 80; i++) {
        await delay(100);
        const raw = YAML.parse(readFileSync(statusYmlPath, "utf-8")) as typeof yml;
        if (
          raw?.config_reloaded?.length &&
          raw.events.some((e) => e.kind === "config_reloaded")
        ) {
          yml = raw;
          break;
        }
      }

      await stopAggregator(child);

      expect(yml?.config_reloaded.length ?? 0).toBeGreaterThanOrEqual(1);
      expect(yml?.events.some((e) => e.kind === "config_reloaded")).toBe(true);
    },
    25_000,
  );

  it(
    "watch emits config_reload_failed event when reloaded config violates schema (continues with last good config)",
    async () => {
      const repo = tempRepo();
      writeQuickPollConfig(repo);

      const specDir = join(repo, "spec-badcfg");
      mkdirSync(join(specDir, "status"), { recursive: true });
      writeFileSync(
        join(specDir, "status", "subtask-01-x.status.yml"),
        minimalSubtask01(),
        "utf-8",
      );

      const child = spawnAggregator(repo, ["--spec-dir", specDir, "--watch"]);

      const statusYmlPath = join(specDir, "status.yml");
      let bootstrapped = false;
      for (let i = 0; i < 80; i++) {
        await delay(50);
        if (existsSync(statusYmlPath)) {
          bootstrapped = true;
          break;
        }
      }
      expect(bootstrapped, "watch should bootstrap status.yml").toBe(true);

      const cfgPath = join(repo, ".zoto", "spec-system", "config.yml");
      writeFileSync(cfgPath, "[]", "utf-8");
      const fs = await import("node:fs");
      const future = Date.now() + 180_000;
      fs.utimesSync(cfgPath, future / 1000, future / 1000);

      let yml: { events: { kind: string; message: string }[] } | undefined;
      for (let i = 0; i < 80; i++) {
        await delay(100);
        const raw = YAML.parse(readFileSync(statusYmlPath, "utf-8")) as typeof yml;
        if (raw?.events.some((e) => e.kind === "config_reload_failed")) {
          yml = raw;
          break;
        }
      }

      await stopAggregator(child);

      expect(yml?.events.some((e) => e.kind === "config_reload_failed")).toBe(true);
    },
    25_000,
  );
});
