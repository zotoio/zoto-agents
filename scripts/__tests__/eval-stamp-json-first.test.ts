/**
 * Subtask 08 — JSON-first stamper + updater unit tests.
 *
 * Covers the deliverables from
 * `specs/20260527-evals-json-first-migration/subtask-08-evals-json-first-migration-stamper-template-cleanup-20260527.md`:
 *
 *   D02 — `stampLlmTarget` writes a co-located `<name>.json` with a
 *         `_meta.generated: true` envelope, per-case `_meta.generated:
 *         true`, and `_template_doc` stripped.
 *   D03 — `engine/update.ts#regenerateLlm` surgical-merge preserves
 *         user-authored cases AND runner cases unchanged while updating
 *         generated cases.
 *   D03 — `engine/update.ts --check` exits 2 (`exitCodeOnCriticalDrift`)
 *         when a `.test.ts` LLM eval is present anywhere under the
 *         co-located paths.
 *   D03 — `engine/runner.ts#discoverCaseFiles` enumerates the new
 *         `<kind>/evals/*.json` paths (the migration's 38 targets).
 *
 * Run via:
 *   pnpm exec vitest run scripts/__tests__/eval-stamp-json-first.test.ts
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
import { join } from "node:path";

import Ajv from "ajv";
import { describe, expect, it } from "vitest";

import {
  ANALYSER_VERSION,
  computeAnalyserCacheKey,
  normaliseContent,
  type AnalyserPayload,
} from "../eval-analyse.ts";
import {
  buildStampedLlmCaseRow,
  renderLlmJsonTemplate,
  resolveLlmTargetPath,
  stampLlmTarget,
  stampTarget,
} from "../eval-stamp.ts";

const REPO_ROOT = join(__dirname, "..", "..");

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
    target_id: "command:z-json-first-test",
    kind: "command",
    source_path: "plugins/zoto-test/commands/z-json-first-test.md",
    source_hash: sourceHash,
    summary: "Synthetic JSON-first stamp test payload.",
    cases: [
      {
        scenario: "happy path",
        prompt: "/z-json-first-test --flag value runs the documented happy path.",
        assertions: [
          "Response references the requested behaviour.",
          'The `flag` placeholder is acknowledged in the response output.',
        ],
      },
      {
        scenario: "edge case",
        prompt: "/z-json-first-test --invalid surfaces a structured error.",
        assertions: [
          "The error message clearly identifies the invalid input.",
        ],
      },
    ],
    ...overrides,
  };
}

function mkHostRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "eval-stamp-json-first-"));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "host-json-first-test", private: true }, null, 2),
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

describe("Subtask 08 — eval-stamp.ts JSON-first emitter", () => {
  it("resolveLlmTargetPath returns .json paths for commands/agents/hooks", () => {
    expect(
      resolveLlmTargetPath({
        kind: "command",
        sourcePath: "/r/plugins/p/commands/c.md",
        name: "c",
      }),
    ).toBe("/r/plugins/p/commands/evals/c.json");
    expect(
      resolveLlmTargetPath({
        kind: "agent",
        sourcePath: "/r/plugins/p/agents/a.md",
        name: "a",
      }),
    ).toBe("/r/plugins/p/agents/evals/a.json");
    expect(
      resolveLlmTargetPath({
        kind: "hook",
        sourcePath: "/r/plugins/p/hooks/hooks.json",
        name: "p",
      }),
    ).toBe("/r/plugins/p/hooks/evals/hooks.json");
    /* Skills retain their evals.json — KD-1. */
    expect(
      resolveLlmTargetPath({
        kind: "skill",
        sourcePath: "/r/plugins/p/skills/s/SKILL.md",
        name: "s",
      }),
    ).toBeNull();
  });

  it("stampLlmTarget writes a JSON envelope with _meta.generated at file + case level and strips _template_doc", () => {
    const host = mkHostRepo();
    try {
      mkdirSync(join(host, "plugins", "zoto-test", "commands"), {
        recursive: true,
      });
      writeFileSync(
        join(host, "plugins", "zoto-test", "commands", "z-json-first-test.md"),
        "---\nname: z-json-first-test\ndescription: stamp test\n---\n",
      );
      const payload = minimalPayload();
      const result = stampLlmTarget(
        host,
        payload,
        {
          slug: "command_z-json-first-test",
          target_id: payload.target_id,
          source_path: payload.source_path,
          source_hash: payload.source_hash,
        },
        {
          kind: "command",
          sourcePath: join(host, "plugins", "zoto-test", "commands", "z-json-first-test.md"),
          name: "z-json-first-test",
          targetId: payload.target_id,
        },
        {
          modelId: "composer-2.5",
          judgeModel: "opus-4.6",
          caseTimeoutMs: 180000,
        },
      );

      expect(result.written.length).toBeGreaterThan(0);
      expect(result.testFile.endsWith(".json")).toBe(true);
      const body = readFileSync(result.testFile, "utf-8");
      const parsed = JSON.parse(body) as {
        target_id: string;
        _meta: {
          generated: boolean;
          model_id: string;
          judge_model: string;
          case_timeout_ms: number;
        };
        _template_doc?: unknown;
        cases: Array<{
          id: string;
          prompt: string;
          assertions: string[];
          _meta: { generated: boolean; source_hash: string };
        }>;
      };
      // _template_doc must be stripped before writing.
      expect(parsed._template_doc).toBeUndefined();
      // File-level envelope.
      expect(parsed.target_id).toBe("command:z-json-first-test");
      expect(parsed._meta.generated).toBe(true);
      expect(parsed._meta.model_id).toBe("composer-2.5");
      expect(parsed._meta.judge_model).toBe("opus-4.6");
      expect(parsed._meta.case_timeout_ms).toBe(180000);
      // Per-case _meta.generated:true on every stamped row.
      expect(parsed.cases.length).toBe(2);
      for (const c of parsed.cases) {
        expect(c._meta.generated).toBe(true);
        expect(typeof c._meta.source_hash).toBe("string");
        expect(c.prompt.length).toBeGreaterThan(0);
        expect(c.assertions.length).toBeGreaterThan(0);
      }
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });

  it("buildStampedLlmCaseRow tags each row with _meta.generated:true and primitive_analysis", () => {
    const payload = minimalPayload();
    const row = buildStampedLlmCaseRow(payload, 0, "2026-05-27T16:00:00Z");
    expect(row._meta.generated).toBe(true);
    expect(row._meta.last_updated).toBe("2026-05-27T16:00:00Z");
    expect(row._meta.generated_by).toBe("zoto-create-evals");
    expect(row._meta.primitive_analysis.source_hash).toBe(payload.source_hash);
    expect(row._meta.primitive_analysis.analyser_version).toBe(
      payload.analyser_version,
    );
    expect(row._meta.primitive_analysis.summary).toBe(payload.summary);
  });

  it("renderLlmJsonTemplate strips _template_doc when serialising", () => {
    const payload = minimalPayload();
    const cases = (payload.cases ?? []).map((_c, i) =>
      buildStampedLlmCaseRow(payload, i, "2026-05-27T16:00:00Z"),
    );
    const template = readFileSync(
      join(
        REPO_ROOT,
        "plugins",
        "zoto-eval-system",
        "templates",
        "command-evals",
        "evals.json.tmpl",
      ),
      "utf-8",
    );
    const rendered = renderLlmJsonTemplate(
      template,
      payload,
      cases,
      "composer-2.5",
      "opus-4.6",
      120000,
    );
    const parsed = JSON.parse(rendered) as Record<string, unknown>;
    expect(parsed._template_doc).toBeUndefined();
    expect(parsed.target_id).toBe("command:z-json-first-test");
  });

  it("stampTarget output validates against eval-file.schema.json", async () => {
    const host = mkHostRepo();
    try {
      mkdirSync(join(host, "plugins", "zoto-test", "commands"), {
        recursive: true,
      });
      writeFileSync(
        join(host, "plugins", "zoto-test", "commands", "z-json-first-test.md"),
        "---\nname: z-json-first-test\ndescription: schema test\n---\n",
      );
      const result = await stampTarget(
        host,
        "command:z-json-first-test",
        minimalPayload(),
        { dryRun: false },
      );
      expect(result.written).toBe(true);

      const evalFile = join(host, result.path);
      const body = readFileSync(evalFile, "utf-8");
      const parsed = JSON.parse(body) as Record<string, unknown>;

      const ajv = new Ajv({ allErrors: true, strict: false });
      // Register `case-meta.schema.json` first so the `case.schema.json` $ref resolves.
      ajv.addSchema(
        JSON.parse(
          readFileSync(
            join(
              REPO_ROOT,
              "plugins",
              "zoto-eval-system",
              "templates",
              "schema",
              "case-meta.schema.json",
            ),
            "utf-8",
          ),
        ),
      );
      ajv.addSchema(
        JSON.parse(
          readFileSync(
            join(
              REPO_ROOT,
              "plugins",
              "zoto-eval-system",
              "templates",
              "schema",
              "case.schema.json",
            ),
            "utf-8",
          ),
        ),
      );
      const validator = ajv.compile(
        JSON.parse(
          readFileSync(
            join(
              REPO_ROOT,
              "plugins",
              "zoto-eval-system",
              "templates",
              "schema",
              "eval-file.schema.json",
            ),
            "utf-8",
          ),
        ),
      );
      const ok = validator(parsed);
      if (!ok) {
        const errs = (validator.errors ?? [])
          .map((e) => `${e.instancePath || "/"} ${e.message ?? "invalid"}`)
          .join("; ");
        throw new Error(`schema validation failed: ${errs}`);
      }
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });
});

