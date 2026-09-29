/**
 * Versioned Jev question templates + the lock that pins them.
 *
 * Each Jev-graded case references a template by `<id>@<version>`, resolved to
 * `<jevDir>/templates/<id>.v<version>.json`. The template owns the question
 * wording, locked Choice options, Score band anchors and gate thresholds —
 * cases can supply the rubric and code-owned evidence guards, never wording.
 *
 * `<jevDir>/jev.lock.json` records the pinned jev commit, a hash of the fixture
 * set and a hash per template. Any drift (fixture edited, template wording
 * changed, pin bumped) without a conscious `pnpm eval:jev:lock` is refused.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import type { EntryType, Question, SystemOneResult } from "./client.js";
import { DEFAULT_THRESHOLDS, type GateThresholds, type ScoreBandPolicy } from "./gates.js";
import { JEV_PIN } from "./pin.js";

/* ------------------------------------------------------------------ */
/* Template shapes                                                     */
/* ------------------------------------------------------------------ */

export type ProposedOutcome = "pass" | "fail" | "inconclusive";

interface TemplateBase {
  id: string;
  version: number;
  /** Answer key used in the `/v1/systemone` questions map. */
  question_key: string;
  /** Locked question wording. */
  instructions: string;
  thresholds?: GateThresholds;
  /**
   * Leading / solicitation phrases. When found in the graded reply, grader
   * code refuses to promote a Jev "pass" proposal.
   */
  leading_phrases?: string[];
}

export interface ChoiceTemplate extends TemplateBase {
  kind: "choice";
  /** Locked options: label → description. Jev answers outside these are refused. */
  options: Record<string, string>;
  /** How grader code reads each locked option. */
  outcome_map: Record<string, ProposedOutcome>;
}

export interface NoulTemplate extends TemplateBase {
  kind: "noul";
  criteria: { true: string; false: string };
  /** Which Noul answer is a pass proposal. */
  pass_when: "yes" | "no";
}

export interface ScoreTemplate extends TemplateBase {
  kind: "score";
  /** Band anchors, index = score. At least two. */
  anchors: [string, string, ...string[]];
  /** score <= pass_max_score → pass proposal. */
  pass_max_score: number;
  /** score >= fail_min_score → fail proposal; in between → inconclusive. */
  fail_min_score: number;
  /** Score bands that cap the gate outcome (e.g. mid band → at most ask_human). */
  bands?: ScoreBandPolicy[];
}

export type JevTemplate = ChoiceTemplate | NoulTemplate | ScoreTemplate;

export interface LoadedTemplate {
  ref: string;
  path: string;
  sha256: string;
  template: JevTemplate;
}

/* ------------------------------------------------------------------ */
/* Hashing                                                             */
/* ------------------------------------------------------------------ */

export function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Hash text files with CRLF normalised so checkouts on Windows hash the same. */
function hashFileText(path: string): string {
  return sha256(readFileSync(path, "utf-8").replace(/\r\n/g, "\n"));
}

function listJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d).sort()) {
      const abs = join(d, entry);
      if (statSync(abs).isDirectory()) walk(abs);
      else if (entry.endsWith(".json")) out.push(abs);
    }
  };
  walk(dir);
  return out;
}

/** The vendored Jev code directory (`engine/jev/`), pinned by `vendor_sha256`. */
export const VENDOR_DIR = dirname(fileURLToPath(import.meta.url));

function listAllFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d).sort()) {
      const abs = join(d, entry);
      if (statSync(abs).isDirectory()) walk(abs);
      else out.push(abs);
    }
  };
  walk(dir);
  return out;
}

/**
 * Deterministic hash over EVERY file under `engine/jev/` (path + content):
 * the vendored client, gates, pin and the grader support code. Editing any of
 * them without a conscious `pnpm eval:jev:lock` is drift.
 */
export function hashVendoredCode(vendorDir: string = VENDOR_DIR): string {
  const lines = listAllFiles(vendorDir).map((abs) => {
    const rel = relative(vendorDir, abs).split("\\").join("/");
    return `${rel}\u0000${hashFileText(abs)}`;
  });
  return sha256(lines.join("\n"));
}

/** Hash of the template file actually on disk for `ref`, or null when there is none. */
export function templateFileHash(jevDir: string, ref: string): string | null {
  let file: string;
  try {
    file = templateFileName(ref);
  } catch {
    return null;
  }
  const path = join(jevDir, "templates", file);
  return existsSync(path) ? hashFileText(path) : null;
}

