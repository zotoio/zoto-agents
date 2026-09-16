/**
 * Stamp-trust Vitest gate — refuses silent-green on truncated stamps and
 * `#eval-engine` alias drift.
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { stampUnifiedLlmHarness } from "../scripts/stamp-unified-llm-harness.ts";
import {
  assertStampTrust,
  checkEngineAliasAlignment,
  checkHarnessCompleteness,
  EVAL_ENGINE_ALIAS_DRIFT,
  EVAL_STAMP_TRUNCATED,
  readStampManifest,
  StampTrustError,
} from "../scripts/stamp-trust-gate.ts";

const PLUGIN_DIR = resolve(import.meta.dirname, "..");
const REPO_ROOT = resolve(PLUGIN_DIR, "..", "..");

function seedHost(repoRoot: string): string {
  mkdirSync(join(repoRoot, ".zoto", "eval-system"), { recursive: true });
  writeFileSync(
    join(repoRoot, ".zoto", "eval-system", "config.yml"),
    "schema_version: 1\nstatic:\n  framework: vitest\n",
    "utf-8",
  );
  cpSync(join(PLUGIN_DIR, "templates"), join(repoRoot, "plugins", "zoto-eval-system", "templates"), {
    recursive: true,
  });
  mkdirSync(join(repoRoot, "plugins", "zoto-eval-system", "engine"), { recursive: true });
  writeFileSync(
    join(repoRoot, "plugins", "zoto-eval-system", "engine", "runner.ts"),
    "export {};\n",
    "utf-8",
  );
  writeFileSync(
    join(repoRoot, "plugins", "zoto-eval-system", "package.json"),
    JSON.stringify({ name: "@zoto-agents/zoto-eval-system", version: "9.9.9-test" }),
    "utf-8",
  );
  return join(repoRoot, "evals");
}

function stampCompleteHarness(repoRoot: string): string {
  seedHost(repoRoot);
  const result = stampUnifiedLlmHarness({ repoRoot });
  expect(result.written.length + result.unchanged.length).toBeGreaterThan(0);
  return result.evalsDir;
}

function expectSignal(fn: () => void, signal: string): void {
  try {
    fn();
    throw new Error(`expected ${signal} but no error was thrown`);
  } catch (error) {
    expect(error).toBeInstanceOf(StampTrustError);
    const trustError = error as StampTrustError;
    expect(trustError.signal).toBe(signal);
    expect(trustError.message).toContain(signal);
  }
}

describe("stamp-trust gate", () => {
  it("exports stable UX signal codes", () => {
    expect(EVAL_STAMP_TRUNCATED).toBe("eval_stamp_truncated");
    expect(EVAL_ENGINE_ALIAS_DRIFT).toBe("eval_engine_alias_drift");
  });

  it("passes when stamp is complete and engine root matches", () => {
    const host = mkdtempSync(join(tmpdir(), "stamp-trust-ok-"));
    try {
      const evalsDir = stampCompleteHarness(host);
      const manifest = readStampManifest(evalsDir);
      expect(manifest).not.toBeNull();

      assertStampTrust({
        evalsDir,
        resolveEvalEngineRoot: () => manifest!.engine_root,
      });
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });

  it(`fails with ${EVAL_STAMP_TRUNCATED} when sandbox shim is missing`, () => {
    const host = mkdtempSync(join(tmpdir(), "stamp-trust-missing-"));
    try {
      const evalsDir = stampCompleteHarness(host);
      unlinkSync(join(evalsDir, "_llm", "sandbox.ts"));

      expectSignal(
        () =>
          assertStampTrust({
            evalsDir,
            resolveEvalEngineRoot: () =>
              readStampManifest(evalsDir)!.engine_root,
          }),
        EVAL_STAMP_TRUNCATED,
      );
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });

  it(`fails with ${EVAL_STAMP_TRUNCATED} when vitest.config.ts is truncated`, () => {
    const host = mkdtempSync(join(tmpdir(), "stamp-trust-trunc-"));
    try {
      const evalsDir = stampCompleteHarness(host);
      const configPath = join(evalsDir, "vitest.config.ts");
      const body = readFileSync(configPath, "utf-8");
      writeFileSync(configPath, body.slice(0, Math.floor(body.length / 3)), "utf-8");

      const err = checkHarnessCompleteness(evalsDir);
      expect(err).not.toBeNull();
      expect(err!.signal).toBe(EVAL_STAMP_TRUNCATED);
      expect(err!.message).toContain(EVAL_STAMP_TRUNCATED);
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });

  it(`fails with ${EVAL_ENGINE_ALIAS_DRIFT} when resolved engine root differs`, () => {
    const host = mkdtempSync(join(tmpdir(), "stamp-trust-drift-"));
    try {
      const evalsDir = stampCompleteHarness(host);
      const manifest = readStampManifest(evalsDir)!;

      const altEngine = join(host, "alt-plugin", "engine");
      mkdirSync(altEngine, { recursive: true });
      writeFileSync(join(altEngine, "runner.ts"), "export {};\n", "utf-8");
      writeFileSync(
        join(host, "alt-plugin", "package.json"),
        JSON.stringify({ version: "0.0.1-alt" }),
        "utf-8",
      );

      const drift = checkEngineAliasAlignment(
        manifest.engine_root,
        altEngine,
        manifest.plugin_version,
        "0.0.1-alt",
      );
      expect(drift).not.toBeNull();
      expect(drift!.signal).toBe(EVAL_ENGINE_ALIAS_DRIFT);
      expect(drift!.message).toContain(EVAL_ENGINE_ALIAS_DRIFT);

      expectSignal(
        () =>
          assertStampTrust({
            evalsDir,
            resolveEvalEngineRoot: () => altEngine,
          }),
        EVAL_ENGINE_ALIAS_DRIFT,
      );
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });

  it("refuses vitest green on truncated stamp via setup hook", () => {
    const host = mkdtempSync(join(tmpdir(), "stamp-trust-vitest-"));
    try {
      const evalsDir = stampCompleteHarness(host);
      unlinkSync(join(evalsDir, "_llm", "sandbox.ts"));

      writeFileSync(
        join(host, "package.json"),
        JSON.stringify({ name: "stamp-trust-host", private: true, type: "module" }),
        "utf-8",
      );
      cpSync(join(REPO_ROOT, "node_modules"), join(host, "node_modules"), {
        recursive: true,
      });
      cpSync(
        join(REPO_ROOT, "evals", "smoke-static-eval.test.ts"),
        join(evalsDir, "smoke-static-eval.test.ts"),
      );

      const vitestBin = join(REPO_ROOT, "node_modules", "vitest", "vitest.mjs");
      let output = "";
      let exitCode = 0;
      try {
        execFileSync(
          process.execPath,
          [
            vitestBin,
            "run",
            "--config",
            join(evalsDir, "vitest.config.ts"),
            join(evalsDir, "smoke-static-eval.test.ts"),
          ],
          {
            cwd: host,
            encoding: "utf-8",
            stdio: "pipe",
            timeout: 120_000,
            env: {
              ...process.env,
              ZOTO_EVAL_PLUGIN_ROOT: join(host, "plugins", "zoto-eval-system"),
            },
          },
        );
      } catch (error) {
        const execError = error as {
          status?: number;
          stdout?: string;
          stderr?: string;
        };
        exitCode = execError.status ?? 1;
        output = `${execError.stdout ?? ""}\n${execError.stderr ?? ""}`;
      }

      expect(exitCode).not.toBe(0);
      expect(output).toContain(EVAL_STAMP_TRUNCATED);
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });
});
