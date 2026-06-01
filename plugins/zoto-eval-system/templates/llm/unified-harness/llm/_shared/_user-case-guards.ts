/**
 * User-case guards — the single source of truth for detecting "generated
 * by the eval system" vs "user-authored" artefacts.
 *
 * Subtask 09 (LLM code strategy) owns the final form of this module.
 * It replaces the subtask 03 stub while preserving every previously
 * exported symbol (classifyGeneratedFilePath, isGeneratedFile,
 * GeneratedFileLanguage) and adds the case-level helper needed by the
 * new backends (isGeneratedCase).
 *
 * ## Consumers (documented)
 *
 *   - **Subtask 03** (scripts/eval-cleanup-stale.ts): calls
 *     isGeneratedFile(path) to gate deletion candidates. A file that
 *     returns false is user-authored and MUST NOT be deleted.
 *   - **Subtask 10** (evals/_llm/runner.ts, update.ts): calls
 *     isGeneratedCase(c) to skip any evals.json row a user authored
 *     (no _meta, or _meta.generated === false).
 *   - **Subtask 11** (updater): calls both helpers. File-level gate for
 *     *.test.ts overwrites in the code strategy; case-level gate for
 *     evals.json row replacement in either strategy.
 *
 * ## File-level contract
 *
 * The literal first line of every emitted test file carries the marker:
 *
 *   *.test.ts / *.test.tsx     → // _meta.generated: true
 *   *.test.py / test_*.py      → # _meta.generated: True
 *
 * For backwards compatibility with the subtask 03 stub, the marker is
 * accepted anywhere within the first 20 lines of the file (so templates
 * that want a shebang or a one-line docstring above the marker stay
 * legal). NEW emitters (subtasks 09, 11) MUST place the marker on line 1
 * — this is the strict form the spec's DoD references.
 *
 * ## Case-level contract
 *
 * A case is "generated" (and therefore safe for the updater to replace)
 * iff _meta.generated === true. Any other shape — missing _meta,
 * _meta.generated === false, _meta.generated === undefined — is
 * treated as user-authored and MUST be preserved verbatim by any stamper
 * or updater.
 *
 * Do NOT duplicate either regex or either predicate anywhere else in the
 * codebase. Cross-reference this module from the cleanup engine, the
 * updater, and every backend runner.
 */
import { existsSync, readFileSync, statSync } from "node:fs";

const TS_HEADER_RE = /^\s*\/\/\s*_meta\.generated\s*:\s*true\b/i;
const PY_HEADER_RE = /^\s*#\s*_meta\.generated\s*:\s*True\b/;

/** Maximum number of leading lines scanned for the marker. */
export const HEADER_SCAN_LINES = 20;

export type GeneratedFileLanguage = "ts" | "py";

/**
 * Returns the language family for a recognised test-file path, or `null`
 * when the file's name does not match a documented test-file shape.
 */
export function classifyGeneratedFilePath(path: string): GeneratedFileLanguage | null {
  const lower = path.toLowerCase();
  if (lower.endsWith(".test.ts") || lower.endsWith(".test.tsx")) return "ts";
  if (lower.endsWith(".test.js") || lower.endsWith(".test.jsx")) return "ts";
  if (
    lower.endsWith(".test.py") ||
    /(^|\/)test_[^/]+\.py$/.test(lower) ||
    /_test\.py$/.test(lower)
  ) {
    return "py";
  }
  return null;
}

/**
 * Returns `true` when the file at `path` carries the documented
 * `_meta.generated` marker at (or near) the top of the file.
 *
 * Returns `false` when the file is missing, unreadable, not a recognised
 * test-file shape, or lacks the marker within the first
 * `HEADER_SCAN_LINES` lines. Subtask 03's cleanup engine and subtask 11's
 * overwrite gate both treat `false` as "user-authored — preserve".
 *
 * When `strict === true`, the marker MUST be on the literal first line
 * (matching the spec's DoD for code-strategy emitters). The default
 * (`strict === false`) keeps the subtask 03 stub's permissive scan so
 * legacy pytest templates that stamp a shebang above the marker remain
 * legal.
 */
export function isGeneratedFile(
  path: string,
  opts: { strict?: boolean } = {},
): boolean {
  try {
    if (!existsSync(path)) return false;
    if (!statSync(path).isFile()) return false;
    const lang = classifyGeneratedFilePath(path);
    if (lang === null) return false;
    const content = readFileSync(path, "utf-8");
    const lines = content.split(/\r?\n/, HEADER_SCAN_LINES);
    const re = lang === "ts" ? TS_HEADER_RE : PY_HEADER_RE;
    if (opts.strict) {
      return lines.length > 0 && re.test(lines[0] ?? "");
    }
    for (const line of lines) {
      if (re.test(line)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Minimal shape every case-level caller needs. The real `EvalCase` type
 * in `evals/_llm/case.ts` carries many more fields; this module only
 * cares about the `_meta.generated` bit.
 */
export interface CaseMetaLike {
  _meta?: {
    generated?: boolean;
  };
}

/**
 * Returns `true` when a stamped eval case carries `_meta.generated === true`.
 *
 * Explicitly returns `false` for:
 *   - cases with no `_meta` object
 *   - cases with `_meta.generated === false`
 *   - cases with `_meta.generated === undefined`
 *   - non-boolean `_meta.generated` values (defensive)
 *
 * This is the inverse of "user-authored". Any updater, runner, or
 * stamper that mutates or deletes an eval case MUST preserve every case
 * for which this helper returns `false`.
 */
export function isGeneratedCase(c: CaseMetaLike | null | undefined): boolean {
  if (!c || typeof c !== "object") return false;
  const meta = c._meta;
  if (!meta || typeof meta !== "object") return false;
  return meta.generated === true;
}

/**
 * Convenience predicate: "is this a user-authored case I must preserve?"
 * Equivalent to `!isGeneratedCase(c)` but reads clearly at call sites.
 */
export function isUserAuthoredCase(c: CaseMetaLike | null | undefined): boolean {
  return !isGeneratedCase(c);
}
