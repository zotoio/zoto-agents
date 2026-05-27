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
import {
  defaultComposerModelRunner,
  readComposerModels,
  type ComposerModelRunner,
} from "./composer-models.js";
import { realFs } from "./fs.js";
import { buildHierarchy } from "./hierarchy.js";
import { tailFile, tailJsonlMessages } from "./logs.js";
import { resolveCursorPaths } from "./paths.js";
import {
  defaultPsRunner,
  discoverCursorProcesses,
  type ProcessRunner,
  type RawProcess,
} from "./processes.js";
import {
  readSessionRecords,
  readTranscriptRecords,
  type SessionRecord,
} from "./sessions.js";
import {
  buildSlugPathMap,
  resolveRepoDisplayUrl,
  slugFromAbsolutePath,
} from "./repo-url.js";

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
  const cursorOnly = opts.cursorOnly ?? false;
  const withLogs = opts.withLogs ?? false;
  const activeOnly = opts.activeOnly ?? true;
  const transcriptMaxAgeMs = opts.transcriptMaxAgeMs ?? 24 * 60 * 60 * 1000;
  const composerModelRunner: ComposerModelRunner =
    opts.composerModelRunner ?? defaultComposerModelRunner;
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
      const pidCommands = new Map<number, string>();
      for (const p of processes) {
        pidParents.set(p.pid, p.ppid);
        pidCommands.set(p.pid, p.command);
      }

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

      // Stop-gap until SQLite session readers land: enumerate per-agent
      // transcript directories under every workspace in ~/.cursor/projects
      // and treat each transcript file as a session whose `logPath` is the
      // file itself. See `readTranscriptRecords` for the rules.
      const transcriptRoots = await enumerateTranscriptRoots(fs, paths.cloudProjectRoots);
      paths.agentTranscriptRoots.push(...transcriptRoots);
      const transcriptRecords = await readTranscriptRecords(
        fs,
        transcriptRoots,
        diagnostics,
        { maxAgeMs: transcriptMaxAgeMs },
      );

      const allRecords = [
        ...ideRecords,
        ...cliRecords,
        ...cloudRecords,
        ...transcriptRecords,
      ];
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
          if (!n.logSource) return;
          n.recentLogs = n.logSource.endsWith(".jsonl")
            ? await tailJsonlMessages(n.logSource, logLines)
            : await tailFile(n.logSource, logLines);
        }),
      );

      // Enrich agent / subagent nodes with the model picked in the
      // Cursor IDE chat picker. Cursor stores the selection in
      // `<app-data>/User/globalStorage/state.vscdb` keyed by the
      // chat UUID — which is also the transcript directory name —
      // so the same map populates both `[AGENT]` and `[SUB]` rows.
      //
      // We pass only the ids we actually need (transcript-derived
      // agent / subagent ids; everything else either has a model
      // already from session JSON or has no chat-uuid mapping). The
      // SELECT uses `key IN (...)` against `cursorDiskKV`'s primary
      // key, which is critical because the real-world DB can grow
      // to multiple GB and a full `LIKE 'composerData:%'` scan would
      // exceed the refresh tick budget. Errors (missing DB, missing
      // `sqlite3` binary, locked file, slow scan) are swallowed by
      // `readComposerModels`; the renderer then keeps its `-`
      // placeholder for that row.
      const composerDataRoot = paths.dataRoots[0];
      if (composerDataRoot) {
        const idsNeedingModel = merged
          .filter((n) => !n.model && (n.kind === "agent" || n.kind === "subagent"))
          .map((n) => n.id);
        if (idsNeedingModel.length > 0) {
          const composerModels = await readComposerModels(
            composerDataRoot,
            idsNeedingModel,
            {
              runner: composerModelRunner,
              exists: (p) => fs.exists(p),
            },
          );
          if (composerModels.size > 0) {
            for (const node of merged) {
              if (node.model) continue;
              const m = composerModels.get(node.id);
              if (m) node.model = m;
            }
          }
        }
      }

      reparentTranscriptChats(merged, pidCommands, pidParents);

      const slugPaths = await buildSlugPathMap(
        fs,
        paths.dataRoots[0],
        pidCommands,
      );
      await Promise.all(
        merged.map(async (node) => {
          if (!node.repo) return;
          const display = await resolveRepoDisplayUrl(fs, node.repo, slugPaths);
          if (display) node.repo = display;
        }),
      );

      const built = buildHierarchy({ nodes: merged, pidParents });
      let view = built;
      if (cursorOnly) view = pruneNonCursor(view.nodes, view.roots, diagnostics);
      if (withLogs) view = pruneWithoutLogs(view.nodes, view.roots, diagnostics);
      if (activeOnly) view = pruneDoneAgents(view.nodes, view.roots, diagnostics);

      return {
        capturedAt: Date.now(),
        nodes: view.nodes,
        roots: view.roots,
        diagnostics,
      };
    },
  };
}

