import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";

import Ajv from "ajv";
import YAML from "yaml";

import {
  applyCaseUpdates,
  computeDeltas,
  runUpdate,
  sha256,
  normaliseContent,
  type EvalCase,
  type EvalFile,
} from "../scripts/eval-update.js";
import { discover, manifestFor } from "../scripts/eval-discover.js";
import { mergePackageJson } from "../scripts/package-json-merger.js";

const PLUGIN_DIR = resolve(import.meta.dirname, "..");

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
  return existsSync(path) && statSync(path).isFile();
}

function globFiles(dir: string, ext: string, results: string[] = []): string[] {
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      globFiles(full, ext, results);
    } else if (entry.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// 1. Plugin Structure
// ---------------------------------------------------------------------------
describe("Plugin Structure", () => {
  it("plugin.json is valid JSON", () => {
    loadJson(join(PLUGIN_DIR, ".cursor-plugin", "plugin.json"));
  });

  it("plugin.json has all required fields", () => {
    const p = loadJson(join(PLUGIN_DIR, ".cursor-plugin", "plugin.json"));
    const required = [
      "name",
      "displayName",
      "version",
      "description",
      "author",
      "license",
      "agents",
      "skills",
      "commands",
      "rules",
      "hooks",
    ];
    const missing = required.filter((f) => !(f in p));
    expect(missing, `Missing fields: ${missing.join(", ")}`).toHaveLength(0);
  });

  it("required directories exist", () => {
    for (const d of ["agents", "skills", "commands", "rules", "hooks", "templates", "scripts"]) {
      expect(isDir(join(PLUGIN_DIR, d)), `${d}/ missing`).toBe(true);
    }
  });

  it("hooks.json exists", () => {
    expect(isFile(join(PLUGIN_DIR, "hooks", "hooks.json"))).toBe(true);
  });

  it("LICENSE / README / CHANGELOG exist", () => {
    expect(isFile(join(PLUGIN_DIR, "LICENSE"))).toBe(true);
    expect(isFile(join(PLUGIN_DIR, "README.md"))).toBe(true);
    expect(isFile(join(PLUGIN_DIR, "CHANGELOG.md"))).toBe(true);
  });

  it("README is not a stub", () => {
    const lines = readText(join(PLUGIN_DIR, "README.md")).split("\n");
    expect(lines.length, `README only ${lines.length} lines`).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// 2. Naming Convention
// ---------------------------------------------------------------------------
describe("Naming Convention", () => {
  it("command files use zoto- prefix", () => {
    const cmdDir = join(PLUGIN_DIR, "commands");
    for (const f of readdirSync(cmdDir).filter((n) => n.endsWith(".md"))) {
      expect(f, `${f} missing zoto- prefix`).toMatch(/^zoto-/);
    }
  });

  it("skill dirs use zoto- prefix", () => {
    const skillsDir = join(PLUGIN_DIR, "skills");
    for (const d of readdirSync(skillsDir)) {
      if (isDir(join(skillsDir, d))) {
        expect(d, `${d} missing zoto- prefix`).toMatch(/^zoto-/);
      }
    }
  });

  it("agent files use zoto-eval- prefix", () => {
    const agentsDir = join(PLUGIN_DIR, "agents");
    for (const f of readdirSync(agentsDir).filter((n) => n.endsWith(".md"))) {
      expect(f, `${f} missing zoto-eval- prefix`).toMatch(/^zoto-eval-/);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Skill evals
// ---------------------------------------------------------------------------
describe("Skill evals", () => {
  const skillsDir = join(PLUGIN_DIR, "skills");
  for (const d of readdirSync(skillsDir)) {
    const skillDir = join(skillsDir, d);
    if (!isDir(skillDir)) continue;
    it(`${d}: has evals.json with >=2 cases, all with assertions`, () => {
      const p = join(skillDir, "evals", "evals.json");
      expect(isFile(p), `${d} missing evals/evals.json`).toBe(true);
      const data = loadJson(p);
      const evals = (data.evals ?? []) as Array<Record<string, unknown>>;
      expect(evals.length, `${d} must have >= 2 cases`).toBeGreaterThanOrEqual(2);
      for (const ev of evals) {
        expect(
          Array.isArray(ev.assertions) && (ev.assertions as unknown[]).length > 0,
          `${d} case ${ev.id}: must have assertions`,
        ).toBe(true);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Forbidden identifiers
// ---------------------------------------------------------------------------
describe("Forbidden identifiers", () => {
  const EXCLUDED = new Set(["validate-plugin.ts", "plugin.test.ts"]);
  const SCANNABLE = [".md", ".mdc", ".ts", ".tmpl", ".json", ".mjs"];

  it("no @cursor/february, cursor-agent, or agentDriven.cli references", () => {
    const hits: Record<string, string[]> = {
      "@cursor/february": [],
      "cursor-agent": [],
      "agentDriven.cli": [],
    };
    const allFiles: string[] = [];
    for (const ext of SCANNABLE) allFiles.push(...globFiles(PLUGIN_DIR, ext));
    for (const path of allFiles) {
      const name = path.split("/").pop()!;
      if (EXCLUDED.has(name)) continue;
      const text = readText(path);
      for (const key of Object.keys(hits)) {
        if (text.includes(key)) hits[key].push(relative(PLUGIN_DIR, path));
      }
    }
    for (const [k, files] of Object.entries(hits)) {
      expect(files, `${k} found in: ${files.join(", ")}`).toHaveLength(0);
    }
  });

  it("_live / eval:live only appears in README (<=2 footnote mentions)", () => {
    let readmeHits = 0;
    let otherHits: string[] = [];
    const allFiles: string[] = [];
    for (const ext of SCANNABLE) allFiles.push(...globFiles(PLUGIN_DIR, ext));
    const pattern = /\b(_live|eval:live)\b/g;
    for (const path of allFiles) {
      const name = path.split("/").pop()!;
      if (EXCLUDED.has(name)) continue;
      const text = readText(path);
      const matches = text.match(pattern);
      if (!matches) continue;
      if (relative(PLUGIN_DIR, path) === "README.md") {
        readmeHits += matches.length;
      } else {
        otherHits.push(relative(PLUGIN_DIR, path));
      }
    }
    expect(otherHits, `_live outside README: ${otherHits.join(", ")}`).toHaveLength(0);
    expect(readmeHits, `README footnote should mention _live at most twice`).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 5. Schemas compile, config template validates, const fields enforced
// ---------------------------------------------------------------------------
describe("Schemas & config contract", () => {
  const schemaDir = join(PLUGIN_DIR, "templates", "schema");
  function newAjv(): Ajv {
    return new Ajv({ allErrors: true, strict: false });
  }

  it("all schemas compile", () => {
    const ajv = newAjv();
    for (const f of readdirSync(schemaDir).filter((n) => n.endsWith(".json"))) {
      ajv.compile(loadJson(join(schemaDir, f)));
    }
  });

  it("templates/config.json validates against config.schema.json", () => {
    const ajv = newAjv();
    const schema = loadJson(join(schemaDir, "config.schema.json"));
    const cfg = loadJson(join(PLUGIN_DIR, "templates", "config.json"));
    const v = ajv.compile(schema);
    expect(v(cfg), JSON.stringify(v.errors)).toBe(true);
  });

  it("schema rejects preserveUserAuthoredCases: false", () => {
    const ajv = newAjv();
    const schema = loadJson(join(schemaDir, "config.schema.json"));
    const v = ajv.compile(schema);
    const bad = { update: { preserveUserAuthoredCases: false, writeMetaMarker: true } };
    expect(v(bad)).toBe(false);
  });

  it("schema rejects writeMetaMarker: false", () => {
    const ajv = newAjv();
    const schema = loadJson(join(schemaDir, "config.schema.json"));
    const v = ajv.compile(schema);
    const bad = { update: { preserveUserAuthoredCases: true, writeMetaMarker: false } };
    expect(v(bad)).toBe(false);
  });

  it("skill-evals template emits _meta.generated: true", () => {
    const raw = readText(join(PLUGIN_DIR, "templates", "skill-evals", "evals.json.tmpl"));
    expect(/"_meta"\s*:\s*\{[\s\S]*?"generated"\s*:\s*true/.test(raw)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Compile-time and runtime guard on _meta.generated
// ---------------------------------------------------------------------------
describe("_meta.generated contract", () => {
  it("update.ts.tmpl contains literal guard _meta?.generated === true", () => {
    const raw = readText(join(PLUGIN_DIR, "templates", "llm", "agent-sdk", "update.ts.tmpl"));
    expect(raw.includes("_meta?.generated === true")).toBe(true);
    expect(/throw new Error\(/.test(raw)).toBe(true);
  });

  it("scripts/eval-update.ts contains literal guard _meta?.generated === true", () => {
    const raw = readText(join(PLUGIN_DIR, "scripts", "eval-update.ts"));
    expect(raw.includes("_meta?.generated === true")).toBe(true);
    expect(/throw new Error\(/.test(raw)).toBe(true);
  });

  it("applyCaseUpdates throws when mutating a user-authored case", () => {
    const evalFile: EvalFile = {
      evals: [
        { id: 1, prompt: "user", assertions: ["a"] },
      ],
    };
    const newCase: EvalCase = {
      id: 1,
      prompt: "regenerated",
      assertions: ["a"],
      _meta: { generated: true, source_hash: "x".repeat(64), last_updated: "2026-05-03T00:00:00Z", generated_by: "zoto-update-evals" },
    };
    expect(() => applyCaseUpdates(evalFile, [{ id: 1, newCase }])).toThrow(/refuse-to-mutate/);
  });

  it("applyCaseUpdates succeeds on a generated case", () => {
    const evalFile: EvalFile = {
      evals: [
        {
          id: 1,
          prompt: "gen",
          assertions: ["a"],
          _meta: { generated: true, source_hash: "old", last_updated: "2026-01-01T00:00:00Z", generated_by: "zoto-create-evals" },
        },
      ],
    };
    const newCase: EvalCase = {
      id: 1,
      prompt: "regen",
      assertions: ["a"],
      _meta: { generated: true, source_hash: "new", last_updated: "2026-05-03T00:00:00Z", generated_by: "zoto-update-evals" },
    };
    const out = applyCaseUpdates(evalFile, [{ id: 1, newCase }]);
    const cases = out.evals ?? [];
    expect(cases[0].prompt).toBe("regen");
    expect(cases[0]._meta?.source_hash).toBe("new");
  });
});

// ---------------------------------------------------------------------------
// 7. Integration fixture — fresh scaffold + drift tests (test cases 12-20)
// ---------------------------------------------------------------------------
describe("Fixture repo — update semantics", () => {
  let tmp: string;

  function runGit(cwd: string, args: string[]): void {
    execSync(`git ${args.join(" ")}`, { cwd, stdio: "pipe" });
  }

  function initRepo(): void {
    runGit(tmp, ["init", "--quiet"]);
    runGit(tmp, ["config", "user.email", "test@example.com"]);
    runGit(tmp, ["config", "user.name", "Test"]);
    writeFileSync(join(tmp, "README.md"), "# fixture\n");
    runGit(tmp, ["add", "."]);
    runGit(tmp, ["commit", "--quiet", "-m", "initial"]);
  }

  function writeSkill(slug: string, description: string): void {
    const dir = join(tmp, "skills", slug);
    mkdirSync(dir, { recursive: true });
    const content = `---\nname: ${slug}\ndescription: ${description}\n---\n\n# ${slug}\n\nBody goes here.\n`;
    writeFileSync(join(dir, "SKILL.md"), content);
  }

  function writeConfig(): Record<string, unknown> {
    const cfg = {
      evalsDir: "evals",
      skillsRoots: ["skills"],
      discoveryTargets: ["skill"],
      llm: { runtime: "tsx", model: { id: "composer-2" } },
      judgeModel: "opus-4.6",
      manualChecklists: { enabled: false },
      additionalAutomation: [],
      update: {
        criticalChangeRules: {
          addedTargetWithoutCoverage: true,
          removedTargetWithActiveCases: true,
          skillFrontmatterChange: true,
          publicSurfaceChange: true,
          promptTemplateChange: true,
        },
        preserveUserAuthoredCases: true,
        writeMetaMarker: true,
        manifestPath: ".zoto-eval-system/manifest.yml",
        historyPath: ".zoto-eval-system/manifest.history.yml",
        rediscoverWithSameDefaults: true,
        checkExitCodeOnCriticalDrift: 2,
      },
    };
    mkdirSync(join(tmp, ".zoto-eval-system"), { recursive: true });
    writeFileSync(join(tmp, ".zoto-eval-system", "config.json"), JSON.stringify(cfg, null, 2));
    return cfg;
  }

  function writeGeneratedEvalsFile(skill: string, sourceHash: string, existingUser?: boolean): void {
    const dir = join(tmp, "skills", skill, "evals");
    mkdirSync(dir, { recursive: true });
    const cases: EvalCase[] = [];
    if (existingUser) {
      cases.push({
        id: "user-1",
        prompt: "User wrote this",
        assertions: ["should be preserved"],
      });
    }
    cases.push({
      id: 1,
      prompt: `generated prompt for ${skill}`,
      assertions: ["asserts generated"],
      _meta: {
        generated: true,
        source_hash: sourceHash,
        last_updated: "2026-05-01T00:00:00Z",
        generated_by: "zoto-create-evals",
      },
    });
    cases.push({
      id: 2,
      prompt: `another generated prompt for ${skill}`,
      assertions: ["also generated"],
      _meta: {
        generated: true,
        source_hash: sourceHash,
        last_updated: "2026-05-01T00:00:00Z",
        generated_by: "zoto-create-evals",
      },
    });
    const doc = { skill_name: skill, evals: cases };
    writeFileSync(join(dir, "evals.json"), JSON.stringify(doc, null, 2));
  }

  function seedManifest(cfg: Record<string, unknown>, generatedBy: "zoto-create-evals" | "zoto-update-evals" = "zoto-create-evals"): void {
    const mf = manifestFor(tmp, cfg, generatedBy);
    mkdirSync(join(tmp, ".zoto-eval-system"), { recursive: true });
    writeFileSync(join(tmp, ".zoto-eval-system", "manifest.yml"), YAML.stringify(mf));
    writeFileSync(join(tmp, ".zoto-eval-system", "manifest.history.yml"), "---\n" + YAML.stringify(mf));
  }

  const originalCwd = process.cwd();

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "zoto-eval-fixture-"));
    initRepo();
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmp, { recursive: true, force: true });
  });

  // Test 12 — fresh scaffold: eval:update --check exits 0
  it("12: after create, eval:update --check exits 0", () => {
    const cfg = writeConfig();
    writeSkill("zoto-foo", "Foo skill for testing");
    const hash = sha256(normaliseContent(readFileSync(join(tmp, "skills", "zoto-foo", "SKILL.md"), "utf-8")));
    writeGeneratedEvalsFile("zoto-foo", hash);
    seedManifest(cfg);
    const out = runUpdate({ repoRoot: tmp, mode: "check" });
    expect(out.code).toBe(0);
  });

  // Test 13 — added target critical, stdout reports "added: 1 (critical)"
  it("13: adding a new skill yields exit 2 and 'added' count", () => {
    const cfg = writeConfig();
    writeSkill("zoto-foo", "Foo skill");
    const hash = sha256(normaliseContent(readFileSync(join(tmp, "skills", "zoto-foo", "SKILL.md"), "utf-8")));
    writeGeneratedEvalsFile("zoto-foo", hash);
    seedManifest(cfg);
    writeSkill("zoto-bar", "Bar skill newly added");
    const out = runUpdate({ repoRoot: tmp, mode: "check" });
    expect(out.code).toBe(2);
    expect(out.deltas.some((d) => d.kind === "added" && d.critical)).toBe(true);
  });

  // Test 14 — targeted apply scaffolds missing evals.json, drift returns to 0
  it("14: targeted apply with accept-all creates the evals.json; check returns to 0", () => {
    const cfg = writeConfig();
    writeSkill("zoto-foo", "Foo skill");
    const hash = sha256(normaliseContent(readFileSync(join(tmp, "skills", "zoto-foo", "SKILL.md"), "utf-8")));
    writeGeneratedEvalsFile("zoto-foo", hash);
    seedManifest(cfg);
    writeSkill("zoto-baz", "Newly added skill");
    const check1 = runUpdate({ repoRoot: tmp, mode: "check" });
    expect(check1.code).toBe(2);

    // Simulate accept-all: write a generated evals.json for the new skill and
    // update the manifest.
    const newHash = sha256(normaliseContent(readFileSync(join(tmp, "skills", "zoto-baz", "SKILL.md"), "utf-8")));
    writeGeneratedEvalsFile("zoto-baz", newHash);
    const applyOut = runUpdate({ repoRoot: tmp, mode: "rediscovery-apply" });
    expect(applyOut.code).toBe(0);

    const check2 = runUpdate({ repoRoot: tmp, mode: "check" });
    expect(check2.code).toBe(0);

    const evalsPath = join(tmp, "skills", "zoto-baz", "evals", "evals.json");
    const data = loadJson(evalsPath) as { evals: EvalCase[] };
    for (const c of data.evals) {
      expect(c._meta?.generated).toBe(true);
      expect(c._meta?.source_hash).toBe(newHash);
    }
  });

  // Test 15 — surgical diff preserves user cases
  it("15: modifying a target leaves user-authored cases byte-for-byte identical", () => {
    const cfg = writeConfig();
    writeSkill("zoto-foo", "Initial description");
    const hash1 = sha256(normaliseContent(readFileSync(join(tmp, "skills", "zoto-foo", "SKILL.md"), "utf-8")));
    writeGeneratedEvalsFile("zoto-foo", hash1, true);
    const evalsPath = join(tmp, "skills", "zoto-foo", "evals", "evals.json");
    const userCaseBefore = (loadJson(evalsPath) as { evals: EvalCase[] }).evals.find(
      (c) => c.id === "user-1",
    );
    seedManifest(cfg);

    writeSkill("zoto-foo", "UPDATED description that changes public surface");
    const hash2 = sha256(normaliseContent(readFileSync(join(tmp, "skills", "zoto-foo", "SKILL.md"), "utf-8")));
    expect(hash2).not.toBe(hash1);

    // Simulate "accept-all" for generated cases: the updater would rewrite
    // generated cases with new source_hash. Do that directly using
    // applyCaseUpdates to verify the contract.
    const ef = loadJson(evalsPath) as EvalFile;
    const updates = [
      {
        id: 1 as number,
        newCase: {
          id: 1,
          prompt: "regen 1",
          assertions: ["asserts generated"],
          _meta: {
            generated: true,
            source_hash: hash2,
            last_updated: "2026-05-03T00:00:00Z",
            generated_by: "zoto-update-evals",
          },
        },
      },
      {
        id: 2 as number,
        newCase: {
          id: 2,
          prompt: "regen 2",
          assertions: ["also generated"],
          _meta: {
            generated: true,
            source_hash: hash2,
            last_updated: "2026-05-03T00:00:00Z",
            generated_by: "zoto-update-evals",
          },
        },
      },
    ];
    const updated = applyCaseUpdates(ef, updates);
    writeFileSync(evalsPath, JSON.stringify(updated, null, 2));

    const after = loadJson(evalsPath) as { evals: EvalCase[] };
    const userAfter = after.evals.find((c) => c.id === "user-1");
    expect(userAfter).toEqual(userCaseBefore);

    const gen1 = after.evals.find((c) => c.id === 1)!;
    expect(gen1._meta?.source_hash).toBe(hash2);
    expect(gen1._meta?.last_updated).not.toBe("2026-05-01T00:00:00Z");

    const ids = after.evals.map((c) => c.id);
    expect(ids).toEqual(["user-1", 1, 2]);
  });

  // Test 16 — removed target → exit 2 with "removed-with-active-cases"
  it("16: deleting a covered target is critical; apply marks orphaned", () => {
    const cfg = writeConfig();
    writeSkill("zoto-foo", "Foo");
    const hash = sha256(normaliseContent(readFileSync(join(tmp, "skills", "zoto-foo", "SKILL.md"), "utf-8")));
    writeGeneratedEvalsFile("zoto-foo", hash);
    seedManifest(cfg);

    rmSync(join(tmp, "skills", "zoto-foo"), { recursive: true });
    const check = runUpdate({ repoRoot: tmp, mode: "check" });
    expect(check.code).toBe(2);
    const removedCritical = check.deltas.find((d) => d.kind === "removed" && d.critical);
    expect(removedCritical).toBeDefined();
    expect(removedCritical!.reason).toMatch(/removed target with active generated cases/);
  });

  // Test 17 — non-critical noise ignored
  it("17: comment/whitespace-only change is treated as non-critical (still detected, but not critical)", () => {
    const cfg = writeConfig();
    writeSkill("zoto-foo", "desc");
    const hash = sha256(normaliseContent(readFileSync(join(tmp, "skills", "zoto-foo", "SKILL.md"), "utf-8")));
    writeGeneratedEvalsFile("zoto-foo", hash);
    seedManifest(cfg);

    // Append trailing whitespace that normaliseContent strips -> identical hash
    const p = join(tmp, "skills", "zoto-foo", "SKILL.md");
    writeFileSync(p, readFileSync(p, "utf-8") + "   \n\n");
    const check = runUpdate({ repoRoot: tmp, mode: "check" });
    expect(check.code).toBe(0);
  });

  // Test 18 — manifest history append-only (two entries after create + apply with a critical change)
  it("18: manifest.history.yml gains one snapshot per apply", () => {
    const cfg = writeConfig();
    writeSkill("zoto-foo", "one");
    const hash = sha256(normaliseContent(readFileSync(join(tmp, "skills", "zoto-foo", "SKILL.md"), "utf-8")));
    writeGeneratedEvalsFile("zoto-foo", hash);
    seedManifest(cfg);

    const historyPath = join(tmp, ".zoto-eval-system", "manifest.history.yml");
    const before = readFileSync(historyPath, "utf-8");
    const snapshotsBefore = before.split(/^---$/m).filter((s) => s.trim()).length;
    expect(snapshotsBefore).toBe(1);

    writeSkill("zoto-bar", "two");
    runUpdate({ repoRoot: tmp, mode: "rediscovery-apply" });

    const after = readFileSync(historyPath, "utf-8");
    const snapshotsAfter = after.split(/^---$/m).filter((s) => s.trim()).length;
    expect(snapshotsAfter).toBe(2);
  });

  // Test 19 — config-edit-vs-code-edit: rediscovery uses manifest snapshot
  it("19: editing config.discoveryTargets does not cause drift by itself", () => {
    const cfg = writeConfig();
    writeSkill("zoto-foo", "foo");
    const hash = sha256(normaliseContent(readFileSync(join(tmp, "skills", "zoto-foo", "SKILL.md"), "utf-8")));
    writeGeneratedEvalsFile("zoto-foo", hash);
    seedManifest(cfg);

    const cfgPath = join(tmp, ".zoto-eval-system", "config.json");
    const edited = JSON.parse(readFileSync(cfgPath, "utf-8"));
    edited.discoveryTargets = [...edited.discoveryTargets, "lib"];
    writeFileSync(cfgPath, JSON.stringify(edited, null, 2));

    const check = runUpdate({ repoRoot: tmp, mode: "check" });
    expect(check.code).toBe(0);
  });

  // Test 20 — refuses to mutate non-_meta cases (compile-time literal + runtime throw)
  it("20: update.ts.tmpl contains the literal guard string and throws at runtime", () => {
    const raw = readText(join(PLUGIN_DIR, "templates", "llm", "agent-sdk", "update.ts.tmpl"));
    expect(raw.includes("_meta?.generated === true")).toBe(true);
    expect(/throw new Error\(/.test(raw)).toBe(true);
    expect(() =>
      applyCaseUpdates(
        { evals: [{ id: 1, prompt: "user", assertions: ["a"] }] },
        [
          {
            id: 1,
            newCase: {
              id: 1,
              prompt: "x",
              assertions: ["a"],
              _meta: { generated: true, source_hash: "h", last_updated: "2026-05-03T00:00:00Z", generated_by: "x" },
            },
          },
        ],
      ),
    ).toThrow(/refuse-to-mutate/);
  });
});

// ---------------------------------------------------------------------------
// 8. Package-json merger
// ---------------------------------------------------------------------------
describe("package.json merger", () => {
  it("merges scripts and devDependencies idempotently", () => {
    const t = mkdtempSync(join(tmpdir(), "zoto-eval-merge-"));
    try {
      writeFileSync(
        join(t, "package.json"),
        JSON.stringify(
          { name: "host", version: "1.0.0", scripts: { build: "tsc" }, devDependencies: { tsx: "^4.0.0" } },
          null,
          2,
        ),
      );
      const base = join(PLUGIN_DIR, "templates", "package-scripts", "base.json");
      const out = mergePackageJson({ repoRoot: t, basePath: base });
      expect(out.scripts?.eval).toBeDefined();
      expect(out.scripts?.["eval:update"]).toBeDefined();
      expect(out.devDependencies?.tsx).toBe("^4.0.0"); // existing wins
      expect(out.devDependencies?.["@cursor/sdk"]).toBeDefined();
    } finally {
      rmSync(t, { recursive: true, force: true });
    }
  });
});
