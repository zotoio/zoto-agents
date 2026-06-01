#!/usr/bin/env tsx
/**
 * Unit tests for the eval-system updater (post single-backend collapse —
 * subtask 07 of `spec-eval-single-backend-colocated-restructure-20260526`).
 *
 * Coverage:
 *   1. Mixed `evals.json` declarative case-level guard — user case
 *      preserved byte-identical, generated case refreshed
 *      (`surgicallyReplaceGeneratedCases`).
 *   2. Skill-only declarative regen (`regenerateLlm` on `kind === "skill"`)
 *      — surgical merge into `evals.json`, preserving user-authored rows.
 *   3. `--no-analyser` skill regen preserves
 *      `_meta.primitive_analysis.invalidate` from existing generated rows.
 *   4. File-level guard (`regenerateLlm` on a non-skill primitive) —
 *      a co-located `<kind-dir>/evals/<name>.test.ts` lacking the
 *      `// _meta.generated: true` first line is byte-identical before
 *      and after `--apply`.
 *   5. New co-located path resolution (`llmTestPathForTarget`) returns
 *      `<kind-dir>/evals/<name>.test.ts` and `null` for skills.
 *   6. Layout drift detection (`detectLayoutDrift`) flags legacy
 *      `evals/llm/test_*.test.ts` files AND legacy
 *      `plugins/<plugin>/evals/{commands,agents,hooks}/<name>.json` files
 *      with the expected new co-located path in the message.
 *   7. CI WARNING on stderr whenever CI skips fresh analysis (explicit
 *      `--no-analyser` or CI-default cached analyser behaviour).
 *   8. Pytest regeneration skips `test_*.py` / `*.test.py` files that lack
 *      the `# _meta.generated: True` banner (file-level guard parity).
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
  detectLayoutDrift,
  llmTestPathForTarget,
  regenerateLlm,
  regeneratePytest,
  surgicallyReplaceGeneratedCases,
  type RegenerationCommonOpts,
} from "../engine/update.ts";
import { isGeneratedFile } from "../engine/_user-case-guards.ts";
import type { ManifestSnapshot } from "../engine/manifest-snapshot.ts";
import type { AnalyserPayload } from "../scripts/eval-analyse.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..", "..", "..");

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
    model_id: "composer-2.5",
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
): ManifestSnapshot {
  return {
    static: { framework: staticFw },
    evalFiles: [],
    source: "manifest",
  };
}

function makeTarget(targetId: string, evalFile: string, sourcePath?: string) {
  return {
    id: targetId,
    kind: targetId.split(":")[0],
    path: sourcePath ?? `dummy/${targetId.split(":")[1]}.md`,
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
      snapshot: makeMockSnapshot("pytest"),
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

async function runColocatedFileGuardTest(): Promise<void> {
  // Pre-seed the new co-located JSON path with a user-authored eval file
  // that lacks the `_meta.generated: true` marker. `regenerateLlm` MUST
  // recognise the JSON-level guard and preserve the bytes verbatim.
  const host = mkdtempSync(join(tmpdir(), "eval-update-colocated-guard-"));
  try {
    // Source-of-truth path for the agent primitive. `resolveTarget` reads
    // this so we need a real plugin layout with the source markdown beside
    // the `evals/` co-located directory.
    const pluginDir = join(host, "plugins", "demo-plugin");
    const agentsDir = join(pluginDir, "agents");
    const evalsDir = join(agentsDir, "evals");
    mkdirSync(evalsDir, { recursive: true });
    writeFileSync(
      join(agentsDir, "user-authored.md"),
      ["---", "name: user-authored", "description: demo agent", "---", "Body"].join(
        "\n",
      ) + "\n",
      "utf-8",
    );

    // The new co-located emit path (JSON-first single backend):
    // `<kind-dir>/evals/<name>.json`.
    const userFile = join(evalsDir, "user-authored.json");
    const userBody =
      JSON.stringify(
        {
          agent_name: "user-authored",
          evals: [
            {
              id: 1,
              prompt: "User-authored prompt that must remain intact verbatim.",
              assertions: ["preserve me"],
            },
          ],
        },
        null,
        2,
      ) + "\n";
    writeFileSync(userFile, userBody, "utf-8");
    const userBefore = readFileSync(userFile, "utf-8");

    // Sanity: the TS/PY file-level guard does not misfire on a JSON eval.
    assert(
      !isGeneratedFile(userFile),
      "user JSON lacks TS/PY marker — file-level guard returns false",
    );

    const target = makeTarget(
      "agent:user-authored",
      "plugins/demo-plugin/agents/evals/user-authored.json",
      "plugins/demo-plugin/agents/user-authored.md",
    );
    const payload = makePayload("agent:user-authored", "f".repeat(64));
    const opts: RegenerationCommonOpts = {
      hostRepoRoot: host,
      payload,
      target,
      config: { judgeModel: "claude-opus-4-8[]", llm: { model: { id: "composer-2.5" } } },
      snapshot: makeMockSnapshot(undefined),
    };

    const report = await regenerateLlm(opts);
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

async function runSkillSurgicalRegenTest(): Promise<void> {
  // Skills retain their `evals.json` (KD-1). `regenerateLlm` on a
  // skill target must surgically merge generated rows while preserving
  // user-authored rows byte-identical.
  const host = mkdtempSync(join(tmpdir(), "eval-update-skill-regen-"));
  try {
    const skillDir = join(host, "plugins", "demo-plugin", "skills", "demo-skill");
    const evalsDir = join(skillDir, "evals");
    mkdirSync(evalsDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      ["---", "name: demo-skill", "description: demo skill", "---", "Body"].join(
        "\n",
      ) + "\n",
      "utf-8",
    );
    const evalFile = join(evalsDir, "evals.json");

    const original = JSON.stringify(
      {
        skill_name: "demo-skill",
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

    const target = makeTarget(
      "skill:demo-skill",
      "plugins/demo-plugin/skills/demo-skill/evals/evals.json",
      "plugins/demo-plugin/skills/demo-skill/SKILL.md",
    );
    const payload = makePayload("skill:demo-skill", "f".repeat(64));

    const report = await regenerateLlm({
      hostRepoRoot: host,
      payload,
      target,
      config: {},
      snapshot: makeMockSnapshot(undefined),
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

async function runSkillNoAnalyserPreservesInvalidateTest(): Promise<void> {
  const host = mkdtempSync(join(tmpdir(), "eval-update-skill-no-analyser-inv-"));
  try {
    const skillDir = join(host, "plugins", "demo-plugin", "skills", "demo-skill");
    const evalsDir = join(skillDir, "evals");
    mkdirSync(evalsDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      ["---", "name: demo-skill", "description: demo skill", "---", "Body"].join(
        "\n",
      ) + "\n",
      "utf-8",
    );
    const evalFile = join(evalsDir, "evals.json");

    const original = JSON.stringify(
      {
        skill_name: "demo-skill",
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

    const target = makeTarget(
      "skill:demo-skill",
      "plugins/demo-plugin/skills/demo-skill/evals/evals.json",
      "plugins/demo-plugin/skills/demo-skill/SKILL.md",
    );
    const payload = makePayload("skill:demo-skill", "f".repeat(64));

    const report = await regenerateLlm({
      hostRepoRoot: host,
      payload,
      target,
      config: {},
      snapshot: makeMockSnapshot(undefined),
      noAnalyser: true,
    });

    assertEqual(report.cases_replaced, 1, "one generated case replaced");
    assert(report.files_written.length === 1, "evals.json written");

    const finalParsed = JSON.parse(readFileSync(evalFile, "utf-8"));
    assert(
      finalParsed.evals[1]._meta.primitive_analysis.invalidate === true,
      "cached-analyser skill regen preserves primitive_analysis.invalidate",
    );
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

async function runLlmTestPathForTargetTest(): Promise<void> {
  // `llmTestPathForTarget` MUST return the new co-located path
  // `<kind-dir>/evals/<name>.test.ts` and `null` for skills (KD-1).
  const host = mkdtempSync(join(tmpdir(), "eval-update-llm-path-"));
  try {
    const pluginDir = join(host, "plugins", "demo-plugin");
    mkdirSync(join(pluginDir, "agents"), { recursive: true });
    writeFileSync(
      join(pluginDir, "agents", "demo-agent.md"),
      ["---", "name: demo-agent", "description: demo agent", "---", "Body"].join(
        "\n",
      ) + "\n",
      "utf-8",
    );
    mkdirSync(join(pluginDir, "commands"), { recursive: true });
    writeFileSync(
      join(pluginDir, "commands", "z-demo.md"),
      ["---", "name: z-demo", "description: demo command", "---", "Body"].join(
        "\n",
      ) + "\n",
      "utf-8",
    );
    mkdirSync(join(pluginDir, "skills", "demo-skill"), { recursive: true });
    writeFileSync(
      join(pluginDir, "skills", "demo-skill", "SKILL.md"),
      ["---", "name: demo-skill", "description: demo skill", "---", "Body"].join(
        "\n",
      ) + "\n",
      "utf-8",
    );

    const agentPath = llmTestPathForTarget(host, "agent:demo-agent");
    assert(agentPath !== null, "agent path resolved");
    const expectedAgentPath = join(
      host,
      "plugins",
      "demo-plugin",
      "agents",
      "evals",
      "demo-agent.json",
    );
    assertEqual(agentPath, expectedAgentPath, "agent co-located path");

    const cmdPath = llmTestPathForTarget(host, "command:z-demo");
    assert(cmdPath !== null, "command path resolved");
    const expectedCmdPath = join(
      host,
      "plugins",
      "demo-plugin",
      "commands",
      "evals",
      "z-demo.json",
    );
    assertEqual(cmdPath, expectedCmdPath, "command co-located path");

    const skillPath = llmTestPathForTarget(host, "skill:demo-skill");
    assertEqual(
      skillPath,
      null,
      "skills retain evals.json — llmTestPathForTarget returns null",
    );
  } finally {
    rmSync(host, { recursive: true, force: true });
  }
}

async function runLayoutDriftDetectionTest(): Promise<void> {
  // Build a fixture host repo containing BOTH legacy locations:
  //   - `evals/llm/test_command_z-demo.test.ts`
  //   - `plugins/demo-plugin/evals/agents/demo-agent.json`
  // and confirm `detectLayoutDrift` flags each with the expected new
  // co-located path in the message.
  const host = mkdtempSync(join(tmpdir(), "eval-update-layout-drift-"));
  try {
    // Source primitives so `resolveTarget` can locate them.
    const cmdSourceDir = join(host, "plugins", "demo-plugin", "commands");
    const agentSourceDir = join(host, "plugins", "demo-plugin", "agents");
    mkdirSync(cmdSourceDir, { recursive: true });
    mkdirSync(agentSourceDir, { recursive: true });
    writeFileSync(
      join(cmdSourceDir, "z-demo.md"),
      ["---", "name: z-demo", "description: demo command", "---", "Body"].join(
        "\n",
      ) + "\n",
      "utf-8",
    );
    writeFileSync(
      join(agentSourceDir, "demo-agent.md"),
      ["---", "name: demo-agent", "description: demo agent", "---", "Body"].join(
        "\n",
      ) + "\n",
      "utf-8",
    );

    // Legacy LLM test path.
    const legacyLlmDir = join(host, "evals", "llm");
    mkdirSync(legacyLlmDir, { recursive: true });
    const legacyLlmTest = join(legacyLlmDir, "test_command_z-demo.test.ts");
    writeFileSync(legacyLlmTest, "// legacy LLM test\n", "utf-8");

    // Legacy declarative JSON path.
    const legacyJsonDir = join(host, "plugins", "demo-plugin", "evals", "agents");
    mkdirSync(legacyJsonDir, { recursive: true });
    const legacyJson = join(legacyJsonDir, "demo-agent.json");
    writeFileSync(
      legacyJson,
      JSON.stringify({ agent_name: "demo-agent", evals: [] }, null, 2) + "\n",
      "utf-8",
    );

    const targets = [
      makeTarget(
        "command:z-demo",
        "plugins/demo-plugin/commands/evals/z-demo.test.ts",
        "plugins/demo-plugin/commands/z-demo.md",
      ),
      makeTarget(
        "agent:demo-agent",
        "plugins/demo-plugin/agents/evals/demo-agent.test.ts",
        "plugins/demo-plugin/agents/demo-agent.md",
      ),
    ];

    const drifts = detectLayoutDrift(host, targets);

    const cmdDrift = drifts.find((d) => d.target_id === "command:z-demo");
    assert(cmdDrift !== undefined, "command:z-demo drift recorded");
    assertEqual(
      cmdDrift!.legacy_path,
      "evals/llm/test_command_z-demo.test.ts",
      "command legacy path matches central LLM tree",
    );
    assertEqual(
      cmdDrift!.new_path,
      "plugins/demo-plugin/commands/evals/z-demo.json",
      "command new path is the co-located eval",
    );
    assert(
      /drift: file at LEGACY path/.test(cmdDrift!.message),
      `command drift message contains 'drift: file at LEGACY path' (got: ${cmdDrift!.message})`,
    );
    assert(
      cmdDrift!.message.includes(cmdDrift!.legacy_path),
      "command drift message names the legacy path",
    );
    assert(
      cmdDrift!.message.includes(cmdDrift!.new_path),
      "command drift message names the new co-located path",
    );

    const agentDrift = drifts.find((d) => d.target_id === "agent:demo-agent");
    assert(agentDrift !== undefined, "agent:demo-agent drift recorded");
    assertEqual(
      agentDrift!.legacy_path,
      "plugins/demo-plugin/evals/agents/demo-agent.json",
      "agent legacy path matches central declarative JSON tree",
    );
    assertEqual(
      agentDrift!.new_path,
      "plugins/demo-plugin/agents/evals/demo-agent.json",
      "agent new path is the co-located eval",
    );
    assert(
      /drift: file at LEGACY path/.test(agentDrift!.message),
      `agent drift message contains 'drift: file at LEGACY path' (got: ${agentDrift!.message})`,
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
  await test(
    "surgical merge skips identical generated rows (no reserialise)",
    runSurgicalSkipIdenticalGeneratedRowTest,
  );
  await test(
    "skill regenerateLlm: surgical merge preserves user-authored evals.json rows",
    runSkillSurgicalRegenTest,
  );
  await test(
    "--no-analyser skill regen preserves primitive_analysis.invalidate",
    runSkillNoAnalyserPreservesInvalidateTest,
  );
  await test(
    "regenerateLlm file-level guard preserves user-authored co-located *.test.ts",
    runColocatedFileGuardTest,
  );
  await test(
    "llmTestPathForTarget returns the new co-located <kind-dir>/evals/<name>.test.ts",
    runLlmTestPathForTargetTest,
  );
  await test(
    "detectLayoutDrift flags legacy LLM tests + legacy declarative JSON",
    runLayoutDriftDetectionTest,
  );
  await test(
    "file-level guard preserves user-authored test_*.py (pytest regen)",
    runPytestFileLevelGuardTest,
  );
  await test(
    "isGeneratedFile rejects user-authored *.test.py without marker",
    runDotTestPyFileLevelGuardTest,
  );
  await test(
    "CI=true implies cached analyser + stderr skips-fresh banner",
    runCiWarningImplicitCiDefaultTest,
  );
  await test(
    "CI=true + explicit --no-analyser emits the same skips-fresh banner",
    runCiExplicitNoAnalyserWarningTest,
  );
  await test(
    "CI=true + --with-analyser omits skips-fresh cached banner",
    runCiWithAnalyserSkipsBannerTest,
  );

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
