#!/usr/bin/env tsx
/**
 * Stamp central eval case JSON from eval-analyse heuristics.
 *
 * Usage:
 *   tsx scripts/eval-stamp.ts <target-id> [--out <path>] [--dry-run]
 *   tsx scripts/eval-stamp.ts --baseline-only [--out <dir>] [--dry-run]
 *
 * `--baseline-only` runs ONLY the baseline-fixtures stamp helper
 * (`stampBaselineFixtures`) — used by `pnpm run eval:baseline-stamp` and by
 * subtask 14's live-repo migration to drop the deterministic
 * fake-workspace skeleton at `<host-repo>/evals/fixtures/baseline/`.
 */
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  analyse,
  normaliseContent,
  primitiveAnalysisHash,
  resolveTarget,
  type AnalysisPayload,
  type SuggestedCase,
} from "./eval-analyse.ts";
import { loadEvalConfig, loadEvalPaths } from "../plugins/zoto-eval-system/src/config-loader.js";

function templatesDir(hostRepoRoot: string = REPO_ROOT): string {
  return loadEvalPaths(hostRepoRoot).templatesDirAbs;
}

function evalsDirFor(hostRepoRoot: string = REPO_ROOT): string {
  return loadEvalPaths(hostRepoRoot).evalsDirAbs;
}

function engineDirFor(hostRepoRoot: string = REPO_ROOT): string {
  return loadEvalPaths(hostRepoRoot).engineDirAbs;
}

function analyserCacheDir(hostRepoRoot: string = REPO_ROOT): string {
  return loadEvalPaths(hostRepoRoot).cacheDirAbs;
}
/* === Subtask 06 START === (pytest per-primitive imports) */
import {
  ANALYSER_VERSION,
  computeAnalyserCacheKey,
  loadAnalyserConfig,
  resolveAnalyserTarget,
} from "./eval-analyse.ts";
/* `AnalyserPayload` is already imported by the subtask-08 fence below; */
/* relying on that single source-of-truth keeps both fences independent. */
/* === Subtask 06 END === */

const REPO_ROOT = resolve(process.cwd());

/**
 * Only these `skill:*` ids may be stamped to `skills/<name>/evals/evals.json`
 * by the central `eval-stamp` JSON flow. All other skills still refuse —
 * operators bootstrap from `templates/skill-evals/evals.json.tmpl` instead.
 */
export const CENTRAL_STAMP_SKILL_ALLOWLIST: ReadonlySet<string> = new Set([
  "skill:zoto-eval-tooling",
]);

function isAllowlistedSkillStampTarget(targetId: string): boolean {
  return CENTRAL_STAMP_SKILL_ALLOWLIST.has(targetId.trim());
}

/* ---------------------------------------------------------------------- */
/* Baseline fixture stamping                                              */
/* ---------------------------------------------------------------------- */
/* Subtask 05 — keep this block self-contained so subtask 04's analyser   */
/* invocation edits in `main()` remain non-overlapping.                   */

const BASELINE_TEMPLATE_SUFFIX = "baseline-fixtures";
const BASELINE_DEST_SUFFIX = "fixtures/baseline";

export interface BaselineStampOptions {
  /** Source tree (defaults to the in-repo template dir). */
  source?: string;
  /** Destination tree (defaults to `<hostRepoRoot>/evals/fixtures/baseline`). */
  dest?: string;
  /** When true, compute the diff but do not write. */
  dryRun?: boolean;
}

export interface BaselineStampResult {
  source: string;
  dest: string;
  sourceChecksum: string;
  destChecksumBefore: string | null;
  destChecksumAfter: string;
  written: boolean;
  fileCount: number;
}

/**
 * Idempotent baseline-fixtures stamp. Computes a deterministic tree
 * checksum (sha256 of sorted `<posix-path>:<sha256>` lines) at both the
 * source and destination; only writes when they differ. Files land at
 * mode 0644, directories at 0755.
 */
export function stampBaselineFixtures(
  hostRepoRoot: string = REPO_ROOT,
  opts: BaselineStampOptions = {},
): BaselineStampResult {
  const source = opts.source ?? join(templatesDir(hostRepoRoot), BASELINE_TEMPLATE_SUFFIX);
  const dest = opts.dest ?? join(evalsDirFor(hostRepoRoot), BASELINE_DEST_SUFFIX);

  if (!existsSync(source)) {
    throw new Error(
      `baseline template missing at ${source} - expected templates/${BASELINE_TEMPLATE_SUFFIX}`,
    );
  }

  const sourceChecksum = treeChecksum(source);
  const destChecksumBefore = existsSync(dest) ? treeChecksum(dest) : null;

  if (destChecksumBefore === sourceChecksum) {
    return {
      source,
      dest,
      sourceChecksum,
      destChecksumBefore,
      destChecksumAfter: sourceChecksum,
      written: false,
      fileCount: countFilesUnder(source),
    };
  }

  if (opts.dryRun) {
    return {
      source,
      dest,
      sourceChecksum,
      destChecksumBefore,
      destChecksumAfter: sourceChecksum,
      written: false,
      fileCount: countFilesUnder(source),
    };
  }

  mkdirSync(dirname(dest), { recursive: true, mode: 0o755 });
  cpSync(source, dest, {
    recursive: true,
    dereference: false,
    preserveTimestamps: false,
    errorOnExist: false,
    force: true,
  });
  applyTreePermissions(dest);

  const destChecksumAfter = treeChecksum(dest);
  return {
    source,
    dest,
    sourceChecksum,
    destChecksumBefore,
    destChecksumAfter,
    written: true,
    fileCount: countFilesUnder(dest),
  };
}

function treeChecksum(root: string): string {
  const parts: string[] = [];
  walkFiles(root, root, (relPosix, absolute) => {
    const buf = readFileSync(absolute);
    const sha = createHash("sha256").update(buf).digest("hex");
    parts.push(`${relPosix}:${sha}`);
  });
  parts.sort();
  return createHash("sha256").update(parts.join("\n")).digest("hex");
}

function countFilesUnder(root: string): number {
  let n = 0;
  walkFiles(root, root, () => {
    n++;
  });
  return n;
}

function walkFiles(
  base: string,
  current: string,
  visit: (relPosix: string, absolute: string) => void,
): void {
  let names: string[];
  try {
    names = readdirSync(current);
  } catch {
    return;
  }
  for (const name of names) {
    const full = join(current, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      walkFiles(base, full, visit);
    } else if (st.isFile()) {
      const rel = posix.normalize(relative(base, full).split(sep).join("/"));
      visit(rel, full);
    }
  }
}

function applyTreePermissions(root: string): void {
  walkAllEntries(root, root, (absolute, st) => {
    try {
      chmodSync(absolute, st.isDirectory() ? 0o755 : 0o644);
    } catch {
      /* ignore — best effort on platforms that disallow chmod */
    }
  });
}

function walkAllEntries(
  base: string,
  current: string,
  visit: (absolute: string, st: import("node:fs").Stats) => void,
): void {
  let st;
  try {
    st = statSync(current);
  } catch {
    return;
  }
  visit(current, st);
  if (!st.isDirectory()) return;
  let names: string[];
  try {
    names = readdirSync(current);
  } catch {
    return;
  }
  for (const name of names) {
    walkAllEntries(base, join(current, name), visit);
  }
}

function runBaselineOnly(args: {
  outOverride: string | null;
  dry: boolean;
}): number {
  try {
    const dest = args.outOverride ? resolve(REPO_ROOT, args.outOverride) : undefined;
    const result = stampBaselineFixtures(REPO_ROOT, {
      dest,
      dryRun: args.dry,
    });
    process.stdout.write(
      JSON.stringify(
        {
          baseline_stamp: true,
          dry_run: args.dry || undefined,
          written: result.written,
          source: relative(REPO_ROOT, result.source),
          dest: relative(REPO_ROOT, result.dest),
          source_checksum: result.sourceChecksum,
          dest_checksum_before: result.destChecksumBefore,
          dest_checksum_after: result.destChecksumAfter,
          file_count: result.fileCount,
        },
        null,
        2,
      ) + "\n",
    );
    return 0;
  } catch (e) {
    console.error(
      JSON.stringify({
        error: "baseline_stamp_failed",
        message: (e as Error).message,
      }),
    );
    return 1;
  }
}

/* ---------------------------------------------------------------------- */
/* Existing case-stamp logic                                              */
/* ---------------------------------------------------------------------- */

interface CaseMeta {
  generated: boolean;
  source_hash?: string | null;
  primitive_analysis_hash?: string | null;
  last_updated?: string | null;
  generated_by?: string | null;
  partial?: boolean;
  /**
   * Subtask 04 — populated when the LLM-driven analyser runs as part of
   * stamping. See `scripts/eval-analyse.ts#runAnalyser` and
   * `templates/schema/case-meta.schema.json#primitive_analysis`.
   */
  primitive_analysis?: {
    source_hash: string;
    analysed_at: string;
    analyser_version: string;
    summary: string;
    invalidate?: boolean;
    fixture_justifications?: string[];
  };
}

interface StampedCase {
  id: number | string;
  prompt: string;
  fixtures?: { files: Array<{ path: string; content?: string; from?: string }> };
  expected_filesystem?: {
    created?: string[];
    modified?: string[];
    removed?: string[];
    unchanged?: string[];
  };
  expected_output?: string;
  files?: string[];
  assertions: string[];
  graders?: Array<Record<string, unknown>>;
  _meta?: CaseMeta;
}

interface StampedDoc {
  target_id: string;
  command_name?: string;
  agent_name?: string;
  hook_plugin?: string;
  cases: StampedCase[];
}

/** On-disk shape for allowlisted skills (`evals.json` beside `SKILL.md`). */
interface SkillStampedDoc {
  skill_name: string;
  evals: StampedCase[];
}

function isUserAuthored(c: StampedCase): boolean {
  const m = c._meta;
  if (!m) return true;
  if (m.generated === false) return true;
  return false;
}

function isGenerated(c: StampedCase): boolean {
  return Boolean(c._meta?.generated === true);
}

function materializeFixtures(
  files: Array<{ path: string; content?: string; from?: string }>
): Array<{ path: string; content: string }> {
  return files.map((f) => {
    if (f.from) {
      const abs = join(REPO_ROOT, f.from);
      if (existsSync(abs)) {
        return { path: f.path, content: readFileSync(abs, "utf-8") };
      }
      return {
        path: f.path,
        content: f.content ?? `# fixture source missing: ${f.from}`,
      };
    }
    return {
      path: f.path,
      content: f.content ?? "",
    };
  });
}

