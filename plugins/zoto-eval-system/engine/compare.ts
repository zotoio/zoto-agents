#!/usr/bin/env tsx
/**
 * Cross-run comparison.
 *
 * Parses each operand’s **`report.yml`** plus sibling **`static.yml`** /
 * **`llm.yml`** when per-case slices or rollup-adjacent fields are missing from
 * the merged artifact, then produces a flat dataset (runs × cases × dimensions).
 * Loads instructions from **`templates/canvas/compare-prompt.md.tmpl`**.
 *
 * Does not render charts; emits JSON for **`/canvas`** consumption.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve, basename, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import YAML from "yaml";

import { slugifyCaseId } from "./sandbox.js";

const PLUGIN_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CANVAS_TEMPLATE_REL = join("templates", "canvas", "compare-prompt.md.tmpl");

/** Keys omitted from flattened rows (heavy / non-scalar artefacts). */
const STRUCTURED_DROP = new Set([
  "repo_mutations",
  "filesystem_assertions",
  "grader_reports",
  "primitive_analysis",
]);

/** Core columns always present (matching `compare-prompt.md.tmpl`). */
const CORE_SCALAR_KEYS = new Set([
  "tokens",
  "duration_ms",
  "verbosity",
  "accuracy",
  "confidence",
]);

export interface DatasetRow extends Record<string, string | number | undefined> {
  run_id: string;
  model?: string;
  case_id: string;
  status: string;
  tokens: number;
  duration_ms: number;
  verbosity: number;
  accuracy: number;
  confidence: number;
  log_path: string;
}

function resolveReportYamlPath(operand: string): string {
  const abs = resolve(process.cwd(), operand);
  if (!existsSync(abs)) {
    throw new Error(`missing operand path: ${abs}`);
  }
  if (statSync(abs).isDirectory()) {
    const rep = join(abs, "report.yml");
    if (!existsSync(rep)) {
      throw new Error(`missing report.yml under directory: ${abs}`);
    }
    return rep;
  }
  return abs;
}

/** Extract `cases`, `rows`, or empty from a parsed YAML document. */
function extractCandidateRows(doc: unknown): Record<string, unknown>[] {
  if (!doc || typeof doc !== "object") return [];
  const o = doc as Record<string, unknown>;
  const xs = (o.cases ?? o.rows) as unknown;
  if (!Array.isArray(xs)) return [];
  const out: Record<string, unknown>[] = [];
  for (const item of xs) {
    if (item && typeof item === "object")
      out.push(item as Record<string, unknown>);
  }
  return out;
}

/** Case id accessor — tolerates **`id`** and **`case_id`** (fixture + writer). */
export function canonicalCaseId(row: Record<string, unknown>): string {
  const raw = row.id ?? row.case_id;
  return typeof raw === "string" ? raw.trim() : "";
}



/**
 * Prefer **`winner`** keys when set; **`filler`** supplies missing / empty / zero numeric metrics.
 * (Used to layer **`report.yml`** above sibling YAML gaps.)
 */
function mergeWinnerPlusFiller(
  winner: Record<string, unknown>,
  filler: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...filler, ...winner };
  for (const [k, v] of Object.entries(filler)) {
    const cur = out[k];
    const winnerEmpty =
      cur === undefined ||
      cur === null ||
      cur === "" ||
      (CORE_SCALAR_KEYS.has(k) &&
        typeof cur === "number" &&
        Number.isFinite(cur) &&
        cur === 0);
    if (winnerEmpty && v !== undefined && v !== null) {
      out[k] = v;
    }
  }
  return out;
}

/** Combine static-backend + LLM-backend rows (**`static.yml`** merged under **`llm.yml`** overlays). */
function indexAuxMerged(
  staticRows: Record<string, unknown>[],
  llmRows: Record<string, unknown>[],
): Map<string, Record<string, unknown>> {
  const m = new Map<string, Record<string, unknown>>();
  for (const r of staticRows) {
    const k = canonicalCaseId(r);
    if (!k) continue;
    m.set(k, { ...r });
  }
  for (const r of llmRows) {
    const k = canonicalCaseId(r);
    if (!k) continue;
    const prev = m.get(k) ?? {};
    m.set(k, mergeWinnerPlusFiller({ ...r }, prev));
  }
  return m;
}

/** Indexed **`cases` / `rows`** from **`report.yml`** — last occurrence wins collisions. */
function indexReport(reportRows: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const m = new Map<string, Record<string, unknown>>();
  for (const r of reportRows) {
    const k = canonicalCaseId(r);
    if (!k) continue;
    m.set(k, { ...r });
  }
  return m;
}

/** After auxiliary merge indexed by **`id`**. */
function finalizeMergedCases(
  reportIdx: Map<string, Record<string, unknown>>,
  auxIdx: Map<string, Record<string, unknown>>,
): Map<string, Record<string, unknown>> {
  const keys = new Set<string>([...reportIdx.keys(), ...auxIdx.keys()]);
  const out = new Map<string, Record<string, unknown>>();
  for (const k of keys) {
    const rep = reportIdx.get(k);
    const aux = auxIdx.get(k) ?? {};
    const merged =
      rep === undefined
        ? { ...aux }
        : mergeWinnerPlusFiller(rep, aux);
    out.set(k, merged);
  }
  return out;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/** Parse bullet lines under **`## Expected interactions`** in the canvas template. */
export function canvasInstructionsFromMarkdown(templateMd: string): string[] {
  const startMarker = "## Expected interactions";
  const endMarker = "## What NOT to do";
  const i = templateMd.indexOf(startMarker);
  if (i < 0) {
    throw new Error("compare template missing '## Expected interactions' section");
  }
  let body = templateMd.slice(i + startMarker.length);
  const j = body.indexOf(endMarker);
  if (j >= 0) body = body.slice(0, j);
  const out: string[] = [];
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("- ")) out.push(line.slice(2));
  }
  if (out.length === 0) {
    throw new Error("compare template has no instructional bullet lines after expected-header");
  }
  return out;
}

