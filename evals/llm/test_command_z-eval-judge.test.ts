// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-judge`.
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
    "id": "hard-stop-when-eval-system-config-is-missing",
    "prompt": "/z-eval-judge",
    "assertions": [
      "The assistant message is exactly: Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.",
      "No `zoto-eval-judge` subagent or `zoto-judge-evals` skill workflow starts and `llm.yml` under any `evals/_runs/` path is untouched."
    ],
    "assertion_patterns": [
      "/z-eval-init",
      "zoto-eval-judge"
    ],
    "expected_output": "A single refusal that tells the operator to initialise the eval system first, without opening run directories or editing YAML under evals."
  },
  {
    "id": "happy-path-annotates-newest-run-directory-into-llm-yml",
    "prompt": "/z-eval-judge",
    "assertions": [
      "After `/z-eval-judge`, `workspace/evals/_runs/20260507120000Z/llm.yml` contains a newly appended top-level `judge` mapping that was absent in the fixture.",
      "The command run spawns a `zoto-eval-judge` subagent wired to the `zoto-judge-evals` skill before mutating `llm.yml`.",
      "The judge narrative references signals that could only come from `static.yml`, `llm.yml`, `report.yml`, and `logs/case-a.log` together (for instance citing the passing total and the logged turn text).",
      "`workspace/evals/_runs/20260507120000Z/static.yml` and `workspace/evals/_runs/20260507120000Z/report.yml` are not deleted or replaced wholesale; only `llm.yml` receives the documented append-only edit."
    ],
    "assertion_patterns": [
      "/z-eval-judge",
      "zoto-eval-judge",
      "static\\.yml",
      "workspace/evals/_runs/20260507120000Z/static\\.yml"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "evalsDir: evals\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/static.yml",
          "content": "totals:\n  passed: 1\n  failed: 0\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/llm.yml",
          "content": "runs:\n  primary:\n    cases:\n      - id: case-a\n        verdict: pass\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/report.yml",
          "content": "totals:\n  passed: 1\n  failed: 0\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/logs/case-a.log",
          "content": "turn 0: assistant summarised coverage\n"
        }
      ]
    },
    "expected_output": "The subagent finishes analysis, `llm.yml` in that run folder contains a new `judge` section summarising findings from the loaded artefacts, and `static.yml` plus `report.yml` stay consistent with a read-only pass."
  },
  {
    "id": "askquestion-handoff-to-z-eval-update-then-resumes",
    "prompt": "/z-eval-judge",
    "follow_ups": [
      "Choose the handoff option that runs `/z-eval-update` next."
    ],
    "assertions": [
      "Immediately after `/z-eval-judge` while `report.yml` advertises `needs_user_input` for `/z-eval-update`, the assistant calls `askQuestion` whose choices name that command.",
      "After the follow-up answer selecting `/z-eval-update`, the assistant resumes with the chosen handoff and does not emit the identical `askQuestion` card again on the next turn.",
      "Throughout the loop, `workspace/evals/_runs/20260507120000Z/llm.yml` still receives the append-only `judge` block expected from the analysis pass."
    ],
    "assertion_patterns": [
      "/z-eval-judge",
      "/z-eval-update",
      "workspace/evals/_runs/20260507120000Z/llm\\.yml"
    ],
    "fixtures": {
      "files": [
        {
          "path": "workspace/.zoto/eval-system/config.yml",
          "content": "evalsDir: evals\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/static.yml",
          "content": "totals:\n  passed: 0\n  failed: 1\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/llm.yml",
          "content": "runs:\n  primary:\n    cases:\n      - id: case-b\n        verdict: fail\n        graders:\n          - type: regex\n            pattern: \"^$\"\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/report.yml",
          "content": "needs_user_input:\n  kind: handoff\n  propose_command: /z-eval-update\n  detail: Regex grader cannot substantiate the assertion.\ntotals:\n  passed: 0\n  failed: 1\n"
        },
        {
          "path": "workspace/evals/_runs/20260507120000Z/logs/case-b.log",
          "content": "turn 0: assistant noted brittle grading\n"
        }
      ]
    },
    "expected_output": "First turn surfaces `askQuestion` options that include `/z-eval-update`; after the operator picks that path, the assistant resumes the judge flow without repeating the same prompt."
  }
];
const TARGET_ID = "command:z-eval-judge";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("command:z-eval-judge", () => {
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
