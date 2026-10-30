import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const has = (p) => existsSync(new URL(`../${p}`, import.meta.url));
const skills = ["mcp-swarm-lite", "mcp-swarm-lite-analyse", "mcp-swarm-lite-compare", "mcp-swarm-lite-descriptions", "mcp-swarm-lite-diagnose", "mcp-swarm-lite-flow", "mcp-swarm-lite-guided", "mcp-swarm-lite-record-replay", "mcp-swarm-lite-report", "mcp-swarm-lite-server-updates", "mcp-swarm-lite-tags", "mcp-swarm-lite-upgrade"];

test("lite plugin ships no MCP server config", () => {
  assert.ok(!has("mcp.json"));
  assert.ok(!has(".mcp.json"));
  for (const mf of ["plugin.json", ".cursor-plugin/plugin.json", ".claude-plugin/plugin.json"]) {
    const j = JSON.parse(read(mf));
    assert.equal(j.name, "botz-mcp-swarm-lite", mf);
    assert.equal(j.mcp, undefined, mf);
  }
});

test("manifests are aligned at 0.1.0", () => {
  for (const mf of ["package.json", "plugin.json", ".cursor-plugin/plugin.json", ".claude-plugin/plugin.json"]) {
    assert.equal(JSON.parse(read(mf)).version, "0.1.0", mf);
  }
});

test("skills are local-only and pinned to CLI 0.15.0", () => {
  assert.deepEqual(readdirSync(new URL("../skills", import.meta.url)).sort(), skills);
  for (const name of skills) {
    const s = read(`skills/${name}/SKILL.md`);
    assert.match(s, new RegExp(`^name: ${name}$`, "m"), name);
    assert.match(s, /cli-version: "0\.15\.0"/, name);
    assert.doesNotMatch(s, /swarm\.botz\.ai|mcp-server:|--remote|--dispatch worker|mcp-swarm worker|swarm_[a-z_]+|bzt_/, name);
    assert.match(read(`commands/z-${name}.md`), new RegExp(name));
    assert.equal(JSON.parse(read(`skills/${name}/evals/evals.json`)).skill_name, name);
    assert.equal(JSON.parse(read(`commands/evals/z-${name}.json`)).target_id, `command:z-${name}`);
    assert.match(read("README.md"), new RegExp("`" + name + "`"));
  }
});

test("analyse skill still requires explicit ids", () => {
  const s = read("skills/mcp-swarm-lite-analyse/SKILL.md");
  assert.match(s, /Never accept a proposal on your own/);
  assert.match(s, /never use `--apply all`/);
  assert.match(s, /only editors and admins can accept or reject/);
});
