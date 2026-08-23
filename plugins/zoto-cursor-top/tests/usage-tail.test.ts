import { describe, expect, it } from "vitest";
import {
  clipPrompt,
  parseTailArgs,
  renderTailEvent,
  renderTailHeader,
  runUsageTail,
  serializeTailEvent,
} from "../src/usage-tail.js";
import { normalizeUsageEvent, type UsageEvent } from "../src/discovery/usage-events.js";

describe("parseTailArgs", () => {
  it("defaults to a 10-line snapshot with no prompt", () => {
    expect(parseTailArgs([])).toMatchObject({
      lines: 10,
      follow: false,
      promptChars: 0,
      hours: 6,
      json: false,
    });
  });

  it("accepts clustered short flags like -fn 20 -p", () => {
    const opts = parseTailArgs(["-fn", "20", "-p"]);
    expect(opts.follow).toBe(true);
    expect(opts.lines).toBe(20);
    expect(opts.promptChars).toBe(100);
  });

  it("accepts attached numeric shorts and --prompt=N", () => {
    expect(parseTailArgs(["-n15"]).lines).toBe(15);
    expect(parseTailArgs(["-20"]).lines).toBe(20);
    expect(parseTailArgs(["-p80"]).promptChars).toBe(80);
    expect(parseTailArgs(["--prompt=40"]).promptChars).toBe(40);
  });

  it("marks help without exiting", () => {
    expect(parseTailArgs(["-h"]).help).toBe(true);
    expect(parseTailArgs(["--help"]).help).toBe(true);
  });

  it("rejects unknown flags", () => {
    expect(() => parseTailArgs(["--nope"])).toThrow(/Unknown argument/);
  });
});

describe("tail renderers", () => {
  const row = normalizeUsageEvent({
    timestamp: Date.UTC(2026, 7, 23, 9, 30, 15),
    conversationId: "abcdef12-9999",
    model: "composer-2.5",
    chargedCents: 42,
    id: "req-1",
    tokenUsage: { inputTokens: 1500, outputTokens: 200 },
  } satisfies UsageEvent);

  it("serializes one JSON object per request", () => {
    const parsed = JSON.parse(
      serializeTailEvent(row, { title: "Ship the tail", text: "please add cost" }),
    ) as { costUsd: number; title: string; tokens: { in: number } };
    expect(parsed.costUsd).toBe(0.42);
    expect(parsed.title).toBe("Ship the tail");
    expect(parsed.tokens.in).toBe(1500);
  });

  it("renders a colour-free snapshot line", () => {
    const line = renderTailEvent(
      row,
      { title: "Ship the tail", text: "" },
      parseTailArgs([]),
      false,
    );
    expect(line).toContain("composer-2.5");
    expect(line).toContain("$0.42");
    expect(line).toContain("abcdef12");
    expect(line).toContain("title");
    expect(line).toContain("Ship the tail");
  });

  it("includes the header identity and mode", () => {
    const header = renderTailHeader(
      { email: "dev@example.com", label: "Dev", usageKey: "k" },
      parseTailArgs(["-f"]),
      false,
    );
    expect(header).toContain("Cursor API Usage");
    expect(header).toContain("Dev (dev@example.com)");
    expect(header).toContain("follow");
  });
});

describe("clipPrompt", () => {
  it("collapses whitespace and ellipsizes", () => {
    expect(clipPrompt("  hello   world  ", 20)).toBe("hello world");
    expect(clipPrompt("abcdefghij", 4)).toBe("abcd...");
    expect(clipPrompt("x", 0)).toBe("");
  });
});

describe("runUsageTail", () => {
  it("prints help and exits 0", async () => {
    let out = "";
    const code = await runUsageTail(["--help"], {
      stdout: (s) => {
        out += s;
      },
    });
    expect(code).toBe(0);
    expect(out).toContain("cursor-top tail");
    expect(out).toContain("CURSOR_ANALYTICS_API_KEY");
  });

  it("emits JSON for the last N requests then exits", async () => {
    const events: UsageEvent[] = [
      {
        timestamp: 1,
        conversationId: "c1",
        model: "m1",
        chargedCents: 10,
        id: "r1",
      },
      {
        timestamp: 2,
        conversationId: "c2",
        model: "m2",
        chargedCents: 20,
        id: "r2",
      },
      {
        timestamp: 3,
        conversationId: "c3",
        model: "m3",
        chargedCents: 30,
        id: "r3",
      },
    ];
    let out = "";
    const code = await runUsageTail(["--json", "-n", "2"], {
      usageApi: {
        apiKey: "k",
        email: "dev@example.com",
        fetchFn: async () => new Response(JSON.stringify({ usageEvents: events })),
        usageUrl: "https://mock.local/usage",
      },
      loadPrompts: async () => new Map(),
      stdout: (s) => {
        out += s;
      },
      stdoutTty: false,
    });
    expect(code).toBe(0);
    const lines = out.trim().split("\n").map((line) => JSON.parse(line) as { model: string });
    expect(lines.map((row) => row.model)).toEqual(["m2", "m3"]);
  });

  it("returns 1 when identity cannot be resolved", async () => {
    let err = "";
    const code = await runUsageTail(["--json"], {
      usageApi: { env: {}, gitEmailFn: () => "", meFn: async () => null },
      stderr: (s) => {
        err += s;
      },
    });
    expect(code).toBe(1);
    expect(err).toContain("CURSOR_ANALYTICS_API_KEY");
  });
});
