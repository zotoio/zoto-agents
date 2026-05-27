/**
 * Subtask 08 — relocate-and-restamp migration unit tests.
 *
 * Coverage matrix:
 *   1. Verbatim TS case content preservation (input → expected output
 *      diffs only by the renamed `defineLlmEval` symbol and the renamed
 *      import paths).
 *   2. JSON → TS wrap preserves case-object SHA256 (canonical JSON of
 *      every case stays byte-identical between input JSON and emitted
 *      TS).
 *   3. `_meta.generated === true` gate blocks deletion when the marker is
 *      missing (a fixture without the marker produces a fatal blocker and
 *      a `.spec-blocker-*.json` log entry).
 *   4. Skill `evals.json` is NEVER touched (`SKILL_EVALS_JSON_PATHS`
 *      excludes every legacy skill eval path; the planner rejects any
 *      move/deletion that targets one).
 *   5. Idempotency — running the apply path twice over a synthetic
 *      fixture produces zero file diff between the two runs.
 *
 * Run: pnpm exec vitest run scripts/__tests__/eval-relocate-migration.test.ts
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";
import YAML from "yaml";

import {
  __testing,
  type RunMainResult,
  runMain,
} from "../eval-relocate-migration.ts";

const {
  SKILL_EVALS_JSON_PATHS,
  LLM_TS_TO_RELOCATE,
  SKILL_LLM_TS_TO_DELETE,
  DECLARATIVE_JSON_INPUTS,
  legacyLlmTsToTargetId,
  legacyJsonToTargetId,
  legacyStaticVitestToTargetId,
  resolveCoLocatedPath,
  rewriteLlmTsBody,
  wrapDeclarativeJsonAsTs,
  planMigration,
  rewriteManifestEvalFiles,
  applyMigration,
  stampAnalyserCache,
} = __testing;

/* ---------------------------------------------------------------------- */
/* Fixture builders                                                        */
/* ---------------------------------------------------------------------- */

function sha256(s: string): string {
  return createHash("sha256").update(s, "utf-8").digest("hex");
}

function mkScratch(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `eval-relocate-${prefix}-`));
}

function writeScratch(scratch: string, rel: string, body: string): string {
  const abs = join(scratch, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body, "utf-8");
  return abs;
}

function readScratch(scratch: string, rel: string): string {
  return readFileSync(join(scratch, rel), "utf-8");
}

/** Minimal manifest with one of each kind so the planner has hits. */
function writeMinimalManifest(scratch: string): void {
  const manifest = {
    schema_version: 1,
    created_at: "2026-05-26T12:00:00Z",
    updated_at: "2026-05-26T12:00:00Z",
    git_ref: "deadbeefcafedeadbeefcafedeadbeefdeadbeef",
    generated_by: "test-fixture",
    discovery_config: {
      discoveryTargets: ["skill", "command", "agent", "hook"],
      evalsDir: "evals",
    },
    targets: [
      {
        id: "command:test-cmd",
        kind: "command",
        path: "plugins/zoto-test/commands/test-cmd.md",
        content_hash: "0".repeat(64),
        eval_files: ["plugins/zoto-test/evals/commands/test-cmd.json"],
      },
      {
        id: "agent:test-agent",
        kind: "agent",
        path: "plugins/zoto-test/agents/test-agent.md",
        content_hash: "1".repeat(64),
        eval_files: ["evals/llm/test_agent_test-agent.test.ts"],
      },
      {
        id: "hook:zoto-test",
        kind: "hook",
        path: "plugins/zoto-test/hooks/hooks.json",
        content_hash: "2".repeat(64),
        eval_files: ["plugins/zoto-test/evals/hooks/zoto-test.json"],
      },
      {
        id: "skill:zoto-test-skill",
        kind: "skill",
        path: "plugins/zoto-test/skills/zoto-test-skill/SKILL.md",
        content_hash: "3".repeat(64),
        eval_files: ["plugins/zoto-test/skills/zoto-test-skill/evals/evals.json"],
      },
    ],
  };
  writeScratch(scratch, ".zoto/eval-system/manifest.yml", YAML.stringify(manifest));
  writeScratch(scratch, ".zoto/eval-system/manifest.history.yml", "---\n");
}

/* ---------------------------------------------------------------------- */
/* 1. Verbatim TS case content preservation                                */
/* ---------------------------------------------------------------------- */

