/**
 * Row f: fixture mode needs no API key and makes zero outbound requests.
 * `fetch`, `http(s).request`, raw sockets and DNS are all stubbed to throw and
 * counted; the suite must produce the same counts with 0 attempts.
 */
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runJevSuite } from "../engine/jev/suite.js";
import { JEV_DIR, readCases } from "./jev-helpers.js";

const ALL_CASES = () => [...readCases("cases/eval-system-replies.json"), ...readCases("adversarial/cases.json")];

describe("row f: fixture mode is offline", () => {
  let attempts: string[];
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    attempts = [];
    for (const k of ["TYPESAFE_API_KEY", "ZOTO_EVAL_JEV_MODE", "TYPESAFE_BASE_URL"]) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    const block = (what: string) => () => {
      attempts.push(what);
      throw new Error(`network blocked in test: ${what}`);
    };
    vi.stubGlobal("fetch", vi.fn(block("fetch")));
    vi.spyOn(http, "request").mockImplementation(block("http.request") as never);
    vi.spyOn(https, "request").mockImplementation(block("https.request") as never);
    vi.spyOn(net.Socket.prototype, "connect").mockImplementation(block("net.connect") as never);
    vi.spyOn(dns, "lookup").mockImplementation(block("dns.lookup") as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("no key, network blocked: same counts as an unblocked run, 0 outbound attempts", async () => {
    expect(process.env.TYPESAFE_API_KEY).toBeUndefined();
    const blocked = await runJevSuite({ jevDir: JEV_DIR, cases: ALL_CASES() });
    expect(attempts).toEqual([]);
    expect(blocked.jev_mode).toBe("fixture");
    expect(blocked.counts).toEqual({ pass: 3, fail: 3, inconclusive: 2 });

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    const unblocked = await runJevSuite({ jevDir: JEV_DIR, env: {}, cases: ALL_CASES() });
    expect(unblocked.counts).toEqual(blocked.counts);
    expect(unblocked.results.map((r) => r.verdict)).toEqual(blocked.results.map((r) => r.verdict));
  });

  it("a key in the environment does not switch fixture mode to live", async () => {
    process.env.TYPESAFE_API_KEY = "sk-should-not-be-used";
    const report = await runJevSuite({ jevDir: JEV_DIR, cases: ALL_CASES() });
    expect(report.jev_mode).toBe("fixture");
    expect(attempts).toEqual([]);
  });
});
