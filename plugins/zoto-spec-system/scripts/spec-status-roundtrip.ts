#!/usr/bin/env tsx
/**
 * YAML ↔ Markdown round-trip for per-subtask live status files.
 * See plugins/zoto-spec-system/docs/status-schema.md.
 */

import type { ValidateFunction } from "ajv";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import YAML from "yaml";

type AjvInstance = import("ajv").default;
const req = createRequire(import.meta.url);
const ajvExported = req("ajv") as
  | (new (opts?: object) => AjvInstance)
  | { default: new (opts?: object) => AjvInstance };
const AjvCtor =
  typeof ajvExported === "function"
    ? ajvExported
    : (ajvExported as { default: new (opts?: object) => AjvInstance }).default;
const addFormatsExported = req("ajv-formats") as
  | ((a: AjvInstance) => void)
  | { default: (a: AjvInstance) => void };
const addFormatsFn =
  typeof addFormatsExported === "function"
    ? addFormatsExported
    : (addFormatsExported as { default: (a: AjvInstance) => void }).default;

const PLUGIN_ROOT = resolve(import.meta.dirname, "..");
const SCHEMA_PATH = join(PLUGIN_ROOT, "templates/schema/subtask-status.schema.json");
const TEMPLATE_PATH = join(PLUGIN_ROOT, "templates/status/subtask-status.md.tmpl");

const BLOCK_IDS = ["metadata", "checklist", "artifacts", "errors", "notes"] as const;
type BlockId = (typeof BLOCK_IDS)[number];

export interface SubtaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
  evidence_path: string | null;
}

export interface SubtaskArtifact {
  path: string;
  kind: "created" | "modified" | "deleted";
  note: string | null;
}

export interface SubtaskError {
  at: string;
  message: string;
  severity: "info" | "warn" | "error";
}

export interface SubtaskStatusDoc {
  schema_version: number;
  subtask_id: string;
  feature: string;
  assigned_agent: string;
  model: string;
  token_budget: number;
  state: "pending" | "in_progress" | "blocked" | "completed" | "failed";
  started_at?: string;
  last_heartbeat?: string;
  completed_at?: string;
  git_sha?: string;
  agent_session_id?: string;
  checklist: SubtaskChecklistItem[];
  artifacts: SubtaskArtifact[];
  errors: SubtaskError[];
  notes: string;
  extra: Record<string, unknown>;
}

let _validate: ValidateFunction | undefined;

function getValidator(): ValidateFunction {
  if (_validate === undefined) {
    const raw = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8")) as object;
    const ajv = new AjvCtor({ allErrors: true, strict: false });
    addFormatsFn(ajv);
    _validate = ajv.compile(raw);
  }
  return _validate;
}

export function validateSubtaskStatus(data: unknown): data is SubtaskStatusDoc {
  const v = getValidator();
  if (!v(data)) {
    throw new Error(
      `subtask-status schema validation failed:\n${JSON.stringify(v.errors, null, 2)}`,
    );
  }
  return true;
}

export function extractStatusBlocks(md: string): Record<BlockId, string> {
  const out = {} as Record<BlockId, string>;
  for (const id of BLOCK_IDS) {
    const re = new RegExp(
      `<!--\\s*status:${id}:start\\s*-->\\s*([\\s\\S]*?)<!--\\s*status:${id}:end\\s*-->`,
      "m",
    );
    const m = md.match(re);
    if (!m) {
      throw new Error(`Missing or malformed status block: ${id}`);
    }
    out[id] = m[1].replace(/\s+$/, "");
  }
  return out;
}

function parseMetadataTable(block: string): Record<string, string> {
  const rows: Record<string, string> = {};
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const parts = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (parts.length < 2) continue;
    const [k, v] = [parts[0], parts.slice(1).join("|").trim()];
    if (k.toLowerCase() === "key" && v.toLowerCase() === "value") continue;
    if (/^[-:]+$/.test(k)) continue;
    rows[k] = v;
  }
  return rows;
}

