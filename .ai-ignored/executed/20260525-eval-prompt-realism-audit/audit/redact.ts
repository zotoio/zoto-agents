/**
 * Redaction pipeline for transcript-sourced eval prompts.
 *
 * Rules applied in deterministic order:
 * 1. absolute-home-paths  2. repo-relative-normalisation  3. email-addresses
 * 4. generic-api-tokens     5. cursor-api-key               6. env-value-redaction
 * 7. operator-names         8. machine-uuid                  9. third-party-names
 */

export const OPERATOR_NAMES: readonly string[] = ["andrewv"];
export const CUSTOMER_NAME_ALLOWLIST: readonly string[] = [];
export const CUSTOMER_NAMES_TO_REDACT: readonly string[] = [];

const HOME_UNIX = /(?:\/home|\/Users)\/[^/\s\\]+(?:\/|\\)?/g;
const HOME_WIN = /C:\\Users\\[^\\\s]+\\?/gi;
const REPO_ROOT_MARKER = "zoto-agents/";
const EMAIL = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g;
const TOKEN_PATTERNS = [
  /sk-[A-Za-z0-9_-]{16,}/g,
  /ghp_[A-Za-z0-9]{30,}/g,
  /gh_pat_[A-Za-z0-9_]{5,}/g,
  /ghs_[A-Za-z0-9]{20,}/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  /AKIA[0-9A-Z]{16}/g,
] as const;
const CURSOR_API_KEY = /CURSOR_API_KEY(=|:)\s*\S+/g;
const ENV_LINE = /^([A-Z_][A-Z0-9_]*)=(.*)$/gm;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const TARGET_ID_BEFORE_UUID = /(?:skill|command|agent|hook|rule):$/i;

function coerceInput(input: string | null | undefined): string {
  if (input == null) return "";
  return input;
}

function isEnvPlaceholder(value: string): boolean {
  const v = value.trim();
  if (/^<[^>]+>$/.test(v)) return true;
  if (/^your-.+-here$/i.test(v)) return true;
  if (/^x{3,}$/i.test(v)) return true;
  return false;
}

function applyHomePaths(s: string): string {
  return s.replace(HOME_UNIX, "~/").replace(HOME_WIN, "~/");
}

function applyRepoRelative(s: string): string {
  const idx = s.indexOf(REPO_ROOT_MARKER);
  if (idx === -1) return s;
  return s.slice(idx + REPO_ROOT_MARKER.length);
}

function applyEmails(s: string): string {
  return s.replace(EMAIL, "<email>");
}

function applyTokens(s: string): string {
  let out = s;
  for (const pattern of TOKEN_PATTERNS) {
    out = out.replace(pattern, "<token>");
  }
  return out;
}

function applyCursorApiKey(s: string): string {
  return s.replace(CURSOR_API_KEY, "CURSOR_API_KEY=<redacted>");
}

function applyEnvValues(s: string): string {
  return s.replace(ENV_LINE, (line, key: string, value: string) => {
    if (value.length <= 8 || isEnvPlaceholder(value)) return line;
    return `${key}=<redacted>`;
  });
}

function applyOperatorNames(s: string): string {
  let out = s;
  for (const name of OPERATOR_NAMES) {
    const re = new RegExp(`\\b${name}\\b`, "gi");
    out = out.replace(re, "<operator>");
  }
  return out;
}

function applyUuids(s: string): string {
  return s.replace(UUID, (match, offset: number, whole: string) => {
    const before = whole.slice(Math.max(0, offset - 8), offset);
    if (TARGET_ID_BEFORE_UUID.test(before)) return match;
    return "<uuid>";
  });
}

export function redactThirdPartyNames(
  text: string,
  options?: { allowlist?: readonly string[] },
): string {
  const allow = new Set(options?.allowlist ?? CUSTOMER_NAME_ALLOWLIST);
  let out = text;
  for (const name of CUSTOMER_NAMES_TO_REDACT) {
    if (allow.has(name)) continue;
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    out = out.replace(re, "<customer>");
  }
  return out;
}

/** Normalise absolute home paths to `~/` only (rules 1). */
export function redactPath(input: string): string {
  return applyHomePaths(coerceInput(input));
}

/** Full redaction pipeline for transcript text. */
export function redact(input: string): string {
  let s = coerceInput(input);
  s = applyHomePaths(s);
  s = applyRepoRelative(s);
  s = applyEmails(s);
  s = applyTokens(s);
  s = applyCursorApiKey(s);
  s = applyEnvValues(s);
  s = applyOperatorNames(s);
  s = applyUuids(s);
  s = redactThirdPartyNames(s);
  return s;
}
