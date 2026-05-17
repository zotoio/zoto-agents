#!/usr/bin/env tsx
/**
 * Minimal regression checks for sandbox + repo snapshot diff (no @cursor/sdk).
 */
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createSandbox,
  diffSnapshots,
  prepareSandbox,
  snapshotRepo,
  snapshotDir,
  verifyExpectedFilesystemAgainstDiff,
} from "../../plugins/zoto-eval-system/engine/sandbox.js";

function main(): void {
  const repo = mkdtempSync(join(tmpdir(), "zoto-eval-repo-"));
  writeFileSync(join(repo, "a.txt"), "1", "utf-8");

  const before = snapshotRepo(repo, []);
  writeFileSync(join(repo, "b.txt"), "2", "utf-8");
  writeFileSync(join(repo, "a.txt"), "3", "utf-8");
  const after = snapshotRepo(repo, []);
  const d = diffSnapshots(before, after);
  assert.ok(d.added.includes("b.txt"));
  assert.ok(d.modified.includes("a.txt"));

  const h = createSandbox("selftest-run", "case-1");
  prepareSandbox(h.rootDir, {
    repoRoot: repo,
    allowMissingBaseline: true,
    fixtures: { files: [{ path: "x/y.txt", content: "hello" }] },
  });
  const sb0 = snapshotDir(h.rootDir);
  writeFileSync(join(h.rootDir, "x", "y.txt"), "hello!", "utf-8");
  const sb1 = snapshotDir(h.rootDir);
  const dd = diffSnapshots(sb0, sb1);
  const fsr = verifyExpectedFilesystemAgainstDiff(
    dd, sb0, sb1, { modified: ["x/y.txt"] },
  );
  assert.equal(fsr.failed, 0);

  console.log(JSON.stringify({ ok: true }));
}

main();