export function parseChecklistBlock(block: string): SubtaskChecklistItem[] {
  const items: SubtaskChecklistItem[] = [];
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- [")) continue;
    const m = trimmed.match(/^-\s*\[([ x])\]\s+\*\*([^*]+)\*\*\s*[—\-]\s*(.+)$/);
    if (!m) continue;
    const done = m[1] === "x";
    let rest = m[3].trim();
    let evidence_path: string | null = null;
    const ev = /\s+\(\`([^`]+)\`\)\s*$/.exec(rest);
    if (ev?.index !== undefined) {
      evidence_path = ev[1] ?? null;
      rest = rest.slice(0, ev.index).trim();
    }
    items.push({
      id: m[2]!.trim(),
      text: rest,
      done,
      evidence_path,
    });
  }
  return items;
}

export function parseArtifactsBlock(block: string): SubtaskArtifact[] {
  const t = block.trim();
  if (t === "_None._" || t === "") return [];
  const items: SubtaskArtifact[] = [];
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- **")) continue;
    const m = trimmed.match(
      /^-\s*\*\*(created|modified|deleted)\*\*\s*`([^`]+)`\s*[—\-]\s*(.*)$/,
    );
    if (m) {
      items.push({
        kind: m[1] as SubtaskArtifact["kind"],
        path: m[2]!,
        note: m[3]!.length > 0 ? m[3]! : null,
      });
    }
  }
  return items;
}

export function parseErrorsBlock(block: string): SubtaskError[] {
  const t = block.trim();
  if (t === "_None._" || t === "") return [];
  const items: SubtaskError[] = [];
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- **")) continue;
    const m = trimmed.match(
      /^-\s*\*\*(info|warn|error)\*\*\s*`([^`]+)`\s*[—\-]\s*(.+)$/,
    );
    if (m) {
      items.push({
        severity: m[1] as SubtaskError["severity"],
        at: m[2]!,
        message: m[3]!.trim(),
      });
    }
  }
  return items;
}

function optScalar(rows: Record<string, string>, key: string): string | undefined {
  const raw = rows[key]?.trim();
  return raw !== undefined && raw !== "" ? raw : undefined;
}

function metadataRowsToScalars(
  rows: Record<string, string>,
): Pick<
  SubtaskStatusDoc,
  | "schema_version"
  | "subtask_id"
  | "feature"
  | "assigned_agent"
  | "model"
  | "token_budget"
  | "state"
  | "started_at"
  | "last_heartbeat"
  | "completed_at"
  | "git_sha"
  | "agent_session_id"
> {
  const subtask_id = String(rows.subtask_id ?? "").padStart(2, "0");
  const base = {
    schema_version: Number(rows.schema_version),
    subtask_id,
    feature: rows.feature ?? "",
    assigned_agent: rows.assigned_agent ?? "",
    model: rows.model ?? "",
    token_budget: Number(rows.token_budget ?? 0),
    state: (rows.state ?? "pending") as SubtaskStatusDoc["state"],
  };
  return {
    ...base,
    started_at: optScalar(rows, "started_at"),
    last_heartbeat: optScalar(rows, "last_heartbeat"),
    completed_at: optScalar(rows, "completed_at"),
    git_sha: optScalar(rows, "git_sha"),
    agent_session_id: optScalar(rows, "agent_session_id"),
  };
}

export function statusFromMarkedMd(md: string): SubtaskStatusDoc {
  const blocks = extractStatusBlocks(md);
  const meta = metadataRowsToScalars(parseMetadataTable(blocks.metadata));
  const payload: SubtaskStatusDoc = {
    ...meta,
    checklist: parseChecklistBlock(blocks.checklist),
    artifacts: parseArtifactsBlock(blocks.artifacts),
    errors: parseErrorsBlock(blocks.errors),
    notes: blocks.notes.trim(),
    extra: {},
  };
  validateSubtaskStatus(payload);
  return payload;
}

export function renderChecklistMd(items: SubtaskChecklistItem[]): string {
  return items
    .map((i) => {
      const box = i.done ? "[x]" : "[ ]";
      const ev = i.evidence_path ? ` (\`${i.evidence_path}\`)` : "";
      return `- ${box} **${i.id}** — ${i.text}${ev}`;
    })
    .join("\n");
}

