import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv, type ValidateFunction } from "ajv";
import addFormatsImport from "ajv-formats";
import YAML from "yaml";

import type { SpecSystemConfig } from "./config-loader.js";
import {
  applyDependencyGraphColors,
  statesFromSubtaskRows,
  type SubtaskState,
} from "./dependency-graph-colors.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUBTASK_SCHEMA_PATH = join(__dirname, "..", "templates", "schema", "subtask-status.schema.json");
const SPEC_STATUS_SCHEMA_PATH = join(__dirname, "..", "templates", "schema", "spec-status.schema.json");
const SPEC_STATUS_MD_TMPL = join(__dirname, "..", "templates", "status", "spec-status.md.tmpl");

const ajv = new Ajv({ allErrors: true, strict: false });
const addFormats = addFormatsImport as unknown as (a: InstanceType<typeof Ajv>) => void;
addFormats(ajv);

const validateSubtaskDoc: ValidateFunction = ajv.compile(
  JSON.parse(readFileSync(SUBTASK_SCHEMA_PATH, "utf-8")) as object,
);
const validateSpecRootDoc: ValidateFunction = ajv.compile(
  JSON.parse(readFileSync(SPEC_STATUS_SCHEMA_PATH, "utf-8")) as object,
);

export interface AggregateInput {
  specDir: string;
  config: SpecSystemConfig;
  repoRoot: string;
  nowIso?: string;
  /** When true, validate and compute output but do not write spec-root files (CI gate). */
  dryRun?: boolean;
  /** Appended to `config_reloaded` on this rebuild when the loader saw a new mtime. */
  configReloadAudit?: { at: string; mtime: string };
  /** Additional audit rows (e.g. `config_reload_failed` from the standalone CLI). */
  extraAuditEvents?: SpecRootDoc["events"];
}

export interface AggregateResult {
  statusYmlPath: string;
  statusMdPath: string;
  rebuilt: boolean;
  sourceCount: number;
  digest: string;
  /** Repo-relative paths of `.status.yml` sources that failed parse/validation; empty when all valid. */
  invalidSourcePaths: string[];
}

export interface WatchOptions extends AggregateInput {
  onTick?: (r: AggregateResult) => void;
  signal?: AbortSignal;
}

export interface SpecRootDoc {
  schema_version: 1;
  spec_id: string;
  phase: number;
  aggregate_state: "pending" | "in_progress" | "blocked" | "failed" | "completed";
  started_at?: string;
  updated_at: string;
  aggregate_progress: {
    total: number;
    completed: number;
    in_progress: number;
    blocked: number;
    failed: number;
  };
  subtasks: Array<{
    subtask_id: string;
    state: "pending" | "in_progress" | "blocked" | "completed" | "failed";
    status_path: string;
    last_heartbeat: string | null;
  }>;
  blockers: Array<{ subtask_id: string; reason: string; path: string }>;
  definition_of_done_status: Array<{ id: string; text: string; done: boolean }>;
  config_reloaded: Array<{ at: string; mtime: string }>;
  events: Array<{ at: string; kind: string; message: string }>;
  extra: Record<string, unknown>;
}

interface ValidSource {
  absPath: string;
  relRepoPath: string;
  lastModifiedMs: number;
  doc: {
    subtask_id: string;
    state: SpecRootDoc["subtasks"][0]["state"];
    last_heartbeat?: string;
    errors?: Array<{ message: string }>;
    notes?: string;
  };
}

function normalizePathKey(p: string): string {
  return p.split("\\").join("/");
}

/** Live-reloadable subset hashed into the digest (see docs / subtask contract). */
export function configSubsetForDigest(cfg: SpecSystemConfig): unknown {
  return {
    subagents: cfg.subagents,
    aggregator: cfg.aggregator,
    spec_parallel_limit: cfg.spec.parallelLimit,
  };
}

