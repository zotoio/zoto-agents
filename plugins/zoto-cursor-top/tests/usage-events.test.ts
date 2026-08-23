import { describe, expect, it } from "vitest";
import type { AgentNode } from "../src/types.js";
import {
  aggregateByConversation,
  applyUsageToNodes,
  fetchUsageEvents,
  formatUsd,
  isNewerUsageEvent,
  isUsageApiAvailable,
  matchConversationUsage,
  normalizeUsageEvent,
  requestKey,
  resolveUsageIdentity,
  upsertUsageEvents,
  type NormalizedUsageEvent,
  type UsageEvent,
} from "../src/discovery/usage-events.js";

function event(over: Partial<UsageEvent> = {}): UsageEvent {
  return {
    timestamp: 1_700_000_000_000,
    conversationId: "conv-1",
    model: "composer-2.5",
    chargedCents: 12,
    id: "req-1",
    tokenUsage: {
      inputTokens: 100,
      outputTokens: 20,
      cacheWriteTokens: 5,
      cacheReadTokens: 3,
    },
    ...over,
  };
}

function node(over: Partial<AgentNode> & Pick<AgentNode, "id">): AgentNode {
  return {
    parentId: null,
    kind: "agent",
    pid: null,
    label: over.id,
    title: "",
    model: null,
    repo: null,
    startedAt: 0,
    status: "running",
    recentLogs: [],
    logSource: null,
    tokenUsage: null,
    ...over,
  };
}

describe("isUsageApiAvailable", () => {
  it("prefers the analytics key and ignores blank values", () => {
    expect(isUsageApiAvailable({ CURSOR_ANALYTICS_API_KEY: " admin " })).toBe(true);
    expect(isUsageApiAvailable({ CURSOR_API_KEY: "user" })).toBe(true);
    expect(isUsageApiAvailable({ CURSOR_API_KEY: " " })).toBe(false);
    expect(isUsageApiAvailable({})).toBe(false);
  });
});

describe("normalize + request identity", () => {
  it("prefers a stable request id over the fingerprint", () => {
    const a = event({ id: "req-1", chargedCents: 10 });
    const b = event({ id: "req-1", chargedCents: 40, tokenUsage: { inputTokens: 500 } });
    expect(requestKey(a)).toBe("req-1");
    expect(requestKey(b)).toBe("req-1");
    expect(normalizeUsageEvent(a).costUsd).toBe(0.1);
    expect(normalizeUsageEvent(b).costUsd).toBe(0.4);
  });

  it("falls back to a fingerprint when no request id is present", () => {
    const row = event({ id: undefined, requestId: undefined, eventRequestId: undefined });
    expect(requestKey(row)).toContain("conv-1");
  });
});

describe("in-flight request rewrite + conversation totals", () => {
  it("keeps the latest rewrite of the same request instead of stacking", () => {
    const first = normalizeUsageEvent(event({ chargedCents: 10, tokenUsage: { inputTokens: 100 } }));
    const later = normalizeUsageEvent(
      event({
        timestamp: 1_700_000_000_500,
        chargedCents: 25,
        tokenUsage: { inputTokens: 400, outputTokens: 80 },
      }),
    );
    expect(isNewerUsageEvent(later, first)).toBe(true);
    const store = upsertUsageEvents(new Map(), [first, later]);
    expect(store.size).toBe(1);
    expect(store.get("req-1")!.costUsd).toBe(0.25);
    const byConv = aggregateByConversation(store.values());
    expect(byConv.get("conv-1")).toMatchObject({
      costUsd: 0.25,
      requestCount: 1,
      inTokens: 400,
    });
  });

  it("sums unique requests on the same in-flight conversation", () => {
    const rows: NormalizedUsageEvent[] = [
      normalizeUsageEvent(event({ id: "req-1", chargedCents: 10 })),
      normalizeUsageEvent(event({ id: "req-2", chargedCents: 35, timestamp: 1_700_000_001_000 })),
    ];
    const byConv = aggregateByConversation(rows);
    expect(byConv.get("conv-1")).toMatchObject({
      costUsd: 0.45,
      requestCount: 2,
    });
  });

  it("matches cloud-api prefixed node ids", () => {
    const byConv = aggregateByConversation([
      normalizeUsageEvent(event({ conversationId: "agent-9", chargedCents: 50 })),
    ]);
    expect(matchConversationUsage("cloud-api:agent-9", byConv)?.costUsd).toBe(0.5);
    expect(matchConversationUsage("other", byConv)).toBeUndefined();
  });

  it("stamps costUsd and usage onto matching nodes", () => {
    const chat = node({ id: "conv-1" });
    const other = node({ id: "conv-2" });
    applyUsageToNodes(
      [chat, other],
      aggregateByConversation([normalizeUsageEvent(event({ chargedCents: 99 }))]),
    );
    expect(chat.costUsd).toBe(0.99);
    expect(chat.usage).toMatchObject({ requestCount: 1, costUsd: 0.99 });
    expect(other.costUsd).toBeUndefined();
  });
});

describe("resolveUsageIdentity", () => {
  it("uses --email / opts.email before env and git", async () => {
    const identity = await resolveUsageIdentity({
      apiKey: "key",
      email: "cli@example.com",
      env: { CURSOR_USAGE_EMAIL: "env@example.com" },
      gitEmailFn: () => "git@example.com",
    });
    expect(identity).toEqual({
      email: "cli@example.com",
      label: "cli@example.com",
      usageKey: "key",
    });
  });

  it("throws when no key is configured", async () => {
    await expect(
      resolveUsageIdentity({ env: {}, gitEmailFn: () => "git@example.com" }),
    ).rejects.toThrow(/CURSOR_ANALYTICS_API_KEY/);
  });

  it("throws when email cannot be resolved", async () => {
    await expect(
      resolveUsageIdentity({
        apiKey: "key",
        env: {},
        gitEmailFn: () => "",
        meFn: async () => null,
      }),
    ).rejects.toThrow(/CURSOR_USAGE_EMAIL/);
  });
});

describe("fetchUsageEvents", () => {
  it("posts the lookback window and dedupes rewritten requests", async () => {
    const bodies: unknown[] = [];
    const fetchFn: typeof fetch = async (_input, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return new Response(
        JSON.stringify({
          usageEvents: [
            event({ id: "req-1", chargedCents: 10 }),
            event({
              id: "req-1",
              timestamp: 1_700_000_000_800,
              chargedCents: 22,
              tokenUsage: { inputTokens: 300 },
            }),
          ],
        }),
      );
    };
    const rows = await fetchUsageEvents({
      usageKey: "secret",
      email: "dev@example.com",
      hours: 6,
      now: 1_700_100_000_000,
      fetchFn,
      usageUrl: "https://mock.local/usage",
    });
    expect(bodies[0]).toMatchObject({
      email: "dev@example.com",
      startDate: 1_700_100_000_000 - 6 * 60 * 60 * 1000,
      endDate: 1_700_100_000_000,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.costUsd).toBe(0.22);
  });

  it("throws a sliced HTTP error", async () => {
    const fetchFn: typeof fetch = async () =>
      new Response("nope-not-authorized", { status: 401 });
    await expect(
      fetchUsageEvents({
        usageKey: "secret",
        email: "dev@example.com",
        hours: 1,
        fetchFn,
        usageUrl: "https://mock.local/usage",
      }),
    ).rejects.toThrow(/usage API HTTP 401/);
  });
});

describe("formatUsd", () => {
  it("formats zero, sub-cent, and dollar amounts", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(0.004)).toBe("<$0.01");
    expect(formatUsd(1.234)).toBe("$1.23");
  });
});