export function renderArtifactsMd(items: SubtaskArtifact[]): string {
  if (items.length === 0) return "_None._";
  return items
    .map((i) => {
      const note = i.note ?? "";
      return `- **${i.kind}** \`${i.path}\` — ${note}`;
    })
    .join("\n");
}

export function renderErrorsMd(items: SubtaskError[]): string {
  if (items.length === 0) return "_None._";
  return items
    .map((e) => `- **${e.severity}** \`${e.at}\` — ${e.message}`)
    .join("\n");
}

function scalarForTemplate(v: string | number | undefined | null): string {
  if (v === undefined || v === null) return "";
  return String(v);
}

export function renderMdFromDoc(doc: SubtaskStatusDoc, templateSrc?: string): string {
  validateSubtaskStatus(doc);
  const tmpl = templateSrc ?? readFileSync(TEMPLATE_PATH, "utf-8");
  const vars: Record<string, string> = {
    subtask_id: doc.subtask_id,
    feature: doc.feature,
    schema_version: String(doc.schema_version),
    assigned_agent: doc.assigned_agent,
    model: doc.model,
    token_budget: String(doc.token_budget),
    state: doc.state,
    started_at: scalarForTemplate(doc.started_at),
    last_heartbeat: scalarForTemplate(doc.last_heartbeat),
    completed_at: scalarForTemplate(doc.completed_at),
    git_sha: scalarForTemplate(doc.git_sha),
    agent_session_id: scalarForTemplate(doc.agent_session_id),
    checklist_md: renderChecklistMd(doc.checklist),
    artifacts_md: renderArtifactsMd(doc.artifacts),
    errors_md: renderErrorsMd(doc.errors),
    notes: doc.notes,
  };
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

export function readYml(path: string): SubtaskStatusDoc {
  const raw = readFileSync(path, "utf-8");
  const data: unknown = YAML.parse(raw);
  validateSubtaskStatus(data);
  return data as SubtaskStatusDoc;
}

/** Write `content` to `filePath` via `<filePath>.tmp` then `rename` (atomic on POSIX). */
export function writePathAtomic(filePath: string, content: string): void {
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, content, "utf-8");
  renameSync(tmp, filePath);
}

export function writeYml(path: string, doc: SubtaskStatusDoc): void {
  validateSubtaskStatus(doc);
  writePathAtomic(path, YAML.stringify(doc, { lineWidth: 0 }));
}

/** Render `.status.md` from an existing YAML file (validates YAML). */
export function mdFromYmlPaths(inYml: string, outMd: string): void {
  const doc = readYml(inYml);
  writePathAtomic(outMd, renderMdFromDoc(doc));
}

/** Parse block-marked `.status.md` and write validated YAML. */
export function ymlFromMdPaths(inMd: string, outYml: string): void {
  const md = readFileSync(inMd, "utf-8");
  const doc = statusFromMarkedMd(md);
  writeYml(outYml, doc);
}

const SUBTASK_FILE_RE = /^subtask-(\d{2})-.+\.md$/;

function listSubtaskFiles(specDir: string): string[] {
  return readdirSync(specDir)
    .filter((n) => SUBTASK_FILE_RE.test(n))
    .map((n) => join(specDir, n))
    .sort();
}

function parseSubtaskFileMeta(md: string): {
  subtaskId: string;
  feature: string;
  assignedAgent: string;
} {
  const idM = md.match(/^\s*-\s*\*\*Subtask ID\*\*:\s*(\d{1,2})\s*$/m);
  const featM = md.match(/^\s*-\s*\*\*Feature\*\*:\s*(.+?)\s*$/m);
  const agentM = md.match(/^\s*-\s*\*\*Assigned Subagent\*\*:\s*(.+?)\s*$/m);
  const subtaskId = idM?.[1] ? String(idM[1]).padStart(2, "0") : "01";
  const feature = featM?.[1]?.trim() ?? "unknown-feature";
  const assignedAgent = agentM?.[1]?.trim() ?? "generalPurpose";
  return { subtaskId, feature, assignedAgent };
}

