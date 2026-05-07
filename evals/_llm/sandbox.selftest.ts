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
  diffRepoSnapshots,
  materializeFixtures,
  mutationsOutsidePrefixes,
  snapshotRepo,
  snapshotSandbox,
  verifyExpectedFilesystem,
} from "./sandbox.js";

function main(): void {
  const repo = mkdtempSync(join(tmpdir(), "zoto-eval-repo-"));
  writeFileSync(join(repo, "a.txt"), "1", "utf-8");

  const before = snapshotRepo(repo, []);
  writeFileSync(join(repo, "b.txt"), "2", "utf-8");
  writeFileSync(join(repo, "a.txt"), "3", "utf-8");
  const after = snapshotRepo(repo, []);
  const d = diffRepoSnapshots(before, after);
  assert.ok(d.added.includes("b.txt"));
  assert.ok(d.modified.includes("a.txt"));

  const v = mutationsOutsidePrefixes(d, ["never-match"]);
  assert.ok(v.includes("a.txt") || v.includes("b.txt"));

  const h = createSandbox("selftest-run", "case-1");
  materializeFixtures(
    h,
    { files: [{ path: "x/y.txt", content: "hello" }] },
    repo,
  );
  const sb0 = snapshotSandbox(h);
  writeFileSync(join(h.rootDir, "x", "y.txt"), "hello!", "utf-8");
  const sb1 = snapshotSandbox(h);
  const fsr = verifyExpectedFilesystem(h, sb0, sb1, {
    modified: ["x/y.txt"],
  });
  assert.equal(fsr.passed, true);

  console.log(JSON.stringify({ ok: true }));
}

main();
