import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";

import { describe, it } from "vitest";

const MONOREPO_ROOT = resolve(import.meta.dirname, "../../..");
const RUNNER = join(import.meta.dirname, "eval-stamp-jest.runner.ts");

describe(
  "eval-stamp-jest selftest",
  () => {
    it("passes hand-rolled suite", () => {
      execFileSync("pnpm", ["exec", "tsx", RUNNER], {
        cwd: MONOREPO_ROOT,
        encoding: "utf-8",
        stdio: "pipe",
        timeout: 120_000,
      });
    });
  },
  130_000,
);