describe("Subtask 08 — engine/update.ts surgical-merge for non-skill JSON", () => {
  it("preserves user-authored cases and runner cases verbatim while updating generated rows", async () => {
    /* Build a JSON file with three cases: one runner, one user-authored
     * declarative, one stale generated. Then run regenerateLlm and
     * confirm the runner + user-authored stay intact while the
     * generated case is updated. */
    const { surgicallyReplaceGeneratedCases } = await import(
      "../../plugins/zoto-eval-system/engine/update.ts"
    );
    const raw = JSON.stringify(
      {
        target_id: "command:z-cmd",
        cases: [
          {
            id: "r-1",
            runner: "./multi-step.test.ts",
            parameters: { scenario: "happy", steps: 3 },
          },
          {
            id: "u-1",
            prompt: "user-authored prompt that must be preserved verbatim",
            assertions: ["user-authored assertion"],
          },
          {
            id: "g-1",
            prompt: "old generated prompt",
            assertions: ["old generated assertion"],
            _meta: {
              generated: true,
              source_hash: "a".repeat(64),
              last_updated: "2026-01-01T00:00:00Z",
              generated_by: "zoto-create-evals",
            },
          },
        ],
      },
      null,
      2,
    );

    const stampedRow = {
      id: "g-1",
      prompt: "fresh generated prompt",
      assertions: ["fresh generated assertion"],
      _meta: {
        generated: true,
        source_hash: "b".repeat(64),
        last_updated: "2026-05-27T16:00:00Z",
        generated_by: "zoto-update-evals",
      },
    };

    const result = surgicallyReplaceGeneratedCases(raw, [stampedRow]);
    expect(result.replaced).toBe(1);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.userPreserved).toBe(2); // runner + user-authored declarative

    const parsed = JSON.parse(result.text) as {
      cases: Array<Record<string, unknown>>;
    };

    // Runner case preserved verbatim.
    const runnerAfter = parsed.cases.find((c) => c.id === "r-1");
    expect(runnerAfter).toBeDefined();
    expect(runnerAfter!.runner).toBe("./multi-step.test.ts");
    expect(runnerAfter!.parameters).toEqual({ scenario: "happy", steps: 3 });

    // User-authored declarative preserved verbatim.
    const userAfter = parsed.cases.find((c) => c.id === "u-1");
    expect(userAfter).toBeDefined();
    expect(userAfter!.prompt).toBe(
      "user-authored prompt that must be preserved verbatim",
    );

    // Generated case updated.
    const genAfter = parsed.cases.find((c) => c.id === "g-1");
    expect(genAfter).toBeDefined();
    expect(genAfter!.prompt).toBe("fresh generated prompt");
  });

  it("runner cases survive when stampedRows is empty (no false replacement)", async () => {
    const { surgicallyReplaceGeneratedCases } = await import(
      "../../plugins/zoto-eval-system/engine/update.ts"
    );
    const raw = JSON.stringify(
      {
        target_id: "command:z-cmd",
        cases: [
          {
            id: "r-1",
            runner: "./flow.test.ts",
            parameters: {},
          },
        ],
      },
      null,
      2,
    );
    const result = surgicallyReplaceGeneratedCases(raw, []);
    expect(result.text).toBe(raw);
    expect(result.replaced).toBe(0);
    expect(result.userPreserved).toBe(1);
  });
});

