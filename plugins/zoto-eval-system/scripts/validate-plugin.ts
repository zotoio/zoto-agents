#!/usr/bin/env tsx
/**
 * Validate the Eval System plugin structure before submission.
 *
 * Enforces, among other things:
 *  - No references to @cursor/february or cursor-agent.
 *  - No leftover _live / eval:live identifiers (rename is complete).
 *  - All commands/skills use the zoto- prefix.
 *  - Every skill has ≥ 2 eval cases, each with assertions.
 *  - hooks.json scripts exist on disk.
 *  - templates/schema/*.json compile under ajv.
 *  - templates/config.json validates against config.schema.json.
 *  - templates/skill-evals/evals.json.tmpl emits a _meta block with generated: true.
 *  - update.ts.tmpl source contains the literal guard `_meta?.generated === true`
 *    and refuses to write to non-generated cases at runtime.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

import Ajv from "ajv";

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

  return results;
}

function checkDirectories(): CheckResult[] {
  return ["agents", "skills", "commands", "rules", "hooks", "templates", "scripts"].map((dirname) => {
    const exists = isDir(join(REPO_ROOT, dirname));
    return {
      name: `dir_${dirname}`,
      passed: exists,
      detail: `${dirname}/ ${exists ? "exists" : "MISSING"}`,
    };
  });
}

function checkRequiredFiles(): CheckResult[] {
  const results: CheckResult[] = [];
  for (const filename of ["LICENSE", "README.md", "CHANGELOG.md"]) {
    const exists = isFile(join(REPO_ROOT, filename));
    results.push({
      name: `file_${filename}`,
      passed: exists,
      detail: `${filename} ${exists ? "exists" : "MISSING"}`,
    });
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

function checkNamingConventions(): CheckResult[] {
  const results: CheckResult[] = [];
  const cmdDir = join(REPO_ROOT, "commands");
  if (isDir(cmdDir)) {
    for (const f of readdirSync(cmdDir).filter((n) => n.endsWith(".md"))) {
      const ok = f.startsWith("zoto-");
      results.push({
        name: `cmd_prefix_${f}`,
        passed: ok,
        detail: `${f} ${ok ? "has" : "MISSING"} zoto- prefix`,
      });
    }
  }
  const skillsDir = join(REPO_ROOT, "skills");
  if (isDir(skillsDir)) {
    for (const d of readdirSync(skillsDir)) {
      if (!isDir(join(skillsDir, d))) continue;
      const ok = d.startsWith("zoto-");
      results.push({
        name: `skill_prefix_${d}`,
        passed: ok,
        detail: `${d} ${ok ? "has" : "MISSING"} zoto- prefix`,
      });
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

function checkEvalFiles(): CheckResult[] {
  const results: CheckResult[] = [];
  const skillsDir = join(REPO_ROOT, "skills");
  if (!isDir(skillsDir)) return results;

  for (const skillDir of readdirSync(skillsDir)) {
    if (!isDir(join(skillsDir, skillDir))) continue;
    const evalsFile = join(skillsDir, skillDir, "evals", "evals.json");
    if (!isFile(evalsFile)) {
      results.push({
        name: `evals_${skillDir}`,
        passed: false,
        detail: `evals/evals.json MISSING in ${skillDir}/`,
      });
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

function checkForbiddenIdentifiers(): CheckResult[] {
  const results: CheckResult[] = [];
  const scanExts = [".md", ".mdc", ".ts", ".tmpl", ".json", ".mjs", ".py"];
  const forbidden: Array<{ pattern: RegExp; label: string; readmeException?: boolean }> = [
    { pattern: /@cursor\/february/, label: "cursor-february" },
    { pattern: /cursor-agent/, label: "cursor-agent" },
    { pattern: /\beval:live\b/, label: "eval:live", readmeException: true },
    { pattern: /\b_live\b/, label: "_live", readmeException: true },
    { pattern: /agentDriven\.cli/, label: "agentDriven.cli" },
  ];

  const allFiles: string[] = [];
  for (const ext of scanExts) {
    allFiles.push(...globFiles(REPO_ROOT, ext));
  }

  for (const { pattern, label, readmeException } of forbidden) {
    const hits: string[] = [];
    let readmeHits = 0;
    for (const path of allFiles) {
      const rel = relative(REPO_ROOT, path);
      if (rel.endsWith("scripts/validate-plugin.ts")) continue;
      if (rel.endsWith("tests/plugin.test.ts")) continue;
      const text = readText(path);
      if (!pattern.test(text)) continue;
      const isReadme = rel === "README.md";
      if (isReadme && readmeException) {
        readmeHits += (text.match(new RegExp(pattern.source, "g")) ?? []).length;
        continue;
      }
      hits.push(rel);
    }
    const footnoteAllowed = readmeException ? 2 : 0;
    const passed = hits.length === 0 && readmeHits <= footnoteAllowed;
    results.push({
      name: `forbidden_${label}`,
      passed,
      detail: hits.length
        ? `Found ${label} in: ${hits.join(", ")}`
        : `${label} clean (README footnote hits: ${readmeHits}/${footnoteAllowed})`,
    });
  }
  return results;
}

function checkHooks(): CheckResult[] {
  const results: CheckResult[] = [];
  const hooksJson = join(REPO_ROOT, "hooks", "hooks.json");
  if (!isFile(hooksJson)) {
    results.push({ name: "hooks_json_exists", passed: false, detail: "hooks/hooks.json MISSING" });
    return results;
  }
  results.push({ name: "hooks_json_exists", passed: true, detail: "" });

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
  return results;
}

function checkSchemas(): CheckResult[] {
  const results: CheckResult[] = [];
  const schemaDir = join(REPO_ROOT, "templates", "schema");
  if (!isDir(schemaDir)) {
    return [{ name: "schemas_dir", passed: false, detail: "templates/schema MISSING" }];
  }
  const ajv = new Ajv({ allErrors: true, strict: false });
  for (const f of readdirSync(schemaDir).filter((n) => n.endsWith(".json"))) {
    const full = join(schemaDir, f);
    try {
      const schema = loadJson(full);
      ajv.compile(schema);
      results.push({ name: `schema_${f}`, passed: true, detail: `${f} compiled` });
    } catch (e) {
      results.push({
        name: `schema_${f}`,
        passed: false,
        detail: `${f} failed to compile: ${(e as Error).message}`,
      });
    }
  }

  try {
    const cfgSchema = loadJson(join(schemaDir, "config.schema.json"));
    const cfg = loadJson(join(REPO_ROOT, "templates", "config.json"));
    const ajvCfg = new Ajv({ allErrors: true, strict: false });
    const validate = ajvCfg.compile(cfgSchema);
    const ok = validate(cfg);
    results.push({
      name: "config_template_validates",
      passed: Boolean(ok),
      detail: ok ? "templates/config.json is valid" : JSON.stringify(validate.errors),
    });
  } catch (e) {
    results.push({
      name: "config_template_validates",
      passed: false,
      detail: (e as Error).message,
    });
  }

  try {
    const cfgSchema = loadJson(join(schemaDir, "config.schema.json"));
    const ajvConst = new Ajv({ allErrors: true, strict: false });
    const validate = ajvConst.compile(cfgSchema);
    const badA = {
      update: { preserveUserAuthoredCases: false, writeMetaMarker: true },
    };
    const badB = {
      update: { preserveUserAuthoredCases: true, writeMetaMarker: false },
    };
    const okA = validate(badA);
    const okB = validate(badB);
    results.push({
      name: "config_schema_rejects_false_preserveUserAuthoredCases",
      passed: !okA,
      detail: okA ? "schema accepted preserveUserAuthoredCases: false (must reject)" : "reject OK",
    });
    results.push({
      name: "config_schema_rejects_false_writeMetaMarker",
      passed: !okB,
      detail: okB ? "schema accepted writeMetaMarker: false (must reject)" : "reject OK",
    });
  } catch (e) {
    results.push({
      name: "config_schema_const_enforcement",
      passed: false,
      detail: (e as Error).message,
    });
  }

  return results;
}

function checkSkillEvalsTemplate(): CheckResult[] {
  const path = join(REPO_ROOT, "templates", "skill-evals", "evals.json.tmpl");
  if (!isFile(path)) {
    return [{ name: "skill_evals_tmpl", passed: false, detail: "MISSING" }];
  }
  const raw = readText(path);
  const hasMeta = /"_meta"\s*:\s*\{[\s\S]*?"generated"\s*:\s*true/.test(raw);
  return [
    {
      name: "skill_evals_tmpl_meta_generated",
      passed: hasMeta,
      detail: hasMeta ? "emits _meta.generated=true" : "missing _meta.generated=true block",
    },
  ];
}

function checkUpdateTemplateGuard(): CheckResult[] {
  const results: CheckResult[] = [];
  for (const rel of [
    "templates/llm/agent-sdk/update.ts.tmpl",
    "scripts/eval-update.ts",
  ]) {
    const path = join(REPO_ROOT, rel);
    if (!isFile(path)) {
      results.push({ name: `guard_${rel}`, passed: false, detail: "MISSING" });
      continue;
    }
    const raw = readText(path);
    const hasGuard = raw.includes("_meta?.generated === true");
    const refusesToMutate = /refuse-to-mutate|throw new Error\(/.test(raw);
    results.push({
      name: `guard_${rel}`,
      passed: hasGuard && refusesToMutate,
      detail:
        hasGuard && refusesToMutate
          ? "guards user-authored cases"
          : `missing guard (hasGuard=${hasGuard}, refusesToMutate=${refusesToMutate})`,
    });
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
  if (isFile(venvBin)) bin = venvBin;
  else {
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
      passed: true,
      detail: "skills-ref not installed — skipping (not required)",
    });
    return results;
  }

  for (const skillDir of readdirSync(skillsDir)) {
    const fullPath = join(skillsDir, skillDir);
    if (!isDir(fullPath)) continue;
    if (!isFile(join(fullPath, "SKILL.md"))) continue;
    try {
      execFileSync(bin, ["validate", fullPath], { stdio: "pipe" });
      results.push({ name: `skills_ref_${skillDir}`, passed: true, detail: "OK" });
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
  ["Skill evaluations", checkEvalFiles],
  ["Forbidden identifiers", checkForbiddenIdentifiers],
  ["Hooks", checkHooks],
  ["Schemas", checkSchemas],
  ["Skill-evals template", checkSkillEvalsTemplate],
  ["Update guard (_meta.generated === true)", checkUpdateTemplateGuard],
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