function defaultOutPath(targetId: string): string | null {
  const r = resolveTarget(targetId);
  if (!r) return null;
  if (r.kind === "skill") {
    if (!isAllowlistedSkillStampTarget(r.targetId)) return null;
    return join(dirname(r.sourcePath), "evals", "evals.json");
  }
  const name = r.name;
  if (r.kind === "command") {
    const base = r.pluginDir
      ? join(r.pluginDir, "evals", "commands", `${name}.json`)
      : join(REPO_ROOT, ".cursor", "evals", "commands", `${name}.json`);
    return base;
  }
  if (r.kind === "agent") {
    return r.pluginDir
      ? join(r.pluginDir, "evals", "agents", `${name}.json`)
      : join(REPO_ROOT, ".cursor", "evals", "agents", `${name}.json`);
  }
  /* hook */
  if (name === "cursor-workspace" || name === "cursor") {
    return join(REPO_ROOT, ".cursor", "evals", "hooks", "hooks.json");
  }
  if (!r.pluginDir) return null;
  return join(r.pluginDir, "evals", "hooks", `${name}.json`);
}

function buildGeneratedCases(
  payload: AnalysisPayload,
  primitiveHash: string,
  sourceHash: string,
  nowIso: string,
  rawSource: string,
): StampedCase[] {
  const thin = normaliseContent(rawSource).length < 450;
  return payload.suggested_cases.map((s: SuggestedCase) => {
    const partial =
      payload.kind !== "hook" &&
      (thin ||
        Boolean(s.scenario && /shape sanity|malformed/i.test(s.scenario)));
    const fix = s.fixtures?.files?.length
      ? { files: materializeFixtures(s.fixtures.files) }
      : undefined;
    return {
      id: s.id,
      prompt: s.prompt,
      fixtures: fix,
      expected_filesystem: s.expected_filesystem,
      expected_output: s.expected_output,
      assertions: s.assertions,
      graders: s.graders.length ? s.graders : undefined,
      _meta: {
        generated: true,
        source_hash: sourceHash,
        primitive_analysis_hash: primitiveHash,
        last_updated: nowIso,
        generated_by: "zoto-create-evals",
        partial: partial || undefined,
      },
    };
  });
}

function buildDocument(
  payload: AnalysisPayload,
  primitiveHash: string,
  sourceHash: string,
  nowIso: string,
  rawSource: string,
): StampedDoc {
  const name = payload.target_id.split(":")[1] ?? payload.target_id;
  const cases = buildGeneratedCases(
    payload,
    primitiveHash,
    sourceHash,
    nowIso,
    rawSource,
  );

  const doc: StampedDoc = {
    target_id: payload.target_id,
    cases: [],
  };
  if (payload.kind === "command") doc.command_name = name;
  else if (payload.kind === "agent") doc.agent_name = name;
  else if (payload.kind === "hook") doc.hook_plugin = name;

  doc.cases = cases;
  return doc;
}

function mergeWithExisting(existing: StampedDoc | null, fresh: StampedDoc): StampedDoc {
  if (!existing) return fresh;
  const kept = existing.cases.filter(isUserAuthored);
  /* Drop prior generated rows; substitute fresh.generated block */
  return {
    target_id: fresh.target_id,
    command_name: fresh.command_name ?? existing.command_name,
    agent_name: fresh.agent_name ?? existing.agent_name,
    hook_plugin: fresh.hook_plugin ?? existing.hook_plugin,
    cases: [...kept, ...fresh.cases.sort((a, b) => Number(a.id) - Number(b.id))],
  };
}

function mergeSkillWithExisting(
  existing: SkillStampedDoc | null,
  fresh: SkillStampedDoc,
): SkillStampedDoc {
  if (!existing) return fresh;
  const kept = existing.evals.filter(isUserAuthored);
  return {
    skill_name: fresh.skill_name,
    evals: [...kept, ...fresh.evals.sort((a, b) => Number(a.id) - Number(b.id))],
  };
}

function parseExistingStampedDoc(
  raw: string,
): StampedDoc | SkillStampedDoc | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.skill_name === "string" && Array.isArray(o.evals)) {
      return o as SkillStampedDoc;
    }
    if (Array.isArray(o.cases)) {
      return o as StampedDoc;
    }
  } catch {
    return null;
  }
  return null;
}

function mergeStampedUnion(
  existing: StampedDoc | SkillStampedDoc | null,
  fresh: StampedDoc | SkillStampedDoc,
): StampedDoc | SkillStampedDoc {
  if ("skill_name" in fresh) {
    const ex =
      existing && "skill_name" in existing ? (existing as SkillStampedDoc) : null;
    return mergeSkillWithExisting(ex, fresh);
  }
  return mergeWithExisting(
    existing && "cases" in existing ? (existing as StampedDoc) : null,
    fresh as StampedDoc,
  );
}

function stampedCaseCount(doc: StampedDoc | SkillStampedDoc): number {
  return "skill_name" in doc ? doc.evals.length : doc.cases.length;
}

function formatDoc(doc: StampedDoc | SkillStampedDoc): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

function printDiff(
  a: StampedDoc | SkillStampedDoc | null,
  b: StampedDoc | SkillStampedDoc,
): void {
  const sa = a ? `${JSON.stringify(a, null, 2)}\n` : "(empty)\n";
  const sb = `${JSON.stringify(b, null, 2)}\n`;
  if (sa === sb) {
    process.stdout.write("(no JSON delta)\n");
    return;
  }
  process.stdout.write("--- existing (or empty)\n+++ stamped\n");
  process.stdout.write(
    `byte delta: existing ${sa.length} → new ${sb.length}\n`
  );
  /* line-oriented hint */
  const al = sa.split("\n");
  const bl = sb.split("\n");
  const max = Math.max(al.length, bl.length);
  for (let i = 0; i < Math.min(max, 200); i++) {
    if (al[i] !== bl[i]) {
      process.stdout.write(`@@ line ${i + 1}\n-${al[i] ?? ""}\n+${bl[i] ?? ""}\n`);
    }
  }
  if (max > 200) process.stdout.write(`... truncated (${max} lines total)\n`);
}

