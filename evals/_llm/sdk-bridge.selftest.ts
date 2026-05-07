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
  type RunResult,
  type SDKAgent,
} from "./sdk-bridge.ts";

interface StepResult {
  name: string;
  ok: boolean;
  detail?: string;
}

const results: StepResult[] = [];

function step(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (e) {
    const err = e as Error;
    results.push({ name, ok: false, detail: err.stack ?? err.message });
  }
}

step("PINNED_SDK_VERSION matches installed @cursor/sdk version", () => {
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

step("BRIDGE_SURFACE matches documented re-exports", () => {
  const expected = [
    "PINNED_SDK_VERSION",
    "TOKEN_RESULT_FIELD",
    "createAgent",
    "sendPrompt",
    "awaitRun",
    "closeAgent",
    "resolveTokens",
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

step("resolveTokens prefers result.tokens when present", () => {
  const result = { id: "r", status: "finished", tokens: 42 } as unknown as RunResult;
  const resolved = resolveTokens(result, "prompt", "response");
  if (resolved.source !== "result.tokens" || resolved.tokens !== 42) {
    throw new Error(
      `expected source=result.tokens tokens=42, got ${JSON.stringify(resolved)}`,
    );
  }
});

step("resolveTokens prefers result.usage.totalTokens when tokens absent", () => {
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

step("resolveTokens falls back to approximate:chars/4 when SDK exposes no token field", () => {
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

step("TOKEN_RESULT_FIELD pins the documented offline default", () => {
  /* Subtask 09 deliverable 11: the bridge must pin the resolved field
   * name on the live SDK. We inspected `node_modules/@cursor/sdk/dist/esm/run.d.ts`
   * for v1.0.12 and confirmed `RunResult` carries no per-run token
   * field, so the default falls through to the chars/4 heuristic. If
   * this assertion fires after an SDK bump, a real token field has
   * landed — re-pin TOKEN_RESULT_FIELD and update the bridge JSDoc. */
  if (TOKEN_RESULT_FIELD !== "approximate:chars/4") {
    throw new Error(
      `TOKEN_RESULT_FIELD changed to ${TOKEN_RESULT_FIELD} — investigate whether the live SDK now exposes a real token field and update the docs accordingly`,
    );
  }
});

step("closeAgent is a no-op for stubs without close()", () => {
  const stub = { agentId: "stub" } as unknown as SDKAgent;
  closeAgent(stub);
});

step("closeAgent calls close() on stubs that expose it", () => {
  let called = false;
  const stub = {
    agentId: "stub",
    close: () => {
      called = true;
    },
  } as unknown as SDKAgent;
  closeAgent(stub);
  if (!called) {
    throw new Error("closeAgent did not call close() on a stub that exposes it");
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
