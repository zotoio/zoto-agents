// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-compare`.
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
import type { CodeStrategyCaseDefinition } from "./_shared/code-strategy-case.js";


const CASES: CodeStrategyCaseDefinition[] = [
  {
    "id": "three-stamped-runs-merge-into-one-canvas-dataset",
    "prompt": "/z-eval-compare 20260115090000 20260115090100 20260115090200",
    "assertions": [
      "Before resolving folders, the assistant treated workspace/.zoto/eval-system/config.yml as present and readable so execution continued past the initialisation gate.",
      "The assistant spawned a zoto-eval-comparer subagent whose brief referenced the zoto-compare-evals skill workflow.",
      "Each slash-delimited argument mapped to report.yml under workspace/evals/_runs/20260115090000, workspace/evals/_runs/20260115090100, and workspace/evals/_runs/20260115090200 respectively.",
      "Flattening honoured report.static and report.llm totals while pulling case-level measurements from sibling static.yml and llm.yml files for every run.",
      "Every emitted dataset row carried run_id, model, case_id, status, tokens, duration_ms, verbosity, accuracy, confidence, and log_path aimed at the matching logs directory entry for drill-down.",
      "The instructions array embedded in stdout reproduced plugins/zoto-eval-system/templates/canvas/compare-prompt.md.tmpl without edits.",
      "The structured hand-off set tool to /canvas, included the copied instructions array, listed all underlying cases from the three runs in dataset, and paired it with plain-language guidance telling the host agent to call /canvas instead of drawing charts inline."
    ],
    "assertion_patterns": [],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "evalsDir: workspace/evals\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090000/report.yml",
          "content": "model: northstar-v1\nreport:\n  static:\n    passed: 1\n  llm:\n    passed: 1\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090000/static.yml",
          "content": "rows:\n  - case_id: alpha\n    status: passed\n    duration_ms: 120\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090000/llm.yml",
          "content": "rows:\n  - case_id: alpha\n    status: passed\n    tokens: 900\n    verbosity: 0.42\n    accuracy: 0.88\n    confidence: 0.91\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090100/report.yml",
          "content": "model: northstar-v2\nreport:\n  static:\n    passed: 1\n  llm:\n    passed: 1\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090100/static.yml",
          "content": "rows:\n  - case_id: beta\n    status: failed\n    duration_ms: 210\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090100/llm.yml",
          "content": "rows:\n  - case_id: beta\n    status: failed\n    tokens: 1100\n    verbosity: 0.55\n    accuracy: 0.72\n    confidence: 0.68\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090200/report.yml",
          "content": "model: northstar-v3\nreport:\n  static:\n    passed: 1\n  llm:\n    passed: 1\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090200/static.yml",
          "content": "rows:\n  - case_id: gamma\n    status: passed\n    duration_ms: 95\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090200/llm.yml",
          "content": "rows:\n  - case_id: gamma\n    status: passed\n    tokens: 780\n    verbosity: 0.39\n    accuracy: 0.93\n    confidence: 0.89\n"
        }
      ]
    },
    "expected_output": "After confirming eval-system config is present, the assistant launches the comparer workflow, builds one combined table covering alpha, beta, and gamma rows across three runs, and hands hosts a /canvas JSON object whose instructions came straight from the bundled compare template."
  },
  {
    "id": "ambiguous-first-token-triggers-palette-disambiguation",
    "prompt": "/z-eval-compare 20260503 20260115090100",
    "assertions": [
      "After `/z-eval-compare 20260503 20260115090100`, askQuestion ran before the comparer task ingested report.yml for the first argument because two directories shared the 20260503 fragment.",
      "The resumed Task prompt referenced exactly one chosen path under workspace/evals/_runs for the first slot.",
      "The assistant resolved the second token straight to workspace/evals/_runs/20260115090100/report.yml without another ambiguity round."
    ],
    "assertion_patterns": [
      "/z-eval-compare 20260503 20260115090100"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "evalsDir: workspace/evals\n"
        },
        {
          "path": "workspace/evals/_runs/20260503120000/report.yml",
          "content": "model: ridge-a\nreport:\n  static:\n    passed: 1\n  llm:\n    passed: 0\n"
        },
        {
          "path": "workspace/evals/_runs/20260503121500/report.yml",
          "content": "model: ridge-b\nreport:\n  static:\n    passed: 0\n  llm:\n    passed: 1\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090100/report.yml",
          "content": "model: northstar-v2\nreport:\n  static:\n    passed: 1\n  llm:\n    passed: 1\n"
        }
      ]
    },
    "expected_output": "The assistant pauses with askQuestion until the operator picks one workspace/evals/_runs folder for the first argument, then proceeds while leaving the second argument untouched."
  },
  {
    "id": "comparer-clarification-resumes-after-operator-reply",
    "prompt": "/z-eval-compare 20260115090000 20260115090100",
    "follow_ups": [
      "When the comparer surfaces needs_user_input because static.yml marks case_id alpha passed while llm.yml marks alpha failed on the first run, answer that static-backend rows win on ties before resuming."
    ],
    "assertions": [
      "The assistant spawned zoto-eval-comparer with the zoto-compare-evals skill immediately after parsing `/z-eval-compare 20260115090000 20260115090100`.",
      "When the comparer returned structured needs_user_input about clashing alpha statuses, the command-owned loop surfaced askQuestion before loading datasets further.",
      "After the follow-up answer prioritising static-backend rows, the assistant resumed the comparer task with that decision reflected in the instructions passed back into the Task prompt.",
      "The closing transcript still contained JSON whose tool field equals /canvas, whose instructions mirrored plugins/zoto-eval-system/templates/canvas/compare-prompt.md.tmpl, and whose dataset enumerated both runs including alpha and beta rows with log_path values targeting each run's logs directory."
    ],
    "assertion_patterns": [
      "/z-eval-compare 20260115090000 20260115090100"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "evalsDir: workspace/evals\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090000/report.yml",
          "content": "model: northstar-v1\nreport:\n  static:\n    passed: 1\n  llm:\n    passed: 1\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090000/static.yml",
          "content": "rows:\n  - case_id: alpha\n    status: passed\n    duration_ms: 120\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090000/llm.yml",
          "content": "rows:\n  - case_id: alpha\n    status: failed\n    tokens: 900\n    verbosity: 0.42\n    accuracy: 0.88\n    confidence: 0.91\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090100/report.yml",
          "content": "model: northstar-v2\nreport:\n  static:\n    passed: 1\n  llm:\n    passed: 1\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090100/static.yml",
          "content": "rows:\n  - case_id: beta\n    status: failed\n    duration_ms: 210\n"
        },
        {
          "path": "workspace/evals/_runs/20260115090100/llm.yml",
          "content": "rows:\n  - case_id: beta\n    status: failed\n    tokens: 1100\n    verbosity: 0.55\n    accuracy: 0.72\n    confidence: 0.68\n"
        }
      ]
    },
    "expected_output": "The assistant surfaces askQuestion (or an equivalent clarification) after needs_user_input from the comparer, applies the operator tie-breaker, resumes work, and still finishes with the /canvas JSON described in the canvas template."
  }
];
const TARGET_ID = "command:z-eval-compare";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("command:z-eval-compare", () => {
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
