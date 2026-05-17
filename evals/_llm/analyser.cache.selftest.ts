#!/usr/bin/env tsx
/**
 * Targeted unit tests for the LLM-driven analyser cache + replay paths
 * (subtask 04 of the eval-system-v2 spec). Runs without @cursor/sdk by
 * injecting a stub `AnalyserSdk`. The smoke test that exercises the real
 * SDK lives behind the `CURSOR_API_KEY` gate at the bottom and is skipped
 * by default.
 *
 * Run via: `pnpm exec tsx evals/_llm/analyser.cache.selftest.ts`
 *
 * Naming intentionally avoids `sandbox.smoke.ts` to prevent collisions with
 * subtask 05's selftest harness.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import YAML from "yaml";

import {
  ANALYSER_VERSION,
  computeAnalyserCacheKey,
  newAnalyserBudget,
  normaliseContent,
  runAnalyser,
  type AnalyserPayload,
  type AnalyserSdk,
} from "../../scripts/eval-analyse.ts";

interface ScratchRepo {
  root: string;
  primitivePath: string;
  cacheDir: string;
}

function buildScratchRepo(): ScratchRepo {
  const root = mkdtempSync(join(tmpdir(), "zoto-analyser-"));
  /* Minimal repo skeleton — eval-analyse.ts only needs config.json + the
   * primitive source + the schema file under plugins/zoto-eval-system/. */
  mkdirSync(join(root, ".zoto", "eval-system"), { recursive: true });
  writeFileSync(
    join(root, ".zoto", "eval-system", "config.yml"),
    YAML.stringify({
      llm: { model: { id: "composer-2" } },
      analyser: { concurrency: 4, maxCallsPerInvocation: 50 },
    }),
    "utf-8",
  );

  /* Vendor in the live schema + subagent prompt so the analyser's lazy
   * loaders find them. */
  const repoRoot = process.cwd();
  for (const rel of [
    "plugins/zoto-eval-system/templates/schema/analyser-payload.schema.json",
    "plugins/zoto-eval-system/agents/zoto-eval-analyser-subagent.md",
  ]) {
    const dest = join(root, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(join(repoRoot, rel), "utf-8"), "utf-8");
  }

  /* Author a bespoke skill primitive so the source_hash is deterministic
   * and not coupled to the live monorepo. */
  const skillRel = "plugins/test-plugin/skills/test-skill/SKILL.md";
  const primitivePath = join(root, skillRel);
  mkdirSync(dirname(primitivePath), { recursive: true });
  writeFileSync(
    primitivePath,
    [
      "---",
      "name: test-skill",
      "description: Synthetic skill used by the analyser cache selftest.",
      "---",
      "",
      "## Steps",
      "1. Read the user's request.",
      "2. Decide whether to dispatch.",
      "3. Return a structured response.",
      "",
    ].join("\n"),
    "utf-8",
  );

  const cacheDir = join(root, ".zoto", "eval-system", "cache", "analyser");
  return { root, primitivePath, cacheDir };
}

function buildPayloadForCache(
  scratch: ScratchRepo,
  modelId: string,
): AnalyserPayload {
  const sourceText = readFileSync(scratch.primitivePath, "utf-8");
  const sourceHash = computeAnalyserCacheKey({
    normalisedSource: normaliseContent(sourceText),
    analyserVersion: ANALYSER_VERSION,
    modelId,
  });
  return {
    schema_version: 1,
    analyser_version: ANALYSER_VERSION,
    model_id: modelId,
    target_id: "skill:test-skill",
    kind: "skill",
    source_path: "plugins/test-plugin/skills/test-skill/SKILL.md",
    source_hash: sourceHash,
    summary: "Synthetic skill used to exercise the analyser cache pathways.",
    cases: [
      {
        scenario: "happy path - selftest invocation",
        prompt: "Invoke the test-skill against a sample request.",
        assertions: [
          "the skill emitted a structured response with a non-empty body",
          "no askQuestion was emitted from the skill body",
        ],
        expected_output: "Structured response with the user's request acknowledged.",
      },
    ],
  };
}

function makeStubSdk(name: string, responseFn: () => string): {
  sdk: AnalyserSdk;
  callCount: () => number;
} {
  let calls = 0;
  return {
    sdk: {
      async createAgent() {
        return {
          async send() {
            return {
              async wait() {
                calls += 1;
                return { result: responseFn() };
              },
            };
          },
          close() {
            void name;
          },
        };
      },
    },
    callCount: () => calls,
  };
}

async function testCacheHit(): Promise<void> {
  const scratch = buildScratchRepo();
  const payload = buildPayloadForCache(scratch, "composer-2");
  mkdirSync(scratch.cacheDir, { recursive: true });
  writeFileSync(
    join(scratch.cacheDir, `${payload.source_hash}.json`),
    JSON.stringify(payload, null, 2),
    "utf-8",
  );
  const stub = makeStubSdk("cache-hit", () => "should-not-be-called");
  const budget = newAnalyserBudget();
  const result = await runAnalyser(
    { target: "skill:test-skill" },
    {
      repoRoot: scratch.root,
      cacheDir: scratch.cacheDir,
      sdk: stub.sdk,
      budget,
    },
  );
  assert.equal(result.cacheHit, true);
  assert.equal(result.source, "cache");
  assert.equal(result.payload.source_hash, payload.source_hash);
  assert.equal(stub.callCount(), 0, "SDK must not be invoked on cache hit");
  assert.equal(budget.callsCached, 1);
  assert.equal(budget.callsMade, 0);
}