/** Collect deliverable checkbox lines (## Deliverables Checklist → next ## section). */
export function extractDeliverablesTexts(subtaskMd: string): string[] {
  const label = "## Deliverables Checklist";
  const i = subtaskMd.indexOf(label);
  if (i === -1) return [];
  const after = subtaskMd.slice(i + label.length);
  const end = after.search(/^## [A-Za-z]/m);
  const chunk = end === -1 ? after : after.slice(0, end);
  const texts: string[] = [];
  for (const line of chunk.split("\n")) {
    const m = line.match(/^\s*-\s*\[[ x]\]\s+(.+)$/);
    if (m) texts.push(m[1]!.trim());
  }
  return texts;
}

function buildScaffoldDoc(
  subtaskMd: string,
  subtaskIdFromFilename: string,
): SubtaskStatusDoc {
  const meta = parseSubtaskFileMeta(subtaskMd);
  const deliverables = extractDeliverablesTexts(subtaskMd);
  const checklist: SubtaskChecklistItem[] = deliverables.map((text, idx) => ({
    id: `D${String(idx + 1).padStart(2, "0")}`,
    text,
    done: false,
    evidence_path: null,
  }));
  const subtask_id = subtaskIdFromFilename.padStart(2, "0");
  return {
    schema_version: 1,
    subtask_id,
    feature: meta.feature,
    assigned_agent: meta.assignedAgent,
    model: "composer-2-fast",
    token_budget: 200_000,
    state: "pending",
    checklist,
    artifacts: [],
    errors: [],
    notes: "",
    extra: {},
  };
}

/**
 * Scaffold `status/*.status.yml` (+ rendered `.status.md`).
 * Never overwrites existing YAML; regenerates Markdown when YAML is newer or MD missing,
 * unless an existing Markdown file is strictly newer than its YAML companion.
 */
export function scaffoldSpecDir(specDir: string): void {
  const abs = resolve(specDir);
  const statusDir = join(abs, "status");
  mkdirSync(statusDir, { recursive: true });

  for (const subtaskPath of listSubtaskFiles(abs)) {
    const base = basename(subtaskPath, ".md");
    const mm = /^subtask-(\d{2})-/.exec(base);
    const subtaskId = mm?.[1] ? mm[1]!.padStart(2, "0") : "01";
    const ymlPath = join(statusDir, `${base}.status.yml`);
    const mdPath = join(statusDir, `${base}.status.md`);

    let doc: SubtaskStatusDoc | null = null;

    if (!existsSync(ymlPath)) {
      const subtaskMd = readFileSync(subtaskPath, "utf-8");
      doc = buildScaffoldDoc(subtaskMd, subtaskId);
      writeYml(ymlPath, doc);
    } else {
      doc = readYml(ymlPath);
    }

    const ymlStat = statSync(ymlPath);
    const shouldRenderMd =
      !existsSync(mdPath) || statSync(mdPath).mtimeMs <= ymlStat.mtimeMs;
    if (shouldRenderMd) {
      doc = readYml(ymlPath);
      writePathAtomic(mdPath, renderMdFromDoc(doc));
    }
  }
}

export function validateSpecStatusDir(specDir: string): boolean {
  const statusDir = join(resolve(specDir), "status");
  if (!existsSync(statusDir)) {
    console.error(`validate: missing status directory: ${statusDir}`);
    return false;
  }
  let ok = true;
  const ymlFiles = readdirSync(statusDir)
    .filter((f) => f.endsWith(".status.yml"))
    .sort();
  if (ymlFiles.length === 0) {
    console.error(`validate: no *.status.yml under ${statusDir}`);
    ok = false;
  }
  for (const f of ymlFiles) {
    const p = join(statusDir, f);
    try {
      readYml(p);
    } catch (e) {
      ok = false;
      console.error(`validate: FAIL ${p}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return ok;
}

/** Exposed for tests: set Markdown mtime newer than YAML without changing content meaningfully. */
export function bumpMtimeMs(path: string, ms: number): void {
  utimesSync(path, new Date(ms), new Date(ms));
}

function readFlag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1 || i + 1 >= argv.length) return undefined;
  return argv[i + 1];
}

function readFlags(argv: string[], name: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === name && i + 1 < argv.length) out.push(argv[i + 1]!);
  }
  return out;
}

const TERMINAL: SubtaskStatusDoc["state"][] = ["completed", "blocked", "failed"];

function pairedStatusMdFromYml(ymlPath: string): string {
  if (ymlPath.endsWith(".status.yml")) {
    return ymlPath.slice(0, -".status.yml".length) + ".status.md";
  }
  return `${ymlPath}.status.md`;
}

function parseArtifactArg(raw: string): SubtaskArtifact {
  const m = raw.match(/^(.+):(created|modified|deleted):([\s\S]*)$/);
  if (!m) {
    throw new Error(
      `invalid --artifact "${raw}": expected <path>:(created|modified|deleted):<note>`,
    );
  }
  const note = m[3]!.length > 0 ? m[3]! : null;
  return { path: m[1]!, kind: m[2] as SubtaskArtifact["kind"], note };
}

function parseErrorArg(raw: string, atIso: string): SubtaskError {
  const m = raw.match(/^(info|warn|error):([\s\S]+)$/);
  if (!m) {
    throw new Error(`invalid --error "${raw}": expected <severity>:<message>`);
  }
  return { severity: m[1] as SubtaskError["severity"], at: atIso, message: m[2]!.trim() };
}

export function applyHeartbeat(args: {
  doc: SubtaskStatusDoc;
  nowIso: string;
  state?: SubtaskStatusDoc["state"];
  tickIds?: string[];
  artifacts?: string[];
  errors?: string[];
}): SubtaskStatusDoc {
  const doc = structuredClone(args.doc) as SubtaskStatusDoc;
  doc.last_heartbeat = args.nowIso;

  for (const id of args.tickIds ?? []) {
    const item = doc.checklist.find((c) => c.id === id);
    if (!item) {
      throw new Error(
        `unknown checklist id "${id}"; known: ${doc.checklist.map((c) => c.id).join(", ") || "(none)"}`,
      );
    }
    item.done = true;
  }

  for (const a of args.artifacts ?? []) {
    doc.artifacts.push(parseArtifactArg(a));
  }

  for (const e of args.errors ?? []) {
    doc.errors.push(parseErrorArg(e, args.nowIso));
  }

  if (args.state !== undefined) {
    const ALLOWED: SubtaskStatusDoc["state"][] = [
      "pending",
      "in_progress",
      "blocked",
      "completed",
      "failed",
    ];
    if (!ALLOWED.includes(args.state)) {
      throw new Error(`invalid --state: ${args.state}`);
    }
    if (args.state === "completed") {
      const open = doc.checklist.filter((c) => !c.done);
      if (open.length > 0) {
        throw new Error(
          `cannot set state to completed while checklist items are open: ${open.map((c) => c.id).join(", ")} — tick remaining items first`,
        );
      }
    }
    doc.state = args.state;
    if (TERMINAL.includes(doc.state)) {
      doc.completed_at = args.nowIso;
    } else {
      delete doc.completed_at;
    }
  }

  if (
    doc.state === "in_progress" &&
    (doc.started_at === undefined || doc.started_at === "")
  ) {
    doc.started_at = args.nowIso;
  }

  validateSubtaskStatus(doc);
  return doc;
}

export function heartbeatPaths(inYml: string, argvSlice: string[]): void {
  const ymlPath = resolve(inYml);
  let doc = readYml(ymlPath);
  const nowIso = new Date().toISOString();
  const stateRaw = readFlag(argvSlice, "--state");
  const state = stateRaw as SubtaskStatusDoc["state"] | undefined;
  const tickIds = readFlags(argvSlice, "--tick");
  const artifacts = readFlags(argvSlice, "--artifact");
  const errors = readFlags(argvSlice, "--error");

  doc = applyHeartbeat({
    doc,
    nowIso,
    state,
    tickIds: tickIds.length > 0 ? tickIds : undefined,
    artifacts: artifacts.length > 0 ? artifacts : undefined,
    errors: errors.length > 0 ? errors : undefined,
  });

  writeYml(ymlPath, doc);
  const mdPath = pairedStatusMdFromYml(ymlPath);
  writePathAtomic(mdPath, renderMdFromDoc(doc));
}

function usage(): string {
  return `Usage:
  spec-status-roundtrip md-from-yml --in <file.status.yml> --out <file.status.md>
  spec-status-roundtrip yml-from-md --in <file.status.md> --out <file.status.yml>
  spec-status-roundtrip scaffold --spec-dir <spec-directory>
  spec-status-roundtrip validate --spec-dir <spec-directory>
  spec-status-roundtrip heartbeat --in <file.status.yml> [--state <state>] [--tick <checklistId>] [--artifact <path>:(created|modified|deleted):<note>] [--error <severity>:<message>]
`;
}

/** Args after `tsx scripts/spec-status-roundtrip.ts` (pnpm run may inject a leading `--`). */
function cliArgs(): string[] {
  const raw = process.argv.slice(2);
  if (raw[0] === "--") return raw.slice(1);
  return raw;
}

function main(): number {
  const argv = cliArgs();
  const cmd = argv[0];
  if (!cmd || cmd === "--help" || cmd === "-h") {
    console.error(usage());
    return cmd ? 0 : 1;
  }

  try {
    if (cmd === "md-from-yml") {
      const inp = readFlag(argv, "--in");
      const out = readFlag(argv, "--out");
      if (!inp || !out) throw new Error("md-from-yml requires --in and --out");
      mdFromYmlPaths(resolve(inp), resolve(out));
      return 0;
    }
    if (cmd === "yml-from-md") {
      const inp = readFlag(argv, "--in");
      const out = readFlag(argv, "--out");
      if (!inp || !out) throw new Error("yml-from-md requires --in and --out");
      ymlFromMdPaths(resolve(inp), resolve(out));
      return 0;
    }
    if (cmd === "scaffold") {
      const dir = readFlag(argv, "--spec-dir");
      if (!dir) throw new Error("scaffold requires --spec-dir");
      scaffoldSpecDir(dir);
      return 0;
    }
    if (cmd === "validate") {
      const dir = readFlag(argv, "--spec-dir");
      if (!dir) throw new Error("validate requires --spec-dir");
      const ok = validateSpecStatusDir(dir);
      return ok ? 0 : 1;
    }
    if (cmd === "heartbeat") {
      const inp = readFlag(argv, "--in");
      if (!inp) throw new Error("heartbeat requires --in <file.status.yml>");
      heartbeatPaths(resolve(inp), argv);
      return 0;
    }
    throw new Error(`Unknown command: ${cmd}\n${usage()}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    return 1;
  }
}

function executedAsCliEntry(): boolean {
  const a = process.argv[1];
  if (!a) return false;
  try {
    if (import.meta.url !== pathToFileURL(resolve(a)).href) return false;
    // Guard against tsup bundling: when this module is inlined into another
    // entry (e.g. hooks/zoto-onstop-check.mjs), the `import.meta.url` check
    // above passes for both modules. Confirm the running entry's basename
    // identifies this CLI specifically.
    return basename(a).startsWith("spec-status-roundtrip");
  } catch {
    return false;
  }
}

if (executedAsCliEntry()) {
  process.exitCode = main();
}
