#!/usr/bin/env tsx
/**
 * Validate the Spec System plugin structure before submission.
 *
 * Runs structural checks on the plugin manifest, directories, naming
 * conventions, cross-references, and content integrity. Exits with
 * code 0 on success, 1 on failure.
 *
 * Usage:
 *   pnpm validate            # validate
 *   pnpm validate -- --verbose # show passing checks too
 */

import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const verbose = process.argv.includes("--verbose");

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

function readText(path: string): string {
  return readFileSync(path, "utf-8");
}

function loadJson(path: string): Record<string, unknown> {
  return JSON.parse(readText(path));
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

function globFiles(dir: string, ext: string, results: string[] = []): string[] {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    try {
      if (statSync(full).isDirectory()) {
        if (entry === "node_modules" || entry === "dist") continue;
        globFiles(full, ext, results);
      } else if (entry.endsWith(ext)) {
        results.push(full);
      }
    } catch {
      continue;
    }
  }
  return results;
}

function checkManifest(): CheckResult[] {
  const results: CheckResult[] = [];
  const manifestPath = join(REPO_ROOT, ".cursor-plugin", "plugin.json");

  if (!isFile(manifestPath)) {
    results.push({ name: "manifest_exists", passed: false, detail: `Not found: ${manifestPath}` });
    return results;
  }
  results.push({ name: "manifest_exists", passed: true, detail: manifestPath });

  let p: Record<string, unknown>;
  try {
    p = loadJson(manifestPath);
  } catch (e) {
    results.push({ name: "manifest_valid_json", passed: false, detail: String(e) });
    return results;
  }
  results.push({ name: "manifest_valid_json", passed: true, detail: "" });

  const required = ["name", "displayName", "version", "description", "author", "license"];
  const missing = required.filter((f) => !(f in p));
  results.push({
    name: "manifest_required_fields",
    passed: missing.length === 0,
    detail: missing.length ? `Missing: ${missing.join(", ")}` : "All present",
  });

  const name = (p.name ?? "") as string;
  const nameOk = /^[a-z][a-z0-9-]*$/.test(name);
  results.push({
    name: "manifest_name_kebab_case",
    passed: nameOk,
    detail: `name=${JSON.stringify(name)}` + (nameOk ? "" : " — must be lowercase kebab-case"),
  });

  const version = (p.version ?? "") as string;
  const verOk = /^\d+\.\d+\.\d+$/.test(version);
  results.push({
    name: "manifest_version_semver",
    passed: verOk,
    detail: `version=${JSON.stringify(version)}` + (verOk ? "" : " — must be semver"),
  });

  return results;
}

function checkDirectories(): CheckResult[] {
  return ["agents", "skills", "commands", "rules", "hooks"].map((dirname) => {
    const exists = isDir(join(REPO_ROOT, dirname));
    return { name: `dir_${dirname}`, passed: exists, detail: `${dirname}/ ${exists ? "exists" : "MISSING"}` };
  });
}

function checkNamingConventions(): CheckResult[] {
  const results: CheckResult[] = [];

  const cmdDir = join(REPO_ROOT, "commands");
  if (isDir(cmdDir)) {
    for (const f of readdirSync(cmdDir).filter((n) => n.endsWith(".md"))) {
      const ok = f.startsWith("zoto-");
      results.push({ name: `cmd_prefix_${f}`, passed: ok, detail: `${f} ${ok ? "has" : "MISSING"} zoto- prefix` });
    }
  }

  const skillsDir = join(REPO_ROOT, "skills");
  if (isDir(skillsDir)) {
    for (const d of readdirSync(skillsDir)) {
      if (!isDir(join(skillsDir, d))) continue;
      const ok = d.startsWith("zoto-");
      results.push({ name: `skill_prefix_${d}`, passed: ok, detail: `${d} ${ok ? "has" : "MISSING"} zoto- prefix` });

      const skillMd = join(skillsDir, d, "SKILL.md");
      results.push({
        name: `skill_md_${d}`,
        passed: isFile(skillMd),
        detail: `SKILL.md ${isFile(skillMd) ? "exists" : "MISSING"} in ${d}/`,
      });
    }
  }

  return results;
}

