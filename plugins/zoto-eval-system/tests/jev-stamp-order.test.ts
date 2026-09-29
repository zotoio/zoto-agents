/**
 * Stamp-trust gate ORDER: an untrusted stamp must produce ZERO Jev calls —
 * in fixture mode and in live mode against a stub API. Counting happens at
 * the JevClient (`onJevCall`) and at the network stub (`fetch`).
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { runEvalJevCli } from "../scripts/eval-jev.js";
import { JEV_DIR, REPO_ROOT } from "./jev-helpers.js";

/** Stub Typesafe API: answers each template's question from its recorded green fixture. */
function stubApi() {
  const byKey: Record<string, string> = {
    verdict: "evidence-verdict/pass-high-confidence.json",
    risk: "guardrail-risk/low-risk.json",
    rubricMet: "rubric-met/yes.json",
  };
  const calls: string[] = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push(String(url));
    const body = JSON.parse(String(init?.body));
    const key = Object.keys(body.questions)[0]!;
    const fx = JSON.parse(readFileSync(join(JEV_DIR, "fixtures", byKey[key]!), "utf-8"));
    return new Response(JSON.stringify(fx.response), { status: 200 });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

function untrustedHost(): string {
  const host = mkdtempSync(join(tmpdir(), "zoto-jev-untrusted-"));
  mkdirSync(join(host, "evals", "_zoto"), { recursive: true });
  cpSync(JEV_DIR, join(host, "evals", "jev"), { recursive: true });
  return host; // no stamp-manifest.json → EVAL_STAMP_TRUNCATED
}

async function run(cwd: string, env: Record<string, string>) {
  const jevCalls: string[] = [];
  const api = stubApi();
  const out: string[] = [];
  const code = await runEvalJevCli({
    argv: ["--no-write"],
    cwd,
    env,
    fetchImpl: api.fetchImpl,
    onJevCall: (i) => jevCalls.push(`${i.mode}:${i.template}`),
    log: (l) => out.push(l),
    error: (l) => out.push(l),
  });
  return { code, jevCalls, fetchCalls: api.calls, out: out.join("\n") };
}

const LIVE = { ZOTO_EVAL_JEV_MODE: "live", TYPESAFE_API_KEY: "sk-stub-not-real" };

describe("stamp-trust gate runs before Jev is consulted", () => {
  it("untrusted stamp, fixture mode: exit 2 and 0 Jev calls", async () => {
    const r = await run(untrustedHost(), {});
    expect(r.out).toMatch(/eval_stamp_truncated/i);
    expect(r.jevCalls).toEqual([]);
    expect(r.code).toBe(2);
  });

  it("untrusted stamp, live mode against the stub: exit 2, 0 Jev calls, 0 API requests", async () => {
    const r = await run(untrustedHost(), LIVE);
    expect(r.out).toMatch(/eval_stamp_truncated/i);
    expect(r.jevCalls).toEqual([]);
    expect(r.fetchCalls).toEqual([]);
    expect(r.code).toBe(2);
  });

  it("control: trusted stamp, fixture mode consults Jev once per case", async () => {
    const r = await run(REPO_ROOT, {});
    expect(r.jevCalls).toHaveLength(3);
    expect(r.jevCalls.every((c) => c.startsWith("fixture:"))).toBe(true);
    expect(r.code).toBe(0);
  });

  it("control: trusted stamp, live mode hits the stub once per case and is green", async () => {
    const r = await run(REPO_ROOT, LIVE);
    expect(r.jevCalls).toHaveLength(3);
    expect(r.fetchCalls).toEqual(Array(3).fill("https://api.typesafe.ai/v1/systemone"));
    expect(r.out).toContain("mode=live");
    expect(r.code).toBe(0);
  });
});
