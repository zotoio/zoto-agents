// _meta.generated: true
/**
 * LLM `code`-strategy eval for skill `zoto-configure-evals`.
 *
 * Stamped by `scripts/eval-stamp.ts#stampLlmCodeStrategy` from
 * `plugins/zoto-eval-system/templates/llm/code-cursor-sdk/per-primitive-test.ts.tmpl`.
 *
 * The literal first line of this file MUST remain `// _meta.generated: true`.
 * Subtask 03's cleanup engine and subtask 11's overwrite gate both use
 * `evals/_llm/_user-case-guards.ts#isGeneratedFile(path, { strict: true })`
 * to decide whether this file is safe to replace or delete. Edit the
 * template, not this emitted file.
 *
 * Canonical SDK pattern (routed through `_shared/sdk-bridge.ts`):
 *
 *   const agent = await createAgent({ modelId, cwd });
 *   const run = await sendPrompt(agent, prompt);
 *   const { text, result } = await awaitRun(run);
 *   expect(text).toMatch(/.../);
 */
import { describe, it, afterAll, expect } from "vitest";

import {
  createAgent,
  sendPrompt,
  awaitRun,
  closeAgent,
  resolveTokens,
} from "./_shared/sdk-bridge.js";
import {
  buildSandbox,
  diffSandbox,
  postSnapshot,
  preSnapshot,
} from "./_shared/sandbox-helpers.js";
import { reportCase, reportSuite } from "./_shared/zoto-llm-reporter.js";
import { contains } from "./_shared/graders/contains.js";
import { regex } from "./_shared/graders/regex.js";
import { toolCalled } from "./_shared/graders/tool-called.js";
import { llmJudge } from "./_shared/graders/llm-judge.js";
import type { GraderReport } from "./_shared/graders/common.js";

interface CaseDefinition {
  id: string;
  prompt: string;
  follow_ups?: string[];
  assertions: string[];
  assertion_patterns?: string[];
  graders?: Array<Record<string, unknown>>;
  fixtures?: { files?: Array<{ path: string; content?: string; from?: string }> };
  expected_filesystem?: {
    created?: string[];
    modified?: string[];
    removed?: string[];
    unchanged?: string[];
  };
  expected_output?: string;
}