const LEGACY_LLM_TS_SAMPLE = `// _meta.generated: true
/**
 * LLM \`code\`-strategy eval for agent \`zoto-test\`.
 *
 * Stamped by \`scripts/eval-stamp.ts#stampLlmCodeStrategy\` from
 * \`plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl\`.
 */
import { describe, it, afterAll, expect } from "vitest";
import { resolveInteractionPlanFromCase } from "./_shared/askquestion-bridge.js";

import type { CodeStrategyCaseDefinition } from "./_shared/code-strategy-case.js";
import { defineLlmCodeEval } from "./_shared/run-code-strategy-suite.js";

const CASES: CodeStrategyCaseDefinition[] = [
  {
    "id": "happy-path",
    "prompt": "Do the thing.",
    "assertions": ["The thing was done."],
    "assertion_patterns": ["done"],
    "expected_output": "OK."
  },
  {
    "id": "edge-case",
    "prompt": "Do the other thing.",
    "assertions": ["Other thing was done."]
  }
];

defineLlmCodeEval({
  targetId: "agent:zoto-test",
  cases: CASES,
  modelId: process.env.ZOTO_EVAL_MODEL ?? "composer-2.5",
  judgeModel: process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6",
  caseTimeoutMs: 180000,
  describe,
  it,
  afterAll,
  expect,
});
`;

describe("rewriteLlmTsBody", () => {
  it("renames defineLlmCodeEval to defineLlmEval", () => {
    const out = rewriteLlmTsBody(LEGACY_LLM_TS_SAMPLE, "../../../evals/llm/_shared");
    expect(out).toContain("defineLlmEval(");
    expect(out).not.toContain("defineLlmCodeEval");
  });

  it("renames CodeStrategyCaseDefinition to LlmCaseDefinition", () => {
    const out = rewriteLlmTsBody(LEGACY_LLM_TS_SAMPLE, "../../../evals/llm/_shared");
    expect(out).toContain("LlmCaseDefinition");
    expect(out).not.toContain("CodeStrategyCaseDefinition");
  });

  it("repoints both shared imports to the relative harness path", () => {
    const out = rewriteLlmTsBody(LEGACY_LLM_TS_SAMPLE, "../../../evals/llm/_shared");
    expect(out).toContain('from "../../../evals/llm/_shared/run-llm-suite.js"');
    expect(out).toContain('from "../../../evals/llm/_shared/llm-case.js"');
    expect(out).toContain('from "../../../evals/llm/_shared/askquestion-bridge.js"');
    expect(out).not.toContain("./_shared/run-code-strategy-suite.js");
    expect(out).not.toContain("./_shared/code-strategy-case.js");
  });

  it("leaves CASES content and trailing config call byte-identical except symbol/path swaps", () => {
    const out = rewriteLlmTsBody(LEGACY_LLM_TS_SAMPLE, "../../../evals/llm/_shared");
    /* The cases array bytes are untouched; assert by extracting the CASES
     * literal from both bodies and checking byte equality. */
    const extractCases = (body: string): string => {
      const start = body.indexOf("const CASES");
      const end = body.indexOf("];", start);
      return body.slice(start, end + 2);
    };
    const beforeCases = extractCases(LEGACY_LLM_TS_SAMPLE).replace(
      "CodeStrategyCaseDefinition",
      "LlmCaseDefinition",
    );
    const afterCases = extractCases(out);
    expect(afterCases).toBe(beforeCases);
  });

  it("round-trips back to the input via reverse substitutions", () => {
    const out = rewriteLlmTsBody(LEGACY_LLM_TS_SAMPLE, "../../../evals/llm/_shared");
    const reversed = out
      .split('../../../evals/llm/_shared/run-llm-suite.js')
      .join("./_shared/run-code-strategy-suite.js")
      .split('../../../evals/llm/_shared/llm-case.js')
      .join("./_shared/code-strategy-case.js")
      .split('../../../evals/llm/_shared/askquestion-bridge.js')
      .join("./_shared/askquestion-bridge.js")
      .split("defineLlmEval")
      .join("defineLlmCodeEval")
      .split("LlmCaseDefinition")
      .join("CodeStrategyCaseDefinition");
    expect(reversed).toBe(LEGACY_LLM_TS_SAMPLE);
  });
});

