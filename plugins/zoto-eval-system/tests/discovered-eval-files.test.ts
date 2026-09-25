import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveDiscoveredEvalFiles } from "../engine/discovered-eval-files.js";
import { discover } from "../scripts/eval-discover.js";
import {
  buildPrimitiveMetaFromPayload,
  stampVitestPerPrimitive,
  vitestStaticTestBasename,
} from "../scripts/eval-stamp.ts";
import {
  ANALYSER_VERSION,
  computeAnalyserCacheKey,
  normaliseContent,
  type AnalyserPayload,
} from "../scripts/eval-analyse.ts";

const PLUGIN_DIR = join(import.meta.dirname, "..");

const tmpDirs: string[] = [];

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    rmSync(d, { recursive: true, force: true });
  }
});

function tmp(label: string): string {
  const dir = mkdtempSync(join(tmpdir(), `zoto-disc-eval-${label}-`));
  tmpDirs.push(dir);
  return dir;
}

describe("vitestStaticTestBasename", () => {
  it("strips a redundant kind prefix from buildPrimitiveMeta slugs", () => {
    expect(vitestStaticTestBasename("skill", "skill_nab-testing")).toBe(
      "test_skill_nab-testing.test.ts",
    );
    expect(vitestStaticTestBasename("command", "command_z-eval-help")).toBe(
      "test_command_z-eval-help.test.ts",
    );
  });

  it("keeps a clean slug and still prefixes kind once", () => {
    expect(vitestStaticTestBasename("skill", "nab-testing")).toBe(
      "test_skill_nab-testing.test.ts",
    );
    expect(vitestStaticTestBasename("agent", "zoto-eval-judge")).toBe(
      "test_agent_zoto-eval-judge.test.ts",
    );
  });
});

describe("resolveDiscoveredEvalFiles", () => {
  it("prefers co-located JSON over the legacy plugins/*/evals/<kind>s/ path", () => {
    const repo = tmp("colocated");
    const cmd = join(repo, "plugins", "demo", "commands", "z-demo.md");
    mkdirSync(join(repo, "plugins", "demo", "commands", "evals"), {
      recursive: true,
    });
    mkdirSync(join(repo, "plugins", "demo", "evals", "commands"), {
      recursive: true,
    });
    writeFileSync(cmd, "---\nname: z-demo\n---\n");
    writeFileSync(
      join(repo, "plugins", "demo", "commands", "evals", "z-demo.json"),
      "{}\n",
    );
    writeFileSync(
      join(repo, "plugins", "demo", "evals", "commands", "z-demo.json"),
      "{}\n",
    );
    expect(resolveDiscoveredEvalFiles(repo, "command", cmd)).toEqual([
      "plugins/demo/commands/evals/z-demo.json",
    ]);
  });

  it("falls back to the legacy declarative JSON path", () => {
    const repo = tmp("legacy");
    const cmd = join(repo, "plugins", "demo", "commands", "z-demo.md");
    mkdirSync(join(repo, "plugins", "demo", "commands"), { recursive: true });
    mkdirSync(join(repo, "plugins", "demo", "evals", "commands"), {
      recursive: true,
    });
    writeFileSync(cmd, "---\nname: z-demo\n---\n");
    writeFileSync(
      join(repo, "plugins", "demo", "evals", "commands", "z-demo.json"),
      "{}\n",
    );
    expect(resolveDiscoveredEvalFiles(repo, "command", cmd)).toEqual([
      "plugins/demo/evals/commands/z-demo.json",
    ]);
  });

  it("catalogues skill evals.json and returns empty when nothing exists", () => {
    const repo = tmp("skill");
    const skillMd = join(repo, "plugins", "demo", "skills", "alpha", "SKILL.md");
    mkdirSync(join(repo, "plugins", "demo", "skills", "alpha", "evals"), {
      recursive: true,
    });
    writeFileSync(skillMd, "---\nname: alpha\n---\n");
    expect(resolveDiscoveredEvalFiles(repo, "skill", skillMd)).toEqual([]);
    writeFileSync(
      join(repo, "plugins", "demo", "skills", "alpha", "evals", "evals.json"),
      "{}\n",
    );
    expect(resolveDiscoveredEvalFiles(repo, "skill", skillMd)).toEqual([
      "plugins/demo/skills/alpha/evals/evals.json",
    ]);
  });
});

describe("eval-discover catalogues co-located JSON", () => {
  it("lists plugin command evals next to the command, not evals/test_*.test.ts", () => {
    const repo = tmp("discover");
    mkdirSync(join(repo, ".zoto", "eval-system"), { recursive: true });
    writeFileSync(
      join(repo, ".zoto", "eval-system", "config.yml"),
      ["discoveryTargets:", "  - command", "  - skill", ""].join("\n"),
    );
    const cmdDir = join(repo, "plugins", "demo", "commands");
    mkdirSync(join(cmdDir, "evals"), { recursive: true });
    writeFileSync(
      join(cmdDir, "z-demo.md"),
      "---\nname: z-demo\ndescription: demo\n---\n",
    );
    writeFileSync(join(cmdDir, "evals", "z-demo.json"), "{}\n");

    const targets = discover(repo, {
      discoveryTargets: ["command", "skill"],
    });
    const hit = targets.find((t) => t.id === "command:z-demo");
    expect(hit?.eval_files).toEqual(["plugins/demo/commands/evals/z-demo.json"]);
  });
});

function minimalPayload(): AnalyserPayload {
  const source = "---\nname: x\ndescription: y\n---\n\nbody\n";
  const sourceHash = computeAnalyserCacheKey({
    normalisedSource: normaliseContent(source),
    analyserVersion: ANALYSER_VERSION,
    modelId: "composer-2.5",
  });
  return {
    schema_version: 1,
    analyser_version: ANALYSER_VERSION,
    model_id: "composer-2.5",
    target_id: "skill:nab-testing",
    kind: "skill",
    source_path: "plugins/zoto-test/skills/nab-testing/SKILL.md",
    source_hash: sourceHash,
    summary: "Synthetic path test payload.",
    cases: [
      {
        scenario: "happy",
        prompt: "run nab-testing",
        assertions: ["writes the expected artefact"],
      },
    ],
  };
}

describe("stampVitestPerPrimitive catalogue path", () => {
  it("writes test_<kind>_<name>.test.ts even when slug is kind-prefixed", () => {
    const host = tmp("stamp");
    mkdirSync(join(host, ".zoto", "eval-system"), { recursive: true });
    cpSync(
      join(PLUGIN_DIR, "templates"),
      join(host, ".zoto", "eval-system", "templates"),
      { recursive: true },
    );
    writeFileSync(
      join(host, ".zoto", "eval-system", "config.yml"),
      "static:\n  framework: vitest\n",
    );
    const payload = minimalPayload();
    const primitive = buildPrimitiveMetaFromPayload(payload);
    expect(primitive.slug).toBe("skill_nab-testing");
    const result = stampVitestPerPrimitive(host, payload, primitive, {
      bypassGuard: true,
    });
    expect(result.testFile.endsWith("evals/test_skill_nab-testing.test.ts")).toBe(
      true,
    );
    expect(result.testFile.includes("test_skill_skill_")).toBe(false);
  });
});
