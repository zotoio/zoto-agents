/**
 * Orchestrates process discovery, session-metadata parsing, log tailing, and
 * hierarchy building into a single {@link AgentSnapshot}.
 *
 * The collector is intentionally pure-ish: every external dependency
 * (process listing, filesystem, time source) can be injected so we can write
 * deterministic tests around the full pipeline.
 *
 * A persistent collector instance caches mtime/size-gated session files, log
 * tails, composer-model lookups, and slug→path maps between ticks. Fast
 * ticks stat transcripts and re-tail only changed logs; slow ticks (every
 * {@link DEFAULT_SLOW_LANE_EVERY} refreshes, plus tick 1) re-walk session
 * JSON, retry unresolved composer ids, and refresh slug maps. Transcript
 * roots are re-enumerated every tick; the fast lane scans for new transcript
 * files not yet in the meta cache so fresh chats appear on the next refresh.
 */

import { homedir, platform } from "node:os";
import { basename } from "node:path";
import type {
  AgentKind,
  AgentNode,
  AgentSnapshot,
  CollectorOptions,
  FsLike,
} from "../types.js";
import {
  defaultComposerModelRunner,
  readComposerData,
  type ComposerModelRunner,
} from "./composer-models.js";
import {
  readHookLogModels,
  type HookLogCacheEntry,
} from "./hook-log-models.js";
import { coalesceModelSlug, isPlaceholderModelSlug } from "./model-slug.js";
import { createSemaphore, type Semaphore } from "./concurrency.js";
import { realFs } from "./fs.js";
import { buildHierarchy } from "./hierarchy.js";
import { tailFile, tailJsonlMessages } from "./logs.js";
import { pushMissingSessionRootDiagnostic, resolveCursorPaths } from "./paths.js";
import {
  defaultPsRunner,
  discoverCursorProcesses,
  type ProcessRunner,
  type RawProcess,
} from "./processes.js";
import {
  discoverSessionJsonFiles,
  loadSessionFileRecords,
  mergeSessionRecords,
  readTranscriptRecords,
  transcriptRecordFromMeta,
  type SessionRecord,
  type TranscriptFileMeta,
} from "./sessions.js";
import {
  buildSlugPathMap,
  resolveRepoDisplayUrl,
  slugFromAbsolutePath,
  stripGitHubHost,
} from "./repo-url.js";
import { fetchCloudAgents, type CloudApiOptions } from "./cloud-api.js";

const DEFAULT_LOG_LINES = 3;
/** Slow-lane cadence: full session walk + root enumeration every N ticks. */
export const DEFAULT_SLOW_LANE_EVERY = 5;
const DEFAULT_FS_CONCURRENCY = 24;
const SLUG_MAP_TTL_MS = 60_000;

interface SessionFileCacheEntry {
  mtimeMs: number;
  size: number;
  records: SessionRecord[];
}

interface LogTailCacheEntry {
  mtimeMs: number;
  size: number;
  lines: string[];
}

interface RepoDisplayCacheEntry {
  mtimeMs: number;
  display: string | null;
}

function classifyProcess(p: RawProcess): { kind: AgentKind; label: string } {
  const cmd = p.command;
  if (/cursor-agent/i.test(cmd)) return { kind: "cli", label: "cursor-agent CLI" };
  if (/exec-daemon/i.test(cmd)) return { kind: "cloud", label: "Cloud Agent VM" };
  if (/Cursor Helper \(GPU\)/i.test(cmd)) return { kind: "ide", label: "Cursor GPU helper" };
  if (/Cursor Helper/i.test(cmd)) return { kind: "ide", label: "Cursor renderer" };
  if (/Cursor\.app|\/Cursor(\s|$|\.exe)/i.test(cmd)) {
    return { kind: "ide", label: "Cursor IDE" };
  }
  return { kind: "unknown", label: basename(cmd.split(/\s+/)[0] ?? "cursor") };
}

function nodeFromProcess(p: RawProcess): AgentNode {
  const { kind, label } = classifyProcess(p);
  return {
    id: `pid:${p.pid}`,
    parentId: null,
    kind,
    pid: p.pid,
    label,
    title: trimCommand(p.command),
    model: null,
    repo: null,
    startedAt: Date.now() - p.etimeSec * 1000,
    status: "running",
    recentLogs: [],
    logSource: null,
    tokenUsage: null,
  };
}

