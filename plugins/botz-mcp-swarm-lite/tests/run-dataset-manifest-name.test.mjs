import assert from "node:assert/strict";
import test from "node:test";

import { safeManifestName } from "../skills/mcp-swarm-lite-report/scripts/run-dataset.mjs";

test("AGENTS-03 manifestName is sanitised before path join", () => {
  assert.equal(safeManifestName("my-suite_v2"), "my-suite_v2");
  for (const bad of ["../../x", "a/b", "..", ".", "", "/etc", "a b", null, 42, "x".repeat(129)]) {
    assert.equal(safeManifestName(bad), null, String(bad));
  }
});
