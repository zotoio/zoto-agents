import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  assert.equal(cursor.version, "0.7.0");
  for (const p of [".claude-plugin/plugin.json", "plugin.json", "package.json"]) {
    assert.equal(json(p).version, cursor.version, p);
  }
  assert.equal(json(".claude-plugin/plugin.json").name, cursor.name);
  assert.equal(json("plugin.json").name, cursor.name);
  assert.equal(cursor.mcp, "./mcp.json");
  assert.equal(cursor.skills, "./skills/");
});

test("chained-workflows reference documents full lifecycle, canary A/B testing, and 24h quotas", () => {
  const refPath = join(root, "skills/botz-mcp/references/chained-workflows.md");
  assert.ok(existsSync(refPath), "chained-workflows.md exists");
  const ref = readFileSync(refPath, "utf8");
  assert.match(ref, /search.*select.*use.*feedback/i);
  assert.match(ref, /skill_evolve/);
  assert.match(ref, /skill_fork/);
  assert.match(ref, /skill_request/);
  assert.match(ref, /@canary/);
  assert.match(ref, /@live/);
  assert.match(ref, /sampling\/createMessage/);
  assert.match(ref, /skill_promote/);
  assert.match(ref, /generation_quota_24h_exceeded/);

  const skill = readFileSync(join(root, "skills/botz-mcp/SKILL.md"), "utf8");
  assert.match(skill, /references\/chained-workflows\.md/);
  assert.match(skill, /version: 9/);
  assert.match(skill, /botz:\/\/\{org\}\/\{catalogue\}\/skill/);
});