function trimCommand(cmd: string): string {
  const first = cmd.split(/\s+/)[0] ?? "";
  return basename(first) + (cmd.length > first.length ? " ..." : "");
}

function nodeFromSession(rec: SessionRecord): AgentNode {
  return {
    id: rec.id,
    parentId: rec.parentId,
    kind: rec.kind,
    pid: rec.pid,
    label: rec.label,
    title: rec.title,
    model: rec.model,
    repo: rec.repo,
    startedAt: rec.startedAt,
    elapsedEndAt: rec.elapsedEndAt ?? null,
    status: rec.status,
    recentLogs: [],
    logSource: rec.logPath,
    tokenUsage: null,
  };
}

function mergeSessionIntoProcess(into: AgentNode, from: AgentNode): void {
  into.label = from.label || into.label;
  into.title = from.title || into.title;
  into.model = coalesceModelSlug(into.model, from.model);
  into.repo = from.repo ?? into.repo;
  into.status = from.status !== "unknown" ? from.status : into.status;
  into.startedAt = from.startedAt || into.startedAt;
  if (from.elapsedEndAt != null) into.elapsedEndAt = from.elapsedEndAt;
  into.logSource = from.logSource ?? into.logSource;
  if (from.parentId) into.parentId = from.parentId;
}

function pathUnderRoots(path: string, roots: readonly string[]): boolean {
  for (const root of roots) {
    if (path === root || path.startsWith(`${root}/`)) return true;
  }
  return false;
}

async function readCachedSessionRecords(
  fs: FsLike,
  roots: string[],
  kind: AgentKind,
  diagnostics: string[],
  cache: Map<string, SessionFileCacheEntry>,
  slowLane: boolean,
  sem: Semaphore,
): Promise<SessionRecord[]> {
  for (const root of roots) {
    if (!(await fs.exists(root))) {
      pushMissingSessionRootDiagnostic(diagnostics, root, kind);
    }
  }

  if (!slowLane) {
    const cached: SessionRecord[] = [];
    for (const [path, entry] of cache) {
      if (pathUnderRoots(path, roots)) cached.push(...entry.records);
    }
    return mergeSessionRecords(cached);
  }

  const files = await discoverSessionJsonFiles(fs, roots);
  const seen = new Set<string>();
  const loaded: SessionRecord[] = [];

  await Promise.all(
    files.map((file) =>
      sem.run(async () => {
        seen.add(file);
        let st;
        try {
          st = await fs.stat(file);
        } catch {
          return;
        }
        if (!st.isFile()) return;
        const prev = cache.get(file);
        if (prev && prev.mtimeMs === st.mtimeMs && prev.size === st.size) {
          loaded.push(...prev.records);
          return;
        }
        const records = await loadSessionFileRecords(fs, file, kind, diagnostics);
        cache.set(file, { mtimeMs: st.mtimeMs, size: st.size, records });
        loaded.push(...records);
      }),
    ),
  );

  for (const path of cache.keys()) {
    if (pathUnderRoots(path, roots) && !seen.has(path)) cache.delete(path);
  }

  return mergeSessionRecords(loaded);
}

