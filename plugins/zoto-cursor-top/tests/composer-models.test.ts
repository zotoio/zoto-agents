import { describe, expect, it, vi } from "vitest";
import {
  buildComposerDataSql,
  buildComposerModelSql,
  parseComposerDataOutput,
  parseComposerModelOutput,
  readComposerData,
  readComposerModels,
  resolveStateDbPath,
  type ComposerModelRunner,
} from "../src/discovery/composer-models.js";

describe("parseComposerDataOutput", () => {
  it("parses id|model|tokens triples", () => {
    const out = parseComposerDataOutput(
      "chat-1|claude-opus-4-7|94613\nsub-1|composer-2.5-fast|3100\n",
    );
    expect(out.get("chat-1")).toEqual({
      model: "claude-opus-4-7",
      tokenUsage: 94613,
    });
    expect(out.get("sub-1")).toEqual({
      model: "composer-2.5-fast",
      tokenUsage: 3100,
    });
  });

  it("accepts token-only rows when model is a placeholder", () => {
    const out = parseComposerDataOutput("chat-1|default|45200\n");
    expect(out.get("chat-1")).toEqual({ model: null, tokenUsage: 45200 });
  });

  it("accepts legacy id|model pairs without tokens", () => {
    const out = parseComposerDataOutput("chat-1|claude-opus-4-7\n");
    expect(out.get("chat-1")).toEqual({
      model: "claude-opus-4-7",
      tokenUsage: null,
    });
  });
});

describe("parseComposerModelOutput", () => {
  it("parses pipe-separated id/model pairs", () => {
    const out = parseComposerModelOutput(
      [
        "c95e1e4c-0e2c-48fd-a6d2-fa26ddfd0f6b|claude-opus-4-7",
        "51bf7a43-f04c-4735-a882-6621370e0b91|composer-2.5-fast",
      ].join("\n"),
    );
    expect(out.size).toBe(2);
    expect(out.get("c95e1e4c-0e2c-48fd-a6d2-fa26ddfd0f6b")).toBe(
      "claude-opus-4-7",
    );
    expect(out.get("51bf7a43-f04c-4735-a882-6621370e0b91")).toBe(
      "composer-2.5-fast",
    );
  });

  it("ignores blank lines and lines without a separator", () => {
    const out = parseComposerModelOutput(
      ["", "abc|claude", "no-pipe-here", "   ", "def|composer-2.5"].join("\n"),
    );
    expect([...out.entries()]).toEqual([
      ["abc", "claude"],
      ["def", "composer-2.5"],
    ]);
  });

  it("drops rows whose id or model is empty", () => {
    const out = parseComposerModelOutput(
      ["|claude", "abc|", "|", "def|gpt-5.5"].join("\n"),
    );
    expect([...out.entries()]).toEqual([["def", "gpt-5.5"]]);
  });

  it("drops placeholder picker values such as default", () => {
    const out = parseComposerModelOutput(
      ["chat-1|default", "chat-2|composer-2.5-fast"].join("\n"),
    );
    expect([...out.entries()]).toEqual([["chat-2", "composer-2.5-fast"]]);
  });
});

describe("resolveStateDbPath", () => {
  it("appends User/globalStorage/state.vscdb to the data root", () => {
    expect(resolveStateDbPath("/home/u/.config/Cursor")).toBe(
      "/home/u/.config/Cursor/User/globalStorage/state.vscdb",
    );
  });
});

describe("buildComposerDataSql", () => {
  it("extracts model and promptTokenBreakdown.totalUsedTokens", () => {
    const sql = buildComposerDataSql(["uuid-1"]);
    expect(sql).toContain("promptTokenBreakdown.totalUsedTokens");
    expect(sql).toContain("'composerData:uuid-1'");
  });
});

describe("buildComposerModelSql", () => {
  it("returns null when no safe ids are provided", () => {
    expect(buildComposerModelSql([])).toBeNull();
  });

  it("uses an inline IN clause keyed by composerData:<uuid>", () => {
    const sql = buildComposerModelSql([
      "c95e1e4c-0e2c-48fd-a6d2-fa26ddfd0f6b",
      "51bf7a43-f04c-4735-a882-6621370e0b91",
    ]);
    expect(sql).toContain(
      "'composerData:c95e1e4c-0e2c-48fd-a6d2-fa26ddfd0f6b'",
    );
    expect(sql).toContain(
      "'composerData:51bf7a43-f04c-4735-a882-6621370e0b91'",
    );
    expect(sql).toContain("key IN (");
    expect(sql).not.toContain("LIKE 'composerData:%'");
  });

  it("drops ids that contain unsafe characters", () => {
    const sql = buildComposerModelSql([
      "good-id-123",
      "bad'; DROP TABLE cursorDiskKV; --",
      "another\nbad\nid",
    ]);
    expect(sql).toContain("'composerData:good-id-123'");
    expect(sql).not.toContain("DROP");
    expect(sql).not.toContain("bad\n");
  });

  it("returns null when every id is unsafe", () => {
    expect(buildComposerModelSql(["evil'", "bad;", "\n"])).toBeNull();
  });
});

describe("readComposerData", () => {
  it("returns model and token usage from the runner output", async () => {
    const runner: ComposerModelRunner = async () =>
      "uuid-1|claude-opus-4-7|1200\n";
    const out = await readComposerData("/home/u/.config/Cursor", ["uuid-1"], {
      runner,
    });
    expect(out.get("uuid-1")).toEqual({
      model: "claude-opus-4-7",
      tokenUsage: 1200,
    });
  });
});

describe("readComposerModels", () => {
  it("invokes the runner with the resolved path and returns the parsed map", async () => {
    const runner: ComposerModelRunner = vi.fn(async ({ dbPath, sql }) => {
      expect(dbPath).toBe(
        "/home/u/.config/Cursor/User/globalStorage/state.vscdb",
      );
      expect(sql).toContain("'composerData:uuid-1'");
      expect(sql).toContain("'composerData:uuid-2'");
      return "uuid-1|claude-opus-4-7\nuuid-2|composer-2.5-fast\n";
    });
    const out = await readComposerModels(
      "/home/u/.config/Cursor",
      ["uuid-1", "uuid-2"],
      { runner },
    );
    expect(runner).toHaveBeenCalledOnce();
    expect(out.get("uuid-1")).toBe("claude-opus-4-7");
    expect(out.get("uuid-2")).toBe("composer-2.5-fast");
  });

  it("short-circuits without invoking the runner when the id list is empty", async () => {
    const runner = vi.fn(async () => "should-not-run");
    const out = await readComposerModels("/home/u/.config/Cursor", [], {
      runner,
      exists: async () => true,
    });
    expect(out.size).toBe(0);
    expect(runner).not.toHaveBeenCalled();
  });

  it("skips the runner when the db file does not exist", async () => {
    const runner = vi.fn(async () => "should-not-run");
    const out = await readComposerModels(
      "/home/u/.config/Cursor",
      ["uuid-1"],
      {
        runner,
        exists: async () => false,
      },
    );
    expect(out.size).toBe(0);
    expect(runner).not.toHaveBeenCalled();
  });

  it("returns an empty map when the runner throws (sqlite3 missing or locked)", async () => {
    const runner: ComposerModelRunner = async () => {
      throw new Error("ENOENT: sqlite3 not on $PATH");
    };
    const out = await readComposerModels(
      "/home/u/.config/Cursor",
      ["uuid-1"],
      { runner, exists: async () => true },
    );
    expect(out.size).toBe(0);
  });
});