function atomicWriteJson(path: string, obj: unknown): void {
  const dir = resolve(path, "..");
  mkdirSync(dir, { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`, "utf-8");
  renameSync(tmp, path);
}

function printHelp(): void {
  process.stdout.write(
    [
      "Usage:",
      "  tsx scripts/eval-stamp.ts <target-id> [--dry-run] [--with-analyser] [--no-analyser]",
      "  tsx scripts/eval-stamp.ts --baseline-only [--out <dir>] [--dry-run]",
      "  tsx scripts/eval-stamp.ts --stamp-pytest [--target <id>] [--out <dir>] [--dry-run]",
      "",
      "Modes:",
      "  <target-id>        Stamp the co-located LLM eval test file for a single",
      "                     primitive. Path: <kind-dir>/evals/<name>.test.ts.",
      "                     Skills are skipped — their evals.json is retained.",
      "  --baseline-only    Stamp ONLY the baseline-fixtures skeleton from",
      "                     plugins/zoto-eval-system/templates/baseline-fixtures/",
      "                     into evals/fixtures/baseline/ (idempotent).",
      "  --stamp-pytest     Stamp per-primitive pytest test files for either a",
      "                     single --target (any kind, including skills) or for",
      "                     every primitive in .zoto/eval-system/manifest.yml.",
      "                     Refuses when static.framework !== 'pytest' or when",
      "                     the cached analyser payload contains zero assertions.",
      "",
      "Flags:",
      "  --out <path>       Override output (baseline / --stamp-pytest modes only).",
      "  --target <id>      Restrict --stamp-pytest to a single target id.",
      "  --dry-run          Compute changes without writing.",
      "  --with-analyser    Force-enable the LLM analyser pass.",
      "  --no-analyser      Force-disable the LLM analyser pass.",
      "  --help, -h         Show this help.",
      "",
      "Analyser auto-enables when CURSOR_API_KEY or",
      "ZOTO_EVAL_ANALYSER_FIXTURE_DIR is set; otherwise it is skipped with a",
      "stderr warning so offline stamping still works.",
      "",
    ].join("\n"),
  );
}

/* ---------------------------------------------------------------------- */
/* Analyser wiring (subtask 04)                                            */
/* ---------------------------------------------------------------------- */
/* Self-contained block. Subtask 05 owns the baseline-only block above;   */
/* subtask 04 owns this block. Keep mutations confined to                  */
/* `applyPrimitiveAnalysisToDoc` so neither subtask has to restructure     */
/* the other's helpers.                                                   */

interface AnalyserApplyOutcome {
  applied: boolean;
  source: "fresh" | "cache" | "replay" | "skipped" | "error";
  reason?: string;
  payloadSourceHash?: string;
}

/**
 * Best-effort per-primitive analyser invocation. Mutates generated rows in
 * `doc.cases` or `doc.evals` in place: every generated case receives an
 * up-to-date `_meta.primitive_analysis` block. Failures are logged to stderr
 * and the function returns `{ applied: false }` rather than throwing — the
 * stamper must remain usable in offline / no-API-key environments.
 */
async function applyPrimitiveAnalysisToDoc(
  doc: StampedDoc | SkillStampedDoc,
  targetId: string,
  opts: { enabled: boolean },
): Promise<AnalyserApplyOutcome> {
  if (!opts.enabled) {
    return { applied: false, source: "skipped", reason: "disabled" };
  }
  let mod;
  try {
    mod = await import("./eval-analyse.ts");
  } catch (e) {
    return {
      applied: false,
      source: "error",
      reason: `analyser import failed: ${(e as Error).message}`,
    };
  }
  const budget = mod.newAnalyserBudget();
  const rows = "skill_name" in doc ? doc.evals : doc.cases;
  try {
    const result = await mod.runAnalyser({ target: targetId }, { budget });
    const now = new Date().toISOString();
    let mutated = 0;
    for (const c of rows) {
      if (!c._meta?.generated) continue;
      c._meta.primitive_analysis = {
        source_hash: result.payload.source_hash,
        analysed_at: now,
        analyser_version: result.payload.analyser_version,
        summary: result.payload.summary,
      };
      mutated += 1;
    }
    process.stderr.write(
      `${JSON.stringify({
        analyser_apply: {
          target_id: targetId,
          source: result.source,
          cases_annotated: mutated,
          source_hash: result.payload.source_hash,
        },
      })}\n`,
    );
    mod.emitCostSummary(budget);
    return {
      applied: mutated > 0,
      source: result.source,
      payloadSourceHash: result.payload.source_hash,
    };
  } catch (e) {
    mod.emitCostSummary(budget);
    process.stderr.write(
      `${JSON.stringify({
        warn: "analyser_skipped",
        target_id: targetId,
        message: (e as Error).message,
      })}\n`,
    );
    return {
      applied: false,
      source: "error",
      reason: (e as Error).message,
    };
  }
}

function shouldEnableAnalyser(args: {
  withAnalyser: boolean;
  noAnalyser: boolean;
}): boolean {
  if (args.noAnalyser) return false;
  if (args.withAnalyser) return true;
  return Boolean(
    process.env.CURSOR_API_KEY || process.env.ZOTO_EVAL_ANALYSER_FIXTURE_DIR,
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let targetId = "";
  let outOverride: string | null = null;
  let dry = false;
  let baselineOnly = false;
  let withAnalyser = false;
  let noAnalyser = false;
  /* === Subtask 06 START === (CLI flag parsing) */
  let stampPytestOnly = false;
  let stampPytestTargetArg: string | null = null;
  /* === Subtask 06 END === */
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") dry = true;
    else if (argv[i] === "--baseline-only") baselineOnly = true;
    else if (argv[i] === "--with-analyser") withAnalyser = true;
    else if (argv[i] === "--no-analyser") noAnalyser = true;
    /* === Subtask 06 START === (CLI flag parsing) */
    else if (argv[i] === "--stamp-pytest") {
      stampPytestOnly = true;
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        stampPytestTargetArg = next;
        i += 1;
      }
    } else if (argv[i] === "--target" && argv[i + 1]) {
      stampPytestTargetArg = argv[++i];
    }
    /* === Subtask 06 END === */
    else if (argv[i] === "--help" || argv[i] === "-h") {
      printHelp();
      return;
    } else if (argv[i] === "--out" && argv[i + 1]) {
      outOverride = argv[++i];
    } else if (!argv[i].startsWith("-")) targetId = argv[i];
  }

  if (baselineOnly) {
    const code = runBaselineOnly({ outOverride, dry });
    process.exit(code);
  }

  /* === Subtask 06 START === (--stamp-pytest CLI mode) */
  if (stampPytestOnly) {
    const code = await runStampPytestOnly({
      hostRepoRoot: REPO_ROOT,
      target: stampPytestTargetArg ?? targetId,
      dry,
      outOverride,
    });
    process.exit(code);
  }
  /* === Subtask 06 END === */

  if (!targetId) {
    console.error(
      JSON.stringify({
        error: "usage",
        message:
          "tsx scripts/eval-stamp.ts <target-id> [--out <path>] [--dry-run]  |  tsx scripts/eval-stamp.ts --baseline-only [--out <dir>] [--dry-run]",
      })
    );
    process.exit(1);
  }

  const rawResolved = resolveTarget(targetId);
  if (!rawResolved) {
    console.error(
      JSON.stringify({ error: "target not found", target_id: targetId })
    );
    process.exit(1);
  }

  const analysis = analyse(targetId);
  if ("error" in analysis) {
    console.error(JSON.stringify(analysis));
    process.exit(1);
  }
  if ("ignored" in analysis) {
    /* Vendored / explicitly ignored — exit 0 cleanly without writing. */
    process.stderr.write(JSON.stringify(analysis) + "\n");
    return;
  }

  /* === Subtask 06 (single-LLM-emitter co-located) ===                    */
  /* Skills retain their `evals.json` (KD-1); rules are not eval-stamped.  */
  if (analysis.kind === "skill") {
    const evalsJson = join(
      dirname(rawResolved.sourcePath),
      "evals",
      "evals.json",
    );
    const relPath = relative(REPO_ROOT, evalsJson);
    process.stdout.write(
      JSON.stringify({
        skipped: "skill",
        target_id: targetId,
        path: relPath,
        note: `skill — no TS sidecar; eval JSON at \`${relPath}\` retained`,
      }) + "\n",
    );
    return;
  }
  if (analysis.kind === "rule") {
    process.stdout.write(
      JSON.stringify({
        skipped: "rule",
        target_id: targetId,
        path: relative(REPO_ROOT, rawResolved.sourcePath),
        note: "rule — not eval-stamped",
      }) + "\n",
    );
    return;
  }

  const payload = await tryLoadAnalyserPayload(targetId, {
    withAnalyser,
    noAnalyser,
  });

  if (!payload?.cases?.length) {
    console.error(
      JSON.stringify({
        error: "missing_cached_analyser_payload",
        detail:
          "stampTarget requires a cached analyser payload (or a live analyser run with --with-analyser). Run `pnpm run eval:analyse -- <target-id>` first.",
        target_id: targetId,
      }),
    );
    process.exit(1);
  }

  if (outOverride !== null) {
    process.stderr.write(
      JSON.stringify({
        warn: "outOverride_unused",
        detail:
          "--out is ignored by the single-LLM-emitter flow; the emit path is co-located at <kind>/evals/<name>.test.ts.",
        target_id: targetId,
      }) + "\n",
    );
  }

  const stampResult = await stampTarget(REPO_ROOT, targetId, payload, {
    dryRun: dry,
    sourcePath: rawResolved.sourcePath,
  });

  const pytestOutcome = maybeStampPytestForTarget(REPO_ROOT, targetId);

  const reportRecord: Record<string, unknown> = {
    target_id: targetId,
    backend: stampResult.backend,
    written: stampResult.written,
    path: stampResult.path,
    files_written: stampResult.llm.files_written,
    pytest_stamp: "skipped" in pytestOutcome
      ? { skipped: true, reason: pytestOutcome.reason }
      : {
          written: pytestOutcome.written,
          path: relative(REPO_ROOT, pytestOutcome.outPath),
          cases: pytestOutcome.cases,
          assertions: pytestOutcome.assertions,
        },
  };
  if (dry) {
    reportRecord.dry_run = true;
    reportRecord.would_write = stampResult.path;
  }
  process.stdout.write(JSON.stringify(reportRecord) + "\n");
}

/* ---------------------------------------------------------------------- */
/* === Subtask 06 START ===                                               */
/* ---------------------------------------------------------------------- */
/* Per-primitive pytest test stamper. Self-contained: keeps subtask-04   */
/* (analyser wiring) and subtask-05 (baseline fixtures) helpers          */
/* untouched. Reads the analyser payload from the on-disk cache only —   */
/* never triggers a fresh LLM call from this code path.                   */

const PYTEST_TEMPLATE_SUFFIX = "static/pytest/per-primitive-test.py.tmpl";
const PYTEST_CONFTEST_TMPL_SUFFIX = "static/pytest/conftest.py.tmpl";
const PYTEST_REPORTER_TMPL_SUFFIX = "static/pytest/_reporter.py.tmpl";

export interface PytestPrimitiveStampMeta {
  /** Short slug used in the file name (defaults to the target's name). */
  slug?: string;
  /** Override the analyser_version baked into the file header. */
  analyserVersion?: string;
}

export interface PytestStampResult {
  outPath: string;
  written: boolean;
  cases: number;
  assertions: number;
}