async function readCachedTranscriptRecords(
  fs: FsLike,
  roots: string[],
  diagnostics: string[],
  transcriptMaxAgeMs: number,
  now: number,
  metaCache: Map<string, TranscriptFileMeta>,
  slowLane: boolean,
  sem: Semaphore,
): Promise<SessionRecord[]> {
  if (slowLane || metaCache.size === 0) {
    const fresh = await readTranscriptRecords(fs, roots, diagnostics, {
      maxAgeMs: transcriptMaxAgeMs,
      now: () => now,
    });
    metaCache.clear();
    for (const rec of fresh) {
      if (!rec.logPath) continue;
      let st;
      try {
        st = await fs.stat(rec.logPath);
      } catch {
        continue;
      }
      metaCache.set(rec.logPath, {
        id: rec.id,
        parentId: rec.parentId,
        kind: rec.kind,
        file: rec.logPath,
        mtimeMs: st.mtimeMs,
        size: st.size,
        startedAt: rec.startedAt,
      });
    }
    return fresh;
  }

  const records: SessionRecord[] = [];
  const stalePaths: string[] = [];

  await Promise.all(
    [...metaCache.entries()].map(([path, meta]) =>
      sem.run(async () => {
        let st;
        try {
          st = await fs.stat(path);
        } catch {
          stalePaths.push(path);
          return;
        }
        if (!st.isFile()) {
          stalePaths.push(path);
          return;
        }
        const ageMs = now - st.mtimeMs;
        if (ageMs > transcriptMaxAgeMs) {
          stalePaths.push(path);
          return;
        }
        if (meta.mtimeMs !== st.mtimeMs || meta.size !== st.size) {
          metaCache.set(path, {
            ...meta,
            mtimeMs: st.mtimeMs,
            size: st.size,
          });
        }
        records.push(
          transcriptRecordFromMeta(metaCache.get(path)!, now),
        );
      }),
    ),
  );

  for (const path of stalePaths) metaCache.delete(path);

  const knownPaths = new Set(metaCache.keys());
  const newRecords = await readTranscriptRecords(fs, roots, diagnostics, {
    maxAgeMs: transcriptMaxAgeMs,
    now: () => now,
    skipLogPaths: knownPaths,
  });
  for (const rec of newRecords) {
    if (!rec.logPath) continue;
    let st;
    try {
      st = await fs.stat(rec.logPath);
    } catch {
      continue;
    }
    metaCache.set(rec.logPath, {
      id: rec.id,
      parentId: rec.parentId,
      kind: rec.kind,
      file: rec.logPath,
      mtimeMs: st.mtimeMs,
      size: st.size,
      startedAt: rec.startedAt,
    });
    records.push(rec);
  }

  return records;
}

async function tailLogCached(
  fs: FsLike,
  logSource: string,
  logLines: number,
  cache: Map<string, LogTailCacheEntry>,
  sem: Semaphore,
): Promise<string[]> {
  return sem.run(async () => {
    let st;
    try {
      st = await fs.stat(logSource);
    } catch {
      cache.delete(logSource);
      return [];
    }
    if (!st.isFile()) {
      cache.delete(logSource);
      return [];
    }
    const prev = cache.get(logSource);
    if (prev && prev.mtimeMs === st.mtimeMs && prev.size === st.size) {
      return prev.lines;
    }
    const lines = logSource.endsWith(".jsonl")
      ? await tailJsonlMessages(logSource, logLines, undefined, fs)
      : await tailFile(logSource, logLines, undefined, fs);
    cache.set(logSource, { mtimeMs: st.mtimeMs, size: st.size, lines });
    return lines;
  });
}

export interface Collector {
  collect(): Promise<AgentSnapshot>;
}