describe("Subtask 08 — engine/runner.ts discoverCoLocatedEvalJson enumerates new co-located paths", () => {
  it("walks <plugin>/{commands,agents,hooks}/evals/*.json", async () => {
    const { discoverCoLocatedEvalJson } = await import(
      "../../plugins/zoto-eval-system/engine/runner.ts"
    );
    const root = mkdtempSync(join(tmpdir(), "discover-co-located-"));
    try {
      // plugin command
      mkdirSync(
        join(root, "plugins", "zoto-foo", "commands", "evals"),
        { recursive: true },
      );
      writeFileSync(
        join(root, "plugins", "zoto-foo", "commands", "evals", "cmd-a.json"),
        JSON.stringify({ target_id: "command:cmd-a", cases: [] }),
      );
      // plugin agent
      mkdirSync(
        join(root, "plugins", "zoto-foo", "agents", "evals"),
        { recursive: true },
      );
      writeFileSync(
        join(root, "plugins", "zoto-foo", "agents", "evals", "agent-a.json"),
        JSON.stringify({ target_id: "agent:agent-a", cases: [] }),
      );
      // plugin hook
      mkdirSync(
        join(root, "plugins", "zoto-foo", "hooks", "evals"),
        { recursive: true },
      );
      writeFileSync(
        join(root, "plugins", "zoto-foo", "hooks", "evals", "hooks.json"),
        JSON.stringify({ target_id: "hook:zoto-foo", cases: [] }),
      );
      // .cursor command
      mkdirSync(join(root, ".cursor", "commands", "evals"), { recursive: true });
      writeFileSync(
        join(root, ".cursor", "commands", "evals", "cmd-b.json"),
        JSON.stringify({ target_id: "command:cmd-b", cases: [] }),
      );
      // legacy central eval JSON should NOT be picked up (different glob)
      mkdirSync(join(root, "plugins", "zoto-foo", "evals", "commands"), {
        recursive: true,
      });
      writeFileSync(
        join(root, "plugins", "zoto-foo", "evals", "commands", "legacy.json"),
        JSON.stringify({ target_id: "command:legacy", cases: [] }),
      );

      const found = discoverCoLocatedEvalJson(root);
      expect(found).toContain(
        join(root, "plugins", "zoto-foo", "commands", "evals", "cmd-a.json"),
      );
      expect(found).toContain(
        join(root, "plugins", "zoto-foo", "agents", "evals", "agent-a.json"),
      );
      expect(found).toContain(
        join(root, "plugins", "zoto-foo", "hooks", "evals", "hooks.json"),
      );
      expect(found).toContain(
        join(root, ".cursor", "commands", "evals", "cmd-b.json"),
      );
      // Legacy central path NOT enumerated by the new helper (lives in the
      // separate `discoverCentralPluginEvalJson` legacy helper).
      expect(
        found.some((p) =>
          p.endsWith(join("plugins", "zoto-foo", "evals", "commands", "legacy.json")),
        ),
      ).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("Subtask 08 — engine/update.ts --check exits 2 on residual .test.ts LLM evals", () => {
  it("exits with the configured critical-drift code when a co-located .test.ts is found", async () => {
    /* Spawn a fixture host repo with a single legacy `.test.ts` LLM
     * eval and run `update.ts --check`. The helper's strict-mode
     * promotion (subtask 08) must surface this as critical drift and
     * exit with `update.checkExitCodeOnCriticalDrift` (default 2). */
    const { spawnSync } = await import("node:child_process");
    const root = mkdtempSync(join(tmpdir(), "update-check-strict-ts-"));
    try {
      // Minimal manifest + config so update.ts can run.
      mkdirSync(join(root, ".zoto", "eval-system"), { recursive: true });
      writeFileSync(
        join(root, ".zoto", "eval-system", "config.yml"),
        ["schema_version: 1", "evalsDir: evals", ""].join("\n"),
      );
      writeFileSync(
        join(root, ".zoto", "eval-system", "manifest.yml"),
        [
          "schema_version: 1",
          "created_at: '2026-05-27T00:00:00Z'",
          "updated_at: '2026-05-27T00:00:00Z'",
          "git_ref: deadbeef",
          "generated_by: test",
          "discovery_config:",
          "  evalsDir: evals",
          "  discoveryTargets: []",
          "targets: []",
          "",
        ].join("\n"),
      );
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({ name: "fixture", private: true }, null, 2),
      );

      // Plant a residual co-located TS LLM eval — exactly the
      // post-subtask-07 scenario subtask 08's strict gate must catch.
      mkdirSync(join(root, "plugins", "zoto-foo", "commands", "evals"), {
        recursive: true,
      });
      writeFileSync(
        join(
          root,
          "plugins",
          "zoto-foo",
          "commands",
          "evals",
          "cmd-a.test.ts",
        ),
        "// _meta.generated: true\nexport {};\n",
      );

      const tsx = join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");
      const updater = join(
        REPO_ROOT,
        "plugins",
        "zoto-eval-system",
        "engine",
        "update.ts",
      );
      const r = spawnSync(process.execPath, [tsx, updater, "--check"], {
        cwd: root,
        encoding: "utf-8",
        env: {
          ...process.env,
          // Disable parity check so it never throws — we only care about
          // the colocated-ts gate.
          ZOTO_EVAL_CHECK_STRICT_ANALYSER_PARITY: "0",
          CI: "false",
        },
      });

      // Exit code must be 2 (default `update.checkExitCodeOnCriticalDrift`).
      expect(r.status).toBe(2);
      // stdout JSON must surface the colocated TS count > 0.
      const lines = (r.stdout ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("{"));
      const driftLine = lines.find((l) => l.includes('"colocated_ts_eval_count"'));
      expect(driftLine).toBeDefined();
      const drift = JSON.parse(driftLine!) as {
        status: string;
        colocated_ts_eval_count: number;
      };
      expect(drift.status).toBe("drift");
      expect(drift.colocated_ts_eval_count).toBeGreaterThan(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60000);
});
