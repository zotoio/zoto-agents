#!/usr/bin/env node

// hooks/zoto-onstop-check.ts
import { existsSync as existsSync4, readFileSync as readFileSync4 } from "fs";
import { resolve as resolve3 } from "path";

// src/onstop-check.ts
import { existsSync as existsSync3, readFileSync as readFileSync3, readdirSync as readdirSync2, statSync as statSync3 } from "fs";
import { createRequire as createRequire2 } from "module";
import { dirname as dirname2, join as join3, resolve as resolve2 } from "path";
import YAML3 from "yaml";

// src/config-loader.ts
import { Ajv } from "ajv";
import addFormatsImport from "ajv-formats";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";
var __dirname = dirname(fileURLToPath(import.meta.url));
var SCHEMA_PATH = join(__dirname, "..", "templates", "schema", "config.schema.json");
var TEMPLATE_CONFIG_PATH = join(__dirname, "..", "templates", "config.json");
var ConfigValidationError = class extends Error {
  errors;
  constructor(errors) {
    super("Invalid spec system config");
    this.name = "ConfigValidationError";
    this.errors = errors;
  }
};
var ajv = new Ajv({ allErrors: true, strict: false, useDefaults: true });
var addFormats = addFormatsImport;
addFormats(ajv);
var schemaJson = JSON.parse(readFileSync(SCHEMA_PATH, "utf-8"));
var validateConfig = ajv.compile(schemaJson);
var templateBaseline;
function readTemplateBaseline() {
  if (!templateBaseline) {
    templateBaseline = JSON.parse(readFileSync(TEMPLATE_CONFIG_PATH, "utf-8"));
  }
  return templateBaseline;
}
function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}
function deepMerge(base, override) {
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === void 0) continue;
    const baseVal = base[key];
    if (isPlainObject(baseVal) && isPlainObject(value)) {
      out[key] = deepMerge(baseVal, value);
    } else {
      out[key] = value;
    }
  }
  return out;
}
function configPathForRepo(repoRoot) {
  return join(repoRoot, ".zoto", "spec-system", "config.yml");
}
function migrateFromLegacy(repoRoot) {
  const legacyDir = join(repoRoot, ".zoto-spec-system");
  const newDir = join(repoRoot, ".zoto", "spec-system");
  if (!existsSync(legacyDir)) {
    return { migrated: false };
  }
  if (existsSync(newDir)) {
    return { migrated: false, conflict: true, from: legacyDir, to: newDir };
  }
  mkdirSync(dirname(newDir), { recursive: true });
  renameSync(legacyDir, newDir);
  const oldConfig = join(newDir, "config.json");
  const newConfig = join(newDir, "config.yml");
  if (existsSync(oldConfig) && !existsSync(newConfig)) {
    try {
      const json = JSON.parse(readFileSync(oldConfig, "utf-8"));
      writeFileSync(newConfig, YAML.stringify(json), "utf-8");
      unlinkSync(oldConfig);
    } catch {
      renameSync(oldConfig, newConfig);
    }
  }
  return { migrated: true, from: legacyDir, to: newDir };
}
function loadConfig(repoRoot, prevMtimeMs) {
  migrateFromLegacy(repoRoot);
  const path = configPathForRepo(repoRoot);
  const baseline = readTemplateBaseline();
  if (!existsSync(path)) {
    const config = structuredClone(baseline);
    const draft2 = structuredClone(config);
    if (!validateConfig(draft2)) {
      throw new ConfigValidationError(validateConfig.errors ?? []);
    }
    return {
      config: draft2,
      mtimeMs: 0,
      reloaded: false,
      path
    };
  }
  let raw;
  try {
    raw = YAML.parse(readFileSync(path, "utf-8"));
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e));
  }
  if (raw === null || raw === void 0) {
    raw = {};
  }
  if (!isPlainObject(raw)) {
    throw new ConfigValidationError([
      { keyword: "type", message: "config root must be a YAML mapping (object)", params: {} }
    ]);
  }
  const merged = deepMerge(
    structuredClone(baseline),
    raw
  );
  const draft = structuredClone(merged);
  if (!validateConfig(draft)) {
    throw new ConfigValidationError(validateConfig.errors ?? []);
  }
  const mtimeMs = statSync(path).mtimeMs;
  const reloaded = mtimeMs !== prevMtimeMs;
  return {
    config: draft,
    mtimeMs,
    reloaded,
    path
  };
}