export function createCollector(opts: CollectorOptions = {}): Collector {
  const fs: FsLike = opts.fs ?? realFs;
  const psRunner: ProcessRunner = opts.psRunner ?? defaultPsRunner;
  const home = opts.homeDir ?? homedir();
  const plat = opts.platform ?? platform();
  const logLines = opts.logTailLines ?? DEFAULT_LOG_LINES;
  const cursorOnly = opts.cursorOnly ?? false;
  const withLogs = opts.withLogs ?? false;
  const transcriptMaxAgeMs = opts.transcriptMaxAgeMs ?? 24 * 60 * 60 * 1000;
  const composerModelRunner: ComposerModelRunner =
    opts.composerModelRunner ?? defaultComposerModelRunner;
  const slowLaneEvery = opts.slowLaneEvery ?? DEFAULT_SLOW_LANE_EVERY;
  const nowFn = opts.now ?? Date.now;
  const sem = createSemaphore(opts.fsConcurrency ?? DEFAULT_FS_CONCURRENCY);
  const paths = resolveCursorPaths(home, plat);

  const cloudApiOpts: CloudApiOptions | false = opts.cloudApi ?? {};
  const sessionFileCache = new Map<string, SessionFileCacheEntry>();
  const transcriptMetaCache = new Map<string, TranscriptFileMeta>();
  const logTailCache = new Map<string, LogTailCacheEntry>();
  const composerModelCache = new Map<string, string>();
  const hookLogCache: HookLogCacheEntry = {
    path: "",
    mtimeMs: 0,
    size: 0,
    models: new Map(),
  };
  const unresolvedComposerIds = new Set<string>();
  let cachedTranscriptRoots: string[] = [];
  let cachedSlugPaths: Map<string, string> | null = null;
  let slugPathsBuiltAt = 0;
  const repoDisplayCache = new Map<string, RepoDisplayCacheEntry>();
  let tickCount = 0;
  let prevSnapshotNodes: Record<string, AgentNode> | null = null;
  const idleElapsedEndCache = new Map<string, number>();
  let cachedCloudApiNodes: AgentNode[] = [];

  return {
    async collect(): Promise<AgentSnapshot> {
      tickCount += 1;
      const now = nowFn();
      const slowLane = tickCount === 1 || tickCount % slowLaneEvery === 0;

      const diagnostics: string[] = [];
      const processes = await discoverCursorProcesses(psRunner);
      if (processes.length === 0) {
        diagnostics.push(
          "No Cursor processes detected via `ps`. Use --demo to preview the UI.",
        );
      }

      const pidParents = new Map<number, number>();
      const pidCommands = new Map<number, string>();
      for (const p of processes) {
        pidParents.set(p.pid, p.ppid);
        pidCommands.set(p.pid, p.command);
      }

      const procNodes = processes.map((p) => ({
        ...nodeFromProcess(p),
        startedAt: now - p.etimeSec * 1000,
      }));
      const nodesByPid = new Map<number, AgentNode>();
      for (const n of procNodes) if (n.pid != null) nodesByPid.set(n.pid, n);

      const ideRecords = await readCachedSessionRecords(
        fs,
        paths.dataRoots,
        "ide",
        diagnostics,
        sessionFileCache,
        slowLane,
        sem,
      );
      const cliRecords = await readCachedSessionRecords(
        fs,
        paths.cliSessionRoots,
        "cli",
        diagnostics,
        sessionFileCache,
        slowLane,
        sem,
      );
      const cloudRecords = await readCachedSessionRecords(
        fs,
        paths.cloudProjectRoots,
        "cloud",
        diagnostics,
        sessionFileCache,
        slowLane,
        sem,
      );

      cachedTranscriptRoots = await enumerateTranscriptRoots(
        fs,
        paths.cloudProjectRoots,
        sem,
      );

      const transcriptRecords = await readCachedTranscriptRecords(
        fs,
        cachedTranscriptRoots,
        diagnostics,
        transcriptMaxAgeMs,
        now,
        transcriptMetaCache,
        slowLane,
        sem,
      );

      // Cloud API: fetch remote cloud agents on slow-lane ticks
      if (cloudApiOpts !== false && slowLane) {
        try {
          cachedCloudApiNodes = await fetchCloudAgents(cloudApiOpts);
        } catch {
          // keep previous cache on failure
        }
      }

      const allRecords = [
        ...ideRecords,
        ...cliRecords,
        ...cloudRecords,
        ...transcriptRecords,
      ];
      const sessionNodes = allRecords.map(nodeFromSession);

      // Merge session metadata into live process rows first, then clone
      // into `merged` — cloning before merge left stale copies without
      // logSource / model / title from session JSON.
      const seenIds = new Set(procNodes.map((n) => n.id));
      const orphanSessions: AgentNode[] = [];
      for (const sNode of sessionNodes) {
        const sessionNode = { ...sNode };
        if (sessionNode.pid != null && nodesByPid.has(sessionNode.pid)) {
          mergeSessionIntoProcess(nodesByPid.get(sessionNode.pid)!, sessionNode);
          continue;
        }
        if (!seenIds.has(sessionNode.id)) {
          orphanSessions.push(sessionNode);
          seenIds.add(sessionNode.id);
        }
      }

      // Merge cloud API nodes, deduplicating against locally-discovered nodes
      const cloudApiNodes = cachedCloudApiNodes.filter(
        (n) => !seenIds.has(n.id),
      );
      for (const n of cloudApiNodes) seenIds.add(n.id);

      const merged: AgentNode[] = [
        ...procNodes.map((n) => ({ ...n })),
        ...orphanSessions,
        ...cloudApiNodes,
      ];

      await Promise.all(
        merged.map(async (n) => {
          if (!n.logSource) return;
          n.recentLogs = await tailLogCached(
            fs,
            n.logSource,
            logLines,
            logTailCache,
            sem,
          );
        }),
      );

      const composerDataRoot = paths.dataRoots[0];
      if (composerDataRoot) {
        for (const node of merged) {
          if (!isPlaceholderModelSlug(node.model)) continue;
          const cached = composerModelCache.get(node.id);
          if (cached) node.model = cached;
        }

        const composerIds = merged
          .filter((n) => n.kind === "agent" || n.kind === "subagent")
          .map((n) => n.id);

        const idsNeedingModel = merged
          .filter(
            (n) =>
              (n.kind === "agent" || n.kind === "subagent") &&
              isPlaceholderModelSlug(n.model) &&
              (!unresolvedComposerIds.has(n.id) || slowLane),
          )
          .map((n) => n.id);

        if (composerIds.length > 0) {
          const composerData = await readComposerData(
            composerDataRoot,
            composerIds,
            {
              runner: composerModelRunner,
              exists: (p) => fs.exists(p),
            },
          );
          for (const id of idsNeedingModel) {
            const entry = composerData.get(id);
            if (entry?.model) {
              composerModelCache.set(id, entry.model);
              unresolvedComposerIds.delete(id);
            } else if (!composerData.has(id)) {
              unresolvedComposerIds.add(id);
            }
          }
          for (const node of merged) {
            const entry = composerData.get(node.id);
            if (!entry) continue;
            if (entry.tokenUsage != null) node.tokenUsage = entry.tokenUsage;
            if (
              isPlaceholderModelSlug(node.model) &&
              entry.model
            ) {
              node.model = entry.model;
            }
          }
        }
      }

      const idsNeedingHookModel = merged
        .filter(
          (n) =>
            isPlaceholderModelSlug(n.model) &&
            (n.kind === "agent" || n.kind === "subagent"),
        )
        .map((n) => n.id);
      if (idsNeedingHookModel.length > 0 && paths.logRoots.length > 0) {
        const hookModels = await readHookLogModels(
          paths.logRoots,
          idsNeedingHookModel,
          fs,
          hookLogCache,
        );
        for (const node of merged) {
          if (!isPlaceholderModelSlug(node.model)) continue;
          const resolved = hookModels.get(node.id);
          if (resolved) node.model = resolved;
        }
      }

      reparentTranscriptChats(merged, pidCommands, pidParents);

      const slugStale =
        slowLane ||
        cachedSlugPaths == null ||
        now - slugPathsBuiltAt > SLUG_MAP_TTL_MS;
      if (slugStale) {
        cachedSlugPaths = await buildSlugPathMap(
          fs,
          paths.dataRoots[0],
          pidCommands,
        );
        slugPathsBuiltAt = now;
        repoDisplayCache.clear();
      }

      await Promise.all(
        merged.map((node) =>
          sem.run(async () => {
            if (!node.repo) return;
            const display = await resolveRepoDisplayCached(
              fs,
              node.repo,
              cachedSlugPaths!,
              repoDisplayCache,
              slowLane,
            );
            if (display) node.repo = display;
          }),
        ),
      );

      const built = buildHierarchy({ nodes: merged, pidParents });
      let view = built;
      if (cursorOnly) view = pruneNonCursor(view.nodes, view.roots, diagnostics);
      if (withLogs) view = pruneWithoutLogs(view.nodes, view.roots, diagnostics);
      if (opts.activeOnly ?? true) {
        view = pruneDoneAgents(view.nodes, view.roots, diagnostics);
      }

      const outNodes: Record<string, AgentNode> = {};
      for (const [id, node] of Object.entries(view.nodes)) {
        outNodes[id] = {
          ...node,
          recentLogs: [...node.recentLogs],
          children: node.children ? [...node.children] : undefined,
        };
      }

      annotateElapsedEnd(
        outNodes,
        prevSnapshotNodes,
        now,
        idleElapsedEndCache,
      );
      prevSnapshotNodes = outNodes;

      return {
        capturedAt: now,
        nodes: outNodes,
        roots: [...view.roots],
        diagnostics: [...diagnostics],
      };
    },
  };
}

