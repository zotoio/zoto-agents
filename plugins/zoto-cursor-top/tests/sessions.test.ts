import { describe, expect, it } from "vitest";
import {
  readSessionRecords,
  readTranscriptRecords,
  recordFromJson,
} from "../src/discovery/sessions.js";
import type { FsLike } from "../src/types.js";

describe("recordFromJson", () => {
  it("extracts standard fields", () => {
    const rec = recordFromJson(
      {
        id: "abc",
        model: "claude-opus-4.7",
        repository: "/home/dev/proj",
        title: "fix bug",
        startedAt: "2026-05-16T05:00:00Z",
        status: "running",
        pid: 4242,
      },
      "/tmp/file.json",
      "ide",
    );
    expect(rec).not.toBeNull();
    expect(rec!.id).toBe("abc");
    expect(rec!.model).toBe("claude-opus-4.7");
    expect(rec!.repo).toBe("/home/dev/proj");
    expect(rec!.pid).toBe(4242);
    expect(rec!.status).toBe("running");
    expect(rec!.kind).toBe("ide");
  });

  it("marks records with parentId as subagents", () => {
    const rec = recordFromJson(
      {
        id: "child",
        parentId: "parent",
        subagentType: "explore",
        startedAt: 1_700_000_000_000,
      },
      "/tmp/file.json",
      "ide",
    );
    expect(rec!.kind).toBe("subagent");
    expect(rec!.label).toBe("Task(explore)");
    expect(rec!.parentId).toBe("parent");
  });

  it("normalises non-standard statuses", () => {
    // Inputs include a strong key (`sessionId`) so the positive-id
    // guard in recordFromJson lets them through. The test asserts the
    // status-normalisation behaviour, not the guard itself.
    const a = recordFromJson(
      { sessionId: "a", state: "in_progress" },
      "/x.json",
      "cli",
    );
    const b = recordFromJson(
      { sessionId: "b", status: "Failed" },
      "/x.json",
      "cli",
    );
    expect(a!.status).toBe("running");
    expect(b!.status).toBe("error");
  });

  it("returns null for malformed input", () => {
    expect(recordFromJson(null, "/x.json", "ide")).toBeNull();
    expect(recordFromJson("string", "/x.json", "ide")).toBeNull();
  });

  it("rejects JSON blobs that look nothing like a session (no strong keys)", () => {
    // VS Code local-history snapshot — has `name`/`version` but no
    // session identifiers. Must be rejected to avoid the ghost rows.
    const localHistory = recordFromJson(
      {
        name: "x-fidelity-vscode",
        version: "1.2.3",
        files: ["src/index.ts"],
      },
      "/home/u/.config/Cursor/User/History/abc/Rjqu.json",
      "ide",
    );
    expect(localHistory).toBeNull();

    // MCP tool descriptor — has `description` but no session keys.
    const mcpTool = recordFromJson(
      { description: "create a new automation", parameters: [] },
      "/home/u/.cursor/projects/ws/mcps/srv/tools/create_automation.json",
      "cloud",
    );
    expect(mcpTool).toBeNull();
  });
});

