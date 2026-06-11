import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractMessageSnippets,
  finalizeMessageSnippets,
  formatUserPromptText,
  splitLines,
  stripRedactionMarkers,
  tailFile,
  tailJsonlMessages,
} from "../src/discovery/logs.js";

describe("splitLines", () => {
  it("returns the last N non-empty trimmed lines", () => {
    const input = "alpha\nbeta\n\n  gamma  \ndelta\n";
    expect(splitLines(input, 3)).toEqual(["beta", "gamma", "delta"]);
  });
  it("strips ANSI colour codes", () => {
    const coloured = "\x1B[31mred\x1B[0m\nplain\n";
    expect(splitLines(coloured, 2)).toEqual(["red", "plain"]);
  });
  it("handles fewer lines than requested", () => {
    expect(splitLines("only\n", 5)).toEqual(["only"]);
  });
});

describe("tailFile", () => {
  it("reads the last N lines from disk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cursor-top-log-"));
    const file = join(dir, "log.txt");
    writeFileSync(file, ["one", "two", "three", "four", "five"].join("\n") + "\n");
    const tail = await tailFile(file, 2);
    expect(tail).toEqual(["four", "five"]);
  });
  it("returns an empty list when the file does not exist", async () => {
    const tail = await tailFile("/nonexistent/path/log.txt", 3);
    expect(tail).toEqual([]);
  });
});

describe("extractMessageSnippets", () => {
  it("flattens role + first text-content block per JSONL line", () => {
    const lines = [
      // First line is intentionally truncated — extractMessageSnippets
      // drops the leading line on principle because the trailing-window
      // tailer can land mid-record.
      "{partial",
      JSON.stringify({
        role: "user",
        message: { content: [{ type: "text", text: "hello world" }] },
      }),
      JSON.stringify({
        role: "assistant",
        message: {
          content: [
            { type: "text", text: "  reading the file\n  now" },
            { type: "tool_use", text: "" },
          ],
        },
      }),
      JSON.stringify({
        role: "assistant",
        message: { content: [{ type: "tool_use", text: "" }] },
      }),
    ].join("\n");
    const out = extractMessageSnippets(lines, 5);
    expect(out).toEqual([
      "user: hello world",
      "assistant: reading the file now",
    ]);
  });

  it("strips [REDACTED] markers and surfaces tool_use summaries", () => {
    const lines = [
      "{partial",
      JSON.stringify({
        role: "assistant",
        message: {
          content: [
            {
              type: "text",
              text: "Investigating the bug.\n\n[REDACTED]",
            },
            {
              type: "tool_use",
              name: "Read",
              input: { path: "/home/dev/proj/src/foo.ts" },
            },
            {
              type: "tool_use",
              name: "Grep",
              input: { pattern: "MODEL|repo" },
            },
          ],
        },
      }),
      JSON.stringify({
        role: "assistant",
        message: {
          content: [
            { type: "text", text: "[REDACTED]" },
            {
              type: "tool_use",
              name: "Shell",
              input: { command: "pnpm test" },
            },
          ],
        },
      }),
    ].join("\n");
    const out = extractMessageSnippets(lines, 5);
    expect(out[0]).toMatch(/^assistant: Investigating the bug\. → Read/);
    expect(out[0]).toContain("Grep MODEL|repo");
    expect(out[1]).toBe("assistant: Shell pnpm test");
  });

  it("keeps the newest user prompt when assistant lines fill the tail", () => {
    const lines = [
      "{garbage}",
      JSON.stringify({
        role: "user",
        message: { content: [{ type: "text", text: "ship the feature" }] },
      }),
      ...["a", "b", "c"].map((s) =>
        JSON.stringify({
          role: "assistant",
          message: { content: [{ type: "text", text: s }] },
        }),
      ),
    ].join("\n");
    expect(extractMessageSnippets(lines, 2)).toEqual([
      "user: ship the feature",
      "assistant: c",
    ]);
  });

  it("unwraps <user_query> blocks in user messages", () => {
    const lines = [
      "{partial",
      JSON.stringify({
        role: "user",
        message: {
          content: [
            {
              type: "text",
              text: "<user_query>\nhello there\n</user_query>",
            },
          ],
        },
      }),
    ].join("\n");
    expect(extractMessageSnippets(lines, 1)).toEqual(["user: hello there"]);
  });

  it("returns the last N snippets when more events are present", () => {
    const lines = [
      "{garbage}",
      ...["a", "b", "c", "d"].map((s) =>
        JSON.stringify({
          role: "assistant",
          message: { content: [{ type: "text", text: s }] },
        }),
      ),
    ].join("\n");
    expect(extractMessageSnippets(lines, 2)).toEqual([
      "assistant: c",
      "assistant: d",
    ]);
  });
});

describe("tailJsonlMessages", () => {
  it("reads the last N messages from a transcript file", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cursor-top-transcript-"));
    const file = join(dir, "abc.jsonl");
    const lines = [
      "{partial-truncated",
      JSON.stringify({
        role: "user",
        message: { content: [{ type: "text", text: "first" }] },
      }),
      JSON.stringify({
        role: "assistant",
        message: { content: [{ type: "text", text: "second" }] },
      }),
      JSON.stringify({
        role: "assistant",
        message: { content: [{ type: "text", text: "third" }] },
      }),
    ];
    writeFileSync(file, lines.join("\n") + "\n");
    const tail = await tailJsonlMessages(file, 2);
    expect(tail).toEqual(["user: first", "assistant: third"]);
  });

  it("returns [] for a missing file", async () => {
    expect(await tailJsonlMessages("/no/such/transcript.jsonl", 3)).toEqual([]);
  });
});

describe("finalizeMessageSnippets", () => {
  it("injects the latest user line when it would fall outside a short tail", () => {
    expect(
      finalizeMessageSnippets(
        ["user: one", "assistant: two", "assistant: three"],
        2,
      ),
    ).toEqual(["user: one", "assistant: three"]);
  });
});

describe("formatUserPromptText", () => {
  it("extracts inner text from user_query wrappers", () => {
    expect(formatUserPromptText("<user_query>\nhi\n</user_query>")).toBe("hi");
  });
});

describe("stripRedactionMarkers", () => {
  it("removes [REDACTED] placeholders and collapses whitespace", () => {
    expect(stripRedactionMarkers("hello\n\n[REDACTED]")).toBe("hello");
    expect(stripRedactionMarkers("[REDACTED]")).toBe("");
  });
});
