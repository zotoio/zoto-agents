/**
 * Subtask 06 — co-located single-LLM-emitter path resolution + stampTarget
 * skip semantics.
 *
 * Run: pnpm exec vitest run scripts/__tests__/eval-stamp-routing.test.ts
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ANALYSER_VERSION,
  computeAnalyserCacheKey,
  normaliseContent,
  type AnalyserPayload,
} from "../eval-analyse.ts";
import {
  buildPrimitiveMetaFromPayload,
  resolveLlmTargetPath,
  stampTarget,
} from "../eval-stamp.ts";

function minimalPayload(
  overrides: Partial<AnalyserPayload> = {},
): AnalyserPayload {
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
    target_id: "command:z-routing-test",
    kind: "command",
    source_path: "plugins/zoto-test/commands/z-routing-test.md",
    source_hash: sourceHash,
    summary: "Synthetic routing test payload.",
    cases: [
      {
        scenario: "happy path",
        prompt: "/z-routing-test --flag value",
        assertions: ["responds with success"],
      },
    ],
    ...overrides,
  };
}

function mkHostRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "eval-stamp-routing-"));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "host-routing-test", private: true }, null, 2),
  );
  mkdirSync(join(root, ".zoto", "eval-system"), { recursive: true });
  writeFileSync(
    join(root, ".zoto", "eval-system", "config.yml"),
    [
      "schema_version: 1",
      "llm:",
      "  model:",
      "    id: composer-2.5",
      "judgeModel: opus-4.6",
      "",
    ].join("\n"),
  );
  return root;
}

describe("resolveLlmTargetPath", () => {
  it("maps plugin commands to <plugin>/commands/evals/<name>.test.ts", () => {
    const path = resolveLlmTargetPath({
      kind: "command",
      sourcePath: "/repo/plugins/zoto-test/commands/z-routing-test.md",
      name: "z-routing-test",
    });
    expect(path).toBe(
      "/repo/plugins/zoto-test/commands/evals/z-routing-test.test.ts",
    );
  });

  it("maps workspace agents to .cursor/agents/evals/<name>.test.ts", () => {
    const path = resolveLlmTargetPath({
      kind: "agent",
      sourcePath: "/repo/.cursor/agents/zoto-eval-engineer.md",
      name: "zoto-eval-engineer",
    });
    expect(path).toBe(
      "/repo/.cursor/agents/evals/zoto-eval-engineer.test.ts",
    );
  });

  it("maps plugin agents to <plugin>/agents/evals/<name>.test.ts", () => {
    const path = resolveLlmTargetPath({
      kind: "agent",
      sourcePath: "/repo/plugins/zoto-eval-system/agents/zoto-eval-judge.md",
      name: "zoto-eval-judge",
    });
    expect(path).toBe(
      "/repo/plugins/zoto-eval-system/agents/evals/zoto-eval-judge.test.ts",
    );
  });

  it("maps plugin hooks to <plugin>/hooks/evals/hooks.test.ts (bundled)", () => {
    const path = resolveLlmTargetPath({
      kind: "hook",
      sourcePath: "/repo/plugins/zoto-eval-system/hooks/hooks.json",
      name: "zoto-eval-system",
    });
    expect(path).toBe(
      "/repo/plugins/zoto-eval-system/hooks/evals/hooks.test.ts",
    );
  });

  it("maps workspace .cursor/hooks/hooks.json to .cursor/hooks/evals/hooks.test.ts", () => {
    const path = resolveLlmTargetPath({
      kind: "hook",
      sourcePath: "/repo/.cursor/hooks/hooks.json",
      name: "cursor-workspace",
    });
    expect(path).toBe("/repo/.cursor/hooks/evals/hooks.test.ts");
  });

  it("canonicalises bare .cursor/hooks.json to .cursor/hooks/evals/hooks.test.ts", () => {
    const path = resolveLlmTargetPath({
      kind: "hook",
      sourcePath: "/repo/.cursor/hooks.json",
      name: "cursor-workspace",
    });
    expect(path).toBe("/repo/.cursor/hooks/evals/hooks.test.ts");
  });

  it("returns null for skills (JSON-only — skill evals.json retained)", () => {
    expect(
      resolveLlmTargetPath({
        kind: "skill",
        sourcePath: "/repo/plugins/zoto-x/skills/zoto-foo/SKILL.md",
        name: "zoto-foo",
      }),
    ).toBeNull();
  });

  it("returns null for rules (not eval-stamped)", () => {
    expect(
      resolveLlmTargetPath({
        kind: "rule",
        sourcePath: "/repo/.cursor/rules/some-rule.mdc",
        name: "some-rule",
      }),
    ).toBeNull();
  });
});

describe("buildPrimitiveMetaFromPayload", () => {
  it("derives a kind-prefixed slug from the analyser target_id", () => {
    const meta = buildPrimitiveMetaFromPayload(
      minimalPayload({
        target_id: "agent:zoto-eval-engineer",
        kind: "agent",
        source_path: ".cursor/agents/zoto-eval-engineer.md",
      }),
    );
    expect(meta.slug).toBe("agent_zoto-eval-engineer");
    expect(meta.target_id).toBe("agent:zoto-eval-engineer");
    expect(meta.source_path).toBe(".cursor/agents/zoto-eval-engineer.md");
  });
});

describe("stampTarget kind dispatch", () => {
  it("emits a co-located TS for command primitives (dry-run)", async () => {
    const host = mkHostRepo();
    try {
      mkdirSync(join(host, "plugins", "zoto-test", "commands"), {
        recursive: true,
      });
      writeFileSync(
        join(host, "plugins", "zoto-test", "commands", "z-routing-test.md"),
        "---\nname: z-routing-test\ndescription: test\n---\n",
      );
      const result = await stampTarget(
        host,
        "command:z-routing-test",
        minimalPayload(),
        { dryRun: true },
      );
      expect(result.backend).toBe("llm");
      expect(result.skipped).toBeUndefined();
      expect(result.path).toBe(
        join(
          "plugins",
          "zoto-test",
          "commands",
          "evals",
          "z-routing-test.test.ts",
        ),
      );
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });

  it("emits a co-located TS for agent primitives (dry-run)", async () => {
    const host = mkHostRepo();
    try {
      mkdirSync(join(host, ".cursor", "agents"), { recursive: true });
      writeFileSync(
        join(host, ".cursor", "agents", "zoto-eval-engineer.md"),
        "---\nname: zoto-eval-engineer\ndescription: agent\n---\n",
      );
      const result = await stampTarget(
        host,
        "agent:zoto-eval-engineer",
        minimalPayload({
          target_id: "agent:zoto-eval-engineer",
          kind: "agent",
          source_path: ".cursor/agents/zoto-eval-engineer.md",
        }),
        { dryRun: true },
      );
      expect(result.backend).toBe("llm");
      expect(result.skipped).toBeUndefined();
      expect(result.path).toBe(
        join(".cursor", "agents", "evals", "zoto-eval-engineer.test.ts"),
      );
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });

  it("emits a bundled hooks.test.ts for hook primitives (dry-run)", async () => {
    const host = mkHostRepo();
    try {
      mkdirSync(join(host, "plugins", "zoto-test", "hooks"), {
        recursive: true,
      });
      writeFileSync(
        join(host, "plugins", "zoto-test", "hooks", "hooks.json"),
        JSON.stringify({ version: 1, hooks: {} }, null, 2),
      );
      const result = await stampTarget(
        host,
        "hook:zoto-test",
        minimalPayload({
          target_id: "hook:zoto-test",
          kind: "hook",
          source_path: "plugins/zoto-test/hooks/hooks.json",
        }),
        { dryRun: true },
      );
      expect(result.backend).toBe("llm");
      expect(result.skipped).toBeUndefined();
      expect(result.path).toBe(
        join("plugins", "zoto-test", "hooks", "evals", "hooks.test.ts"),
      );
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });

  it("skips skill primitives and returns the existing evals.json path", async () => {
    const host = mkHostRepo();
    try {
      mkdirSync(
        join(host, "plugins", "zoto-test", "skills", "zoto-foo", "evals"),
        { recursive: true },
      );
      writeFileSync(
        join(host, "plugins", "zoto-test", "skills", "zoto-foo", "SKILL.md"),
        "---\nname: zoto-foo\ndescription: skill\n---\n",
      );
      writeFileSync(
        join(
          host,
          "plugins",
          "zoto-test",
          "skills",
          "zoto-foo",
          "evals",
          "evals.json",
        ),
        JSON.stringify({ skill_name: "zoto-foo", evals: [] }, null, 2),
      );
      const result = await stampTarget(
        host,
        "skill:zoto-foo",
        minimalPayload({
          target_id: "skill:zoto-foo",
          kind: "skill",
          source_path: "plugins/zoto-test/skills/zoto-foo/SKILL.md",
        }),
        { dryRun: true },
      );
      expect(result.skipped).toBe("skill");
      expect(result.written).toBe(false);
      expect(result.path).toBe(
        join("plugins", "zoto-test", "skills", "zoto-foo", "evals", "evals.json"),
      );
      expect(result.note).toContain("no TS sidecar");
      // The original evals.json must remain untouched.
      expect(
        readFileSync(
          join(
            host,
            "plugins",
            "zoto-test",
            "skills",
            "zoto-foo",
            "evals",
            "evals.json",
          ),
          "utf-8",
        ),
      ).toContain("zoto-foo");
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });
});

describe("stampTarget emit shape", () => {
  it("emits a vitest-only TS file that imports defineLlmEval + LlmCaseDefinition", async () => {
    const host = mkHostRepo();
    try {
      mkdirSync(join(host, ".cursor", "agents"), { recursive: true });
      writeFileSync(
        join(host, ".cursor", "agents", "zoto-eval-engineer.md"),
        "---\nname: zoto-eval-engineer\ndescription: agent\n---\n",
      );
      const result = await stampTarget(
        host,
        "agent:zoto-eval-engineer",
        minimalPayload({
          target_id: "agent:zoto-eval-engineer",
          kind: "agent",
          source_path: ".cursor/agents/zoto-eval-engineer.md",
        }),
        { dryRun: false },
      );
      expect(result.written).toBe(true);
      const testFile = join(host, result.path);
      expect(existsSync(testFile)).toBe(true);
      const body = readFileSync(testFile, "utf-8");
      // First line is the file-level generated marker (file guard).
      expect(body.split("\n", 1)[0]).toBe("// _meta.generated: true");
      // The vitest framework import is present (jest path was retired).
      expect(body).toContain(
        'import { describe, it, afterAll, expect } from "vitest";',
      );
      // The renamed harness symbols are present.
      expect(body).toContain(`import type { LlmCaseDefinition } from`);
      expect(body).toContain(`import { defineLlmEval } from`);
      expect(body).toContain("const CASES: LlmCaseDefinition[] = ");
      expect(body).toContain('defineLlmEval({');
      // The relative harness path resolves back to evals/llm/_shared/.
      expect(body).toContain("/run-llm-suite.js");
      expect(body).toContain("/llm-case.js");
      // No retired symbol names leak through.
      const retiredSymbols = [
        ["defineLlm", "CodeEval"].join(""),
        ["CodeStrategy", "CaseDefinition"].join(""),
        ["run-code-", "strategy-suite"].join(""),
      ];
      for (const retired of retiredSymbols) {
        expect(body).not.toContain(retired);
      }
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });
});