const NEEDLE_RE_BACKTICK = /`([^`\n]+)`/g;
const NEEDLE_RE_DOUBLE = /"([^"\n]{2,80})"/g;
const NEEDLE_RE_SINGLE = /'([^'\n]{2,80})'/g;
const NEEDLE_RE_IDENT = /\b([A-Za-z][A-Za-z0-9_]{4,})\b/g;
const NEEDLE_STOPWORDS = new Set([
  "asserts",
  "assert",
  "should",
  "shouldn",
  "result",
  "results",
  "expect",
  "expected",
  "expects",
  "primitive",
  "primitives",
  "skill",
  "command",
  "agent",
  "rule",
  "rules",
  "hook",
  "hooks",
  "value",
  "values",
  "string",
  "strings",
  "number",
  "numbers",
  "object",
  "objects",
  "array",
  "arrays",
]);

function pythonRepr(s: string): string {
  /* JSON string syntax is a strict subset of Python literal grammar. */
  return JSON.stringify(s);
}

function pythonReprList(xs: string[]): string {
  return `[${xs.map(pythonRepr).join(", ")}]`;
}

function slugify(s: string): string {
  return s
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function pushUnique(out: string[], seen: Set<string>, raw: string): void {
  const t = raw.trim();
  if (t.length < 3) return;
  const key = t.toLowerCase();
  if (NEEDLE_STOPWORDS.has(key)) return;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(t);
}

/**
 * Extract one or more "needles" from an analyser-derived assertion string.
 * Strategy: prefer literal tokens (backticks / quoted strings), fall back
 * to identifier-shaped words. Capped at 6 needles to keep parametrize ids
 * readable.
 */
export function extractAssertionNeedles(assertion: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const re of [NEEDLE_RE_BACKTICK, NEEDLE_RE_DOUBLE, NEEDLE_RE_SINGLE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(assertion)) !== null) {
      pushUnique(out, seen, m[1]);
    }
  }
  if (out.length === 0) {
    NEEDLE_RE_IDENT.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = NEEDLE_RE_IDENT.exec(assertion)) !== null) {
      pushUnique(out, seen, m[1]);
    }
  }
  return out.slice(0, 6);
}

function readCachedAnalyserPayload(
  hostRepoRoot: string,
  targetId: string,
): AnalyserPayload | null {
  const resolved = resolveAnalyserTarget(targetId, hostRepoRoot);
  if (!resolved) return null;
  let raw: string;
  try {
    raw = readFileSync(resolved.sourcePath, "utf-8");
  } catch {
    return null;
  }
  const cfg = loadAnalyserConfig(hostRepoRoot);
  const cacheKey = computeAnalyserCacheKey({
    normalisedSource: normaliseContent(raw),
    analyserVersion: ANALYSER_VERSION,
    modelId: cfg.modelId,
  });
  const cacheFile = join(analyserCacheDir(hostRepoRoot), `${cacheKey}.json`);
  if (!existsSync(cacheFile)) return null;
  try {
    return JSON.parse(readFileSync(cacheFile, "utf-8")) as AnalyserPayload;
  } catch {
    return null;
  }
}

function loadStaticFramework(hostRepoRoot: string): string | null {
  try {
    return loadEvalConfig(hostRepoRoot).config.static.framework;
  } catch {
    return null;
  }
}

/**
 * Stamp a single per-primitive pytest test file from an analyser payload.
 * Output lands at ``<hostRepoRoot>/evals/test_<kind>_<slug>.py`` and
 * always carries the ``# _meta.generated: True`` header from the template.
 *
 * Throws when the payload contains zero assertions — the caller must run
 * the analyser first. Idempotent at the file-content level: regenerating
 * with an unchanged payload produces a byte-identical file.
 */
export function stampPytestPerPrimitive(
  hostRepoRoot: string,
  payload: AnalyserPayload,
  meta: PytestPrimitiveStampMeta = {},
  opts: { dryRun?: boolean; templateOverride?: string; outDir?: string } = {},
): PytestStampResult {
  const totalAssertions = payload.cases.reduce(
    (n, c) => n + (Array.isArray(c.assertions) ? c.assertions.length : 0),
    0,
  );
  if (totalAssertions === 0) {
    throw new Error(
      `stampPytestPerPrimitive: analyser payload for ${payload.target_id} contains zero assertions — refusing to emit. Run the analyser first (\`pnpm run eval:analyse --target ${payload.target_id}\`).`,
    );
  }

  const templatePath =
    opts.templateOverride ?? join(templatesDir(hostRepoRoot), PYTEST_TEMPLATE_SUFFIX);
  if (!existsSync(templatePath)) {
    throw new Error(`pytest per-primitive template missing: ${templatePath}`);
  }
  const tmpl = readFileSync(templatePath, "utf-8");

  const targetName = payload.target_id.split(":")[1] ?? payload.target_id;
  const slug = meta.slug ?? slugify(targetName);
  const outDir = opts.outDir ?? evalsDirFor(hostRepoRoot);
  const outFile = `test_${payload.kind}_${slug}.py`;
  const outPath = join(outDir, outFile);

  const assertionRows: string[] = [];
  let assertionIdx = 0;
  for (const c of payload.cases) {
    for (const a of c.assertions ?? []) {
      const needles = extractAssertionNeedles(a);
      assertionRows.push(
        `    (${assertionIdx}, ${pythonRepr(c.scenario)}, ${pythonRepr(a)}, ${pythonReprList(needles)}),`,
      );
      assertionIdx += 1;
    }
  }

  const runtimeCases = payload.cases.map((c) => ({
    scenario: c.scenario,
    prompt: c.prompt,
    assertions: c.assertions ?? [],
    follow_ups: c.follow_ups ?? null,
    fixtures: c.fixtures ?? null,
    expected_filesystem: c.expected_filesystem ?? null,
    expected_output: c.expected_output ?? null,
  }));
  /* JSON.stringify never produces a literal `"""` substring (string
   * delimiters always escape inner quotes), so it is safe to embed the
   * JSON text inside a Python r"""...""" raw string in the template. */
  const runtimeCasesJson = JSON.stringify(runtimeCases, null, 2);

  const fullPayloadObj = {
    schema_version: payload.schema_version,
    analyser_version: meta.analyserVersion ?? payload.analyser_version,
    model_id: payload.model_id,
    target_id: payload.target_id,
    kind: payload.kind,
    source_path: payload.source_path,
    source_hash: payload.source_hash,
    summary: payload.summary,
    cases: runtimeCases,
  };
  const fullPayloadJson = JSON.stringify(fullPayloadObj, null, 2);
  /* Deterministic LAST_UPDATED so an unchanged payload re-stamps to a
   * byte-identical file (idempotency). Derived from the analyser
   * version + first 8 chars of the source_hash; both bump only when
   * meaningful inputs change, which is the contract operators care
   * about. Wall-clock stamps are intentionally avoided because they
   * break diff-based reviews and updater drift detection. */
  const lastUpdated = `${meta.analyserVersion ?? payload.analyser_version}+${payload.source_hash.slice(0, 8)}`;

  const replacements: Record<string, string> = {
    "{{TARGET_ID}}": payload.target_id,
    "{{SOURCE_PATH}}": payload.source_path,
    "{{SOURCE_HASH}}": payload.source_hash,
    "{{KIND}}": payload.kind,
    "{{ANALYSER_VERSION}}": meta.analyserVersion ?? payload.analyser_version,
    "{{MODEL_ID}}": payload.model_id,
    "{{LAST_UPDATED}}": lastUpdated,
    "{{TARGET_ID_JSON}}": pythonRepr(payload.target_id),
    "{{SOURCE_PATH_JSON}}": pythonRepr(payload.source_path),
    "{{SOURCE_HASH_JSON}}": pythonRepr(payload.source_hash),
    "{{KIND_JSON}}": pythonRepr(payload.kind),
    "{{ANALYSER_VERSION_JSON}}": pythonRepr(
      meta.analyserVersion ?? payload.analyser_version,
    ),
    "{{MODEL_ID_JSON}}": pythonRepr(payload.model_id),
    "{{LAST_UPDATED_JSON}}": pythonRepr(lastUpdated),
    "{{SUMMARY_JSON}}": pythonRepr(payload.summary),
    "{{ASSERTION_ROWS}}": assertionRows.join("\n"),
    "{{RUNTIME_CASES_JSON}}": runtimeCasesJson,
    "{{PAYLOAD_JSON}}": fullPayloadJson,
  };

  let rendered = tmpl;
  for (const [k, v] of Object.entries(replacements)) {
    rendered = rendered.split(k).join(v);
  }

  if (opts.dryRun) {
    return {
      outPath,
      written: false,
      cases: runtimeCases.length,
      assertions: assertionIdx,
    };
  }
  mkdirSync(dirname(outPath), { recursive: true });
  /* Idempotent write: only touch disk when rendered content differs. */
  if (existsSync(outPath)) {
    try {
      const prev = readFileSync(outPath, "utf-8");
      if (prev === rendered) {
        /* Still ensure the conftest/reporter sibling files exist
         * (they are template-driven, so re-stamping them is cheap). */
        ensurePytestSupportFiles(outDir);
        return {
          outPath,
          written: false,
          cases: runtimeCases.length,
          assertions: assertionIdx,
        };
      }
    } catch {
      /* fall through and overwrite */
    }
  }
  writeFileSync(outPath, rendered, "utf-8");
  ensurePytestSupportFiles(outDir);
  return {
    outPath,
    written: true,
    cases: runtimeCases.length,
    assertions: assertionIdx,
  };
}

/**
 * Idempotently stamp the pytest harness sibling files (``conftest.py``
 * and ``_zoto_static_reporter.py``) into the host repo's ``evals/``
 * directory. Files are only written when missing or when their content
 * differs from the template. Returns the list of files that were
 * (re-)written.
 */
export function ensurePytestSupportFiles(
  evalsDir: string,
  opts: {
    conftestTemplateOverride?: string;
    reporterTemplateOverride?: string;
    /** Stamp the conftest? Set false when the host owns conftest.py. */
    stampConftest?: boolean;
  } = {},
): string[] {
  mkdirSync(evalsDir, { recursive: true });
  const written: string[] = [];

  const reporterDest = join(evalsDir, "_zoto_static_reporter.py");
  const reporterTmplPath =
    opts.reporterTemplateOverride ?? join(templatesDir(hostRepoRoot), PYTEST_REPORTER_TMPL_SUFFIX);
  if (existsSync(reporterTmplPath)) {
    const reporterBody = readFileSync(reporterTmplPath, "utf-8");
    if (
      !existsSync(reporterDest) ||
      readFileSync(reporterDest, "utf-8") !== reporterBody
    ) {
      writeFileSync(reporterDest, reporterBody, "utf-8");
      written.push(reporterDest);
    }
  }

  if (opts.stampConftest !== false) {
    const conftestDest = join(evalsDir, "conftest.py");
    const conftestTmplPath =
      opts.conftestTemplateOverride ??
      join(templatesDir(hostRepoRoot), PYTEST_CONFTEST_TMPL_SUFFIX);
    if (existsSync(conftestTmplPath)) {
      const conftestBody = readFileSync(conftestTmplPath, "utf-8");
      /* Conftest is user-editable. Only stamp when missing — never
       * clobber an existing user-authored copy. The reporter sibling
       * is the regenerable contract. */
      if (!existsSync(conftestDest)) {
        writeFileSync(conftestDest, conftestBody, "utf-8");
        written.push(conftestDest);
      }
    }
  }
  return written;
}

/**
 * Wire-in helper invoked from main() once per stamped target. No-op
 * when ``static.framework !== "pytest"`` or when no cached analyser
 * payload is available (e.g. analyser was disabled / offline).
 */
function maybeStampPytestForTarget(
  hostRepoRoot: string,
  targetId: string,
): { skipped: true; reason: string } | PytestStampResult {
  const fw = loadStaticFramework(hostRepoRoot);
  if (fw !== "pytest") {
    return { skipped: true, reason: `static.framework=${fw ?? "unset"}` };
  }
  const payload = readCachedAnalyserPayload(hostRepoRoot, targetId);
  if (!payload) {
    return {
      skipped: true,
      reason: "no_cached_analyser_payload (run analyser first)",
    };
  }
  try {
    return stampPytestPerPrimitive(hostRepoRoot, payload);
  } catch (e) {
    return { skipped: true, reason: (e as Error).message };
  }
}

/**
 * Top-level CLI entrypoint for ``--stamp-pytest [--target <id>]``.
 *
 * Unlike the per-target wire-in above (``maybeStampPytestForTarget``),
 * this mode:
 *
 *   * Honours skill targets (the legacy main flow exits early on
 *     skills because they don't get central JSON; pytest stamping
 *     still applies).
 *   * Refuses when ``static.framework !== "pytest"`` to avoid
 *     emitting pytest files in a vitest/jest-configured repo.
 *   * Refuses when the cached analyser payload contains zero
 *     assertions (per DoD #3 — operator must run the analyser first).
 *   * Iterates discovered targets when ``--target`` is omitted. Each
 *     target is stamped independently; per-target failures are
 *     reported but don't abort the batch.
 */
