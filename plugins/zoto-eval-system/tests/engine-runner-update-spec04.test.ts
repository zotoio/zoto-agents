/**
 * Subtask 04 — Engine runner + update changes for the JSON-first eval
 * migration (spec `20260527-evals-json-first-migration`).
 *
 * Covers the new helpers wired into `engine/runner.ts` and
 * `engine/update.ts` plus the `_user-case-guards` consumer contract:
 *
 *   • `isRunnerCase(c)` discriminator on `engine/case.ts`.
 *   • `isUserAuthoredCase(c)` returns true for runner cases without
 *     `_meta.generated === true` (so the updater preserves them).
 *   • `loadAndPartitionEvalFile(path)` returns separate
 *     `declarative[]` / `runners[]` arrays so the `--list` and
 *     `--full` paths can compute their counts deterministically.
 *   • `formatListLine(targetId, c)` renders runner cases with the
 *     trailing `[runner: <path>]` token used by `--list` and the
 *     deferred-to-vitest summary line.
 *   • `findCoLocatedTsEvals(repoRoot)` scans the expected glob roots
 *     and excludes scenarios / harness internals.
 *   • `warnCoLocatedTsEvals(repoRoot, log)` emits the
 *     `[layout-drift]` deprecation line (do NOT exit non-zero — the
 *     hard `--check` failure lands in subtask 10).
 *   • `loadAndValidateEvalFile(path)` Ajv-validates non-skill JSON
 *     against `templates/schema/eval-file.schema.json` and rejects
 *     bad files with a path-prefixed error.
 *   • `surgicallyReplaceGeneratedCases(raw, stamped)` preserves
 *     `runner` cases verbatim (they are user-authored by spec).
 */
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  formatDeferredRunnerLine,
  formatListLine,
  loadAndPartitionEvalFile,
} from "../engine/runner.js";
import {
  isRunnerCase,
  type EvalCase,
} from "../engine/case.js";
import {
  isUserAuthoredCase,
} from "../engine/_user-case-guards.js";
import {
  findCoLocatedTsEvals,
  loadAndValidateEvalFile,
  surgicallyReplaceGeneratedCases,
  warnCoLocatedTsEvals,
} from "../engine/update.js";

function declarative(id: string, overrides: Partial<EvalCase> = {}): EvalCase {
  return {
    id,
    prompt: `${id} — realistic declarative user turn for validation.`,
    assertions: ["Response references the requested skill."],
    ...overrides,
  };
}

function runner(id: string, overrides: Partial<EvalCase> = {}): EvalCase {
  return {
    id,
    runner: "./multi-step-flow.test.ts",
    parameters: { scenario: "happy", steps: 3 },
    ...overrides,
  };
}

