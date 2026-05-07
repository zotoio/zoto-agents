// _meta.generated: true
/**
 * LLM `code`-strategy eval for command `z-eval-execute`.
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
    "id": "abort-when-eval-system-config-yml-missing",
    "prompt": "/z-eval-execute",
    "assertions": [
      "Assistant output contains the exact sentence: Eval System is not initialised. Run `/z-eval-init` first to create `.zoto/eval-system/config.yml`.",
      "No zoto-eval-executor subagent Task is spawned for this invocation when `.zoto/eval-system/config.yml` is absent at the repository root."
    ],
    "assertion_patterns": [
      "/z-eval-init",
      "\\.zoto/eval-system/config\\.yml"
    ],
    "expected_output": "The assistant refuses to run evals, prints the initialise instruction naming `/z-eval-init`, and does not launch an executor subagent or shell eval scripts."
  },
  {
    "id": "static-only-run-honours-config-and-writes-run-artefacts",
    "prompt": "/z-eval-execute",
    "assertions": [
      "After `/z-eval-execute`, the newest directory under `evals/_runs/` contains `static.yml` and `report.yml` as siblings describing the static backend and merged summary.",
      "Shell invocation follows `pnpm run eval` (static-only path) rather than the combined LLM driver when no `--full` flag is supplied.",
      "Printed aggregates reference static totals consistent with `static.yml` rather than claiming LLM rows when `--full` was not requested."
    ],
    "assertion_patterns": [
      "/z-eval-execute",
      "pnpm run eval",
      "static\\.yml"
    ],
    "expected_output": "The executor runs the host static eval script, respects `static.framework` from `.zoto/eval-system/config.yml`, streams script output, then surfaces totals tied to static results."
  },
  {
    "id": "full-run-forwards-model-into-executor-task",
    "prompt": "/z-eval-execute --full --model opus-4.6",
    "assertions": [
      "Spawned Task prompt to zoto-eval-executor includes the literal model token opus-4.6 when `--model opus-4.6` was supplied on `/z-eval-execute`.",
      "Latest `evals/_runs/<timestamp>/` holds `static.yml`, `llm.yml`, and `report.yml` together after a successful `--full` execution.",
      "After streaming completes, `pnpm run eval:update --check` ran and `llm.yml` gained a warn-only `drift:` overlay summarising manifest freshness.",
      "Closing assistant summary prints aggregate totals plus an explicit drift line sourced from that post-run check."
    ],
    "assertion_patterns": [
      "--model opus-4\\.6",
      "evals/_runs/<timestamp>/",
      "pnpm run eval:update --check"
    ],
    "expected_output": "With credentials available, the assistant launches zoto-eval-executor using the execute skill, passes the model id through to the Task prompt, runs LLM plus static backends, then prints merged totals including drift notice."
  },
  {
    "id": "missing-cursor-api-key-triggers-askquestion-before-task",
    "prompt": "/z-eval-execute --full",
    "follow_ups": [
      "Stay on static-only; skip LLM for now."
    ],
    "assertions": [
      "When neither process env nor repo-root `.env` exposes `CURSOR_API_KEY`, `askQuestion` fires before the executor Task with abort versus static-only (`pnpm run eval`) choices.",
      "Assistant mentions `.env.example` while explaining how operators should supply the key next time.",
      "The subsequent zoto-eval-executor Task prompt carries an explicit `credential_resolution` field reflecting the operator choice from `askQuestion`.",
      "After the operator selects static-only fallback, the executed shell path matches static-only `pnpm run eval` rather than attempting LLM suites without a resolved key."
    ],
    "assertion_patterns": [
      "\\.env",
      "\\.env\\.example",
      "credential_resolution",
      "pnpm run eval"
    ],
    "expected_output": "Before spawning zoto-eval-executor, the assistant asks whether to abort or fall back to static-only, cites `.env.example` as the recommended key setup, then continues only after encoding that credential decision for the Task prompt."
  },
  {
    "id": "needs-user-input-on-credentials-resumes-once-answered",
    "prompt": "/z-eval-execute --full",
    "follow_ups": [
      "Retry after my answer: abort the LLM portion if credentials stay unresolved."
    ],
    "assertions": [
      "When zoto-eval-executor surfaces `needs_user_input` for credential intent, the assistant issues `askQuestion` instead of silently failing the Task.",
      "After resuming with the operator answer, the executor finishes without demanding duplicate unresolved credential prompts unless state truly changes."
    ],
    "assertion_patterns": [
      "needs_user_input"
    ],
    "expected_output": "If the executor returns `needs_user_input` about credential intent, the assistant prompts once, resumes with the clarified decision, and completes without looping indefinitely."
  },
  {
    "id": "configuration-knobs-respected-without-touching-configure-command",
    "prompt": "/z-eval-execute",
    "assertions": [
      "Executor sequencing references `static.framework`, `llm.strategy`, and conditional `llm.codeFramework` exactly as written in `.zoto/eval-system/config.yml` without issuing `/z-eval-configure` mid-run.",
      "Documentation reminders remain verbal only: framework or strategy migrations stay delegated to `/z-eval-configure` instead of being rewritten implicitly during execute."
    ],
    "assertion_patterns": [
      "static\\.framework",
      "/z-eval-configure"
    ],
    "expected_output": "During orchestration the assistant reads `.zoto/eval-system/config.yml` so static and LLM backends follow the declared frameworks and strategies rather than inventing new runner layouts inline."
  }
];
const TARGET_ID = "command:z-eval-execute";
const MODEL_ID = process.env.ZOTO_EVAL_MODEL ?? "composer-2";
const JUDGE_MODEL = process.env.ZOTO_EVAL_JUDGE_MODEL ?? "opus-4.6";
const REPO_ROOT = process.cwd();
const SUITE_START = Date.now();
const API_KEY_PRESENT = Boolean(process.env.CURSOR_API_KEY);

describe("command:z-eval-execute", () => {
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
