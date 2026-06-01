#!/usr/bin/env tsx
/**
 * Targeted self-tests for `scripts/eval-orchestrate.ts` (subtask 12).
 *
 * Hand-rolled tsx-runnable runner — same shape as the other
 * scripts/__tests__/* files. Stubs the per-backend runners so the test
 * never spawns pytest / vitest / @cursor/sdk and only exercises the
 * merge + schema-validation + drift-hook contract.
 *
 *   pnpm exec tsx scripts/__tests__/eval-orchestrate.test.ts
 */
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

import YAML from "yaml";

import {
  buildMergedReport,
  computeRunStamp,
  loadResolvedConfig,
  orchestrate,
  parseArgs,
  validateAgainstResultSchema,
} from "../scripts/eval-orchestrate.ts";
import { computePlan } from "../scripts/eval-gc.ts";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function test(
  name: string,
  fn: () => void | Promise<void>,
): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (e) {
    const msg = e instanceof Error ? (e.stack ?? e.message) : String(e);
    results.push({ name, passed: false, error: msg });
    process.stdout.write(
      `  ✗ ${name}\n    ${msg.replace(/\n/g, "\n    ")}\n`,
    );
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

function makeStaticDoc(runId: string): Record<string, unknown> {
  return {
    schema_version: 1,
    run_id: runId,
    started_at: "2026-05-04T00:00:00Z",
    ended_at: "2026-05-04T00:00:01Z",
    backend: "static",
    totals: { cases: 3, passed: 3, failed: 0, skipped: 0 },
    aggregates: { tokens_total: 0, duration_ms_total: 42 },
    cases: [
      {
        id: "case-1",
        status: "passed",
        grader_reports: [{ grader: "pytest", verdict: "pass", detail: "" }],
      },
    ],
  };
}

function makeLlmDoc(runId: string): Record<string, unknown> {
  return {
    schema_version: 1,
    run_id: runId,
    started_at: "2026-05-04T00:00:01Z",
    ended_at: "2026-05-04T00:00:05Z",
    backend: "llm",
    model: "composer-2.5",
    totals: { cases: 2, passed: 1, failed: 1, skipped: 0 },
    aggregates: { tokens_total: 1500, duration_ms_total: 4000 },
    cases: [
      {
        id: "llm-1",
        status: "passed",
        grader_reports: [{ grader: "regex", verdict: "pass", detail: "" }],
      },
    ],
  };
}

async function run(): Promise<void> {
  process.stdout.write(
    "scripts/__tests__/eval-orchestrate.test.ts\n",
  );

  await test("parseArgs: defaults to static-only", () => {
    const a = parseArgs([]);
    assert(a.full === false, "full should be false");
    assert(a.llmOnly === false, "llmOnly should be false");
  });

  await test("parseArgs: --full and --model are wired", () => {
    const a = parseArgs(["--full", "--model", "claude-opus-4-8[]"]);
    assert(a.full === true, "full");
    assert(a.model === "claude-opus-4-8[]", "model");
  });

  await test("parseArgs: --llm-only implies --full", () => {
    const a = parseArgs(["--llm-only"]);
    assert(a.llmOnly === true, "llmOnly");
    assert(a.full === true, "full implied");
  });

  await test("parseArgs: legacy --strategy/--llm-strategy is warn-and-ignore (subtask 03)", () => {
    const origWrite = process.stderr.write.bind(process.stderr);
    const captured: string[] = [];
    (process.stderr as unknown as { write: typeof origWrite }).write = ((
      chunk: string | Uint8Array,
    ): boolean => {
      captured.push(typeof chunk === "string" ? chunk : chunk.toString());
      return true;
    }) as typeof origWrite;
    try {
      const a = parseArgs([
        "--strategy=code",
        "--full",
        "--llm-strategy",
        "declarative",
        "--model",
        "opus-4-6",
      ]);
      assert(a.full === true, "--full survives the legacy flags");
      assert(a.model === "opus-4-6", "--model survives the legacy flags");
      assert(
        !("strategy" in (a as Record<string, unknown>)),
        "OrchestrateArgs must not expose strategy",
      );
      const joined = captured.join("");
      assert(
        joined.includes("ignoring legacy '--strategy=code'"),
        `expected warn for --strategy=, got: ${joined}`,
      );
      assert(
        joined.includes("ignoring legacy '--llm-strategy'"),
        `expected warn for --llm-strategy, got: ${joined}`,
      );
    } finally {
      (process.stderr as unknown as { write: typeof origWrite }).write =
        origWrite;
    }
  });

  await test("computeRunStamp: stable shape YYYYMMDDTHHMMSSZ", () => {
    const { runId, runTs } = computeRunStamp(new Date(Date.UTC(2026, 4, 4, 1, 2, 3)));
    assert(runId === runTs, "runId === runTs");
    assert(/^[0-9]{8}T[0-9]{6}Z$/.test(runId), `unexpected stamp: ${runId}`);
  });

  await test("loadResolvedConfig: returns ResolvedConfig without legacy LLM strategy fields", () => {
    // Hermetic — uses a tmp host root rather than the live repo config, so this
    // assertion does not couple to subtask 01's parallel config.yml migration
    // state. Verifies the subtask-03 contract: ResolvedConfig no longer carries
    // llmStrategy / llmCodeFramework.
    const tmpRoot = mkdtempSync(join(tmpdir(), "zoto-orch-cfg-"));
    try {
      mkdirSync(join(tmpRoot, ".zoto", "eval-system"), { recursive: true });
      writeFileSync(
        join(tmpRoot, ".zoto", "eval-system", "config.yml"),
        YAML.stringify({
          evalsDir: "evals",
          static: { framework: "vitest" },
          llm: { model: { id: "composer-2.5" } },
          runs: { retention: 7 },
        }),
        "utf-8",
      );
      const cfg = loadResolvedConfig(tmpRoot);
      assert(typeof cfg.staticFramework === "string", "staticFramework");
      assert(cfg.retention === 7, `retention 7, got ${cfg.retention}`);
      assert(typeof cfg.modelId === "string", "modelId");
      assert(
        !("llmStrategy" in (cfg as Record<string, unknown>)),
        "ResolvedConfig must not expose llmStrategy after subtask 03",
      );
      assert(
        !("llmCodeFramework" in (cfg as Record<string, unknown>)),
        "ResolvedConfig must not expose llmCodeFramework after subtask 03",
      );
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  await test("buildMergedReport: backend=mixed when both backends present", () => {
    const sd = makeStaticDoc("X");
    const ld = makeLlmDoc("X");
    const doc = buildMergedReport({
      runId: "X",
      runTs: "X",
      runDir: "/tmp/x",
      startedAt: "2026-05-04T00:00:00Z",
      endedAt: "2026-05-04T00:00:10Z",
      staticDoc: sd as never,
      llmDoc: ld as never,
      staticPath: "/tmp/x/static.yml",
      llmPath: "/tmp/x/llm.yml",
      notes: [],
      modelId: "composer-2.5",
    });
    assert(doc.backend === "mixed", `backend should be mixed, got ${String(doc.backend)}`);
    assert(
      typeof doc.totals === "object" && doc.totals !== null,
      "totals object",
    );
    const t = doc.totals as Record<string, number>;
    assert(t.cases === 5, `cases sum 5, got ${t.cases}`);
    const report = doc.report as Record<string, unknown>;
    assert(report && typeof report === "object", "report object");
    assert("static" in report, "report.static");
    assert("llm" in report, "report.llm");
    validateAgainstResultSchema(doc, "merged");
  });

  await test("buildMergedReport: backend=static when LLM skipped", () => {
    const sd = makeStaticDoc("Y");
    const doc = buildMergedReport({
      runId: "Y",
      runTs: "Y",
      runDir: "/tmp/y",
      startedAt: "2026-05-04T00:00:00Z",
      endedAt: "2026-05-04T00:00:01Z",
      staticDoc: sd as never,
      llmDoc: null,
      staticPath: "/tmp/y/static.yml",
      llmPath: null,
      notes: ["llm_skip: CURSOR_API_KEY missing"],
      modelId: "composer-2.5",
    });
    assert(doc.backend === "static", `backend should be static`);
    const report = doc.report as Record<string, unknown>;
    assert(!("llm" in report), "report.llm absent on static-only");
    assert(typeof doc.notes === "string" && (doc.notes as string).includes("llm_skip"), "notes recorded");
    validateAgainstResultSchema(doc, "merged-static");
  });

  await test("orchestrate: full flow with stubbed runners writes 3 YAMLs + meta", async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "zoto-orch-"));
    try {
      const cfg = loadResolvedConfig(tmpRoot);
      mkdirSync(join(tmpRoot, cfg.evalsDir), { recursive: true });
      mkdirSync(join(tmpRoot, ".zoto", "eval-system"), { recursive: true });
      writeFileSync(
        join(tmpRoot, ".zoto", "eval-system", "config.yml"),
        YAML.stringify({
          evalsDir: "evals",
          static: { framework: "vitest" },
          llm: { model: { id: "composer-2.5" } },
          runs: { retention: 5 },
        }),
        "utf-8",
      );
      let vitestScriptSpawned: string | null = null;
      const result = await orchestrate({
        argv: ["--full"],
        now: new Date(Date.UTC(2026, 4, 4, 1, 2, 3)),
        cursorApiKeyPresent: true,
        hostRepoRoot: tmpRoot,
        spawnRunner: (script, env) => {
          assert(typeof env.ZOTO_EVAL_RUN_ID === "string" && env.ZOTO_EVAL_RUN_ID.length > 0, "ZOTO_EVAL_RUN_ID set");
          assert(typeof env.ZOTO_EVAL_RUN_TS === "string", "ZOTO_EVAL_RUN_TS set");
          assert(
            env.ZOTO_EVAL_LLM_STRATEGY === undefined,
            "subtask 03: orchestrator must not inject ZOTO_EVAL_LLM_STRATEGY",
          );
          assert(
            env.ZOTO_EVAL_LLM_CODE_FRAMEWORK === undefined,
            "subtask 03: orchestrator must not inject ZOTO_EVAL_LLM_CODE_FRAMEWORK",
          );
          const runDir = join(
            tmpRoot,
            loadResolvedConfig(tmpRoot).evalsDir,
            "_runs",
            env.ZOTO_EVAL_RUN_TS as string,
          );
          mkdirSync(runDir, { recursive: true });
          if (script === "eval:vitest") {
            vitestScriptSpawned = script;
            writeFileSync(
              join(runDir, "static.yml"),
              YAML.stringify(makeStaticDoc(env.ZOTO_EVAL_RUN_ID as string)),
              "utf-8",
            );
            writeFileSync(
              join(runDir, "llm.yml"),
              YAML.stringify(makeLlmDoc(env.ZOTO_EVAL_RUN_ID as string)),
              "utf-8",
            );
          } else {
            throw new Error(`unexpected spawn script: ${script}`);
          }
          return { exitCode: 0 };
        },
        spawnDrift: () => ({ exitCode: 0, stdout: "drift hook stub: clean" }),
      });
      assert(
        vitestScriptSpawned === "eval:vitest",
        "subtask 06: unified vitest dispatch must be the single 'eval:vitest' script",
      );
      assert(existsSync(result.reportPath), "report.yml exists");
      assert(
        result.staticReportPath && existsSync(result.staticReportPath),
        "static.yml exists",
      );
      assert(
        result.llmReportPath && existsSync(result.llmReportPath),
        "llm.yml exists",
      );
      const meta = JSON.parse(
        readFileSync(join(result.runDir, ".run-meta.json"), "utf-8"),
      );
      assert(meta.static_framework === "vitest", "meta static_framework");
      assert(
        !("llm_strategy" in meta),
        "subtask 03: .run-meta.json must not record llm_strategy",
      );
      assert(
        !("llm_codeFramework" in meta),
        "subtask 03: .run-meta.json must not record llm_codeFramework",
      );
      assert(typeof meta.git_ref === "string", "meta git_ref");

      const reportDoc = YAML.parse(readFileSync(result.reportPath, "utf-8"));
      assert(reportDoc.backend === "mixed", `backend mixed, got ${reportDoc.backend}`);
      assert(reportDoc.report?.static?.source_path === "static.yml", "static source_path");
      assert(reportDoc.report?.llm?.source_path === "llm.yml", "llm source_path");
      assert(reportDoc.drift?.status === "clean", "drift status clean");
      assert(result.exitCode === 0, `exitCode 0, got ${result.exitCode}`);

      const llmDoc = YAML.parse(
        readFileSync(result.llmReportPath, "utf-8"),
      );
      assert(llmDoc.drift?.status === "clean", "llm.yml drift overlay");
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  await test("orchestrate: --model sets ZOTO_EVAL_MODEL and forwards model CLI to LLM spawn only", async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "zoto-orch-model-"));
    try {
      const cfg = loadResolvedConfig(tmpRoot);
      mkdirSync(join(tmpRoot, cfg.evalsDir), { recursive: true });
      mkdirSync(join(tmpRoot, ".zoto", "eval-system"), { recursive: true });
      writeFileSync(
        join(tmpRoot, ".zoto", "eval-system", "config.yml"),
        YAML.stringify({
          evalsDir: "evals",
          static: { framework: "vitest" },
          llm: { model: { id: "composer-2.5" } },
          runs: { retention: 5 },
        }),
        "utf-8",
      );
      let vitestModelCli: string | undefined;
      const result = await orchestrate({
        argv: ["--full", "--model", "opus-4-6"],
        now: new Date(Date.UTC(2026, 4, 4, 4, 0, 0)),
        cursorApiKeyPresent: true,
        hostRepoRoot: tmpRoot,
        spawnRunner: (script, env, modelCli) => {
          assert(typeof env.ZOTO_EVAL_RUN_ID === "string", "ZOTO_EVAL_RUN_ID");
          const runDir = join(
            tmpRoot,
            loadResolvedConfig(tmpRoot).evalsDir,
            "_runs",
            env.ZOTO_EVAL_RUN_TS as string,
          );
          mkdirSync(runDir, { recursive: true });
          if (env.ZOTO_EVAL_MODEL !== "opus-4-6") {
            throw new Error(
              `expected ZOTO_EVAL_MODEL opus-4-6, got ${String(env.ZOTO_EVAL_MODEL)}`,
            );
          }
          if (script === "eval:vitest") {
            vitestModelCli = modelCli;
            writeFileSync(
              join(runDir, "static.yml"),
              YAML.stringify(makeStaticDoc(env.ZOTO_EVAL_RUN_ID as string)),
              "utf-8",
            );
            writeFileSync(
              join(runDir, "llm.yml"),
              YAML.stringify(makeLlmDoc(env.ZOTO_EVAL_RUN_ID as string)),
              "utf-8",
            );
          } else {
            throw new Error(`unexpected spawn script: ${script}`);
          }
          return { exitCode: 0 };
        },
        spawnDrift: () => ({ exitCode: 0, stdout: "drift hook stub: clean" }),
      });
      assert(vitestModelCli === "opus-4-6", "unified vitest spawn must forward --model");
      assert(result.exitCode === 0, `exitCode 0, got ${result.exitCode}`);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  await test("orchestrate: LLM skipped when CURSOR_API_KEY absent — backend=static + notes", async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "zoto-orch-static-"));
    try {
      const cfg = loadResolvedConfig(tmpRoot);
      mkdirSync(join(tmpRoot, cfg.evalsDir), { recursive: true });
      mkdirSync(join(tmpRoot, ".zoto", "eval-system"), { recursive: true });
      writeFileSync(
        join(tmpRoot, ".zoto", "eval-system", "config.yml"),
        YAML.stringify({
          evalsDir: "evals",
          static: { framework: "pytest" },
          llm: { model: { id: "composer-2.5" } },
          runs: { retention: 5 },
        }),
        "utf-8",
      );
      const result = await orchestrate({
        argv: ["--full"],
        now: new Date(Date.UTC(2026, 4, 4, 2, 0, 0)),
        cursorApiKeyPresent: false,
        hostRepoRoot: tmpRoot,
        spawnRunner: (script, env) => {
          if (script.startsWith("eval:static:")) {
            const runDir = join(
              tmpRoot,
              loadResolvedConfig(tmpRoot).evalsDir,
              "_runs",
              env.ZOTO_EVAL_RUN_TS as string,
            );
            mkdirSync(runDir, { recursive: true });
            writeFileSync(
              join(runDir, "static.yml"),
              YAML.stringify(makeStaticDoc(env.ZOTO_EVAL_RUN_ID as string)),
              "utf-8",
            );
          }
          return { exitCode: 0 };
        },
        spawnDrift: () => ({ exitCode: 0, stdout: "" }),
      });
      const reportDoc = YAML.parse(readFileSync(result.reportPath, "utf-8"));
      assert(reportDoc.backend === "static", `expected static backend, got ${reportDoc.backend}`);
      const notes = reportDoc.notes as string;
      assert(typeof notes === "string" && /CURSOR_API_KEY/i.test(notes), "notes mention CURSOR_API_KEY");
      assert(!("llm" in (reportDoc.report ?? {})), "report.llm absent");
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  await test("orchestrate: re-running creates a new <ts> folder", async () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "zoto-orch-rerun-"));
    try {
      const cfg = loadResolvedConfig(tmpRoot);
      mkdirSync(join(tmpRoot, cfg.evalsDir), { recursive: true });
      mkdirSync(join(tmpRoot, ".zoto", "eval-system"), { recursive: true });
      writeFileSync(
        join(tmpRoot, ".zoto", "eval-system", "config.yml"),
        YAML.stringify({
          evalsDir: "evals",
          static: { framework: "pytest" },
          llm: { model: { id: "composer-2.5" } },
        }),
        "utf-8",
      );
      const stub = {
        cursorApiKeyPresent: false,
        hostRepoRoot: tmpRoot,
        spawnRunner: (script: string, env: NodeJS.ProcessEnv) => {
          if (script.startsWith("eval:static:")) {
            const runDir = join(
              tmpRoot,
              loadResolvedConfig(tmpRoot).evalsDir,
              "_runs",
              env.ZOTO_EVAL_RUN_TS as string,
            );
            mkdirSync(runDir, { recursive: true });
            writeFileSync(
              join(runDir, "static.yml"),
              YAML.stringify(makeStaticDoc(env.ZOTO_EVAL_RUN_ID as string)),
              "utf-8",
            );
          }
          return { exitCode: 0 };
        },
        spawnDrift: () => ({ exitCode: 0, stdout: "" }),
      };
      const r1 = await orchestrate({
        ...stub,
        argv: [],
        now: new Date(Date.UTC(2026, 4, 4, 3, 0, 0)),
      });
      const r2 = await orchestrate({
        ...stub,
        argv: [],
        now: new Date(Date.UTC(2026, 4, 4, 3, 0, 1)),
      });
      assert(r1.runDir !== r2.runDir, "different run dirs");
      assert(existsSync(r1.reportPath), "r1 report exists");
      assert(existsSync(r2.reportPath), "r2 report exists");
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  await test("eval-gc: dry-run lists past-retention dirs without deleting", () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "zoto-gc-"));
    try {
      mkdirSync(join(tmpRoot, ".zoto", "eval-system"), { recursive: true });
      writeFileSync(
        join(tmpRoot, ".zoto", "eval-system", "config.yml"),
        YAML.stringify({ evalsDir: "evals", runs: { retention: 30 } }),
        "utf-8",
      );
      const cfg = loadResolvedConfig(tmpRoot);
      const runs = join(tmpRoot, cfg.evalsDir, "_runs");
      mkdirSync(runs, { recursive: true });
      // Create 5 fake run-folders; retention=2 → 3 candidates.
      for (const ts of [
        "20260101T000000Z",
        "20260102T000000Z",
        "20260103T000000Z",
        "20260104T000000Z",
        "20260105T000000Z",
      ]) {
        mkdirSync(join(runs, ts), { recursive: true });
      }
      const plan = computePlan({ apply: false, retention: 2, hostRepoRoot: tmpRoot });
      assert(plan.scanned === 5, `scanned 5, got ${plan.scanned}`);
      assert(plan.kept.length === 2, `kept 2, got ${plan.kept.length}`);
      assert(
        plan.deletionCandidates.length === 3,
        `deletion 3, got ${plan.deletionCandidates.length}`,
      );
      // Newest first: 0105 and 0104 kept.
      assert(plan.kept[0] === "20260105T000000Z", "newest kept");
      assert(plan.kept[1] === "20260104T000000Z", "next-newest kept");
      // Confirm no deletion happened (dry-run by default).
      for (const ts of plan.deletionCandidates) {
        assert(existsSync(join(runs, ts)), `${ts} still present`);
      }
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  await test("eval-gc: empty when no runs dir", () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), "zoto-gc-empty-"));
    try {
      const plan = computePlan({ apply: false, retention: 30, hostRepoRoot: tmpRoot });
      assert(plan.scanned === 0, "scanned 0");
      assert(plan.kept.length === 0, "kept 0");
      assert(plan.deletionCandidates.length === 0, "candidates 0");
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  process.stdout.write("\n");
  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    process.stdout.write(`FAILED: ${failed.length}/${results.length}\n`);
    process.exit(1);
  }
  process.stdout.write(`PASSED: ${results.length}/${results.length}\n`);
}

run().catch((e) => {
  process.stderr.write(`${(e as Error).stack ?? String(e)}\n`);
  process.exit(1);
});