function sha256Utf8(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

/**
 * Digest subtask/index sources by path + utf-8 contents so spec-root rebuilds
 * track live subagent status edits even when file mtimes are unchanged.
 */
function computeDigest(
  sourceEntries: Array<{ relPath: string; contentSha256: string }>,
  cfg: SpecSystemConfig,
): string {
  const sorted = [...sourceEntries].sort((a, b) => a.relPath.localeCompare(b.relPath));
  const h = createHash("sha256");
  for (const e of sorted) {
    h.update(e.relPath);
    h.update("\0");
    h.update(e.contentSha256);
    h.update("\0");
  }
  h.update(JSON.stringify(configSubsetForDigest(cfg)));
  return h.digest("hex");
}

function findSpecIndexMd(specDir: string): string | null {
  if (!existsSync(specDir)) return null;
  const files = readdirSync(specDir);
  const candidates = files.filter((f) => f.startsWith("spec-") && f.endsWith(".md")).sort();
  if (candidates.length === 0) return null;
  return join(specDir, candidates[0]!);
}

export function parseDefinitionOfDoneFromIndex(markdown: string): Array<{ text: string; done: boolean }> {
  const lines = markdown.split(/\r?\n/);
  let i = lines.findIndex((l) => /^##\s+Definition of Done\s*$/i.test(l.trim()));
  if (i < 0) return [];
  i += 1;
  const items: Array<{ text: string; done: boolean }> = [];
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^##\s+/.test(line)) break;
    const m = /^(\s*[-*]\s*)\[( |x|X)\]\s+(.+)$/.exec(line);
    if (m) {
      const done = m[2]!.toLowerCase() === "x";
      const text = m[3]!.trim();
      if (text.length > 0) items.push({ text, done });
    }
  }
  return items;
}

function rollupAggregateState(sources: ValidSource[]): SpecRootDoc["aggregate_state"] {
  const states = sources.map((s) => s.doc.state);
  if (states.includes("failed")) return "failed";
  if (states.includes("blocked")) return "blocked";
  if (states.includes("in_progress")) return "in_progress";
  if (sources.length > 0 && states.every((st) => st === "completed")) return "completed";
  return "pending";
}

function heartbeatToMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function buildBlockers(sources: ValidSource[], repoRoot: string): SpecRootDoc["blockers"] {
  const blocked = sources.filter((s) => s.doc.state === "blocked" || s.doc.state === "failed");
  blocked.sort((a, b) => heartbeatToMs(b.doc.last_heartbeat) - heartbeatToMs(a.doc.last_heartbeat));
  return blocked.map((s) => {
    const errMsg = s.doc.errors?.[0]?.message;
    const reason =
      errMsg ??
      (s.doc.state === "failed" ? "Subtask state is failed" : "Subtask state is blocked");
    const mdAbs = s.absPath.replace(/\.status\.yml$/i, ".status.md");
    return {
      subtask_id: s.doc.subtask_id,
      reason,
      path: normalizePathKey(relative(repoRoot, mdAbs)),
    };
  });
}

function countProgress(sources: ValidSource[]): SpecRootDoc["aggregate_progress"] {
  let completed = 0;
  let in_progress = 0;
  let blocked = 0;
  let failed = 0;
  for (const s of sources) {
    switch (s.doc.state) {
      case "completed":
        completed += 1;
        break;
      case "in_progress":
        in_progress += 1;
        break;
      case "blocked":
        blocked += 1;
        break;
      case "failed":
        failed += 1;
        break;
      default:
        break;
    }
  }
  return {
    total: sources.length,
    completed,
    in_progress,
    blocked,
    failed,
  };
}

function appendEvents(
  previous: SpecRootDoc["events"],
  additions: SpecRootDoc["events"],
  cap: number,
): SpecRootDoc["events"] {
  const merged = [...previous, ...additions];
  if (merged.length <= cap) return merged;
  return merged.slice(-cap);
}

function readExistingSpecRoot(ymlPath: string): Partial<SpecRootDoc> | null {
  if (!existsSync(ymlPath)) return null;
  try {
    const raw = YAML.parse(readFileSync(ymlPath, "utf-8"));
    if (validateSpecRootDoc(raw)) {
      return raw as SpecRootDoc;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function renderConfigReloadMd(entries: SpecRootDoc["config_reloaded"]): string {
  if (entries.length === 0) return "_None._";
  return entries.map((e) => `- **${e.at}** — config mtime observed **${e.mtime}**`).join("\n");
}

function renderProgressMd(p: SpecRootDoc["aggregate_progress"]): string {
  return [
    "| Metric | Count |",
    "|--------|-------|",
    "| Total | " + p.total + " |",
    "| Completed | " + p.completed + " |",
    "| In progress | " + p.in_progress + " |",
    "| Blocked | " + p.blocked + " |",
    "| Failed | " + p.failed + " |",
  ].join("\n");
}

function renderSubtasksMd(rows: SpecRootDoc["subtasks"]): string {
  if (rows.length === 0) return "_No subtask sources scanned._";
  const lines = [
    "| Subtask | State | Status (yml) | Last heartbeat |",
    "|---------|-------|--------------|----------------|",
  ];
  for (const r of rows) {
    const hp = r.status_path;
    lines.push(
      `| ${r.subtask_id} | ${r.state} | \`${hp}\` | ${r.last_heartbeat ?? "—"} |`,
    );
  }
  return lines.join("\n");
}

function renderBlockersMdRepo(rows: SpecRootDoc["blockers"]): string {
  if (rows.length === 0) return "_None._";
  return rows.map((b) => `- **${b.subtask_id}** — ${b.reason} — \`${b.path}\``).join("\n");
}

function renderDefinitionMd(items: SpecRootDoc["definition_of_done_status"]): string {
  if (items.length === 0) return "_None._";
  return items
    .map((d) => {
      const box = d.done ? "[x]" : "[ ]";
      return `- ${box} **${d.id}** — ${d.text}`;
    })
    .join("\n");
}

function renderEventsMd(events: SpecRootDoc["events"]): string {
  if (events.length === 0) return "_None._";
  return events
    .map((e) => `- **${e.at}** \`${e.kind}\` — ${e.message}`)
    .join("\n");
}

function renderSpecStatusMarkdown(doc: SpecRootDoc): string {
  const tmpl = readFileSync(SPEC_STATUS_MD_TMPL, "utf-8");
  const started = doc.started_at ?? "—";
  const map: Record<string, string> = {
    spec_id: doc.spec_id,
    phase: String(doc.phase),
    aggregate_state: doc.aggregate_state,
    started_at: started,
    updated_at: doc.updated_at,
    config_reloaded_md: renderConfigReloadMd(doc.config_reloaded),
    aggregate_progress_md: renderProgressMd(doc.aggregate_progress),
    subtasks_md: renderSubtasksMd(doc.subtasks),
    blockers_md: renderBlockersMdRepo(doc.blockers),
    definition_of_done_md: renderDefinitionMd(doc.definition_of_done_status),
    events_md: renderEventsMd(doc.events),
  };
  return tmpl.replace(/\{\{(\w+)\}\}/g, (_, key: string) => map[key] ?? "");
}

function writeAtomic(filePath: string, content: string): void {
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, content, "utf-8");
  renameSync(tmp, filePath);
}

export function aggregateOnce(input: AggregateInput): AggregateResult {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const specDir = input.specDir;
  const cfg = input.config;
  const repoRoot = input.repoRoot;
  const statusDir = join(specDir, "status");
  const outYml = join(specDir, cfg.aggregator.outputs.specStatusYml);
  const outMd = join(specDir, cfg.aggregator.outputs.specStatusMd);
  const specId = basename(specDir);

  const digestEntries: Array<{ relPath: string; contentSha256: string }> = [];
  const invalidSourcePaths: string[] = [];
  const warnEvents: SpecRootDoc["events"] = [];
  const validSources: ValidSource[] = [];

  if (existsSync(statusDir)) {
    const names = readdirSync(statusDir).filter((f) => f.endsWith(".status.yml"));
    for (const n of names) {
      const abs = join(statusDir, n);
      let st: ReturnType<typeof statSync>;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      const rel = normalizePathKey(relative(repoRoot, abs));
      const rawText = readFileSync(abs, "utf-8");
      digestEntries.push({ relPath: rel, contentSha256: sha256Utf8(rawText) });
      let data: unknown;
      try {
        data = YAML.parse(rawText);
      } catch (e) {
        invalidSourcePaths.push(rel);
        warnEvents.push({
          at: nowIso,
          kind: "source_validation_warn",
          message: `YAML parse failed for ${rel}: ${e instanceof Error ? e.message : String(e)}`,
        });
        continue;
      }
      if (!validateSubtaskDoc(data)) {
        invalidSourcePaths.push(rel);
        warnEvents.push({
          at: nowIso,
          kind: "source_validation_warn",
          message: `Schema validation failed for ${rel}`,
        });
        continue;
      }
      const d = data as ValidSource["doc"];
      validSources.push({
        absPath: abs,
        relRepoPath: rel,
        lastModifiedMs: st.mtimeMs,
        doc: d,
      });
    }
  }

  const indexPath = findSpecIndexMd(specDir);
  let indexMarkdown: string | undefined;
  if (indexPath && existsSync(indexPath)) {
    try {
      indexMarkdown = readFileSync(indexPath, "utf-8");
      const indexRel = normalizePathKey(relative(repoRoot, indexPath));
      digestEntries.push({ relPath: indexRel, contentSha256: sha256Utf8(indexMarkdown) });
    } catch {
      /* read failure is non-fatal for digest */
    }
  }

  const digest = computeDigest(digestEntries, cfg);
  const existing = readExistingSpecRoot(outYml);
  const forceAudit =
    input.configReloadAudit !== undefined || (input.extraAuditEvents?.length ?? 0) > 0;
  const digestChanged = existing?.extra?.aggregator_digest !== digest;
  const wouldRebuild = digestChanged || !existsSync(outYml) || forceAudit;

  if (!input.dryRun && existsSync(outYml) && !digestChanged && !forceAudit) {
    // Spec-root pair is up-to-date, but the spec index dependency graph
    // colours might still be stale (e.g. on a cold start where status YAMLs
    // pre-date the colouring feature). The op is idempotent and only writes
    // when the rendered markdown actually changes.
    maybeColorSpecIndex(specDir, validSources);
    return {
      statusYmlPath: outYml,
      statusMdPath: outMd,
      rebuilt: false,
      sourceCount: validSources.length,
      digest,
      invalidSourcePaths,
    };
  }

  let dodItems: Array<{ text: string; done: boolean }> = [];
  if (indexMarkdown !== undefined) {
    dodItems = parseDefinitionOfDoneFromIndex(indexMarkdown);
  } else if (indexPath && existsSync(indexPath)) {
    dodItems = parseDefinitionOfDoneFromIndex(readFileSync(indexPath, "utf-8"));
  }
  const definition_of_done_status = dodItems.map((item, idx) => ({
    id: `DOD${String(idx + 1).padStart(2, "0")}`,
    text: item.text,
    done: item.done,
  }));

  validSources.sort((a, b) => a.doc.subtask_id.localeCompare(b.doc.subtask_id));

  const subtasks: SpecRootDoc["subtasks"] = validSources.map((s) => ({
    subtask_id: s.doc.subtask_id,
    state: s.doc.state,
    status_path: normalizePathKey(relative(repoRoot, s.absPath)),
    last_heartbeat: s.doc.last_heartbeat ?? null,
  }));

  const aggregate_progress = countProgress(validSources);
  const blockers = buildBlockers(validSources, repoRoot);
  const aggregate_state = rollupAggregateState(validSources);

  const previousEvents = existing?.events ?? [];
  const previousConfigReload = existing?.config_reloaded ?? [];

  const auditReloadEvents: SpecRootDoc["events"] = [];
  if (input.configReloadAudit) {
    auditReloadEvents.push({
      at: nowIso,
      kind: "config_reloaded",
      message: `Config mtime reload recorded at ${input.configReloadAudit.mtime}`,
    });
  }
  const newEvents: SpecRootDoc["events"] = [
    ...warnEvents,
    ...auditReloadEvents,
    ...(input.extraAuditEvents ?? []),
  ];
  let configReloadMerged = [...previousConfigReload];
  if (input.configReloadAudit) {
    configReloadMerged = [...configReloadMerged, input.configReloadAudit];
  }

  let events = appendEvents(previousEvents, newEvents, 100);

  if (wouldRebuild && !input.dryRun) {
    const rebuildStamp: SpecRootDoc["events"] = [
      { at: nowIso, kind: "rebuild", message: `Aggregated ${validSources.length} subtask source(s); digest ${digest.slice(0, 8)}…` },
    ];
    events = appendEvents(events, rebuildStamp, 100);
  }

  const phase = existing?.phase ?? 0;
  const started_at = existing?.started_at ?? (!existsSync(outYml) ? nowIso : existing?.started_at);

  const doc: SpecRootDoc = {
    schema_version: 1,
    spec_id: specId,
    phase,
    aggregate_state,
    started_at,
    updated_at: nowIso,
    aggregate_progress,
    subtasks,
    blockers,
    definition_of_done_status,
    config_reloaded: configReloadMerged,
    events,
    extra: {
      ...(existing?.extra ?? {}),
      aggregator_digest: digest,
    },
  };

  const draft = { ...doc } as unknown as Record<string, unknown>;
  if (!validateSpecRootDoc(draft)) {
    throw new Error(
      `spec-root schema validation failed after build: ${JSON.stringify(validateSpecRootDoc.errors, null, 2)}`,
    );
  }

  const md = renderSpecStatusMarkdown(doc);
  const ymlText = YAML.stringify(doc, { lineWidth: 0 });

  let rebuilt = false;
  if (!input.dryRun && wouldRebuild) {
    writeAtomic(outYml, ymlText);
    writeAtomic(outMd, md);
    rebuilt = true;
  }

  // Auto-color the spec index dependency graph based on subtask states.
  // Runs on every aggregator tick (independent of wouldRebuild) so that
  // colouring catches up even when the spec-root digest is unchanged.
  // No-op when the index is missing, has no mermaid block, or no graph
  // node maps to a known subtask. Idempotent — only writes when the
  // rendered markdown actually changes.
  if (!input.dryRun) {
    maybeColorSpecIndex(specDir, validSources);
  }

  return {
    statusYmlPath: outYml,
    statusMdPath: outMd,
    rebuilt,
    sourceCount: validSources.length,
    digest,
    invalidSourcePaths,
  };
}

function maybeColorSpecIndex(specDir: string, validSources: ValidSource[]): void {
  const indexPath = findSpecIndexMd(specDir);
  if (!indexPath || !existsSync(indexPath)) return;
  try {
    const before = readFileSync(indexPath, "utf-8");
    const rows: Array<{ subtask_id: string; state: SubtaskState }> = validSources.map((s) => ({
      subtask_id: s.doc.subtask_id,
      state: s.doc.state,
    }));
    const states = statesFromSubtaskRows(rows);
    const after = applyDependencyGraphColors(before, states);
    if (after !== before) {
      writeAtomic(indexPath, after);
    }
  } catch {
    /* spec index update is best-effort; never block aggregation */
  }
}

/**
 * In-process watch: polls `aggregateOnce` on a trailing-debounced schedule.
 * Uses `opts.config` as-is (no config reload). Prefer the standalone CLI for long-running `--watch` with `loadConfig`.
 */
export function watch(opts: WatchOptions): Promise<void> {
  const poll = opts.config.aggregator.pollIntervalMs;
  const debounceMs = opts.config.aggregator.debounceMs;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let intervalTimer: ReturnType<typeof setInterval> | undefined;

  const run = (): void => {
    try {
      const r = aggregateOnce(opts);
      opts.onTick?.(r);
    } catch (e) {
      console.error(e);
    }
  };

  const onSignal = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (intervalTimer) clearInterval(intervalTimer);
  };

  return new Promise((resolve) => {
    const schedule = (): void => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = undefined;
        run();
      }, debounceMs);
    };

    intervalTimer = setInterval(schedule, poll);
    schedule();
    opts.signal?.addEventListener("abort", () => {
      onSignal();
      resolve();
    });
  });
}