async function resolveRepoDisplayCached(
  fs: FsLike,
  repo: string,
  slugPaths: Map<string, string>,
  cache: Map<string, RepoDisplayCacheEntry>,
  slowLane: boolean,
): Promise<string | null> {
  if (/github\.com/i.test(repo)) return stripGitHubHost(repo);

  let workspacePath: string | null = null;
  if (repo.startsWith("/")) {
    workspacePath = repo;
  } else if (slugPaths.has(repo)) {
    workspacePath = slugPaths.get(repo)!;
  }
  if (!workspacePath) return null;

  const configPath = `${workspacePath}/.git/config`;
  let configMtime = 0;
  try {
    const st = await fs.stat(configPath);
    if (!st.isFile()) return null;
    configMtime = st.mtimeMs;
  } catch {
    return null;
  }

  const prev = cache.get(repo);
  if (!slowLane && prev && prev.mtimeMs === configMtime) {
    return prev.display;
  }

  // Caller already holds a semaphore slot (merged.map → sem.run). Do not nest
  // sem.run here — with fsConcurrency slots all busy, inner acquires deadlock.
  const display = await resolveRepoDisplayUrl(fs, repo, slugPaths);
  cache.set(repo, { mtimeMs: configMtime, display });
  return display;
}

async function enumerateTranscriptRoots(
  fs: FsLike,
  projectRoots: string[],
  sem: Semaphore,
): Promise<string[]> {
  const out: string[] = [];
  for (const projectsRoot of projectRoots) {
    if (!(await fs.exists(projectsRoot))) continue;
    let workspaces: string[];
    try {
      workspaces = await fs.readdir(projectsRoot);
    } catch {
      continue;
    }
    await Promise.all(
      workspaces.map((slug) =>
        sem.run(async () => {
          const candidate = `${projectsRoot}/${slug}/agent-transcripts`;
          if (await fs.exists(candidate)) out.push(candidate);
        }),
      ),
    );
  }
  return out;
}