function checkCrossReferences(): CheckResult[] {
  const results: CheckResult[] = [];
  const cmdDir = join(REPO_ROOT, "commands");
  const agentsDir = join(REPO_ROOT, "agents");

  if (isDir(cmdDir) && isDir(agentsDir)) {
    for (const f of readdirSync(cmdDir).filter((n) => n.startsWith("zoto-"))) {
      const text = readText(join(cmdDir, f));
      const refsAgent = text.includes("zoto-spec-generator") || text.includes("zoto-spec-executor") || text.includes("zoto-spec-judge");
      results.push({
        name: `xref_cmd_${f.replace(".md", "")}`,
        passed: refsAgent,
        detail: `${f} ${refsAgent ? "references" : "MISSING reference to"} an agent`,
      });
    }

    for (const agentFile of readdirSync(agentsDir).filter((n) => n.endsWith(".md"))) {
      const text = readText(join(agentsDir, agentFile));
      const refsSkill = ["zoto-create-spec", "zoto-judge-spec", "zoto-execute-spec"].some((s) => text.includes(s));
      results.push({
        name: `xref_agent_${agentFile.replace(".md", "")}`,
        passed: refsSkill,
        detail: `${agentFile} ${refsSkill ? "references" : "MISSING reference to"} a skill`,
      });
    }
  }

  const hooksJson = join(REPO_ROOT, "hooks", "hooks.json");
  if (isFile(hooksJson)) {
    const h = loadJson(hooksJson);
    const hooks = (h.hooks ?? {}) as Record<string, Array<{ command?: string }>>;
    for (const hookList of Object.values(hooks)) {
      for (const entry of hookList) {
        const cmd = entry.command ?? "";
        const script = cmd.split(/\s+/).pop() ?? "";
        if (script) {
          const scriptPath = join(REPO_ROOT, script);
          results.push({
            name: `hook_script_${script.split("/").pop()!}`,
            passed: isFile(scriptPath),
            detail: `${script} ${isFile(scriptPath) ? "exists" : "MISSING"}`,
          });
        }
      }
    }
  }

  return results;
}

function checkContentIntegrity(): CheckResult[] {
  const excluded = new Set(["memory-extension-guide.md", "plugin.test.ts", "validate-plugin.ts"]);
  const pattern = /crux/i;
  const hits: string[] = [];

  const allFiles = [
    ...globFiles(REPO_ROOT, ".md"),
    ...globFiles(REPO_ROOT, ".mdc"),
    ...globFiles(REPO_ROOT, ".ts"),
    ...globFiles(REPO_ROOT, ".json"),
  ];

  for (const path of allFiles) {
    const name = path.split("/").pop()!;
    if (excluded.has(name)) continue;
    try {
      if (pattern.test(readText(path))) {
        hits.push(relative(REPO_ROOT, path));
      }
    } catch {
      continue;
    }
  }

  return [
    {
      name: "no_crux_references",
      passed: hits.length === 0,
      detail: hits.length ? `Found in: ${hits.join(", ")}` : "Clean",
    },
  ];
}

function checkRequiredFiles(): CheckResult[] {
  const results: CheckResult[] = [];
  for (const filename of ["LICENSE", "README.md", "CHANGELOG.md"]) {
    const exists = isFile(join(REPO_ROOT, filename));
    results.push({ name: `file_${filename}`, passed: exists, detail: `${filename} ${exists ? "exists" : "MISSING"}` });
  }

  const readme = join(REPO_ROOT, "README.md");
  if (isFile(readme)) {
    const lines = readText(readme).split("\n");
    const ok = lines.length > 50;
    results.push({
      name: "readme_not_stub",
      passed: ok,
      detail: `README has ${lines.length} lines` + (ok ? "" : " — looks like a stub"),
    });
  }
  return results;
}

