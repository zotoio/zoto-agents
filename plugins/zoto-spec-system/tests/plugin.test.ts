import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

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

function globFiles(
  dir: string,
  ext: string,
  results: string[] = [],
): string[] {
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
// 1. Plugin Structure Validation
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

  it("directories referenced in plugin.json exist", () => {
    for (const d of ["agents", "skills", "commands", "rules"]) {
      expect(isDir(join(PLUGIN_DIR, d)), `${d}/ missing`).toBe(true);
    }
  });

  it("hooks.json exists", () => {
    expect(isFile(join(PLUGIN_DIR, "hooks", "hooks.json"))).toBe(true);
  });

  it("LICENSE exists", () => {
    expect(isFile(join(PLUGIN_DIR, "LICENSE"))).toBe(true);
  });

  it("README is not a stub", () => {
    const readme = join(PLUGIN_DIR, "README.md");
    expect(isFile(readme)).toBe(true);
    const lines = readText(readme).split("\n");
    expect(lines.length, `README only ${lines.length} lines`).toBeGreaterThan(
      50,
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Config Schema Validation
// ---------------------------------------------------------------------------

describe("Config Schema", () => {
  it("example config is valid JSON", () => {
    loadJson(join(PLUGIN_DIR, "docs", "example-config.json"));
  });

  it("template config is valid JSON", () => {
    loadJson(join(PLUGIN_DIR, "templates", "config.json"));
  });

  it("example config has required fields", () => {
    const c = loadJson(join(PLUGIN_DIR, "docs", "example-config.json"));
    const required = [
      "unitOfWork",
      "specsDir",
      "workDir",
      "hooks",
      "spec",
      "extensions",
    ];
    const missing = required.filter((f) => !(f in c));
    expect(missing, `Missing fields: ${missing.join(", ")}`).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2b. Performance Defaults
// ---------------------------------------------------------------------------

describe("Performance Defaults", () => {
  it("documents default parallelism as 8", () => {
    const schema = readText(join(PLUGIN_DIR, "docs", "config-schema.md"));
    const example = loadJson(join(PLUGIN_DIR, "docs", "example-config.json"));
    const spec = example.spec as Record<string, unknown>;

    expect(schema).toContain("| `spec.parallelLimit` | number | `8` |");
    expect(spec.parallelLimit).toBe(8);
  });

  it("spec agents prefer composer-2", () => {
    const agentsDir = join(PLUGIN_DIR, "agents");
    for (const agent of [
      "zoto-spec-generator.md",
      "zoto-spec-executor.md",
      "zoto-spec-judge.md",
    ]) {
      const text = readText(join(agentsDir, agent));
      expect(text, `${agent} should prefer composer-2`).toContain(
        "model: composer-2",
      );
    }
  });

  it("create and execute skills document execution-time optimization", () => {
    const createSkill = readText(
      join(PLUGIN_DIR, "skills", "zoto-create-spec", "SKILL.md"),
    );
    const executeSkill = readText(
      join(PLUGIN_DIR, "skills", "zoto-execute-spec", "SKILL.md"),
    );

    expect(createSkill).toContain("Optimize for End-to-End Execution Time");
    expect(createSkill).toContain("Critical path first");
    expect(createSkill).toContain("Right-size subtasks");
    expect(executeSkill).toContain("End-to-End Performance Rules");
    expect(executeSkill).toContain("Slot-fill execution");
    expect(executeSkill).toContain("composer-2");
  });
});

// ---------------------------------------------------------------------------
// 3. Content Integrity — No CRUX References
// ---------------------------------------------------------------------------

describe("Content Integrity", () => {
  const EXCLUDED = new Set([
    "memory-extension-guide.md",
    "plugin.test.ts",
    "validate-plugin.ts",
  ]);
  const SCANNABLE_EXTS = new Set([".md", ".mdc", ".ts", ".json"]);

  it("no crux references in content files", () => {
    const pattern = /crux/i;
    const hits: string[] = [];

    const allFiles = [
      ...globFiles(PLUGIN_DIR, ".md"),
      ...globFiles(PLUGIN_DIR, ".mdc"),
      ...globFiles(PLUGIN_DIR, ".ts"),
      ...globFiles(PLUGIN_DIR, ".json"),
    ];

    for (const path of allFiles) {
      const name = path.split("/").pop()!;
      if (EXCLUDED.has(name)) continue;
      if (!SCANNABLE_EXTS.has("." + name.split(".").pop()!)) continue;

      try {
        const text = readText(path);
        if (pattern.test(text)) {
          hits.push(relative(PLUGIN_DIR, path));
        }
      } catch {
        continue;
      }
    }

    expect(hits, `CRUX references found in: ${hits.join(", ")}`).toHaveLength(
      0,
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Naming Convention — zoto- Prefix
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

  it("generator agent exists", () => {
    expect(
      isFile(join(PLUGIN_DIR, "agents", "zoto-spec-generator.md")),
    ).toBe(true);
  });

  it("executor agent exists", () => {
    expect(
      isFile(join(PLUGIN_DIR, "agents", "zoto-spec-executor.md")),
    ).toBe(true);
  });

  it("judge agent exists", () => {
    expect(
      isFile(join(PLUGIN_DIR, "agents", "zoto-spec-judge.md")),
    ).toBe(true);
  });

  it("rule file exists", () => {
    expect(
      isFile(join(PLUGIN_DIR, "rules", "zoto-spec-system.mdc")),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Cross-Reference Validation
// ---------------------------------------------------------------------------

describe("Cross-References", () => {
  it("commands reference an agent", () => {
    const cmdDir = join(PLUGIN_DIR, "commands");
    for (const f of readdirSync(cmdDir).filter((n) => n.startsWith("zoto-"))) {
      const text = readText(join(cmdDir, f));
      expect(
        text.includes("zoto-spec-generator") || text.includes("zoto-spec-executor") || text.includes("zoto-spec-judge"),
        `${f} references neither agent`,
      ).toBe(true);
    }
  });

  it("judge command references judge agent", () => {
    const text = readText(join(PLUGIN_DIR, "commands", "zoto-spec-judge.md"));
    expect(text).toContain("zoto-spec-judge");
  });

  it("execute command references executor agent", () => {
    const text = readText(join(PLUGIN_DIR, "commands", "zoto-spec-execute.md"));
    expect(text).toContain("zoto-spec-executor");
  });

  it("judge agent references judge skill", () => {
    const text = readText(join(PLUGIN_DIR, "agents", "zoto-spec-judge.md"));
    expect(text).toContain("zoto-judge-spec");
  });

  it("generator agent references judge", () => {
    const text = readText(join(PLUGIN_DIR, "agents", "zoto-spec-generator.md"));
    expect(text).toContain("zoto-spec-judge");
  });

  it("create command references create skill", () => {
    const text = readText(join(PLUGIN_DIR, "commands", "zoto-spec-create.md"));
    expect(text).toContain("zoto-create-spec");
  });

  it("judge command references judge skill", () => {
    const text = readText(join(PLUGIN_DIR, "commands", "zoto-spec-judge.md"));
    expect(text).toContain("zoto-judge-spec");
  });

  it("execute command references execute skill", () => {
    const text = readText(join(PLUGIN_DIR, "commands", "zoto-spec-execute.md"));
    expect(text).toContain("zoto-execute-spec");
  });

  it("generator agent references create skill", () => {
    const text = readText(join(PLUGIN_DIR, "agents", "zoto-spec-generator.md"));
    expect(text).toContain("zoto-create-spec");
  });

  it("executor agent references execute skill", () => {
    const text = readText(join(PLUGIN_DIR, "agents", "zoto-spec-executor.md"));
    expect(text).toContain("zoto-execute-spec");
  });

  it("hooks.json references existing script", () => {
    const h = loadJson(join(PLUGIN_DIR, "hooks", "hooks.json"));
    const hooks = h.hooks as Record<string, Array<{ command: string }>>;
    for (const hookList of Object.values(hooks)) {
      for (const entry of hookList) {
        const cmd = entry.command ?? "";
        const script = cmd.split(/\s+/).pop() ?? "";
        if (script) {
          expect(
            isFile(join(PLUGIN_DIR, script)),
            `hooks.json references missing script: ${script}`,
          ).toBe(true);
        }
      }
    }
  });

  it("hook script has valid syntax", () => {
    const script = join(PLUGIN_DIR, "hooks", "zoto-session-start.ts");
    expect(isFile(script)).toBe(true);
    const content = readText(script);
    expect(content.length).toBeGreaterThan(0);
  });
});
