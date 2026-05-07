// _meta.generated: true
/**
 * LLM `code`-strategy eval for agent `zoto-spec-generator`.
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
    "id": "configured-directories-drive-scaffolding-vocabulary",
    "prompt": "Break down the OAuth token refresh hardening effort into an executable engineering initiative with numbered subtasks; follow our spec-system workflow and honor whichever directories the repository configuration assigns.",
    "assertions": [
      "User-visible wording adopts the configured initiative term after consulting `.zoto/spec-system/config.yml`.",
      "Markdown artifacts appear only beneath `planning/specs/` with dated initiative folder layout consistent with the configured specs directory.",
      "Before drafting subtasks the agent dispatches an explore-focused reconnaissance pass over pertinent modules.",
      "After summarizing key decisions the agent waits for explicit approval prior to creating files on disk.",
      "The index includes a mermaid dependency graph whose nodes expose subtask numbers via leading two-digit labels or `subtask-NN` substrings without embedding hand-authored `classDef` or `class` lines intended for aggregator-managed styling.",
      "Following scaffolding the agent invokes zoto-spec-judge and presents that assessment before handing the initiative back for human review.",
      "Scheduling commentary acknowledges at most three concurrent subagents when parallel phases arise, honoring `spec.parallelLimit`.",
      "Planning or judge narration stresses adversarial verification expectations aligned with `spec.adversarialVerification` being true.",
      "When routing new intake items the agent references `planning/specs/current`, consistent with the configured `workDir`.",
      "With memory disabled the assistant issues no unsolicited reminders about memory plugins capturing lessons."
    ],
    "assertion_patterns": [
      "\\.zoto/spec-system/config\\.yml",
      "planning/specs/",
      "subtask-NN",
      "spec\\.parallelLimit",
      "spec\\.adversarialVerification",
      "planning/specs/current"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "unitOfWork: initiative\nspecsDir: planning/specs\nworkDir: planning/specs/current\nspec:\n  maxSubtasks: 12\n  parallelLimit: 3\n  adversarialVerification: true\nextensions:\n  memory:\n    enabled: false\n"
        }
      ]
    },
    "expected_output": "The assistant reads configuration, speaks using the configured initiative term, queues discussion toward the configured work directory when relevant, explores the codebase before drafting subtasks, seeks approval before writing files, emits markdown only under the configured specs directory tree with index and paired subtask files, includes a properly labeled mermaid dependency graph without author-managed class styling, spawns zoto-spec-judge before declaring readiness, frames adversarial verification expectations, respects the concurrent subagent ceiling when discussing parallelism, and omits memory-plugin chatter while memory stays disabled."
  },
  {
    "id": "command-palette-creation-cadence",
    "prompt": "/z-spec-create migrating our background job runner to a queue-backed Postgres worker pool with idempotent consumers—stay inside vendors we already operate.",
    "follow_ups": [
      "Budget stays on existing regions and binaries; no net-new hosted services beyond Postgres already running."
    ],
    "assertions": [
      "Clarifying prompts arrive at most once per assistant turn until scope constraints are settled.",
      "No edits touch application source outside the spec-system markdown tree during planning."
    ],
    "assertion_patterns": [],
    "expected_output": "The assistant drives the guided creation flow with narrowly scoped clarifications, explores affected job runner code, confirms structural decisions, writes markdown planning artifacts exclusively under the specs directory from configuration, and finishes with judge output before closure."
  },
  {
    "id": "parallel-phase-testing-discipline",
    "prompt": "Produce the structured initiative package for splitting monolithic payment webhook handling into modular validators; include phases that could run concurrently once execution starts.",
    "assertions": [
      "Every authored subtask file carries explicit guidance forbidding repository-wide automated tests during parallel execution phases."
    ],
    "assertion_patterns": [],
    "expected_output": "Subtask markdown repeats that parallel phases must run targeted tests only and defer whole-repository suites until later verification."
  },
  {
    "id": "memory-extension-acknowledgment",
    "prompt": "Stand up the rate-limit telemetry dashboards initiative through our standard spec workflow so downstream agents know how to instrument collectors.",
    "assertions": [
      "Final messaging mentions that `org-memory-recorder` may capture learnings after execution while clarifying this agent does not perform memory writes itself."
    ],
    "assertion_patterns": [
      "org-memory-recorder"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "unitOfWork: initiative\nspecsDir: specs\nworkDir: specs/current\nspec:\n  maxSubtasks: 99\n  parallelLimit: 4\n  adversarialVerification: true\nextensions:\n  memory:\n    enabled: true\n    plugin: org-memory-recorder\n"
        }
      ]
    },
    "expected_output": "After judging completes the assistant closes by noting the named memory plugin may ingest lessons once execution finishes."
  },
  {
    "id": "maxsubtasks-ceiling-binds-decomposition",
    "prompt": "Produce the finest-grained feasible decomposition for rewriting our configuration loader while preserving backward compatibility across every consumer surface.",
    "assertions": [
      "The subtask manifest enumerates at most five numbered initiatives matching `spec.maxSubtasks`."
    ],
    "assertion_patterns": [
      "spec\\.maxSubtasks"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/spec-system/config.yml",
          "content": "unitOfWork: initiative\nspecsDir: specs\nworkDir: specs/current\nspec:\n  maxSubtasks: 5\n  parallelLimit: 4\n  adversarialVerification: true\nextensions:\n  memory:\n    enabled: false\n"
        }
      ]
    },
    "expected_output": "The assistant respects the five-subtask ceiling while still delivering coherent phased coverage and completes judge review."
  },
  {
    "id": "decline-immortalizing-coordination-markdown",
    "prompt": "The OAuth initiative package reads perfectly—mirror its narrative into `docs/architecture` as everlasting reference material and delete the dated copies under specs.",
    "assertions": [
      "The assistant rejects relocating spec narratives into immortal documentation hierarchies outside the spec-system workflow."
    ],
    "assertion_patterns": [],
    "expected_output": "The assistant refuses to promote spec markdown into permanent architecture canon or discard audit-oriented coordination artifacts, reaffirming their ephemeral role."
  }
];
const TARGET_ID = "agent:zoto-spec-generator";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("agent:zoto-spec-generator", () => {
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