export async function runStampPytestOnly(args: {
  hostRepoRoot: string;
  target: string | null;
  dry: boolean;
  outOverride: string | null;
}): Promise<number> {
  const fw = loadStaticFramework(args.hostRepoRoot);
  if (fw && fw !== "pytest") {
    process.stderr.write(
      `${JSON.stringify({
        error: "framework_mismatch",
        message: `Refusing to stamp pytest files: static.framework=${fw}. Run /z-eval-configure to switch to pytest first.`,
        framework: fw,
      })}\n`,
    );
    return 2;
  }

  const targets = await resolveStampPytestTargets(args.hostRepoRoot, args.target);
  if (targets.length === 0) {
    process.stderr.write(
      `${JSON.stringify({
        error: "no_targets",
        message:
          "No targets to stamp. Pass --target <id-or-path> or run /z-eval-create to populate the discovery manifest.",
      })}\n`,
    );
    return 1;
  }

  const results: Array<Record<string, unknown>> = [];
  let exitCode = 0;
  const overrideOutDir = args.outOverride
    ? resolve(args.hostRepoRoot, args.outOverride)
    : undefined;

  for (const targetId of targets) {
    const payload = readCachedAnalyserPayload(args.hostRepoRoot, targetId);
    if (!payload) {
      results.push({
        target_id: targetId,
        skipped: true,
        reason: "no_cached_analyser_payload",
      });
      exitCode = 3;
      continue;
    }
    try {
      const r = stampPytestPerPrimitive(
        args.hostRepoRoot,
        payload,
        {},
        { dryRun: args.dry, outDir: overrideOutDir },
      );
      results.push({
        target_id: targetId,
        out_path: relative(args.hostRepoRoot, r.outPath),
        written: r.written,
        cases: r.cases,
        assertions: r.assertions,
      });
    } catch (e) {
      results.push({
        target_id: targetId,
        error: (e as Error).message,
      });
      exitCode = 4;
    }
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        stamp_pytest: true,
        framework: fw ?? "unset",
        dry_run: args.dry || undefined,
        targets: results.length,
        results,
      },
      null,
      2,
    )}\n`,
  );
  return exitCode;
}

/**
 * Resolve the target id list for ``runStampPytestOnly``. When the
 * caller passes ``--target``, we use that one id. Otherwise we walk
 * the discovery manifest at ``.zoto/eval-system/manifest.yml`` for
 * every covered primitive. Skills, commands, agents, and hooks are
 * all eligible — pytest stamping is per-primitive regardless of where
 * the central eval JSON lives.
 */
async function resolveStampPytestTargets(
  hostRepoRoot: string,
  target: string | null,
): Promise<string[]> {
  if (target && target.trim().length > 0) return [target.trim()];
  const manifestPath = join(hostRepoRoot, ".zoto", "eval-system", "manifest.yml");
  if (!existsSync(manifestPath)) return [];
  let yamlMod: { load: (s: string) => unknown };
  try {
    yamlMod = (await import("js-yaml")) as unknown as {
      load: (s: string) => unknown;
    };
  } catch {
    return [];
  }
  try {
    const raw = readFileSync(manifestPath, "utf-8");
    const parsed = yamlMod.load(raw) as
      | { targets?: Array<{ id?: string }> }
      | null
      | undefined;
    const targets = parsed?.targets ?? [];
    return targets
      .map((t) => (typeof t.id === "string" ? t.id : ""))
      .filter((s) => s.length > 0);
  } catch {
    return [];
  }
}
/* === Subtask 06 END === */

// === Subtask 08 START ===
/* Subtask 08 — Jest static-backend stamping.                              */
/*                                                                          */
/* Mutual-exclusion ownership: this fence DEFINES the bidirectional        */
/* `assertNoConflictingFramework` / `FrameworkConflictError` /             */
/* `StaticFramework` / `PrimitiveMeta` symbols. The subtask 07 fence       */
/* below re-uses them directly (both fences live in the same module so a   */
/* single canonical symbol is observed by both stampers). Subtask 07       */
/* documented this fence as the original "placeholder" owner; that         */
/* coordination note is now informational — the implementation here is    */
/* the active export and the contract is symmetric with the one called    */
/* from `stampVitestPerPrimitive`.                                          */

import type { AnalyserPayload } from "./eval-analyse.ts";

const JEST_TEMPLATE_SUFFIX = "static/jest";
const SHARED_TEMPLATE_SUFFIX = "static/_shared";

export type StaticFramework = "jest" | "vitest";

export interface PrimitiveMeta {
  /** Stable id used as the test filename stem (e.g. `command_zoto-eval-create`). */
  slug: string;
  /** Canonical analyser target id (e.g. `command:zoto-eval-create`). */
  target_id: string;
  /** Path to the source primitive (markdown, JSON, etc.). */
  source_path: string;
  /** sha256 hex of the normalised source. */
  source_hash: string;
}

export interface JestStampOptions {
  /** Skip the mutual-exclusion guard (test-only escape hatch). */
  bypassGuard?: boolean;
  /** Override source template root (test seam). */
  templateRoot?: string;
  /** Override shared writer source path (test seam — also relative to repo). */
  sharedTemplateRoot?: string;
  /** When true, compute changes without writing. */
  dryRun?: boolean;
}

export interface JestStampResult {
  hostRepoRoot: string;
  evalsDir: string;
  testFile: string;
  configFile: string;
  setupFile: string;
  reporterFile: string;
  sharedWriterFile: string;
  written: string[];
  unchanged: string[];
}

export class FrameworkConflictError extends Error {
  readonly target: StaticFramework;
  readonly conflicts: string[];

  constructor(target: StaticFramework, conflicts: string[]) {
    const other = target === "jest" ? "vitest" : "jest";
    super(
      `Refusing to stamp ${target} static backend: detected conflicting ${other} ` +
        `artefacts in host repo (${conflicts.join(", ")}). Run /z-eval-configure ` +
        `to pick a single static framework, or invoke the cleanup engine to remove ` +
        `the unused backend before retrying.`,
    );
    this.name = "FrameworkConflictError";
    this.target = target;
    this.conflicts = conflicts;
  }
}

/**
 * Symmetric mutual-exclusion guard for the static eval backends.
 *
 * Defined once in this fence and consumed by both `stampJestPerPrimitive`
 * (this fence) and `stampVitestPerPrimitive` (subtask 07's fence below).
 * Bidirectional contract:
 *   • `assertNoConflictingFramework("jest", root)`  — refuses on vitest
 *     artefacts (config file or devDependency).
 *   • `assertNoConflictingFramework("vitest", root)` — refuses on jest
 *     artefacts (config file or devDependency).
 *
 * Detection is intentionally conservative: presence of a config file under
 * `evals/` or the repo root, or a devDependency entry in `package.json`.
 */
export function assertNoConflictingFramework(
  target: StaticFramework,
  hostRepoRoot: string,
): void {
  const other: StaticFramework = target === "jest" ? "vitest" : "jest";
  const conflicts: string[] = [];

  /* Config-file detection */
  const configCandidates = otherFrameworkConfigCandidates(other);
  for (const rel of configCandidates) {
    const abs = join(hostRepoRoot, rel);
    if (existsSync(abs)) conflicts.push(rel);
  }

  /* devDependency detection */
  const pkgPath = join(hostRepoRoot, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
        devDependencies?: Record<string, string>;
        dependencies?: Record<string, string>;
      };
      const dev = pkg.devDependencies ?? {};
      const prod = pkg.dependencies ?? {};
      if (other in dev || other in prod) {
        conflicts.push(`package.json#/devDependencies/${other}`);
      }
    } catch {
      /* malformed package.json — let other tooling surface that error */
    }
  }

  if (conflicts.length > 0) {
    throw new FrameworkConflictError(target, conflicts);
  }
}

function otherFrameworkConfigCandidates(other: StaticFramework): string[] {
  if (other === "vitest") {
    return [
      "evals/vitest.config.ts",
      "evals/vitest.config.mts",
      "evals/vitest.config.js",
      "vitest.config.ts",
      "vitest.config.mts",
      "vitest.config.js",
    ];
  }
  return [
    "evals/jest.config.ts",
    "evals/jest.config.js",
    "evals/jest.config.cjs",
    "evals/jest.config.mjs",
    "jest.config.ts",
    "jest.config.js",
    "jest.config.cjs",
    "jest.config.mjs",
  ];
}

function loadTemplate(absolute: string): string {
  if (!existsSync(absolute)) {
    throw new Error(`jest template missing at ${absolute}`);
  }
  return readFileSync(absolute, "utf-8");
}

function renderPerPrimitiveTest(
  template: string,
  payload: AnalyserPayload,
  primitive: PrimitiveMeta,
): string {
  return template
    .replaceAll("{{TARGET_ID}}", primitive.target_id)
    .replaceAll("{{SOURCE_PATH}}", primitive.source_path)
    .replaceAll("{{SOURCE_HASH}}", primitive.source_hash)
    .replaceAll("{{PAYLOAD_JSON}}", JSON.stringify(payload, null, 2));
}

function ensureGeneratedMarker(content: string): string {
  const expected = "// _meta.generated: true";
  const firstLine = content.split("\n", 1)[0] ?? "";
  if (firstLine === expected) return content;
  return `${expected}\n${content}`;
}

function writeIfChanged(
  abs: string,
  body: string,
  state: { written: string[]; unchanged: string[] },
  dryRun: boolean,
): void {
  const existing = existsSync(abs) ? readFileSync(abs, "utf-8") : null;
  if (existing === body) {
    state.unchanged.push(abs);
    return;
  }
  if (dryRun) {
    state.written.push(abs);
    return;
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body, "utf-8");
  state.written.push(abs);
}

/**
 * Stamp the jest static backend into a host repo for a single primitive.
 *
 * Idempotent — files are only written when their content differs from the
 * existing on-disk content (poor-man's checksum gate). The mutual-exclusion
 * guard runs first and throws `FrameworkConflictError` when vitest
 * artefacts are detected.
 */
