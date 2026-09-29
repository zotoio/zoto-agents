import { describe, expect, it, vi } from "vitest";

import {
  FixtureTransport,
  JEV_PINNED,
  JevClient,
  JevConfigError,
  JevHttpError,
  LiveTransport,
  SYSTEMONE_PATH,
  TYPESAFE_API_BASE,
  createLiveTransportFromEnv,
  resolveJevMode,
  type SystemOneResult,
} from "../engine/jev/client.js";
import { JEV_PIN } from "../engine/jev/pin.js";

const RESULT: SystemOneResult = {
  model: "jev-1.13.0",
  answers: { isUrgent: { type: "noul", noul: 0.95 } },
  usage: { input_tokens: 307, output_tokens: 20 },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("vendored JevClient", () => {
  it("is pinned to one exact jev-feature-demo commit", () => {
    expect(JEV_PIN.repo).toBe("zotoio/jev-feature-demo");
    expect(JEV_PIN.commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it("defaults to the pinned model, not the moving alias", async () => {
    const seen: string[] = [];
    const client = new JevClient({
      transport: { mode: "fixture", systemOne: async (req) => (seen.push(req.model), RESULT) },
    });
    await client.systemOne({ state: "x", questions: { q: { type: "noul", instructions: "?" } } });
    expect(client.model).toBe(JEV_PINNED);
    expect(seen).toEqual([JEV_PINNED]);
  });

  it("rejects an empty questions map", async () => {
    const client = new JevClient({ transport: new FixtureTransport(RESULT) });
    await expect(client.systemOne({ state: "x", questions: {} })).rejects.toBeInstanceOf(JevConfigError);
  });

  it("FixtureTransport serves a defensive copy and reports fixture mode", async () => {
    const t = new FixtureTransport(RESULT);
    const a = await t.systemOne();
    (a.answers.isUrgent as { noul: number }).noul = 0;
    const b = await t.systemOne();
    expect(b.answers.isUrgent).toEqual({ type: "noul", noul: 0.95 });
    expect(t.mode).toBe("fixture");
  });
});

describe("mode resolution (fixture-first)", () => {
  it("defaults to fixture", () => {
    expect(resolveJevMode({})).toBe("fixture");
    expect(resolveJevMode({ ZOTO_EVAL_JEV_MODE: "" })).toBe("fixture");
  });

  it("a key on its own never enables live mode", () => {
    expect(resolveJevMode({ TYPESAFE_API_KEY: "sk-test" })).toBe("fixture");
  });

  it("live only when explicitly requested", () => {
    expect(resolveJevMode({ ZOTO_EVAL_JEV_MODE: "live" })).toBe("live");
    expect(() => resolveJevMode({ ZOTO_EVAL_JEV_MODE: "yolo" })).toThrow(JevConfigError);
  });

  it("live mode without a key is a config error", () => {
    expect(() => createLiveTransportFromEnv({ ZOTO_EVAL_JEV_MODE: "live" })).toThrow(/TYPESAFE_API_KEY/);
  });
});

describe("LiveTransport (stubbed fetch)", () => {
  it("POSTs /v1/systemone with a bearer key and returns typed answers", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(RESULT));
    const t = new LiveTransport({ apiKey: "sk-test", fetchImpl: fetchImpl as unknown as typeof fetch });
    const out = await t.systemOne({ state: "s", questions: { q: { type: "noul" } }, model: JEV_PINNED });
    expect(out.answers.isUrgent).toEqual({ type: "noul", noul: 0.95 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${TYPESAFE_API_BASE}${SYSTEMONE_PATH}`);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    expect(JSON.parse(init.body as string).model).toBe(JEV_PINNED);
  });

  it("honours TYPESAFE_BASE_URL and strips trailing slashes", () => {
    const t = createLiveTransportFromEnv({ TYPESAFE_API_KEY: "k", TYPESAFE_BASE_URL: "https://proxy.local///" });
    expect(t.baseURL).toBe("https://proxy.local");
  });

  it("maps HTTP errors to JevHttpError with the API detail", async () => {
    const fetchImpl = async () => jsonResponse({ detail: "Missing or invalid API key" }, 401);
    const t = new LiveTransport({ apiKey: "bad", fetchImpl: fetchImpl as unknown as typeof fetch });
    const err = await t.systemOne({ state: "s", questions: { q: { type: "noul" } }, model: "m" }).catch((e) => e);
    expect(err).toBeInstanceOf(JevHttpError);
    expect((err as JevHttpError).status).toBe(401);
    expect((err as JevHttpError).message).toContain("Missing or invalid API key");
  });
});