const CASES: CaseDefinition[] = [
  {
    "id": "declarative-rollout-after-configure-gathers-answers",
    "prompt": "/z-eval-configure finished: overwrite if needed; evalsDir evals; skillsRoots [\".cursor/skills\",\"skills\",\"plugins/*/skills\"]; discoveryTargets [\"skill\",\"command\",\"agent\",\"hook\"]; static.framework pytest; llm.runtime tsx; llm.model.id composer-2; llm.strategy declarative; llm.codeFramework vitest; judgeModel opus-4.6; manualChecklists.enabled true; additionalAutomation []; ignore []; update.criticalChangeRules all true. Apply zoto-configure-evals now.",
    "assertions": [
      "Before writing, the agent used readManifestSnapshot from evals/_llm/manifest-snapshot.ts rather than hand-rolled YAML parsing.",
      "The agent wrote .zoto/eval-system/config.yml only via a temp file then rename and AJV-validated it against templates/schema/config.schema.json.",
      "The emitted cleanup_plan validated against templates/schema/cleanup-plan.schema.json and totals.files matched the summed group file counts.",
      "update.preserveUserAuthoredCases and update.writeMetaMarker in the written config are true without prompting.",
      "The agent never called askQuestion and did not run pnpm run eval:cleanup-stale.",
      "The summary told the operator to let /z-eval-configure render cleanup confirmation and only then proceed toward generation work like /z-eval-create."
    ],
    "assertion_patterns": [],
    "expected_output": "A concise report listing the written eval-system settings, an empty or minimal cleanup plan when no prior manifest conflicts exist, update.preserveUserAuthoredCases and update.writeMetaMarker forced true, and the next human step pointing back through /z-eval-configure for cleanup confirmation before /z-eval-create."
  },
  {
    "id": "code-strategy-without-llm-codeframework",
    "prompt": "/z-eval-configure returned answers but the hand-off missed llm.codeFramework while setting llm.strategy code and static.framework vitest. Run zoto-configure-evals and follow SKILL.md cross-field rules.",
    "assertions": [
      "The agent returned needs_user_input specifically because llm.strategy is code without a concrete llm.codeFramework value.",
      "No askQuestion tool calls originated from this skill.",
      "The agent did not claim cleanup ran and did not invoke pnpm run eval:cleanup-stale."
    ],
    "assertion_patterns": [],
    "expected_output": "A structured needs_user_input payload telling the command to re-collect llm.codeFramework, with no partial config promoted and no askQuestion emitted from this skill."
  },
  {
    "id": "pytest-to-vitest-switch-invalidates-analysis-cache",
    "prompt": "/z-eval-configure authorized overwriting config while moving static.framework from pytest to vitest while keeping llm.strategy declarative; merge the latest answers and run zoto-configure-evals against the repo that already has a manifest and generated eval rows.",
    "assertions": [
      "readManifestSnapshot reflected the prior pytest static framework before the new config wrote vitest.",
      "cleanup_plan.groups contained a framework-switch reason matching SKILL.md rules and schema_version stayed 1.",
      "totals.files equaled the sum of every groups[].files entry.",
      "Each generated case under manifest-listed eval_files paths now sets _meta.primitive_analysis.invalidate to true after the framework change.",
      "The agent appended an audit line to .zoto/eval-system/manifest.history.yml describing the framework change without deleting files itself.",
      "cleanup_plan and config both passed AJV validation and the skill never invoked pnpm run eval:cleanup-stale."
    ],
    "assertion_patterns": [],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/manifest.yml",
          "content": "discovery_config:\n  static:\n    framework: pytest\n  llm:\n    strategy: declarative\n    codeFramework: vitest\ntargets:\n  - eval_files:\n      - workspace/plugins/acme/skills/reporting/evals/evals.json\n"
        },
        {
          "path": "workspace/plugins/acme/skills/reporting/evals/evals.json",
          "content": "[{\"id\":\"gen-row-a\",\"prompt\":\"import path survives\",\"assertions\":[\"bundle still resolves\"],\"_meta\":{\"generated\":true,\"primitive_analysis\":{\"invalidate\":false,\"summary\":\"Row a\",\"model_id\":\"composer-2\",\"source_hash\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"}}}]"
        }
      ]
    },
    "expected_output": "Updated config.yml reflecting vitest, a cleanup_plan whose groups include framework-switch assets tied to the old pytest fingerprint, every generated row gaining primitive_analysis.invalidate true, totals.files reconciled, manifest.history.yml appended, and still no askQuestion from this skill."
  },
  {
    "id": "declarative-to-code-strategy-switch",
    "prompt": "/z-eval-configure wants llm.strategy code with static.framework vitest, llm.codeFramework vitest, leaving other defaults sensible; the repo already stamped central evals.json rows under declarative strategy. Apply zoto-configure-evals with overwrite allowed.",
    "assertions": [
      "cleanup_plan included a strategy-switch group consistent with leaving declarative outputs behind.",
      "Because llm.strategy changed, every generated eval entry enumerated through manifest targets received _meta.primitive_analysis.invalidate true.",
      "The written config kept static.framework and llm.codeFramework aligned under code strategy, avoiding extra soft warnings.",
      "The agent validated cleanup_plan against templates/schema/cleanup-plan.schema.json before returning.",
      "No askQuestion calls and no pnpm run eval:cleanup-stale subprocess appeared in this skill run."
    ],
    "assertion_patterns": [],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/manifest.yml",
          "content": "discovery_config:\n  static:\n    framework: vitest\n  llm:\n    strategy: declarative\n    codeFramework: vitest\ntargets:\n  - eval_files:\n      - workspace/plugins/acme/skills/reporting/evals/evals.json\n"
        },
        {
          "path": "workspace/plugins/acme/skills/reporting/evals/evals.json",
          "content": "[{\"id\":\"gen-row-b\",\"prompt\":\"route coverage\",\"assertions\":[\"export still public\"],\"_meta\":{\"generated\":true,\"primitive_analysis\":{\"invalidate\":false,\"summary\":\"Row b\",\"model_id\":\"composer-2\",\"source_hash\":\"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\"}}}]"
        }
      ]
    },
    "expected_output": "Config.yml storing code strategy with matching vitest harness fields, cleanup_plan highlighting strategy-switch consequences for declarative assets, generated rows flagged invalidate true, validated schemas, documented next steps through /z-eval-configure, and no direct cleanup execution."
  },
  {
    "id": "reject-disabling-preserveuserauthoredcases",
    "prompt": "/z-eval-configure mistakenly forwarded update.preserveUserAuthoredCases false along with otherwise valid fields. Run zoto-configure-evals and obey the contract section of SKILL.md.",
    "assertions": [
      "AJV validation against templates/schema/config.schema.json failed because preserveUserAuthoredCases must remain const true.",
      "The agent did not write a persisted .zoto/eval-system/config.yml that sets update.preserveUserAuthoredCases to false.",
      "The skill emitted no askQuestion prompts while explaining the schema conflict."
    ],
    "assertion_patterns": [],
    "expected_output": "Validation output citing the forbidden false value, no committed config.yml containing that flag flipped off, and either needs_user_input or another explicit halt path without askQuestion."
  },
  {
    "id": "ignore-glob-drops-a-discovered-target",
    "prompt": "/z-eval-configure now adds ignore [\"plugins/legacy/**\"] while shrinking discoveryTargets to [\"skill\",\"command\",\"agent\",\"hook\"] and keeps static.framework vitest with declarative strategy. Apply zoto-configure-evals so orphaned generated JSON is planned for removal.",
    "assertions": [
      "cleanup_plan.groups included removed-target entries pointing at orphaned generated eval JSON for the legacy hook target.",
      "totals.files matched the grouped file counts per cleanup-plan.schema.json.",
      "The agent did not delete workspace files inside this skill; it only described the plan.",
      "No askQuestion originated from this skill run."
    ],
    "assertion_patterns": [],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/manifest.yml",
          "content": "discovery_config:\n  static:\n    framework: vitest\n  llm:\n    strategy: declarative\n    codeFramework: vitest\ntargets:\n  - eval_files:\n      - workspace/plugins/core/skills/alpha/evals/evals.json\n  - eval_files:\n      - workspace/plugins/legacy/hooks/pkg/evals/evals.json\n"
        },
        {
          "path": "workspace/plugins/core/skills/alpha/evals/evals.json",
          "content": "[]"
        },
        {
          "path": "workspace/plugins/legacy/hooks/pkg/evals/evals.json",
          "content": "[{\"id\":\"orphan-row\",\"prompt\":\"legacy hook\",\"assertions\":[\"signal stays wired\"],\"_meta\":{\"generated\":true,\"primitive_analysis\":{\"invalidate\":false,\"summary\":\"Legacy hook\",\"model_id\":\"composer-2\",\"source_hash\":\"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\"}}}]"
        }
      ]
    },
    "expected_output": "cleanup_plan mentioning removed-target with the legacy eval JSON path, totals.files consistent, schemas validated, and instructions deferring actual deletion to /z-eval-configure plus pnpm run eval:cleanup-stale after human approval."
  },
  {
    "id": "vitest-static-with-jest-harness-emits-warning",
    "prompt": "/z-eval-configure sets llm.strategy code but operator selected llm.codeFramework jest while leaving static.framework vitest; previous manifest was declarative vitest. Apply zoto-configure-evals with overwrite permitted.",
    "assertions": [
      "cleanup_plan.warnings included at least one human-readable mismatch note tying static.framework vitest to llm.codeFramework jest under code strategy.",
      "cleanup_plan.groups included framework-switch reasoning for the unused harness artifacts per SKILL.md.",
      "_meta.primitive_analysis.invalidate is true on generated eval rows because llm.strategy changed relative to the manifest snapshot.",
      "Both payloads still validated through AJV against their respective schema files.",
      "The skill neither called askQuestion nor executed pnpm run eval:cleanup-stale."
    ],
    "assertion_patterns": [],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/manifest.yml",
          "content": "discovery_config:\n  static:\n    framework: vitest\n  llm:\n    strategy: declarative\n    codeFramework: vitest\ntargets:\n  - eval_files:\n      - workspace/plugins/acme/skills/reporting/evals/evals.json\n"
        },
        {
          "path": "workspace/plugins/acme/skills/reporting/evals/evals.json",
          "content": "[{\"id\":\"gen-row-c\",\"prompt\":\"dual harness\",\"assertions\":[\"bundle lists exports\"],\"_meta\":{\"generated\":true,\"primitive_analysis\":{\"invalidate\":false,\"summary\":\"Row c\",\"model_id\":\"composer-2\",\"source_hash\":\"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd\"}}}]"
        }
      ]
    },
    "expected_output": "Config.yml honoring the mismatched vitest versus jest pairing without blocking, cleanup_plan carrying a framework-switch bucket for the orphan harness assets, cleanup_plan.warnings containing a soft mismatch notice, invalidate flags set on generated rows, and validation succeeding for both config and plan schemas."
  }
];
const TARGET_ID = "skill:zoto-configure-evals";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("skill:zoto-configure-evals", () => {
  afterAll(() => {
    reportSuite({
      target_id: TARGET_ID,
      started_at: new Date(SUITE_START).toISOString(),
      ended_at: new Date().toISOString(),
      model: MODEL_ID,
    });
  });

  for (const c of CASES) {
    const testFn = async (): Promise<void> => {
      const caseStart = Date.now();
      const sandbox = buildSandbox({
        runId: TARGET_ID,
        caseId: c.id,
        repoRoot: REPO_ROOT,
        fixtures: c.fixtures as never,
      });

      const before = preSnapshot(sandbox.rootDir);
      const agent = await createAgent({ modelId: MODEL_ID, cwd: sandbox.rootDir });

      let text = "";
      let tokens = 0;
      let tokenSource = "approximate:chars/4";
      let status: "passed" | "failed" | "errored" = "passed";
      const reports: GraderReport[] = [];
      try {
        const run = await sendPrompt(agent, c.prompt);
        const awaited = await awaitRun(run);
        text = awaited.text;
        const resolved = resolveTokens(awaited.result, c.prompt, text);
        tokens = resolved.tokens;
        tokenSource = resolved.source;

        for (const followUp of c.follow_ups ?? []) {
          const followRun = await sendPrompt(agent, followUp);
          const followAwaited = await awaitRun(followRun);
          text += "\n" + followAwaited.text;
          tokens += resolveTokens(followAwaited.result, followUp, followAwaited.text).tokens;
        }

        for (const g of c.graders ?? []) {
          const gtype = (g as { type?: string }).type;
          if (gtype === "contains") reports.push(contains(g as never, text));
          else if (gtype === "regex") reports.push(regex(g as never, text));
          else if (gtype === "tool-called") reports.push(toolCalled(g as never, []));
          else if (gtype === "llm-judge") {
            reports.push(
              await llmJudge(g as never, text, {
                judge: async ({ prompt }) => {
                  const judgeAgent = await createAgent({ modelId: JUDGE_MODEL, cwd: sandbox.rootDir });
                  try {
                    const jr = await sendPrompt(judgeAgent, prompt);
                    const ja = await awaitRun(jr);
                    return parseJudgeScore(ja.text);
                  } finally {
                    closeAgent(judgeAgent);
                  }
                },
              }),
            );
          }
        }

        /* Enriched assertion list: one rubric-backed judge covers every analyser
         * requirement (avoids loose short `contains` needles on assertion text). */
        if (c.assertions.length > 0) {
          const rubric = [
            "You grade an AI agent's final natural-language reply.",
            "Score how well the RESPONSE semantically satisfies EVERY requirement below; paraphrases count.",
            "Return score 1.0 only when all requirements are clearly satisfied; lower scores when any important requirement is missing or contradicted.",
            "",
            "REQUIREMENTS:",
            ...c.assertions.map((a, i) => `${i + 1}. ${a}`),
          ].join("\n");
          reports.push(
            await llmJudge(
              {
                type: "llm-judge",
                rubric,
                passThreshold: 0.72,
              },
              text,
              {
                judge: async ({ prompt }) => {
                  const judgeAgent = await createAgent({ modelId: JUDGE_MODEL, cwd: sandbox.rootDir });
                  try {
                    const jr = await sendPrompt(judgeAgent, prompt);
                    const ja = await awaitRun(jr);
                    return parseJudgeScore(ja.text);
                  } finally {
                    closeAgent(judgeAgent);
                  }
                },
              },
            ),
          );
        }

        for (const pattern of c.assertion_patterns ?? []) {
          expect(text).toMatch(new RegExp(pattern));
        }

        const failed = reports.some((r) => r.verdict === "fail");
        status = failed ? "failed" : "passed";
      } catch (err) {
        status = "errored";
        reports.push({
          grader: "runtime",
          verdict: "fail",
          detail: (err as Error).message,
        });
        throw err;
      } finally {
        closeAgent(agent);
        const after = postSnapshot(sandbox.rootDir);
        const mutations = diffSandbox(before, after);
        const caseEnd = Date.now();
        reportCase({
          target_id: TARGET_ID,
          case: {
            id: c.id,
            status,
            tokens,
            duration_ms: caseEnd - caseStart,
            verbosity:
              c.prompt.length === 0
                ? 0
                : Math.round((text.length / Math.max(1, c.prompt.length)) * 1000) / 1000,
            accuracy:
              reports.length === 0
                ? 0
                : Math.round(
                    (reports.filter((r) => r.verdict === "pass").length / reports.length) * 1000,
                  ) / 1000,
            confidence:
              reports.length === 0
                ? 0
                : Math.round(
                    (reports.filter((r) => r.verdict !== "fail").length / reports.length) * 1000,
                  ) / 1000,
            grader_reports: reports,
            repo_mutations: mutations,
            token_source: tokenSource,
            expected_output: c.expected_output,
            assertions: c.assertions,
          },
        });
      }
    };

    if (!API_KEY_PRESENT) {
      it.skip(`${c.id} (skipped: CURSOR_API_KEY missing)`, () => {});
    } else {
      it(c.id, testFn, 180000);
    }
  }
});

function parseJudgeScore(raw: string): { score: number; detail: string } {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return { score: 0, detail: `unparseable judge response: ${raw.slice(0, 200)}` };
  try {
    const obj = JSON.parse(match[0]) as { score?: unknown; detail?: unknown };
    const score = typeof obj.score === "number" ? Math.max(0, Math.min(1, obj.score)) : 0;
    const detail = typeof obj.detail === "string" ? obj.detail : "";
    return { score, detail };
  } catch (err) {
    return { score: 0, detail: `judge JSON parse failure: ${(err as Error).message}` };
  }
}
