/**
 * Cursor billed-usage client for `cursor-top tail` and per-row COST.
 *
 * Per-request cost and token rows come from POST
 * `/teams/filtered-usage-events` (the Cloud Agents SDK does not expose
 * this endpoint). Identity is resolved from `--email` /
 * `CURSOR_USAGE_EMAIL`, a best-effort `/me` call with `CURSOR_API_KEY`,
 * then `git config user.email`.
 *
 * In-flight conversations: the API may rewrite the same request as tokens
 * grow. We keep the latest row per request id, then sum those unique
 * requests per `conversationId` so conversation totals climb as new
 * requests complete (and an in-flight request's own totals replace, not
 * stack).
 */

import { execFileSync } from "node:child_process";
import type { AgentNode, AgentUsage } from "../types.js";
import { sanitizeDisplayText } from "./sanitize.js";

export const USAGE_EVENTS_URL =
  "https://api.cursor.com/teams/filtered-usage-events";
export const DEFAULT_USAGE_INTERVAL_MS = 15_000;
export const MIN_USAGE_INTERVAL_MS = 5_000;
export const DEFAULT_USAGE_HOURS = 6;
export const DEFAULT_TUI_USAGE_HOURS = 24;
export const DEFAULT_USAGE_PAGE_SIZE = 100;
export const DEFAULT_USAGE_PAGE_SIZE_MAX = 1000;

const ME_URLS = [
  "https://api.cursor.com/auth/me",
  "https://api.cursor.com/v1/me",
];

export interface UsageApiOptions {
  /** Override the usage key (default: analytics key, then `CURSOR_API_KEY`). */
  apiKey?: string;
  /** Override the user key used for `/me` (default: `CURSOR_API_KEY`). */
  userApiKey?: string;
  /** Force the billed-usage email. */
  email?: string;
  /** Lookback window in hours (default 24 in the TUI, 6 in `tail`). */
  hours?: number;
  /** Skip a refresh when the previous fetch is newer than this (default 15s). */
  minIntervalMs?: number;
  /** Override the usage events URL (tests). */
  usageUrl?: string;
  /** Custom fetch implementation (tests). */
  fetchFn?: typeof fetch;
  /** Custom `/me` implementation (tests). */
  meFn?: (apiKey: string) => Promise<{ email: string; label: string } | null>;
  /** Inject `git config user.email` (tests). */
  gitEmailFn?: () => string;
  /** Process env overlay (tests). */
  env?: NodeJS.ProcessEnv;
}

export type UsageTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
  totalCents?: number;
};

export type UsageEvent = {
  timestamp?: string | number;
  eventTimestamp?: string | number;
  conversationId?: string;
  model?: string;
  kind?: string;
  tokenUsage?: UsageTokenUsage;
  chargedCents?: number;
  isHeadless?: boolean;
  requestId?: string;
  eventRequestId?: string;
  id?: string;
  inputTokens?: number;
  outputTokens?: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
};

export type NormalizedUsageEvent = {
  id: string;
  requestKey: string;
  tMs: number;
  req: string;
  model: string;
  costCents: number;
  costUsd: number;
  inTokens: number;
  write: number;
  read: number;
  out: number;
  conversationId: string;
  headless: boolean;
};

export type ConversationUsage = {
  conversationId: string;
  costCents: number;
  costUsd: number;
  requestCount: number;
  inTokens: number;
  writeTokens: number;
  readTokens: number;
  outTokens: number;
  lastEventAt: number;
  models: string[];
};

export type UsageIdentity = {
  email: string;
  label: string;
  usageKey: string;
};

export function envKey(
  env: NodeJS.ProcessEnv,
  ...names: string[]
): string | undefined {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function usageKeyFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  return envKey(env, "CURSOR_ANALYTICS_API_KEY", "CURSOR_API_KEY");
}

export function isUsageApiAvailable(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(usageKeyFromEnv(env));
}