// scripts/spec-status-roundtrip.ts
import { createRequire } from "module";
import {
  existsSync as existsSync2,
  mkdirSync as mkdirSync2,
  readFileSync as readFileSync2,
  readdirSync,
  renameSync as renameSync2,
  statSync as statSync2,
  utimesSync,
  writeFileSync as writeFileSync2
} from "fs";
import { basename, join as join2, resolve } from "path";
import { pathToFileURL } from "url";
import YAML2 from "yaml";
var req = createRequire(import.meta.url);
var ajvExported = req("ajv");
var AjvCtor = typeof ajvExported === "function" ? ajvExported : ajvExported.default;
var addFormatsExported = req("ajv-formats");
var addFormatsFn = typeof addFormatsExported === "function" ? addFormatsExported : addFormatsExported.default;
var PLUGIN_ROOT = resolve(import.meta.dirname, "..");
var SCHEMA_PATH2 = join2(PLUGIN_ROOT, "templates/schema/subtask-status.schema.json");
var TEMPLATE_PATH = join2(PLUGIN_ROOT, "templates/status/subtask-status.md.tmpl");
var BLOCK_IDS = ["metadata", "checklist", "artifacts", "errors", "notes"];
var _validate;
function getValidator() {
  if (_validate === void 0) {
    const raw = JSON.parse(readFileSync2(SCHEMA_PATH2, "utf-8"));
    const ajv2 = new AjvCtor({ allErrors: true, strict: false });
    addFormatsFn(ajv2);
    _validate = ajv2.compile(raw);
  }
  return _validate;
}
function validateSubtaskStatus(data) {
  const v = getValidator();
  if (!v(data)) {
    throw new Error(
      `subtask-status schema validation failed:
${JSON.stringify(v.errors, null, 2)}`
    );
  }
  return true;
}
function extractStatusBlocks(md) {
  const out = {};
  for (const id of BLOCK_IDS) {
    const re = new RegExp(
      `<!--\\s*status:${id}:start\\s*-->\\s*([\\s\\S]*?)<!--\\s*status:${id}:end\\s*-->`,
      "m"
    );
    const m = md.match(re);
    if (!m) {
      throw new Error(`Missing or malformed status block: ${id}`);
    }
    out[id] = m[1].replace(/\s+$/, "");
  }
  return out;
}
function parseMetadataTable(block) {
  const rows = {};
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const parts = trimmed.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
    if (parts.length < 2) continue;
    const [k, v] = [parts[0], parts.slice(1).join("|").trim()];
    if (k.toLowerCase() === "key" && v.toLowerCase() === "value") continue;
    if (/^[-:]+$/.test(k)) continue;
    rows[k] = v;
  }
  return rows;
}
function parseChecklistBlock(block) {
  const items = [];
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- [")) continue;
    const m = trimmed.match(/^-\s*\[([ x])\]\s+\*\*([^*]+)\*\*\s*[—\-]\s*(.+)$/);
    if (!m) continue;
    const done = m[1] === "x";
    let rest = m[3].trim();
    let evidence_path = null;
    const ev = /\s+\(\`([^`]+)\`\)\s*$/.exec(rest);
    if (ev?.index !== void 0) {
      evidence_path = ev[1] ?? null;
      rest = rest.slice(0, ev.index).trim();
    }
    items.push({
      id: m[2].trim(),
      text: rest,
      done,
      evidence_path
    });
  }
  return items;
}
function parseArtifactsBlock(block) {
  const t = block.trim();
  if (t === "_None._" || t === "") return [];
  const items = [];
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- **")) continue;
    const m = trimmed.match(
      /^-\s*\*\*(created|modified|deleted)\*\*\s*`([^`]+)`\s*[—\-]\s*(.*)$/
    );
    if (m) {
      items.push({
        kind: m[1],
        path: m[2],
        note: m[3].length > 0 ? m[3] : null
      });
    }
  }
  return items;
}
function parseErrorsBlock(block) {
  const t = block.trim();
  if (t === "_None._" || t === "") return [];
  const items = [];
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- **")) continue;
    const m = trimmed.match(
      /^-\s*\*\*(info|warn|error)\*\*\s*`([^`]+)`\s*[—\-]\s*(.+)$/
    );
    if (m) {
      items.push({
        severity: m[1],
        at: m[2],
        message: m[3].trim()
      });
    }
  }
  return items;
}
function optScalar(rows, key) {
  const raw = rows[key]?.trim();
  return raw !== void 0 && raw !== "" ? raw : void 0;
}
function metadataRowsToScalars(rows) {
  const subtask_id = String(rows.subtask_id ?? "").padStart(2, "0");
  const base = {
    schema_version: Number(rows.schema_version),
    subtask_id,
    feature: rows.feature ?? "",
    assigned_agent: rows.assigned_agent ?? "",
    model: rows.model ?? "",
    token_budget: Number(rows.token_budget ?? 0),
    state: rows.state ?? "pending"
  };
  return {
    ...base,
    started_at: optScalar(rows, "started_at"),
    last_heartbeat: optScalar(rows, "last_heartbeat"),
    completed_at: optScalar(rows, "completed_at"),
    git_sha: optScalar(rows, "git_sha"),
    agent_session_id: optScalar(rows, "agent_session_id")
  };
}
function statusFromMarkedMd(md) {
  const blocks = extractStatusBlocks(md);
  const meta = metadataRowsToScalars(parseMetadataTable(blocks.metadata));
  const payload = {
    ...meta,
    checklist: parseChecklistBlock(blocks.checklist),
    artifacts: parseArtifactsBlock(blocks.artifacts),
    errors: parseErrorsBlock(blocks.errors),
    notes: blocks.notes.trim(),
    extra: {}
  };
  validateSubtaskStatus(payload);
  return payload;
}
function renderChecklistMd(items) {
  return items.map((i) => {
    const box = i.done ? "[x]" : "[ ]";
    const ev = i.evidence_path ? ` (\`${i.evidence_path}\`)` : "";
    return `- ${box} **${i.id}** \u2014 ${i.text}${ev}`;
  }).join("\n");
}
function renderArtifactsMd(items) {
  if (items.length === 0) return "_None._";
  return items.map((i) => {
    const note = i.note ?? "";
    return `- **${i.kind}** \`${i.path}\` \u2014 ${note}`;
  }).join("\n");
}
function renderErrorsMd(items) {
  if (items.length === 0) return "_None._";
  return items.map((e) => `- **${e.severity}** \`${e.at}\` \u2014 ${e.message}`).join("\n");
}
function scalarForTemplate(v) {
  if (v === void 0 || v === null) return "";
  return String(v);
}
function renderMdFromDoc(doc, templateSrc) {
  validateSubtaskStatus(doc);
  const tmpl = templateSrc ?? readFileSync2(TEMPLATE_PATH, "utf-8");
  const vars = {
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
    notes: doc.notes
  };
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}
function readYml(path) {
  const raw = readFileSync2(path, "utf-8");
  const data = YAML2.parse(raw);
  validateSubtaskStatus(data);
  return data;
}
function writePathAtomic(filePath, content) {
  const tmp = `${filePath}.tmp`;
  writeFileSync2(tmp, content, "utf-8");
  renameSync2(tmp, filePath);
}
function writeYml(path, doc) {
  validateSubtaskStatus(doc);
  writePathAtomic(path, YAML2.stringify(doc, { lineWidth: 0 }));
}
function mdFromYmlPaths(inYml, outMd) {
  const doc = readYml(inYml);
  writePathAtomic(outMd, renderMdFromDoc(doc));
}
function ymlFromMdPaths(inMd, outYml) {
  const md = readFileSync2(inMd, "utf-8");
  const doc = statusFromMarkedMd(md);
  writeYml(outYml, doc);
}
var SUBTASK_FILE_RE = /^subtask-(\d{2})-.+\.md$/;
function listSubtaskFiles(specDir) {
  return readdirSync(specDir).filter((n) => SUBTASK_FILE_RE.test(n)).map((n) => join2(specDir, n)).sort();
}
function parseSubtaskFileMeta(md) {
  const idM = md.match(/^\s*-\s*\*\*Subtask ID\*\*:\s*(\d{1,2})\s*$/m);
  const featM = md.match(/^\s*-\s*\*\*Feature\*\*:\s*(.+?)\s*$/m);
  const agentM = md.match(/^\s*-\s*\*\*Assigned Subagent\*\*:\s*(.+?)\s*$/m);
  const subtaskId = idM?.[1] ? String(idM[1]).padStart(2, "0") : "01";
  const feature = featM?.[1]?.trim() ?? "unknown-feature";
  const assignedAgent = agentM?.[1]?.trim() ?? "generalPurpose";
  return { subtaskId, feature, assignedAgent };
}
function extractDeliverablesTexts(subtaskMd) {
  const label = "## Deliverables Checklist";
  const i = subtaskMd.indexOf(label);
  if (i === -1) return [];
  const after = subtaskMd.slice(i + label.length);
  const end = after.search(/^## [A-Za-z]/m);
  const chunk = end === -1 ? after : after.slice(0, end);
  const texts = [];
  for (const line of chunk.split("\n")) {
    const m = line.match(/^\s*-\s*\[[ x]\]\s+(.+)$/);
    if (m) texts.push(m[1].trim());
  }
  return texts;
}
function buildScaffoldDoc(subtaskMd, subtaskIdFromFilename) {
  const meta = parseSubtaskFileMeta(subtaskMd);
  const deliverables = extractDeliverablesTexts(subtaskMd);
  const checklist = deliverables.map((text, idx) => ({
    id: `D${String(idx + 1).padStart(2, "0")}`,
    text,
    done: false,
    evidence_path: null
  }));
  const subtask_id = subtaskIdFromFilename.padStart(2, "0");
  return {
    schema_version: 1,
    subtask_id,
    feature: meta.feature,
    assigned_agent: meta.assignedAgent,
    model: "composer-2.5-fast",
    token_budget: 2e5,
    state: "pending",
    checklist,
    artifacts: [],
    errors: [],
    notes: "",
    extra: {}
  };
}
function scaffoldSpecDir(specDir) {
  const abs = resolve(specDir);
  const statusDir = join2(abs, "status");
  mkdirSync2(statusDir, { recursive: true });
  for (const subtaskPath of listSubtaskFiles(abs)) {
    const base = basename(subtaskPath, ".md");
    const mm = /^subtask-(\d{2})-/.exec(base);
    const subtaskId = mm?.[1] ? mm[1].padStart(2, "0") : "01";
    const ymlPath = join2(statusDir, `${base}.status.yml`);
    const mdPath = join2(statusDir, `${base}.status.md`);
    let doc = null;
    if (!existsSync2(ymlPath)) {
      const subtaskMd = readFileSync2(subtaskPath, "utf-8");
      doc = buildScaffoldDoc(subtaskMd, subtaskId);
      writeYml(ymlPath, doc);
    } else {
      doc = readYml(ymlPath);
    }
    const ymlStat = statSync2(ymlPath);
    const shouldRenderMd = !existsSync2(mdPath) || statSync2(mdPath).mtimeMs <= ymlStat.mtimeMs;
    if (shouldRenderMd) {
      doc = readYml(ymlPath);
      writePathAtomic(mdPath, renderMdFromDoc(doc));
    }
  }
}
function validateSpecStatusDir(specDir) {
  const statusDir = join2(resolve(specDir), "status");
  if (!existsSync2(statusDir)) {
    console.error(`validate: missing status directory: ${statusDir}`);
    return false;
  }
  let ok = true;
  const ymlFiles = readdirSync(statusDir).filter((f) => f.endsWith(".status.yml")).sort();
  if (ymlFiles.length === 0) {
    console.error(`validate: no *.status.yml under ${statusDir}`);
    ok = false;
  }
  for (const f of ymlFiles) {
    const p = join2(statusDir, f);
    try {
      readYml(p);
    } catch (e) {
      ok = false;
      console.error(`validate: FAIL ${p}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return ok;
}
function readFlag(argv, name) {
  const i = argv.indexOf(name);
  if (i === -1 || i + 1 >= argv.length) return void 0;
  return argv[i + 1];
}
function readFlags(argv, name) {
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === name && i + 1 < argv.length) out.push(argv[i + 1]);
  }
  return out;
}
var TERMINAL = ["completed", "blocked", "failed"];
function pairedStatusMdFromYml(ymlPath) {
  if (ymlPath.endsWith(".status.yml")) {
    return ymlPath.slice(0, -".status.yml".length) + ".status.md";
  }
  return `${ymlPath}.status.md`;
}
function parseArtifactArg(raw) {
  const m = raw.match(/^(.+):(created|modified|deleted):([\s\S]*)$/);
  if (!m) {
    throw new Error(
      `invalid --artifact "${raw}": expected <path>:(created|modified|deleted):<note>`
    );
  }
  const note = m[3].length > 0 ? m[3] : null;
  return { path: m[1], kind: m[2], note };
}
function parseErrorArg(raw, atIso) {
  const m = raw.match(/^(info|warn|error):([\s\S]+)$/);
  if (!m) {
    throw new Error(`invalid --error "${raw}": expected <severity>:<message>`);
  }
  return { severity: m[1], at: atIso, message: m[2].trim() };
}
function applyHeartbeat(args) {
  const doc = structuredClone(args.doc);
  doc.last_heartbeat = args.nowIso;
  for (const id of args.tickIds ?? []) {
    const item = doc.checklist.find((c) => c.id === id);
    if (!item) {
      throw new Error(
        `unknown checklist id "${id}"; known: ${doc.checklist.map((c) => c.id).join(", ") || "(none)"}`
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
  if (args.state !== void 0) {
    const ALLOWED = [
      "pending",
      "in_progress",
      "blocked",
      "completed",
      "failed"
    ];
    if (!ALLOWED.includes(args.state)) {
      throw new Error(`invalid --state: ${args.state}`);
    }
    if (args.state === "completed") {
      const open = doc.checklist.filter((c) => !c.done);
      if (open.length > 0) {
        throw new Error(
          `cannot set state to completed while checklist items are open: ${open.map((c) => c.id).join(", ")} \u2014 tick remaining items first`
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
  if (doc.state === "in_progress" && (doc.started_at === void 0 || doc.started_at === "")) {
    doc.started_at = args.nowIso;
  }
  validateSubtaskStatus(doc);
  return doc;
}
function heartbeatPaths(inYml, argvSlice) {
  const ymlPath = resolve(inYml);
  let doc = readYml(ymlPath);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const stateRaw = readFlag(argvSlice, "--state");
  const state = stateRaw;
  const tickIds = readFlags(argvSlice, "--tick");
  const artifacts = readFlags(argvSlice, "--artifact");
  const errors = readFlags(argvSlice, "--error");
  doc = applyHeartbeat({
    doc,
    nowIso,
    state,
    tickIds: tickIds.length > 0 ? tickIds : void 0,
    artifacts: artifacts.length > 0 ? artifacts : void 0,
    errors: errors.length > 0 ? errors : void 0
  });
  writeYml(ymlPath, doc);
  const mdPath = pairedStatusMdFromYml(ymlPath);
  writePathAtomic(mdPath, renderMdFromDoc(doc));
}
function usage() {
  return `Usage:
  spec-status-roundtrip md-from-yml --in <file.status.yml> --out <file.status.md>
  spec-status-roundtrip yml-from-md --in <file.status.md> --out <file.status.yml>
  spec-status-roundtrip scaffold --spec-dir <spec-directory>
  spec-status-roundtrip validate --spec-dir <spec-directory>
  spec-status-roundtrip heartbeat --in <file.status.yml> [--state <state>] [--tick <checklistId>] [--artifact <path>:(created|modified|deleted):<note>] [--error <severity>:<message>]
`;
}
function cliArgs() {
  const raw = process.argv.slice(2);
  if (raw[0] === "--") return raw.slice(1);
  return raw;
}
function main() {
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
    throw new Error(`Unknown command: ${cmd}
${usage()}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(msg);
    return 1;
  }
}
function executedAsCliEntry() {
  const a = process.argv[1];
  if (!a) return false;
  try {
    if (import.meta.url !== pathToFileURL(resolve(a)).href) return false;
    return basename(a).startsWith("spec-status-roundtrip");
  } catch {
    return false;
  }
}
if (executedAsCliEntry()) {
  process.exitCode = main();
}

// src/onstop-check.ts
var req2 = createRequire2(import.meta.url);
var ajvExported2 = req2("ajv");
var AjvCtor2 = typeof ajvExported2 === "function" ? ajvExported2 : ajvExported2.default;
var addFormatsExported2 = req2("ajv-formats");
var addFormatsFn2 = typeof addFormatsExported2 === "function" ? addFormatsExported2 : addFormatsExported2.default;
var PLUGIN_ROOT2 = resolve2(import.meta.dirname, "..");
var SPEC_STATUS_SCHEMA_PATH = join3(
  PLUGIN_ROOT2,
  "templates/schema/spec-status.schema.json"
);
var CONFIG_SCHEMA_PATH = join3(
  PLUGIN_ROOT2,
  "templates/schema/config.schema.json"
);
var _specStatusValidator;
var _configValidator;
function specStatusValidator() {
  if (_specStatusValidator === void 0) {
    const raw = JSON.parse(readFileSync3(SPEC_STATUS_SCHEMA_PATH, "utf-8"));
    const ajv2 = new AjvCtor2({ allErrors: true, strict: false });
    addFormatsFn2(ajv2);
    _specStatusValidator = ajv2.compile(raw);
  }
  return _specStatusValidator;
}
function configValidator() {
  if (_configValidator === void 0) {
    const raw = JSON.parse(readFileSync3(CONFIG_SCHEMA_PATH, "utf-8"));
    const ajv2 = new AjvCtor2({
      allErrors: true,
      strict: false,
      useDefaults: true
    });
    addFormatsFn2(ajv2);
    _configValidator = ajv2.compile(raw);
  }
  return _configValidator;
}
var STATUS_YML_RE = /^subtask-(\d{2})-.+\.status\.yml$/;
var UNCHECKED_BOX_RE = /^\s*-\s*\[\s\]\s+\*\*(D\d+)\*\*/gm;
function emptyResult() {
  return { checked: 0, fixes: [], issues: [], hasCritical: false };
}
function mergeResult(target, source) {
  target.checked += source.checked;
  target.fixes.push(...source.fixes);
  target.issues.push(...source.issues);
  if (source.hasCritical) target.hasCritical = true;
}
function pairedMdPath(ymlPath) {
  return ymlPath.endsWith(".status.yml") ? ymlPath.slice(0, -".status.yml".length) + ".status.md" : `${ymlPath}.status.md`;
}
function uncheckedMdBoxIds(md) {
  const out = [];
  for (const m of md.matchAll(UNCHECKED_BOX_RE)) {
    if (m[1]) out.push(m[1]);
  }
  return out;
}
function checklistMismatches(ymlItems, mdItems) {
  const mdMap = new Map(mdItems.map((i) => [i.id, i.done]));
  const out = [];
  for (const y of ymlItems) {
    const mdDone = mdMap.get(y.id);
    if (mdDone === void 0) continue;
    if (mdDone !== y.done) out.push(y.id);
  }
  return out;
}
function checkSubtaskPair(ymlPath, opts) {
  const result = emptyResult();
  result.checked = 1;
  let doc;
  try {
    doc = readYml(ymlPath);
  } catch (e) {
    result.issues.push({
      severity: "critical",
      kind: "schema_invalid_yml",
      path: ymlPath,
      message: `subtask status yml failed schema validation: ${e instanceof Error ? e.message : String(e)}`
    });
    result.hasCritical = true;
    return result;
  }
  if (doc.state === "completed" && doc.checklist.some((c) => !c.done)) {
    const open = doc.checklist.filter((c) => !c.done).map((c) => c.id);
    result.issues.push({
      severity: "critical",
      kind: "completed_with_open_items",
      path: ymlPath,
      message: `state: completed but checklist items still open: ${open.join(", ")}`
    });
    result.hasCritical = true;
  }
  const judgeRaw = doc.extra?.judge;
  if (judgeRaw && typeof judgeRaw.verdict === "string" && judgeRaw.verdict === "verified" && doc.checklist.some((c) => !c.done)) {
    const open = doc.checklist.filter((c) => !c.done).map((c) => c.id);
    result.issues.push({
      severity: "critical",
      kind: "verified_with_open_items",
      path: ymlPath,
      message: `extra.judge.verdict: verified but checklist items still open: ${open.join(", ")}`
    });
    result.hasCritical = true;
  }
  const mdPath = pairedMdPath(ymlPath);
  if (!existsSync3(mdPath)) {
    if (opts.writeFixes) {
      try {
        mdFromYmlPaths(ymlPath, mdPath);
        result.fixes.push({
          kind: "rerendered_md_from_yml",
          path: mdPath,
          message: `created missing .status.md from .status.yml`
        });
      } catch (e) {
        result.issues.push({
          severity: "warn",
          kind: "md_render_failed",
          path: mdPath,
          message: `failed to render missing .status.md: ${e instanceof Error ? e.message : String(e)}`
        });
      }
    } else {
      result.issues.push({
        severity: "warn",
        kind: "md_missing",
        path: mdPath,
        message: `paired .status.md is missing (would re-render from yml)`
      });
    }
    return result;
  }
  const mdSrc = readFileSync3(mdPath, "utf-8");
  let mdItems = [];
  let mdParseFailed = false;
  try {
    const mdDoc = statusFromMarkedMd(mdSrc);
    mdItems = mdDoc.checklist;
  } catch (e) {
    mdParseFailed = true;
    result.issues.push({
      severity: "warn",
      kind: "md_malformed",
      path: mdPath,
      message: `paired .status.md could not be parsed: ${e instanceof Error ? e.message : String(e)}`
    });
  }
  const regexUnchecked = new Set(uncheckedMdBoxIds(mdSrc));
  const mismatches = mdParseFailed ? [] : checklistMismatches(doc.checklist, mdItems);
  const regexInconsistent = [];
  for (const item of doc.checklist) {
    if (item.done && regexUnchecked.has(item.id)) {
      regexInconsistent.push(item.id);
    }
  }
  const needsRerender = mdParseFailed || mismatches.length > 0 || regexInconsistent.length > 0;
  if (needsRerender) {
    if (opts.writeFixes) {
      try {
        mdFromYmlPaths(ymlPath, mdPath);
        const detail = [];
        if (mismatches.length > 0) detail.push(`mismatched ids: ${mismatches.join(", ")}`);
        if (regexInconsistent.length > 0)
          detail.push(`md unchecked but yml done: ${regexInconsistent.join(", ")}`);
        if (mdParseFailed) detail.push("md was malformed");
        result.fixes.push({
          kind: "rerendered_md_from_yml",
          path: mdPath,
          message: detail.length > 0 ? `re-rendered .status.md from .status.yml (${detail.join("; ")})` : `re-rendered .status.md from .status.yml`
        });
      } catch (e) {
        result.issues.push({
          severity: "warn",
          kind: "md_render_failed",
          path: mdPath,
          message: `failed to re-render .status.md: ${e instanceof Error ? e.message : String(e)}`
        });
      }
    } else {
      result.issues.push({
        severity: "warn",
        kind: "md_yml_mismatch",
        path: mdPath,
        message: mismatches.length > 0 || regexInconsistent.length > 0 ? `md/yml checklist mismatch (yml is authoritative; would re-render md)` : `md is malformed (would re-render from yml)`
      });
    }
  }
  return result;
}
function listSubtaskYmls(statusDir) {
  if (!existsSync3(statusDir)) return [];
  return readdirSync2(statusDir).filter((n) => STATUS_YML_RE.test(n)).map((n) => join3(statusDir, n)).sort();
}
function checkSpecDir(specDir, opts) {
  const result = emptyResult();
  const abs = resolve2(specDir);
  const statusDir = join3(abs, "status");
  const ymls = listSubtaskYmls(statusDir);
  if (ymls.length === 0) {
    return result;
  }
  for (const ymlPath of ymls) {
    mergeResult(result, checkSubtaskPair(ymlPath, opts));
  }
  const specStatusYml = join3(abs, "status.yml");
  if (existsSync3(specStatusYml)) {
    result.checked += 1;
    try {
      const raw = readFileSync3(specStatusYml, "utf-8");
      const data = YAML3.parse(raw);
      const v = specStatusValidator();
      if (!v(data)) {
        result.issues.push({
          severity: "warn",
          kind: "schema_invalid_spec_status",
          path: specStatusYml,
          message: `spec-root status.yml failed schema validation: ${JSON.stringify(v.errors)}`
        });
      }
    } catch (e) {
      result.issues.push({
        severity: "warn",
        kind: "schema_invalid_spec_status",
        path: specStatusYml,
        message: `spec-root status.yml could not be parsed: ${e instanceof Error ? e.message : String(e)}`
      });
    }
  }
  return result;
}
function listSpecDirs(specsDirAbs) {
  if (!existsSync3(specsDirAbs)) return [];
  const out = [];
  for (const entry of readdirSync2(specsDirAbs)) {
    const candidate = join3(specsDirAbs, entry);
    let isDir = false;
    try {
      isDir = statSync3(candidate).isDirectory();
    } catch {
      isDir = false;
    }
    if (!isDir) continue;
    if (existsSync3(join3(candidate, "status"))) {
      out.push(candidate);
    }
  }
  return out.sort();
}
function checkConfigFile(repoRoot) {
  const result = emptyResult();
  const path = configPathForRepo(repoRoot);
  if (!existsSync3(path)) return result;
  result.checked = 1;
  try {
    const raw = readFileSync3(path, "utf-8");
    const data = YAML3.parse(raw);
    const v = configValidator();
    const draft = data ?? {};
    if (!v(draft)) {
      result.issues.push({
        severity: "critical",
        kind: "schema_invalid_config",
        path,
        message: `.zoto/spec-system/config.yml failed schema validation: ${JSON.stringify(v.errors)}`
      });
      result.hasCritical = true;
    }
  } catch (e) {
    result.issues.push({
      severity: "critical",
      kind: "schema_invalid_config",
      path,
      message: `.zoto/spec-system/config.yml could not be parsed: ${e instanceof Error ? e.message : String(e)}`
    });
    result.hasCritical = true;
  }
  return result;
}
function checkAllSpecs(opts) {
  const writeFixes = opts.writeFixes !== false;
  const result = emptyResult();
  const repoRoot = resolve2(opts.repoRoot);
  mergeResult(result, checkConfigFile(repoRoot));
  let cfg;
  try {
    cfg = loadConfig(repoRoot).config;
  } catch {
    cfg = void 0;
  }
  const specsRel = cfg?.specsDir ?? "specs";
  const specsDirAbs = resolve2(repoRoot, specsRel);
  const specDirs = opts.specDir ? [resolve2(opts.specDir)] : listSpecDirs(specsDirAbs);
  for (const specDir of specDirs) {
    mergeResult(result, checkSpecDir(specDir, { writeFixes }));
  }
  return result;
}

// hooks/zoto-onstop-check.ts
function emit(output) {
  process.stdout.write(`${JSON.stringify(output)}
`);
}
function consumeStdin() {
  try {
    readFileSync4(0, "utf-8");
  } catch {
  }
}
function main2() {
  consumeStdin();
  const repoRoot = resolve3(process.cwd());
  const hasConfig = existsSync4(resolve3(repoRoot, ".zoto", "spec-system", "config.yml"));
  const hasSpecsRoot = existsSync4(resolve3(repoRoot, "specs"));
  if (!hasConfig && !hasSpecsRoot) {
    emit({});
    return;
  }
  let result;
  try {
    result = checkAllSpecs({ repoRoot, writeFixes: true });
  } catch {
    emit({});
    return;
  }
  if (result.checked === 0) {
    emit({});
    return;
  }
  const critical = result.issues.filter((i) => i.severity === "critical");
  const warn = result.issues.filter((i) => i.severity === "warn");
  if (result.fixes.length === 0 && critical.length === 0 && warn.length === 0) {
    emit({});
    return;
  }
  const lines = [];
  lines.push("Spec System onStop check:");
  if (result.fixes.length > 0) {
    lines.push(`- Auto-fixed ${result.fixes.length} status-pair inconsistency(ies):`);
    for (const f of result.fixes.slice(0, 10)) {
      lines.push(`  \u2022 [${f.kind}] ${f.path}`);
    }
    if (result.fixes.length > 10) {
      lines.push(`  \u2022 ... and ${result.fixes.length - 10} more`);
    }
  }
  if (critical.length > 0) {
    lines.push(`- ${critical.length} CRITICAL issue(s) require attention:`);
    for (const i of critical.slice(0, 10)) {
      lines.push(`  \u2022 [${i.kind}] ${i.path}: ${i.message}`);
    }
    if (critical.length > 10) {
      lines.push(`  \u2022 ... and ${critical.length - 10} more`);
    }
  }
  if (warn.length > 0 && critical.length === 0) {
    lines.push(`- ${warn.length} warning(s):`);
    for (const i of warn.slice(0, 5)) {
      lines.push(`  \u2022 [${i.kind}] ${i.path}: ${i.message}`);
    }
    if (warn.length > 5) {
      lines.push(`  \u2022 ... and ${warn.length - 5} more`);
    }
  }
  emit({ additional_context: lines.join("\n") });
}
main2();