function checkEvalFiles(): CheckResult[] {
  const results: CheckResult[] = [];
  const skillsDir = join(REPO_ROOT, "skills");
  if (!isDir(skillsDir)) return results;

  for (const skillDir of readdirSync(skillsDir)) {
    if (!isDir(join(skillsDir, skillDir))) continue;
    const evalsFile = join(skillsDir, skillDir, "evals", "evals.json");

    if (!isFile(evalsFile)) {
      results.push({ name: `evals_${skillDir}`, passed: false, detail: `evals/evals.json MISSING in ${skillDir}/` });
      continue;
    }

    let data: Record<string, unknown>;
    try {
      data = loadJson(evalsFile);
    } catch (e) {
      results.push({ name: `evals_${skillDir}`, passed: false, detail: `Invalid JSON: ${e}` });
      continue;
    }

    const evals = (data.evals ?? []) as Array<Record<string, unknown>>;
    const hasEvals = evals.length >= 2;
    results.push({
      name: `evals_${skillDir}`,
      passed: hasEvals,
      detail: `${evals.length} eval(s) in ${skillDir}` + (hasEvals ? "" : " — need at least 2"),
    });

    for (const ev of evals) {
      const hasAssertions = Array.isArray(ev.assertions) && ev.assertions.length > 0;
      results.push({
        name: `evals_${skillDir}_id${ev.id ?? "?"}_assertions`,
        passed: hasAssertions,
        detail: `eval id=${ev.id}: ${hasAssertions ? "has" : "MISSING"} assertions`,
      });
    }
  }

  return results;
}

function checkSkillsRef(): CheckResult[] {
  const results: CheckResult[] = [];
  const skillsDir = join(REPO_ROOT, "skills");
  if (!isDir(skillsDir)) return results;

  const monorepoRoot = resolve(REPO_ROOT, "..", "..");
  const venvBin = join(monorepoRoot, ".venv", "bin", "skills-ref");

  let bin: string | null = null;
  if (isFile(venvBin)) {
    bin = venvBin;
  } else {
    try {
      execFileSync("skills-ref", ["--version"], { stdio: "pipe" });
      bin = "skills-ref";
    } catch {
      /* not available */
    }
  }

  if (!bin) {
    results.push({
      name: "skills_ref_available",
      passed: false,
      detail: "skills-ref not installed — run: python3 -m venv .venv && .venv/bin/pip install \"git+https://github.com/agentskills/agentskills.git#subdirectory=skills-ref\"",
    });
    return results;
  }
  results.push({ name: "skills_ref_available", passed: true, detail: bin });

  for (const skillDir of readdirSync(skillsDir)) {
    const fullPath = join(skillsDir, skillDir);
    if (!isDir(fullPath)) continue;
    if (!isFile(join(fullPath, "SKILL.md"))) continue;

    try {
      execFileSync(bin, ["validate", fullPath], { stdio: "pipe" });
      results.push({
        name: `skills_ref_${skillDir}`,
        passed: true,
        detail: `${skillDir} passes skills-ref validation`,
      });
    } catch (e: unknown) {
      const stderr = (e as { stderr?: Buffer }).stderr?.toString().trim() ?? String(e);
      results.push({
        name: `skills_ref_${skillDir}`,
        passed: false,
        detail: `${skillDir}: ${stderr}`,
      });
    }
  }

  return results;
}

const sections: Array<[string, () => CheckResult[]]> = [
  ["Plugin manifest", checkManifest],
  ["Directory structure", checkDirectories],
  ["Required files", checkRequiredFiles],
  ["Naming conventions", checkNamingConventions],
  ["Cross-references", checkCrossReferences],
  ["Content integrity", checkContentIntegrity],
  ["Skill evaluations", checkEvalFiles],
  ["Skills spec validation (skills-ref)", checkSkillsRef],
];

let allChecks: CheckResult[] = [];

for (const [sectionName, checkFn] of sections) {
  const results = checkFn();
  allChecks = allChecks.concat(results);

  const failures = results.filter((r) => !r.passed);
  if (failures.length > 0 || verbose) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  ${sectionName}`);
    console.log("=".repeat(60));
    for (const r of results) {
      if (r.passed && !verbose) continue;
      const icon = r.passed ? "PASS" : "FAIL";
      console.log(`  [${icon}] ${r.name}: ${r.detail}`);
    }
  }
}

const passed = allChecks.filter((r) => r.passed).length;
const failed = allChecks.filter((r) => !r.passed).length;
const total = allChecks.length;

console.log(`\n${"=".repeat(60)}`);
console.log(`  Results: ${passed}/${total} passed, ${failed} failed`);
console.log("=".repeat(60));

if (failed > 0) {
  console.log("\nValidation FAILED. Fix the issues above before submitting.");
  process.exit(1);
} else {
  console.log("\nAll checks passed. Plugin is ready for submission.");
  process.exit(0);
}