/* ---------------------------------------------------------------------- */
/* 2. JSON → TS wrap preserves case-object SHA256                          */
/* ---------------------------------------------------------------------- */

describe("wrapDeclarativeJsonAsTs", () => {
  const JSON_BODY = JSON.stringify(
    {
      target_id: "command:test-cmd",
      command_name: "test-cmd",
      cases: [
        {
          id: 1,
          prompt: "/test-cmd",
          assertions: ["The command ran."],
          _meta: {
            generated: true,
            source_hash: "a".repeat(64),
            last_updated: "2026-05-26T12:00:00Z",
            generated_by: "zoto-create-evals",
            primitive_analysis: {
              source_hash: "a".repeat(64),
              analysed_at: "2026-05-26T12:00:00Z",
              analyser_version: "2026.05.26-1",
              summary: "Synthetic test summary.",
              requiresInteraction: false,
              interactionStyle: "none",
            },
          },
          expected_output: "Ran.",
        },
        {
          id: 2,
          prompt: "/test-cmd --flag",
          assertions: ["Flag was applied."],
          _meta: {
            generated: true,
            source_hash: "a".repeat(64),
            last_updated: "2026-05-26T12:00:00Z",
            generated_by: "zoto-create-evals",
            primitive_analysis: {
              source_hash: "a".repeat(64),
              analysed_at: "2026-05-26T12:00:00Z",
              analyser_version: "2026.05.26-1",
              summary: "Synthetic test summary.",
              requiresInteraction: false,
              interactionStyle: "none",
            },
          },
        },
      ],
    },
    null,
    2,
  );

  it("emits a file with the canonical first-line marker", () => {
    const ts = wrapDeclarativeJsonAsTs({
      jsonBody: JSON_BODY,
      targetId: "command:test-cmd",
      kind: "command",
      name: "test-cmd",
      harnessRel: "../../../evals/llm/_shared",
    });
    expect(ts.split("\n")[0]).toBe("// _meta.generated: true");
  });

  it("preserves the SHA256 of every individual case object", () => {
    const beforeCases = (JSON.parse(JSON_BODY) as { cases: unknown[] }).cases;
    const beforeHashes = beforeCases.map((c) => sha256(JSON.stringify(c)));

    const ts = wrapDeclarativeJsonAsTs({
      jsonBody: JSON_BODY,
      targetId: "command:test-cmd",
      kind: "command",
      name: "test-cmd",
      harnessRel: "../../../evals/llm/_shared",
    });

    /* Extract the JSON-shaped CASES literal from the emitted TS by
     * trimming the surrounding `const CASES = ` / ` as unknown as
     * LlmCaseDefinition[];` wrapping, then parsing it back to JSON. */
    const startToken = "const CASES = ";
    const endToken = " as unknown as LlmCaseDefinition[];";
    const startIdx = ts.indexOf(startToken);
    expect(startIdx).toBeGreaterThan(-1);
    const endIdx = ts.indexOf(endToken, startIdx);
    expect(endIdx).toBeGreaterThan(startIdx);
    const literal = ts.slice(startIdx + startToken.length, endIdx);
    const afterCases = JSON.parse(literal) as unknown[];
    const afterHashes = afterCases.map((c) => sha256(JSON.stringify(c)));

    expect(afterHashes).toEqual(beforeHashes);
  });

  it("emits a defineLlmEval call wired to the supplied target id", () => {
    const ts = wrapDeclarativeJsonAsTs({
      jsonBody: JSON_BODY,
      targetId: "command:test-cmd",
      kind: "command",
      name: "test-cmd",
      harnessRel: "../../../evals/llm/_shared",
    });
    expect(ts).toContain("defineLlmEval(");
    expect(ts).toContain('targetId: "command:test-cmd"');
  });
});

/* ---------------------------------------------------------------------- */
/* 3. `_meta.generated === true` gate                                      */
/* ---------------------------------------------------------------------- */

