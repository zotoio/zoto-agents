import { describe, expect, it } from "vitest";
import { createCollector } from "../src/discovery/collector.js";
import type { FsLike } from "../src/types.js";

const emptyFs: FsLike = {
  readdir: async () => [],
  readFile: async () => "",
  readWindow: async () => Buffer.alloc(0),
  stat: async () => ({
    isDirectory: () => false,
    isFile: () => false,
    mtimeMs: 0,
    size: 0,
  }),
  exists: async () => false,
};

/**
 * Build an FsLike facade that pretends a small set of directories and
 * JSON session files exist on disk. Anything not in `tree` returns the
 * "missing" shape. Used by the active-only tests below to inject done /
 * running session records without spinning up a real filesystem.
 */
function makeFs(tree: Record<string, string | string[]>): FsLike {
  return {
    readdir: async (path) => {
      const v = tree[path];
      return Array.isArray(v) ? v : [];
    },
    readFile: async (path) => {
      const v = tree[path];
      if (typeof v === "string") return v;
      throw new Error(`no file: ${path}`);
    },
    readWindow: async (path, offset, length) => {
      const v = tree[path];
      if (typeof v !== "string") return Buffer.alloc(0);
      return Buffer.from(v, "utf8").subarray(offset, offset + length);
    },
    stat: async (path) => {
      const v = tree[path];
      const isDir = Array.isArray(v);
      return {
        isDirectory: () => isDir,
        isFile: () => typeof v === "string",
        mtimeMs: 0,
        size: typeof v === "string" ? v.length : 0,
      };
    },
    exists: async (path) => path in tree,
  };
}

