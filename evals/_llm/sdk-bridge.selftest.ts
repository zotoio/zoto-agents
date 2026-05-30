#!/usr/bin/env tsx
/**
 * Self-test for `evals/_llm/sdk-bridge.ts`.
 *
 * Verifies the documented bridge surface stays stable, the offline-safe
 * `resolveTokens()` fallback returns the documented `approximate:chars/4`
 * source on `@cursor/sdk@1.0.12`, and the pinned constants line up.
 *
 * Run with:
 *
 *   pnpm exec tsx evals/_llm/sdk-bridge.selftest.ts
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  PINNED_SDK_VERSION,
  TOKEN_RESULT_FIELD,
  BRIDGE_SURFACE,
  resolveTokens,
  closeAgent,
  withRetry,
  type RunResult,
  type SDKAgent,
} from "../../plugins/zoto-eval-system/engine/sdk-bridge.ts";

interface StepResult {
  name: string;
  ok: boolean;
  detail?: string;
}

const results: StepResult[] = [];

async function step(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (e) {
    const err = e as Error;
    results.push({ name, ok: false, detail: err.stack ?? err.message });
  }
}

async function main(): Promise<void> {
  await step("PINNED_SDK_VERSION matches installed @cursor/sdk version", () => {
    const pkgPath = resolve(
      process.cwd(),
      "node_modules",
      "@cursor",
      "sdk",
      "package.json",
    );
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version: string };
    if (PINNED_SDK_VERSION !== pkg.version) {
      throw new Error(
        `bridge claims SDK ${PINNED_SDK_VERSION} but @cursor/sdk@${pkg.version} is installed — bump the constant after re-running this self-test`,
      );
    }
  });

  await step("BRIDGE_SURFACE matches documented re-exports", () => {
    const expected = [
      "PINNED_SDK_VERSION",
      "TOKEN_RESULT_FIELD",
      "createAgent",
      "sendPrompt",
      "awaitRun",
      "closeAgent",
      "resolveTokens",
      "withRetry",
    ];
    if (BRIDGE_SURFACE.length !== expected.length) {
      throw new Error(
        `BRIDGE_SURFACE length drifted: ${BRIDGE_SURFACE.length} vs ${expected.length}`,
      );
    }
    for (const name of expected) {
      if (!BRIDGE_SURFACE.includes(name as (typeof BRIDGE_SURFACE)[number])) {
        throw new Error(`BRIDGE_SURFACE missing: ${name}`);
      }
    }
  });

  await step("resolveTokens prefers result.tokens when present", () => {
    const result = { id: "r", status: "finished", tokens: 42 } as unknown as RunResult;
    const resolved = resolveTokens(result, "prompt", "response");
    if (resolved.source !== "result.tokens" || resolved.tokens !== 42) {
      throw new Error(
        `expected source=result.tokens tokens=42, got ${JSON.stringify(resolved)}`,
      );
    }
  });

  await step("resolveTokens prefers result.usage.totalTokens when tokens absent", () => {
    const result = {
      id: "r",
      status: "finished",
      usage: { totalTokens: 17 },
    } as unknown as RunResult;
    const resolved = resolveTokens(result, "prompt", "response");
    if (resolved.source !== "result.usage.totalTokens" || resolved.tokens !== 17) {
      throw new Error(
        `expected source=result.usage.totalTokens tokens=17, got ${JSON.stringify(resolved)}`,
      );
    }
  });

  await step("resolveTokens falls back to approximate:chars/4 when SDK exposes no token field", () => {
    const result = { id: "r", status: "finished" } as unknown as RunResult;
    const resolved = resolveTokens(result, "prompt", "response");
    if (resolved.source !== "approximate:chars/4") {
      throw new Error(
        `expected approximate:chars/4 fallback, got ${resolved.source}`,
      );
    }
    if (resolved.tokens <= 0) {
      throw new Error(`expected >0 approximate tokens, got ${resolved.tokens}`);
    }
  });

  await step("TOKEN_RESULT_FIELD pins the documented offline default", () => {
    if (TOKEN_RESULT_FIELD !== "approximate:chars/4") {
      throw new Error(
        `TOKEN_RESULT_FIELD changed to ${TOKEN_RESULT_FIELD} — investigate whether the live SDK now exposes a real token field and update the docs accordingly`,
      );
    }
  });

  await step("closeAgent is a no-op for stubs without close()", async () => {
    const stub = { agentId: "stub" } as unknown as SDKAgent;
    await closeAgent(stub);
  });

  await step("closeAgent calls close() on stubs that expose it", async () => {
    let called = false;
    const stub = {
      agentId: "stub",
      close: () => {
        called = true;
      },
    } as unknown as SDKAgent;
    await closeAgent(stub);
    if (!called) {
      throw new Error("closeAgent did not call close() on a stub that exposes it");
    }
  });

  await step("closeAgent prefers Symbol.asyncDispose over close()", async () => {
    let disposeCalled = false;
    let closeCalled = false;
    const stub = {
      agentId: "stub",
      close: () => { closeCalled = true; },
      [Symbol.asyncDispose]: async () => { disposeCalled = true; },
    } as unknown as SDKAgent;
    await closeAgent(stub);
    if (!disposeCalled) {
      throw new Error("closeAgent did not call Symbol.asyncDispose");
    }
    if (closeCalled) {
      throw new Error("closeAgent should not call close() when asyncDispose is available");
    }
  });

  await step("withRetry succeeds on first attempt when fn resolves", async () => {
    const result = await withRetry("test-ok", async () => 42, {
      maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 100,
    });
    if (result !== 42) {
      throw new Error(`expected 42, got ${result}`);
    }
  });

  await step("withRetry retries transient errors then succeeds", async () => {
    let calls = 0;
    const result = await withRetry("test-retry", async () => {
      calls++;
      if (calls < 3) throw new Error("ECONNRESET: connection reset");
      return "ok";
    }, { maxAttempts: 4, baseDelayMs: 10, maxDelayMs: 50 });
    if (result !== "ok" || calls !== 3) {
      throw new Error(`expected ok after 3 calls, got result=${result} calls=${calls}`);
    }
  });

  await step("withRetry propagates non-retryable errors immediately", async () => {
    let calls = 0;
    try {
      await withRetry("test-non-retryable", async () => {
        calls++;
        throw new Error("Invalid API key");
      }, { maxAttempts: 4, baseDelayMs: 10, maxDelayMs: 50 });
      throw new Error("should have thrown");
    } catch (e) {
      if (calls !== 1) {
        throw new Error(`expected 1 call for non-retryable error, got ${calls}`);
      }
      if (!(e as Error).message.includes("Invalid API key")) {
        throw new Error(`unexpected error: ${(e as Error).message}`);
      }
    }
  });

  await step("withRetry exhausts all attempts then throws", async () => {
    let calls = 0;
    try {
      await withRetry("test-exhaust", async () => {
        calls++;
        throw new Error("429 too many requests");
      }, { maxAttempts: 3, baseDelayMs: 10, maxDelayMs: 50 });
      throw new Error("should have thrown");
    } catch (e) {
      if (calls !== 3) {
        throw new Error(`expected 3 attempts, got ${calls}`);
      }
      if (!(e as Error).message.includes("429")) {
        throw new Error(`unexpected error: ${(e as Error).message}`);
      }
    }
  });

  let failed = 0;
  for (const r of results) {
    const flag = r.ok ? "PASS" : "FAIL";
    process.stdout.write(`[${flag}] ${r.name}\n`);
    if (!r.ok) {
      failed += 1;
      process.stdout.write(`  detail:\n${r.detail}\n`);
    }
  }
  process.stdout.write(
    `\n${results.length - failed}/${results.length} steps passed\n`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  process.stderr.write(`selftest crashed: ${(err as Error).stack}\n`);
  process.exit(2);
});