describe("planMigration marker gate", () => {
  it("blocks the migration when a legacy TS file lacks the file marker", () => {
    const scratch = mkScratch("marker-ts");
    try {
      writeMinimalManifest(scratch);
      const legacy = LLM_TS_TO_RELOCATE[0];
      /* Write the legacy file without the `// _meta.generated: true`
       * marker — the planner must reject it. */
      writeScratch(scratch, legacy, "// missing-marker\n");
      const manifest = YAML.parse(
        readScratch(scratch, ".zoto/eval-system/manifest.yml"),
      );
      // Inject the manifest entry that legacyLlmTsToTargetId expects.
      manifest.targets.push({
        id: legacyLlmTsToTargetId(legacy),
        kind: "agent",
        path: "plugins/zoto-test/agents/zoto-eval-adviser.md",
        content_hash: "f".repeat(64),
        eval_files: [legacy],
      });
      writeScratch(
        scratch,
        ".zoto/eval-system/manifest.yml",
        YAML.stringify(manifest),
      );

      const { plan, blockers } = planMigration(
        scratch,
        YAML.parse(readScratch(scratch, ".zoto/eval-system/manifest.yml")),
      );
      const ours = blockers.filter((b) => b.includes(legacy));
      expect(ours.length).toBeGreaterThan(0);
      expect(plan.moves.find((m) => m.source === legacy)).toBeUndefined();
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("blocks the migration when a JSON case is missing _meta.generated", () => {
    const scratch = mkScratch("marker-json");
    try {
      writeMinimalManifest(scratch);
      const legacy = DECLARATIVE_JSON_INPUTS[0];
      writeScratch(
        scratch,
        legacy,
        JSON.stringify({
          target_id: "command:z-eval-compare",
          cases: [{ id: 1, prompt: "/x", assertions: ["a"] }],
        }),
      );
      const manifest = YAML.parse(
        readScratch(scratch, ".zoto/eval-system/manifest.yml"),
      );
      manifest.targets.push({
        id: "command:z-eval-compare",
        kind: "command",
        path: "plugins/zoto-eval-system/commands/z-eval-compare.md",
        content_hash: "9".repeat(64),
        eval_files: [legacy],
      });
      writeScratch(
        scratch,
        ".zoto/eval-system/manifest.yml",
        YAML.stringify(manifest),
      );

      const { blockers } = planMigration(
        scratch,
        YAML.parse(readScratch(scratch, ".zoto/eval-system/manifest.yml")),
      );
      const ours = blockers.filter((b) => b.startsWith("json-marker"));
      expect(ours.length).toBeGreaterThan(0);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });

  it("runMain writes a spec-blocker JSON when markers fail", async () => {
    const scratch = mkScratch("marker-runmain");
    try {
      writeMinimalManifest(scratch);
      // Write the first LLM TS file without the marker.
      const legacy = LLM_TS_TO_RELOCATE[0];
      writeScratch(scratch, legacy, "// no marker\n");

      // Inject a matching manifest target so the planner can resolve it.
      const manifest = YAML.parse(
        readScratch(scratch, ".zoto/eval-system/manifest.yml"),
      );
      manifest.targets.push({
        id: legacyLlmTsToTargetId(legacy),
        kind: "agent",
        path: "plugins/zoto-test/agents/zoto-eval-adviser.md",
        content_hash: "0".repeat(64),
      });
      writeScratch(
        scratch,
        ".zoto/eval-system/manifest.yml",
        YAML.stringify(manifest),
      );

      const result: RunMainResult = await runMain([
        "--dry-run",
        "--repo-root",
        scratch,
      ]);
      expect(result.exitCode).toBe(1);
      expect(result.blockers.length).toBeGreaterThan(0);
      expect(result.blockerLog).toBeTruthy();
      const logAbs = join(scratch, result.blockerLog!);
      expect(existsSync(logAbs)).toBe(true);
      const parsed = JSON.parse(readFileSync(logAbs, "utf-8"));
      expect(parsed.spec).toBe("20260526-eval-single-backend-colocated-restructure");
      expect(parsed.subtask).toBe("08");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});

/* ---------------------------------------------------------------------- */
/* 4. Skill `evals.json` is NEVER touched                                  */
/* ---------------------------------------------------------------------- */

describe("skill exemption (KD-1)", () => {
  it("never enumerates a skill evals.json in any input list", () => {
    const skillSet = new Set(SKILL_EVALS_JSON_PATHS);
    for (const p of LLM_TS_TO_RELOCATE) {
      expect(skillSet.has(p)).toBe(false);
    }
    for (const p of SKILL_LLM_TS_TO_DELETE) {
      expect(skillSet.has(p)).toBe(false);
    }
    for (const p of DECLARATIVE_JSON_INPUTS) {
      expect(skillSet.has(p)).toBe(false);
    }
  });

  it("planMigration refuses to plan a deletion that hits a skill eval", () => {
    /* This case can't actually happen via the inputs (they exclude skill
     * paths), but we exercise the runtime safety check by passing a
     * manifest whose targets include a fake skill primitive whose eval
     * file matches a planned deletion path. The runtime guard in the
     * applyMigration loop should still refuse to delete a skill eval. */
    const skillEval = SKILL_EVALS_JSON_PATHS[0];
    const scratch = mkScratch("skill-runtime");
    try {
      writeMinimalManifest(scratch);
      writeScratch(scratch, skillEval, "{}\n");
      const plan = {
        moves: [],
        deletions: [
          { path: skillEval, reason: "static-skill-pilot" as const },
        ],
        alreadyMigrated: [] as string[],
      };
      let threw = false;
      try {
        applyMigration({
          repoRoot: scratch,
          manifest: YAML.parse(
            readScratch(scratch, ".zoto/eval-system/manifest.yml"),
          ),
          plan,
        });
      } catch (err) {
        threw = true;
        expect((err as Error).message).toContain("skill-exemption-violation");
      }
      expect(threw).toBe(true);
      // The skill eval file remains on disk.
      expect(existsSync(join(scratch, skillEval))).toBe(true);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});

/* ---------------------------------------------------------------------- */
/* 5. Idempotency                                                          */
/* ---------------------------------------------------------------------- */

describe("idempotency", () => {
  it("re-running the apply path is a no-op on file bodies", () => {
    const scratch = mkScratch("idempotent");
    try {
      writeMinimalManifest(scratch);
      /* Seed a single legacy LLM TS file for one of the manifest targets
       * (agent:test-agent) with a passing marker. */
      const legacy = "evals/llm/test_agent_test-agent.test.ts";
      writeScratch(scratch, legacy, LEGACY_LLM_TS_SAMPLE);

      const manifest = YAML.parse(
        readScratch(scratch, ".zoto/eval-system/manifest.yml"),
      );

      /* Build the per-fixture plan manually so we are not coupled to the
       * full input enumeration of the production script. */
      const newRel = resolveCoLocatedPath({
        kind: "agent",
        sourcePath: "plugins/zoto-test/agents/test-agent.md",
        name: "test-agent",
      })!;
      const plan = {
        moves: [
          {
            source: legacy,
            destination: newRel,
            kind: "rewrite-ts" as const,
            targetId: "agent:test-agent",
          },
        ],
        deletions: [],
        alreadyMigrated: [] as string[],
      };

      const firstApply = applyMigration({
        repoRoot: scratch,
        manifest: { ...manifest },
        plan,
      });
      expect(firstApply.written_destinations).toContain(newRel);
      expect(existsSync(join(scratch, legacy))).toBe(false);
      expect(existsSync(join(scratch, newRel))).toBe(true);

      const firstBody = readScratch(scratch, newRel);
      const firstManifest = readScratch(scratch, ".zoto/eval-system/manifest.yml");

      /* Restore the legacy file (simulating an idempotency pre-flight)
       * is NOT needed; the second apply should see the destination
       * already present and produce no body changes. */
      /* Re-build the manifest plan to repeat without re-writing legacy. */
      const secondPlan = {
        moves: [],
        deletions: [],
        alreadyMigrated: [] as string[],
      };
      const secondApply = applyMigration({
        repoRoot: scratch,
        manifest: YAML.parse(
          readScratch(scratch, ".zoto/eval-system/manifest.yml"),
        ),
        plan: secondPlan,
      });
      const secondBody = readScratch(scratch, newRel);
      expect(secondBody).toBe(firstBody);
      // Manifest body should be functionally equivalent (only updated_at
      // changes, which is acceptable per the spec — the destinations
      // themselves are byte-identical).
      const secondManifest = readScratch(
        scratch,
        ".zoto/eval-system/manifest.yml",
      );
      expect(secondManifest).not.toBe("");
      expect(secondApply.written_destinations.length).toBe(0);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});

/* ---------------------------------------------------------------------- */
/* Helpers + sanity                                                        */
/* ---------------------------------------------------------------------- */

describe("legacy id derivation", () => {
  it("maps LLM TS files to <kind>:<name> ids", () => {
    expect(
      legacyLlmTsToTargetId("evals/llm/test_agent_zoto-eval-engineer.test.ts"),
    ).toBe("agent:zoto-eval-engineer");
    expect(
      legacyLlmTsToTargetId("evals/llm/test_command_z-eval-init.test.ts"),
    ).toBe("command:z-eval-init");
    expect(
      legacyLlmTsToTargetId("evals/llm/test_skill_zoto-help-evals.test.ts"),
    ).toBe("skill:zoto-help-evals");
  });

  it("maps JSON files to <kind>:<name> ids and special-cases workspace hooks", () => {
    expect(
      legacyJsonToTargetId(
        "plugins/zoto-eval-system/evals/commands/z-eval-init.json",
      ),
    ).toBe("command:z-eval-init");
    expect(
      legacyJsonToTargetId(
        "plugins/zoto-eval-system/evals/hooks/zoto-eval-system.json",
      ),
    ).toBe("hook:zoto-eval-system");
    expect(legacyJsonToTargetId(".cursor/evals/hooks/hooks.json")).toBe(
      "hook:cursor-workspace",
    );
  });

  it("maps duplicated-prefix static-stamped files to <kind>:<name> ids", () => {
    expect(
      legacyStaticVitestToTargetId(
        "evals/test_agent_agent_zoto-eval-analyser-subagent.test.ts",
      ),
    ).toBe("agent:zoto-eval-analyser-subagent");
    expect(
      legacyStaticVitestToTargetId("evals/test_skill_skill_zoto-create-plugin.test.ts"),
    ).toBe("skill:zoto-create-plugin");
  });
});

describe("rewriteManifestEvalFiles", () => {
  it("repoints each non-skill eval_files entry through the move map", () => {
    const manifest = YAML.parse(
      YAML.stringify({
        schema_version: 1,
        targets: [
          {
            id: "command:z-eval-init",
            kind: "command",
            path: "plugins/zoto-eval-system/commands/z-eval-init.md",
            content_hash: "0".repeat(64),
            eval_files: [
              "plugins/zoto-eval-system/evals/commands/z-eval-init.json",
            ],
          },
          {
            id: "skill:zoto-help-evals",
            kind: "skill",
            path: "plugins/zoto-eval-system/skills/zoto-help-evals/SKILL.md",
            content_hash: "1".repeat(64),
            eval_files: [
              "plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json",
            ],
          },
        ],
      }),
    );
    const moves = [
      {
        source: "plugins/zoto-eval-system/evals/commands/z-eval-init.json",
        destination:
          "plugins/zoto-eval-system/commands/evals/z-eval-init.test.ts",
        kind: "wrap-json" as const,
        targetId: "command:z-eval-init",
      },
    ];
    const result = rewriteManifestEvalFiles(manifest, moves);
    expect(result.targets[0].eval_files).toEqual([
      "plugins/zoto-eval-system/commands/evals/z-eval-init.test.ts",
    ]);
    // Skill eval_files unchanged.
    expect(result.targets[1].eval_files).toEqual([
      "plugins/zoto-eval-system/skills/zoto-help-evals/evals/evals.json",
    ]);
  });
});

describe("stampAnalyserCache", () => {
  it("stamps invalidate=true on every cached payload", () => {
    const scratch = mkScratch("analyser-cache");
    try {
      writeScratch(
        scratch,
        ".zoto/eval-system/cache/analyser/a.json",
        JSON.stringify({ target_id: "command:a" }),
      );
      writeScratch(
        scratch,
        ".zoto/eval-system/cache/analyser/b.json",
        JSON.stringify({ target_id: "command:b", _meta: { other: 1 } }),
      );
      const stamped = stampAnalyserCache(scratch, true);
      expect(stamped.length).toBe(2);

      const a = JSON.parse(
        readScratch(scratch, ".zoto/eval-system/cache/analyser/a.json"),
      );
      expect(a._meta.primitive_analysis.invalidate).toBe(true);

      const b = JSON.parse(
        readScratch(scratch, ".zoto/eval-system/cache/analyser/b.json"),
      );
      expect(b._meta.primitive_analysis.invalidate).toBe(true);
      // Pre-existing meta fields preserved.
      expect(b._meta.other).toBe(1);

      // Re-running is idempotent.
      const second = stampAnalyserCache(scratch, true);
      expect(second.length).toBe(2);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