/**
 * For every `~/.cursor/projects/<workspace>/agent-transcripts/` directory
 * that exists, return its absolute path. The caller feeds these into
 * {@link readTranscriptRecords}.
 *
 * Each input root (`cloudProjectRoots` entry) is expected to be a
 * `~/.cursor/projects/` directory whose children are workspace slugs.
 */
async function enumerateTranscriptRoots(
  fs: FsLike,
  projectRoots: string[],
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
    for (const slug of workspaces) {
      const candidate = `${projectsRoot}/${slug}/agent-transcripts`;
      if (await fs.exists(candidate)) out.push(candidate);
    }
  }
  return out;
}

/**
 * Prune any subtree whose root is `kind: "unknown"`. Descendants of a
 * Cursor-kind root are kept regardless of their own kind so the user can
 * still see helper bash / node shells that the IDE itself spawned.
 *
 * The diagnostic list gains a one-liner with the count when pruning
 * actually drops something — useful when the user wonders why their
 * unrelated terminal sessions disappeared from the view.
 */
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

/**
 * Keep only nodes that produced readable agent output, plus the ancestor
 * chain of any such node so the surviving rows still hang under their
 * parents in the tree.
 *
 * The roll-up rule is: a node survives if it has at least one tailed log
 * line OR one of its descendants does. Children arrays are rewritten to
 * drop pruned ids so the renderer doesn't emit phantom rows.
 */
function pruneWithoutLogs(
  nodes: Record<string, AgentNode>,
  roots: string[],
  diagnostics: string[],
): { nodes: Record<string, AgentNode>; roots: string[] } {
  // Phase 1 — bottom-up walk to mark surviving ids. Recursive helper is
  // fine here because the depth is bounded by the process tree.
  const survives = new Set<string>();
  const hasOwnLogs = (id: string): boolean =>
    (nodes[id]?.recentLogs?.length ?? 0) > 0;

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

/**
 * Drop nodes whose status is `"done"` and whose subtree contains no
 * active descendant (running / waiting / idle / error / unknown).
 *
 * Subagents are treated more strictly: a subagent with `status === "done"`
 * is ALWAYS dropped, even if it has surviving descendants. That mirrors
 * the user-facing rule "only render SUBs that are not done" — done subs
 * never appear, regardless of grandchildren. Non-subagent nodes still
 * obey the roll-up rule so a done parent that hosts a live child is
 * kept and the tree stays navigable.
 *
 * Equivalent to passing `--active-only` (the default) on the CLI.
 */
function pruneDoneAgents(
  nodes: Record<string, AgentNode>,
  roots: string[],
  diagnostics: string[],
): { nodes: Record<string, AgentNode>; roots: string[] } {
  const survives = new Set<string>();

  const visit = (id: string): boolean => {
    const node = nodes[id];
    if (!node) return false;
    // Strict rule for subagents: status === "done" → drop, no
    // ancestor-preservation. Subs are leaves in practice; this keeps
    // the rule simple to reason about even when sub-of-sub chains
    // appear in the data.
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

/**
 * Re-parent transcript-derived chat sessions so they appear under their
 * owning Cursor IDE OS process instead of as standalone roots.
 *
 * Transcript records are minted from
 * `~/.cursor/projects/<workspace>/agent-transcripts/<chat-uuid>/…` and
 * have no PID — Cursor doesn't write one to the message-stream files.
 * Before this step, the hierarchy looks like:
 *
 *   pid:1234 (Cursor IDE)        ← OS process tree
 *   chat-uuid (IDE transcript)   ← parallel root
 *     └─ sub-uuid (Task)
 *
 * The user-facing rule is "subagents belong under the IDE process",
 * so we walk the merged node list, find every parent transcript chat
 * (kind="ide", pid==null, parentId==null), and re-parent it onto a
 * Cursor IDE PID root. Matching strategy:
 *
 *   1. Prefer an IDE PID whose command line contains the workspace
 *      slug (we de-slugify "home-andrewv-git-cursor-foo" back to a
 *      path fragment and substring-match against the command). This
 *      keeps multi-window setups correctly partitioned.
 *   2. Fall back to the earliest-started Cursor IDE PID root. With a
 *      single-window setup (the common case) that's the only IDE
 *      root, so all chats hang under it.
 *
 * Subagents follow automatically: they already have `parentId` set
 * to their parent chat, and `buildHierarchy` chains them under once
 * the chat itself sits inside the PID tree.
 */
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

/**
 * A PID is a root within the captured process table when its PPID is
 * not itself a captured PID. We can't rely on PPID === 1 because the
 * collector only sees Cursor-flavoured processes — the actual init
 * parent is usually filtered out.
 */
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
    // Workspace slugs look like "home-andrewv-git-cursor-foo"; match the
    // owning IDE window by comparing slug encodings of paths embedded in
    // each process command. Handles hyphenated directory names correctly.
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