/** Deterministic hash over every `*.json` under `<jevDir>/fixtures` (path + content). */
export function hashFixtureSet(jevDir: string): string {
  const root = join(jevDir, "fixtures");
  const lines = listJsonFiles(root).map((abs) => {
    const rel = relative(root, abs).split("\\").join("/");
    return `${rel}\u0000${hashFileText(abs)}`;
  });
  return sha256(lines.join("\n"));
}

/* ------------------------------------------------------------------ */
/* Template loading                                                    */
/* ------------------------------------------------------------------ */

const TEMPLATE_REF = /^([a-z0-9][a-z0-9-]*)@([1-9][0-9]*)$/;

export function templateFileName(ref: string): string {
  const m = TEMPLATE_REF.exec(ref);
  if (!m) throw new Error(`invalid template ref "${ref}" (expected <id>@<version>)`);
  return `${m[1]}.v${m[2]}.json`;
}

export function refFromTemplateFile(file: string): string | null {
  const m = /^([a-z0-9][a-z0-9-]*)\.v([1-9][0-9]*)\.json$/.exec(file);
  return m ? `${m[1]}@${m[2]}` : null;
}

function isStringRecord(v: unknown): v is Record<string, string> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every((x) => typeof x === "string")
  );
}

export function validateTemplate(raw: unknown, ref: string): JevTemplate {
  if (typeof raw !== "object" || raw === null) throw new Error(`${ref}: template must be an object`);
  const t = raw as Record<string, unknown>;
  const [id, version] = ref.split("@");
  if (t.id !== id || t.version !== Number(version)) {
    throw new Error(`${ref}: id/version inside the file do not match its name`);
  }
  if (typeof t.question_key !== "string" || !t.question_key) throw new Error(`${ref}: question_key required`);
  if (typeof t.instructions !== "string" || !t.instructions.trim()) {
    throw new Error(`${ref}: instructions required`);
  }
  switch (t.kind) {
    case "choice": {
      if (!isStringRecord(t.options) || Object.keys(t.options).length < 2) {
        throw new Error(`${ref}: choice template needs >= 2 locked options`);
      }
      const map = t.outcome_map as Record<string, unknown> | undefined;
      for (const label of Object.keys(t.options)) {
        const o = map?.[label];
        if (o !== "pass" && o !== "fail" && o !== "inconclusive") {
          throw new Error(`${ref}: outcome_map must map option "${label}" to pass|fail|inconclusive`);
        }
      }
      break;
    }
    case "noul": {
      const c = t.criteria as Record<string, unknown> | undefined;
      if (typeof c?.true !== "string" || typeof c?.false !== "string") {
        throw new Error(`${ref}: noul template needs criteria.true and criteria.false`);
      }
      if (t.pass_when !== "yes" && t.pass_when !== "no") throw new Error(`${ref}: pass_when must be yes|no`);
      break;
    }
    case "score": {
      if (!Array.isArray(t.anchors) || t.anchors.length < 2 || !t.anchors.every((a) => typeof a === "string")) {
        throw new Error(`${ref}: score template needs >= 2 string anchors`);
      }
      if (typeof t.pass_max_score !== "number" || typeof t.fail_min_score !== "number") {
        throw new Error(`${ref}: pass_max_score and fail_min_score required`);
      }
      if (t.pass_max_score >= t.fail_min_score) throw new Error(`${ref}: pass_max_score must be < fail_min_score`);
      break;
    }
    default:
      throw new Error(`${ref}: kind must be choice | noul | score`);
  }
  return t as unknown as JevTemplate;
}

export function loadTemplate(jevDir: string, ref: string): LoadedTemplate {
  const path = join(jevDir, "templates", templateFileName(ref));
  if (!existsSync(path)) throw new Error(`template ${ref} not found at ${path}`);
  const template = validateTemplate(JSON.parse(readFileSync(path, "utf-8")), ref);
  return { ref, path, sha256: hashFileText(path), template };
}

export function thresholdsOf(t: JevTemplate): GateThresholds {
  return t.thresholds ?? DEFAULT_THRESHOLDS;
}

