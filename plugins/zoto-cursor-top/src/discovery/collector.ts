/**
 * Orchestrates process discovery, session-metadata parsing, log tailing, and
 * hierarchy building into a single {@link AgentSnapshot}.
 *
 * The collector is intentionally pure-ish: every external dependency
 * (process listing, filesystem, time source) can be injected so we can write
 * deterministic tests around the full pipeline.
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
import { realFs } from "./fs.js";
import { buildHierarchy } from "./hierarchy.js";
import { tailFile } from "./logs.js";
import { resolveCursorPaths } from "./paths.js";
import {
  defaultPsRunner,
  discoverCursorProcesses,
  type ProcessRunner,
  type RawProcess,
} from "./processes.js";
import { readSessionRecords, type SessionRecord } from "./sessions.js";

const DEFAULT_LOG_LINES = 3;

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
    status: rec.status,
    recentLogs: [],
    logSource: rec.logPath,
  };
}

/**
 * Merge a session node into an existing process-derived node when their PIDs
 * line up. The session record always wins for label/title/model/repo because
 * it carries richer metadata than the raw command line.
 */
function mergeSessionIntoProcess(into: AgentNode, from: AgentNode): void {
  into.label = from.label || into.label;
  into.title = from.title || into.title;
  into.model = from.model ?? into.model;
  into.repo = from.repo ?? into.repo;
  into.status = from.status !== "unknown" ? from.status : into.status;
  into.startedAt = from.startedAt || into.startedAt;
  into.logSource = from.logSource ?? into.logSource;
  if (from.parentId) into.parentId = from.parentId;
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
  const paths = resolveCursorPaths(home, plat);

  return {
    async collect(): Promise<AgentSnapshot> {
      const diagnostics: string[] = [];
      const processes = await discoverCursorProcesses(psRunner);
      if (processes.length === 0) {
        diagnostics.push(
          "No Cursor processes detected via `ps`. Use --demo to preview the UI.",
        );
      }

      const pidParents = new Map<number, number>();
      for (const p of processes) pidParents.set(p.pid, p.ppid);

      const procNodes = processes.map(nodeFromProcess);
      const nodesByPid = new Map<number, AgentNode>();
      for (const n of procNodes) if (n.pid != null) nodesByPid.set(n.pid, n);

      const ideRecords = await readSessionRecords(
        fs,
        paths.dataRoots,
        "ide",
        diagnostics,
      );
      const cliRecords = await readSessionRecords(
        fs,
        paths.cliSessionRoots,
        "cli",
        diagnostics,
      );
      const cloudRecords = await readSessionRecords(
        fs,
        paths.cloudProjectRoots,
        "cloud",
        diagnostics,
      );

      const allRecords = [...ideRecords, ...cliRecords, ...cloudRecords];
      const sessionNodes = allRecords.map(nodeFromSession);

      const merged: AgentNode[] = [...procNodes];
      const seenIds = new Set(procNodes.map((n) => n.id));
      for (const sNode of sessionNodes) {
        if (sNode.pid != null && nodesByPid.has(sNode.pid)) {
          mergeSessionIntoProcess(nodesByPid.get(sNode.pid)!, sNode);
          continue;
        }
        if (!seenIds.has(sNode.id)) {
          merged.push(sNode);
          seenIds.add(sNode.id);
        }
      }

      await Promise.all(
        merged.map(async (n) => {
          if (n.logSource) {
            n.recentLogs = await tailFile(n.logSource, logLines);
          }
        }),
      );

      const { nodes, roots } = buildHierarchy({ nodes: merged, pidParents });

      return {
        capturedAt: Date.now(),
        nodes,
        roots,
        diagnostics,
      };
    },
  };
}