function loadTemplateInstructions(): string[] {
  const abs = resolve(PLUGIN_ROOT, CANVAS_TEMPLATE_REL);
  if (!existsSync(abs)) {
    throw new Error(`missing canvas template: ${abs}`);
  }
  return canvasInstructionsFromMarkdown(readFileSync(abs, "utf-8"));
}

function inferRunId(reportPath: string, doc: Record<string, unknown>): string {
  const fromDoc = doc.run_id;
  if (typeof fromDoc === "string" && fromDoc.length > 0) return fromDoc;
  return basename(dirname(reportPath));
}

function defaultLogPath(runId: string, caseRow: Record<string, unknown>): string {
  const fromRow = caseRow.log_path;
  if (typeof fromRow === "string" && fromRow.length > 0) return fromRow.replace(/\\/g, "/");
  const cid = canonicalCaseId(caseRow);
  const slug = slugifyCaseId(cid || "case");
  return join("_runs", runId, "logs", `case-${slug}.log`);
}

/** Build one **`DatasetRow`**: core columns + supplementary scalar judge / metric keys from **`merged`** */
export function mergedCaseToDatasetRow(
  runId: string,
  model: string | undefined,
  merged: Record<string, unknown>,
): DatasetRow {
  const caseId = canonicalCaseId(merged);
  const lp = defaultLogPath(runId, merged);
  const core: DatasetRow = {
    run_id: runId,
    model,
    case_id: caseId,
    status: str(merged.status, "skipped"),
    tokens: num(merged.tokens),
    duration_ms: num(merged.duration_ms),
    verbosity: num(merged.verbosity),
    accuracy: num(merged.accuracy),
    confidence: num(merged.confidence),
    log_path: lp.replace(/\\/g, "/"),
  };

  /** Preserve extra primitives (post-judge overlays, supplementary metrics). */
  for (const [k, v] of Object.entries(merged)) {
    if (k === "id" || k === "case_id" || STRUCTURED_DROP.has(k)) continue;
    if (k === "status" || k === "model" || k === "backend") continue;
    if (CORE_SCALAR_KEYS.has(k) || k === "log_path") continue;
    const already = k in core;
    if (already) continue;
    if (typeof v === "number" && Number.isFinite(v)) core[k] = v;
    else if (typeof v === "string" && v !== "") core[k] = v;
  }
  return core;
}

/** Optional YAML sibling relative to **`report.yml`** (missing file → `{}`). */
function optionalYamlAdjacent(reportPath: string, filename: string): Record<string, unknown> {
  const p = resolve(dirname(reportPath), filename);
  if (!existsSync(p)) return {};
  return YAML.parse(readFileSync(p, "utf-8")) as Record<string, unknown>;
}

/**
 * Loads **`report.yml`**, merges sibling **`static.yml`** / **`llm.yml`** (required when rollup blocks
 * under **`report.static`** / **`report.llm`** are absent or skeletal), unions every **`case_id`/`id`**, and emits rows.
 *
 * Rows include every case present in any artefact (**no aggregation / downsampling**).
 */
export function loadMergedRunForCompare(reportPath: string): DatasetRow[] {
  const raw = YAML.parse(readFileSync(reportPath, "utf-8")) as Record<string, unknown>;
  const runId = inferRunId(reportPath, raw);
  const model = typeof raw.model === "string" ? raw.model : undefined;

  const reportRows = extractCandidateRows(raw);

  const staticDoc = optionalYamlAdjacent(reportPath, "static.yml");
  const llmDoc = optionalYamlAdjacent(reportPath, "llm.yml");
  const staticRows = extractCandidateRows(staticDoc);
  const llmRows = extractCandidateRows(llmDoc);

  const auxIdx = indexAuxMerged(staticRows, llmRows);
  const reportIdx = indexReport(reportRows);
  const mergedCases = finalizeMergedCases(reportIdx, auxIdx);

  const keys = [...mergedCases.keys()].sort();
  const out: DatasetRow[] = [];
  for (const k of keys) {
    const merged = mergedCases.get(k)!;
    out.push(mergedCaseToDatasetRow(runId, model, merged));
  }
  return out;
}

export function flattenMultiRunDataset(reportPaths: string[]): DatasetRow[] {
  const rows: DatasetRow[] = [];
  for (const rp of reportPaths) {
    rows.push(...loadMergedRunForCompare(rp));
  }
  return rows;
}

function main(): number {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      "Usage: tsx plugins/zoto-eval-system/engine/compare.ts <run-path|report.yml> [<run-path|report.yml>] ...",
    );
    return 1;
  }

  const reportPaths = args.map(resolveReportYamlPath);

  try {
    const dataset = flattenMultiRunDataset(reportPaths);
    const handoff = {
      tool: "/canvas",
      instructions: loadTemplateInstructions(),
      dataset,
    };
    console.log(JSON.stringify(handoff, null, 2));
    return 0;
  } catch (e) {
    console.error((e as Error).message ?? e);
    return 1;
  }
}

/** Resolve when this module is the script entry (`tsx .../compare.ts`). **/
const INVOKED_AS_CLI =
  typeof process.argv[1] === "string" &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (INVOKED_AS_CLI) {
  process.exit(main());
}
