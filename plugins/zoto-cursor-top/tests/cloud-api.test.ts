import { describe, expect, it } from "vitest";
import { fetchCloudAgents, isCloudApiAvailable } from "../src/discovery/cloud-api.js";
import type { AgentNode } from "../src/types.js";

const hasTerminalControl = (value: string): boolean =>
  [...value].some((ch) => {
    const code = ch.charCodeAt(0);
    return code < 0x20 || (code >= 0x7F && code <= 0x9F);
  });

const nodeDisplayFields = (node: AgentNode): string[] => [
  node.id,
  node.label,
  node.title,
  node.repo ?? "",
  node.logSource ?? "",
  ...node.recentLogs,
];

describe("isCloudApiAvailable", () => {
  it("requires a non-empty API key", () => {
    expect(isCloudApiAvailable({ CURSOR_API_KEY: " token " })).toBe(true);
    expect(isCloudApiAvailable({ CURSOR_API_KEY: " " })).toBe(false);
    expect(isCloudApiAvailable({})).toBe(false);
  });
});

describe("fetchCloudAgents", () => {
  it("sanitizes remote display fields before returning AgentNodes", async () => {
    const ESC = "\x1B";
    const listBody = {
      items: [
        {
          id: `${ESC}]0;id${ESC}\\agent-1`,
          name: `${ESC}]0;owned\x07${ESC}[2JInnocent Agent${ESC}[0m`,
          status: "ACTIVE",
          createdAt: "2026-07-05T00:00:00.000Z",
          updatedAt: "2026-07-05T00:00:00.000Z",
          latestRunId: "run-1",
          url: `${ESC}]8;;https://evil.example${ESC}\\logs${ESC}]8;;${ESC}\\`,
        },
      ],
    };
    const runBody = {
      id: "run-1",
      agentId: "agent-1",
      status: "FINISHED",
      createdAt: "2026-07-05T00:00:00.000Z",
      updatedAt: "2026-07-05T00:00:00.000Z",
      durationMs: 2500,
      result: `Done. ${ESC}]8;;https://evil.example/steal${ESC}\\Click here${ESC}]8;;${ESC}\\ ${ESC}[6n`,
      git: {
        branches: [{ repoUrl: `acme/${ESC}[5mwidget` }],
      },
    };
    const fetchFn: typeof fetch = async (input) =>
      new Response(JSON.stringify(String(input).includes("/runs/") ? runBody : listBody));

    const nodes = await fetchCloudAgents({
      apiKey: "test",
      apiBase: "https://mock.local",
      fetchFn,
    });

    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({
      id: "cloud-api:agent-1",
      label: "Innocent Agent",
      title: "Done. Click here",
      repo: "acme/widget",
      logSource: "logs",
      recentLogs: ["result: Done. Click here"],
    });
    for (const field of nodeDisplayFields(nodes[0]!)) {
      expect(hasTerminalControl(field)).toBe(false);
    }
  });

  it("falls back when a remote name sanitizes to empty", async () => {
    const fetchFn: typeof fetch = async () =>
      new Response(JSON.stringify({
        items: [
          {
            id: "agent-1",
            name: "\x1B]0;only-control\x07",
            status: "ACTIVE",
            createdAt: "2026-07-05T00:00:00.000Z",
            updatedAt: "2026-07-05T00:00:00.000Z",
          },
        ],
      }));

    const nodes = await fetchCloudAgents({
      apiKey: "test",
      apiBase: "https://mock.local",
      fetchFn,
    });

    expect(nodes[0]?.label).toBe("Cloud Agent");
  });

  it("sanitizes result text before clipping snippets", async () => {
    const safePrefix = "a".repeat(118);
    const fetchFn: typeof fetch = async (input) => {
      const body = String(input).includes("/runs/")
        ? {
          id: "run-1",
          agentId: "agent-1",
          status: "ERROR",
          createdAt: "2026-07-05T00:00:00.000Z",
          updatedAt: "2026-07-05T00:00:00.000Z",
          result: `${safePrefix}\x1B]8;;https://evil.example\x1B\\click\x1B]8;;\x1B\\`,
        }
        : {
          items: [
            {
              id: "agent-1",
              name: "agent",
              status: "ACTIVE",
              createdAt: "2026-07-05T00:00:00.000Z",
              updatedAt: "2026-07-05T00:00:00.000Z",
              latestRunId: "run-1",
            },
          ],
        };
      return new Response(JSON.stringify(body));
    };

    const [node] = await fetchCloudAgents({
      apiKey: "test",
      apiBase: "https://mock.local",
      fetchFn,
    });

    expect(node?.title).toBe(`${safePrefix}cl`);
    expect(hasTerminalControl(node?.title ?? "")).toBe(false);
  });

  it("URL-encodes remote ids interpolated into run request paths", async () => {
    const urls: string[] = [];
    const agentId = "agent/../bad?\x1B[31m";
    const runId = "run/../worse?x=1";
    const fetchFn: typeof fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      const body = url.includes("/runs/")
        ? {
          id: runId,
          agentId,
          status: "RUNNING",
          createdAt: "2026-07-05T00:00:00.000Z",
          updatedAt: "2026-07-05T00:00:00.000Z",
        }
        : {
          items: [
            {
              id: agentId,
              name: "agent",
              status: "ACTIVE",
              createdAt: "2026-07-05T00:00:00.000Z",
              updatedAt: "2026-07-05T00:00:00.000Z",
              latestRunId: runId,
            },
          ],
        };
      return new Response(JSON.stringify(body));
    };

    await fetchCloudAgents({
      apiKey: "test",
      apiBase: "https://mock.local",
      fetchFn,
    });

    expect(urls[1]).toBe(
      `https://mock.local/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`,
    );
  });

  it("ignores archived remote agents", async () => {
    const fetchFn: typeof fetch = async () =>
      new Response(JSON.stringify({
        items: [
          {
            id: "agent-1",
            name: "\x1B[2Jarchived",
            status: "ARCHIVED",
            createdAt: "2026-07-05T00:00:00.000Z",
            updatedAt: "2026-07-05T00:00:00.000Z",
          },
        ],
      }));

    await expect(fetchCloudAgents({ apiKey: "test", fetchFn })).resolves.toEqual([]);
  });
});
