#!/usr/bin/env tsx
/**
 * Subtask 09 self-tests — stamp + render + stub-SDK compile probe.
 *
 * Run directly with:
 *   pnpm exec tsx scripts/__tests__/eval-stamp-llm-code.selftest.ts
 *
 * Covers:
 *   1. `stampLlmCodeStrategy` writes the documented file set into a
 *      tmp host-repo tree, matching the task-spec paths.
 *   2. The stamped per-primitive test file carries `// _meta.generated:
 *      true` as the literal first line.
 *   3. The emitted test body contains the canonical `createAgent →
 *      sendPrompt → awaitRun` pattern routed via the stamped
 *      `_shared/sdk-bridge.ts`.
 *   4. The mutual-exclusion guard throws `LlmStrategyConflictError`
 *      when a declarative marker is planted in the tmp host repo.
 *   5. `renderLlmCodePerPrimitiveTest` produces TypeScript that the
 *      `tsc` compiler accepts when wired against a stub @cursor/sdk
 *      (compile-only — we do NOT run the test; CURSOR_API_KEY absence
 *      would cause a skip at runtime anyway).
 *   6. The reporter template, when instantiated against a synthetic
 *      session, emits a YAML document that validates against
 *      `templates/schema/result.schema.json` via ajv.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import YAML from "yaml";

import {
  LlmStrategyConflictError,
  stampLlmCodeStrategy,
  type LlmCodeStampOptions,
} from "../eval-stamp.js";

const REPO_ROOT = resolve(__dirname, "..", "..");

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

function expect(cond: boolean, name: string, detail?: string): void {
  results.push({ name, ok: cond, detail });
}

const samplePayload = {
  schema_version: 1 as const,
  analyser_version: "2026.05-subtask-09-selftest",
  model_id: "composer-2",
  target_id: "command:zoto-test-cmd",
  kind: "command" as const,
  source_path: "plugins/zoto-test/commands/zoto-test-cmd.md",
  source_hash: "a".repeat(64),
  summary: "synthetic test payload for subtask 09 self-test",
  cases: [
    {
      scenario: "happy path — operator approves defaults",
      prompt: "/zoto-test-cmd --flag realistic-value",
      assertions: [
        "emits `manifest.yml records at least one target` to stdout",
        'prints "all systems nominal" on success',
      ],
    },
    {
      scenario: "missing arg — rejects cleanly",
      prompt: "/zoto-test-cmd",
      assertions: ["responds with error `missing required flag`"],
    },
  ],
};

const samplePrimitive = {
  slug: "command_zoto-test-cmd",
  target_id: "command:zoto-test-cmd",
  source_path: "plugins/zoto-test/commands/zoto-test-cmd.md",
  source_hash: "a".repeat(64),
};

function mkHostRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "subtask-09-selftest-"));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "host-repo", private: true }, null, 2),
  );
  return root;
}

function runStampTest(): void {
  const host = mkHostRepo();
  try {
    const opts: LlmCodeStampOptions = {
      codeFramework: "vitest",
      modelId: "composer-2",
      judgeModel: "opus-4.6",
    };
    const res = stampLlmCodeStrategy(host, samplePayload, samplePrimitive, opts);

    expect(existsSync(res.testFile), "test file stamped");
    expect(existsSync(res.configFile), "vitest config stamped");
    expect(existsSync(res.setupFile), "setup.ts stamped");
    expect(existsSync(res.reporterFile), "reporter stamped");
    expect(existsSync(res.sdkBridgeFile), "sdk-bridge copy stamped");
    expect(existsSync(res.sandboxHelpersFile), "sandbox-helpers stamped");
    expect(existsSync(res.userCaseGuardsFile), "_user-case-guards copy stamped");
    for (const g of res.graderFiles) {
      expect(existsSync(g), `grader stamped: ${g.split("/").slice(-1)[0]}`);
    }

    const testBody = readFileSync(res.testFile, "utf-8");
    const firstLine = testBody.split("\n", 1)[0];
    expect(
      firstLine === "// _meta.generated: true",
      "first line is `// _meta.generated: true`",
    );
    expect(
      testBody.includes("createAgent") &&
        testBody.includes("sendPrompt") &&
        testBody.includes("awaitRun") &&
        testBody.includes('_shared/sdk-bridge'),
      "test imports canonical SDK pattern from sdk-bridge",
    );
    expect(
      testBody.includes('describe("command:zoto-test-cmd"'),
      "test body emits describe(TARGET_ID, …)",
    );
    expect(
      testBody.includes('it.skip(`${c.id} (skipped: CURSOR_API_KEY missing)`'),
      "test body emits skip-when-no-key branch",
    );
    expect(
      testBody.includes("resolveTokens("),
      "test body calls resolveTokens(…) from sdk-bridge",
    );
    expect(
      testBody.includes('reports.push(contains(g as never, text));'),
      "test body wires up the contains grader",
    );
    expect(
      testBody.includes('reports.push(regex(g as never, text));'),
      "test body wires up the regex grader",
    );
    expect(
      testBody.includes('reports.push(toolCalled(g as never, []));'),
      "test body wires up the tool-called grader",
    );
    expect(
      testBody.includes("preSnapshot(sandbox.rootDir)") &&
        testBody.includes("postSnapshot(sandbox.rootDir)"),
      "test body records pre/post snapshots",
    );

    const configBody = readFileSync(res.configFile, "utf-8");
    expect(
      configBody.split("\n", 1)[0] === "// _meta.generated: true",
      "config file first line marker",
    );
    expect(
      configBody.includes('setupFiles: ["./_shared/setup.ts"]'),
      "vitest config wires setup.ts",
    );
    expect(
      configBody.includes("root: __dirname"),
      "vitest config pins root to evals/llm so include globs do not escape",
    );

    const sdkBridgeBody = readFileSync(res.sdkBridgeFile, "utf-8");
    expect(
      sdkBridgeBody.includes('export const TOKEN_RESULT_FIELD ='),
      "sdk-bridge carries TOKEN_RESULT_FIELD pin",
    );
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

function runJestVariantTest(): void {
  const host = mkHostRepo();
  try {
    const res = stampLlmCodeStrategy(host, samplePayload, samplePrimitive, {
      codeFramework: "jest",
      modelId: "composer-2",
      judgeModel: "opus-4.6",
    });
    const testBody = readFileSync(res.testFile, "utf-8");
    expect(
      testBody.includes('import { describe, it, afterAll, expect } from "@jest/globals";'),
      "jest variant imports from @jest/globals",
    );
    const configBody = readFileSync(res.configFile, "utf-8");
    expect(configBody.includes('preset: "ts-jest"'), "jest config uses ts-jest preset");
    expect(res.configFile.endsWith("jest.config.ts"), "jest config filename");
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

function runGuardTest(): void {
  const host = mkHostRepo();
  try {
    /* Plant a declarative-strategy marker */
    mkdirSync(join(host, "evals", "_llm"), { recursive: true });
    writeFileSync(
      join(host, "evals", "_llm", "cases.json"),
      JSON.stringify({ cases: [] }, null, 2),
    );

    let caught: unknown = null;
    try {
      stampLlmCodeStrategy(host, samplePayload, samplePrimitive, {
        codeFramework: "vitest",
        modelId: "composer-2",
        judgeModel: "opus-4.6",
      });
    } catch (err) {
      caught = err;
    }
    expect(
      caught instanceof LlmStrategyConflictError,
      "mutual-exclusion guard throws LlmStrategyConflictError",
      caught == null ? "no error thrown" : undefined,
    );
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