export function stampJestPerPrimitive(
  hostRepoRoot: string,
  payload: AnalyserPayload,
  primitive: PrimitiveMeta,
  opts: JestStampOptions = {},
): JestStampResult {
  if (!opts.bypassGuard) {
    assertNoConflictingFramework("jest", hostRepoRoot);
  }

  const templateRoot = opts.templateRoot ?? join(templatesDir(hostRepoRoot), JEST_TEMPLATE_SUFFIX);
  const sharedRoot =
    opts.sharedTemplateRoot ?? join(templatesDir(hostRepoRoot), SHARED_TEMPLATE_SUFFIX);
  const evalsDir = evalsDirFor(hostRepoRoot);

  const testFile = join(evalsDir, `${primitive.slug}.test.ts`);
  const configFile = join(evalsDir, "jest.config.ts");
  const setupFile = join(evalsDir, "setup.ts");
  const reporterFile = join(evalsDir, "reporters", "zoto-eval-reporter.ts");
  const sharedWriterFile = join(evalsDir, "_shared", "result-yaml-writer.ts");

  const state: { written: string[]; unchanged: string[] } = {
    written: [],
    unchanged: [],
  };

  const testTemplate = loadTemplate(
    join(templateRoot, "per-primitive-test.ts.tmpl"),
  );
  const configTemplate = loadTemplate(
    join(templateRoot, "jest.config.ts.tmpl"),
  );
  const setupTemplate = loadTemplate(join(templateRoot, "setup.ts.tmpl"));
  const reporterTemplate = loadTemplate(
    join(templateRoot, "reporters", "zoto-eval-reporter.ts.tmpl"),
  );
  const sharedWriterTemplate = loadTemplate(
    join(sharedRoot, "result-yaml-writer.ts.tmpl"),
  );

  const renderedTest = ensureGeneratedMarker(
    renderPerPrimitiveTest(testTemplate, payload, primitive),
  );

  writeIfChanged(testFile, renderedTest, state, opts.dryRun ?? false);
  writeIfChanged(configFile, configTemplate, state, opts.dryRun ?? false);
  writeIfChanged(setupFile, setupTemplate, state, opts.dryRun ?? false);
  writeIfChanged(reporterFile, reporterTemplate, state, opts.dryRun ?? false);
  writeIfChanged(
    sharedWriterFile,
    sharedWriterTemplate,
    state,
    opts.dryRun ?? false,
  );

  return {
    hostRepoRoot,
    evalsDir,
    testFile,
    configFile,
    setupFile,
    reporterFile,
    sharedWriterFile,
    written: state.written,
    unchanged: state.unchanged,
  };
}
// === Subtask 08 END ===


// === Subtask 07 START ===
/* Subtask 07 — Vitest static-backend stamping (canonical fence).         */
/*                                                                          */
/* Coordination with subtask 08 (jest):                                    */
/*   • The shared `assertNoConflictingFramework`, `FrameworkConflictError`,*/
/*     `StaticFramework`, and `PrimitiveMeta` symbols are defined in       */
/*     subtask 08's fence above. This fence re-uses them directly so both  */
/*     stampers call into the SAME bidirectional mutual-exclusion guard.   */
/*   • The shared YAML writer template at `templates/static/_shared/` is   */
/*     stamped by both backends to `<hostRepoRoot>/evals/_shared/`.        */
/*                                                                          */
/* Layout produced for `static.framework === "vitest"`:                    */
/*                                                                          */
/*   <hostRepoRoot>/evals/test_<kind>_<slug>.test.ts                       */
/*       — one per discovered primitive; first line carries the literal   */
/*         `// _meta.generated: true` marker (subtasks 03 & 11 contract). */
/*   <hostRepoRoot>/evals/vitest.config.ts                                 */
/*   <hostRepoRoot>/evals/setup.ts                                         */
/*   <hostRepoRoot>/evals/reporters/zoto-eval-reporter.ts                  */
/*   <hostRepoRoot>/evals/_shared/result-yaml-writer.ts                    */
/*                                                                          */
/* All assets are idempotent: files are only touched when their content    */
/* differs from the existing on-disk bytes (poor-man's checksum gate).    */
/* The mutual-exclusion guard fires before any write so a host repo with  */
/* jest already installed gets a clean error rather than a half-stamped   */
/* dual-framework workspace.                                                */

const VITEST_TEMPLATE_SUFFIX = "static/vitest";
const VITEST_SHARED_TEMPLATE_SUFFIX = "static/_shared";

export interface VitestStampOptions {
  /** Skip the mutual-exclusion guard (test-only escape hatch). */
  bypassGuard?: boolean;
  /** Override source template root (test seam). */
  templateRoot?: string;
  /** Override shared writer source path (test seam — also relative to repo). */
  sharedTemplateRoot?: string;
  /** When true, compute changes without writing. */
  dryRun?: boolean;
}

export interface VitestStampResult {
  hostRepoRoot: string;
  evalsDir: string;
  testFile: string;
  configFile: string;
  setupFile: string;
  reporterFile: string;
  sharedWriterFile: string;
  written: string[];
  unchanged: string[];
}

/**
 * Stamp the vitest static backend into a host repo for a single primitive.
 *
 * The per-primitive test file lands at
 * `<hostRepoRoot>/evals/test_<payload.kind>_<primitive.slug>.test.ts` —
 * symmetric with subtask 06's pytest naming convention. The shared
 * vitest.config / setup / reporter / writer assets are stamped once each
 * (idempotent) so calling this function for every discovered primitive in a
 * fresh repo produces N test files plus a single set of harness assets.
 *
 * Throws `FrameworkConflictError` (defined in subtask 08's fence) when
 * jest artefacts are detected in `hostRepoRoot`. Use `bypassGuard: true`
 * only from unit tests.
 */
export function stampVitestPerPrimitive(
  hostRepoRoot: string,
  payload: AnalyserPayload,
  primitive: PrimitiveMeta,
  opts: VitestStampOptions = {},
): VitestStampResult {
  if (!opts.bypassGuard) {
    assertNoConflictingFramework("vitest", hostRepoRoot);
  }

  const templateRoot = opts.templateRoot ?? join(templatesDir(hostRepoRoot), VITEST_TEMPLATE_SUFFIX);
  const sharedRoot =
    opts.sharedTemplateRoot ?? join(templatesDir(hostRepoRoot), VITEST_SHARED_TEMPLATE_SUFFIX);
  const evalsDir = evalsDirFor(hostRepoRoot);

  const slug = sanitiseVitestSlug(primitive.slug);
  const testFile = join(
    evalsDir,
    `test_${payload.kind}_${slug}.test.ts`,
  );
  const configFile = join(evalsDir, "vitest.config.ts");
  const setupFile = join(evalsDir, "setup.ts");
  const reporterFile = join(evalsDir, "reporters", "zoto-eval-reporter.ts");
  const sharedWriterFile = join(
    evalsDir,
    "_shared",
    "result-yaml-writer.ts",
  );

  const state: { written: string[]; unchanged: string[] } = {
    written: [],
    unchanged: [],
  };

  const testTemplate = loadVitestTemplate(
    join(templateRoot, "per-primitive-test.ts.tmpl"),
  );
  const configTemplate = loadVitestTemplate(
    join(templateRoot, "vitest.config.ts.tmpl"),
  );
  const setupTemplate = loadVitestTemplate(
    join(templateRoot, "setup.ts.tmpl"),
  );
  const reporterTemplate = loadVitestTemplate(
    join(templateRoot, "reporters", "zoto-eval-reporter.ts.tmpl"),
  );
  const sharedWriterTemplate = loadVitestTemplate(
    join(sharedRoot, "result-yaml-writer.ts.tmpl"),
  );

  const renderedTest = ensureVitestGeneratedMarker(
    renderVitestPerPrimitiveTest(testTemplate, payload, primitive),
  );

  writeVitestIfChanged(testFile, renderedTest, state, opts.dryRun ?? false);
  writeVitestIfChanged(configFile, configTemplate, state, opts.dryRun ?? false);
  writeVitestIfChanged(setupFile, setupTemplate, state, opts.dryRun ?? false);
  writeVitestIfChanged(
    reporterFile,
    reporterTemplate,
    state,
    opts.dryRun ?? false,
  );
  writeVitestIfChanged(
    sharedWriterFile,
    sharedWriterTemplate,
    state,
    opts.dryRun ?? false,
  );

  return {
    hostRepoRoot,
    evalsDir,
    testFile,
    configFile,
    setupFile,
    reporterFile,
    sharedWriterFile,
    written: state.written,
    unchanged: state.unchanged,
  };
}

