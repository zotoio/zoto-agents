import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const json = p => JSON.parse(readFileSync(join(root, p), "utf8"));

test("mcp.json points at the hosted OAuth endpoint with no static credentials", () => {
  for (const file of ["mcp.json", ".mcp.json"]) {
    const servers = json(file).mcpServers;
    assert.deepEqual(Object.keys(servers), ["botz"]);
    assert.equal(servers.botz.url, "https://mcp.botz.ai/mcp");
    const raw = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(raw, /headers|Authorization|Bearer|\$\{env:/i);
  }
});

test("manifests agree on name and version", () => {
  const cursor = json(".cursor-plugin/plugin.json");
  for (const p of [".claude-plugin/plugin.json", "plugin.json", "package.json"]) {
    assert.equal(json(p).version, cursor.version, p);
  }
  assert.equal(json(".claude-plugin/plugin.json").name, cursor.name);
  assert.equal(json("plugin.json").name, cursor.name);
  assert.equal(cursor.mcp, "./mcp.json");
  assert.equal(cursor.skills, "./skills/");
});