function annotateElapsedEnd(
  nodes: Record<string, AgentNode>,
  prev: Record<string, AgentNode> | null,
  now: number,
  endCache: Map<string, number>,
): void {
  const seen = new Set<string>();
  for (const [id, node] of Object.entries(nodes)) {
    seen.add(id);
    if (node.status === "running") {
      endCache.delete(id);
      node.elapsedEndAt = null;
      continue;
    }
    if (node.elapsedEndAt != null) {
      endCache.set(id, node.elapsedEndAt);
      continue;
    }
    const prevStatus = prev?.[id]?.status;
    if (prevStatus === "running" || !endCache.has(id)) {
      endCache.set(id, now);
    }
    node.elapsedEndAt = endCache.get(id)!;
  }
  for (const id of endCache.keys()) {
    if (!seen.has(id)) endCache.delete(id);
  }
}

function pruneNonCursor(
  nodes: Record<string, AgentNode>,
  roots: string[],
  diagnostics: string[],
): { nodes: Record<string, AgentNode>; roots: string[] } {
  const keep = new Set<string>();
  const visit = (id: string): void => {
    const node = nodes[id];
    if (!node) return;
    keep.add(id);
    for (const childId of node.children ?? []) visit(childId);
  };

  const culledRoots: string[] = [];
  const keptRoots: string[] = [];
  for (const rootId of roots) {
    const node = nodes[rootId];
    if (!node) continue;
    if (node.kind === "unknown") {
      culledRoots.push(rootId);
      continue;
    }
    visit(rootId);
    keptRoots.push(rootId);
  }

  if (culledRoots.length > 0) {
    diagnostics.push(
      `--cursor-only: pruned ${culledRoots.length} non-Cursor root subtree${culledRoots.length === 1 ? "" : "s"}.`,
    );
  }

  const out: Record<string, AgentNode> = {};
  for (const id of keep) out[id] = nodes[id]!;
  return { nodes: out, roots: keptRoots };
}

