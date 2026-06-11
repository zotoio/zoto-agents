import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { defaultBinDir, symlinkCursorTop } from "../scripts/symlink-binary.mjs";

describe("symlink-binary.mjs", () => {
  it("defaultBinDir resolves to ~/.local/bin", () => {
    expect(defaultBinDir()).toMatch(/\.local\/bin$/);
  });

  it("symlinkCursorTop creates ~/.local/bin/cursor-top when binary exists", () => {
    const scratch = mkdtempSync(join(tmpdir(), "cursor-top-symlink-"));
    const binDir = join(scratch, "bin");
    const fakeInstall = join(scratch, "install", "bin", "cursor-top.mjs");
    try {
      mkdirSync(join(scratch, "install", "bin"), { recursive: true });
      writeFileSync(fakeInstall, "#!/usr/bin/env node\n", "utf-8");
      const result = symlinkCursorTop(fakeInstall, { binDir });
      expect(result.ok).toBe(true);
      const linkPath = join(binDir, "cursor-top");
      expect(existsSync(linkPath)).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("symlinkCursorTop replaces an existing symlink", () => {
    const scratch = mkdtempSync(join(tmpdir(), "cursor-top-symlink-"));
    const binDir = join(scratch, "path-bin");
    const first = join(scratch, "first", "bin", "cursor-top.mjs");
    const second = join(scratch, "second", "bin", "cursor-top.mjs");
    try {
      mkdirSync(join(scratch, "first", "bin"), { recursive: true });
      mkdirSync(join(scratch, "second", "bin"), { recursive: true });
      writeFileSync(first, "#!/usr/bin/env node\n", "utf-8");
      writeFileSync(second, "#!/usr/bin/env node\n", "utf-8");
      symlinkCursorTop(first, { binDir });
      const result = symlinkCursorTop(second, { binDir });
      expect(result.ok).toBe(true);
      expect(result.target).toBe(second);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("symlinkCursorTop returns binary-missing when target absent", () => {
    const result = symlinkCursorTop("/nonexistent/cursor-top.mjs", {
      binDir: mkdtempSync(join(tmpdir(), "cursor-top-missing-")),
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("binary-missing");
  });
});