export function n(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sanitizeId(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = sanitizeDisplayText(value);
  if (trimmed === "" || trimmed === "null" || trimmed === "undefined") return "";
  return trimmed;
}

export function eventFingerprint(event: UsageEvent): string {
  const tu = event.tokenUsage ?? {};
  return [
    String(event.timestamp ?? event.eventTimestamp ?? ""),
    event.conversationId ?? "",
    event.model ?? "",
    n(tu.inputTokens ?? event.inputTokens),
    n(tu.cacheWriteTokens ?? event.cacheWriteTokens),
    n(tu.cacheReadTokens ?? event.cacheReadTokens),
    n(tu.outputTokens ?? event.outputTokens),
    n(event.chargedCents ?? tu.totalCents),
  ].join(":");
}

export function requestKey(event: UsageEvent): string {
  return (
    sanitizeId(event.id) ||
    sanitizeId(event.requestId) ||
    sanitizeId(event.eventRequestId) ||
    eventFingerprint(event)
  );
}

export function eventTimestampMs(event: UsageEvent): number {
  if (typeof event.timestamp === "number") return event.timestamp;
  if (typeof event.eventTimestamp === "number") return event.eventTimestamp;
  const parsed = Number(event.timestamp ?? event.eventTimestamp ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeUsageEvent(event: UsageEvent): NormalizedUsageEvent {
  const u = event.tokenUsage ?? {};
  const charged =
    typeof event.chargedCents === "number"
      ? event.chargedCents
      : (u.totalCents ?? 0);
  const model = sanitizeDisplayText(event.model ?? "") || "unknown";
  return {
    id: eventFingerprint(event),
    requestKey: requestKey(event),
    tMs: eventTimestampMs(event),
    req: sanitizeId(event.id ?? event.requestId ?? event.eventRequestId),
    model,
    costCents: n(charged),
    costUsd: n(charged) / 100,
    inTokens: n(u.inputTokens ?? event.inputTokens),
    write: n(u.cacheWriteTokens ?? event.cacheWriteTokens),
    read: n(u.cacheReadTokens ?? event.cacheReadTokens),
    out: n(u.outputTokens ?? event.outputTokens),
    conversationId: sanitizeId(event.conversationId),
    headless: Boolean(event.isHeadless),
  };
}

function tokenWeight(row: NormalizedUsageEvent): number {
  return row.inTokens + row.write + row.read + row.out;
}

/** True when `next` should replace `prev` for the same request id. */
export function isNewerUsageEvent(
  next: NormalizedUsageEvent,
  prev: NormalizedUsageEvent,
): boolean {
  if (next.tMs !== prev.tMs) return next.tMs > prev.tMs;
  if (next.costCents !== prev.costCents) return next.costCents > prev.costCents;
  return tokenWeight(next) >= tokenWeight(prev);
}

/**
 * Last-write-wins per request key. Use this so an in-flight request whose
 * billed totals grow does not double-count when the API rewrites the row.
 */
export function upsertUsageEvents(
  store: Map<string, NormalizedUsageEvent>,
  incoming: readonly NormalizedUsageEvent[],
): Map<string, NormalizedUsageEvent> {
  for (const row of incoming) {
    const prev = store.get(row.requestKey);
    if (!prev || isNewerUsageEvent(row, prev)) {
      store.set(row.requestKey, row);
    }
  }
  return store;
}

export function aggregateByConversation(
  events: Iterable<NormalizedUsageEvent>,
): Map<string, ConversationUsage> {
  const out = new Map<string, ConversationUsage>();
  for (const row of events) {
    const id = row.conversationId;
    if (!id) continue;
    const prev = out.get(id);
    if (!prev) {
      out.set(id, {
        conversationId: id,
        costCents: row.costCents,
        costUsd: row.costCents / 100,
        requestCount: 1,
        inTokens: row.inTokens,
        writeTokens: row.write,
        readTokens: row.read,
        outTokens: row.out,
        lastEventAt: row.tMs,
        models: row.model && row.model !== "unknown" ? [row.model] : [],
      });
      continue;
    }
    prev.costCents += row.costCents;
    prev.costUsd = prev.costCents / 100;
    prev.requestCount += 1;
    prev.inTokens += row.inTokens;
    prev.writeTokens += row.write;
    prev.readTokens += row.read;
    prev.outTokens += row.out;
    if (row.tMs > prev.lastEventAt) prev.lastEventAt = row.tMs;
    if (row.model && row.model !== "unknown" && !prev.models.includes(row.model)) {
      prev.models.push(row.model);
    }
  }
  return out;
}

export function conversationCandidates(nodeId: string): string[] {
  const id = sanitizeId(nodeId);
  if (!id) return [];
  const out = [id];
  if (id.startsWith("cloud-api:")) {
    const bare = id.slice("cloud-api:".length);
    if (bare) out.push(bare);
  }
  return out;
}

export function matchConversationUsage(
  nodeId: string,
  byConversation: Map<string, ConversationUsage>,
): ConversationUsage | undefined {
  for (const candidate of conversationCandidates(nodeId)) {
    const hit = byConversation.get(candidate);
    if (hit) return hit;
  }
  return undefined;
}

export function toAgentUsage(usage: ConversationUsage): AgentUsage {
  return {
    costUsd: usage.costUsd,
    requestCount: usage.requestCount,
    inTokens: usage.inTokens,
    writeTokens: usage.writeTokens,
    readTokens: usage.readTokens,
    outTokens: usage.outTokens,
    lastEventAt: usage.lastEventAt,
  };
}

export function applyUsageToNodes(
  nodes: Iterable<AgentNode>,
  byConversation: Map<string, ConversationUsage>,
): void {
  for (const node of nodes) {
    const usage = matchConversationUsage(node.id, byConversation);
    if (!usage) continue;
    node.costUsd = usage.costUsd;
    node.usage = toAgentUsage(usage);
  }
}

export function sumConversationUsage(
  byConversation: Map<string, ConversationUsage>,
): { totalCostUsd: number; requestCount: number } {
  let totalCents = 0;
  let requestCount = 0;
  for (const row of byConversation.values()) {
    totalCents += row.costCents;
    requestCount += row.requestCount;
  }
  return { totalCostUsd: totalCents / 100, requestCount };
}

export function gitUserEmail(gitEmailFn?: () => string): string {
  if (gitEmailFn) {
    try {
      return gitEmailFn().trim();
    } catch {
      return "";
    }
  }
  try {
    const value = execFileSync("git", ["config", "user.email"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return value;
  } catch {
    return "";
  }
}

function emailFromRecord(record: Record<string, unknown>): string {
  for (const key of ["userEmail", "email", "user_email"] as const) {
    const value = record[key];
    if (typeof value === "string" && value.includes("@")) return value.trim();
  }
  const user = record.user;
  if (user && typeof user === "object") {
    return emailFromRecord(user as Record<string, unknown>);
  }
  return "";
}

function labelFromRecord(record: Record<string, unknown>, email: string): string {
  const first = typeof record.userFirstName === "string" ? record.userFirstName : "";
  const last = typeof record.userLastName === "string" ? record.userLastName : "";
  const parts = [first, last].filter(Boolean).join(" ").trim();
  if (parts) return sanitizeDisplayText(parts);
  if (typeof record.apiKeyName === "string" && record.apiKeyName.trim()) {
    return sanitizeDisplayText(record.apiKeyName);
  }
  if (typeof record.name === "string" && record.name.trim()) {
    return sanitizeDisplayText(record.name);
  }
  return email;
}

export async function fetchMeIdentity(
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ email: string; label: string } | null> {
  const headers = {
    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    Accept: "application/json",
  };
  for (const url of ME_URLS) {
    try {
      const res = await fetchFn(url, {
        headers,
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) continue;
      const body = (await res.json()) as Record<string, unknown>;
      const email = emailFromRecord(body);
      if (!email) continue;
      return { email, label: labelFromRecord(body, email) };
    } catch {
      continue;
    }
  }
  return null;
}

export async function resolveUsageIdentity(
  opts: UsageApiOptions = {},
): Promise<UsageIdentity> {
  const env = opts.env ?? process.env;
  const usageKey = opts.apiKey?.trim() || usageKeyFromEnv(env);
  if (!usageKey) {
    throw new Error(
      "Set CURSOR_ANALYTICS_API_KEY (Admin read:e) or CURSOR_API_KEY",
    );
  }

  const userKey = opts.userApiKey?.trim() || envKey(env, "CURSOR_API_KEY");
  let meEmail = "";
  let meLabel = "";
  if (userKey) {
    try {
      const me = opts.meFn
        ? await opts.meFn(userKey)
        : await fetchMeIdentity(userKey, opts.fetchFn ?? fetch);
      if (me) {
        meEmail = me.email;
        meLabel = me.label;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`warning: usage identity lookup failed: ${message}\n`);
    }
  }

  const email =
    opts.email?.trim() ||
    meEmail ||
    envKey(env, "CURSOR_USAGE_EMAIL") ||
    gitUserEmail(opts.gitEmailFn) ||
    "";

  if (!email) {
    throw new Error(
      "could not resolve current-user email; pass --email or set CURSOR_USAGE_EMAIL",
    );
  }

  return { email, label: meLabel || email, usageKey };
}

export interface FetchUsageEventsOptions extends UsageApiOptions {
  usageKey: string;
  email: string;
  hours: number;
  limit?: number;
  now?: number;
}

export async function fetchUsageEvents(
  opts: FetchUsageEventsOptions,
): Promise<NormalizedUsageEvent[]> {
  const endDate = opts.now ?? Date.now();
  const hours = Math.max(1, opts.hours);
  const startDate = endDate - hours * 60 * 60 * 1000;
  const token = Buffer.from(`${opts.usageKey}:`).toString("base64");
  const pageSize = Math.min(
    DEFAULT_USAGE_PAGE_SIZE_MAX,
    Math.max(DEFAULT_USAGE_PAGE_SIZE, opts.limit ?? DEFAULT_USAGE_PAGE_SIZE),
  );
  const doFetch = opts.fetchFn ?? fetch;
  const url = opts.usageUrl ?? USAGE_EVENTS_URL;
  const response = await doFetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      email: opts.email,
      pageSize,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`usage API HTTP ${response.status}: ${raw.slice(0, 400)}`);
  }

  const payload = JSON.parse(raw) as { usageEvents?: UsageEvent[] };
  const events = Array.isArray(payload.usageEvents) ? payload.usageEvents : [];
  const store = new Map<string, NormalizedUsageEvent>();
  upsertUsageEvents(store, events.map(normalizeUsageEvent));
  return [...store.values()].sort((a, b) => a.tMs - b.tMs);
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  return `$${value.toFixed(2)}`;
}

export function formatUsageTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString("en-AU");
}

export function formatUsageTime(tMs: number): string {
  const date = new Date(tMs);
  return date.toLocaleTimeString("en-AU", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
