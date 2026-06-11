import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ensureRuntimeDeps,
  needsRuntimeDeps,
} from "../scripts/install-runtime-deps.mjs";

describe("install-runtime-deps.mjs", () => {
  it("needsRuntimeDeps is true when package.json exists without react", () => {
    const scratch = mkdtempSync(join(tmpdir(), "cursor-top-deps-"));
    try {
      writeFileSync(
        join(scratch, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { react: "^19.0.0", ink: "^7.0.0" },
        }),
        "utf-8",
      );
      expect(needsRuntimeDeps(scratch)).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("needsRuntimeDeps is false when react is already installed", () => {
    const scratch = mkdtempSync(join(tmpdir(), "cursor-top-deps-"));
    try {
      writeFileSync(join(scratch, "package.json"), "{}", "utf-8");
      const reactDir = join(scratch, "node_modules", "react");
      mkdirSync(reactDir, { recursive: true });
      writeFileSync(join(reactDir, "package.json"), "{}", "utf-8");
      expect(needsRuntimeDeps(scratch)).toBe(false);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("ensureRuntimeDeps installs react and ink into an empty tree", () => {
    const scratch = mkdtempSync(join(tmpdir(), "cursor-top-deps-"));
    try {
      writeFileSync(
        join(scratch, "package.json"),
        JSON.stringify({
          name: "@zoto-agents/zoto-cursor-top",
          dependencies: { react: "^19.2.6", ink: "^7.0.3" },
        }),
        "utf-8",
      );
      const result = ensureRuntimeDeps(scratch, { silent: true });
      expect(result.installed).toBe(true);
      expect(existsSync(join(scratch, "node_modules", "react"))).toBe(true);
      expect(existsSync(join(scratch, "node_modules", "ink"))).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }, 120_000);
});
