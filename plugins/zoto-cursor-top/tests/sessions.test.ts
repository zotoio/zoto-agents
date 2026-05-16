import { describe, expect, it } from "vitest";
import { recordFromJson, readSessionRecords } from "../src/discovery/sessions.js";
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
    const a = recordFromJson(
      { id: "a", state: "in_progress" },
      "/x.json",
      "cli",
    );
    const b = recordFromJson({ id: "b", status: "Failed" }, "/x.json", "cli");
    expect(a!.status).toBe("running");
    expect(b!.status).toBe("error");
  });

  it("returns null for malformed input", () => {
    expect(recordFromJson(null, "/x.json", "ide")).toBeNull();
    expect(recordFromJson("string", "/x.json", "ide")).toBeNull();
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
});
