import { describe, expect, it } from "vitest";
import { createCollector } from "../src/discovery/collector.js";
import type { FsLike } from "../src/types.js";

const emptyFs: FsLike = {
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
});