function withTmpDir<T>(prefix: string, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("engine/case.ts — isRunnerCase discriminator", () => {
  it("returns true for a runner case with a non-empty `.test.ts` path", () => {
    expect(isRunnerCase(runner("r1"))).toBe(true);
  });

  it("returns false for a declarative case", () => {
    expect(isRunnerCase(declarative("d1"))).toBe(false);
  });

  it("returns false when `runner` is an empty string", () => {
    expect(
      isRunnerCase(runner("r-empty", { runner: "" })),
    ).toBe(false);
  });

  it("returns false for null / undefined inputs", () => {
    expect(isRunnerCase(null)).toBe(false);
    expect(isRunnerCase(undefined)).toBe(false);
  });
});

describe("engine/_user-case-guards.ts — runner cases stay user-authored", () => {
  it("isUserAuthoredCase returns true for a runner case with no _meta", () => {
    const r = runner("r-no-meta");
    expect(isUserAuthoredCase(r)).toBe(true);
  });

  it("isUserAuthoredCase returns true for a runner case with _meta.generated: false", () => {
    const r = runner("r-explicit-user", {
      _meta: { generated: false },
    });
    expect(isUserAuthoredCase(r)).toBe(true);
  });

  it("isUserAuthoredCase returns false for a runner case stamped _meta.generated: true", () => {
    /* The analyser does NOT emit runner cases — but if one ever arrives
     * tagged as generated, the canonical guard still treats it as
     * generated. The runner-survival contract in
     * `surgicallyReplaceGeneratedCases` is enforced by the higher-level
     * `isRunnerCase` short-circuit so the merger never clobbers runner
     * rows regardless of `_meta.generated`. */
    const r = runner("r-fake-generated", {
      _meta: {
        generated: true,
        source_hash: "a".repeat(64),
        last_updated: "2026-05-27T00:00:00Z",
        generated_by: "zoto-create-evals",
      },
    });
    expect(isUserAuthoredCase(r)).toBe(false);
  });
});

describe("engine/runner.ts — loadAndPartitionEvalFile + formatListLine", () => {
  it("partitions cases into declarative and runner arrays", () => {
    withTmpDir("zoto-eval-partition-", (dir) => {
      const path = join(dir, "z-cmd.json");
      writeFileSync(
        path,
        JSON.stringify({
          target_id: "command:z-cmd",
          cases: [
            declarative("d1"),
            runner("r1"),
            declarative("d2"),
            runner("r2", { runner: "./other.test.ts" }),
          ],
        }),
      );
      const loaded = loadAndPartitionEvalFile(path);
      expect(loaded).not.toBeNull();
      expect(loaded!.targetId).toBe("command:z-cmd");
      expect(loaded!.declarative.map((c) => c.id)).toEqual(["d1", "d2"]);
      expect(loaded!.runners.map((c) => c.id)).toEqual(["r1", "r2"]);
    });
  });

  it("returns null when the JSON file fails to parse", () => {
    withTmpDir("zoto-eval-partition-bad-", (dir) => {
      const path = join(dir, "bad.json");
      writeFileSync(path, "{ not valid json ");
      const loaded = loadAndPartitionEvalFile(path);
      expect(loaded).toBeNull();
    });
  });

  it("formatListLine renders declarative cases as `<targetId>#<id>`", () => {
    const line = formatListLine("command:z-cmd", declarative("d1"));
    expect(line).toBe("command:z-cmd#d1");
  });

  it("formatListLine renders runner cases with trailing [runner: <path>]", () => {
    const line = formatListLine(
      "command:z-cmd",
      runner("r1", { runner: "./multi-step.test.ts" }),
    );
    expect(line).toBe("command:z-cmd#r1 [runner: ./multi-step.test.ts]");
  });

  it("formatListLine falls back to `unknown:target` when targetId is null", () => {
    const line = formatListLine(null, declarative("d-orphan"));
    expect(line).toBe("unknown:target#d-orphan");
  });

  it("formatDeferredRunnerLine emits the documented --full deferral format", () => {
    expect(formatDeferredRunnerLine("command:z-cmd", 3)).toBe(
      "[runner-cases] target=command:z-cmd count=3 deferred-to-vitest",
    );
  });

  it("formatDeferredRunnerLine falls back to `unknown:target` when targetId is null", () => {
    expect(formatDeferredRunnerLine(null, 0)).toBe(
      "[runner-cases] target=unknown:target count=0 deferred-to-vitest",
    );
  });

  it("--full deferral pipeline: only declarative cases survive the partition for the SDK loop", () => {
    /* Mirrors the inline `--full` partition step in main():
     *   const allCases = loaded.flatMap((l) => l.declarative);
     * Runner cases must NOT leak into the declarative SDK loop so
     * llm.yml never gets a runner row from this code path. */
    withTmpDir("zoto-eval-full-pipeline-", (dir) => {
      const aPath = join(dir, "a.json");
      const bPath = join(dir, "b.json");
      writeFileSync(
        aPath,
        JSON.stringify({
          target_id: "command:a",
          cases: [
            declarative("a-d1"),
            runner("a-r1"),
            runner("a-r2", { runner: "./two.test.ts" }),
          ],
        }),
      );
      writeFileSync(
        bPath,
        JSON.stringify({
          target_id: "command:b",
          cases: [declarative("b-d1"), declarative("b-d2")],
        }),
      );

      const loaded = [aPath, bPath]
        .map((p) => loadAndPartitionEvalFile(p))
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const deferralLines: string[] = [];
      for (const l of loaded) {
        if (l.runners.length === 0) continue;
        deferralLines.push(
          formatDeferredRunnerLine(l.targetId, l.runners.length),
        );
      }
      expect(deferralLines).toEqual([
        "[runner-cases] target=command:a count=2 deferred-to-vitest",
      ]);

      const declarativeOnly = loaded.flatMap((l) => l.declarative);
      expect(declarativeOnly.map((c) => c.id)).toEqual([
        "a-d1",
        "b-d1",
        "b-d2",
      ]);
      expect(declarativeOnly.some((c) => isRunnerCase(c))).toBe(false);
    });
  });
});

describe("engine/update.ts — findCoLocatedTsEvals + warnCoLocatedTsEvals", () => {
  it("scans plugins/* and .cursor for co-located .test.ts files (sorted, deduped)", () => {
    withTmpDir("zoto-eval-find-ts-", (root) => {
      const filesToCreate = [
        ["plugins/zoto-foo/commands/evals/cmd-a.test.ts", "// _meta.generated: true\n"],
        ["plugins/zoto-foo/agents/evals/agent-x.test.ts", "// agent\n"],
        ["plugins/zoto-bar/hooks/evals/hook-y.test.ts", "// hook\n"],
        ["plugins/zoto-foo/commands/evals/cmd-a.json", "{}"],
        // Excluded: scenarios
        ["plugins/zoto-foo/commands/evals/scenarios/multi.test.ts", "// scenario\n"],
        // Excluded: harness internals
        ["plugins/zoto-foo/evals/llm/_shared/helper.test.ts", "// shared\n"],
        // Excluded: node_modules
        ["plugins/zoto-foo/node_modules/whatever/commands/evals/x.test.ts", "// vendored\n"],
        // .cursor mirror
        [".cursor/commands/evals/cursor-cmd.test.ts", "// cursor cmd\n"],
        [".cursor/agents/evals/cursor-bot.test.ts", "// cursor bot\n"],
      ];
      for (const [rel, body] of filesToCreate) {
        const full = join(root, rel);
        mkdirSync(join(full, ".."), { recursive: true });
        writeFileSync(full, body);
      }

      const matches = findCoLocatedTsEvals(root);
      const rel = matches.map((m) => m.slice(root.length + 1));
      expect(rel.sort()).toEqual(
        [
          ".cursor/agents/evals/cursor-bot.test.ts",
          ".cursor/commands/evals/cursor-cmd.test.ts",
          "plugins/zoto-bar/hooks/evals/hook-y.test.ts",
          "plugins/zoto-foo/agents/evals/agent-x.test.ts",
          "plugins/zoto-foo/commands/evals/cmd-a.test.ts",
        ].sort(),
      );
      expect(rel.some((p) => p.includes("scenarios"))).toBe(false);
      expect(rel.some((p) => p.includes("_shared"))).toBe(false);
      expect(rel.some((p) => p.includes("node_modules"))).toBe(false);
    });
  });

  it("returns [] when neither plugins/ nor .cursor/ exists", () => {
    withTmpDir("zoto-eval-find-empty-", (root) => {
      expect(findCoLocatedTsEvals(root)).toEqual([]);
    });
  });

  it("warnCoLocatedTsEvals emits the documented [layout-drift] line per match", () => {
    withTmpDir("zoto-eval-warn-ts-", (root) => {
      const rel = "plugins/zoto-foo/commands/evals/cmd-a.test.ts";
      const full = join(root, rel);
      mkdirSync(join(full, ".."), { recursive: true });
      writeFileSync(full, "// legacy\n");

      const lines: string[] = [];
      const matches = warnCoLocatedTsEvals(root, (line) => lines.push(line));
      expect(matches).toHaveLength(1);
      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("[layout-drift]");
      expect(lines[0]).toContain(full);
      expect(lines[0]).toContain("evals-json-first-migration-20260527");
    });
  });

  it("warnCoLocatedTsEvals is a no-op when nothing is found (no log lines emitted)", () => {
    withTmpDir("zoto-eval-warn-empty-", (root) => {
      const lines: string[] = [];
      const matches = warnCoLocatedTsEvals(root, (line) => lines.push(line));
      expect(matches).toEqual([]);
      expect(lines).toEqual([]);
    });
  });
});

describe("engine/update.ts — loadAndValidateEvalFile (Ajv schema gate)", () => {
  it("accepts a well-formed non-skill JSON eval file", () => {
    withTmpDir("zoto-eval-validate-ok-", (dir) => {
      const path = join(dir, "command-z-cmd.json");
      writeFileSync(
        path,
        JSON.stringify({
          target_id: "command:z-cmd",
          cases: [
            {
              id: "d1",
              prompt: "Realistic declarative user turn for validation.",
              assertions: ["Response references the requested behaviour."],
            },
            {
              id: "r1",
              runner: "./flow.test.ts",
              parameters: { scenario: "happy" },
            },
          ],
        }),
      );
      const file = loadAndValidateEvalFile(path);
      expect(file.target_id).toBe("command:z-cmd");
      expect(file.cases?.length).toBe(2);
    });
  });

  it("passes skill files through untouched (no target_id triggers the skill-spec bypass)", () => {
    withTmpDir("zoto-eval-validate-skill-", (dir) => {
      const path = join(dir, "evals.json");
      writeFileSync(
        path,
        JSON.stringify({
          skill_name: "zoto-skill",
          evals: [
            {
              id: 1,
              prompt: "skill prompt",
              assertions: ["asserts"],
            },
          ],
        }),
      );
      const file = loadAndValidateEvalFile(path);
      expect(file.skill_name).toBe("zoto-skill");
    });
  });

  it("rejects a non-skill file with a path-prefixed error when validation fails", () => {
    withTmpDir("zoto-eval-validate-bad-", (dir) => {
      const path = join(dir, "broken.json");
      writeFileSync(
        path,
        JSON.stringify({
          target_id: "command:z-cmd",
          cases: [
            {
              id: "hybrid-bad",
              runner: "./flow.test.ts",
              parameters: {},
              prompt: "must not coexist with runner",
              assertions: ["must not coexist"],
            },
          ],
        }),
      );
      expect(() => loadAndValidateEvalFile(path)).toThrow(
        new RegExp(`^${path.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}: failed eval-file.schema.json validation`),
      );
    });
  });
});

describe("engine/update.ts — surgicallyReplaceGeneratedCases preserves runner cases", () => {
  it("treats runner cases as user-authored (verbatim) even alongside generated rows", () => {
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
            id: "d-1",
            prompt: "old generated prompt",
            assertions: ["old assertion"],
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
      id: "d-1",
      prompt: "new generated prompt",
      assertions: ["new assertion"],
      _meta: {
        generated: true,
        source_hash: "b".repeat(64),
        last_updated: "2026-05-27T00:00:00Z",
        generated_by: "zoto-update-evals",
      },
    };

    const result = surgicallyReplaceGeneratedCases(raw, [stampedRow]);
    expect(result.replaced).toBe(1);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.userPreserved).toBeGreaterThanOrEqual(1);

    const parsed = JSON.parse(result.text) as {
      cases: Array<Record<string, unknown>>;
    };
    const runnerAfter = parsed.cases.find((c) => c.id === "r-1");
    expect(runnerAfter).toBeDefined();
    expect(runnerAfter!.runner).toBe("./multi-step.test.ts");
    expect(runnerAfter!.parameters).toEqual({ scenario: "happy", steps: 3 });

    const genAfter = parsed.cases.find((c) => c.id === "d-1");
    expect(genAfter).toBeDefined();
    expect(genAfter!.prompt).toBe("new generated prompt");
  });

  it("never includes runner cases in the generatedIdxs partition (no replacement attempted)", () => {
    /* When the stamped array is empty AND only runner + user cases exist,
     * `surgicallyReplaceGeneratedCases` MUST leave the file unchanged. */
    const raw = JSON.stringify(
      {
        target_id: "command:z-cmd",
        cases: [
          {
            id: "r-1",
            runner: "./a.test.ts",
            parameters: {},
          },
          {
            id: "u-1",
            prompt: "user-authored prompt",
            assertions: ["preserved"],
          },
        ],
      },
      null,
      2,
    );
    const result = surgicallyReplaceGeneratedCases(raw, []);
    expect(result.text).toBe(raw);
    expect(result.replaced).toBe(0);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.userPreserved).toBe(2);
  });
});
