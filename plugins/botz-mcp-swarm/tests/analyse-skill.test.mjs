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

test("plugin v0.11.0 manifests, site page, and 10 skills/commands are aligned", () => {
  for (const mf of ["package.json", "plugin.json", ".cursor-plugin/plugin.json", ".claude-plugin/plugin.json"]) {
    assert.equal(JSON.parse(read(mf)).version, "0.11.0", mf);
  }
  const readme = read("README.md");
  const site = read("../../site/mcp-swarm/index.html");
  assert.match(site, /MCP Swarm v0\.11\.0/);
  const expectedSkills = [
    "mcp-swarm-guided", "mcp-swarm", "mcp-swarm-flow", "mcp-swarm-report", "mcp-swarm-compare",
    "mcp-swarm-descriptions", "mcp-swarm-record-replay", "mcp-swarm-diagnose", "mcp-swarm-analyse", "mcp-swarm-upgrade",
  ];
  for (const name of expectedSkills) {
    assert.match(readme, new RegExp("`" + name + "`"));
    assert.match(site, new RegExp(`<code>${name}</code>`));
    assert.match(read(`commands/z-${name}.md`), new RegExp(name));
  }
  assert.match(read("skills/mcp-swarm/SKILL.md"), /loadTimeline\.summary/);
  assert.match(read("skills/mcp-swarm/SKILL.md"), /--max-call-count/);
  assert.match(read("skills/mcp-swarm/SKILL.md"), /--ramp-down-strategy/);
  assert.match(read("skills/mcp-swarm/SKILL.md"), /rate_limit/);
  assert.match(read("skills/mcp-swarm-diagnose/SKILL.md"), /cancelledByRampDown/);
  assert.match(read("skills/mcp-swarm-upgrade/SKILL.md"), /0\.12\.0/);
});