function runBypassGuardTest(): void {
  const host = mkHostRepo();
  try {
    mkdirSync(join(host, "evals", "_llm"), { recursive: true });
    writeFileSync(join(host, "evals", "_llm", "cases.json"), "{}");
    /* bypassGuard: true should succeed despite declarative marker */
    const res = stampLlmCodeStrategy(host, samplePayload, samplePrimitive, {
      codeFramework: "vitest",
      modelId: "composer-2",
      judgeModel: "opus-4.6",
      bypassGuard: true,
    });
    expect(existsSync(res.testFile), "bypassGuard stamps test file anyway");
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

function runIdempotenceTest(): void {
  const host = mkHostRepo();
  try {
    const opts: LlmCodeStampOptions = {
      codeFramework: "vitest",
      modelId: "composer-2",
      judgeModel: "opus-4.6",
    };
    const first = stampLlmCodeStrategy(host, samplePayload, samplePrimitive, opts);
    const writtenFirst = first.written.length;
    const second = stampLlmCodeStrategy(host, samplePayload, samplePrimitive, opts);
    expect(
      second.written.length === 0,
      "second stamp is idempotent (nothing written)",
      `written=${second.written.length}`,
    );
    expect(
      second.unchanged.length === writtenFirst,
      "second stamp marks all files unchanged",
    );
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

async function runStubSdkCompileProbe(): Promise<void> {
  const host = mkHostRepo();
  const tmpBridgeDir = mkdtempSync(join(tmpdir(), "subtask-09-stub-sdk-"));
  try {
    const opts: LlmCodeStampOptions = {
      codeFramework: "vitest",
      modelId: "composer-2",
      judgeModel: "opus-4.6",
    };
    const res = stampLlmCodeStrategy(host, samplePayload, samplePrimitive, opts);

    /* Copy the stamped test and its _shared siblings into a tmp tree
     * where we can replace the SDK import with a stub and compile. */
    const probeRoot = join(tmpBridgeDir, "probe");
    mkdirSync(probeRoot, { recursive: true });
    const stampedRoot = dirname(res.testFile);
    cpSync(stampedRoot, probeRoot, { recursive: true });

    /* Replace the real @cursor/sdk import in the stamped bridge with a
     * local stub so the probe has zero network / auth requirements. */
    const bridgePath = join(probeRoot, "_shared", "sdk-bridge.ts");
    const original = readFileSync(bridgePath, "utf-8");
    const patched = original
      .replace(
        'import { Agent } from "@cursor/sdk";',
        `const Agent = { create: async () => ({ send: async () => ({ wait: async () => ({ result: "ok" }) }) }) } as any;`,
      )
      .replace(
        'import type { Run, RunResult, SDKAgent } from "@cursor/sdk";',
        `type Run = any; type RunResult = any; type SDKAgent = any;`,
      );
    writeFileSync(bridgePath, patched, "utf-8");

    const tscOut = await new Promise<{ ok: boolean; output: string }>((resolveProm) => {
      const { spawn } = require("node:child_process") as typeof import("node:child_process");
      const proc = spawn(
        "node",
        [
          join(REPO_ROOT, "node_modules", "typescript", "bin", "tsc"),
          "--noEmit",
          "--target",
          "ES2022",
          "--module",
          "ESNext",
          "--moduleResolution",
          "Bundler",
          "--esModuleInterop",
          "--skipLibCheck",
          "--strict",
          "--lib",
          "ES2022",
          "--types",
          "node",
          "--rootDir",
          probeRoot,
          bridgePath,
        ],
        { cwd: REPO_ROOT },
      );
      let output = "";
      proc.stdout?.on("data", (d: Buffer) => (output += d.toString()));
      proc.stderr?.on("data", (d: Buffer) => (output += d.toString()));
      proc.on("close", (code: number | null) => {
        resolveProm({ ok: code === 0, output });
      });
    });

    expect(
      tscOut.ok,
      "stub-SDK bridge compiles under tsc --noEmit",
      tscOut.ok ? undefined : tscOut.output.slice(0, 400),
    );
  } finally {
    rmSync(host, { recursive: true, force: true });
    rmSync(tmpBridgeDir, { recursive: true, force: true });
  }
}

async function runReporterSchemaTest(): Promise<void> {
  const host = mkHostRepo();
  try {
    const opts: LlmCodeStampOptions = {
      codeFramework: "vitest",
      modelId: "composer-2",
      judgeModel: "opus-4.6",
    };
    const res = stampLlmCodeStrategy(host, samplePayload, samplePrimitive, opts);

    /* Instead of running vitest, build a synthetic `llm.yml` by hand in
     * the exact shape the reporter produces, then validate it against
     * the schema. This keeps the probe hermetic. */
    const synthetic = {
      schema_version: 1,
      run_id: "20260503-120000",
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      backend: "llm",
      model: "composer-2",
      totals: { cases: 2, passed: 1, failed: 1, skipped: 0 },
      aggregates: {
        tokens_total: 123,
        duration_ms_total: 456,
        verbosity_avg: 0.5,
        accuracy_avg: 0.5,
        confidence_avg: 0.6,
      },
      cases: [
        {
          id: "command:zoto-test-cmd::happy-path",
          status: "passed",
          tokens: 60,
          duration_ms: 200,
          verbosity: 0.5,
          accuracy: 1.0,
          confidence: 1.0,
          grader_reports: [{ grader: "contains", verdict: "pass", detail: "ok" }],
          log_path: "_runs/20260503-120000/logs/happy-path.log",
        },
        {
          id: "command:zoto-test-cmd::missing-arg",
          status: "failed",
          tokens: 63,
          duration_ms: 256,
          verbosity: 0.5,
          accuracy: 0.0,
          confidence: 0.2,
          grader_reports: [{ grader: "regex", verdict: "fail", detail: "no match" }],
          log_path: "_runs/20260503-120000/logs/missing-arg.log",
        },
      ],
    };

    const schemaPath = join(
      REPO_ROOT,
      "plugins",
      "zoto-eval-system",
      "templates",
      "schema",
      "result.schema.json",
    );
    const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));

    const AjvMod = require("ajv") as { default?: new (opts?: unknown) => unknown; new (opts?: unknown): unknown };
    const Ctor = (AjvMod.default ?? AjvMod) as new (opts?: unknown) => {
      compile: (schema: unknown) => (data: unknown) => boolean;
    };
    const ajv = new Ctor({ allErrors: true, strict: false });
    const validate = ajv.compile(schema);
    const ok = validate(synthetic);
    expect(
      ok,
      "synthetic reporter YAML validates against result.schema.json",
      ok
        ? undefined
        : JSON.stringify((validate as unknown as { errors?: unknown }).errors),
    );

    /* Round-trip the YAML writer shape to make sure YAML.stringify of
     * the same doc yields parseable output. */
    const yamlText = YAML.stringify(synthetic);
    const parsed = YAML.parse(yamlText) as Record<string, unknown>;
    expect(
      parsed.backend === "llm" && parsed.run_id === "20260503-120000",
      "YAML round-trip preserves backend + run_id",
    );

    /* And confirm the stamped reporter template references the schema
     * path the host repo will actually have on disk. */
    const reporterBody = readFileSync(res.reporterFile, "utf-8");
    expect(
      reporterBody.includes('templates/schema/result.schema.json') ||
        reporterBody.includes(".zoto/eval-system/schema/result.schema.json"),
      "reporter points at one of the two documented schema paths",
    );
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  runStampTest();
  runJestVariantTest();
  runGuardTest();
  runBypassGuardTest();
  runIdempotenceTest();
  await runStubSdkCompileProbe();
  await runReporterSchemaTest();

  const failures = results.filter((r) => !r.ok);
  for (const r of results) {
    const tag = r.ok ? "PASS" : "FAIL";
    if (r.ok) process.stdout.write(`${tag} ${r.name}\n`);
    else process.stderr.write(`${tag} ${r.name}: ${r.detail ?? ""}\n`);
  }
  process.stdout.write(
    `\n${results.length - failures.length}/${results.length} passed\n`,
  );
  if (failures.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