/** Build the locked `/v1/systemone` question from a template. */
export function buildQuestion(t: JevTemplate): Question {
  switch (t.kind) {
    case "choice":
      return { type: "choice", instructions: t.instructions, criteria: { ...t.options } };
    case "noul":
      return { type: "noul", instructions: t.instructions, criteria: { ...t.criteria } };
    case "score": {
      const [first, second, ...rest] = t.anchors;
      const criteria: [EntryType, EntryType, ...EntryType[]] = [first, second, ...rest];
      return { type: "score", instructions: t.instructions, criteria };
    }
    default: {
      const never: never = t;
      throw new Error(`unknown template kind: ${JSON.stringify(never)}`);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

/** Recorded golden: which template it answers, plus the wire response. */
export interface JevFixture {
  template: string;
  note?: string;
  response: SystemOneResult;
}

export function loadFixture(jevDir: string, name: string): JevFixture {
  if (name.includes("..") || name.startsWith("/")) throw new Error(`fixture name must be relative: ${name}`);
  const path = join(jevDir, "fixtures", name);
  if (!existsSync(path)) throw new Error(`fixture ${name} not found at ${path}`);
  const raw = JSON.parse(readFileSync(path, "utf-8")) as Partial<JevFixture>;
  if (typeof raw.template !== "string" || typeof raw.response !== "object" || raw.response === null) {
    throw new Error(`fixture ${name} must have "template" and "response"`);
  }
  return raw as JevFixture;
}

/* ------------------------------------------------------------------ */
/* Lock                                                                */
/* ------------------------------------------------------------------ */

export interface JevLock {
  schema_version: 1;
  jev_repo: string;
  jev_commit: string;
  /** Hash of every file under `engine/jev/` (vendored client + grader support). */
  vendor_sha256: string;
  fixture_set_sha256: string;
  templates: Record<string, string>;
}

export const LOCK_FILE = "jev.lock.json";

export function computeLock(jevDir: string, vendorDir: string = VENDOR_DIR): JevLock {
  const templates: Record<string, string> = {};
  const tdir = join(jevDir, "templates");
  if (existsSync(tdir)) {
    for (const file of readdirSync(tdir).sort()) {
      const ref = refFromTemplateFile(file);
      if (ref) templates[ref] = hashFileText(join(tdir, file));
    }
  }
  return {
    schema_version: 1,
    jev_repo: JEV_PIN.repo,
    jev_commit: JEV_PIN.commit,
    vendor_sha256: hashVendoredCode(vendorDir),
    fixture_set_sha256: hashFixtureSet(jevDir),
    templates,
  };
}

export function readLock(jevDir: string): JevLock | null {
  const path = join(jevDir, LOCK_FILE);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8")) as JevLock;
}

export type LockCheck =
  | { kind: "ok"; lock: JevLock }
  | { kind: "drift"; problems: string[]; computed: JevLock | null };

/** Compare the committed lock with what is on disk right now. */
export function verifyLock(jevDir: string, vendorDir: string = VENDOR_DIR): LockCheck {
  const computed = computeLock(jevDir, vendorDir);
  const lock = readLock(jevDir);
  if (!lock) return { kind: "drift", problems: [`missing ${LOCK_FILE}`], computed };
  const problems: string[] = [];
  if (lock.jev_commit !== JEV_PIN.commit) {
    problems.push(`jev_commit ${lock.jev_commit} != vendored pin ${JEV_PIN.commit}`);
  }
  if (lock.vendor_sha256 !== computed.vendor_sha256) {
    problems.push(
      `vendored Jev code (engine/jev) changed without a lock update (locked ${String(lock.vendor_sha256).slice(0, 12)}, now ${computed.vendor_sha256.slice(0, 12)})`,
    );
  }
  if (lock.fixture_set_sha256 !== computed.fixture_set_sha256) {
    problems.push(
      `fixture set changed without a lock update (locked ${lock.fixture_set_sha256.slice(0, 12)}, now ${computed.fixture_set_sha256.slice(0, 12)})`,
    );
  }
  const refs = new Set([...Object.keys(lock.templates ?? {}), ...Object.keys(computed.templates)]);
  for (const ref of [...refs].sort()) {
    const locked = lock.templates?.[ref];
    const now = computed.templates[ref];
    if (locked === undefined) problems.push(`template ${ref} is not in the lock`);
    else if (now === undefined) problems.push(`locked template ${ref} is missing`);
    else if (locked !== now) {
      problems.push(`template ${ref} changed without its hash changing in the lock (bump the version or re-lock)`);
    }
  }
  return problems.length === 0 ? { kind: "ok", lock } : { kind: "drift", problems, computed };
}