describe("createCollector", () => {
  it("produces a snapshot from injected ps output only", async () => {
    const collector = createCollector({
      psRunner: async () =>
        [
          "100 1 02:00 /Applications/Cursor.app/Contents/MacOS/Cursor",
          "200 100 01:00 /Applications/Cursor.app/Contents/Frameworks/Cursor Helper.app/Contents/MacOS/Cursor Helper",
          "300 1 00:30 /usr/local/bin/cursor-agent --resume foo",
        ].join("\n"),
      fs: emptyFs,
      platform: "linux",
      homeDir: "/home/test",
    });
    const snap = await collector.collect();
    expect(snap.roots.sort()).toEqual(["pid:100", "pid:300"]);
    expect(snap.nodes["pid:100"]!.children).toContain("pid:200");
    expect(snap.nodes["pid:300"]!.kind).toBe("cli");
    expect(snap.nodes["pid:100"]!.kind).toBe("ide");
  });

  it("emits a diagnostic when no Cursor processes are found", async () => {
    const collector = createCollector({
      psRunner: async () => "",
      fs: emptyFs,
      platform: "linux",
      homeDir: "/home/test",
    });
    const snap = await collector.collect();
    expect(snap.roots).toEqual([]);
    expect(snap.diagnostics.some((d) => d.includes("No Cursor processes"))).toBe(true);
  });

  it("--cursor-only prunes kind=unknown root subtrees while keeping Cursor-classified descendants", async () => {
    // ps payload with four roots after discovery filtering:
    //   * pid:100 — Cursor IDE root + its Cursor Helper child
    //   * pid:300 — cursor-agent CLI (kind: cli, must survive)
    //   * pid:900 — wrapper script that hits the permissive 4th bin matcher
    //               (`\bcursor\b...electron`) but lands at kind:"unknown"
    //               because none of the IDE / CLI / Cloud classifiers match.
    //               Must be pruned along with any descendants.
    const collector = createCollector({
      cursorOnly: true,
      psRunner: async () =>
        [
          "100 1 02:00 /Applications/Cursor.app/Contents/MacOS/Cursor",
          "200 100 01:00 /Applications/Cursor.app/Contents/Frameworks/Cursor Helper.app/Contents/MacOS/Cursor Helper",
          "300 1 00:30 /usr/local/bin/cursor-agent --resume foo",
          "900 1 00:10 /bin/python3 /opt/wrap.py --cursor-electron-mode",
          "910 900 00:05 /bin/python3 --cursor-electron-debug",
        ].join("\n"),
      fs: emptyFs,
      platform: "linux",
      homeDir: "/home/test",
    });
    const snap = await collector.collect();
    expect(snap.roots.sort()).toEqual(["pid:100", "pid:300"]);
    expect(snap.nodes["pid:200"]).toBeDefined();
    expect(snap.nodes["pid:900"]).toBeUndefined();
    expect(snap.nodes["pid:910"]).toBeUndefined();
    expect(
      snap.diagnostics.some((d) => d.includes("--cursor-only: pruned")),
    ).toBe(true);
  });

  it("--with-logs keeps only log-emitting nodes plus their ancestor chain", async () => {
    // Build a synthetic snapshot through the demo path so we have
    // populated `recentLogs` we can assert against. Then run the
    // collector once with --with-logs against a hand-rolled ps payload
    // where every node has empty logs (no fs to read from) — we expect
    // the snapshot to come back empty with a diagnostic explaining why.
    const collector = createCollector({
      withLogs: true,
      psRunner: async () =>
        "100 1 02:00 /Applications/Cursor.app/Contents/MacOS/Cursor",
      fs: emptyFs,
      platform: "linux",
      homeDir: "/home/test",
    });
    const snap = await collector.collect();
    expect(snap.roots).toEqual([]);
    expect(snap.nodes).toEqual({});
    expect(
      snap.diagnostics.some((d) => d.includes("--with-logs: no nodes")),
    ).toBe(true);
  });

  it("--active-only (default) hides done sessions and parents whose subtree is all done", async () => {
    // Inject two session-only roots and one done child of an alive root:
    //   * /home/test/.cursor/sessions/alive.json   → status running, kept
    //   * /home/test/.cursor/sessions/parent.json  → status done with one
    //                                                 done child, fully pruned
    //   * /home/test/.cursor/sessions/done-leaf.json → status done, pruned
    const sessions = "/home/test/.cursor/sessions";
    const fs = makeFs({
      [sessions]: ["alive.json", "parent.json", "done-child.json", "done-leaf.json"],
      [`${sessions}/alive.json`]: JSON.stringify({
        sessionId: "alive",
        model: "claude-opus-4.7",
        status: "running",
      }),
      [`${sessions}/parent.json`]: JSON.stringify({
        sessionId: "parent",
        model: "claude-opus-4.7",
        status: "done",
      }),
      [`${sessions}/done-child.json`]: JSON.stringify({
        sessionId: "done-child",
        parentId: "parent",
        model: "claude-opus-4.7",
        status: "done",
      }),
      [`${sessions}/done-leaf.json`]: JSON.stringify({
        sessionId: "done-leaf",
        model: "claude-opus-4.7",
        status: "done",
      }),
    });
    const collector = createCollector({
      psRunner: async () => "",
      fs,
      platform: "linux",
      homeDir: "/home/test",
    });
    const snap = await collector.collect();
    expect(Object.keys(snap.nodes).sort()).toEqual(["alive"]);
    expect(snap.roots).toEqual(["alive"]);
    expect(
      snap.diagnostics.some((d) => d.includes("--active-only: pruned")),
    ).toBe(true);
  });

  it("--active-only keeps a done parent that still has at least one active child", async () => {
    const sessions = "/home/test/.cursor/sessions";
    const fs = makeFs({
      [sessions]: ["parent.json", "alive-child.json", "done-sibling.json"],
      [`${sessions}/parent.json`]: JSON.stringify({
        sessionId: "parent",
        model: "claude-opus-4.7",
        status: "done",
      }),
      [`${sessions}/alive-child.json`]: JSON.stringify({
        sessionId: "alive-child",
        parentId: "parent",
        model: "claude-opus-4.7",
        status: "running",
      }),
      [`${sessions}/done-sibling.json`]: JSON.stringify({
        sessionId: "done-sibling",
        parentId: "parent",
        model: "claude-opus-4.7",
        status: "done",
      }),
    });
    const collector = createCollector({
      psRunner: async () => "",
      fs,
      platform: "linux",
      homeDir: "/home/test",
    });
    const snap = await collector.collect();
    expect(Object.keys(snap.nodes).sort()).toEqual(["alive-child", "parent"]);
    expect(snap.roots).toEqual(["parent"]);
    expect(snap.nodes["parent"]!.children).toEqual(["alive-child"]);
  });

  it("--active-only always drops done subagents, even when they have an active descendant", async () => {
    // A parent transcript with a done subagent that owns a hypothetical
    // active sub-of-sub. The done sub itself must vanish (strict rule
    // for kind=subagent); the active grandchild orphans upward.
    const sessions = "/home/test/.cursor/sessions";
    const fs = makeFs({
      [sessions]: ["parent.json", "done-sub.json", "live-grandchild.json"],
      [`${sessions}/parent.json`]: JSON.stringify({
        sessionId: "parent",
        model: "claude-opus-4.7",
        status: "running",
      }),
      [`${sessions}/done-sub.json`]: JSON.stringify({
        sessionId: "done-sub",
        parentId: "parent",
        subagentType: "explore",
        status: "done",
      }),
      [`${sessions}/live-grandchild.json`]: JSON.stringify({
        sessionId: "live-grandchild",
        parentId: "done-sub",
        subagentType: "impl",
        status: "running",
      }),
    });
    const collector = createCollector({
      psRunner: async () => "",
      fs,
      platform: "linux",
      homeDir: "/home/test",
    });
    const snap = await collector.collect();
    expect(snap.nodes["done-sub"]).toBeUndefined();
    expect(snap.nodes["parent"]).toBeDefined();
  });

  it("re-parents transcript chat sessions under the Cursor IDE PID root", async () => {
    // ps lists one Cursor IDE main process. The transcript record below
    // has no PID (Cursor never writes one), but the collector must hang
    // it under pid:100 so the user sees subagents nested inside the IDE.
    const projects = "/home/test/.cursor/projects";
    const workspaceSlug = "home-andrewv-git-cursor-zoto-agents";
    const chatUuid = "00000000-1111-2222-3333-444444444444";
    const subUuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const transcriptDir = `${projects}/${workspaceSlug}/agent-transcripts`;
    const chatDir = `${transcriptDir}/${chatUuid}`;
    const chatFile = `${chatDir}/${chatUuid}.jsonl`;
    const subDir = `${chatDir}/subagents`;
    const subFile = `${subDir}/${subUuid}.jsonl`;
    const now = Date.now();
    const dir = (entries: string[]) => ({ entries, isDir: true });
    const file = () => ({ entries: [] as string[], isDir: false });
    const tree: Record<string, { entries: string[]; isDir: boolean }> = {
      [projects]: dir([workspaceSlug]),
      [`${projects}/${workspaceSlug}`]: dir(["agent-transcripts"]),
      [transcriptDir]: dir([chatUuid]),
      [chatDir]: dir([`${chatUuid}.jsonl`, "subagents"]),
      [chatFile]: file(),
      [subDir]: dir([`${subUuid}.jsonl`]),
      [subFile]: file(),
    };
    const fs: FsLike = {
      readdir: async (path) => tree[path]?.entries ?? [],
      readFile: async () => "",
      readWindow: async () => Buffer.alloc(100),
      stat: async (path) => {
        const node = tree[path];
        const isDir = !!node?.isDir;
        const isFile = !!node && !node.isDir;
        return {
          isDirectory: () => isDir,
          isFile: () => isFile,
          mtimeMs: now,
          size: 100,
        };
      },
      exists: async (path) => path in tree,
    };
    const collector = createCollector({
      psRunner: async () =>
        [
          `100 1 02:00 /Applications/Cursor.app/Contents/MacOS/Cursor /home/andrewv/git/cursor/zoto-agents`,
        ].join("\n"),
      fs,
      platform: "linux",
      homeDir: "/home/test",
    });
    const snap = await collector.collect();
    expect(snap.nodes["pid:100"]).toBeDefined();
    expect(snap.nodes[chatUuid]).toBeDefined();
    expect(snap.nodes[chatUuid]!.parentId).toBe("pid:100");
    expect(snap.nodes["pid:100"]!.children).toContain(chatUuid);
    expect(snap.nodes[subUuid]).toBeDefined();
    expect(snap.nodes[subUuid]!.parentId).toBe(chatUuid);
    expect(snap.roots).not.toContain(chatUuid);
  });

  it("discovers a new transcript on the next fast-lane tick", async () => {
    const projects = "/home/test/.cursor/projects";
    const workspaceSlug = "home-andrewv-git-cursor-zoto-agents";
    const firstUuid = "00000000-1111-2222-3333-444444444444";
    const newUuid = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
    const transcriptDir = `${projects}/${workspaceSlug}/agent-transcripts`;
    const now = Date.now();
    const dir = (entries: string[]) => ({ entries, isDir: true });
    const file = () => ({ entries: [] as string[], isDir: false });
    const tree: Record<string, { entries: string[]; isDir: boolean }> = {
      [projects]: dir([workspaceSlug]),
      [`${projects}/${workspaceSlug}`]: dir(["agent-transcripts"]),
      [transcriptDir]: dir([firstUuid]),
      [`${transcriptDir}/${firstUuid}`]: dir([`${firstUuid}.jsonl`]),
      [`${transcriptDir}/${firstUuid}/${firstUuid}.jsonl`]: file(),
    };
    const fs: FsLike = {
      readdir: async (path) => tree[path]?.entries ?? [],
      readFile: async () => "",
      readWindow: async () => Buffer.alloc(0),
      stat: async (path) => {
        const node = tree[path];
        const isDir = !!node?.isDir;
        const isFile = !!node && !node.isDir;
        return {
          isDirectory: () => isDir,
          isFile: () => isFile,
          mtimeMs: now,
          size: isFile ? 0 : 100,
        };
      },
      exists: async (path) => path in tree,
    };
    const collector = createCollector({
      psRunner: async () =>
        `100 1 02:00 /Applications/Cursor.app/Contents/MacOS/Cursor /home/andrewv/git/cursor/zoto-agents`,
      fs,
      platform: "linux",
      homeDir: "/home/test",
      withLogs: true,
      cursorOnly: true,
    });

    const snap1 = await collector.collect();
    expect(snap1.nodes[firstUuid]).toBeDefined();
    expect(snap1.nodes[newUuid]).toBeUndefined();

    tree[transcriptDir] = dir([firstUuid, newUuid]);
    tree[`${transcriptDir}/${newUuid}`] = dir([`${newUuid}.jsonl`]);
    tree[`${transcriptDir}/${newUuid}/${newUuid}.jsonl`] = file();

    const snap2 = await collector.collect();
    expect(snap2.nodes[newUuid]).toBeDefined();
  });

  it("--with-logs keeps transcript-backed chats before the first log line", async () => {
    const projects = "/home/test/.cursor/projects";
    const workspaceSlug = "home-andrewv-git-cursor-zoto-agents";
    const chatUuid = "00000000-1111-2222-3333-444444444444";
    const transcriptDir = `${projects}/${workspaceSlug}/agent-transcripts`;
    const chatDir = `${transcriptDir}/${chatUuid}`;
    const chatFile = `${chatDir}/${chatUuid}.jsonl`;
    const now = Date.now();
    const dir = (entries: string[]) => ({ entries, isDir: true });
    const file = () => ({ entries: [] as string[], isDir: false });
    const tree: Record<string, { entries: string[]; isDir: boolean }> = {
      [projects]: dir([workspaceSlug]),
      [`${projects}/${workspaceSlug}`]: dir(["agent-transcripts"]),
      [transcriptDir]: dir([chatUuid]),
      [chatDir]: dir([`${chatUuid}.jsonl`]),
      [chatFile]: file(),
    };
    const fs: FsLike = {
      readdir: async (path) => tree[path]?.entries ?? [],
      readFile: async () => "",
      readWindow: async () => Buffer.alloc(0),
      stat: async (path) => {
        const node = tree[path];
        const isDir = !!node?.isDir;
        const isFile = !!node && !node.isDir;
        return {
          isDirectory: () => isDir,
          isFile: () => isFile,
          mtimeMs: now,
          size: 0,
        };
      },
      exists: async (path) => path in tree,
    };
    const collector = createCollector({
      withLogs: true,
      cursorOnly: true,
      psRunner: async () =>
        `100 1 02:00 /Applications/Cursor.app/Contents/MacOS/Cursor /home/andrewv/git/cursor/zoto-agents`,
      fs,
      platform: "linux",
      homeDir: "/home/test",
    });
    const snap = await collector.collect();
    expect(snap.nodes[chatUuid]).toBeDefined();
    expect(snap.nodes[chatUuid]!.recentLogs).toEqual([]);
  });

  it("does not deadlock when many nodes resolve repo URLs under low fsConcurrency", async () => {
    const N = 40;
    const sessions = "/home/test/.cursor/sessions";
    const tree: Record<string, string | string[]> = {};
    const sessionFiles: string[] = [];
    for (let i = 0; i < N; i++) {
      const id = `agent-${i}`;
      const proj = `/home/test/proj-${i}`;
      sessionFiles.push(`${id}.json`);
      tree[`${sessions}/${id}.json`] = JSON.stringify({
        sessionId: id,
        status: "running",
        repo: proj,
      });
      tree[proj] = [];
      tree[`${proj}/.git/config`] =
        `[remote "origin"]\nurl = https://github.com/org/repo-${i}.git\n`;
    }
    tree[sessions] = sessionFiles;

    const collector = createCollector({
      psRunner: async () => "",
      fs: makeFs(tree),
      withLogs: false,
      activeOnly: false,
      cursorOnly: false,
      fsConcurrency: 2,
      homeDir: "/home/test",
      platform: "linux",
    });

    const snap = await Promise.race([
      collector.collect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("collect timed out")), 5000),
      ),
    ]);
    expect(Object.keys(snap.nodes).length).toBe(N);
  });

  it("--no-active-only surfaces done sessions for post-mortem inspection", async () => {
    const sessions = "/home/test/.cursor/sessions";
    const fs = makeFs({
      [sessions]: ["alive.json", "done-leaf.json"],
      [`${sessions}/alive.json`]: JSON.stringify({
        sessionId: "alive",
        model: "claude-opus-4.7",
        status: "running",
      }),
      [`${sessions}/done-leaf.json`]: JSON.stringify({
        sessionId: "done-leaf",
        model: "claude-opus-4.7",
        status: "completed",
      }),
    });
    const collector = createCollector({
      activeOnly: false,
      psRunner: async () => "",
      fs,
      platform: "linux",
      homeDir: "/home/test",
    });
    const snap = await collector.collect();
    expect(Object.keys(snap.nodes).sort()).toEqual(["alive", "done-leaf"]);
  });

  it("reads activeOnly from opts on each collect so the TUI can toggle mid-session", async () => {
    const sessions = "/home/test/.cursor/sessions";
    const fs = makeFs({
      [sessions]: ["alive.json", "done-leaf.json"],
      [`${sessions}/alive.json`]: JSON.stringify({
        sessionId: "alive",
        model: "claude-opus-4.7",
        status: "running",
      }),
      [`${sessions}/done-leaf.json`]: JSON.stringify({
        sessionId: "done-leaf",
        model: "claude-opus-4.7",
        status: "done",
      }),
    });
    const opts = {
      activeOnly: true,
      psRunner: async () => "",
      fs,
      platform: "linux" as const,
      homeDir: "/home/test",
    };
    const collector = createCollector(opts);
    const pruned = await collector.collect();
    expect(Object.keys(pruned.nodes)).toEqual(["alive"]);

    opts.activeOnly = false;
    const full = await collector.collect();
    expect(Object.keys(full.nodes).sort()).toEqual(["alive", "done-leaf"]);
  });
});
