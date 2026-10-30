import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const skill = read("skills/mcp-swarm-analyse/SKILL.md");

test("analyse skill requires explicit ids and never auto-accepts", () => {
  assert.match(skill, /^name: mcp-swarm-analyse$/m);
  assert.match(skill, /disable-model-invocation: true/);
  assert.match(skill, /Never accept a proposal on your own/);
  assert.match(skill, /never use `--apply all`/);
  assert.match(skill, /--apply <id>\[,<id>\.\.\.\]/);
  assert.match(skill, /--reject <id>\[,<id>\.\.\.\]/);
  assert.doesNotMatch(skill.replace(/never use `--apply all`/g, ""), /--apply all/);
});

test("analyse skill keeps service RBAC", () => {
  assert.match(skill, /only editors and admins can accept or reject/);
});

test("command and evals are wired", () => {
  assert.match(read("commands/z-mcp-swarm-analyse.md"), /mcp-swarm-analyse/);
  const evals = JSON.parse(read("skills/mcp-swarm-analyse/evals/evals.json"));
  assert.equal(evals.skill_name, "mcp-swarm-analyse");
  assert.ok(evals.evals.length >= 3);
  assert.equal(JSON.parse(read("commands/evals/z-mcp-swarm-analyse.json")).target_id, "command:z-mcp-swarm-analyse");
  assert.match(read("README.md"), /\/z-mcp-swarm-analyse/);
});

test("mcp.json and .mcp.json configure central https://swarm.botz.ai/mcp with OAuth and no static credentials", () => {
  for (const file of ["mcp.json", ".mcp.json"]) {
    const raw = read(file);
    const parsed = JSON.parse(raw);
    assert.deepEqual(Object.keys(parsed.mcpServers), ["swarm"]);
    assert.equal(parsed.mcpServers.swarm.type, "http");
    assert.equal(parsed.mcpServers.swarm.url, "https://swarm.botz.ai/mcp");
    assert.doesNotMatch(raw, /headers|Authorization|Bearer|\$\{env:/i);
  }
  const cursorPlugin = JSON.parse(read(".cursor-plugin/plugin.json"));
  assert.equal(cursorPlugin.mcp, "./mcp.json");
});

test("plugin v0.13.0 manifests, site page, and 12 skills/commands are aligned", () => {
  for (const mf of ["package.json", "plugin.json", ".cursor-plugin/plugin.json", ".claude-plugin/plugin.json"]) {
    assert.equal(JSON.parse(read(mf)).version, "0.13.0", mf);
  }
  const readme = read("README.md");
  const site = read("../../site/mcp-swarm/index.html");
  assert.match(site, /MCP Swarm v0\.13\.0/);
  const expectedSkills = [
    "mcp-swarm-guided", "mcp-swarm", "mcp-swarm-flow", "mcp-swarm-report", "mcp-swarm-compare",
    "mcp-swarm-descriptions", "mcp-swarm-record-replay", "mcp-swarm-diagnose", "mcp-swarm-analyse", "mcp-swarm-upgrade",
    "mcp-swarm-server-updates", "mcp-swarm-tags",
  ];
  for (const name of expectedSkills) {
    assert.match(readme, new RegExp("`" + name + "`"));
    assert.match(site, new RegExp(`<code>${name}</code>`));
    assert.match(read(`commands/z-${name}.md`), new RegExp(name));
  }
  const mainSkill = read("skills/mcp-swarm/SKILL.md");
  assert.match(mainSkill, /https:\/\/swarm\.botz\.ai\/mcp/);
  assert.match(mainSkill, /--remote/);
  assert.match(mainSkill, /--max-vus/);
  assert.match(mainSkill, /loadTimeline\.summary/);
  assert.match(mainSkill, /--max-call-count/);
  assert.match(mainSkill, /--ramp-down-strategy/);
  assert.match(mainSkill, /rate_limit/);
  assert.match(read("skills/mcp-swarm-diagnose/SKILL.md"), /cancelledByRampDown/);
  assert.match(read("skills/mcp-swarm-upgrade/SKILL.md"), /0\.15\.0/);
});

test("server-updates and tags skills document CLI and MCP surfaces", () => {
  const updates = read("skills/mcp-swarm-server-updates/SKILL.md");
  for (const needle of ["project server updates", "accept-update", "discard-update", "changelog", "swarm_server_check_updates", "swarm_server_update_apply", "swarm_server_changelog", "protocol", "Update affected suites", "Check for server updates"]) {
    assert.ok(updates.includes(needle), needle);
  }
  const tags = read("skills/mcp-swarm-tags/SKILL.md");
  for (const needle of ["project suite tag", "project scenario-tag", "project run-tag", "--tags", "swarm_tags_set", "swarm_describe", "swarm_scenarios_list"]) {
    assert.ok(tags.includes(needle), needle);
  }
  for (const name of ["mcp-swarm-server-updates", "mcp-swarm-tags"]) {
    const evals = JSON.parse(read(`skills/${name}/evals/evals.json`));
    assert.equal(evals.skill_name, name);
    assert.equal(JSON.parse(read(`commands/evals/z-${name}.json`)).target_id, `command:z-${name}`);
  }
});

test("every skill pins botz-mcp-swarm-cli 0.15.0", () => {
  for (const name of ["mcp-swarm-guided", "mcp-swarm", "mcp-swarm-flow", "mcp-swarm-report", "mcp-swarm-compare", "mcp-swarm-descriptions", "mcp-swarm-record-replay", "mcp-swarm-diagnose", "mcp-swarm-analyse", "mcp-swarm-upgrade", "mcp-swarm-server-updates", "mcp-swarm-tags"]) {
    const s = read(`skills/${name}/SKILL.md`);
    assert.match(s, /cli-version: "0\.15\.0"/, name);
    if (s.includes("botz plugins info mcp-swarm")) assert.match(s, /botz plugins install mcp-swarm --version 0\.15\.0/, name);
  }
});
