#!/usr/bin/env tsx
/**
 * Unit tests for the subtask 11 updater rewrite.
 *
 * Coverage:
 *   1. Mixed `evals.json` declarative case-level guard — user case
 *      preserved byte-identical, generated case refreshed.
 *   2. Code-strategy `*.test.ts` file-level guard — file lacking the
 *      `// _meta.generated: true` first line is byte-identical before
 *      and after `--apply`; file with the marker is regenerated.
 *   3. CI WARNING on stderr whenever CI skips fresh analysis (explicit
 *      `--no-analyser` or CI-default cached analyser behaviour).
 *   4. `--no-analyser` declarative apply preserves
 *      `_meta.primitive_analysis.invalidate` from existing generated rows.
 *   5. Declarative surgical merge skips `JSON.stringify` when a generated
 *      row is already deep-equal to the stamped payload (buffer unchanged).
 *   6. Pytest regeneration skips `test_*.py` / `*.test.py` files that lack
 *      the `# _meta.generated: True` banner (same guard as other frameworks).
 *
 * Hand-rolled tsx-runnable harness — no global vitest/jest import — so
 * this can be executed standalone via:
 *
 *   pnpm exec tsx scripts/__tests__/eval-update-guards.test.ts
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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  regenerateLlmCode,
  regenerateLlmDeclarative,
  regeneratePytest,
  surgicallyReplaceGeneratedCases,
  type RegenerationCommonOpts,
} from "../../plugins/zoto-eval-system/engine/update.ts";
import { isGeneratedFile } from "../../plugins/zoto-eval-system/engine/_user-case-guards.ts";
import type { ManifestSnapshot } from "../../plugins/zoto-eval-system/engine/manifest-snapshot.ts";
import type { AnalyserPayload } from "../../scripts/eval-analyse.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..", "..");

interface TR {
  name: string;
  passed: boolean;
  err?: string;
}
const results: TR[] = [];

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (e) {
    const msg = e instanceof Error ? e.stack ?? e.message : String(e);
    results.push({ name, passed: false, err: msg });
    process.stdout.write(`  ✗ ${name}\n    ${msg.replace(/\n/g, "\n    ")}\n`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `assertEqual(${label}): expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function makePayload(targetId: string, sourceHash: string): AnalyserPayload {
  return {
    schema_version: 1,
    analyser_version: "test-1",
    model_id: "composer-2",
    target_id: targetId,
    kind: targetId.split(":")[0] as AnalyserPayload["kind"],
    source_path: `dummy/${targetId.replace(":", "_")}.md`,
    source_hash: sourceHash,
    summary: "regen test summary that is long enough to satisfy the gate",
    cases: [
      {
        scenario: "happy path regenerated",
        prompt:
          "Drive the primitive through its primary documented flow with realistic args.",
        assertions: ["Behaviour matched documented contract"],
        fixture_justifications: ["existing user case must remain untouched"],
      },
    ],
  };
}

function makeMockSnapshot(
  staticFw?: ManifestSnapshot["static"]["framework"],
  llmStrategy?: ManifestSnapshot["llm"]["strategy"],
): ManifestSnapshot {
  return {
    static: { framework: staticFw },
    llm: { strategy: llmStrategy, codeFramework: "vitest" },
    evalFiles: [],
    source: "manifest",
  };
}

function makeTarget(targetId: string, evalFile: string) {
  return {
    id: targetId,
    kind: targetId.split(":")[0],
    path: `dummy/${targetId.split(":")[1]}.md`,
    content_hash: "deadbeef",
    public_surface: {},
    eval_files: [evalFile],
  };
}

async function runSurgicalCaseGuardTest(): Promise<void> {
  // Mixed evals.json with: [user case, generated case].
  // After regen, the user case must be byte-identical and the
  // generated case must carry the new prompt.
  const mixed = JSON.stringify(
    {
      skill_name: "test-skill",
      evals: [
        {
          id: 1,
          prompt: "USER-AUTHORED prompt that must NEVER be touched.",
          assertions: ["user assertion stays exactly as-is"],
        },
        {
          id: 2,
          prompt: "OLD generated prompt that should be replaced.",
          assertions: ["old generated assertion"],
          _meta: {
            generated: true,
            source_hash: "stale",
            last_updated: "2024-01-01T00:00:00.000Z",
            generated_by: "zoto-create-evals",
            primitive_analysis: {
              source_hash: "0".repeat(64),
              analysed_at: "2024-01-01T00:00:00.000Z",
              analyser_version: "1",
              summary: "stale summary",
            },
          },
        },
      ],
    },
    null,
    2,
  ) + "\n";

  // Stamped row that the dispatcher would produce for case index 0.
  const stampedRow = {
    id: 1, // overwritten via positional replacement, value irrelevant
    prompt: "FRESH generated prompt from analyser regen.",
    assertions: ["fresh generated assertion"],
    _meta: {
      generated: true as const,
      source_hash: "f".repeat(64),
      last_updated: "2026-05-04T00:00:00.000Z",
      generated_by: "zoto-update-evals",
      primitive_analysis: {
        source_hash: "f".repeat(64),
        analysed_at: "2026-05-04T00:00:00.000Z",
        analyser_version: "test-1",
        summary: "regen summary that is long enough",
      },
    },
  };

  const result = surgicallyReplaceGeneratedCases(mixed, [stampedRow]);
  assertEqual(result.replaced, 1, "exactly one generated case replaced");
  assertEqual(result.userPreserved, 1, "exactly one user case preserved");
  assertEqual(result.removed, 0, "no removals");
  assertEqual(result.added, 0, "no additions");

  // Re-parse and verify the user case object is byte-identical (per its
  // canonical JSON serialisation) and the generated case carries new bytes.
  const before = JSON.parse(mixed);
  const after = JSON.parse(result.text);
  const userBefore = JSON.stringify(before.evals[0]);
  const userAfter = JSON.stringify(after.evals[0]);
  assertEqual(userAfter, userBefore, "user case byte-identical (canonical JSON)");
  assert(
    after.evals[1].prompt === "FRESH generated prompt from analyser regen.",
    "generated case prompt was refreshed",
  );
}

async function runSurgicalSkipIdenticalGeneratedRowTest(): Promise<void> {
  const mixed = JSON.stringify(
    {
      skill_name: "test-skill",
      evals: [
        {
          id: 1,
          prompt: "USER-AUTHORED prompt that must NEVER be touched.",
          assertions: ["user assertion stays exactly as-is"],
        },
        {
          id: 2,
          prompt: "Generated prompt that will not change semantically.",
          assertions: ["stable generated assertion"],
          _meta: {
            generated: true,
            source_hash: "same",
            last_updated: "2024-01-01T00:00:00.000Z",
            generated_by: "zoto-create-evals",
            primitive_analysis: {
              source_hash: "0".repeat(64),
              analysed_at: "2024-01-01T00:00:00.000Z",
              analyser_version: "1",
              summary: "unchanged summary",
            },
          },
        },
      ],
    },
    null,
    2,
  ) + "\n";

  const beforeParsed = JSON.parse(mixed) as {
    evals: [unknown, Record<string, unknown>];
  };
  const stampedRow = structuredClone(beforeParsed.evals[1]);

  const result = surgicallyReplaceGeneratedCases(mixed, [stampedRow]);
  assertEqual(result.replaced, 0, "deep-equal generated row is not rewritten");
  assertEqual(result.text, mixed, "entire JSON buffer byte-identical");
  assertEqual(result.userPreserved, 1, "exactly one user case preserved");
}

async function runPytestFileLevelGuardTest(): Promise<void> {
  const host = mkdtempSync(join(tmpdir(), "eval-update-pytest-guard-"));
  try {
    const evalsDir = join(host, "evals");
    mkdirSync(evalsDir, { recursive: true });
    const pyFile = join(evalsDir, "test_skill_user-authored.py");
    const userBody = ["def test_user():", "    assert True", ""].join("\n");
    writeFileSync(pyFile, userBody, "utf-8");

    assert(!isGeneratedFile(pyFile), "pytest file lacks marker — guard returns false");

    const target = makeTarget("skill:user-authored", "dummy/evals.json");
    const payload = makePayload("skill:user-authored", "f".repeat(64));
    const opts: RegenerationCommonOpts = {
      hostRepoRoot: host,
      payload,
      target,
      config: {},
      snapshot: makeMockSnapshot("pytest", undefined),
    };

    const report = regeneratePytest(opts);
    const after = readFileSync(pyFile, "utf-8");
    assertEqual(after, userBody, "user-authored pytest bytes preserved");
    assert(
      report.files_preserved.some((p) => p.endsWith("test_skill_user-authored.py")),
      `expected files_preserved to include pytest path (got: ${JSON.stringify(report)})`,
    );
    assert(
      report.notes.some((n) => /manual_merge_required/.test(n)),
      "manual_merge_required note emitted for pytest",
    );
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

async function runDotTestPyFileLevelGuardTest(): Promise<void> {
  const host = mkdtempSync(join(tmpdir(), "eval-update-dot-test-py-guard-"));
  try {
    const evalsDir = join(host, "evals");
    mkdirSync(evalsDir, { recursive: true });
    const pyFile = join(evalsDir, "user_skill.test.py");
    const userBody = ["def test_user():", "    assert True", ""].join("\n");
    writeFileSync(pyFile, userBody, "utf-8");

    assert(!isGeneratedFile(pyFile), ".test.py file lacks marker — guard returns false");
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

async function runFileLevelGuardTest(): Promise<void> {
  // Build a host repo skeleton. The helper writes to
  //   evals/llm/test_${kind}_${name-lowercased}.test.ts
  // so we pre-seed exactly that path with a user-authored file that
  // lacks the `// _meta.generated: true` marker.
  const host = mkdtempSync(join(tmpdir(), "eval-update-file-guard-"));
  try {
    const llmDir = join(host, "evals", "llm");
    mkdirSync(llmDir, { recursive: true });

    // Helper slug: `${kind}_${name.replace(/[^A-Za-z0-9_-]+/g,'-').toLowerCase()}`
    // Target id "agent:user-authored" → slug "agent_user-authored" → file
    // "test_agent_user-authored.test.ts"
    const userFile = join(llmDir, "test_agent_user-authored.test.ts");
    const userBody = [
      'import { describe, it, expect } from "vitest";',
      "describe('user-authored', () => {",
      "  it('keeps its bytes', () => { expect(1).toBe(1); });",
      "});",
      "",
    ].join("\n");
    writeFileSync(userFile, userBody, "utf-8");
    const userBefore = readFileSync(userFile, "utf-8");

    // Verify guard agrees this is user-authored
    assert(!isGeneratedFile(userFile), "user file lacks marker — guard returns false");

    const target = makeTarget(
      "agent:user-authored",
      "evals/llm/test_agent_user-authored.test.ts",
    );
    const payload = makePayload("agent:user-authored", "f".repeat(64));
    const opts: RegenerationCommonOpts = {
      hostRepoRoot: host,
      payload,
      target,
      config: { judgeModel: "opus-4.6", llm: { model: { id: "composer-2" } } },
      snapshot: makeMockSnapshot(undefined, "code"),
    };

    const report = regenerateLlmCode(opts);
    // Bytes must be identical — helper short-circuited on the guard.
    const userAfter = readFileSync(userFile, "utf-8");
    assertEqual(userAfter, userBefore, "user-authored file bytes preserved");
    assert(
      report.files_preserved.length >= 1,
      `user-authored file recorded under files_preserved (got: ${JSON.stringify(report)})`,
    );
    assert(
      report.notes.some((n) => /manual_merge_required/.test(n)),
      "manual_merge_required note emitted",
    );
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

async function runDeclarativeMixedHelperTest(): Promise<void> {
  // Wire the dispatcher helper end-to-end against a tmp repo with a real
  // mixed evals.json on disk. Confirm the user case is byte-identical
  // post-write and the generated case is replaced with the stamped row.
  const host = mkdtempSync(join(tmpdir(), "eval-update-decl-"));
  try {
    const evalDir = join(
      host,
      "plugins",
      "demo-plugin",
      "evals",
      "agents",
    );
    mkdirSync(evalDir, { recursive: true });
    const evalFile = join(evalDir, "demo-agent.json");

    const original = JSON.stringify(
      {
        agent_name: "demo-agent",
        evals: [
          {
            id: 1,
            prompt: "User-authored prompt that must remain intact verbatim.",
            assertions: ["preserve me"],
          },
          {
            id: 2,
            prompt: "Old generated prompt to be refreshed.",
            assertions: ["old"],
            _meta: {
              generated: true,
              source_hash: "stale",
              last_updated: "2024-01-01T00:00:00.000Z",
              generated_by: "zoto-create-evals",
              primitive_analysis: {
                source_hash: "0".repeat(64),
                analysed_at: "2024-01-01T00:00:00.000Z",
                analyser_version: "1",
                summary: "old summary",
              },
            },
          },
        ],
      },
      null,
      2,
    ) + "\n";
    writeFileSync(evalFile, original, "utf-8");

    const target = {
      id: "agent:demo-agent",
      kind: "agent",
      path: "plugins/demo-plugin/agents/demo-agent.md",
      content_hash: "deadbeef",
      public_surface: {},
      eval_files: ["plugins/demo-plugin/evals/agents/demo-agent.json"],
    };
    const payload = makePayload("agent:demo-agent", "f".repeat(64));

    const report = regenerateLlmDeclarative({
      hostRepoRoot: host,
      payload,
      target,
      config: {},
      snapshot: makeMockSnapshot(undefined, "declarative"),
    });

    assertEqual(report.cases_replaced, 1, "one generated case replaced");
    assertEqual(report.user_cases_preserved, 1, "one user case preserved");
    assert(report.files_written.length === 1, "evals.json written");

    const finalRaw = readFileSync(evalFile, "utf-8");
    const finalParsed = JSON.parse(finalRaw);
    const beforeParsed = JSON.parse(original);
    assertEqual(
      JSON.stringify(finalParsed.evals[0]),
      JSON.stringify(beforeParsed.evals[0]),
      "user case canonical JSON unchanged",
    );
    assert(
      finalParsed.evals[1].prompt.startsWith("Drive the primitive"),
      "generated case prompt refreshed",
    );
    assert(
      finalParsed.evals[1]._meta.generated === true,
      "regenerated case keeps _meta.generated true",
    );
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

async function runNoAnalyserPreservesInvalidateTest(): Promise<void> {
  const host = mkdtempSync(join(tmpdir(), "eval-update-no-analyser-inv-"));
  try {
    const evalDir = join(
      host,
      "plugins",
      "demo-plugin",
      "evals",
      "agents",
    );
    mkdirSync(evalDir, { recursive: true });
    const evalFile = join(evalDir, "demo-agent.json");

    const original = JSON.stringify(
      {
        agent_name: "demo-agent",
        evals: [
          {
            id: 1,
            prompt: "User row stays put.",
            assertions: ["keep"],
          },
          {
            id: 2,
            prompt: "Old generated prompt to be refreshed.",
            assertions: ["old"],
            _meta: {
              generated: true,
              source_hash: "stale",
              last_updated: "2024-01-01T00:00:00.000Z",
              generated_by: "zoto-create-evals",
              primitive_analysis: {
                source_hash: "0".repeat(64),
                analysed_at: "2024-01-01T00:00:00.000Z",
                analyser_version: "1",
                summary: "old summary",
                invalidate: true,
              },
            },
          },
        ],
      },
      null,
      2,
    ) + "\n";
    writeFileSync(evalFile, original, "utf-8");

    const target = {
      id: "agent:demo-agent",
      kind: "agent",
      path: "plugins/demo-plugin/agents/demo-agent.md",
      content_hash: "deadbeef",
      public_surface: {},
      eval_files: ["plugins/demo-plugin/evals/agents/demo-agent.json"],
    };
    const payload = makePayload("agent:demo-agent", "f".repeat(64));

    const report = regenerateLlmDeclarative({
      hostRepoRoot: host,
      payload,
      target,
      config: {},
      snapshot: makeMockSnapshot(undefined, "declarative"),
      noAnalyser: true,
    });

    assertEqual(report.cases_replaced, 1, "one generated case replaced");
    assert(report.files_written.length === 1, "evals.json written");

    const finalParsed = JSON.parse(readFileSync(evalFile, "utf-8"));
    assert(
      finalParsed.evals[1]._meta.primitive_analysis.invalidate === true,
      "cached-analyser regen preserves primitive_analysis.invalidate",
    );
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

async function runCiWarningImplicitCiDefaultTest(): Promise<void> {
  // CI implies cached analyser without passing --no-analyser explicitly.
  const r = spawnSync(
    "pnpm",
    ["exec", "tsx", "plugins/zoto-eval-system/engine/update.ts", "--check"],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, CI: "true" },
      encoding: "utf-8",
    },
  );
  const stderr = r.stderr ?? "";
  assert(stderr.includes("[CI WARNING]"), `expected [CI WARNING] in stderr`);
  assert(
    stderr.includes("skipping fresh primitive analysis"),
    `expected skipping-fresh wording, got: ${stderr.slice(0, 400)}`,
  );
  assert(
    stderr.includes(".zoto/eval-system/cache/analyser"),
    `expected cache path in stderr, got: ${stderr.slice(0, 400)}`,
  );
}

async function runCiExplicitNoAnalyserWarningTest(): Promise<void> {
  const r = spawnSync(
    "pnpm",
    ["exec", "tsx", "plugins/zoto-eval-system/engine/update.ts", "--check", "--no-analyser"],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, CI: "true" },
      encoding: "utf-8",
    },
  );
  const stderr = r.stderr ?? "";
  assert(
    stderr.includes("skipping fresh primitive analysis"),
    `expected skipping-fresh wording, got: ${stderr.slice(0, 400)}`,
  );
}

async function runCiWithAnalyserSkipsBannerTest(): Promise<void> {
  const r = spawnSync(
    "pnpm",
    [
      "exec",
      "tsx",
      "plugins/zoto-eval-system/engine/update.ts",
      "--check",
      "--with-analyser",
    ],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, CI: "true" },
      encoding: "utf-8",
    },
  );
  const stderr = r.stderr ?? "";
  assert(
    !stderr.includes("skipping fresh primitive analysis"),
    `unexpected cached-analyser stderr banner with --with-analyser (${stderr.slice(0, 200)})`,
  );
}

async function main(): Promise<void> {
  process.stdout.write("eval-update-guards.test\n");
  await test("surgical mixed-file case guard", runSurgicalCaseGuardTest);
  await test("surgical merge skips identical generated rows (no reserialise)", runSurgicalSkipIdenticalGeneratedRowTest);
  await test("declarative mixed-file end-to-end (regenerateLlmDeclarative)", runDeclarativeMixedHelperTest);
  await test("--no-analyser declarative regen preserves primitive_analysis.invalidate", runNoAnalyserPreservesInvalidateTest);
  await test("file-level guard preserves user-authored *.test.ts", runFileLevelGuardTest);
  await test("file-level guard preserves user-authored test_*.py (pytest regen)", runPytestFileLevelGuardTest);
  await test("isGeneratedFile rejects user-authored *.test.py without marker", runDotTestPyFileLevelGuardTest);
  await test("CI=true implies cached analyser + stderr skips-fresh banner", runCiWarningImplicitCiDefaultTest);
  await test("CI=true + explicit --no-analyser emits the same skips-fresh banner", runCiExplicitNoAnalyserWarningTest);
  await test("CI=true + --with-analyser omits skips-fresh cached banner", runCiWithAnalyserSkipsBannerTest);

  const failed = results.filter((r) => !r.passed);
  process.stdout.write(`\n${results.length - failed.length}/${results.length} passed\n`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  process.stderr.write(`fatal: ${(e as Error).stack ?? (e as Error).message}\n`);
  process.exit(2);
});

// keep tsc happy when imported elsewhere
export {};
// Touch existsSync so the import isn't flagged as unused on environments
// that strip dead imports during compile-time tree-shaking.
void existsSync;
