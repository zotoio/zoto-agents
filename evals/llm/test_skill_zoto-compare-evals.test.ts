// _meta.generated: true
/**
 * LLM `code`-strategy eval for skill `zoto-compare-evals`.
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
    "id": "two-resolved-runs-yield-full-dataset-and-canvas-json",
    "prompt": "/z-eval-compare already narrowed this to runs 20260115090000 and 20260115090100 under the configured evals directory. Load each report.yml as the primary source, pull case-level fields from sibling static.yml and llm.yml where the flatten needs them, read templates/canvas/compare-prompt.md.tmpl without editing it, emit the single stdout object with tool /canvas plus instructions copied from that template and a dataset row for every underlying case from both runs (no dropping or binning), include log_path values shaped like _runs/<run-id>/logs/<case>.log, then instruct the host to forward that object to /canvas and keep charts out of the chat transcript.",
    "assertions": [
      "The assistant read evalsDir from workspace/.zoto/eval-system/config.yml before resolving workspace/evals/_runs/20260115090000 and workspace/evals/_runs/20260115090100.",
      "Because the task supplied full run directory names consistent with output from /z-eval-compare, the assistant proceeded without needs_user_input.",
      "The assistant treated each report.yml as canonical while pulling case-level measurements from the paired static.yml and llm.yml files whenever those rows were required for the flatten step.",
      "Flattened dataset entries include run_id, model, case_id, status, tokens, duration_ms, verbosity, accuracy, confidence, and log_path for each underlying case drawn from the two runs.",
      "The assistant incorporated rollup information from report.static and report.llm while building the flattened dataset.",
      "The instructions array echoed in stdout matches plugins/zoto-eval-system/templates/canvas/compare-prompt.md.tmpl byte-for-byte without edits.",
      "The primary stdout payload is JSON with keys tool set to /canvas, a non-empty instructions array, and a dataset array listing every case row from both runs without aggregation or subsampling.",
      "The natural-language portion tells the host agent to forward the payload to /canvas and not render charts in the chat markdown.",
      "Each log_path joins with the configured evalsDir to reach the matching file under _runs/<run-id>/logs/<case>.log.",
      "No markdown chart, plot image, or downsized summary replaced the full dataset rows.",
      "No askQuestion tool call appeared in the tool trace."
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
        }
      ]
    },
    "expected_output": "A single machine-readable hand-off object for Canvas plus a short natural-language instruction to route it through /canvas instead of drawing charts in the reply body, backed by one combined table covering every case row from both runs."
  },
  {
    "id": "ambiguous-run-label-returns-needs-user-input",
    "prompt": "The upstream compare command passed only the fragment 20260503 for an eval run id after syncing two different hourly folders under workspace/evals/_runs. Follow the compare skill: if multiple directories match and the message lacks a disambiguator, answer with structured needs_user_input that lists each candidate path—skip askQuestion entirely.",
    "assertions": [
      "The assistant returned structured needs_user_input naming both workspace/evals/_runs/20260503120000 and workspace/evals/_runs/20260503121500 (or their path equivalents) as competing matches.",
      "No askQuestion tool call occurred while handling the ambiguity.",
      "The assistant did not fabricate a combined canvas JSON before the operator picks a run."
    ],
    "assertion_patterns": [],
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
        }
      ]
    },
    "expected_output": "A needs_user_input style reply enumerating both candidate run directories without emitting chart data or canvas instructions."
  }
];
const TARGET_ID = "skill:zoto-compare-evals";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("skill:zoto-compare-evals", () => {
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