function pruneWithoutLogs(
  nodes: Record<string, AgentNode>,
  roots: string[],
  diagnostics: string[],
): { nodes: Record<string, AgentNode>; roots: string[] } {
  const survives = new Set<string>();
  const hasOwnLogs = (id: string): boolean => {
    const node = nodes[id];
    if (!node) return false;
    if ((node.recentLogs?.length ?? 0) > 0) return true;
    // Transcript-backed chats exist before the first message is flushed.
    if (
      node.logSource?.endsWith(".jsonl") &&
      (node.kind === "agent" || node.kind === "subagent")
    ) {
      return true;
    }
    return false;
  };

  const visit = (id: string): boolean => {
    const node = nodes[id];
    if (!node) return false;
    let kept = hasOwnLogs(id);
    for (const childId of node.children ?? []) {
      if (visit(childId)) kept = true;
    }
    if (kept) survives.add(id);
    return kept;
  };
  for (const rootId of roots) visit(rootId);

  if (survives.size === 0) {
    diagnostics.push(
      "--with-logs: no nodes produced readable log output (rerun with --no-with-logs to see all processes).",
    );
    return { nodes: {}, roots: [] };
  }

  const culled = Object.keys(nodes).length - survives.size;
  if (culled > 0) {
    diagnostics.push(
      `--with-logs: pruned ${culled} node${culled === 1 ? "" : "s"} with no readable agent output.`,
    );
  }

  const out: Record<string, AgentNode> = {};
  for (const id of survives) {
    const original = nodes[id]!;
    out[id] = {
      ...original,
      children: (original.children ?? []).filter((childId) => survives.has(childId)),
    };
  }
  const keptRoots = roots.filter((id) => survives.has(id));
  return { nodes: out, roots: keptRoots };
}

function pruneDoneAgents(
  nodes: Record<string, AgentNode>,
  roots: string[],
  diagnostics: string[],
): { nodes: Record<string, AgentNode>; roots: string[] } {
  const survives = new Set<string>();

  const visit = (id: string): boolean => {
    const node = nodes[id];
    if (!node) return false;
    if (node.kind === "subagent" && node.status === "done") return false;
    let kept = node.status !== "done";
    for (const childId of node.children ?? []) {
      if (visit(childId)) kept = true;
    }
    if (kept) survives.add(id);
    return kept;
  };
  for (const rootId of roots) visit(rootId);

  const culled = Object.keys(nodes).length - survives.size;
  if (culled > 0) {
    diagnostics.push(
      `--active-only: pruned ${culled} done agent${culled === 1 ? "" : "s"} (pass --no-active-only to include finished sessions).`,
    );
  }

  const out: Record<string, AgentNode> = {};
  for (const id of survives) {
    const original = nodes[id]!;
    out[id] = {
      ...original,
      children: (original.children ?? []).filter((childId) => survives.has(childId)),
    };
  }
  const keptRoots = roots.filter((id) => survives.has(id));
  return { nodes: out, roots: keptRoots };
}

function reparentTranscriptChats(
  nodes: AgentNode[],
  pidCommands: Map<number, string>,
  pidParents: Map<number, number>,
): void {
  const idePidRoots: AgentNode[] = [];
  for (const node of nodes) {
    if (node.pid == null || node.kind !== "ide") continue;
    if (!isPidRoot(node.pid, pidParents)) continue;
    if (!/Cursor IDE/i.test(node.label)) continue;
    idePidRoots.push(node);
  }
  if (idePidRoots.length === 0) return;
  idePidRoots.sort((a, b) => a.startedAt - b.startedAt);

  for (const node of nodes) {
    if (node.pid != null) continue;
    if (node.kind !== "agent") continue;
    if (node.parentId) continue;
    if (!node.logSource?.endsWith(".jsonl")) continue;
    const owner = pickIdeOwner(node, idePidRoots, pidCommands);
    if (owner) node.parentId = owner.id;
  }
}

function isPidRoot(pid: number, pidParents: Map<number, number>): boolean {
  const ppid = pidParents.get(pid);
  if (ppid == null) return true;
  return !pidParents.has(ppid) || pidParents.get(ppid) === pid;
}

function pickIdeOwner(
  chat: AgentNode,
  candidates: AgentNode[],
  pidCommands: Map<number, string>,
): AgentNode | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0]!;
  if (chat.repo) {
    for (const cand of candidates) {
      const cmd = pidCommands.get(cand.pid!) ?? "";
      for (const m of cmd.matchAll(/(?:\/[\w.@+-]+)+/g)) {
        const path = m[0]!;
        if (slugFromAbsolutePath(path) === chat.repo) return cand;
      }
    }
  }
  return candidates[0]!;
}
