import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { splitLines, tailFile } from "../src/discovery/logs.js";

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
