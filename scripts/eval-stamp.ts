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

/* ---------------------------------------------------------------------- */
/* Baseline fixture stamping                                              */
/* ---------------------------------------------------------------------- */
/* Subtask 05 — keep this block self-contained so subtask 04's analyser   */
/* invocation edits in `main()` remain non-overlapping.                   */

const BASELINE_TEMPLATE_REL = "plugins/zoto-eval-system/templates/baseline-fixtures";
const BASELINE_DEST_REL = "evals/fixtures/baseline";

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
  const source = opts.source ?? join(REPO_ROOT, BASELINE_TEMPLATE_REL);
  const dest = opts.dest ?? join(hostRepoRoot, BASELINE_DEST_REL);

  if (!existsSync(source)) {
    throw new Error(
      `baseline template missing at ${source} - expected ${BASELINE_TEMPLATE_REL}`,
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
  if (r.kind === "skill") return null;
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

function buildDocument(
  payload: AnalysisPayload,
  primitiveHash: string,
  sourceHash: string,
  nowIso: string,
  rawSource: string
): StampedDoc {
  const thin = normaliseContent(rawSource).length < 450;
  const name = payload.target_id.split(":")[1] ?? payload.target_id;

  const cases: StampedCase[] = payload.suggested_cases.map((s: SuggestedCase) => {
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

  const doc: StampedDoc = {
    target_id: payload.target_id,
    cases: [],
  };
  if (payload.kind === "command") doc.command_name = name;
  else if (payload.kind === "agent") doc.agent_name = name;
  else doc.hook_plugin = name;

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

function formatDoc(doc: StampedDoc): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

function printDiff(a: StampedDoc | null, b: StampedDoc): void {
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
      "  tsx scripts/eval-stamp.ts <target-id> [--out <path>] [--dry-run]",
      "                            [--with-analyser] [--no-analyser]",
      "  tsx scripts/eval-stamp.ts --baseline-only [--out <dir>] [--dry-run]",
      "  tsx scripts/eval-stamp.ts --stamp-pytest [--target <id>] [--out <dir>] [--dry-run]",
      "",
      "Modes:",
      "  <target-id>        Stamp central eval JSON for a single target.",
      "  --baseline-only    Stamp ONLY the baseline-fixtures skeleton from",
      "                     plugins/zoto-eval-system/templates/baseline-fixtures/",
      "                     into evals/fixtures/baseline/ (idempotent).",
      "                     Used by `pnpm run eval:baseline-stamp` and by",
      "                     subtask 14's live-repo migration.",
      "  --stamp-pytest     Stamp per-primitive pytest test files for either a",
      "                     single --target (any kind, including skills) or for",
      "                     every primitive in .zoto/eval-system/manifest.yml.",
      "                     Refuses when static.framework !== 'pytest' or when",
      "                     the cached analyser payload contains zero assertions.",
      "",
      "Flags:",
      "  --out <path>       Override output path (file for case stamp, dir for baseline,",
      "                     dir for --stamp-pytest).",
      "  --target <id>      Restrict --stamp-pytest to a single target id.",
      "  --dry-run          Compute changes without writing.",
      "  --with-analyser    Force-enable the LLM analyser pass (subtask 04).",
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
 * Best-effort per-primitive analyser invocation. Mutates `doc.cases` in
 * place: every generated case receives an up-to-date
 * `_meta.primitive_analysis` block. Failures are logged to stderr and the
 * function returns `{ applied: false }` rather than throwing — the stamper
 * must remain usable in offline / no-API-key environments.
 */
async function applyPrimitiveAnalysisToDoc(
  doc: StampedDoc,
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
  try {
    const result = await mod.runAnalyser({ target: targetId }, { budget });
    const now = new Date().toISOString();
    let mutated = 0;
    for (const c of doc.cases) {
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

  if (targetId.startsWith("skill:")) {
    console.error(
      JSON.stringify({
        error: "skill targets are not stamped to central JSON by eval-stamp",
        detail:
          "Skill evals live at skills/<name>/evals/evals.json; run eval-analyse for hints, then merge manually or extend zoto-create-evals.",
        target_id: targetId,
      })
    );
    process.exit(2);
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

  const outPath = outOverride
    ? resolve(REPO_ROOT, outOverride)
    : defaultOutPath(targetId);
  if (!outPath) {
    console.error(
      JSON.stringify({ error: "cannot derive output path", target_id: targetId })
    );
    process.exit(1);
  }

  const rawSource = readFileSync(rawResolved.sourcePath, "utf-8");
  const prim = primitiveAnalysisHash(analysis);
  const now = new Date().toISOString();
  const built = buildDocument(analysis, prim, analysis.source_hash, now, rawSource);

  let existing: StampedDoc | null = null;
  if (existsSync(outPath)) {
    try {
      existing = JSON.parse(readFileSync(outPath, "utf-8")) as StampedDoc;
    } catch {
      existing = null;
    }
  }

  const merged = mergeWithExisting(existing, built);

  /* Subtask 04 — annotate generated cases with the analyser's
   * primitive_analysis block before formatting/write. Best-effort: never
   * blocks stamping when the analyser cannot run. */
  const analyserOutcome = await applyPrimitiveAnalysisToDoc(merged, targetId, {
    enabled: shouldEnableAnalyser({ withAnalyser, noAnalyser }),
  });

  if (existing && formatDoc(existing) === formatDoc(merged)) {
    process.stdout.write(
      JSON.stringify({
        noop: true,
        target_id: targetId,
        path: relative(REPO_ROOT, outPath),
        analyser: analyserOutcome.applied
          ? {
              source: analyserOutcome.source,
              source_hash: analyserOutcome.payloadSourceHash,
            }
          : { source: analyserOutcome.source },
      }) + "\n"
    );
    return;
  }

  if (dry) {
    printDiff(existing ?? null, merged);
    process.stdout.write(
      JSON.stringify({
        dry_run: true,
        target_id: targetId,
        path: relative(REPO_ROOT, outPath),
        would_write_cases: merged.cases.length,
        analyser: analyserOutcome.applied
          ? {
              source: analyserOutcome.source,
              source_hash: analyserOutcome.payloadSourceHash,
            }
          : { source: analyserOutcome.source },
      }) + "\n"
    );
    return;
  }

  atomicWriteJson(outPath, merged);
  /* === Subtask 06 START === (per-target pytest stamp wire-in) */
  const pytestOutcome = maybeStampPytestForTarget(REPO_ROOT, targetId);
  /* === Subtask 06 END === */
  process.stdout.write(
    JSON.stringify({
      written: true,
      target_id: targetId,
      path: relative(REPO_ROOT, outPath),
      cases: merged.cases.length,
      analyser: analyserOutcome.applied
        ? {
            source: analyserOutcome.source,
            source_hash: analyserOutcome.payloadSourceHash,
          }
        : { source: analyserOutcome.source },
      /* === Subtask 06 START === (pytest stamp report) */
      pytest_stamp: "skipped" in pytestOutcome
        ? { skipped: true, reason: pytestOutcome.reason }
        : {
            written: pytestOutcome.written,
            path: relative(REPO_ROOT, pytestOutcome.outPath),
            cases: pytestOutcome.cases,
            assertions: pytestOutcome.assertions,
          },
      /* === Subtask 06 END === */
    }) + "\n"
  );
}

/* ---------------------------------------------------------------------- */
/* === Subtask 06 START ===                                               */
/* ---------------------------------------------------------------------- */
/* Per-primitive pytest test stamper. Self-contained: keeps subtask-04   */
/* (analyser wiring) and subtask-05 (baseline fixtures) helpers          */
/* untouched. Reads the analyser payload from the on-disk cache only —   */
/* never triggers a fresh LLM call from this code path.                   */

const PYTEST_TEMPLATE_REL =
  "plugins/zoto-eval-system/templates/static/pytest/per-primitive-test.py.tmpl";
const PYTEST_CONFTEST_TMPL_REL =
  "plugins/zoto-eval-system/templates/static/pytest/conftest.py.tmpl";
const PYTEST_REPORTER_TMPL_REL =
  "plugins/zoto-eval-system/templates/static/pytest/_reporter.py.tmpl";
const ANALYSER_CACHE_DIR_REL = ".zoto/eval-system/cache/analyser";

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
  const cacheFile = join(
    hostRepoRoot,
    ANALYSER_CACHE_DIR_REL,
    `${cacheKey}.json`,
  );
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
    opts.templateOverride ?? join(REPO_ROOT, PYTEST_TEMPLATE_REL);
  if (!existsSync(templatePath)) {
    throw new Error(`pytest per-primitive template missing: ${templatePath}`);
  }
  const tmpl = readFileSync(templatePath, "utf-8");

  const targetName = payload.target_id.split(":")[1] ?? payload.target_id;
  const slug = meta.slug ?? slugify(targetName);
  const outDir = opts.outDir ?? join(hostRepoRoot, "evals");
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
    opts.reporterTemplateOverride ?? join(REPO_ROOT, PYTEST_REPORTER_TMPL_REL);
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
      join(REPO_ROOT, PYTEST_CONFTEST_TMPL_REL);
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

const JEST_TEMPLATE_REL =
  "plugins/zoto-eval-system/templates/static/jest";
const SHARED_TEMPLATE_REL =
  "plugins/zoto-eval-system/templates/static/_shared";

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

  const templateRoot = opts.templateRoot ?? join(REPO_ROOT, JEST_TEMPLATE_REL);
  const sharedRoot =
    opts.sharedTemplateRoot ?? join(REPO_ROOT, SHARED_TEMPLATE_REL);
  const evalsDir = join(hostRepoRoot, "evals");

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

const VITEST_TEMPLATE_REL =
  "plugins/zoto-eval-system/templates/static/vitest";
const VITEST_SHARED_TEMPLATE_REL =
  "plugins/zoto-eval-system/templates/static/_shared";

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

  const templateRoot = opts.templateRoot ?? join(REPO_ROOT, VITEST_TEMPLATE_REL);
  const sharedRoot =
    opts.sharedTemplateRoot ?? join(REPO_ROOT, VITEST_SHARED_TEMPLATE_REL);
  const evalsDir = join(hostRepoRoot, "evals");

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

// === Subtask 09 START ===
/* Subtask 09 — LLM `code` strategy stamping (canonical fence).            */
/*                                                                          */
/* Coordination with adjacent fences:                                       */
/*   • `PrimitiveMeta` and `AnalyserPayload` are defined in subtask 08's   */
/*     fence above; this fence imports them by name without redeclaring.   */
/*   • `isGeneratedFile` is owned by `evals/_llm/_user-case-guards.ts`     */
/*     (this subtask's deliverable). The stamper imports it for the        */
/*     bidirectional declarative-strategy mutual-exclusion guard.          */
/*   • Subtask 10 (declarative strategy) consumes the same                  */
/*     `LlmStrategyConflictError` shape via the cleanup engine; do NOT     */
/*     rename or re-locate the symbol without coordinating with subtask 10.*/
/*                                                                          */
/* Layout produced for `llm.strategy === "code"`:                          */
/*                                                                          */
/*   <hostRepoRoot>/evals/llm/                                             */
/*     vitest.config.ts | jest.config.ts     (rendered inline per framework)*/
/*     test_<primitive.slug>.test.ts         (one per primitive)           */
/*     _shared/                                                             */
/*       sdk-bridge.ts             (COPY of evals/_llm/sdk-bridge.ts)      */
/*       sandbox-helpers.ts        (re-export + preSnapshot/postSnapshot)  */
/*       setup.ts                  (dotenv + CURSOR_API_KEY gate)          */
/*       zoto-llm-reporter.ts      (framework-agnostic reporter)           */
/*       graders/{common,contains,regex,tool-called,llm-judge}.ts          */
/*                                                                          */
/* Every emitted *.test.ts file carries `// _meta.generated: true` as its */
/* literal first line (subtasks 03 & 11 deletion / overwrite gate via      */
/* `evals/_llm/_user-case-guards.ts#isGeneratedFile`).                     */

import { isGeneratedFile as isLlmCodeGeneratedTestFile } from "../evals/_llm/_user-case-guards.ts";
import { loadEvalConfig } from "../plugins/zoto-eval-system/src/config-loader.js";

const LLM_CODE_TEMPLATE_REL =
  "plugins/zoto-eval-system/templates/llm/code-cursor-sdk";
const LLM_CODE_DEST_REL = "evals/llm";

export type LlmCodeFramework = "vitest" | "jest";

export interface LlmCodeStampOptions {
  /** Target framework for emitted test files. Required. */
  codeFramework: LlmCodeFramework;
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
   * (test seam; defaults to `<REPO_ROOT>/evals/_llm/`). Stamped verbatim
   * so the host repo always executes against the same bridge surface
   * this repo was developed against.
   */
  sharedSourceRoot?: string;
  /** Per-case test timeout in ms (default 180000). */
  caseTimeoutMs?: number;
  /** Skip the strategy mutual-exclusion guard (test-only escape hatch). */
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

export interface LlmCodeStampResult {
  hostRepoRoot: string;
  evalsDir: string;
  llmDir: string;
  testFile: string;
  configFile: string;
  setupFile: string;
  reporterFile: string;
  sdkBridgeFile: string;
  sandboxHelpersFile: string;
  userCaseGuardsFile: string;
  graderFiles: string[];
  written: string[];
  unchanged: string[];
  framework: LlmCodeFramework;
}

/**
 * Mutual-exclusion guard — refuses to stamp the named LLM strategy when
 * artefacts from the OTHER strategy are present in the host repo. Subtask
 * 09 owns the `code` direction; subtask 10 owns the `declarative`
 * direction (it imports this symbol and reuses the bidirectional logic).
 *
 * Emitted error message points operators at `/z-eval-configure` (which
 * routes the strategy decision via `askQuestion`) AND at
 * `scripts/eval-cleanup-stale.ts` (the cleanup engine that removes the
 * unused strategy's stamped assets after explicit user confirmation).
 */
export class LlmStrategyConflictError extends Error {
  readonly target: "code" | "declarative";
  readonly conflicts: string[];

  constructor(target: "code" | "declarative", conflicts: string[]) {
    const other = target === "code" ? "declarative" : "code";
    super(
      `Refusing to stamp LLM ${target} strategy: detected conflicting ${other} ` +
        `artefacts in host repo (${conflicts.join(", ")}). Run /z-eval-configure ` +
        `to pick a single LLM strategy, or invoke the cleanup engine ` +
        `(scripts/eval-cleanup-stale.ts) to remove the unused strategy ` +
        `before retrying.`,
    );
    this.name = "LlmStrategyConflictError";
    this.target = target;
    this.conflicts = conflicts;
  }
}

/**
 * Bidirectional guard for the LLM strategies. Detection signals:
 *
 *   target = "code" → declarative footprint:
 *     • `evals/_llm/cases.json` exists, OR
 *     • `evals/_llm/runner.ts` carries the explicit
 *       "zoto-declarative-strategy:active" marker (subtask 10).
 *
 *   target = "declarative" → code footprint:
 *     • any `*.test.ts` under `evals/llm/` carries the
 *       `// _meta.generated: true` first-line marker (this fence's
 *       deliverable).
 *
 * The host's `evals/_llm/runner.ts` (this repo's dogfood source) is NOT
 * considered a conflict on its own — we look for an explicit "active"
 * marker so subtask 14's live-repo migration can proceed without
 * tripping the guard.
 */
export function assertNoConflictingLlmStrategy(
  target: "code" | "declarative",
  hostRepoRoot: string,
): void {
  const conflicts: string[] = [];

  if (target === "code") {
    const runnerPath = join(hostRepoRoot, "evals", "_llm", "runner.ts");
    if (existsSync(runnerPath)) {
      try {
        const body = readFileSync(runnerPath, "utf-8");
        if (body.includes("/* zoto-declarative-strategy:active */")) {
          conflicts.push("evals/_llm/runner.ts (declarative strategy active)");
        }
      } catch {
        /* unreadable runner.ts — let other tooling surface the error */
      }
    }
    const centralCasesPath = join(hostRepoRoot, "evals", "_llm", "cases.json");
    if (existsSync(centralCasesPath)) {
      conflicts.push("evals/_llm/cases.json");
    }
  } else {
    const llmDir = join(hostRepoRoot, "evals", "llm");
    if (existsSync(llmDir)) {
      const stack = [llmDir];
      while (stack.length) {
        const cur = stack.pop()!;
        let names: string[];
        try {
          names = readdirSync(cur);
        } catch {
          continue;
        }
        for (const name of names) {
          const full = join(cur, name);
          let st;
          try {
            st = statSync(full);
          } catch {
            continue;
          }
          if (st.isDirectory()) stack.push(full);
          else if (
            st.isFile() &&
            full.endsWith(".test.ts") &&
            isLlmCodeGeneratedTestFile(full)
          ) {
            conflicts.push(relative(hostRepoRoot, full));
          }
        }
      }
    }
  }

  if (conflicts.length > 0) {
    throw new LlmStrategyConflictError(target, conflicts);
  }
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

function renderLlmCodePerPrimitiveTest(
  template: string,
  payload: AnalyserPayload,
  primitive: PrimitiveMeta,
  framework: LlmCodeFramework,
  modelId: string,
  judgeModel: string,
  caseTimeoutMs: number,
): string {
  const frameworkImports =
    framework === "vitest"
      ? 'import { describe, it, afterAll, expect } from "vitest";'
      : 'import { describe, it, afterAll, expect } from "@jest/globals";';

  const name = primitive.target_id.includes(":")
    ? primitive.target_id.split(":")[1]
    : primitive.target_id;

  const cases = (payload.cases ?? []).map((c, idx) =>
    llmAnalyserCaseToStampedRow(c, idx),
  );
  const casesJson = JSON.stringify(cases, null, 2);

  return template
    .replaceAll("{{FRAMEWORK_IMPORTS}}", frameworkImports)
    .replaceAll("{{CASES_JSON}}", casesJson)
    .replaceAll("{{TARGET_ID}}", primitive.target_id)
    .replaceAll("{{PRIMITIVE_KIND}}", payload.kind)
    .replaceAll("{{PRIMITIVE_NAME}}", name ?? primitive.target_id)
    .replaceAll("{{MODEL_ID}}", modelId)
    .replaceAll("{{JUDGE_MODEL}}", judgeModel)
    .replaceAll("{{CASE_TIMEOUT_MS}}", String(caseTimeoutMs))
    .replaceAll("{{SOURCE_PATH}}", primitive.source_path)
    .replaceAll("{{SOURCE_HASH}}", primitive.source_hash)
    .replaceAll("{{CODE_FRAMEWORK}}", framework)
    .replaceAll("{{PAYLOAD_JSON}}", JSON.stringify(payload, null, 2));
}

function renderLlmFrameworkConfig(framework: LlmCodeFramework): string {
  if (framework === "vitest") {
    return [
      "// _meta.generated: true",
      `import { defineConfig } from "vitest/config";`,
      "",
      "export default defineConfig({",
      "  test: {",
      `    include: ["**/*.test.ts"],`,
      `    setupFiles: ["./_shared/setup.ts"],`,
      "    testTimeout: 300_000,",
      "    hookTimeout: 60_000,",
      `    pool: "forks",`,
      `    reporters: ["default"],`,
      "  },",
      "});",
      "",
    ].join("\n");
  }
  return [
    "// _meta.generated: true",
    `import type { Config } from "jest";`,
    "",
    "const config: Config = {",
    `  preset: "ts-jest",`,
    `  testEnvironment: "node",`,
    `  testMatch: ["**/*.test.ts"],`,
    `  setupFiles: ["<rootDir>/_shared/setup.ts"],`,
    "  testTimeout: 300_000,",
    "};",
    "",
    "export default config;",
    "",
  ].join("\n");
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
 * Stamp the LLM `code` strategy backend into a host repo for a single
 * primitive. Idempotent — files are only written when their content
 * differs from the existing on-disk content. The mutual-exclusion guard
 * runs first and throws `LlmStrategyConflictError` when declarative
 * artefacts are detected. Use `bypassGuard: true` only from unit tests.
 *
 * Template source of truth:
 *   `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/`
 *
 * Per-primitive test body: rendered from `per-primitive-test.ts.tmpl`
 * with placeholders substituted at stamp time.
 * Framework-config (vitest.config.ts / jest.config.ts): rendered
 * inline by `renderLlmFrameworkConfig(...)` — there is no template
 * file for these; the stamper owns the canonical config shape.
 * Shared files (sandbox-helpers, setup, reporter, graders) are
 * stamped verbatim from their respective `.tmpl` files.
 * The `sdk-bridge.ts` file is COPIED verbatim from
 * `<REPO_ROOT>/evals/_llm/sdk-bridge.ts` so the host repo executes
 * against the exact same bridge surface this repo was developed on.
 * Likewise `_user-case-guards.ts` is copied so the host's stamper /
 * updater / cleanup engine see the same detection contract.
 */
export function stampLlmCodeStrategy(
  hostRepoRoot: string,
  payload: AnalyserPayload,
  primitive: PrimitiveMeta,
  opts: LlmCodeStampOptions,
): LlmCodeStampResult {
  if (!opts.bypassGuard) {
    assertNoConflictingLlmStrategy("code", hostRepoRoot);
  }

  const templateRoot =
    opts.templateRoot ?? join(REPO_ROOT, LLM_CODE_TEMPLATE_REL);
  const sharedSourceRoot =
    opts.sharedSourceRoot ?? join(REPO_ROOT, "evals", "_llm");
  const evalsDirRel = opts.evalsDir ?? "evals";
  const evalsDir = join(hostRepoRoot, evalsDirRel);
  const llmDir = join(hostRepoRoot, evalsDirRel, "llm");
  const sharedDir = join(llmDir, "_shared");
  const framework = opts.codeFramework;
  const caseTimeoutMs = opts.caseTimeoutMs ?? 180000;

  const testFile = join(llmDir, `test_${primitive.slug}.test.ts`);
  const configFile = join(
    llmDir,
    framework === "vitest" ? "vitest.config.ts" : "jest.config.ts",
  );
  const setupFile = join(sharedDir, "setup.ts");
  const reporterFile = join(sharedDir, "zoto-llm-reporter.ts");
  const sdkBridgeFile = join(sharedDir, "sdk-bridge.ts");
  const sandboxHelpersFile = join(sharedDir, "sandbox-helpers.ts");
  const userCaseGuardsFile = join(sharedDir, "_user-case-guards.ts");
  const graderFiles = [
    join(sharedDir, "graders", "common.ts"),
    join(sharedDir, "graders", "contains.ts"),
    join(sharedDir, "graders", "regex.ts"),
    join(sharedDir, "graders", "tool-called.ts"),
    join(sharedDir, "graders", "llm-judge.ts"),
  ];

  const state: { written: string[]; unchanged: string[] } = {
    written: [],
    unchanged: [],
  };
  const dryRun = opts.dryRun ?? false;

  const testTemplate = loadLlmCodeTemplate(
    join(templateRoot, "per-primitive-test.ts.tmpl"),
  );
  const setupTemplate = loadLlmCodeTemplate(
    join(templateRoot, "setup.ts.tmpl"),
  );
  const reporterTemplate = loadLlmCodeTemplate(
    join(templateRoot, "reporters", "zoto-llm-reporter.ts.tmpl"),
  );
  const sandboxHelpersTemplate = loadLlmCodeTemplate(
    join(templateRoot, "sandbox-helpers.ts.tmpl"),
  );
  const graderTemplates = [
    loadLlmCodeTemplate(join(templateRoot, "graders", "common.ts.tmpl")),
    loadLlmCodeTemplate(join(templateRoot, "graders", "contains.ts.tmpl")),
    loadLlmCodeTemplate(join(templateRoot, "graders", "regex.ts.tmpl")),
    loadLlmCodeTemplate(join(templateRoot, "graders", "tool-called.ts.tmpl")),
    loadLlmCodeTemplate(join(templateRoot, "graders", "llm-judge.ts.tmpl")),
  ];

  const sdkBridgeSrc = join(sharedSourceRoot, "sdk-bridge.ts");
  if (!existsSync(sdkBridgeSrc)) {
    throw new Error(
      `sdk-bridge source missing at ${sdkBridgeSrc}; subtask 09 requires evals/_llm/sdk-bridge.ts`,
    );
  }
  const sdkBridgeBody = readFileSync(sdkBridgeSrc, "utf-8");

  const userCaseGuardsSrc = join(sharedSourceRoot, "_user-case-guards.ts");
  if (!existsSync(userCaseGuardsSrc)) {
    throw new Error(
      `_user-case-guards source missing at ${userCaseGuardsSrc}; subtask 09 requires evals/_llm/_user-case-guards.ts`,
    );
  }
  const userCaseGuardsBody = readFileSync(userCaseGuardsSrc, "utf-8");

  const renderedTest = ensureLlmCodeGeneratedMarker(
    renderLlmCodePerPrimitiveTest(
      testTemplate,
      payload,
      primitive,
      framework,
      opts.modelId,
      opts.judgeModel,
      caseTimeoutMs,
    ),
  );
  const renderedConfig = renderLlmFrameworkConfig(framework);

  writeLlmCodeIfChanged(testFile, renderedTest, state, dryRun);
  writeLlmCodeIfChanged(configFile, renderedConfig, state, dryRun);
  writeLlmCodeIfChanged(setupFile, setupTemplate, state, dryRun);
  writeLlmCodeIfChanged(reporterFile, reporterTemplate, state, dryRun);
  writeLlmCodeIfChanged(sdkBridgeFile, sdkBridgeBody, state, dryRun);
  writeLlmCodeIfChanged(sandboxHelpersFile, sandboxHelpersTemplate, state, dryRun);
  writeLlmCodeIfChanged(userCaseGuardsFile, userCaseGuardsBody, state, dryRun);
  for (let i = 0; i < graderFiles.length; i++) {
    writeLlmCodeIfChanged(graderFiles[i]!, graderTemplates[i]!, state, dryRun);
  }

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
    testFile,
    configFile,
    setupFile,
    reporterFile,
    sdkBridgeFile,
    sandboxHelpersFile,
    userCaseGuardsFile,
    graderFiles,
    written: state.written,
    unchanged: state.unchanged,
    framework,
  };
}
// === Subtask 09 END ===

// === Subtask 10 START ===
/* Subtask 10 — LLM `declarative` strategy stamping (canonical fence).      */
/*                                                                          */
/* Coordination with adjacent fences:                                       */
/*   • `AnalyserPayload` is imported via the subtask 08 fence above; this   */
/*     fence does NOT redeclare it.                                         */
/*   • `LlmStrategyConflictError` and `assertNoConflictingLlmStrategy` are  */
/*     defined in the subtask 09 fence above. We REUSE the symmetric        */
/*     bidirectional guard so both stampers refuse to stamp when the OTHER  */
/*     strategy's artefacts are present.                                    */
/*   • `isGeneratedFile` is owned by `evals/_llm/_user-case-guards.ts`      */
/*     (subtask 09 deliverable). The mutual-exclusion check below imports   */
/*     it via the subtask 09 import alias.                                  */
/*                                                                          */
/* Layout produced for `llm.strategy === "declarative"`:                    */
/*                                                                          */
/*   <hostRepoRoot>/evals/_llm/                                             */
/*     runner.ts        (declarative strategy entry; carries the literal   */
/*                       `/* zoto-declarative-strategy:active *\u002F`     */
/*                       marker on line 2 — subtask 09's guard reads this) */
/*     case.ts          (with validateEnriched + _user-case-guards import)*/
/*     writer.ts        (writes evals/_runs/<ts>/llm.yml; backend: "llm") */
/*     metrics.ts                                                          */
/*     compare.ts                                                          */
/*     README.md        (enriched evals.json shape + rejection rules)     */
/*                                                                          */
/* Per-case `_meta.primitive_analysis` is embedded into the stamped         */
/* `evals.json` rows. Cases with placeholder prompts are REJECTED at stamp  */
/* time so a thin or partial analyser payload never lands on disk.          */

const LLM_DECLARATIVE_TEMPLATE_REL =
  "plugins/zoto-eval-system/templates/llm/agent-sdk";
const LLM_DECLARATIVE_DEST_REL = "evals/_llm";

const DECLARATIVE_STAMPED_FILES = [
  "runner.ts",
  "case.ts",
  "writer.ts",
  "metrics.ts",
  "compare.ts",
  "README.md",
] as const;

type DeclarativeStampedFile = (typeof DECLARATIVE_STAMPED_FILES)[number];

export interface LlmDeclarativeStampOptions {
  /** Override source template root (test seam). */
  templateRoot?: string;
  /** Host-repo-relative evals directory (default `evals`). */
  evalsDir?: string;
  /** Skip the strategy mutual-exclusion guard (test-only escape hatch). */
  bypassGuard?: boolean;
  /** When true, compute changes without writing. */
  dryRun?: boolean;
}

export interface LlmDeclarativeStampResult {
  hostRepoRoot: string;
  evalsDir: string;
  llmDir: string;
  written: string[];
  unchanged: string[];
  files: Record<DeclarativeStampedFile, string>;
}

/**
 * Stamp the declarative-strategy backend (the `agent-sdk` template tree)
 * into `<hostRepoRoot>/evals/_llm/`. Idempotent at the file-content level —
 * files are only touched when their bytes differ. The mutual-exclusion
 * guard runs first and throws `LlmStrategyConflictError` (defined in the
 * subtask 09 fence above) when `code` strategy artefacts are detected via
 * `isGeneratedFile` on any `evals/llm/*.test.ts` file.
 */
export function stampLlmDeclarativeStrategy(
  hostRepoRoot: string,
  opts: LlmDeclarativeStampOptions = {},
): LlmDeclarativeStampResult {
  if (!opts.bypassGuard) {
    /* Re-uses the bidirectional guard from the subtask 09 fence so both
     * directions surface the same `LlmStrategyConflictError`. */
    assertNoConflictingLlmStrategy("declarative", hostRepoRoot);
  }

  const templateRoot =
    opts.templateRoot ?? join(REPO_ROOT, LLM_DECLARATIVE_TEMPLATE_REL);
  const evalsDirRel = opts.evalsDir ?? "evals";
  const evalsDir = join(hostRepoRoot, evalsDirRel);
  const llmDir = join(hostRepoRoot, evalsDirRel, "_llm");

  const state: { written: string[]; unchanged: string[] } = {
    written: [],
    unchanged: [],
  };
  const dryRun = opts.dryRun ?? false;
  const filesOut: Partial<Record<DeclarativeStampedFile, string>> = {};

  for (const f of DECLARATIVE_STAMPED_FILES) {
    const tmplName = `${f}.tmpl`;
    const tmplPath = join(templateRoot, tmplName);
    if (!existsSync(tmplPath)) {
      throw new Error(`declarative template missing: ${tmplPath}`);
    }
    const body = readFileSync(tmplPath, "utf-8");
    const dest = join(llmDir, f);
    filesOut[f] = dest;
    writeDeclarativeIfChanged(dest, body, state, dryRun);
  }

  return {
    hostRepoRoot,
    evalsDir,
    llmDir,
    written: state.written,
    unchanged: state.unchanged,
    files: filesOut as Record<DeclarativeStampedFile, string>,
  };
}

function writeDeclarativeIfChanged(
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
 * Stamp a declarative `evals.json` row from an `AnalyserCase`. Embeds
 * `_meta.primitive_analysis` and copies `prompt` / `assertions[]` /
 * `fixtures.files[]` directly from the analyser payload. Refuses to write
 * a case with a placeholder prompt so the runner's `validateEnriched`
 * gate never sees a row that would have been rejected at runtime.
 *
 * The placeholder check is intentionally identical to
 * `evals/_llm/case.ts#detectPlaceholderPrompt` (minus the < 8 char guard
 * — short prompts are caught by the runner; the stamper only blocks the
 * unambiguous placeholder tokens).
 */
export interface DeclarativeStampedCaseRow {
  id: number | string;
  prompt: string;
  assertions: string[];
  fixtures?: { files: Array<{ path: string; content?: string; from?: string }> };
  expected_filesystem?: {
    created?: string[];
    modified?: string[];
    removed?: string[];
    unchanged?: string[];
  };
  expected_output?: string;
  follow_ups?: string[];
  graders?: Array<Record<string, unknown>>;
  _meta: {
    generated: true;
    source_hash: string;
    primitive_analysis_hash?: string;
    last_updated: string;
    generated_by: string;
    primitive_analysis: {
      source_hash: string;
      analysed_at: string;
      analyser_version: string;
      summary: string;
      fixture_justifications?: string[];
    };
  };
}

const DECLARATIVE_PLACEHOLDER_RE =
  /\b(?:TODO|TBD|FIXME|placeholder prompt|<placeholder>)/i;
const DECLARATIVE_PLACEHOLDER_EXACT = new Set([
  "placeholder",
  "todo",
  "tbd",
  "fixme",
  "...",
  "n/a",
  "tba",
]);

export function declarativeRejectPlaceholderPrompt(prompt: string): string | null {
  const trimmed = (prompt ?? "").trim();
  if (trimmed.length === 0) return "prompt is empty";
  if (DECLARATIVE_PLACEHOLDER_EXACT.has(trimmed.toLowerCase())) {
    return `prompt is a placeholder token: ${trimmed}`;
  }
  if (DECLARATIVE_PLACEHOLDER_RE.test(trimmed)) {
    return `prompt contains placeholder marker: ${trimmed.slice(0, 80)}`;
  }
  return null;
}

/**
 * Build a stamped declarative `evals.json` row for one `AnalyserCase`.
 * Throws if the analyser handed us a placeholder prompt — the failure
 * surfaces immediately so the operator re-runs the analyser instead of
 * shipping a row the runner would reject anyway.
 */
export function buildDeclarativeStampedCase(
  payload: AnalyserPayload,
  caseIdx: number,
  nowIso: string,
): DeclarativeStampedCaseRow {
  const c = payload.cases[caseIdx];
  if (!c) {
    throw new Error(
      `buildDeclarativeStampedCase: payload has no case at index ${caseIdx}`,
    );
  }
  const reason = declarativeRejectPlaceholderPrompt(c.prompt);
  if (reason) {
    throw new Error(
      `Refusing to stamp declarative case for ${payload.target_id}#${caseIdx}: ${reason}`,
    );
  }
  if (!Array.isArray(c.assertions) || c.assertions.length === 0) {
    throw new Error(
      `Refusing to stamp declarative case for ${payload.target_id}#${caseIdx}: no assertions in analyser payload`,
    );
  }

  const row: DeclarativeStampedCaseRow = {
    id: caseIdx + 1,
    prompt: c.prompt,
    assertions: c.assertions.slice(),
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
  if (c.fixtures?.files?.length) {
    row.fixtures = {
      files: c.fixtures.files.map((f) => ({
        path: f.path,
        ...(f.content !== undefined ? { content: f.content } : {}),
        ...(f.from !== undefined ? { from: f.from } : {}),
      })),
    };
  }
  if (c.expected_filesystem) {
    row.expected_filesystem = c.expected_filesystem;
  }
  if (c.expected_output !== undefined) {
    row.expected_output = c.expected_output;
  }
  if (c.follow_ups && c.follow_ups.length > 0) {
    row.follow_ups = c.follow_ups.slice();
  }
  return row;
}
// === Subtask 10 END ===
