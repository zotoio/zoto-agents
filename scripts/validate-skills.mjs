#!/usr/bin/env node

// Validate all plugin skills using the skills-ref reference library.
// Discovers SKILL.md files under each plugin's skills directory and runs
// `skills-ref validate` against each one.
//
// Usage:
//   node scripts/validate-skills.mjs          # validate all skills
//   node scripts/validate-skills.mjs --json   # output JSON results

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const jsonOutput = process.argv.includes("--json");
const venvBin = join(repoRoot, ".venv", "bin", "skills-ref");

function findSkillDirs() {
  const pluginsDir = join(repoRoot, "plugins");
  const skillDirs = [];

  if (!existsSync(pluginsDir)) return skillDirs;

  for (const plugin of readdirSync(pluginsDir)) {
    const skillsRoot = join(pluginsDir, plugin, "skills");
    if (!existsSync(skillsRoot)) continue;

    for (const skill of readdirSync(skillsRoot)) {
      const skillDir = join(skillsRoot, skill);
      if (!statSync(skillDir).isDirectory()) continue;
      if (existsSync(join(skillDir, "SKILL.md"))) {
        skillDirs.push(skillDir);
      }
    }
  }

  return skillDirs;
}

function getSkillsRefBin() {
  if (existsSync(venvBin)) return venvBin;

  try {
    execFileSync("skills-ref", ["--version"], { stdio: "pipe" });
    return "skills-ref";
  } catch {
    return null;
  }
}

const bin = getSkillsRefBin();
if (!bin) {
  console.error(
    "skills-ref not found. Install it with:\n" +
      '  python3 -m venv .venv && .venv/bin/pip install "git+https://github.com/agentskills/agentskills.git#subdirectory=skills-ref"',
  );
  process.exit(1);
}

const skillDirs = findSkillDirs();
if (skillDirs.length === 0) {
  console.log("No skills found to validate.");
  process.exit(0);
}

const results = [];
let failures = 0;

for (const skillDir of skillDirs) {
  const relative = skillDir.replace(repoRoot + "/", "");
  try {
    execFileSync(bin, ["validate", skillDir], { stdio: "pipe" });
    results.push({ skill: relative, valid: true, errors: [] });
    if (!jsonOutput) console.log(`  [PASS] ${relative}`);
  } catch (err) {
    const stderr = err.stderr?.toString().trim() ?? err.message;
    const errors = stderr
      .split("\n")
      .filter((l) => l.startsWith("  - "))
      .map((l) => l.slice(4));
    results.push({ skill: relative, valid: false, errors });
    failures++;
    if (!jsonOutput) {
      console.error(`  [FAIL] ${relative}`);
      for (const e of errors) console.error(`         ${e}`);
    }
  }
}

if (jsonOutput) {
  console.log(JSON.stringify({ total: results.length, failures, results }, null, 2));
} else {
  console.log(`\n  ${results.length - failures}/${results.length} skills valid.`);
}

process.exit(failures > 0 ? 1 : 0);
