/**
 * Minimal JevClient — vendored from `zotoio/jev-feature-demo` at the commit in
 * `pin.ts` (raw-fetch-client + constants + fixture-fetch), with the
 * `@typesafe-ai/sdk` wire types inlined so the eval engine stays
 * dependency-free.
 *
 * Fixture-first: `FixtureTransport` answers from recorded goldens and never
 * references `fetch`, so fixture mode needs no API key and makes zero network
 * requests. `LiveTransport` is used only when live mode is explicitly enabled
 * (`ZOTO_EVAL_JEV_MODE=live`); the mere presence of `TYPESAFE_API_KEY` never
 * enables it (same rule as jev-feature-demo).
 *
 * Jev proposes typed answers; callers (the `jev` grader) decide.
 */

/* ------------------------------------------------------------------ */
/* Constants (upstream lib/constants.ts)                               */
/* ------------------------------------------------------------------ */

export const TYPESAFE_API_BASE = "https://api.typesafe.ai";
export const JEV_LATEST = "jev-latest";
/** Pinned stable model — gates are calibrated against this, not the alias. */
export const JEV_PINNED = "jev-1.13.0";
export const SYSTEMONE_PATH = "/v1/systemone";

/* ------------------------------------------------------------------ */
/* Wire types (subset of @typesafe-ai/sdk 0.6.0)                       */
/* ------------------------------------------------------------------ */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };
export type EntryType = string | { [key: string]: JsonValue } | JsonValue[] | null;

export interface NoulQuestion {
  type: "noul";
  instructions?: EntryType;
  criteria?: { true?: EntryType; false?: EntryType } | null;
}
export interface ChoiceQuestion {
  type: "choice";
  instructions?: EntryType;
  criteria: { [label: string]: EntryType };
}
export interface ScoreQuestion {
  type: "score";
  instructions?: EntryType;
  criteria: readonly [EntryType, EntryType, ...EntryType[]];
}
export type Question = NoulQuestion | ChoiceQuestion | ScoreQuestion;

export interface NoulAnswer {
  type: "noul";
  noul: number;
}
export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}
export interface ScoreAnswer {
  type: "score";
  score: number;
  confidence: number;
  legend?: Record<string, EntryType>;
  probabilities?: Record<string, number>;
}
export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer;

export interface SystemOneRequest {
  state: EntryType;
  questions: Record<string, Question>;
  model?: string;
}
export interface SystemOneResult {
  model: string;
  answers: Record<string, Answer>;
  usage: { input_tokens: number; output_tokens: number };
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export class JevHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "JevHttpError";
  }
}

export class JevConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JevConfigError";
  }
}

/* ------------------------------------------------------------------ */
/* Transports                                                          */
/* ------------------------------------------------------------------ */

export interface JevTransport {
  readonly mode: JevMode;
  systemOne(request: SystemOneRequest & { model: string }): Promise<SystemOneResult>;
}

export type JevMode = "fixture" | "live";

/**
 * Serves one recorded `/v1/systemone` response. Pure in-memory: never calls
 * `fetch`, never reads a key.
 */
export class FixtureTransport implements JevTransport {
  readonly mode = "fixture" as const;
  constructor(private readonly response: SystemOneResult) {}

  async systemOne(): Promise<SystemOneResult> {
    return structuredClone(this.response);
  }
}

export interface LiveTransportConfig {
  apiKey: string;
  baseURL?: string;
  fetchImpl?: typeof fetch;
}

/** Thin HTTP client — same endpoint as the SDK, no retries (upstream raw-fetch-client). */
export class LiveTransport implements JevTransport {
  readonly mode = "live" as const;
  readonly baseURL: string;
  readonly #apiKey: string;
  readonly #fetch: typeof fetch;

  constructor(config: LiveTransportConfig) {
    if (!config.apiKey?.trim()) {
      throw new JevConfigError("Jev live mode requires TYPESAFE_API_KEY.");
    }
    this.#apiKey = config.apiKey.trim();
    this.baseURL = (config.baseURL ?? TYPESAFE_API_BASE).replace(/\/+$/, "");
    this.#fetch = config.fetchImpl ?? fetch;
  }

  async systemOne(request: SystemOneRequest & { model: string }): Promise<SystemOneResult> {
    const response = await this.#fetch(`${this.baseURL}${SYSTEMONE_PATH}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    });
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }
    if (!response.ok) {
      const detail =
        typeof parsed === "object" && parsed !== null && "detail" in parsed
          ? JSON.stringify((parsed as { detail: unknown }).detail)
          : text || response.statusText;
      throw new JevHttpError(response.status, detail, parsed);
    }
    return parsed as SystemOneResult;
  }
}

/* ------------------------------------------------------------------ */
/* JevClient facade                                                    */
/* ------------------------------------------------------------------ */

export interface JevClientConfig {
  transport: JevTransport;
  /** Defaults to the pinned model so confidence gates stay calibrated. */
  model?: string;
}

export class JevClient {
  readonly transport: JevTransport;
  readonly model: string;

  constructor(config: JevClientConfig) {
    this.transport = config.transport;
    this.model = config.model ?? JEV_PINNED;
  }

  get mode(): JevMode {
    return this.transport.mode;
  }

  async systemOne(request: SystemOneRequest): Promise<SystemOneResult> {
    if (Object.keys(request.questions).length === 0) {
      throw new JevConfigError("systemOne requires at least one question.");
    }
    return this.transport.systemOne({ ...request, model: request.model ?? this.model });
  }
}

/* ------------------------------------------------------------------ */
/* Mode resolution                                                     */
/* ------------------------------------------------------------------ */

export interface JevEnv {
  ZOTO_EVAL_JEV_MODE?: string;
  ZOTO_EVAL_JEV_MODEL?: string;
  TYPESAFE_API_KEY?: string;
  TYPESAFE_BASE_URL?: string;
}

/**
 * Fixture is the default. Live requires `ZOTO_EVAL_JEV_MODE=live`; a key on
 * its own never switches modes.
 */
export function resolveJevMode(env: JevEnv = process.env as JevEnv): JevMode {
  const raw = env.ZOTO_EVAL_JEV_MODE?.trim().toLowerCase();
  if (raw === undefined || raw === "" || raw === "fixture") return "fixture";
  if (raw === "live") return "live";
  throw new JevConfigError(
    `ZOTO_EVAL_JEV_MODE must be "fixture" or "live" (got "${env.ZOTO_EVAL_JEV_MODE}").`,
  );
}

export function createLiveTransportFromEnv(
  env: JevEnv = process.env as JevEnv,
  fetchImpl?: typeof fetch,
): LiveTransport {
  return new LiveTransport({
    apiKey: env.TYPESAFE_API_KEY ?? "",
    baseURL: env.TYPESAFE_BASE_URL?.trim() || undefined,
    fetchImpl,
  });
}