function sanitiseVitestSlug(raw: string): string {
  return raw
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function loadVitestTemplate(absolute: string): string {
  if (!existsSync(absolute)) {
    throw new Error(`vitest template missing at ${absolute}`);
  }
  return readFileSync(absolute, "utf-8");
}

function renderVitestPerPrimitiveTest(
  template: string,
  payload: AnalyserPayload,
  primitive: PrimitiveMeta,
): string {
  return template
    .replaceAll("{{TARGET_ID}}", primitive.target_id)
    .replaceAll("{{SOURCE_PATH}}", primitive.source_path)
    .replaceAll("{{SOURCE_HASH}}", primitive.source_hash)
    .replaceAll("{{KIND}}", payload.kind)
    .replaceAll("{{ANALYSER_VERSION}}", payload.analyser_version)
    .replaceAll("{{MODEL_ID}}", payload.model_id)
    .replaceAll("{{PAYLOAD_JSON}}", JSON.stringify(payload, null, 2));
}

function ensureVitestGeneratedMarker(content: string): string {
  const expected = "// _meta.generated: true";
  const firstLine = content.split("\n", 1)[0] ?? "";
  if (firstLine === expected) return content;
  return `${expected}\n${content}`;
}

function writeVitestIfChanged(
  abs: string,
  body: string,
  state: { written: string[]; unchanged: string[] },
  dryRun: boolean,
): void {
  const existing = existsSync(abs) ? readFileSync(abs, "utf-8") : null;
  if (existing === body) {
    state.unchanged.push(abs);
    return;
  }
  if (dryRun) {
    state.written.push(abs);
    return;
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body, "utf-8");
  state.written.push(abs);
}
// === Subtask 07 END ===

// === Subtask 06 (single LLM emitter) — canonical fence ===
/* The single LLM-emitter stamping fence. The legacy `code`/`declarative`
 * split has been retired (KD-3 of
 * spec-eval-single-backend-colocated-restructure-20260526). One emitter,
 * one path per primitive:
 *
 *   <kind-dir>/evals/<name>.test.ts         (one per non-skill primitive,
 *                                            co-located beside source)
 *   evals/llm/_shared/                      (shared harness — sandbox,
 *                                            setup, reporter, sdk-bridge)
 *
 * Skills retain their existing `evals.json` (KD-1) — `resolveLlmTargetPath`
 * returns `null` for skill targets and the stamper short-circuits.
 *
 * When the host has the engine package (canonical source), `sdk-bridge`,
 * `_user-case-guards`, and graders are imported via `#eval-engine` instead
 * of being copied into `_shared/`. For external repos that lack the
 * engine, copies are still stamped into `_shared/`.
 *
 * Every emitted `*.test.ts` carries `// _meta.generated: true` as its
 * literal first line so the cleanup engine and overwrite gate can detect
 * the file via
 * `plugins/zoto-eval-system/engine/_user-case-guards.ts#isGeneratedFile`. */

/* `_user-case-guards` are imported by the harness at runtime; the
 * stamper no longer queries them directly (the mutual-exclusion guard
 * was retired in subtask 06 of the single-backend collapse). */

const LLM_CODE_TEMPLATE_SUFFIX = "llm/code-cursor-sdk";
const LLM_CODE_DEST_REL = "evals/llm";

/**
 * Retained as a type alias so the legacy `engine/update.ts` declarative
 * regeneration path still type-checks against the unified backend until
 * subtask 07 collapses the dispatch. After this subtask the emitted LLM
 * eval files are always Vitest.
 */
export type LlmCodeFramework = "vitest";

export interface LlmStampOptions {
  /** Model id (pass-through from `.zoto/eval-system/config.yml#/llm/model/id`). */
  modelId: string;
  /** Judge model id (pass-through from config `#/judgeModel`). */
  judgeModel: string;
  /** Host-repo-relative evals directory (default `evals`). */
  evalsDir?: string;
  /** Override the source template root (test seam). */
  templateRoot?: string;
  /**
   * Override the in-repo source for `sdk-bridge.ts` / `_user-case-guards.ts`
   * (test seam; defaults to `<REPO_ROOT>/plugins/zoto-eval-system/engine/`).
   * Stamped verbatim so the host repo always executes against the same
   * bridge surface this repo was developed against.
   */
  sharedSourceRoot?: string;
  /** Per-case test timeout in ms (default 180000). */
  caseTimeoutMs?: number;
  /** Reserved for the migration / regeneration flow (no-op today). */
  bypassGuard?: boolean;
  /** When true, compute changes without writing. */
  dryRun?: boolean;
  /**
   * Token-field probe outcome captured at stamp time. When omitted the
   * stamper falls back to `resolveDocumentedTokenField()` from the bridge.
   * Tests inject a stub here so they don't have to reach the live SDK.
   */
  tokenFieldNotes?: string;
}

export interface LlmStampResult {
  hostRepoRoot: string;
  evalsDir: string;
  llmDir: string;
  testFile: string;
  setupFile: string;
  reporterFile: string;
  sdkBridgeFile: string;
  sandboxHelpersFile: string;
  userCaseGuardsFile: string;
  graderFiles: string[];
  written: string[];
  unchanged: string[];
}

function loadLlmCodeTemplate(absolute: string): string {
  if (!existsSync(absolute)) {
    throw new Error(`LLM code template missing at ${absolute}`);
  }
  return readFileSync(absolute, "utf-8");
}

function ensureLlmCodeGeneratedMarker(content: string): string {
  const expected = "// _meta.generated: true";
  const firstLine = content.split("\n", 1)[0] ?? "";
  if (firstLine === expected) return content;
  return `${expected}\n${content}`;
}

interface StampedLlmCaseRow {
  id: string;
  prompt: string;
  follow_ups?: string[];
  assertions: string[];
  assertion_patterns: string[];
  fixtures?: { files: Array<{ path: string; content?: string; from?: string }> };
  expected_filesystem?: {
    created?: string[];
    modified?: string[];
    removed?: string[];
    unchanged?: string[];
  };
  expected_output?: string;
}

/**
 * Convert an `AnalyserCase` (subtask 04 payload shape) into the stamped
 * case row the emitted test file iterates over. Adds the derived
 * `assertion_patterns` list — a best-effort conversion of
 * behaviour-level assertions into regex sources that the emitted test
 * uses for `expect(text).toMatch(...)` checks.
 */
function llmAnalyserCaseToStampedRow(
  c: { scenario: string; prompt: string; follow_ups?: string[]; assertions: string[]; fixtures?: { files: Array<{ path: string; content?: string; from?: string }> }; expected_filesystem?: StampedLlmCaseRow["expected_filesystem"]; expected_output?: string },
  idx: number,
): StampedLlmCaseRow {
  const id =
    c.scenario
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `case-${idx + 1}`;

  return {
    id,
    prompt: c.prompt,
    follow_ups: c.follow_ups && c.follow_ups.length > 0 ? c.follow_ups : undefined,
    assertions: c.assertions,
    assertion_patterns: c.assertions
      .map(llmCodeAssertionToRegexSource)
      .filter((p): p is string => p !== null),
    fixtures: c.fixtures,
    expected_filesystem: c.expected_filesystem,
    expected_output: c.expected_output,
  };
}

function llmCodeAssertionToRegexSource(a: string): string | null {
  const trimmed = a.trim();
  if (trimmed.length < 4) return null;
  if (/behaved correctly|worked as expected|followed documented sequencing/i.test(trimmed)) {
    return null;
  }
  const back = trimmed.match(/`([^`]+)`/);
  if (back) return escapeLlmCodeRegExpSource(back[1]!);
  const quoted = trimmed.match(/"([^"]+)"/);
  if (quoted) return escapeLlmCodeRegExpSource(quoted[1]!);
  return null;
}

function escapeLlmCodeRegExpSource(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderLlmPerPrimitiveTest(
  template: string,
  payload: AnalyserPayload,
  primitive: PrimitiveMeta,
  modelId: string,
  judgeModel: string,
  caseTimeoutMs: number,
  harnessRel: string,
): string {
  const frameworkImports =
    'import { describe, it, afterAll, expect } from "vitest";';

  const name = primitive.target_id.includes(":")
    ? primitive.target_id.split(":")[1]
    : primitive.target_id;

  const cases = (payload.cases ?? []).map((c, idx) =>
    llmAnalyserCaseToStampedRow(c, idx),
  );
  const casesJson = JSON.stringify(cases, null, 2);

  return template
    .replaceAll("{{FRAMEWORK_IMPORTS}}", frameworkImports)
    .replaceAll("{{HARNESS_REL_PATH}}", harnessRel)
    .replaceAll("{{CASES_JSON}}", casesJson)
    .replaceAll("{{TARGET_ID}}", primitive.target_id)
    .replaceAll("{{PRIMITIVE_KIND}}", payload.kind)
    .replaceAll("{{PRIMITIVE_NAME}}", name ?? primitive.target_id)
    .replaceAll("{{MODEL_ID}}", modelId)
    .replaceAll("{{JUDGE_MODEL}}", judgeModel)
    .replaceAll("{{CASE_TIMEOUT_MS}}", String(caseTimeoutMs))
    .replaceAll("{{SOURCE_PATH}}", primitive.source_path)
    .replaceAll("{{SOURCE_HASH}}", primitive.source_hash)
    .replaceAll("{{CODE_FRAMEWORK}}", "vitest")
    .replaceAll("{{PAYLOAD_JSON}}", JSON.stringify(payload, null, 2));
}

function writeLlmCodeIfChanged(
  abs: string,
  body: string,
  state: { written: string[]; unchanged: string[] },
  dryRun: boolean,
): void {
  const existing = existsSync(abs) ? readFileSync(abs, "utf-8") : null;
  if (existing === body) {
    state.unchanged.push(abs);
    return;
  }
  if (dryRun) {
    state.written.push(abs);
    return;
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body, "utf-8");
  state.written.push(abs);
}

/**
 * Resolve the co-located eval file path for a non-skill primitive
 * (JSON-first migration — spec evals-json-first-migration-20260527):
 *
 *   <kind-dir>/evals/<name>.json
 *
 * - `command` / `agent` → `dirname(sourcePath)/evals/<name>.json`
 * - `hook`              → `<hooks-dir>/evals/hooks.json` (one bundled
 *   file per hook source; `.cursor/hooks.json` canonicalises to
 *   `.cursor/hooks/evals/hooks.json`)
 * - `skill` / `rule`    → `null` (skills retain `evals.json`; rules
 *   are not eval-stamped)
 */
export function resolveLlmTargetPath(
  resolved: { kind: string; sourcePath: string; name: string },
): string | null {
  if (resolved.kind === "skill" || resolved.kind === "rule") return null;
  if (resolved.kind === "hook") {
    const dir = dirname(resolved.sourcePath);
    const base = dir.split(sep).pop() ?? "";
    const hooksDir = base === "hooks" ? dir : join(dir, "hooks");
    return join(hooksDir, "evals", "hooks.json");
  }
  return join(dirname(resolved.sourcePath), "evals", `${resolved.name}.json`);
}

/** Template suffix under {@link templatesDir} for a non-skill primitive kind. */
export function resolveLlmJsonTemplateSuffix(kind: string): string {
  if (kind === "command") {
    return "command-evals/evals.json.tmpl";
  }
  if (kind === "agent") {
    return "agent-evals/evals.json.tmpl";
  }
  if (kind === "hook") {
    return "hook-evals/evals.json.tmpl";
  }
  throw new Error(`resolveLlmJsonTemplateSuffix: unsupported kind ${kind}`);
}

/** @deprecated Use {@link resolveLlmJsonTemplateSuffix} with {@link templatesDir}. */
export function resolveLlmJsonTemplateRel(kind: string): string {
  return resolveLlmJsonTemplateSuffix(kind);
}

/**
 * Build one stamped case row from an analyser payload. Every row carries
 * `_meta.generated: true` plus the cached `primitive_analysis` envelope.
 */
export function buildStampedLlmCaseRow(
  payload: AnalyserPayload,
  caseIdx: number,
  nowIso: string,
): StampedLlmCaseRow & {
  _meta: {
    generated: true;
    source_hash: string;
    last_updated: string;
    generated_by: "zoto-create-evals";
    primitive_analysis: {
      source_hash: string;
      analysed_at: string;
      analyser_version: string;
      summary: string;
      fixture_justifications?: string[];
    };
  };
} {
  const c = payload.cases[caseIdx];
  if (!c) {
    throw new Error(
      `buildStampedLlmCaseRow: payload has no case at index ${caseIdx}`,
    );
  }
  if (!Array.isArray(c.assertions) || c.assertions.length === 0) {
    throw new Error(
      `Refusing to stamp LLM case for ${payload.target_id}#${caseIdx}: no assertions in analyser payload`,
    );
  }
  const row = llmAnalyserCaseToStampedRow(c, caseIdx);
  return {
    ...row,
    _meta: {
      generated: true,
      source_hash: payload.source_hash,
      last_updated: nowIso,
      generated_by: "zoto-create-evals",
      primitive_analysis: {
        source_hash: payload.source_hash,
        analysed_at: nowIso,
        analyser_version: payload.analyser_version,
        summary: payload.summary,
        ...(c.fixture_justifications && c.fixture_justifications.length > 0
          ? { fixture_justifications: c.fixture_justifications.slice() }
          : {}),
      },
    },
  };
}