describe("readSessionRecords", () => {
  it("walks JSON and JSONL files via the FsLike adapter", async () => {
    const tree: Record<string, string | string[]> = {
      "/root": ["a.json", "sub"],
      "/root/sub": ["b.jsonl"],
      "/root/a.json": JSON.stringify({
        id: "root-1",
        model: "claude-opus-4.7",
        repository: "/repo",
        startedAt: 1_700_000_000_000,
        status: "running",
      }),
      "/root/sub/b.jsonl": [
        JSON.stringify({ id: "sub-1", parentId: "root-1", subagentType: "explore" }),
        JSON.stringify({ id: "sub-2", parentId: "root-1", subagentType: "impl" }),
      ].join("\n"),
    };

    const fs: FsLike = {
      readdir: async (path) => {
        const v = tree[path];
        return Array.isArray(v) ? v : [];
      },
      readFile: async (path, _enc) => {
        const v = tree[path];
        if (typeof v === "string") return v;
        throw new Error(`no file: ${path}`);
      },
      stat: async (path) => {
        const v = tree[path];
        const isDir = Array.isArray(v);
        return {
          isDirectory: () => isDir,
          isFile: () => !isDir,
          mtimeMs: 0,
          size: typeof v === "string" ? v.length : 0,
        };
      },
      exists: async (path) => path in tree,
    };

    const diagnostics: string[] = [];
    const records = await readSessionRecords(fs, ["/root"], "ide", diagnostics);
    const ids = records.map((r) => r.id).sort();
    expect(ids).toEqual(["root-1", "sub-1", "sub-2"]);
    const sub = records.find((r) => r.id === "sub-1")!;
    expect(sub.parentId).toBe("root-1");
    expect(sub.label).toBe("Task(explore)");
  });

  it("emits a 'missing' diagnostic when a configured root does not exist", async () => {
    const fs: FsLike = {
      readdir: async () => [],
      readFile: async () => "",
      stat: async () => ({
        isDirectory: () => false,
        isFile: () => false,
        mtimeMs: 0,
        size: 0,
      }),
      exists: async () => false,
    };
    const diagnostics: string[] = [];
    const records = await readSessionRecords(
      fs,
      ["/no/such/root"],
      "cli",
      diagnostics,
    );
    expect(records).toEqual([]);
    expect(
      diagnostics.some((d) => d.includes("missing: /no/such/root (kind=cli)")),
    ).toBe(true);
  });
});

describe("readTranscriptRecords", () => {
  it("emits one record per transcript file with parent/subagent wiring", async () => {
    const root = "/home/u/.cursor/projects/ws/agent-transcripts";
    const parentUuid = "00000000-1111-2222-3333-444444444444";
    const subUuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const parentDir = `${root}/${parentUuid}`;
    const parentFile = `${parentDir}/${parentUuid}.jsonl`;
    const subDir = `${parentDir}/subagents`;
    const subFile = `${subDir}/${subUuid}.jsonl`;

    const tree: Record<string, { kind: "dir"; entries: string[] } | { kind: "file" }> = {
      [root]: { kind: "dir", entries: [parentUuid] },
      [parentDir]: { kind: "dir", entries: [`${parentUuid}.jsonl`, "subagents"] },
      [parentFile]: { kind: "file" },
      [subDir]: { kind: "dir", entries: [`${subUuid}.jsonl`] },
      [subFile]: { kind: "file" },
    };
    const fs: FsLike = {
      readdir: async (path) => {
        const node = tree[path];
        return node?.kind === "dir" ? node.entries : [];
      },
      readFile: async () => "",
      stat: async (path) => {
        const node = tree[path];
        const isDir = node?.kind === "dir";
        const isFile = node?.kind === "file";
        return {
          isDirectory: () => isDir,
          isFile: () => isFile,
          mtimeMs: 1_700_000_000_000,
          size: 100,
        };
      },
      exists: async (path) => path in tree,
    };

    const diagnostics: string[] = [];
    const records = await readTranscriptRecords(fs, [root], diagnostics);
    const byId = new Map(records.map((r) => [r.id, r]));
    expect(byId.size).toBe(2);
    expect(byId.get(parentUuid)).toMatchObject({
      kind: "agent",
      parentId: null,
      logPath: parentFile,
      repo: "ws",
    });
    expect(byId.get(subUuid)).toMatchObject({
      kind: "subagent",
      parentId: parentUuid,
      logPath: subFile,
      label: "Task",
    });
    expect(diagnostics).toEqual([]);
  });

  it("diagnoses a missing transcript root", async () => {
    const fs: FsLike = {
      readdir: async () => [],
      readFile: async () => "",
      stat: async () => ({
        isDirectory: () => false,
        isFile: () => false,
        mtimeMs: 0,
        size: 0,
      }),
      exists: async () => false,
    };
    const diagnostics: string[] = [];
    const records = await readTranscriptRecords(fs, ["/no/such/root"], diagnostics);
    expect(records).toEqual([]);
    expect(
      diagnostics.some((d) => d.includes("missing: /no/such/root (kind=transcript)")),
    ).toBe(true);
  });
});
