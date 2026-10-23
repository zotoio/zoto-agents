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
