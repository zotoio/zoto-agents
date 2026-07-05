/**
 * Optional Cloud Agents API integration.
 *
 * When `CURSOR_API_KEY` is set in the environment, this module queries
 * the Cursor Cloud Agents REST API to discover running cloud agents and
 * their latest run status. This enables cursor-top running inside a
 * Cloud Agent VM (or any environment) to show remote cloud agents
 * alongside local processes.
 *
 * Authentication: Basic auth with the API key as username (no password).
 * Docs: https://cursor.com/docs/cloud-agent/api/endpoints
 */

import type { AgentNode, AgentStatus } from "../types.js";

const API_BASE = "https://api.cursor.com/v1";

export interface CloudApiOptions {
  /** Override the API key (default: `process.env.CURSOR_API_KEY`). */
  apiKey?: string;
  /** Override the API base URL (tests). */
  apiBase?: string;
  /** Max agents to list per page (default 50). */
  limit?: number;
  /** Custom fetch implementation (tests). */
  fetchFn?: typeof fetch;
}

interface ApiAgent {
  id: string;
  name: string;
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
  env?: { type: string; name?: string };
  url?: string;
  createdAt: string;
  updatedAt: string;
  latestRunId?: string;
}

interface ApiRun {
  id: string;
  agentId: string;
  status: "CREATING" | "RUNNING" | "FINISHED" | "ERROR" | "CANCELLED" | "EXPIRED";
  createdAt: string;
  updatedAt: string;
  durationMs?: number;
  result?: string;
  git?: {
    branches?: Array<{ repoUrl?: string; branch?: string; prUrl?: string }>;
  };
}

function mapRunStatus(apiStatus: ApiRun["status"]): AgentStatus {
  switch (apiStatus) {
    case "CREATING": return "waiting";
    case "RUNNING": return "running";
    case "FINISHED": return "done";
    case "ERROR": return "error";
    case "CANCELLED": return "done";
    case "EXPIRED": return "done";
    default: return "unknown";
  }
}

function repoFromAgent(agent: ApiAgent, run?: ApiRun): string | null {
  const branch = run?.git?.branches?.[0];
  if (branch?.repoUrl) return branch.repoUrl;
  return null;
}

/**
 * Returns true if a CURSOR_API_KEY is available in the environment.
 */
export function isCloudApiAvailable(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.CURSOR_API_KEY?.trim());
}

/**
 * Fetch active cloud agents from the Cursor Cloud Agents API.
 * Returns an empty array if no API key is configured or if the request fails.
 */
export async function fetchCloudAgents(
  opts: CloudApiOptions = {},
): Promise<AgentNode[]> {
  const apiKey = opts.apiKey ?? process.env.CURSOR_API_KEY;
  if (!apiKey?.trim()) return [];

  const base = opts.apiBase ?? API_BASE;
  const limit = opts.limit ?? 50;
  const doFetch = opts.fetchFn ?? fetch;

  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    Accept: "application/json",
  };

  let agents: ApiAgent[];
  try {
    const res = await doFetch(
      `${base}/agents?limit=${limit}&includeArchived=false`,
      { headers, signal: AbortSignal.timeout(10_000) },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { items?: ApiAgent[] };
    agents = body.items ?? [];
  } catch {
    return [];
  }

  const activeAgents = agents.filter((a) => a.status === "ACTIVE");
  if (activeAgents.length === 0) return [];

  const nodes: AgentNode[] = [];

  await Promise.all(
    activeAgents.map(async (agent) => {
      let run: ApiRun | undefined;
      if (agent.latestRunId) {
        try {
          const res = await doFetch(
            `${base}/agents/${agent.id}/runs/${agent.latestRunId}`,
            { headers, signal: AbortSignal.timeout(10_000) },
          );
          if (res.ok) {
            run = (await res.json()) as ApiRun;
          }
        } catch {
          // proceed without run data
        }
      }

      const status = run ? mapRunStatus(run.status) : "running";
      const startedAt = new Date(agent.createdAt).getTime();
      const repo = repoFromAgent(agent, run);
      const resultSnippet = run?.result
        ? run.result.slice(0, 120)
        : "";

      nodes.push({
        id: `cloud-api:${agent.id}`,
        parentId: null,
        kind: "cloud",
        pid: null,
        label: agent.name || "Cloud Agent",
        title: resultSnippet,
        model: null,
        repo,
        startedAt,
        elapsedEndAt: run?.durationMs
          ? startedAt + run.durationMs
          : undefined,
        status,
        recentLogs: resultSnippet ? [`result: ${resultSnippet}`] : [],
        logSource: agent.url ?? null,
        tokenUsage: null,
      });
    }),
  );

  return nodes;
}
