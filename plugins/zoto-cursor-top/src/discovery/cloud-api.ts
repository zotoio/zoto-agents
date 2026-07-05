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
import { sanitizeDisplayText } from "./sanitize.js";

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
  if (branch?.repoUrl) {
    const repo = sanitizeDisplayText(branch.repoUrl);
    return repo || null;
  }
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
          const agentId = encodeURIComponent(agent.id);
          const runId = encodeURIComponent(agent.latestRunId);
          const res = await doFetch(
            `${base}/agents/${agentId}/runs/${runId}`,
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
      const label = sanitizeDisplayText(agent.name) || "Cloud Agent";
      const resultSnippet = run?.result
        ? sanitizeDisplayText(run.result).slice(0, 120)
        : "";
      const logSource = agent.url ? sanitizeDisplayText(agent.url) || null : null;
      const id = sanitizeDisplayText(agent.id) || "unknown";

      nodes.push({
        id: `cloud-api:${id}`,
        parentId: null,
        kind: "cloud",
        pid: null,
        label,
        title: resultSnippet,
        model: null,
        repo,
        startedAt,
        elapsedEndAt: run?.durationMs
          ? startedAt + run.durationMs
          : undefined,
        status,
        recentLogs: resultSnippet ? [`result: ${resultSnippet}`] : [],
        logSource,
        tokenUsage: null,
      });
    }),
  );

  return nodes;
}
