/**
 * Smoke test for the `/zoto-create-plugin` Step 6e classify-and-stamp
 * helper (post single-LLM-emitter collapse).
 *
 * Run: pnpm exec vitest run evals/llm/_shared/zoto-create-plugin-suite.test.ts
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

import { describe, expect, it } from "vitest";

import {
  ANALYSER_VERSION,
  computeAnalyserCacheKey,
  normaliseContent,
  type AnalyserPayload,
} from "../../../scripts/eval-analyse.ts";
import {
  classifyAndStampPluginComponents,
  FALLBACK_OPERATOR_NOTE,
} from "./zoto-create-plugin-suite.js";

const PLUGIN = "zoto-scaffold-smoke";
const COMMAND = "zoto-scaffold-interactive";
const SKILL = "zoto-scaffold-passive";

function minimalPayload(
  overrides: Partial<AnalyserPayload>,
  source: string,
): AnalyserPayload {
  const sourceHash = computeAnalyserCacheKey({
    normalisedSource: normaliseContent(source),
    analyserVersion: ANALYSER_VERSION,
    modelId: "composer-2.5",
  });
  return {
    schema_version: 1,
    analyser_version: ANALYSER_VERSION,
    model_id: "composer-2.5",
    target_id: "command:placeholder",
    kind: "command",
    source_path: "plugins/placeholder/commands/placeholder.md",
    source_hash: sourceHash,
    summary: "Synthetic plugin-creation smoke payload.",
    cases: [
      {
        scenario: "happy path",
        prompt: "/placeholder --flag value",
        assertions: ["responds with success"],
      },
    ],
    ...overrides,
  };
}

function mkHostRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "zoto-create-plugin-suite-"));
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: "host-plugin-suite-test", private: true }, null, 2),
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

  const commandSource = [
    "---",
    `name: ${COMMAND}`,
    "description: Interactive scaffold smoke command.",
    "---",
    "",
    "# Interactive command",
    "",
    "Uses AskQuestion to collect operator input before scaffolding.",
  ].join("\n");
  const skillSource = [
    "---",
    `name: ${SKILL}`,
    "description: Non-interactive scaffold smoke skill.",
    "---",
    "",
    "# Passive skill",
    "",
    "Runs without AskQuestion or needs_user_input escalation.",
  ].join("\n");

  mkdirSync(join(root, "plugins", PLUGIN, "commands"), { recursive: true });
  mkdirSync(join(root, "plugins", PLUGIN, "skills", SKILL, "evals"), {
    recursive: true,
  });
  writeFileSync(
    join(root, "plugins", PLUGIN, "commands", `${COMMAND}.md`),
    commandSource,
  );
  writeFileSync(
    join(root, "plugins", PLUGIN, "skills", SKILL, "SKILL.md"),
    skillSource,
  );
  writeFileSync(
    join(root, "plugins", PLUGIN, "skills", SKILL, "evals", "evals.json"),
    JSON.stringify(
      {
        skill_name: SKILL,
        evals: [
          {
            id: 1,
            prompt: "placeholder before classify-and-stamp",
            assertions: ["seed case"],
          },
        ],
      },
      null,
      2,
    ),
  );

  return root;
}

describe("classifyAndStampPluginComponents", () => {
  it("emits a co-located TS for commands and retains the existing skill evals.json", async () => {
    const host = mkHostRepo();
    const commandPath = join(
      host,
      "plugins",
      PLUGIN,
      "commands",
      `${COMMAND}.md`,
    );
    const skillPath = join(
      host,
      "plugins",
      PLUGIN,
      "skills",
      SKILL,
      "SKILL.md",
    );
    const commandSource = readFileSync(commandPath, "utf-8");
    const skillSource = readFileSync(skillPath, "utf-8");
    const seedEvalsJson = readFileSync(
      join(host, "plugins", PLUGIN, "skills", SKILL, "evals", "evals.json"),
      "utf-8",
    );

    try {
      const results = await classifyAndStampPluginComponents(
        host,
        [commandPath, skillPath],
        {
          runAnalyserFn: async (path) => {
            if (path.endsWith(`${COMMAND}.md`)) {
              return minimalPayload(
                {
                  target_id: `command:${COMMAND}`,
                  kind: "command",
                  source_path: `plugins/${PLUGIN}/commands/${COMMAND}.md`,
                  requiresInteraction: true,
                  interactionStyle: "command-owned",
                },
                commandSource,
              );
            }
            if (path.endsWith("SKILL.md")) {
              return minimalPayload(
                {
                  target_id: `skill:${SKILL}`,
                  kind: "skill",
                  source_path: `plugins/${PLUGIN}/skills/${SKILL}/SKILL.md`,
                  requiresInteraction: false,
                  interactionStyle: "none",
                  cases: [
                    {
                      scenario: "passive usage",
                      prompt: `Use ${SKILL} for a basic task.`,
                      assertions: ["completes without AskQuestion"],
                    },
                  ],
                },
                skillSource,
              );
            }
            return null;
          },
        },
      );

      expect(results).toHaveLength(2);

      const commandResult = results[0];
      if ("skipped" in commandResult && commandResult.skipped === true) {
        throw new Error("expected command to be stamped, not skipped");
      }
      expect(commandResult).toMatchObject({
        backend: "llm",
        classification_source: "analyser",
      });

      const jsonEvalPath = join(
        host,
        "plugins",
        PLUGIN,
        "commands",
        "evals",
        `${COMMAND}.json`,
      );
      expect(existsSync(jsonEvalPath)).toBe(true);
      const stamped = JSON.parse(readFileSync(jsonEvalPath, "utf-8")) as {
        target_id?: string;
        cases?: unknown[];
      };
      expect(stamped.target_id).toBe(`command:${COMMAND}`);
      expect(Array.isArray(stamped.cases) && stamped.cases.length >= 1).toBe(true);

      // Skill flow: stampTarget skips, the seed evals.json is untouched.
      const skillResult = results[1];
      if ("skipped" in skillResult && skillResult.skipped === true) {
        throw new Error("expected skill ClassifyAndStampResult, not legacy skip");
      }
      expect(skillResult).toMatchObject({
        backend: "llm",
        skipped: "skill",
        classification_source: "analyser",
      });
      const skillEvalPath = join(
        host,
        "plugins",
        PLUGIN,
        "skills",
        SKILL,
        "evals",
        "evals.json",
      );
      expect(existsSync(skillEvalPath)).toBe(true);
      expect(readFileSync(skillEvalPath, "utf-8")).toBe(seedEvalsJson);
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });

  it("falls back to a synthetic payload when the analyser returns null", async () => {
    const host = mkHostRepo();
    const commandPath = join(
      host,
      "plugins",
      PLUGIN,
      "commands",
      `${COMMAND}.md`,
    );

    try {
      const results = await classifyAndStampPluginComponents(host, [commandPath], {
        runAnalyserFn: async () => null,
      });

      const result = results[0];
      if ("skipped" in result && result.skipped === true) {
        throw new Error("expected ClassifyAndStampResult, not legacy skip");
      }
      expect(result).toMatchObject({
        backend: "llm",
        classification_source: "fallback-default",
        operator_note: FALLBACK_OPERATOR_NOTE,
      });

      const jsonEvalPath = join(
        host,
        "plugins",
        PLUGIN,
        "commands",
        "evals",
        `${COMMAND}.json`,
      );
      expect(existsSync(jsonEvalPath)).toBe(true);
    } finally {
      rmSync(host, { recursive: true, force: true });
    }
  });
});