/**
 * Render a non-skill co-located JSON eval file from the kind template
 * and analyser payload. Strips `_template_doc` and emits the canonical
 * file-level `_meta` envelope expected by `eval-file.schema.json`.
 */
export function renderLlmJsonTemplate(
  template: string,
  payload: AnalyserPayload,
  cases: unknown[],
  modelId: string,
  judgeModel: string,
  caseTimeoutMs: number,
): string {
  // Ensure the on-disk template is valid JSON (may carry `_template_doc`).
  JSON.parse(template);

  const body: Record<string, unknown> = {
    target_id: payload.target_id,
    _meta: {
      generated: true,
      model_id: modelId,
      judge_model: judgeModel,
      case_timeout_ms: caseTimeoutMs,
    },
    cases,
  };
  return JSON.stringify(body, null, 2) + "\n";
}

/**
 * Compute the relative-from-`testFile`-dir path string used by stamped
 * tests to import the unified harness at `evals/llm/_shared/`. The
 * returned string is normalised to POSIX separators so the literal lands
 * in the emitted source unchanged on Windows hosts.
 */
function relativeHarnessImportPath(
  hostRepoRoot: string,
  testFilePath: string,
): string {
  const sharedDir = join(evalsDirFor(hostRepoRoot), "llm", "_shared");
  const fromDir = dirname(testFilePath);
  let rel = relative(fromDir, sharedDir).split(sep).join("/");
  if (rel.length === 0) rel = ".";
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

export function buildPrimitiveMetaFromPayload(
  payload: AnalyserPayload,
  sourcePath?: string,
): PrimitiveMeta {
  const namePart = payload.target_id.includes(":")
    ? payload.target_id.split(":")[1] ?? payload.target_id
    : payload.target_id;
  const slug = `${payload.kind}_${namePart
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()}`;
  return {
    slug,
    target_id: payload.target_id,
    source_path: payload.source_path || sourcePath || "",
    source_hash: payload.source_hash,
  };
}

/**
 * Stamp the unified LLM eval into a host repo for a single primitive.
 * Idempotent — the co-located JSON file is only written when content differs.
 *
 * Template source of truth:
 *   `plugins/zoto-eval-system/templates/{command,agent,hook}-evals/evals.json.tmpl`
 *
 * The emitted JSON lands at the co-located path from `resolveLlmTargetPath`:
 * `<kind-dir>/evals/<name>.json` (or `<hooks-dir>/evals/hooks.json`).
 */
export function stampLlmTarget(
  hostRepoRoot: string,
  payload: AnalyserPayload,
  primitive: PrimitiveMeta,
  resolved: { kind: string; sourcePath: string; name: string; targetId: string },
  opts: LlmStampOptions,
): LlmStampResult {
  const evalsDir = opts.evalsDir ? join(hostRepoRoot, opts.evalsDir) : evalsDirFor(hostRepoRoot);
  const llmDir = join(evalsDir, "llm");
  const sharedDir = join(llmDir, "_shared");
  const caseTimeoutMs = opts.caseTimeoutMs ?? 180000;

  const targetPath = resolveLlmTargetPath(resolved);
  if (!targetPath) {
    throw new Error(
      `stampLlmTarget: refusing to stamp ${resolved.kind} primitive ${resolved.targetId} (skills retain evals.json; rules are not eval-stamped)`,
    );
  }

  const jsonFile = targetPath.startsWith(hostRepoRoot)
    ? targetPath
    : join(hostRepoRoot, relative(REPO_ROOT, targetPath));

  const state: { written: string[]; unchanged: string[] } = {
    written: [],
    unchanged: [],
  };
  const dryRun = opts.dryRun ?? false;

  const templateSuffix = resolveLlmJsonTemplateSuffix(resolved.kind);
  const templatePath =
    opts.templateRoot != null
      ? join(opts.templateRoot, "evals.json.tmpl")
      : join(templatesDir(hostRepoRoot), templateSuffix);
  const template = loadLlmCodeTemplate(templatePath);

  const nowIso = new Date().toISOString();
  const cases = (payload.cases ?? []).map((_c, i) =>
    buildStampedLlmCaseRow(payload, i, nowIso),
  );

  const rendered = renderLlmJsonTemplate(
    template,
    payload,
    cases,
    opts.modelId,
    opts.judgeModel,
    caseTimeoutMs,
  );

  writeLlmCodeIfChanged(jsonFile, rendered, state, dryRun);

  if (opts.tokenFieldNotes) {
    process.stderr.write(
      `${JSON.stringify({
        llm_code_token_field: {
          primitive: primitive.target_id,
          notes: opts.tokenFieldNotes,
        },
      })}\n`,
    );
  }

  return {
    hostRepoRoot,
    evalsDir,
    llmDir,
    testFile: jsonFile,
    setupFile: join(sharedDir, "setup.ts"),
    reporterFile: join(sharedDir, "zoto-llm-reporter.ts"),
    sdkBridgeFile: join(sharedDir, "sdk-bridge.ts"),
    sandboxHelpersFile: join(sharedDir, "sandbox-helpers.ts"),
    userCaseGuardsFile: join(sharedDir, "_user-case-guards.ts"),
    graderFiles: [],
    written: state.written,
    unchanged: state.unchanged,
  };
}
// === Subtask 09 END ===

// === Subtask 06 (single LLM emitter) START ===
/* The single LLM emitter — `stampLlmTarget` — is wrapped by `stampTarget`
 * below. The wrapper handles primitive-kind dispatch (skills retain JSON;
 * rules are not eval-stamped; everything else flows through stampLlmTarget). */

export interface StampTargetOptions {
  dryRun?: boolean;
  bypassGuard?: boolean;
  sourcePath?: string;
}

export interface StampTargetResult {
  target_id: string;
  /**
   * Backend label retained for the orchestrator + report consumers; the
   * only value is `"llm"` after the single-backend collapse (KD-3).
   */
  backend: "llm";
  written: boolean;
  /** Repo-relative path of the emitted (or skipped) artefact. */
  path: string;
  /** Repo-relative path string detailing the LLM emit (kept for shape compat). */
  llm: {
    test_file: string;
    files_written: number;
  };
  skipped?: "skill" | "rule";
  /** Human-friendly note when the target was skipped (e.g. skills retain JSON). */
  note?: string;
}

/**
 * Stamp the single LLM eval artefact for a target. Skills are skipped
 * (their existing `evals.json` is retained); rules are not eval-stamped.
 * All other primitives stamp a co-located `<kind-dir>/evals/<name>.json`.
 */
export async function stampTarget(
  hostRepoRoot: string,
  targetId: string,
  payload: AnalyserPayload,
  opts: StampTargetOptions = {},
): Promise<StampTargetResult> {
  const resolved = resolveTarget(targetId, hostRepoRoot);
  if (!resolved) {
    throw new Error(`stampTarget: cannot resolve target ${targetId}`);
  }

  if (resolved.kind === "skill") {
    const evalsJson = join(dirname(resolved.sourcePath), "evals", "evals.json");
    const relPath = relative(hostRepoRoot, evalsJson);
    return {
      target_id: targetId,
      backend: "llm",
      written: false,
      path: relPath,
      llm: { test_file: relPath, files_written: 0 },
      skipped: "skill",
      note: `skill — no TS sidecar; eval JSON at \`${relPath}\` retained`,
    };
  }

  if (resolved.kind === "rule") {
    const relPath = relative(hostRepoRoot, resolved.sourcePath);
    return {
      target_id: targetId,
      backend: "llm",
      written: false,
      path: relPath,
      llm: { test_file: relPath, files_written: 0 },
      skipped: "rule",
      note: `rule — not eval-stamped`,
    };
  }

  const cfg = loadEvalConfig(hostRepoRoot).config;
  const llm = (cfg.llm as Record<string, unknown> | undefined) ?? {};
  const model = (llm.model as Record<string, unknown> | undefined) ?? {};
  const modelId = typeof model.id === "string" ? model.id : "composer-2.5";
  const judgeModel =
    typeof cfg.judgeModel === "string" ? cfg.judgeModel : "opus-4.6";

  const primitive = buildPrimitiveMetaFromPayload(payload, opts.sourcePath);
  const result = stampLlmTarget(hostRepoRoot, payload, primitive, resolved, {
    modelId,
    judgeModel,
    dryRun: opts.dryRun,
    bypassGuard: opts.bypassGuard ?? true,
  });

  const relTestFile = relative(hostRepoRoot, result.testFile);
  return {
    target_id: targetId,
    backend: "llm",
    written: result.written.length > 0,
    path: relTestFile,
    llm: {
      test_file: relTestFile,
      files_written: result.written.length,
    },
  };
}

async function tryLoadAnalyserPayload(
  targetId: string,
  opts: { withAnalyser: boolean; noAnalyser: boolean },
): Promise<AnalyserPayload | null> {
  const payload = readCachedAnalyserPayload(REPO_ROOT, targetId);
  if (payload?.cases?.length) return payload;
  if (!shouldEnableAnalyser(opts)) return null;
  try {
    const mod = await import("./eval-analyse.ts");
    const budget = mod.newAnalyserBudget();
    const result = await mod.runAnalyser({ target: targetId }, { budget });
    mod.emitCostSummary(budget);
    return result.payload;
  } catch (e) {
    process.stderr.write(
      `${JSON.stringify({
        warn: "analyser_skipped",
        target_id: targetId,
        message: (e as Error).message,
      })}\n`,
    );
    return null;
  }
}
// === Subtask 06 (single LLM emitter) END ===

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then(
    () => {
      /* main handles its own exit codes via process.exit when needed. */
    },
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
}