async function testReplayHit(): Promise<void> {
  const scratch = buildScratchRepo();
  const payload = buildPayloadForCache(scratch, "composer-2");
  const fixtureDir = join(scratch.root, "fixtures-analyser");
  mkdirSync(fixtureDir, { recursive: true });
  writeFileSync(
    join(fixtureDir, `${payload.source_hash}.json`),
    JSON.stringify(payload, null, 2),
    "utf-8",
  );
  const stub = makeStubSdk("replay", () => "should-not-be-called");
  const budget = newAnalyserBudget();
  const result = await runAnalyser(
    { target: "skill:test-skill" },
    {
      repoRoot: scratch.root,
      sdk: stub.sdk,
      fixtureDir,
      budget,
    },
  );
  assert.equal(result.replayHit, true);
  assert.equal(result.source, "replay");
  assert.equal(stub.callCount(), 0);
  assert.equal(budget.replayHits, 1);
}

async function testFreshGenerationAndCacheWrite(): Promise<void> {
  const scratch = buildScratchRepo();
  const payload = buildPayloadForCache(scratch, "composer-2");
  /* Stub returns a JSON string the analyser will pin canonical fields onto. */
  const stub = makeStubSdk("fresh", () => JSON.stringify(payload));
  const budget = newAnalyserBudget();
  const result = await runAnalyser(
    { target: "skill:test-skill" },
    {
      repoRoot: scratch.root,
      cacheDir: scratch.cacheDir,
      sdk: stub.sdk,
      budget,
    },
  );
  assert.equal(result.source, "fresh");
  assert.equal(stub.callCount(), 1);
  assert.equal(budget.callsMade, 1);
  /* Cache file must now exist for next-run cache-hit. */
  const cached = readFileSync(
    join(scratch.cacheDir, `${result.payload.source_hash}.json`),
    "utf-8",
  );
  const parsedCached = JSON.parse(cached) as AnalyserPayload;
  assert.equal(parsedCached.source_hash, result.payload.source_hash);
}

async function testBudgetExhaustion(): Promise<void> {
  const scratch = buildScratchRepo();
  const payload = buildPayloadForCache(scratch, "composer-2");
  const stub = makeStubSdk("budget", () => JSON.stringify(payload));
  const budget = newAnalyserBudget();
  budget.callsMade = 99;
  let threw = false;
  try {
    await runAnalyser(
      { target: "skill:test-skill" },
      {
        repoRoot: scratch.root,
        cacheDir: scratch.cacheDir,
        sdk: stub.sdk,
        budget,
        config: { maxCallsPerInvocation: 1 },
      },
    );
  } catch (e) {
    threw = true;
    assert.match((e as Error).message, /budget exhausted/i);
  }
  assert.equal(threw, true, "budget exhaustion must throw");
}

async function testInvalidationReGenerates(): Promise<void> {
  const scratch = buildScratchRepo();
  const payload = buildPayloadForCache(scratch, "composer-2");
  mkdirSync(scratch.cacheDir, { recursive: true });
  writeFileSync(
    join(scratch.cacheDir, `${payload.source_hash}.json`),
    JSON.stringify(payload, null, 2),
    "utf-8",
  );
  const stub = makeStubSdk("invalidate", () => JSON.stringify(payload));
  const budget = newAnalyserBudget();
  const result = await runAnalyser(
    { target: "skill:test-skill" },
    {
      repoRoot: scratch.root,
      cacheDir: scratch.cacheDir,
      sdk: stub.sdk,
      budget,
      invalidate: true,
    },
  );
  assert.equal(result.source, "fresh");
  assert.equal(stub.callCount(), 1);
}

async function maybeSmokeTest(): Promise<boolean> {
  if (!process.env.CURSOR_API_KEY) return false;
  if (!process.env.ZOTO_EVAL_ANALYSER_SMOKE) return false;
  const budget = newAnalyserBudget();
  const result = await runAnalyser(
    { target: "skill:zoto-create-evals" },
    { budget, ephemeralCache: true },
  );
  assert.ok(result.payload.cases.length >= 1);
  return true;
}

async function main(): Promise<void> {
  await testCacheHit();
  await testReplayHit();
  await testFreshGenerationAndCacheWrite();
  await testBudgetExhaustion();
  await testInvalidationReGenerates();
  const smokeRan = await maybeSmokeTest();
  console.log(
    JSON.stringify({
      ok: true,
      tests: [
        "cache_hit",
        "replay_hit",
        "fresh_generation_with_cache_write",
        "budget_exhaustion",
        "invalidation_regenerates",
      ],
      smoke_ran: smokeRan,
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
