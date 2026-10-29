import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { assertSafeRunId, createSandbox, resolveFixtureSource } from "../engine/sandbox.js";

describe("AGENTS-02 sandbox path safety", () => {
  it("rejects unsafe runIds", () => {
    for (const bad of ["../x", "..", ".", "a/b", "", "x".repeat(129), "a b"]) {
      expect(() => assertSafeRunId(bad)).toThrow(/unsafe eval runId/);
      expect(() => createSandbox(bad, 1)).toThrow();
    }
    expect(assertSafeRunId("run-2026.10_29")).toBe("run-2026.10_29");
  });

  it("creates sandboxes under tmp/zoto-eval for safe ids", () => {
    const h = createSandbox("sec-test-run", "case 1");
    expect(h.rootDir.startsWith(join(tmpdir(), "zoto-eval"))).toBe(true);
  });

  it("keeps fixtures.from inside the repo root", () => {
    const root = mkdtempSync(join(tmpdir(), "zoto-sec-"));
    mkdirSync(join(root, "fx"));
    writeFileSync(join(root, "fx", "a.txt"), "ok");
    expect(resolveFixtureSource(root, "fx/a.txt")).toBe(join(root, "fx", "a.txt"));
    for (const bad of ["../../etc/passwd", "/etc/passwd", "fx/../../x", "C:/x"]) {
      expect(() => resolveFixtureSource(root, bad)).toThrow(/escapes repo root/);
    }
    const outside = mkdtempSync(join(tmpdir(), "zoto-out-"));
    writeFileSync(join(outside, "secret.env"), "S=1");
    symlinkSync(join(outside, "secret.env"), join(root, "link.env"));
    expect(() => resolveFixtureSource(root, "link.env")).toThrow(/symlink escapes/);
  });
});
