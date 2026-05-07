// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-spec-executor`.
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
    "id": "standard-spec-run-with-watcher-and-phased-subagents",
    "prompt": "You are the spec executor: run `/z-spec-execute` against `specs/20260507-auth-hardening` using the repo’s `.zoto/spec-system/config.yml`. Confirm the Subtask Manifest with me, then drive each dependency phase without bumping parallel fan-out above the configured limit, keep the index Status column truthful as subtasks finish, and stop for my review before you mark the initiative completed.",
    "assertions": [
      "Before coordinating work, the agent reads `.zoto/spec-system/config.yml` and applies `unitOfWork`, `specsDir`, `workDir`, `spec.maxSubtasks`, `spec.parallelLimit`, `spec.adversarialVerification`, and `extensions.memory.enabled` to its decisions.",
      "Right after execution begins on a spec whose directory contains `status/`, the agent backgrounds `pnpm --filter @zoto-agents/zoto-spec-system exec tsx plugins/zoto-spec-system/scripts/spec-aggregator.ts --watch` with the absolute dated spec directory and repository root arguments and tracks the child PID.",
      "The agent states that the aggregator watch loop only reads `status/*.status.yml`, never writes a subtask’s `.status.yml` / `.status.md`, and updates only the spec-root `status.md` + `status.yml` when the digest changes.",
      "The user-facing summary and approval prompts use the configured `unitOfWork` term instead of hard-coded synonyms like “plan” or “story” when those conflict with config.",
      "Subtasks are started only after all dependency subtasks from earlier phases are complete, and within each phase the agent launches at most `spec.parallelLimit` concurrent subagents.",
      "Executing agents are instructed to run targeted tests during parallel work and defer the repository-wide test suite to the final verification phase.",
      "After each subtask completes, the agent spawns a fresh `zoto-spec-judge` subagent for adversarial verification whenever `spec.adversarialVerification` is true."
    ],
    "assertion_patterns": [
      "\\.zoto/spec-system/config\\.yml",
      "status/",
      "status/\\*\\.status\\.yml",
      "unitOfWork",
      "spec\\.parallelLimit",
      "zoto-spec-judge"
    ],
    "expected_output": "A concise execution plan that quotes the manifest, states the resolved `spec.parallelLimit`, announces background `spec-aggregator.ts --watch` for the dated directory, schedules subagents strictly by phases, and lists the gate checks (per-subtask targeted testing only during parallel work, full suite later, `spec-onstop-check.ts` before sharing the report)."
  },
  {
    "id": "per-spawn-token-budget-prefix-resolution",
    "prompt": "Continue executing the same dated spec where `status/` is present. Before you spawn the next `subtask`-role worker for subtask 02, explain how you refresh the spawn prefix and what the first line of the injected prefix will contain.",
    "assertions": [
      "On each subagent spawn (roles in the `generator | executor | judge | subtask` set), the agent shells to `tsx plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts --role … --status-yml … --status-md …` from the repository root.",
      "The agent states that updated `subagents.*.tokenBudget` values take effect on the very next spawn without restarting the whole executor session.",
      "The agent quotes or paraphrases the required first-line prefix format beginning with `Token budget:` and mentions recording that budget in the spawned subagent’s `status.yml` `token_budget` field."
    ],
    "assertion_patterns": [
      "generator \\| executor \\| judge \\| subtask",
      "subagents\\.\\*\\.tokenBudget",
      "Token budget:"
    ],
    "expected_output": "An explicit note that the next subagent spawn shells out to `tsx plugins/zoto-spec-system/scripts/spec-spawn-prefix.ts` with `--role subtask` plus the current `--status-yml` and `--status-md` paths, and that stdout’s first line is the required token-budget sentence with the resolved integer."
  },
  {
    "id": "judge-verdict-remediation-without-executor-authored-fixes",
    "prompt": "During `/z-spec-execute`, the judge for subtask 04 returned `Partial` with a non-empty structured `fix_list` in `.status.yml` under `extra.judge`. As executor, what do you do next—please be explicit about who edits code and who reruns verification.",
    "assertions": [
      "The agent refuses to translate the judge `fix_list` into its own code edits and instead re-spawns the exact subagent type listed in the manifest row for that subtask.",
      "The agent instructs the implementation subagent to apply fixes, update its own `.status.yml` / `.status.md` pair, and keep the judge confined to writing verdict metadata into `extra.judge` in the subtask `.status.yml` only.",
      "After fixes land, the agent schedules another `zoto-spec-judge` verification pass (a new instance) before treating the subtask as done."
    ],
    "assertion_patterns": [
      "fix_list",
      "\\.status\\.yml",
      "zoto-spec-judge"
    ],
    "expected_output": "A remediation plan that routes the structured `fix_list` back to the manifest’s originally assigned subagent for subtask 04, forbids the judge from patching product files, and schedules a brand-new `zoto-spec-judge` pass afterward."
  },
  {
    "id": "final-verification-onstop-gate-and-execution-report",
    "prompt": "All subtasks are green. Before you show me anything, walk through the shutdown checks for `/z-spec-execute`: tests, lint handling, the YAML/md consistency script, and where you write the narrative audit trail.",
    "assertions": [
      "The agent states it runs `ReadLints` (or equivalent) on files touched during subtasks after each subtask and again during final verification as needed.",
      "The agent runs the full project test suite only in the final verification phase after every subtask has completed successfully.",
      "Before presenting the execution report to the operator, the agent shells out to `pnpm --filter @zoto-agents/zoto-spec-system exec tsx plugins/zoto-spec-system/scripts/spec-onstop-check.ts --human` with the repository root flag set to the workspace root and treats exit code 2 as a hard stop that forces additional remediation loops.",
      "The agent writes `execution-report-[feature-name]-[yyyymmdd].md` into the dated spec directory and treats specs under `{specsDir}/` as ephemeral coordination artifacts rather than durable knowledge stores.",
      "The agent notes that the `hooks/zoto-onstop-check.mjs` stop hook mirrors the same consistency check as defence in depth, without substituting for the executor’s explicit `spec-onstop-check.ts` call."
    ],
    "assertion_patterns": [
      "ReadLints",
      "pnpm --filter @zoto-agents/zoto-spec-system exec tsx plugins/zoto-spec-system/scripts/spec-onstop-check\\.ts --human",
      "execution-report-\\[feature-name\\]-\\[yyyymmdd\\]\\.md",
      "hooks/zoto-onstop-check\\.mjs"
    ],
    "expected_output": "A ordered checklist that runs the project-wide tests and lint assessment after parallel work, invokes `pnpm --filter @zoto-agents/zoto-spec-system exec tsx plugins/zoto-spec-system/scripts/spec-onstop-check.ts --human --repo-root …`, blocks user-facing completion when the script exits 2, and writes `execution-report-<feature>-<yyyymmdd>.md` inside the dated spec directory."
  },
  {
    "id": "legacy-spec-directory-without-status-folder",
    "prompt": "Please `/z-spec-execute` the initiative under `specs/20240501-legacy-import`—that tree predates `status/` directories. Describe exactly how your tooling path differs from a modern spec.",
    "assertions": [
      "The agent logs the exact legacy warning sentence `status/ directory absent — running legacy spawn path` when the dated directory lacks a `status/` folder.",
      "In that legacy situation the agent does not background `spec-aggregator.ts --watch` and does not invoke `spec-spawn-prefix.ts`, noting that spawned subagents will not receive status-file paths in their prefix."
    ],
    "assertion_patterns": [
      "status/ directory absent — running legacy spawn path",
      "spec-aggregator\\.ts --watch"
    ],
    "expected_output": "Recognition that missing `status/` triggers the legacy branch with a single warning line, skips `spec-aggregator --watch`, and skips `spec-spawn-prefix.ts`, while still coordinating subtasks through the manifest."
  },
  {
    "id": "invalid-spec-system-config-during-aggregator-reload",
    "prompt": "While the watcher is running for an active `/z-spec-execute`, someone saved a malformed `.zoto/spec-system/config.yml`. What should the aggregator do on the next poll, and what event must appear at the spec root afterward?",
    "assertions": [
      "The agent explains that `ConfigValidationError` during reload causes the process to continue with the previous good config rather than crashing the watcher.",
      "The agent specifies that the next digest write records an events entry whose kind field equals config_reload_failed in the spec-root status.yml."
    ],
    "assertion_patterns": [
      "ConfigValidationError"
    ],
    "expected_output": "Explanation that the watcher keeps the last validated configuration, continues operating, and emits an events entry whose kind field is config_reload_failed in the spec-root status.yml on the next aggregate write."
  },
  {
    "id": "operator-cancels-an-in-flight-execute-run",
    "prompt": "I am aborting `/z-spec-execute` mid-run. How do you tear down the background aggregator politely so we do not strand processes?",
    "assertions": [
      "The agent sends `SIGINT` to the background `spec-aggregator` process when cancellation is requested.",
      "The agent waits up to one current `aggregator.pollIntervalMs` window for a clean exit before issuing `SIGTERM`."
    ],
    "assertion_patterns": [
      "SIGINT",
      "aggregator\\.pollIntervalMs"
    ],
    "expected_output": "A shutdown recipe that targets the tracked child PID with `SIGINT`, waits at most one `pollIntervalMs` for graceful exit, then escalates to `SIGTERM` if needed."
  },
  {
    "id": "memory-extension-enabled-suggests-follow-up-workflow",
    "prompt": "We finished `/z-spec-execute` successfully on this repo with memory extensions switched on. What optional housekeeping do you recommend next regarding the configured memory plugin?",
    "assertions": [
      "Because `extensions.memory.enabled` is true and a plugin id is present, the agent proposes running that plugin’s deferred memory workflow after execution, without attempting to mutate memory data directly."
    ],
    "assertion_patterns": [
      "extensions\\.memory\\.enabled"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "unitOfWork: spec\nspecsDir: specs\nworkDir: specs/current\nspec:\n  maxSubtasks: 12\n  parallelLimit: 2\n  adversarialVerification: true\nextensions:\n  memory:\n    enabled: true\n    plugin: zoto-memory-notes\naggregator:\n  pollIntervalMs: 1500\n  debounceMs: 250\n  enabled: true\nhooks: {}\n"
        }
      ]
    },
    "expected_output": "After completion, the agent suggests invoking the named plugin’s dream or extract workflow to harvest learnings, while clarifying it does not write memories itself."
  }
];
const TARGET_ID = "agent:zoto-spec-executor";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("agent:zoto-spec-executor", () => {
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
